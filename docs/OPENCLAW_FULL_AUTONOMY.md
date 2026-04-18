# OpenClaw 全自治 Agent 设计方案

> **目标**：让 OpenClaw 在任何任务上都能**自主决策**——独立分析需求、自行规划步骤、自行选择最优路径、自行验证与纠错，无需人工干预即可交付结果。
>
> **主模型**：`zai/glm-5-turbo`，fallback 链 `glm-4.7` → `glm-4.5-air`
> **本文与前两份方案的关系**：本文专注"大脑"——决策/规划/自我修正；微信 I/O 沿用《OpenClaw × 微信交互优化方案》与《集成 Hermes 优点》两份文档的成果。

---

## 0. TL;DR — 一页纸设计

| 维度 | 关键设计 |
| --- | --- |
| 自治分级 | L0→L5 五级"驾驶员/副驾驶/全自驾"模型，**默认 L3，可灰度到 L5** |
| 决策范式 | **Plan-and-Execute + ReAct + Reflexion** 三合一，按任务复杂度动态选择 |
| 路径选择 | Tree-of-Thoughts 采样多条方案 → **Judge 模型打分** → 选最优 |
| 工具库 | 统一 `Tool Registry`，能力/代价/风险元数据化，自动匹配 |
| 记忆 | 短期（Working Memory）+ 长期（SQLite+FTS5）+ 技能（Procedural Memory） |
| 自纠错 | 每步后自检 `Critic`，失败走 Reflexion 回路，指数退避重试 |
| 停止条件 | 目标达成 / 预算耗尽 / 风险阈值触发 / 最大深度 / 用户中止 |
| 安全护栏 | 能力分级沙箱 + Dry-run + 审计日志 + 熔断 + 可回滚操作 |
| 预算控制 | Token / 时间 / 调用次数 / 成本四维预算，**超限强停** |
| 可观测性 | 决策全链路 trace + 决策理由可解释输出 + Dashboard 回放 |

> 一句话：**能力越强，越需要护栏**。全自治 ≠ 不可控，恰恰相反，自治系统必须把"边界、预算、可回滚、可审计"做得比半自动系统更严。

---

## 1. 自治分级（必须先明确，否则后面都是空谈）

参考 SAE 自动驾驶 L0–L5 的思路，为 OpenClaw 定义清晰的能力边界：

| 级别 | 名称 | Agent 可以自己做 | 必须人工确认 |
| --- | --- | --- | --- |
| **L0** | 纯对话 | 回答问题 | 所有外部动作 |
| **L1** | 只读工具 | 搜索、读文件、查 API | 所有写操作 |
| **L2** | 本地可回滚 | 读写本地沙箱文件、运行脚本 | 外部调用、支付、发消息 |
| **L3** | 受限外部 | 白名单域名调用、发微信消息、低风险 API | 高风险操作（转账/删库/广播） |
| **L4** | 广域自治 | 绝大多数外部操作、自我编排长任务 | 不可逆/高风险操作需事后告警 |
| **L5** | 全自治 | 任何事 | 仅"紧急停止"兜底 |

**推荐默认 L3**，通过 `openclaw.json` 或管理员指令按用户/场景升降：

```json
{
  "agent": {
    "autonomyLevel": 3,
    "perTaskOverride": {
      "code-refactor": 4,
      "pay-anything":  0
    },
    "emergencyStop": { "command": "/admin stop", "revokeMs": 3000 }
  }
}
```

L 级本质上是**工具白名单 + 预算上限 + 审批策略**的组合，不是一个单独的 flag。

---

## 2. 决策范式：三种范式合一，动态选择

没有单一范式在所有任务上都最优。OpenClaw 按**任务复杂度**动态切换：

| 任务特征 | 采用范式 | 为什么 |
| --- | --- | --- |
| 单步即可、意图明确 | **Direct**（直接工具调用） | 省 token，低延迟 |
| 多步、线性、结构清晰 | **Plan-and-Execute** | 先总规划再执行，可审计 |
| 探索性、依赖环境反馈 | **ReAct**（Thought→Act→Obs 循环） | 边做边看，适合未知 |
| 失败/不确定性高 | **Reflexion**（失败后自我反思再试） | 从错误中学习 |
| 方案多元、质量敏感 | **Tree-of-Thoughts**（多路径采样 + 打分） | 质量最高但贵 |

