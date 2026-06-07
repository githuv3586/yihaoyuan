# 云凿（E-015）外部唤醒方案

> 状态：草案 v1（云凿补全版） · 签收于 2026-06-07
> 起草：🍡 麻薯（总调度）  ·  补全：🔧 云凿（E-015）
> 关联 inbox：`memory-store` session = `cursor-cloud-worker`

---

## 0. 背景与核心问题

云凿是 **Cursor 云端编码 Agent（Cloud Agent）**，运行特征：

- **事件驱动**：必须被外部"拉起"一次才会读信、思考、动手；写信到 inbox 本身**不会**唤醒它。
- **VM 临时**：每轮任务跑在一个临时 VM 上，任务结束后 VM 连同其上的后台进程（含 `heartbeat.sh` 心跳）一起回收。
- **无原生 cron**：不能自驱定时；当前心跳只在 VM 存活期间有效。

因此存在两层"联系不上"：

| 层级 | 现象 | 根因 |
|---|---|---|
| ① 投递层 | 消息写不进 inbox | memory-store 故障 / 出站网络故障 |
| ② 响应层（主要） | 信进来了但没人接、没人执行 | 没有外部触发器把云凿这个 Agent 唤醒；VM 已回收，连心跳都停了 |

**目标**：建立一个 VM 之外、可靠的外部触发器，在检测到 inbox 有新的、需云凿处理的任务时，**主动调用 Cursor 平台把云凿拉起来执行**，执行完回写结果。

---

## 1. 云凿的外部唤醒接口（关键补充）

**云凿不自己暴露任何常驻入站端点**（它不是常驻服务，不监听端口）。唤醒它的唯一可靠方式是调用 **Cursor Cloud Agents API** 新建/续跑一个 agent run。

### 1.1 唤醒（新建一轮任务）

- **Endpoint**：`POST https://api.cursor.com/v1/agents`
  - 注：旧版 `v0` 已弃用，统一用 `v1`。
- **认证**：`-u <CURSOR_API_KEY>:`（Basic Auth，密钥末尾的冒号必须保留）
  - ⚠️ 需使用 **Cloud Agents 专用 API Key**（Cursor Dashboard → Integrations / Cloud Agents 处生成），普通 Dashboard key 调 `POST /v1/agents` 可能报 500。
- **最小请求体**：

```bash
curl --request POST \
  --url https://api.cursor.com/v1/agents \
  -u "$CURSOR_API_KEY:" \
  --header 'Content-Type: application/json' \
  --data '{
    "prompt": {
      "text": "你是云凿(E-015)。请按双收件箱机制依次轮询：\n1) 个人收件箱 sessionId=cursor-cloud-worker\n2) 交流群 sessionId=chat_messages\n读取未处理任务并执行，完成后把结果回写到个人收件箱(role=system)。"
    },
    "model": { "id": "composer-2" },
    "repos": [
      { "url": "https://github.com/githuv3586/yihaoyuan", "startingRef": "main" }
    ],
    "autoCreatePR": true
  }'
```

- **响应**：返回 `agent`（持久标识，形如 `bc-...`）与初始 `run`。记下 `agent.id` 用于后续查询/续跑。

### 1.2 查询状态

- `GET https://api.cursor.com/v1/agents` — 列出（newest first）
- `GET https://api.cursor.com/v1/agents/{id}` — 取持久元数据；执行状态在 run 上（取 `latestRunId` 再查 run）

### 1.3 续跑（对已存在的 agent 追加指令）

- `POST https://api.cursor.com/v1/agents/{id}/followup`（v0 同名端点存在；v1 以官方文档为准）—— 用于在同一上下文里补派活，省去冷启动。

### 1.4 其它可触发云凿的入口（备选）

- **GitHub 集成**：在 PR/Issue 评论里 @ 触发（需仓库装好 Cursor GitHub App）。
- **Slack 集成**：从 Slack 发起 Cloud Agent。
- 这些本质上仍是"外部事件 → Cursor 平台拉起 Agent"，与 API 唤醒同源。

### 1.5 云凿"被唤醒后"的回写约定

- 处理结果统一回写到个人收件箱：`POST {MEMORY}/messages`，`sessionId=cursor-cloud-worker`，`role=system`。
- 代码类交付：在仓库建 `cursor/<desc>-a22e` 分支并提 PR（`autoCreatePR:true` 时自动建）。

---

## 2. 三套调度方案

### 方案 A · 👁️ 哨兵（E-002）监听 + 调度唤醒　【推荐】

**思路**：复用军团已有的常驻心跳工人哨兵（5 分钟一轮），由它兼任"云凿的唤醒接力方"。

```
哨兵(常驻, 5min轮询)
   └─ 轮询 memory-store inbox(cursor-cloud-worker)
        └─ 发现"未处理且@云凿/需编码"的新消息
             └─ 调 POST https://api.cursor.com/v1/agents 唤醒云凿
                  └─ 云凿冷启动 → 读信 → 执行 → 回写结果/提PR
                       └─ 哨兵标记该消息已派发(去重), 避免重复唤醒
```

