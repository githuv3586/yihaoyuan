# OpenClaw 安装准备清单（中国大陆环境）

> **适用**：Windows 10/11、macOS、Linux（Ubuntu/Debian/CentOS 等）
> **主模型**：`zai/glm-5-turbo`（智谱 GLM Coding Plan）
> **关键提醒**：OpenClaw 本体从 `openclaw.ai` 下载，不需要梯子；但 Node.js、pnpm、部分 skill 可能走境外 CDN，**建议提前配好国内镜像**。
>
> 📋 **打勾式清单**，从上往下做完就能直接装。

---

## 0. 一页纸清单（快速版）

```
□ 1. 硬件：内存 ≥ 8GB（推荐 16GB），磁盘预留 ≥ 10GB
□ 2. 系统：Win10+ / macOS 12+ / Ubuntu 20.04+
□ 3. 安装 Node.js ≥ 22 LTS（用 nvm 管理，配国内镜像）
□ 4. 安装 pnpm（推荐）或用 npm，配淘宝镜像
□ 5. 注册智谱开放平台账号，订阅 GLM Coding Plan
□ 6. 创建 API Key 并妥善保存
□ 7. 准备一个独立微信号（建议）+ 手机在手（扫码用）
□ 8. （可选）配好终端代理变量或给 OpenClaw 单独走直连
□ 9. （可选）准备 Git、Python 3.10+、Docker（扩展 skill 用）
□ 10. 规划目录：工作区 / 配置 / 日志
□ 11. 读完本仓库 4 份优化方案，心中有数
□ 12. 备份现有 ~/.openclaw（若已装过）
```

---

## 1. 硬件与系统检查

### 最低 / 推荐配置

| 项目 | 最低 | 推荐 |
| --- | --- | --- |
| CPU | 2 核 | 4 核+ |
| 内存 | 4 GB | **16 GB**（跑 RAG / 本地 embedding 时吃内存）|
| 磁盘 | 5 GB | **20 GB**（预留技能 / 日志 / 缓存空间）|
| 网络 | 能访问 `openclaw.ai`、`open.bigmodel.cn`、`npmmirror.com` | 稳定带宽 ≥ 5 Mbps |
| 系统 | Win10 / macOS 12 / Ubuntu 20.04 | Win11 / macOS 14+ / Ubuntu 22.04+ |

### 快速自检命令

Windows PowerShell：
```powershell
[System.Environment]::OSVersion
(Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB
```

macOS / Linux：
```bash
uname -a
free -h 2>/dev/null || vm_stat | head -5
df -h ~ | tail -1
```

---

## 2. 安装 Node.js ≥ 22（必需）

OpenClaw 要求 **Node.js 22 或更新**。用 `nvm` 管理最省心。

### Windows（PowerShell）

推荐用 `nvm-windows`：
```powershell
winget install CoreyButler.NVMforWindows
nvm install 22
nvm use 22
node -v   # 应显示 v22.x
```

### macOS / Linux

```bash
# 装 nvm（用腾讯/npmmirror 镜像加速）
export NVM_DIR="$HOME/.nvm"
curl -o- https://gitee.com/mirrors/nvm/raw/master/install.sh | bash
source ~/.bashrc   # 或 ~/.zshrc

# 用 npmmirror 镜像装 Node.js
export NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node
nvm install 22
nvm use 22
nvm alias default 22
node -v
```

### 配 npm 国内镜像（强烈推荐）

```bash
npm config set registry https://registry.npmmirror.com

# 原生模块二进制镜像（node-llama-cpp / sharp 等依赖）
npm config set disturl https://npmmirror.com/mirrors/node
npm config set sharp_binary_host https://npmmirror.com/mirrors/sharp
npm config set sharp_libvips_binary_host https://npmmirror.com/mirrors/sharp-libvips
npm config set node_llama_cpp_binary_host https://npmmirror.com/mirrors/node-llama-cpp
```

验证：
```bash
npm config get registry
# → https://registry.npmmirror.com/
```

---

## 3. 安装 pnpm（推荐）

OpenClaw 官方文档推荐用 pnpm（更省磁盘、装原生模块更稳）：

```bash
npm install -g pnpm
pnpm config set registry https://registry.npmmirror.com
pnpm -v
```