**选择器（Meta-Planner）** 在入口自动判定：

```ts
// core/agent/meta-planner.ts
export async function chooseStrategy(task: Task): Promise<Strategy> {
  const sig = await classifyTask(task);                 // GLM-5-Turbo 结构化输出
  if (sig.steps === 1)                       return "direct";
  if (sig.uncertainty >= 0.7)                return "react";
  if (sig.qualityCritical && budget.ok(500)) return "tot";    // 质量敏感且预算够
  if (sig.riskOfFail >= 0.4)                 return "reflexion";
  return "plan-and-execute";
}
```

`classifyTask` 用 GLM-5-Turbo function-calling 返回：

```json
{
  "steps": 5,
  "uncertainty": 0.3,
  "qualityCritical": true,
  "riskOfFail": 0.2,
  "domain": "code",
  "estimatedTokens": 4200
}
```

---

## 3. 核心架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Request                            │
└───────────────────────────────┬────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Intake & Goal Extraction                                       │
│  · 意图澄清（置信度 <0.8 时反问）                                   │
│  · 目标结构化：Objective / Constraints / Deliverable              │
└───────────────────────────────┬────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Meta-Planner  (选择决策范式)                                     │
│  Direct / Plan-and-Execute / ReAct / Reflexion / ToT            │
└───────────────────────────────┬────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Planner  (生成候选方案，≥2 条)                                   │
│  · 分解子目标                                                    │
│  · 标注每步所需工具、预算、风险                                      │
└───────────────────────────────┬────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Judge  (路径打分 → 选最优)                                       │
│  维度：期望收益 · 成功率 · 成本 · 风险 · 时延                          │
└───────────────────────────────┬────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Executor  (执行单步 / 工具调用)                                   │
│  · Tool Registry 匹配                                           │
│  · 受 Autonomy Level + Policy Guard 管控                         │
└─────────┬───────────────────────────────────────┬──────────────┘
          ▼                                        ▼
┌───────────────────────┐              ┌─────────────────────────┐
│  Memory               │◀──────────── │  Critic  (每步自检)      │
│  · Working            │              │  · 成功/失败             │
│  · Long-term (FTS5)   │              │  · 是否改进目标           │
│  · Procedural(技能)    │              │  · 是否需要重规划         │
└───────────────────────┘              └───────────┬─────────────┘
                                                   ▼
                                        ┌─────────────────────────┐
                                        │  Reflexion / Replan     │
                                        │  · 失败→反思→改方案       │
                                        │  · 连续 N 次 → 熔断      │
                                        └───────────┬─────────────┘
                                                   ▼
                                        ┌─────────────────────────┐
                                        │  Stop Condition Check   │
                                        │  达成/超预算/超深度/禁令   │
                                        └───────────┬─────────────┘
                                                    ▼
                                        ┌─────────────────────────┐
                                        │  Deliverable + Report   │
                                        │  · 结果 + 决策链路 + 成本 │
                                        └─────────────────────────┘
```

---

## 4. 目标抽取（所有自治的起点）

用户输入往往是模糊的。让 Agent **先把目标结构化**，后面的决策才有依据：

```ts
// core/agent/goal.ts
export interface Goal {
  objective:   string;             // 一句话目标
  successCriteria: string[];       // 可验证的完成标准
  constraints:  Constraint[];      // 预算/时限/合规/范围
  deliverable: "text" | "file" | "action" | "report";
  priority:    "low" | "normal" | "high";
  confidence:  number;             // 0–1，低于 0.6 需澄清
}

