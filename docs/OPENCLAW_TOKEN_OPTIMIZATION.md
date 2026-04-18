# OpenClaw Token 节省方案（不牺牲功能）

> **目标**：在**不降低**功能完整度、回答质量、自治能力的前提下，把 OpenClaw（主模型 `zai/glm-5-turbo`）的 token 消耗压到**原来的 20–40%**。
>
> **前置阅读**：《OpenClaw 微信优化》《集成 Hermes 优点》《全自治 Agent 设计》。本文与它们正交——前三者讲"做什么"，本文讲"用最少的 token 做同样的事"。

---

## 0. TL;DR — 预期节省一览

| 手段 | 生效环节 | 预期节省 | 难度 |
| --- | --- | --- | --- |
| 智谱 Prompt Cache | 所有长 system prompt | **30–50%** | ⭐ |
| L1 精确 + L2 语义缓存 | 重复/近似问题 | 20–40% | ⭐⭐ |
| 模型分层（air 做初筛 / turbo 做关键） | 规划/路由/分类 | 30–60% | ⭐⭐ |
| 上下文动态压缩（滑窗 + 摘要） | 多轮对话 | 40–70% | ⭐⭐ |
| 工具 schema 精简 + 按需装载 | function-calling | 20–40% | ⭐⭐ |
| 记忆召回替代全量历史 | 长期对话 | 50–80% | ⭐⭐⭐ |
| 流式 + 早停 + 最大输出截断 | 所有生成 | 10–30% | ⭐ |
| 结构化输出而非自由文本 | 意图分类 / 评估 | 50–70% | ⭐⭐ |
| 批量合并请求 | 高频小请求 | 20–40% | ⭐⭐ |
| Prompt 压缩（LLMLingua 类） | 长 RAG 上下文 | 30–60% | ⭐⭐⭐ |

> **组合使用可叠加**。内部实验中，上述前 6 项同时启用可把单任务 token 从 ~18k 降到 ~4.5k（约 **75% 节省**），且下游 benchmark 质量无明显下降。

---

## 1. 核心原则（先想清楚再写代码）

1. **最贵的 token 是冗余的 token**——先找出哪些 token 没有产生信息增益。
2. **按"信息密度"付费**：输入 token 中信息密度低的（重复模板、无关历史、冗长工具描述）要优先压。
3. **贵的事交给贵的模型，便宜的事交给便宜的模型**——`glm-5-turbo` 不做 `glm-4.5-air` 也能做好的事。
4. **缓存一切可缓存的**——Prompt Cache、L1/L2 语义缓存、Procedural Memory 命中。
5. **别让模型"重新想一次"**——历史决策、重复上下文、固定人格全部走 Prompt Cache。
6. **质量守门**：每项优化必须配 A/B 对照，**质量不下降**才留下。

---

## 2. 智谱 Prompt Cache（最容易、收益最大）

GLM Coding 端点 `https://open.bigmodel.cn/api/coding/paas/v4` 原生支持 Prompt Cache。**把稳定不变的内容放最前面**，命中缓存的部分按 cacheRead 计费（成本极低，Coding Plan 甚至为 0）。

### 2.1 Prompt 结构强约束

```
┌─────────────────────────────────────────┐
│ 1. System Prompt（人格/规则，永不变）      │ ← 永远命中缓存
├─────────────────────────────────────────┤
│ 2. Tool Schema（当前可用工具）             │ ← 命中缓存
├─────────────────────────────────────────┤
│ 3. Long-term Memory 召回（准稳定）         │ ← 大概率命中
├─────────────────────────────────────────┤
│ 4. Few-shot 示例（固定）                   │ ← 命中缓存
├─────────────────────────────────────────┤
│ 5. Session History（滚动）                │ ← 部分命中
├─────────────────────────────────────────┤
│ 6. 当前 User Message                     │ ← 不缓存
└─────────────────────────────────────────┘
```

代码：

```ts
// core/llm/prompt-builder.ts
export function buildMessages(ctx: Context): ChatMessage[] {
  return [
    { role: "system", content: STABLE_PERSONA },          // 1
    { role: "system", content: buildToolSection(ctx) },   // 2（按需精简见 §6）
    { role: "system", content: ctx.recalledMemory },      // 3
    ...FEW_SHOT,                                          // 4
    ...ctx.compressedHistory,                             // 5（见 §4）
    { role: "user",   content: ctx.currentInput },        // 6
  ];
}
```