⚠️ 安装 OpenClaw 时 pnpm 会问你是否批准一些原生构建脚本（`node-llama-cpp`、`sharp` 等）：
```bash
pnpm approve-builds -g
```
**全部选 yes**，否则图片/本地模型相关 skill 会报错。

---

## 4. 智谱 GLM Coding Plan 准备

### 4.1 注册与订阅
1. 打开 <https://open.bigmodel.cn/>，用**手机号/邮箱**注册
2. 完成**实名认证**（国内合规要求，必须）
3. 前往 <https://zhipuaishengchan.datasink.sensorsdata.cn/t/Nd> 订阅 **GLM Coding Plan**
   - 有免费额度，先上车试用
   - 账户余额建议预充 20–50 元做缓冲

### 4.2 创建 API Key
1. 前往 <https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys>
2. 点"添加新的 API Key"，命名如 `openclaw-local`
3. **立即复制**，形如 `xxxxxxx.xxxxxxxxxxxx`（只显示一次）

### 4.3 保存 API Key（重要！）

**不要写进代码**，也不要发微信发群。推荐三种方式：

**A. 环境变量（最简单）**

macOS / Linux —— 写入 `~/.bashrc` 或 `~/.zshrc`：
```bash
export ZAI_API_KEY='xxxxxxx.xxxxxxxxxxxx'
```
Windows PowerShell：
```powershell
[Environment]::SetEnvironmentVariable('ZAI_API_KEY','xxxxxxx.xxxxxxxxxxxx','User')
```

**B. 专用 dotenv 文件**
```bash
mkdir -p ~/.openclaw
cat > ~/.openclaw/.env <<'EOF'
ZAI_API_KEY=xxxxxxx.xxxxxxxxxxxx
EOF
chmod 600 ~/.openclaw/.env
```

**C. 密码管理器**：1Password / Bitwarden / KeePass 都行。

### 4.4 验证 API Key 是否可用

```bash
curl -sS https://open.bigmodel.cn/api/coding/paas/v4/chat/completions \
  -H "Authorization: Bearer $ZAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5-turbo",
    "messages": [{"role":"user","content":"ping"}],
    "max_tokens": 8
  }'
```

若返回 JSON 带 `"choices": [...]` 即成功；若 `401` 是 key 错，`403` 通常是未订阅 Coding Plan。

⚠️ **端点必须是** `https://open.bigmodel.cn/api/coding/paas/v4`，不是 `.../api/paas/v4`。官方说明：OpenClaw 必须走 **Coding 端点**，否则走错计费/限流策略。

---

## 5. 微信号与手机准备

### 5.1 账号选择

| 接入方式 | 需要准备 | 优缺点 |
| --- | --- | --- |
| **iLink（Hermes 风格，推荐）** | 一个**个人**微信号 + 手机 | 扫码即连、无需公网；有封号风险 |
| **gewechat** | 个人微信 + 本地跑 gewechat 服务 | 免费但维护成本高 |
| **企业微信自建应用** | 企业微信管理员 + 公网 IP | 稳定无封号；要企业认证 |
| **公众号 / 服务号** | 认证公众号 + 公网域名 | 合规；5s 超时严格 |

**强烈建议**：
- 用**小号**（别拿主号），避免被封影响生活
- 不要把机器人拉进不相关的群
- 发送间隔 ≥ 800ms（见《Hermes 集成》§2 的 `sendPolicy`）

### 5.2 手机侧准备
- 微信更新到最新版
- 扫码期间保持手机在线
- 开启微信的"登录设备管理"，便于出问题时踢出异常登录

---

## 6. 网络与代理（中国特别提醒）

### 6.1 需要能访问的域名

| 域名 | 用途 | 通常访问情况 |
| --- | --- | --- |
| `openclaw.ai` / `docs.openclaw.ai` | 安装脚本 / 文档 | ✅ 国内直连 |
| `registry.npmmirror.com` | npm 镜像 | ✅ 国内直连 |
| `open.bigmodel.cn` | 智谱 API | ✅ 国内直连 |
| `github.com` | skill 源码、插件 | ⚠️ 有时不稳，配镜像 |
| `huggingface.co` | 模型权重（若装本地 LLM） | ❌ 建议换 ModelScope |
| `ilinkai.weixin.qq.com` | 微信 iLink Bot API | ✅ 国内直连 |
| `clawhub.ai` | OpenClaw 技能市场 | ✅ 国内直连 |