const TOOL_EXTRACT = {
  type: "function",
  function: {
    name: "extract_goal",
    parameters: { /* JSON Schema */ },
  },
};
```

低置信度时**反问澄清**（但最多 1 轮，否则自治性失效）：

```ts
if (goal.confidence < 0.6 && clarifyRound === 0) {
  return { ask: "我理解你是想…这样对吗？" };
}
// 置信度仍低时，按"最可能"解释继续执行，在最终报告里声明假设
```

---

## 5. Planner：生成候选方案

输出**至少 2 条**候选计划，每条标注预期收益/代价：

```ts
// core/agent/planner.ts
export interface Plan {
  id: string;
  steps: Step[];                   // 有向无环图或线性
  estTokens: number;
  estLatencyMs: number;
  successProb: number;             // 自评成功率
  riskLevel: 1 | 2 | 3 | 4 | 5;    // 1=只读 5=不可逆
  requiredTools: string[];
  rationale: string;               // 为什么这么拆
}

export interface Step {
  id: string;
  description: string;
  tool?: string;                   // 可选：指定工具
  args?: unknown;
  dependsOn: string[];
  fallback?: Step;                 // 失败时的备选动作
}
```

Planner prompt 关键片段（精简版）：

```
你是 OpenClaw 的规划器。针对用户目标，产出 **2–3 条候选方案**。

严格要求：
1. 每条方案必须可执行，标注 requiredTools / estTokens / riskLevel / successProb。
2. 至少一条方案是"保守方案"（risk≤2，成功率≥0.9）。
3. 至少一条方案是"激进方案"（成本更低或速度更快但成功率可能较低）。
4. 每步必须可独立验证（写明 successCriteria）。
5. 用 JSON schema 输出，不要自由文本。
```

---

## 6. Judge：多维度打分选最优

不要用 LLM 直接"你选哪个"，那样不稳定。用**显式评分函数** + LLM 只补估缺失项：

```ts
// core/agent/judge.ts
export function scorePlan(p: Plan, ctx: Context): number {
  const w = ctx.weights;                             // 用户可配置权重
  const norm = (x: number, max: number) => 1 - Math.min(x / max, 1);

  return (
    w.success * p.successProb +
    w.cost    * norm(p.estTokens, ctx.budget.tokens) +
    w.latency * norm(p.estLatencyMs, ctx.budget.timeMs) +
    w.risk    * norm(p.riskLevel, 5) +
    w.fit     * ctx.levelAllows(p.riskLevel)         // 自治级不允许的直接 0
  );
}

export function pickBest(plans: Plan[], ctx: Context): Plan {
  const scored = plans.map(p => ({ p, s: scorePlan(p, ctx) }));
  scored.sort((a, b) => b.s - a.s);
  log.info({ scored }, "plan_ranking");              // 决策可审计
  return scored[0].p;
}
```

默认权重：

```json
{ "success": 0.4, "cost": 0.2, "latency": 0.15, "risk": 0.15, "fit": 0.1 }
```

高风险任务自动把 `risk` 权重抬高到 0.4。

---

## 7. Executor + 工具体系（自治的手脚）

### 7.1 Tool Registry —— 工具的"元数据即代码"

每个工具声明自己的**能力、代价、风险**，Agent 据此匹配：

```ts
// core/tools/registry.ts
export interface Tool {
  name: string;
  description: string;
  input:  JsonSchema;
  output: JsonSchema;

  capabilities: string[];                  // e.g. ["file.read","web.fetch"]
  riskLevel: 1 | 2 | 3 | 4 | 5;            // 和 Autonomy Level 对齐
  reversible: boolean;                     // 是否可回滚
  costHint: { tokens?: number; timeMs?: number; money?: number };
  idempotent: boolean;                     // 可安全重试