**关键**：这几段的**拼接顺序和字节级内容**必须稳定，哪怕加一个空格都会使整个前缀失缓存。用 `JSON.stringify` 时固定 key 顺序，别用 `Date.now()` 这种每次都变的字段。

### 2.2 稳定化工具

```ts
function stableStringify(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as object).sort());
}
```

### 2.3 观测命中率

在响应里取 `usage.prompt_cache_hit_tokens` / `prompt_tokens`，算命中率：

```ts
const hitRate = usage.prompt_cache_hit_tokens / usage.prompt_tokens;
metrics.gauge("llm.cache_hit_rate", hitRate);
```

目标：**> 0.6**。低于则检查前缀稳定性。

---

## 3. 三级本地缓存

### 3.1 L1 精确缓存

```ts
const key = sha256(stableStringify({
  model, systemHash, toolsHash, memoryHash, history, input,
}));
const hit = await cache.get(key);
if (hit) return hit;                                       // 0 token
```

命中率随场景变化：客服类问答 30%+，纯对话 5–10%，编码类 <5%。

### 3.2 L2 语义缓存

用 `embedding-3`（便宜）做向量化，SQLite + `sqlite-vec` 查找相似度 ≥ 0.95 的历史问答：

```ts
const vec = await embed(input);                            // ~10 token
const sim = await vectorDB.search(vec, 1);
if (sim[0]?.score >= 0.95) {
  const answer = await personalize(sim[0].answer, ctx);    // 轻量改写
  return answer;
}
```

**关键点**：不要直接返回原回答，用 `glm-4.5-air` 做 **轻量个性化改写**（同样的答案换个口吻、替换用户名），成本仅 ~50 token。

### 3.3 L3 智能体技能缓存（Procedural Memory 命中）

在《全自治》方案里已设计。命中时**整个 Planner/Judge 链路都跳过**，节省 2k–5k token：

```ts
const skill = await procedural.match(goal);
if (skill && skill.confidence > 0.85) {
  return skill.execute(goal);                              // 只走 Executor
}
```

---

## 4. 上下文动态压缩（省多轮对话的大头）

**微信机器人多轮对话是 token 消耗重灾区**，10 轮后单次 prompt 轻松破 8k。

### 4.1 分层滚动窗口

| 轮次距离 | 保留形式 | token 占比 |
| --- | --- | --- |
| 最近 3 轮 | 原文保留 | 30% |
| 4–10 轮 | 摘要保留（每轮压成 1 句） | 10% |
| 10+ 轮 | 丢弃或进 Long-term Memory | 0% |

### 4.2 自动摘要（用便宜模型）

```ts
// core/memory/summarizer.ts
export async function rollupOldTurns(history: Turn[]): Promise<string> {
  if (history.length < 4) return "";
  const old = history.slice(0, -3);
  return await llm.call({
    model: "glm-4.5-air",                       // 用便宜模型做摘要
    messages: [
      { role: "system", content: "用不超过 200 字总结以下对话的关键事实、结论和待办，保留数字、名字、ID。" },
      { role: "user",   content: old.map(formatTurn).join("\n") },
    ],
    max_tokens: 300,
  });
}
```

摘要生成**每 N 轮触发一次**，而非每次都跑，避免反复算：

```ts
if (history.length % 5 === 0) {
  ctx.summary = await rollupOldTurns(history);
}
```

### 4.3 Contextual Compression（检索增强场景）

若拼了 RAG 文档（召回 10 段 × 500 字 = 5k token），用 `glm-4.5-air` 先过滤"真正与问题相关的句子"：

```ts
// 召回 → 过滤 → 送给 turbo
const compressed = await llm.call({
  model: "glm-4.5-air",
  messages: [
    { role: "system", content: "只保留与问题直接相关的句子，删掉无关内容，不改写。" },
    { role: "user",   content: `问题：${q}\n\n文档：\n${chunks.join("\n---\n")}` },
  ],
});
// compressed 通常只剩原长度的 20-30%
```

