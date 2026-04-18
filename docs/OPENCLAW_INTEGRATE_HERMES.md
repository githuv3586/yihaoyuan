# OpenClaw 集成 Hermes 优点的方案

> **背景**：Hermes Agent（Nous Research 出品）近期发布了原生个人微信适配器，其微信集成的设计质量业界公认领先。本文系统梳理 **Hermes 值得借鉴的 12 个关键设计**，并给出在 OpenClaw（主模型 `zai/glm-5-turbo`）上逐项落地的方案与代码骨架。
>
> 参考：
> - [Hermes 微信适配器官方文档（中文社区）](https://hermesagent.org.cn/docs/user-guide/messaging/weixin)
> - [Hermes Agent 微信配置指南](https://lanqiu.tech/blog/hermes-weixin-setup-guide/)
> - [NousResearch/Hermes-Function-Calling](https://github.com/NousResearch/Hermes-Function-Calling)

---

## 0. TL;DR — Hermes 最值得抄的 12 个点

| # | Hermes 亮点 | OpenClaw 对应落地 | 优先级 |
| --- | --- | --- | --- |
| 1 | **iLink Bot API + 长轮询**：不用公网 IP / Webhook / WebSocket | 新建 `@openclaw/channel-weixin-ilink` 插件 | ⭐⭐⭐ |
| 2 | **扫码即连**：`hermes gateway setup` 一条命令完成登录 | `openclaw onboard --channel weixin` 向导 | ⭐⭐⭐ |
| 3 | **AES-128-ECB 加密 CDN** 透明处理媒体 | 插件内置加解密模块，上层无感 | ⭐⭐⭐ |
| 4 | **智能消息分块**（≤4000 字符，段落边界，代码块保完整） | `MessageChunker`（按段落/代码块切） | ⭐⭐⭐ |
| 5 | **Markdown → 微信友好格式**（`#` → `【】`，表格 → 键值列表） | `WeixinMarkdownRenderer` | ⭐⭐⭐ |
| 6 | **"正在输入…"** 状态（typing_ticket 缓存 10 分钟） | `channel.sendTyping(chatId)` 实现 | ⭐⭐ |
| 7 | **消息去重**（5 分钟滑动窗口，按 msg_id） | `DedupCache` LRU + TTL | ⭐⭐⭐ |
| 8 | **context_token 持久化** 保证重启后回复连续 | `~/.openclaw/weixin/context-tokens.json` | ⭐⭐⭐ |
| 9 | **分级访问策略**（`open/allowlist/disabled/pairing`） | `AccessPolicy` 中间件 | ⭐⭐ |
| 10 | **SSRF 保护**：媒体下载前校验目标地址 | `safeFetch()` + 黑白名单 | ⭐⭐ |
| 11 | **SQLite + FTS5 长期记忆**：跨会话、跨平台 | OpenClaw 内置 SessionStore 扩展为 `MemoryStore` | ⭐⭐⭐ |
| 12 | **令牌独占锁**：防止多实例同时轮询 | `~/.openclaw/weixin/.lock` | ⭐⭐ |
| 加分 | **Hermes-Function-Calling 递归工具调用范式** | Skill 调用链支持 `maxDepth=5` | ⭐⭐ |

> 一句话：把 Hermes 的微信适配器**作为蓝本**，移植到 OpenClaw 的插件体系，同时**保留 OpenClaw 自身的 skill / provider / dashboard 架构优势**。

---

## 1. 架构思路：插件化移植，而不是整体套皮

Hermes 和 OpenClaw 本质都是"本地运行 + 多平台接入 + LLM 驱动"的个人 Agent。直接 fork 会造成两份代码维护负担，**最优解是把 Hermes 的微信能力封装为 OpenClaw 插件**：

```
┌─────────────────────────────────────────────────────────┐
│  OpenClaw Gateway (Node.js)                             │
│   ├─ skills / dispatcher / model-provider (保留)         │
│   └─ plugins/                                            │
│        └─ @openclaw/channel-weixin-ilink   ← 新增        │
│            ├─ ilink-client.ts    (长轮询 + 扫码)          │
│            ├─ crypto-cdn.ts      (AES-128-ECB)           │
│            ├─ chunker.ts         (智能分块)              │
│            ├─ md-renderer.ts     (微信 Markdown)         │
│            ├─ access-policy.ts   (DM/Group 策略)         │
│            ├─ context-store.ts   (context_token 持久化)  │
│            ├─ dedup.ts           (5min 滑动窗口)         │
│            ├─ typing.ts          (typing_ticket)         │
│            └─ token-lock.ts      (单实例锁)              │
└─────────────────────────────────────────────────────────┘
```

优势：
- 上层 **skill / dispatcher / GLM provider 零改动**，复用上一版方案里的所有优化。
- 微信接入层与业务解耦，后续如果 iLink 协议变更，只改插件。
- 可以发布到 [ClawHub](https://clawhub.ai/)，惠及整个 OpenClaw 社区。

---

## 2. 逐项集成方案

### 2.1 iLink 长轮询（Hermes 亮点 #1）

**为什么值得抄**：
公众号回调 5s 超时、企业微信 IP 白名单、gewechat 要起本地服务——都绕不过网络限制。Hermes 用腾讯官方 iLink Bot API + HTTP 长轮询，**个人号场景下这是目前最干净的方案**。

**OpenClaw 落地**：

```ts
// plugins/channel-weixin-ilink/src/ilink-client.ts
export class ILinkClient {
  private buf = new PersistentCursor("~/.openclaw/weixin/getupdates.buf");
  private failCount = 0;

  async *poll(signal: AbortSignal): AsyncIterator<ILinkUpdate> {
    while (!signal.aborted) {
      try {
        const updates = await this.post("/getupdates", {
          cursor: this.buf.get(),
          timeout: 35,               // 长轮询 35s，与 Hermes 一致
        }, { timeout: 40_000, signal });

        for (const u of updates) {
          this.buf.set(u.cursor);    // 磁盘持久化游标
          yield u;
        }
        this.failCount = 0;
      } catch (e: any) {
        await this.backoff(e);       // 参照 Hermes 重试策略（见 2.12）
      }
    }
  }

  private async backoff(e: any) {
    if (e?.errcode === -14) {        // 会话过期
      log.error("iLink session expired, pause 10min, re-run setup");
      await sleep(600_000);
      return;
    }
    this.failCount++;
    const wait = this.failCount <= 2 ? 2_000 : 30_000;
    await sleep(wait);
    if (this.failCount >= 3) this.failCount = 0;
  }
}
```

---

### 2.2 扫码即连 / 交互式向导（#2）

**为什么值得抄**：
OpenClaw 自己的 `openclaw onboard` 目前只覆盖模型提供商。Hermes 的 `hermes gateway setup` 能在终端直接打印二维码，用户掏手机一扫就完事，**比申请企业微信应用、配 gewechat 简单 10 倍**。

**OpenClaw 落地**：
扩展 `openclaw onboard`，增加 `--channel weixin` 子流程。

```ts
// plugins/channel-weixin-ilink/src/setup-wizard.ts
export async function weixinSetup() {
  const { qrUrl, loginKey } = await ilink.post("/getqrcode");
  console.log("\n请用微信扫描以下二维码登录：\n");
  renderQrInTerminal(qrUrl);         // 用 `qrcode-terminal`
  console.log(`\n或在浏览器打开：${qrUrl}`);

  for (let i = 0; i < 3; i++) {      // 二维码最多自动刷新 3 次（对齐 Hermes）
    const r = await pollScan(loginKey, 120_000);
    if (r.status === "scanned")   console.log("✔ 已扫码，请在手机上确认…");
    if (r.status === "confirmed") {
      saveCredentials({
        accountId: r.account_id, token: r.token, baseUrl: r.base_url,
      });
      console.log(`\n✔ 微信连接成功，account_id=${r.account_id}`);
      return;
    }
    if (r.status === "expired") { renderQrInTerminal(await refreshQr()); continue; }
  }
  throw new Error("二维码多次过期，请检查网络");
}
```

凭证写到 `~/.openclaw/weixin/accounts/<account_id>.json`，与 `openclaw.json` 解耦。

---

### 2.3 AES-128-ECB 加密 CDN（#3）

**为什么值得抄**：
微信媒体走腾讯 CDN 必须加解密，这层若暴露给业务会极其恶心。Hermes 把它封成**完全透明**的一层。

**OpenClaw 落地**：

```ts
// plugins/channel-weixin-ilink/src/crypto-cdn.ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export function decryptMedia(buf: Buffer, keyRaw: string): Buffer {
  const key = normalizeKey(keyRaw);                    // base64 / hex 两种都兼容
  const d = createDecipheriv("aes-128-ecb", key, null);
  d.setAutoPadding(true);                              // PKCS#7
  return Buffer.concat([d.update(buf), d.final()]);
}

export async function encryptAndUpload(file: Buffer): Promise<MediaRef> {
  const key = randomBytes(16);                         // 128-bit
  const c = createCipheriv("aes-128-ecb", key, null);
  const ct = Buffer.concat([c.update(file), c.final()]);
  const { uploadUrl } = await ilink.post("/getuploadurl");
  await put(uploadUrl, ct);
  return { url: uploadUrl, keyBase64: key.toString("base64") };
}

function normalizeKey(k: string): Buffer {
  return /^[0-9a-f]{32}$/i.test(k) ? Buffer.from(k, "hex")
                                   : Buffer.from(k, "base64");
}
```

上层 skill 调用 `channel.sendImage(buf)` 时**完全无感**，照常拿到图片 URL。

---

### 2.4 智能消息分块（#4）

**为什么值得抄**：
微信单条消息过长会被折叠、影响阅读甚至触发风控。Hermes 的分块规则：
- ≤ 4000 字符
- 优先按**段落 / 空行**切
- **代码块整体保留**，不在围栏内断开
- 缩进续行（列表子项）跟随父项
- 超大单块 fallback 到硬截断

**OpenClaw 落地**：

```ts
// plugins/channel-weixin-ilink/src/chunker.ts
export function chunkForWeixin(text: string, max = 4000): string[] {
  const blocks = splitPreservingCodeFence(text);       // 切出段落/代码块 token 流
  const out: string[] = [];
  let cur = "";
  for (const b of blocks) {
    if (b.length > max) {                              // 超大单块硬切
      if (cur) { out.push(cur); cur = ""; }
      for (let i = 0; i < b.length; i += max) out.push(b.slice(i, i + max));
      continue;
    }
    if ((cur + "\n\n" + b).length > max) { out.push(cur); cur = b; }
    else cur = cur ? cur + "\n\n" + b : b;
  }
  if (cur) out.push(cur);
  return out;
}
```

比单纯按字数切要智能得多，代码块不会被切成两半。

---

### 2.5 Markdown → 微信友好格式（#5）

**为什么值得抄**：
微信个人聊天不渲染完整 Markdown。Hermes 的转换规则很接地气：
- `# 标题` → `【标题】`
- `## 二级` → `**二级**`
- 表格 → `- 列名: 值` 键值列表
- 代码块原样保留
- 多余空行 → 合并为双换行

**OpenClaw 落地**：

```ts
// plugins/channel-weixin-ilink/src/md-renderer.ts
export function renderForWeixin(md: string): string {
  return md
    .replace(/^# (.+)$/gm, "【$1】")
    .replace(/^#{2,6} (.+)$/gm, "**$1**")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\|.+\|$/gm, lineToKV)
    .replace(/\*\*(.+?)\*\*/g, "$1");                  // 微信不渲染加粗，去掉符号更干净
}

function lineToKV(line: string): string { /* 把 markdown table 行变成 "- 列: 值" */ }
```

这一步和 §2.4 的分块**必须同序执行**：先渲染 → 再分块，否则 `【标题】` 会被切断。

---

### 2.6 "正在输入…" 状态（#6）

**为什么值得抄**：
这是 Hermes 微信适配器里最能提升"AI 像活的"质感的细节。GLM-5-Turbo 首 token 有 1–3s 延迟，有这个状态用户不会焦虑。

**OpenClaw 落地**：

```ts
// plugins/channel-weixin-ilink/src/typing.ts
const typingCache = new LruCache<string, { ticket: string; exp: number }>(1000);

export async function sendTyping(chatId: string) {
  const now = Date.now();
  let e = typingCache.get(chatId);
  if (!e || e.exp < now) {
    const { typing_ticket } = await ilink.post("/getconfig", { chat_id: chatId });
    e = { ticket: typing_ticket, exp: now + 10 * 60_000 };   // 10 分钟，与 Hermes 一致
    typingCache.set(chatId, e);
  }
  await ilink.post("/sendtyping", { chat_id: chatId, ticket: e.ticket, action: "start" });
}
```

Dispatcher 在调用 skill 前触发 `sendTyping()`，首 chunk 发出后触发 `stopTyping()`。

---

### 2.7 消息去重（#7）

**为什么值得抄**：
长轮询 + 网络抖动必然出现重复消息。GLM 调用又贵又慢，**同一条消息绝不能处理两次**。

**OpenClaw 落地**：

```ts
// plugins/channel-weixin-ilink/src/dedup.ts
export class DedupCache {
  private map = new Map<string, number>();
  private ttl = 5 * 60_000;

  seen(id: string): boolean {
    this.gc();
    if (this.map.has(id)) return true;
    this.map.set(id, Date.now());
    return false;
  }
  private gc() {
    const now = Date.now();
    for (const [k, t] of this.map) if (now - t > this.ttl) this.map.delete(k);
  }
}
```

消息入口第一行：`if (dedup.seen(msg.id)) return;`

---

### 2.8 context_token 持久化（#8）

**为什么值得抄**：
iLink 要求每条出站消息**必须回传 context_token**，不然发送失败。Hermes 把它按 `account+peer` 维度落盘，重启后**继续回复**，用户完全无感。

**OpenClaw 落地**：

```ts
// plugins/channel-weixin-ilink/src/context-store.ts
const FILE = path.join(os.homedir(), ".openclaw/weixin/context-tokens.json");

export class ContextTokenStore {
  private data: Record<string, string> = {};

  async load()         { this.data = JSON.parse(await fs.readFile(FILE, "utf8").catch(() => "{}")); }
  key(acc: string, peer: string) { return `${acc}::${peer}`; }
  get(acc: string, peer: string) { return this.data[this.key(acc, peer)]; }

  async set(acc: string, peer: string, token: string) {
    this.data[this.key(acc, peer)] = token;
    await fs.writeFile(FILE, JSON.stringify(this.data), "utf8");
  }
}
```

---

### 2.9 分级访问策略（#9）

**为什么值得抄**：
个人号默认被拉进几百个群，不做白名单机器人瞬间变刷屏源。Hermes 的四档策略（`open / allowlist / disabled / pairing`）粒度刚好。

**OpenClaw 落地**：

```ts
// plugins/channel-weixin-ilink/src/access-policy.ts
type Policy = "open" | "allowlist" | "disabled" | "pairing";

export class AccessGuard {
  constructor(
    private dmPolicy: Policy,
    private groupPolicy: Policy,
    private allowUsers: Set<string>,
    private allowGroups: Set<string>,
  ) {}

  allow(msg: WeixinMessage): boolean {
    if (msg.isGroup) {
      if (this.groupPolicy === "disabled") return false;
      if (this.groupPolicy === "allowlist") return this.allowGroups.has(msg.chatId);
      return true;
    } else {
      if (this.dmPolicy === "disabled") return false;
      if (this.dmPolicy === "allowlist") return this.allowUsers.has(msg.fromId);
      if (this.dmPolicy === "pairing")   return pairingSession.isActive(msg.fromId);
      return true;
    }
  }
}
```

**默认值对齐 Hermes**：`dm=open, group=disabled`（个人号必须这么配）。

---

### 2.10 SSRF 保护（#10）

**为什么值得抄**：
媒体 URL 会从微信返回，理论上可被污染为 `http://169.254.169.254/`（云厂商元数据端点）等内网地址。Hermes 默认拦截。

**OpenClaw 落地**：

```ts
// plugins/channel-weixin-ilink/src/safe-fetch.ts
import { lookup } from "node:dns/promises";
import ipRangeCheck from "ip-range-check";

const BLOCK = ["127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12",
               "192.168.0.0/16", "169.254.0.0/16", "::1/128", "fc00::/7"];

export async function safeFetch(url: string) {
  const { hostname, protocol } = new URL(url);
  if (!/^https?:$/.test(protocol)) throw new Error("SSRF: non-http(s) scheme");
  const { address } = await lookup(hostname);
  if (BLOCK.some(c => ipRangeCheck(address, c))) {
    throw new Error(`SSRF: blocked private address ${address}`);
  }
  return fetch(url);
}
```

---

### 2.11 SQLite + FTS5 长期记忆（#11）

**为什么值得抄**：
Hermes **跨对话、跨平台**记住用户偏好/项目背景。OpenClaw 自带 SessionStore 是短期上下文（N 轮截断），没有**可检索的长期记忆**，这是目前最大的短板之一。

**OpenClaw 落地**：

```ts
// core/memory/memory-store.ts
export class MemoryStore {
  constructor(private db = new Database("~/.openclaw/memory.db")) {
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memories USING fts5(
        user_id, channel, summary, content, tags,
        tokenize='porter unicode61'
      );
      CREATE TABLE IF NOT EXISTS memory_meta(
        id INTEGER PRIMARY KEY, user_id TEXT, channel TEXT,
        ts INTEGER, score REAL
      );
    `);
  }

  async remember(userId: string, channel: string, item: MemoryItem) {
    this.db.prepare(`INSERT INTO memories VALUES (?,?,?,?,?)`).run(
      userId, channel, item.summary, item.content, (item.tags ?? []).join(" "),
    );
  }

  async recall(userId: string, query: string, k = 5): Promise<MemoryItem[]> {
    return this.db.prepare(`
      SELECT summary, content FROM memories
      WHERE user_id = ? AND memories MATCH ?
      ORDER BY rank LIMIT ?
    `).all(userId, query, k) as any;
  }
}
```

与 GLM 的配合：每轮对话后**用 GLM-5-Turbo 自己提炼**一条 `summary`（tool-calling 强约束 JSON 输出）存入 memory；新消息进来先 `recall(top-5)` 拼进 system prompt。

```ts
// skill/chat/handler.ts
const mem = await memory.recall(msg.fromId, msg.text, 5);
const sys = [
  persona.system_prompt,
  mem.length ? `用户相关记忆：\n${mem.map(m => "- " + m.summary).join("\n")}` : "",
].filter(Boolean).join("\n\n");
```

---

### 2.12 令牌独占锁（#12）

**为什么值得抄**：
iLink 同一 token 只能一个实例轮询，多开会互相踢。Hermes 启动时**抢文件锁**，冲突直接拒启并给提示，非常稳。

**OpenClaw 落地**：

```ts
// plugins/channel-weixin-ilink/src/token-lock.ts
import { open } from "node:fs/promises";
import lockfile from "proper-lockfile";

export async function acquireTokenLock(token: string) {
  const f = `~/.openclaw/weixin/.lock-${sha8(token)}`;
  try {
    return await lockfile.lock(f, { retries: 0, realpath: false, stale: 60_000 });
  } catch {
    throw new Error("另一个 OpenClaw Gateway 已占用该 Weixin token，请先停止它");
  }
}
```

---

### 2.13 Hermes-Function-Calling 递归调用范式（加分项）

Hermes-Function-Calling 仓库定义了一个工程化范式：**递归函数调用，默认 `maxDepth=5`，JSON Schema 强约束**。OpenClaw 的 skill 应该对齐这一范式，避免死循环同时给 Agent 足够思考空间。

```ts
// core/agent/tool-loop.ts
export async function runToolLoop(
  msg: Message,
  tools: Tool[],
  maxDepth = 5,
): Promise<string> {
  const history: ChatMessage[] = [ { role: "user", content: msg.text } ];
  for (let d = 0; d < maxDepth; d++) {
    const r = await llm.chat({ model: "glm-5-turbo", messages: history, tools });
    const call = r.choices[0].message.tool_calls?.[0];
    if (!call) return r.choices[0].message.content!;
    const out = await tools.find(t => t.name === call.function.name)!.exec(
      JSON.parse(call.function.arguments),
    );
    history.push(r.choices[0].message, { role: "tool", tool_call_id: call.id, content: JSON.stringify(out) });
  }
  return "（达到最大推理深度，已停止迭代）";
}
```

---

## 3. 落地路线图（按 ROI）

### 阶段 A — 跑通 iLink 通路
1. 新建 `@openclaw/channel-weixin-ilink` 插件骨架
2. iLink 长轮询 + 扫码向导（§2.1、§2.2）
3. 令牌锁 + 消息去重 + context_token 持久化（§2.12、§2.7、§2.8）
4. 最小可用：能收发纯文本

### 阶段 B — 体验对齐 Hermes
5. 智能分块 + Markdown 渲染（§2.4、§2.5）
6. "正在输入…" 状态（§2.6）
7. 分级访问策略 + SSRF 保护（§2.9、§2.10）
8. AES-128-ECB 媒体收发（§2.3）

### 阶段 C — 智能能力升级
9. SQLite + FTS5 长期记忆（§2.11） ← **最大增量价值**
10. Hermes-Function-Calling 风格的递归工具循环（§2.13）
11. 把这个插件发布到 ClawHub，惠及社区

---

## 4. 代码目录结构建议

```
plugins/channel-weixin-ilink/
├── package.json
├── README.md
├── skill.md                       # ClawHub 描述
└── src/
    ├── index.ts                   # 插件注册入口
    ├── channel.ts                 # 实现 OpenClaw Channel 接口
    ├── ilink-client.ts            # 长轮询 + API 封装
    ├── setup-wizard.ts            # 扫码向导（onboard 钩子）
    ├── crypto-cdn.ts              # AES-128-ECB
    ├── chunker.ts                 # 消息分块
    ├── md-renderer.ts             # Markdown → 微信
    ├── typing.ts                  # 输入状态
    ├── dedup.ts                   # 5 分钟去重
    ├── context-store.ts           # context_token 持久化
    ├── access-policy.ts           # DM / Group 策略
    ├── safe-fetch.ts              # SSRF 防护
    ├── token-lock.ts              # 单实例锁
    └── types.ts
```

`openclaw.json` 里启用：

```json
{
  "channels": {
    "weixin-ilink": {
      "plugin": "@openclaw/channel-weixin-ilink",
      "enabled": true,
      "accountId": "${WEIXIN_ACCOUNT_ID}",
      "token": "${WEIXIN_TOKEN}",
      "dmPolicy": "open",
      "groupPolicy": "allowlist",
      "allowGroups": ["group_xxx"],
      "admins": ["wxid_xxx"]
    }
  }
}
```

---

## 5. OpenClaw vs Hermes：保留 OpenClaw 的优势

集成 Hermes 能力的同时，**不要丢掉 OpenClaw 自己的长处**：

| 维度 | OpenClaw 优势 | 策略 |
| --- | --- | --- |
| 模型 Provider | 原生支持 Z.AI Coding Plan + 多模型 fallback 链（见上一版方案） | **保留**，Hermes 微信层只负责 I/O |
| Dashboard | `openclaw dashboard` 可视化网关状态、QPS、成本 | **保留**，新增"微信通道"面板块 |
| Skill 生态 | ClawHub 技能市场 + 官方插件 | **保留**，反过来把 Hermes 思想做成 skill 贡献回社区 |
| `openclaw doctor` | 配置检查 | **扩展** `--channel weixin` 诊断（token 有效性、锁状态、去重缓存） |
| 成本控制 | cost 字段 / Coding Plan 次级调度优化 | **保留**，Hermes 长期记忆可减少重复问答调用，与成本控制正相关 |

换句话说：
> **骨架用 OpenClaw，微信神经用 Hermes**。

---

## 6. 指标对齐（集成前后对比）

| 指标 | 集成前（OpenClaw + gewechat/公众号） | 集成后（OpenClaw + Hermes 风微信插件） |
| --- | --- | --- |
| 接入复杂度 | 起本地服务 / 白名单 / 回调域名 | 一条 `openclaw onboard --channel weixin` + 扫码 |
| 媒体消息支持 | 需自行实现加解密 | 透明收发，零业务代码 |
| 长消息体验 | 被折叠 / 风控 | 自动分块 + Markdown 转写 |
| 重启后连续性 | 上下文丢失 / 重发 | `context_token` + dedup 持久化，零重复 |
| 长期记忆 | 仅 N 轮上下文 | FTS5 全文检索，可回忆数月前对话 |
| 抗风控 | 易被封 | 发送节奏 + 策略 + typing 更接近真人 |

---

## 7. 一页命令速查

```bash
# 1. 安装插件
pnpm add -g @openclaw/channel-weixin-ilink

# 2. 扫码登录
openclaw onboard --channel weixin

# 3. 重启网关生效
openclaw gateway restart

# 4. 诊断
openclaw doctor --channel weixin

# 5. 查看通道状态
openclaw status weixin
```

---

## 8. 参考资料

- [Hermes Agent 微信适配器官方文档（中文社区）](https://hermesagent.org.cn/docs/user-guide/messaging/weixin)
- [Hermes Agent 微信配置指南](https://lanqiu.tech/blog/hermes-weixin-setup-guide/)
- [NousResearch/Hermes-Function-Calling（递归工具调用范式）](https://github.com/NousResearch/Hermes-Function-Calling)
- [Hermes 3 Technical Report（Agentic / Long-context 特性）](https://nousresearch.com/hermes3)
- [OpenClaw 官方文档](https://docs.openclaw.ai/)
- [智谱 OpenClaw 配置官方文档（GLM-5-Turbo）](https://docs.bigmodel.cn/cn/coding-plan/tool/openclaw)

---

**结论**：Hermes 的微信适配器真正拉开差距的是 **iLink 长轮询 + 透明媒体加解密 + SQLite/FTS5 长期记忆** 三件套。按本文 A → B → C 路线把它们移植为 OpenClaw 插件，就能在保留 OpenClaw 自身 GLM-5-Turbo / Dashboard / Skill 生态的同时，把微信体验拉到业界第一梯队。
