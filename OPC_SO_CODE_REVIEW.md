# opc-so 代码评审报告

> 评审对象：https://cnb.cool/zhanxiaoyu/opc-so（`main` @ `642f571`）  
> 评审日期：2026-07-10  
> 评审范围：后端 `server.js`、前端 `js/*` + `index.html`、爬虫 `scraper/policy_agent.py`、Docker/CI、数据与文档  
> 说明：仓库内已有 `REVIEW_REPORT.md`（声称 P0–P3 已修复）。本报告基于**当前代码实态**独立复核，发现多处「已修复」项仍有回归或未闭环。

---

## 一、总评

项目定位清晰：零依赖 Node 后端 + 原生静态前端 + Python 政策 Agent，适合快速落地的营销/政策导航站。安全意识有进步（密钥改环境变量、CORS 白名单、限流、DOM 用 `textContent`），但**最近一轮「安全修复」引入了接口契约断裂**，且 Node/Docker 路径下静态资源与数据加载仍不可用。

| 维度 | 评分 | 说明 |
|------|------|------|
| 架构简洁度 | 优 | 零 npm 依赖、职责边界清楚 |
| 安全性 | 中 | 密钥已迁服务端，但文档仍泄露；聊天契约坏了；Issue 注入未防 |
| 正确性 | 差 | `/api/chat` 前后端字段不一致；爬虫缺 key 时 `NameError` |
| 部署一致性 | 差 | `images/`、`data/` 在 Node 静态白名单/Docker 中缺失 |
| 数据质量 | 中偏弱 | 106 条政策中约 85 条 URL 为浅层路径 |
| 可维护性 | 中 | 无测试；文档与代码漂移；死代码残留 |

**建议优先修 P0，再上线/对外演示 AI 聊天与 CNB Preview。**

---

## 二、问题清单（按优先级）

### P0 — 必须立即修

#### 1. `/api/chat` 前后端响应契约不匹配（功能回归）

「密钥迁后端」后，服务端返回：

```js
sendJSON(res, 200, { reply: content.trim() }, req);
```

前端 `js/chat.js` 仍按 OpenAI 原始结构解析：

```js
const content = data.choices?.[0]?.message?.content;
if (!content) throw new Error('Empty AI response');
```

结果：只要走 `/api/chat`，前端几乎必然抛错，再降级到本地关键词搜索。用户看到的「AI 助手」实际不是 Agnes。

**修复建议（二选一，推荐 A）：**

- A. 前端改为 `data.reply`
- B. 后端改为返回 `{ choices: [{ message: { content } }] }` 并同步文档

---

#### 2. `docs/TECH_STACK.md` 仍明文存放 Agnes API Key

```text
const AI_KEY = 'sk-2NSxuaKuMVIPrvdbOXbj6vNrLh5KR4yw9hWIEgYLc4EAHcO3';
```

即使运行时代码已去掉硬编码，**文档与 Git 历史仍构成密钥泄露面**。应立刻轮换该 Key，并从文档删除；用占位符 `sk-***` 即可。

---

#### 3. Node 静态服务无法提供 `/images/*` 与 `/data/*`

`server.js` 白名单仅：

```js
const STATIC_ALLOWED_DIRS = new Set(['css', 'js']);
// ...
|| top === 'data'  // 显式 404
```

同时：

- `index.html` 大量使用 `/images/*.png` 作为区块背景
- `main.js` 用 `fetch('data/policies.json')` 加载数据（**未走** `/api/policies`）
- `Dockerfile` **未** `COPY images/`

影响：

| 运行方式 | 图片 | 政策数据 |
|----------|------|----------|
| EdgeOne 纯静态托管 | 正常（若上传了 images） | 正常 |
| `node server.js` / CNB Preview | 404 | 404（雷达空白） |
| Docker 镜像 | 404 | 可用 `/api/policies`，但前端不调它 |

**修复建议：**

1. `STATIC_ALLOWED_DIRS` 增加 `images`（及如需直出的 `data`，或）
2. `main.js` 改为优先 `fetch('/api/policies')`，静态路径作 fallback
3. Dockerfile 增加 `COPY images/ ./images/`

---

### P1 — 高优先级

#### 4. `scraper/policy_agent.py`：缺环境变量时 `NameError`

```python
if not TAVILY_API_KEY or not AGNES_API_KEY:
    log("缺少环境变量...")  # log 定义在第 91 行
    sys.exit(1)
```

缺 key 时不是友好退出，而是 `NameError: name 'log' is not defined`。把 `def log` 挪到校验之前，或改用 `print`/`sys.stderr`。

---

#### 5. `/api/apply` 失败仍返回 `success: true`

出站创建 Issue 失败时进入 catch，写本地日志后仍：

```js
sendJSON(res, 200, { success: true, message: '提交成功...', fallback: true, logged }, req);
```

若本地日志也失败（`logged: false`），用户仍看到「提交成功」。应区分：

- Issue 成功 → 200 + success
- 仅本地落盘 → 202 + `fallback: true`
- 两者皆失败 → 502 + 明确错误

---

#### 6. Issue 正文未转义用户输入（Markdown / 表格注入）

`name` / `contact` / `message` 直接拼进 Markdown 表格。恶意输入可破坏表格结构、注入额外标题/链接。应对 `|`、换行做转义或改用代码块/纯文本字段。

---

#### 7. 城市数量口径仍不准