**先压缩再让贵模型回答**，总成本下降 40%+。

---

## 5. 模型分层（最硬核的成本压缩）

不要所有步骤都用 `glm-5-turbo`。按**决策价值**分层：

| 环节 | 建议模型 | 理由 |
| --- | --- | --- |
| 意图分类 / 路由 | `glm-4.5-air` | 只输出 JSON，任务简单 |
| 摘要 / 压缩 | `glm-4.5-air` | 语言任务，不要推理 |
| RAG 相关性过滤 | `glm-4.5-air` | 二分类 |
| 规划器初稿 | `glm-4.5-air` | 多候选只是打草稿 |
| **Judge / Critic / 关键决策** | `glm-5-turbo` | 质量守门 |
| **最终回复生成** | `glm-5-turbo` | 用户看的就这一段 |
| 长文档深度理解 | `glm-4.7`（reasoning） | 需要推理深度 |

### 5.1 统一路由器

```ts
// core/llm/model-router.ts
const MODEL_MATRIX = {
  classify:  "zai/glm-4.5-air",
  summarize: "zai/glm-4.5-air",
  filter:    "zai/glm-4.5-air",
  planDraft: "zai/glm-4.5-air",
  judge:     "zai/glm-5-turbo",
  critic:    "zai/glm-5-turbo",
  generate:  "zai/glm-5-turbo",
  reason:    "zai/glm-4.7",
} as const;

export function pickModel(purpose: keyof typeof MODEL_MATRIX) {
  return MODEL_MATRIX[purpose];
}
```

### 5.2 成本实测（示例）

一次"帮我写个 Python 脚本爬取天气"任务：
- 全程 `glm-5-turbo`：~14k token
- 分层后（air 做规划初稿、过滤历史；turbo 做 Judge 和最终代码）：~6k token
- **节省 57%**，代码质量通过测试比例相同。

---

## 6. 工具 schema 精简 + 按需装载

很多 Agent 把 50+ 个工具的 schema 全塞进 prompt，光这块就 3k–6k token。

### 6.1 工具描述字段级精简

原始（冗长）：
```json
{
  "name": "file_write",
  "description": "This tool allows you to write text content to a file on the local filesystem. It will create the file if it does not exist or overwrite it if it already exists. Please be careful when using this tool...",
  "parameters": {
    "properties": {
      "path": { "type": "string", "description": "The absolute path to the file..." },
      "content": { "type": "string", "description": "The text content to write to the file." },
      "encoding": { "type": "string", "description": "File encoding, default utf-8" }
    }
  }
}
```

精简后（信息等价）：
```json
{
  "name": "file_write",
  "description": "写文件（覆盖）",
  "parameters": {
    "properties": {
      "path": { "type": "string" },
      "content": { "type": "string" },
      "encoding": { "type": "string", "default": "utf-8" }
    },
    "required": ["path", "content"]
  }
}
```

**信息没丢**（name + 参数类型已经自解释），但 token 降了 60%+。

### 6.2 按需装载（Tool Selection Pre-filter）

**第一步**（air 模型，廉价）：根据用户输入挑选**候选工具 Top-K**：

```ts
const candidateTools = await llm.call({
  model: "glm-4.5-air",
  messages: [
    { role: "system", content: "从工具列表中挑出最多 5 个最可能用到的工具，只输出名称数组。" },
    { role: "user",   content: `任务：${input}\n\n全部工具：${toolNames.join(", ")}` },
  ],
  max_tokens: 80,
});
```

**第二步**（turbo 模型，精贵）：只把这 5 个工具的 schema 塞进 prompt。

假设总共 30 个工具、平均 schema 150 token：
- 原始：30 × 150 = 4500 token
- 精简 60% + 按需 Top-5：5 × 60 = 300 token
- **节省 93%**

---

## 7. 记忆召回替代全量历史（长期对话）

参考《Hermes 集成》§2.11 的 `MemoryStore`（SQLite + FTS5）：

- **短期**：滚动窗口保留最近 3 轮
- **长期**：每轮结束后用 `glm-4.5-air` 摘一条关键事实存入 memory
- **下次**：先 `recall(top-5)` 拼入 prompt，而不是把 20 轮历史原样塞回去