### 6.2 GitHub 加速（常用）
```bash
git config --global url."https://hub.fastgit.xyz/".insteadOf "https://github.com/"
# 或用 ghproxy
git config --global url."https://mirror.ghproxy.com/https://github.com/".insteadOf "https://github.com/"
```

### 6.3 代理注意事项

若你用了代理（clash/v2ray 等），**务必确认**：
- `127.0.0.1:7890` 之类代理端口对 `open.bigmodel.cn` 要么**不走代理**（分流），要么走代理但稳定
- 错误配置会让 OpenClaw 请求智谱反而**绕路出国**，延迟和丢包大增

推荐在 clash rules 里加：
```yaml
- DOMAIN-SUFFIX,bigmodel.cn,DIRECT
- DOMAIN-SUFFIX,openclaw.ai,DIRECT
- DOMAIN-SUFFIX,weixin.qq.com,DIRECT
- DOMAIN-SUFFIX,npmmirror.com,DIRECT
```

---

## 7. 目录与文件规划

建议一开始就把目录结构想清楚，省得后面乱：

```
~/.openclaw/                     ← OpenClaw 主目录（安装后自动生成）
├── openclaw.json                ← 主配置（模型、通道、agent）
├── .env                         ← 环境变量（ZAI_API_KEY 等），chmod 600
├── persona.yaml                 ← 人格/风格（见优化方案）
├── intents.yaml                 ← 关键词路由表
├── workspace/                   ← Agent 工作沙箱，所有文件操作限制在此
├── weixin/                      ← 微信相关
│   ├── accounts/                ← iLink 凭证
│   ├── context-tokens.json      ← 会话令牌持久化
│   └── getupdates.buf           ← 长轮询游标
├── skills/                      ← 已装技能
├── memory.db                    ← SQLite + FTS5 长期记忆
├── traces/                      ← 决策链路日志
├── audit/                       ← 审计日志（按日期切分）
└── logs/                        ← 运行日志
```

提前创建：
```bash
mkdir -p ~/.openclaw/{workspace,weixin/accounts,skills,traces,audit,logs}
chmod 700 ~/.openclaw
chmod 600 ~/.openclaw/.env 2>/dev/null || true
```

**强烈建议**：
- `~/.openclaw/workspace/` 作为 Agent 允许写入的**唯一**本地目录（对应《全自治》方案的沙箱根）
- **不要**把 OpenClaw 运行账户设为 root / 管理员

---

## 8. 可选依赖（按需装）

| 依赖 | 用途 | 装法（国内） |
| --- | --- | --- |
| Git | 拉 skill 源码 | `apt install git` / `winget install git` |
| Python 3.10+ | 部分 skill 用到（RAG / data） | `apt install python3 python3-pip` |
| `uv` 或 `pip` + 清华源 | Python 包 | `pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple` |
| Docker | 跑沙箱 / 数据库 / Redis | 国内建议 Docker Desktop 或 Rancher Desktop |
| Redis（可选） | 缓存 / 会话存储 | `docker run -d --name redis -p 6379:6379 redis:7` |
| SQLite CLI | 直接查 memory.db | `apt install sqlite3` |
| `qrcode-terminal` | 终端显示微信二维码 | 安装 OpenClaw 时自动带，或 `pnpm add -g qrcode-terminal` |

---

## 9. 安全与合规检查

中国大陆环境下额外注意：

- ✅ 智谱账户**已实名**
- ✅ API Key 妥善保存，**不放公共仓库**
- ✅ `.env` 加入 `.gitignore`（若代码入 git）
- ✅ 微信机器人**仅**加入自己/可信群，不做商业骚扰
- ✅ 内容审核准备：接入智谱自带审核或阿里云绿网 / 腾讯天御
- ✅ 若用于商业用途，走**企业微信**而非个人号
- ✅ 用户数据落盘位置（memory.db）**加密**或限制访问权限
- ✅ `openclaw.json` 中不直接写明文 key，用 `${ZAI_API_KEY}` 占位