  exec(args: unknown, ctx: ToolCtx): Promise<unknown>;
  dryRun?(args: unknown, ctx: ToolCtx): Promise<string>;   // 预演
  rollback?(receipt: unknown): Promise<void>;              // 回滚
}
```

示例：

```ts
registerTool({
  name: "shell.exec",
  riskLevel: 4,
  reversible: false,
  capabilities: ["system.exec"],
  input: { type: "object", properties: { cmd: { type: "string" } }, required: ["cmd"] },
  exec: async ({ cmd }, ctx) => {
    if (ctx.autonomy < 4) throw new PolicyDenied("shell.exec 需要 L4+");
    return runInSandbox(cmd);
  },
});
```

### 7.2 工具自动匹配
Planner 写好 `capabilities` 需求 → Registry 自动筛选兼容工具 → 按 `costHint + successRate` 排序，**不让 LLM 记工具名**（LLM 会瞎编）。

### 7.3 Policy Guard —— 执行前的最后一道门

```ts
// core/agent/policy-guard.ts
export async function guard(tool: Tool, args: unknown, ctx: Context) {
  if (tool.riskLevel > ctx.autonomy)     throw new PolicyDenied("超出自治级");
  if (!ctx.budget.canAfford(tool))       throw new BudgetExceeded();
  if (matchDenyList(tool, args))         throw new PolicyDenied("命中黑名单");
  if (tool.riskLevel >= 4 && !tool.reversible) {
    await writeAuditLog({ tool, args, ctx, preview: await tool.dryRun?.(args, ctx) });
  }
}
```

---

## 8. Critic + Reflexion：自我验证与纠错

### 8.1 每步执行后自检
```ts
// core/agent/critic.ts
export async function critic(step: Step, result: unknown, goal: Goal) {
  const r = await llm.toolCall("evaluate_step", {
    step, result,
    successCriteria: step.successCriteria,
  });
  return r as {
    success: boolean;
    progress: number;            // 0-1，距离 goal 多近
    issues: string[];
    shouldReplan: boolean;
    shouldRetry:  boolean;
    refinedArgs?: unknown;       // 如果只是参数错，给出修正
  };
}
```

### 8.2 Reflexion 回路
失败时**让模型写一段"教训"**存入长期记忆，下次遇到同类任务自动召回：

```ts
// core/agent/reflexion.ts
export async function reflect(task: Task, trace: Trace) {
  const lesson = await llm.toolCall("distill_lesson", { task, trace });
  await memory.remember(task.userId, "procedural", {
    summary: lesson.summary,
    content: lesson.content,
    tags: lesson.tags,
  });
}
```

回到 §2.11《集成 Hermes 优点》里的 `MemoryStore.recall`，新任务启动时把相关 lesson 拼进 system prompt，**Agent 会越用越聪明**。

### 8.3 重试策略（tenacity 风格）
```ts
const MAX_RETRY   = 3;
const MAX_REPLAN  = 2;
const MAX_DEPTH   = 12;
```
超出任一限制 → 报告"未能完成 + 当前最佳进展 + 建议人工介入点"，**优雅投降而不是死循环**。

---

## 9. 预算与停止条件（自治的"刹车"）

### 9.1 四维预算
```ts
// core/agent/budget.ts
export class Budget {
  constructor(public tokens: number, public timeMs: number,
              public toolCalls: number, public money: number) {}
  consume(delta: Partial<Budget>) { /* 扣减 */ }
  ok(costHint: CostHint): boolean { /* 预扣是否通过 */ }
  exhausted(): "tokens"|"time"|"calls"|"money"|null { /* 哪项先耗尽 */ }
}
```

默认配置（可被任务级覆盖）：
```json
{
  "budget": {
    "default":   { "tokens": 50000, "timeMs": 300000, "toolCalls": 40, "money": 0.5 },
    "highStake": { "tokens": 200000,"timeMs": 900000, "toolCalls": 120,"money": 2.0 }
  }
}
```

### 9.2 停止条件矩阵

| 条件 | 动作 |
| --- | --- |
| 目标达成（Critic 判定 progress≥0.95） | 正常收尾 |
| 预算任意一维耗尽 | 立即停止，输出"当前最佳结果" |
| 连续失败 ≥ `MAX_RETRY*MAX_REPLAN` | 投降，写 Reflexion，请求人工 |
| 规划深度 ≥ `MAX_DEPTH` | 停止，防止递归爆炸 |
| 命中安全黑名单 / 审计红线 | 立即停止 + 告警管理员 |
| 用户 `/admin stop` 或紧急停止指令 | 3 秒内回滚可回滚操作并终止 |

---

## 10. 安全护栏（能力越强越重要）

### 10.1 沙箱分层

| 层 | 内容 | 实现 |
| --- | --- | --- |
| 文件 | 写操作限制在 `~/.openclaw/workspace/` | chroot / path allowlist |
| Shell | 命令黑白名单 + 资源限制 | `firejail` / `bwrap` / Docker |
| 网络 | 域名白名单 + SSRF 防护 | 自研 `safeFetch()`（见 Hermes 集成方案） |
| 金钱 | 所有涉费接口单独开关 + 日上限 | Policy Guard |

### 10.2 Dry-run 与审批
高风险操作（L4+）**先预演再执行**：

```
Agent 计划执行：rm -rf ~/projects/demo
Dry-run 预览：
  - 将删除 312 个文件，~4.2 MB
  - 目标路径在允许的工作区内 ✔
  - 不可回滚 ⚠️