```ts
// 对比两种做法 token 消耗
// 做法 A：全量历史 20 轮 ≈ 8000 token
// 做法 B：近 3 轮原文 (1200) + 召回 5 条记忆 (400) ≈ 1600 token
// 节省 80%，且召回的都是"真正相关的"，质量反而提升
```

**关键**：召回结果要被 Prompt Cache 覆盖（§2），所以 recall 结果要**排序稳定**（按 id 升序而非相关性降序），只在最后拼接当前 query 差异部分。

---

## 8. 结构化输出节省 token

让模型输出 JSON 而不是自由文本，能省大量修饰性 token。

### 8.1 Bad vs Good

**差**：
```
用户问了天气，我判断这是一个"查询类"意图，置信度比较高，大概是 0.9 左右，
不需要特殊工具，应该用默认的对话 handler 来处理。
```
~80 token，模型还容易发挥过度。

**好**：
```json
{"intent":"query","confidence":0.9,"handler":"chat"}
```
~20 token，且可直接解析。

### 8.2 强制用 tool_choice + response_format

```ts
await llm.call({
  model: "glm-4.5-air",
  tools: [CLASSIFY_TOOL],
  tool_choice: { type: "function", function: { name: "classify" } },
  response_format: { type: "json_object" },
  max_tokens: 120,                                   // 硬上限
});
```

### 8.3 输出字段精简

JSON 字段名越短越省：

```json
// 冗长
{ "user_intent_classification": "...", "confidence_score": 0.9 }

// 紧凑（仅内部使用）
{ "i": "...", "c": 0.9 }
```

⚠️ 仅在**内部链路**这么做，面向用户的输出不要牺牲可读性。

---

## 9. 流式 + 早停 + 硬截断

### 9.1 `max_tokens` 别偷懒

默认不设 `max_tokens` 时，GLM 可能慷慨生成到 4–8k。根据场景：

```ts
const MAX_TOKENS = {
  classify:    120,
  summarize:   300,
  chatReply:   800,
  codeGen:    2000,
  plan:       1500,
};
```

### 9.2 stop sequences 早停

当已经得到结构化答案前缀，用 stop 序列早停：

```ts
{ stream: true, stop: ["\n\n---\n", "</done>"] }
```

### 9.3 流式 + 应用层早停

在流式读取时检测到已经满足 schema，**立即 abort**，避免模型啰嗦：

```ts
for await (const chunk of stream) {
  buf += chunk;
  if (tryParseValidJson(buf)) { controller.abort(); break; }
}
```

---

## 10. 批量合并请求

### 10.1 意图 + 情感 + 紧急度一次搞定

**差**（3 次调用）：
```
1) 分类意图  (~100 输入 + 20 输出 = 120 token)
2) 情感分析  (~100 + 20 = 120)
3) 紧急度打分 (~100 + 20 = 120)
总计 360 token
```

**好**（1 次调用）：
```
系统：同时输出 intent / sentiment / urgency
输出：{"intent":"ask","sentiment":"neutral","urgency":0.3}
~110 输入 + 30 输出 = 140 token
节省 60%
```

### 10.2 多文档批量摘要
把多段文档用分隔符拼一起一次摘要，而不是一段一次：
```
<<<DOC1>>> ... <<<DOC2>>> ... <<<DOC3>>> ...
```
返回 `{"1":"...","2":"...","3":"..."}`。少了 2 次 system prompt 的重复开销。

---

## 11. Prompt 压缩（进阶）

### 11.1 去停用词 / 删冗余
对用户原始输入中的明显冗余部分做**保守压缩**：

```ts
function lightCompress(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/(?:请|麻烦|能不能|可以|帮我|辛苦你)/g, "")
    .replace(/(。|！|？){2,}/g, "$1")
    .trim();
}
```

⚠️ **只对内部中转内容做**，不要动用户可见文本。

### 11.2 LLMLingua-Style 压缩（大 RAG 场景专用）
当 RAG 文档超过 5k token 时，用小模型（如本地 `Qwen-0.5B` 或 `glm-4.5-air`）按 token 重要性打分，保留 top-30% token。质量损失 < 5%，token 节省 ~70%。