---

## 10. 预演：打通 GLM-5-Turbo 最小可用链路

在装 OpenClaw **之前**，先用一段 30 行 Node.js 确认 Key、端点、网络都 OK：

创建 `~/smoke-test.mjs`：
```js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey:  process.env.ZAI_API_KEY,
  baseURL: "https://open.bigmodel.cn/api/coding/paas/v4",
});

const t0 = Date.now();
const r = await client.chat.completions.create({
  model: "glm-5-turbo",
  messages: [{ role: "user", content: "一句话自我介绍" }],
  stream: true,
  max_tokens: 80,
});

process.stdout.write("回复：");
for await (const chunk of r) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}
console.log(`\n\n耗时 ${Date.now() - t0}ms`);
```

运行：
```bash
mkdir -p ~/smoke && cd ~/smoke
npm init -y >/dev/null
npm i openai --registry=https://registry.npmmirror.com
node ~/smoke-test.mjs
```

预期：1–3 秒内流式吐出一句话。
- **401**：Key 错
- **403**：没订阅 Coding Plan
- **429**：限流，等 1 分钟再试
- **ECONNRESET / TIMEOUT**：网络有问题，检查代理

---

## 11. 备份现有环境（若装过）

若你之前装过 OpenClaw，**一定**先备份：
```bash
cp -a ~/.openclaw ~/.openclaw.bak.$(date +%F)
```

Windows：
```powershell
Copy-Item -Recurse "$env:USERPROFILE\.openclaw" "$env:USERPROFILE\.openclaw.bak"
```

重装前至少保留：
- `openclaw.json`
- `persona.yaml` / `intents.yaml`
- `weixin/accounts/`（微信凭证，丢了要重扫码）
- `memory.db`（长期记忆，丢了 Agent "失忆"）

---

## 12. 安装当天顺序（真·Step by Step）

```
1. 打开终端，确认 node -v ≥ 22、pnpm -v OK
2. 确认 echo $ZAI_API_KEY 能打印
3. 跑 ~/smoke-test.mjs 验证 GLM-5-Turbo 连通
4. 准备好手机（要扫微信二维码）
5. 执行：
      curl -fsSL https://openclaw.ai/install.sh | bash
   （Windows PowerShell 用 iwr -useb https://openclaw.ai/install.ps1 | iex）
6. 安装完自动进入 onboard：
      - Model/auth provider  → Z.AI
      - Coding-Plan-CN       → 粘贴 ZAI_API_KEY
      - 默认模型             → 选 glm-5-turbo
7. Channel 选择微信（iLink / gewechat / 企业微信之一）
   → 按提示扫码或填配置
8. 选择 Hatch in TUI（推荐，先在终端里试用）
9. 对机器人说"你好"，看能否正常回复
10. 通过后再 open.bigmodel.cn 看 token 用量，确认计费正确
11. 回到本仓库 docs/ 目录，按 4 份优化方案逐步启用
12. 最后做一次 openclaw doctor 诊断
```

---

## 13. 常见坑（事先知道，少踩雷）

| 坑 | 解决 |
| --- | --- |
| `node -v` 显示 16/18 | 必须 ≥ 22，用 nvm 升级 |
| `pnpm install` 卡在 sharp/node-llama-cpp | 没配 `npm config set sharp_binary_host`（见 §2）|
| 智谱 API 401 | 检查 Authorization 头、Key 是否复制全 |
| 智谱 API 403 | 没订阅 Coding Plan 或 Plan 过期 |
| 端点错（普通 `paas/v4` 而非 `coding/paas/v4`） | 计费走错套餐，必须改成 Coding 端点 |
| 选了 Flash / FlashX 模型 | 官方文档明确：Coding Plan 下用会扣费，只能选 `GLM-5.1 / GLM-5-Turbo / GLM-4.7 / GLM-4.5-Air` |
| 微信扫码一直超时 | 手机和电脑不在同一"登录时段"；重试 `openclaw config` |
| 微信账号被限制 | 用了主号 + 频繁发消息，换小号 + 限频 |
| `~/.openclaw` 写不进 | 目录权限，`chmod 700 ~/.openclaw` |
| 代理把请求绕出国 | 配 clash 分流规则（见 §6.3） |
| 二维码终端渲染乱 | `pnpm add -g qrcode-terminal` 或打开提示的 URL |
| 回复里夹杂英文提示 | system prompt 没设中文；见 `persona.yaml` |