Autonomy L4 需事后告警；L3 需人工确认。继续？[Y/n]
```

L5 时 Dry-run 也执行，但**结果写审计日志**，管理员可事后 `/admin undo <trace_id>`。

### 10.3 可回滚操作
能回滚的工具必须实现 `rollback(receipt)`；不可回滚的操作提升 riskLevel。
Agent 执行时维护**撤销栈**，失败或被叫停时倒序回滚。

### 10.4 审计日志
每个工具调用写入 `~/.openclaw/audit/YYYY-MM-DD.ndjson`：

```json
{"trace_id":"...","ts":"...","tool":"file.write","args":{...},"result":"...","user":"...","autonomy":3,"rolledBack":false}
```

---

## 11. 长期记忆与技能固化（Agent 自我进化）

在 Hermes 集成方案的 `MemoryStore` 基础上，扩展三种记忆：

| 类型 | 内容 | 写入时机 |
| --- | --- | --- |
| Working Memory | 当前任务上下文 | 任务结束清空 |
| Episodic Memory | 历史对话/任务摘要 | 每任务结束自动摘要 |
| Semantic Memory | 用户偏好、项目信息 | 由 Critic 显式标记 |
| **Procedural Memory** | "做某类事的最佳路径" | Reflexion 产物 |

Procedural Memory 是**自我进化**的关键。例如第一次帮用户写周报用了 8 步，摘出"高效路径"固化成 4 步的 skill，下次直接 hit：

```ts
// 命中固化技能时跳过 Planner
const skill = await procedural.match(goal);
if (skill && skill.confidence > 0.8) {
  return skill.execute(goal);                // 直接进 Executor
}
```

---

## 12. 针对 GLM-5-Turbo 的具体调优

### 12.1 强约束的 function-calling
GLM-5-Turbo 完整兼容 OpenAI `tools`，但**必须用 tool_choice 强制调用**，否则偶尔会自由回答破坏结构：

```ts
await zai.chat.completions.create({
  model: "glm-5-turbo",
  tools: [PLAN_TOOL],
  tool_choice: { type: "function", function: { name: "propose_plans" } },
  response_format: { type: "json_object" },            // 双保险
  messages,
});
```

### 12.2 角色分工（"多智能体"在单模型内实现）
同一个 GLM-5-Turbo，用不同 system prompt 扮演不同角色，互相审阅：

| 角色 | system prompt 要点 | 温度 |
| --- | --- | --- |
| Planner | 创造性拆解，多方案 | 0.7 |
| Judge | 挑刺 / 保守评分 | 0.2 |
| Executor | 严格执行当前步，只输出工具调用 | 0.1 |
| Critic | 质疑结果，找反例 | 0.3 |
| Reflector | 提炼教训 | 0.4 |

各角色用独立的 messages 上下文，避免互相污染。

### 12.3 成本压缩
- Planner / Judge 用 `glm-4.5-air` 做初筛（便宜快），**只有最终方案和 Critic 用 glm-5-turbo**。
- 利用智谱 **Prompt Cache**（Coding 端点原生）缓存固定的 system prompt，长 prompt 免费复用。
- ToT 候选数从 5 降到 3 再降到 2，质量损失边际化、成本线性下降。

### 12.4 应对 Coding Plan 次级调度
429 / 排队时不要硬等，**自动降级**到 `glm-4.7`：

```ts
if (isRateLimit(e)) {
  log.warn("primary rate-limited, degrade to glm-4.7");
  return await callLLM("glm-4.7", ...);
}
```

---

## 13. 核心代码骨架（把 §3 架构一次性连起来）

```ts
// core/agent/runtime.ts
export class AgentRuntime {
  constructor(
    private llm: LLMProvider,
    private tools: ToolRegistry,
    private memory: MemoryStore,
    private budget: Budget,
    private autonomy: number,
  ) {}