- 页面占位与文案：`29` 城
- `policies.json`：`total_cities: 19`（实为 region 数）
- 实际非空 `city` 去重：**28**
- 爬虫注释仍写「37+ 城市」

`js-city-count` 动态更新是对的，但初始 HTML/元数据口径应与字段定义统一（city vs region）。

---

### P2 — 中优先级

#### 8. 政策 URL 质量差

当前 106 条中约 **85 条** path 深度 &lt; 2（多为政府首页/栏目页）。`is_quality_url` 只约束**新增**抓取，历史脏数据未清洗。卡片「查看原文」体验差，也有误导风险。

建议：一次性脚本过滤/人工复核浅层 URL；或前端对浅层 URL 降级展示「来源站点」而非「政策原文」。

---

#### 9. `renderMarkdown` 链接协议未校验

转义了 `<>&`，但 `[x](javascript:...)` 仍可生成可点击链接。应只允许 `http:`/`https:`。

---

#### 10. `applyForm` 死代码 + 假成功

页面 CTA 已改外链腾讯问卷；`main.js` 仍保留 `#applyForm` 处理器：只写 `localStorage`，延迟后提示「专属顾问 24 小时内联系」。若日后误加回表单，会造成虚假承诺。建议删除或改为真实调用 `/api/apply`。

---

#### 11. 限流依赖 `X-Forwarded-For` 首段

无可信代理校验时，客户端可伪造 IP 绕过限流。生产应只信任 CDN/反代注入的头，或改用连接 IP + 网关限流。

---

#### 12. 仓库纳入 `__pycache__/*.pyc`

应加入 `.gitignore` 并从版本库删除。

---

#### 13. 前后端重复拼装聊天 prompt

`chat.js` 仍本地采样政策并拼 `systemPrompt`，但请求体只传 `{ query }`；真正 prompt 在 `server.js` 重建。前端残留逻辑易与后端漂移，可删。

---

#### 14. CDN 刷新 API 选用可疑

`PurgePathCache` 传入单文件 URL `https://domain/data/policies.json`。腾讯云通常对单 URL 用 `PurgeUrlsCache`，对目录用 Path。建议对照 SDK 文档确认，否则「已刷新」可能无效。

---

### P3 — 低优先级 / 体验与工程化

| # | 问题 | 建议 |
|---|------|------|
| 15 | 无自动化测试（API/限流/静态白名单） | 至少加 health + policies + chat 契约的冒烟脚本 |
| 16 | README 与 `REVIEW_REPORT`、TECH_STACK 三套文档互相矛盾 | 以代码为准合并一处「当前架构」 |
| 17 | 静态 404 回退到 `index.html` | 对带扩展名的资源请求不要 SPA fallback |
| 18 | `uncaughtException` 不退出 | 可接受于演示站；生产建议记录后优雅退出由编排拉起 |
| 19 | Dockerfile 注释写「缺 CNB_TOKEN 拒绝启动」 | 与代码降级行为不符，改注释 |
| 20 | AI 匹配雷达区实为本地关键词，文案称「AI」 | 产品文案降调，或真正接 `/api/ai-match` |

---

## 三、已做得较好的部分

1. **零依赖后端**：限流、body 上限、超时、CORS 白名单、`nosniff` 齐全，适合轻量站。
2. **政策卡片 DOM 构建**：`main.js` 的 `el()` + `textContent` 路径正确，避免了常见 XSS。
3. **密钥迁环境变量方向正确**（运行时代码）；爬虫拒绝硬编码默认值方向正确。
4. **社区公约 / 角色边界 / 免责声明**：降低过度承诺与合规风险，产品层面加分。
5. **降级策略**：无 token 仍可预览静态页；聊天失败有本地搜索兜底（尽管当前因契约问题「兜底成了主路径」）。

---

## 四、与仓库内 `REVIEW_REPORT.md` 的差异

| 原报告结论 | 复核结果 |
|------------|----------|
| P0 密钥已修复 ✅ | 运行时代码已迁代理，但 **TECH_STACK.md 仍含明文 Key**；且代理引入 **响应字段不匹配** |
| scraper 缺 key 即退出 ✅ | 实际抛 **NameError**，未干净退出 |
| 城市数已动态同步 ✅ | 动态逻辑有，但占位 29 ≠ 实算 28；region/city 口径混乱 |
| 静态/部署无问题（未提） | **images/data 白名单与 Docker COPY 缺口** 为新发现 P0 |

---

## 五、建议修复顺序

1. 修 `chat.js` 读 `data.reply`（或改后端契约）→ 立刻恢复真 AI  
2. 轮换并清除文档中的 Agnes Key  
3. 静态白名单 + Dockerfile 补 `images`；`main.js` 改走 `/api/policies`  
4. 修复 `policy_agent.py` 的 `log` 顺序  
5. 收紧 `/api/apply` 成功语义与输入转义  
6. 清洗历史浅层政策 URL；补 `.gitignore`；删死代码；补冒烟测试  

---

## 六、数据快照（评审时）

| 指标 | 值 |
|------|-----|
| 政策条数 | 106 |
| `total_cities` 字段 | 19（实为 region 数） |
| 非空 city 去重 | 28 |
| 无 URL | 0 |
| 浅层 URL（path 段 &lt; 2） | ~85 |
| 类型分布 | money 37 / compute 16 / space 14 / talent 9 / loan 8 / model 8 / … |

---

*本报告仅做代码评审，未向 cnb.cool 仓库提交修改。*