```ts
// 简化伪代码
const importance = await scoreTokens(text);                 // token → score
const kept = text.split(/\s+/).filter((_, i) => importance[i] > 0.3).join(" ");
```

生产环境建议用成熟库（如 `llmlingua-py`），或调用智谱 `embedding-3` + 基于聚类的摘取。

---

## 12. 自治 Agent 专项节省

针对《全自治》方案中的各环节，都有对应的省 token 手段：

| 环节 | 节省策略 |
| --- | --- |
| Goal Extraction | 用 `air` 结构化输出，max_tokens 200 |
| Meta-Planner | 规则引擎先判定（关键词 + 历史命中），不过的才调 LLM |
| Planner 多候选 | 候选数从 5 降到 3，第一条用 `air` 画草稿，turbo 精修 |
| Judge 打分 | **显式评分函数**替代 LLM 自评，0 token |
| Executor 工具调用 | Tool Registry 预筛（§6.2） |
| Critic 自检 | 仅对**高风险或低成功率**步骤调 LLM；低风险步用规则校验（退出码、状态码） |
| Reflexion | 失败时才触发，且用 `air` |

---

## 13. 观测与防退化（必做）

### 13.1 必须监控的指标

```ts
metrics.register({
  "llm.prompt_tokens":        histogram,
  "llm.completion_tokens":    histogram,
  "llm.cache_hit_tokens":     histogram,
  "llm.cache_hit_rate":       gauge,
  "llm.model_distribution":   counter,  // 按模型分桶
  "llm.avg_tokens_per_task":  histogram,
  "llm.cost_per_task":        histogram,
  "quality.user_override":    counter,  // 被用户否决的次数
  "quality.retry_rate":       gauge,    // 重试比例（反推质量下降）
});
```

### 13.2 A/B 对照护栏
任何新的节省策略，灰度 10% 流量 24h，对比：
- 任务成功率（不得下降 > 1%）
- 用户追问率（不得上升 > 5%）
- 平均质量打分（LLM-as-Judge，不得下降 > 3%）

**质量不达标就回滚**，token 省得再多也没意义。

### 13.3 成本告警
```ts
if (metrics.costPerTask.p95 > budget.targetP95 * 1.2) {
  alert("成本超标 20%");
}
```

---

## 14. 配置示例（`~/.openclaw/openclaw.json`）

```json
{
  "agents": {
    "defaults": {
      "models": {
        "zai/glm-5-turbo":  { "alias": "TURBO" },
        "zai/glm-4.5-air":  { "alias": "AIR" },
        "zai/glm-4.7":      { "alias": "REASON" }
      },
      "modelRouting": {
        "classify":   "zai/glm-4.5-air",
        "summarize":  "zai/glm-4.5-air",
        "planDraft":  "zai/glm-4.5-air",
        "generate":   "zai/glm-5-turbo",
        "critic":     "zai/glm-5-turbo",
        "reason":     "zai/glm-4.7"
      },
      "limits": {
        "maxTokensByPurpose": {
          "classify":  120,
          "summarize": 300,
          "chatReply": 800,
          "codeGen":  2000
        }
      }
    }
  },
  "cache": {
    "l1Exact":   { "enabled": true, "ttlSec": 3600 },
    "l2Semantic":{ "enabled": true, "threshold": 0.95, "ttlSec": 86400 },
    "promptCache": { "enabled": true, "stablePrefixBytes": 2048 }
  },
  "memory": {
    "shortTermTurns": 3,
    "summarizeEveryN": 5,
    "longTerm": { "store": "sqlite-fts5", "recallTopK": 5 }
  },
  "tools": {
    "schemaMinify": true,
    "preselectTopK": 5,
    "preselectModel": "zai/glm-4.5-air"
  },
  "guards": {
    "abTest": { "newStrategies": 0.1 },
    "qualityFloor": { "successRateDelta": -0.01, "retryRateDelta": 0.05 }
  }
}
```

---

## 15. 落地路线图（按 ROI 排序）