  async run(input: string, ctx: Context): Promise<AgentResult> {
    const trace = ctx.newTrace();
    try {
      const goal = await this.extractGoal(input, ctx);
      if (goal.needsClarify) return goal.clarify;

      if (await procedural.match(goal)) {                     // 技能命中
        return await this.runSkill(goal, ctx);
      }

      const strategy = await chooseStrategy(goal);
      const plans    = await this.plan(goal, strategy, ctx);
      let plan       = pickBest(plans, ctx);

      let depth = 0, replans = 0;
      while (depth++ < MAX_DEPTH) {
        for (const step of plan.steps) {
          if (this.budget.exhausted()) return this.finalize(trace, "budget");
          if (ctx.aborted)              return this.finalize(trace, "abort");

          const result = await this.exec(step, ctx);
          const eval_  = await critic(step, result, goal);

          if (!eval_.success && eval_.shouldRetry) {
            await this.retry(step, eval_, ctx);
          } else if (eval_.shouldReplan && replans++ < MAX_REPLAN) {
            await reflect({ goal, trace }, ctx);
            plan = pickBest(await this.plan(goal, strategy, ctx), ctx);
            break;                                            // 重入 while
          }
          if (eval_.progress >= 0.95) return this.finalize(trace, "done");
        }
      }
      return this.finalize(trace, "max-depth");
    } catch (e) {
      await this.handleFatal(e, trace);
      throw e;
    }
  }