---

## 14. 安装后第一件事

```bash
openclaw doctor                # 基础自检
openclaw status                # 网关状态
openclaw dashboard             # 浏览器打开 Dashboard（看 token/成本/trace）
```

然后按本仓库 4 份方案循序渐进：

1. `docs/OPENCLAW_WECHAT_OPTIMIZATION.md` —— 配置 `openclaw.json` 的关键字段（§3），尤其 `primary/fallbacks/stream/firstTokenTimeoutMs`
2. `docs/OPENCLAW_INTEGRATE_HERMES.md` —— 如果用个人微信，先上 iLink Channel + 消息分块 + typing + dedup
3. `docs/OPENCLAW_FULL_AUTONOMY.md` —— 开启 L3 自治、配置 Autonomy / Budget / Guard
4. `docs/OPENCLAW_TOKEN_OPTIMIZATION.md` —— 打开 Prompt Cache、模型分层、L1/L2 缓存

---

## 15. 一份可复制的 `~/.openclaw/.env` 模板

```bash
# ====== 智谱 GLM ======
ZAI_API_KEY=xxxxxxx.xxxxxxxxxxxx
ZAI_BASE_URL=https://open.bigmodel.cn/api/coding/paas/v4

# ====== 自治 Agent ======
OPENCLAW_AUTONOMY_LEVEL=3
OPENCLAW_BUDGET_TOKENS=50000
OPENCLAW_BUDGET_TIME_MS=300000

# ====== 微信（iLink 风格，装完向导自动补）======
# WEIXIN_ACCOUNT_ID=
# WEIXIN_TOKEN=
WEIXIN_DM_POLICY=open
WEIXIN_GROUP_POLICY=allowlist
WEIXIN_ALLOWED_USERS=wxid_yourself
WEIXIN_GROUP_ALLOWED_USERS=

# ====== 日志/缓存 ======
OPENCLAW_LOG_LEVEL=info
OPENCLAW_CACHE_L1=true
OPENCLAW_CACHE_L2=true

# ====== 管理员 ======
OPENCLAW_ADMINS=wxid_yourself
```

放在 `~/.openclaw/.env`，`chmod 600`。

---

## 16. 准备齐了没？最终自检

```bash
# 命令都能跑 = 准备完成
node -v && echo "Node ✔"
pnpm -v && echo "pnpm ✔"
npm config get registry | grep -q npmmirror && echo "npm 镜像 ✔"
[ -n "$ZAI_API_KEY" ] && echo "API Key ✔"
curl -sS -o /dev/null -w "%{http_code}\n" https://open.bigmodel.cn/ | grep -q 200 && echo "智谱网络 ✔"
mkdir -p ~/.openclaw && echo "目录 ✔"
```

全部打勾 → 可以开装：
```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

---

## 17. 参考

- [OpenClaw 官方文档](https://docs.openclaw.ai/)
- [智谱 OpenClaw 配置指南](https://docs.bigmodel.cn/cn/coding-plan/tool/openclaw)
- [智谱开放平台控制台](https://open.bigmodel.cn/)
- [ClawHub 技能市场](https://clawhub.ai/)
- [npmmirror（淘宝镜像新站）](https://npmmirror.com/)
- [nvm 镜像（gitee）](https://gitee.com/mirrors/nvm)
- 本仓库内：
  - `docs/OPENCLAW_WECHAT_OPTIMIZATION.md`
  - `docs/OPENCLAW_INTEGRATE_HERMES.md`
  - `docs/OPENCLAW_FULL_AUTONOMY.md`
  - `docs/OPENCLAW_TOKEN_OPTIMIZATION.md`

---

**一句话总结**：
> 装前三件事——**Node 22、智谱 Coding Plan API Key、小号微信**。加上国内镜像 + 分流规则，基本不会踩坑。按 §12 的顺序一步步走，10 分钟能跑起来。