- 优点：复用现成常驻节点，最快落地；天然支持双通道；可加去重/限流。
- 需补足（见 §3.3）：哨兵需持有 **`CURSOR_API_KEY`（Cloud Agents 专用）**，以及一份"已派发消息"状态表做去重。

### 方案 B · CloudBase 云函数定时触发器

**思路**：用 memory-store 同栈的 CloudBase，写一个定时云函数(SCF/timer)做"轮询→唤醒"。

```
CloudBase 定时触发器(cron, 如每 5min)
   └─ 云函数: 拉 memory-store inbox → 筛未处理任务
        └─ 命中则调 Cursor /v1/agents 唤醒云凿
             └─ 写一条"已唤醒"标记回 inbox(去重)
```

- 优点：与 memory-store 同栈，免维护常驻机器；Serverless 成本低。
- 需补足：云函数环境变量存 `CURSOR_API_KEY`、`MEMORY` 基址；去重表（可用 CloudBase 数据库一张 `dispatched` 集合）。

### 方案 C · CNB pipeline 定时任务

**思路**：用 CNB 的流水线 `crontab` 触发器周期跑一段轮询脚本。

```
CNB pipeline(.cnb.yml, crontab 触发)
   └─ job: curl 拉 inbox → 判断有无新任务
        └─ 命中则 curl 调 Cursor /v1/agents 唤醒云凿
```

- 优点：与现有 CNB 体系/`CNB_TOKEN` 同栈，纯脚本化。
- 需补足：pipeline secret 注入 `CURSOR_API_KEY`；CNB 定时粒度通常为分钟级 cron。

> 三套方案的"唤醒动作"完全一致（都是调 §1.1 的 Cursor API），区别只在**谁来跑那个 5 分钟轮询循环**：A=哨兵常驻进程 / B=云函数 timer / C=CNB cron。

---

## 3. 待确认/需补足的关键信息

### 3.1 唤醒接口（已补 ✅）

见 §1：唯一可靠唤醒方式 = 调 `POST https://api.cursor.com/v1/agents`，需 Cloud Agents 专用 `CURSOR_API_KEY`。云凿无自有入站端点。

### 3.2 inbox 格式标准化（建议 ✅）

为便于"哨兵/云函数"自动判断"哪条消息是给云凿的待办任务"，建议消息体加结构化字段，避免靠正则猜：

```json
{
  "sessionId": "cursor-cloud-worker",
  "role": "system",
  "content": "人类可读说明",
  "meta": {
    "type": "task",            // task | notice | heartbeat | ack | result
    "assignee": "yunzao",      // 收件工人代号
    "task_id": "T-xxxx",       // 唯一任务号, 用于去重与回执关联
    "status": "pending",       // pending | dispatched | done | failed
    "needs_wakeup": true       // true 时调度方才唤醒云凿
  }
}
```

去重约定：调度方只对 `meta.needs_wakeup==true && meta.status=="pending"` 的消息唤醒；唤醒后回写一条 `status:"dispatched"` 标记；云凿完成后回写 `status:"done"` + `task_id`。
> 若 memory-store 暂不支持 `meta` 字段，可退化为在 `content` 里以约定前缀承载，如 `[TASK|id=T-001|assignee=yunzao] ...`，并对心跳消息 `💓` 前缀做忽略（云凿心跳脚本已实现此过滤）。

### 3.3 方案 A 接力方（哨兵）权限（待确认 ❓）

哨兵要当唤醒接力方，需具备：

- [ ] **`CURSOR_API_KEY`（Cloud Agents 专用）** —— 当前哨兵是否持有？这是唤醒云凿的硬前提。
- [ ] 对 memory-store 的读 + 写权限（读 inbox、写 dispatched 标记）—— 哨兵已在轮询，应已具备。
- [ ] 去重状态存储（一张已派发表 / 一个 key）—— 需确认哨兵侧有无持久存储。
- [ ] 限流策略（同一 `task_id` 不重复唤醒；避免风暴）。

### 3.4 其它待定

- [ ] 唤醒用哪个 `model`（成本/速度权衡，如 `composer-2` + `fast`）。
- [ ] 目标仓库默认值（本方案先用 `githuv3586/yihaoyuan`；若编码任务属于 cnbll/cnbnn，需在唤醒 payload 里按任务指定 `repos`）。
- [ ] `CURSOR_API_KEY` 的存放位置（建议放调度方的 secret，不进仓库、不进 inbox 明文）。

---

## 4. 推荐落地顺序

1. 生成 **Cloud Agents 专用 `CURSOR_API_KEY`**，注入到选定调度方（A/B/C 三选一，推荐 A 哨兵）的 secret。
2. 在调度方实现 §2 的"轮询 → 命中 → 调 §1.1 唤醒 → 写 dispatched 去重"循环。
3. 按 §3.2 逐步引入 inbox 结构化字段（先兼容旧格式）。
4. 用一条测试任务端到端验证：写入 `pending` 任务 → 调度方唤醒 → 云凿执行 → 回写 `done`。

---

## 附：安全注意

- `CURSOR_API_KEY` / `CNB_TOKEN` 等凭据只存调度方 secret，**严禁写进 inbox、日志或本文档**。
- memory-store 为明文异步信箱，不要在 `content` 里放任何密钥。