  private async exec(step: Step, ctx: Context) {
    const tool = this.tools.resolve(step.tool ?? step.description);
    await guard(tool, step.args, ctx);
    if (tool.riskLevel >= 4 && tool.dryRun) {
      const preview = await tool.dryRun(step.args, ctx);
      await writeAuditLog({ ctx, tool, args: step.args, preview });
    }
    this.budget.consume(tool.costHint);
    return await tool.exec(step.args, ctx);
  }
}
```

---

## 14. 可观测性与可解释性

自治系统的**最低合规底线**是"每一步都能回看、每个决策都能解释"。

### 14.1 决策 Trace
每次 `run()` 生成一个 trace，结构：
```
Trace
├── goal
├── strategy
├── plans_considered: [Plan, Plan, Plan]
├── picked_plan_id
├── scoring_breakdown
├── steps:
│    ├── Step { tool, args, result, critic_eval, retries }
│    └── ...
├── reflexions
├── cost: { tokens, timeMs, toolCalls, money }
└── outcome: "done"|"budget"|"abort"|...
```
写入 `~/.openclaw/traces/<trace_id>.json`，并在 `openclaw dashboard` 提供**时间线回放 UI**。

### 14.2 决策理由可解释
最终回复给用户时附一段（可折叠）"决策说明"：

> 我选择了方案 A（成功率 0.92，成本 3.1k tokens），因为另一方案虽然快 20% 但不可回滚，且你当前处于 L3 自治级。执行中第 3 步失败一次，已自动切换参数重试通过。[查看完整 trace](openclaw://trace/abc)

### 14.3 Dashboard 指标
- 自治成功率（无人工干预完成的比例）
- 平均决策深度、回退次数
- 每种策略的分布与成本
- 熔断触发频次
- Procedural Memory 命中率

---

## 15. 落地路线图（按 ROI）

### 阶段 A — 骨架可跑
1. Autonomy Level + Tool Registry + Policy Guard
2. Goal Extraction + Direct/Plan-and-Execute 两种范式
3. Budget + 停止条件 + 基础审计日志

### 阶段 B — 自纠错闭环
4. Critic + 重试 + Replan
5. Reflexion + Procedural Memory 写入
6. 多角色 prompt（Planner/Judge/Executor/Critic 分离）

### 阶段 C — 高质量决策
7. Tree-of-Thoughts 多方案采样 + Judge 打分
8. 技能固化命中跳过 Planner
9. ReAct 风格交错执行（适合探索性任务）
10. Dashboard 决策回放 UI

### 阶段 D — 安全加固
11. 沙箱分层（文件/shell/网络）
12. Dry-run + 回滚栈 + 审批流
13. 成本/风险告警 + 紧急停止

---

## 16. 指标（衡量"自治"是否真有效）

| 指标 | 定义 | 目标 |
| --- | --- | --- |
| Autonomy Success Rate | 全自动完成（0 人工干预）比例 | > 80% |
| Mean Steps per Task | 平均决策深度 | < 6 |
| Replan Rate | 触发重规划的比例 | < 20% |
| Procedural Hit Rate | 技能固化命中比例 | > 30%（运行一段时间后） |
| Budget Overrun Rate | 超预算比例 | < 5% |
| Unsafe Action Attempts | 被 Policy Guard 拦截的次数 | 监控趋势，不应上升 |
| Avg Cost / Task (tokens) | 平均每任务成本 | 持续下降曲线 |
| User Override Rate | 用户事后否决的比例 | < 10% |

---

## 17. 常见误区（警告）

| 误区 | 真相 |
| --- | --- |
| "给足工具权限就会更聪明" | 恰恰相反，**工具越多，Planner 越容易选错**。工具库需要精炼、按 capability 组织 |
| "让模型自己决定是否停止" | LLM **强烈倾向于继续行动**，必须用硬性预算/深度限制，否则烧钱无底洞 |
| "Function-calling 就够了" | function-calling 只解决"调用"问题，不解决"选择调用哪个"和"调用后如何验证"，必须配合 Tool Registry + Critic |
| "长 system prompt 能塑造人格即可" | 长期记忆 + Procedural Memory 远比长 prompt 有效，且成本更低（Prompt Cache） |
| "自治 = 不需要日志" | 自治系统**比半自动系统更需要**审计、回放、解释能力，否则出问题无法追责 |
| "一个大 LLM 包打天下" | 按角色分工 + 便宜/昂贵模型分层（glm-4.5-air 做筛选，glm-5-turbo 做关键决策）能省 60%+ 成本 |

---

## 18. 一页命令速查

```bash
# 设置自治级
/admin autonomy set 3
/admin autonomy override code-refactor 4
/admin autonomy override pay-anything 0

# 紧急停止当前任务
/admin stop
/admin stop all

# 查看决策 trace
/admin trace last
/admin trace <trace_id>
/admin replay <trace_id>

# 预算
/admin budget show
/admin budget set tokens 100000

# 记忆
/admin memory search "周报"
/admin memory forget <id>
/admin skills list

# 回滚上一个可回滚的动作
/admin undo
/admin undo <trace_id>
```

---

## 19. 参考

- [ReAct: Synergizing Reasoning and Acting in LLMs (Yao et al.)](https://arxiv.org/abs/2210.03629)
- [Reflexion: Language Agents with Verbal Reinforcement Learning (Shinn et al.)](https://arxiv.org/abs/2303.11366)
- [Tree of Thoughts (Yao et al.)](https://arxiv.org/abs/2305.10601)
- [Plan-and-Solve Prompting (Wang et al.)](https://arxiv.org/abs/2305.04091)
- [NousResearch/Hermes-Function-Calling（递归工具调用范式）](https://github.com/NousResearch/Hermes-Function-Calling)
- [智谱 OpenClaw 官方配置](https://docs.bigmodel.cn/cn/coding-plan/tool/openclaw)
- [OpenClaw 官方文档](https://docs.openclaw.ai/)

---

**一句话总结**：
> **全自治的本质不是"放手不管"，而是"把人放在正确的位置"**——人定义目标与边界，Agent 自主找路径、验证、纠错、交付，全程有预算、有护栏、有审计、可回滚、可解释。按本文 A → B → C → D 路线落地，你能得到一个既敢放出去干活、又不会"炸厨房"的 OpenClaw。
