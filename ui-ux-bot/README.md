# UI/UX 设计大师 - 微信小程序

> 基于智谱 GLM 的专业 UI/UX 设计智能助手，封装自 CNB NPC `npc/ui-ux-pro-max`
>
> 默认模型：`glm-4-plus`（可通过环境变量 `GLM_MODEL` 覆盖；具体模型名以 [智谱开放平台](https://open.bigmodel.cn/dev/api) 当前可用列表为准）。

## 🏗️ 架构

```
微信小程序 → CloudBase 云函数 → 智谱 GLM Coding 端点
    ↑               ↑
  3个页面      云数据库 5个集合
  首页/对话/收藏  用户/会话/消息/设计/统计
```

## 📁 项目结构

```
ui-ux-bot/
├── miniprogram/                     # 小程序前端
│   ├── app.js / app.json / app.wxss
│   ├── sitemap.json
│   └── pages/
│       ├── index/                   # 首页（快捷入口+功能介绍）
│       ├── chat/                    # 对话页（核心交互）
│       └── designs/                 # 设计收藏页
├── cloudfunctions/
│   ├── ui-ux-bot/                   # 主云函数
│   │   ├── index.js                 # 主逻辑：对话+收藏+统计（7个action）
│   │   ├── knowledge.js             # UI/UX 知识库（system prompt）
│   │   ├── schema.js                # 数据库集合+索引定义
│   │   └── package.json
│   └── db-init/                     # 数据库初始化云函数
│       ├── index.js                 # 创建集合（索引需在控制台手动添加）
│       └── package.json
├── project.config.json
└── README.md
```

## 🗄️ 云数据库设计

### 集合清单

| 集合名 | 说明 | 核心字段 | 权限 |
|--------|------|----------|------|
| `users` | 用户信息 | openid, nickname, role, design_count | 本人可读写 |
| `chat_sessions` | 对话会话 | session_id, openid, title, status, msg_count | 本人可读写 |
| `chat_messages` | 对话消息 | session_id, openid, role, content, tokens_used | 本人可读写 |
| `design_systems` | 设计收藏 | openid, title, industry, style, colors, is_favorite | 本人可读写 |
| `api_usage` | API 统计 | openid, api_name, total_tokens, cost_cny, latency_ms | 本人可读 |

### 索引设计

| 集合 | 索引名 | 字段 | 唯一 |
|------|--------|------|------|
| `users` | openid_unique | { openid: 1 } | ✅ |
| `chat_sessions` | openid_updated | { openid: 1, updated_at: -1 } | ❌ |
| `chat_sessions` | session_id_unique | { session_id: 1 } | ✅ |
| `chat_messages` | session_id_created | { session_id: 1, created_at: 1 } | ❌ |
| `chat_messages` | openid_created | { openid: 1, created_at: -1 } | ❌ |
| `design_systems` | openid_favorite | { openid: 1, is_favorite: -1 } | ❌ |
| `design_systems` | openid_industry | { openid: 1, industry: 1 } | ❌ |
| `api_usage` | openid_created | { openid: 1, created_at: -1 } | ❌ |

### 数据流向

```
用户发消息 → chat_messages 写入（user + assistant）
          → chat_sessions 更新（msg_count +1, last_msg_at）
          → api_usage 写入（token 统计 + 费用计算）
          → users 更新（design_count +1）

保存设计   → design_systems 写入
收藏设计   → design_systems 更新（is_favorite 切换）
查看用量   → api_usage 聚合查询
```

## 🚀 部署步骤

### 1. Clone 项目

```bash
git clone https://cnb.cool/cnbvv/ui-ux-bot.git
```

### 2. 微信开发者工具打开

1. 打开微信开发者工具
2. 选择「导入项目」
3. 目录选择 `ui-ux-bot`
4. AppID 填写你的小程序 AppID

### 3. 初始化数据库

1. 右键 `cloudfunctions/db-init` → 上传并部署
2. 在 CloudBase 控制台 → 云函数 → 手动触发 `db-init`
3. 在 CloudBase 控制台 → 数据库，确认 5 个集合已创建
4. 在各集合 → 索引管理，按上方索引表手动添加索引
5. 在各集合 → 数据权限，按上方权限表设置规则

### 4. 配置云函数环境变量

> ⚠️ **安全提示**：请勿将 API Key 写入仓库或 `index.js`。云函数已强制要求通过环境变量注入，未配置时直接返回 500。

CloudBase 控制台 → 云函数 → `ui-ux-bot` → 环境变量：

| 变量 | 必填 | 说明 |
|------|------|------|
| `GLM_API_KEY` | ✅ | 智谱开放平台密钥（建议使用 Coding Plan 子 key） |
| `GLM_MODEL` | 否 | 默认 `glm-4-plus`，可改为 `glm-4-flash` / `glm-4.6` 等 |
| `GLM_API` | 否 | 默认 Coding Plan 端点；如需通用端点可覆盖 |
| `MAX_HISTORY` | 否 | 上下文保留轮数，默认 20 |
| `MAX_PROMPT_CHARS` | 否 | 单次提示最大字符数，默认 4000 |
| `DAILY_QUOTA_PER_USER` | 否 | 单用户每日调用上限，默认 200 |

### 5. 部署主云函数

1. 右键 `cloudfunctions/ui-ux-bot` → 在终端中打开
2. 执行 `npm install`
3. 右键选择「上传并部署：云端安装依赖」

### 6. 修改 project.config.json

```json
"appid": "你的小程序AppID"
```

### 7. 编译运行

点击开发者工具的「编译」即可预览

## 🔐 安全须知

1. **API Key 不得入库**：仓库中任何位置（包括 README 示例）都禁止出现真实 key；如有泄漏请立即在智谱控制台吊销并重置。
2. **云函数所有权校验**：`delete_design` / `toggle_favorite` 在云函数内会校验 `designId` 归属，避免越权操作。
3. **限流与长度限制**：`chat` 接口受 `DAILY_QUOTA_PER_USER` 与 `MAX_PROMPT_CHARS` 控制，可结合 CloudBase 控制台并发限制使用。
4. **rich-text 渲染**：对话页的 markdown→html 转换会先做 HTML 转义，再处理 markdown 语法，避免 AI 输出中的原始标签破坏渲染。

## ✨ 功能

### 首页
- 🎨 4 个快捷设计入口
- 📋 核心能力介绍
- 💬 一键开始对话

### 对话页
- 🤖 多轮设计对话（上下文连续）
- 📋 复制回复 / 保存设计
- 🔄 新对话 / 继续对话
- 💾 消息自动持久化到云数据库

### 设计收藏页
- ❤️ 收藏/取消收藏设计系统
- 🔍 按行业/风格筛选
- 🎨 配色方案可视化预览
- 📊 全部 / 收藏切换

### 后端能力
- 📊 API 调用统计（token / 费用 / 延迟）
- 🗄️ 云数据库持久化（5 个集合 + 8 个索引）
- 🔒 数据权限隔离（用户只能访问自己的数据）

## 🔧 云函数 API

| action | 说明 | 参数 |
|--------|------|------|
| `chat` | 对话 | prompt, sessionId |
| `history` | 加载历史 | sessionId, limit, beforeId（游标分页） |
| `reset` | 归档会话 | sessionId |
| `save_design` | 保存设计 | sessionId, title, industry, style, rawReply |
| `list_designs` | 设计列表 | favoriteOnly, page, pageSize |
| `delete_design` | 删除设计 | designId |
| `toggle_favorite` | 切换收藏 | designId |
| `usage` | 用量统计 | days |

## 📄 许可证

MIT