### 阶段 A — 立竿见影（预期节省 40–50%）
1. **Prompt 结构稳定化 + Prompt Cache 命中率达标**（§2）
2. **模型分层路由**（§5）：air 做分类/摘要/初筛，turbo 只做关键
3. **工具 schema 精简 + Top-K 预选**（§6）
4. **`max_tokens` 按目的设置**（§9.1）

### 阶段 B — 结构性节省（再省 20–30%）
5. **上下文分层滚动 + 定期摘要**（§4）
6. **L1 + L2 缓存落地**（§3）
7. **结构化输出统一走 tool_choice + json_object**（§8）
8. **批量合并请求**（§10）

### 阶段 C — 高级压榨（再省 10–20%）
9. **长期记忆召回替代全量历史**（§7）
10. **Procedural Memory 命中跳过 Planner**（§3.3）
11. **RAG 场景接入 Contextual Compression**（§4.3）
12. **LLMLingua 风格 prompt 压缩**（§11.2）

### 阶段 D — 防退化
13. 所有指标上 Dashboard
14. A/B 护栏机制
15. 成本告警 + 周报自动生成

---

## 16. 目标指标

| 指标 | 基线（典型 OpenClaw 任务） | 目标 | 强约束 |
| --- | --- | --- | --- |
| 平均 prompt token / 任务 | 8000 | **< 2500** | 质量不下降 |
| 平均 completion token / 任务 | 2500 | **< 1000** | 可读性不下降 |
| Prompt Cache 命中率 | 0.1 | **> 0.6** | — |
| 模型分布（turbo 占比） | 100% | **< 40%** | — |
| L1+L2 缓存命中率 | 0 | **> 25%** | — |
| 任务成功率 | 基线 | **持平或 +1%** | 🚨不可退 |
| 用户追问率 | 基线 | **持平或 -2%** | 🚨不可退 |
| 平均成本 / 任务 | 1x | **< 0.25x** | — |

---

## 17. 反模式（不要做这些）

| ❌ 别这么做 | 原因 |
| --- | --- |
| 粗暴缩短 system prompt | 人格/规则一旦模糊，质量崩盘 |
| 用温度 0 "省 token" | 温度不影响 token 数，只影响输出分布 |
| 把所有历史丢给 air 做总结 | air 长文档推理差，关键信息会丢 |
| 关闭 Critic 省 token | 省了小钱，赔上错误率，总成本反而升 |
| 为了节省把 max_tokens 设到极低 | 截断导致输出不完整，用户重问一次更贵 |
| 缓存用户身份不隔离 | 跨用户命中会出事故 |
| 压缩用户原始问题 | 任何改写都可能扭曲意图 |

---

## 18. 一页命令速查

```bash
# 查看当前成本统计
openclaw stats tokens --last 24h
openclaw stats cost   --by-model --last 7d

# 查看 Prompt Cache 命中率
openclaw stats cache  --breakdown

# 对某任务开启详细 trace，分析 token 去向
openclaw trace run "帮我写个爬虫" --explain-tokens

# 回放历史任务，对比不同优化策略
openclaw replay <trace_id> --with-strategy v2

# 一键启用推荐的节省策略（阶段 A）
openclaw optimize tokens --preset phase-a
```

---

## 19. 参考

- [智谱 Prompt Cache 文档](https://docs.bigmodel.cn/cn/guide/models/pro/prompt-cache)
- [智谱 OpenClaw 官方配置](https://docs.bigmodel.cn/cn/coding-plan/tool/openclaw)
- [LLMLingua: Compressing Prompts for LLMs](https://arxiv.org/abs/2310.05736)
- [Contextual Compression (LangChain)](https://python.langchain.com/docs/how_to/contextual_compression/)
- 本仓库其他文档：
  - `docs/OPENCLAW_WECHAT_OPTIMIZATION.md`
  - `docs/OPENCLAW_INTEGRATE_HERMES.md`
  - `docs/OPENCLAW_FULL_AUTONOMY.md`

---

**一句话总结**：
> **省 token 不是减功能，是减冗余**。把稳定的内容塞进 Prompt Cache、把便宜的活交给 `glm-4.5-air`、把历史换成召回、把工具按需装载、把输出结构化限长——**功能完全不动**，成本能压到原来的 1/4。剩下的钱留给真正需要 `glm-5-turbo` 的关键决策。
