# OpenClaw 安装准备包（中国大陆环境）

> **目标**：装 OpenClaw 之前，先把能踩的坑都踩过一遍。
>
> 全包提供 4 件可执行资产 + 2 份模板 + 本清单，跟着做完就能直接 `curl install.sh | bash`。

---

## 资产一览

| 文件 | 用途 |
| --- | --- |
| `scripts/preflight-check.sh` | Linux / macOS 一键自检（Node/pnpm/网络/Key/磁盘） |
| `scripts/preflight-check.ps1` | Windows PowerShell 一键自检 |
| `scripts/setup-env.sh` | Linux / macOS 半自动配镜像、装 nvm/Node22/pnpm |
| `scripts/smoke-test.mjs` | 用 30 行 Node 验证 GLM-5-Turbo 连通性（流式） |
| `templates/openclaw.env.template` | `~/.openclaw/.env` 起手模板 |
| `templates/openclaw.json.template` | `~/.openclaw/openclaw.json` 起手模板 |

最快路径：

```bash
# 1) 半自动准备环境（仅 Linux / macOS）
bash scripts/setup-env.sh

# 2) 把模板拷到家目录
mkdir -p ~/.openclaw
cp templates/openclaw.env.template  ~/.openclaw/.env
cp templates/openclaw.json.template ~/.openclaw/openclaw.json
chmod 600 ~/.openclaw/.env

# 3) 编辑 .env 填 ZAI_API_KEY，然后跑联通测试
$EDITOR ~/.openclaw/.env
export $(grep -v '^#' ~/.openclaw/.env | xargs)
node scripts/smoke-test.mjs

# 4) 全量预飞自检
bash scripts/preflight-check.sh
```

`preflight-check` 全部 ✔ 即可进入正式安装。

---

## 0. 一页纸清单

```
□ 1. 硬件：内存 ≥ 8GB（推荐 16GB），磁盘预留 ≥ 10GB
□ 2. 系统：Win10+ / macOS 12+ / Ubuntu 20.04+
□ 3. Node.js ≥ 22 LTS（用 nvm 管理，配国内镜像）
□ 4. pnpm（推荐）或 npm，registry 指向 npmmirror
□ 5. 智谱开放平台账号 + GLM Coding Plan 订阅 + 实名
□ 6. API Key（形如 xxxx.xxxx），保存到 ~/.openclaw/.env
□ 7. 一个独立微信号 + 手机（扫码用）
□ 8. clash 等代理对 bigmodel.cn / openclaw.ai / weixin.qq.com 走 DIRECT
□ 9. 可选：Git / Python 3.10+ / Docker / Redis（按 skill 需求）
□ 10. 目录：~/.openclaw 700，~/.openclaw/.env 600
□ 11. 备份现有 ~/.openclaw（若已装过）
□ 12. preflight-check.sh 全 ✔ → 开装
```

---

## 1. 硬件与系统

| 项目 | 最低 | 推荐 |
| --- | --- | --- |
| CPU | 2 核 | 4 核+ |
| 内存 | 4 GB | **16 GB** |
| 磁盘 | 5 GB | **20 GB** |
| 网络 | 能访问 `openclaw.ai` / `open.bigmodel.cn` / `npmmirror.com` | ≥ 5 Mbps |
| 系统 | Win10 / macOS 12 / Ubuntu 20.04 | Win11 / macOS 14+ / Ubuntu 22.04+ |

---

## 2. Node.js ≥ 22

### Linux / macOS（推荐用 `scripts/setup-env.sh`）

```bash
bash scripts/setup-env.sh
```

脚本会：

- 用 gitee 镜像装 nvm
- 用 npmmirror 镜像装 Node 22 LTS
- 给 npm / pnpm 全套配淘宝镜像 + sharp / node-llama-cpp 二进制镜像
- 装 pnpm
- 写入 shell 配置（`~/.bashrc` 或 `~/.zshrc`）

### Windows

```powershell
winget install CoreyButler.NVMforWindows
nvm install 22
nvm use 22
node -v        # v22.x
npm config set registry https://registry.npmmirror.com
npm i -g pnpm
pnpm config set registry https://registry.npmmirror.com
```

---

## 3. 智谱 GLM Coding Plan

1. 注册：<https://open.bigmodel.cn/>
2. 实名认证（**必须**）
3. 订阅 **GLM Coding Plan**：<https://zhipuaishengchan.datasink.sensorsdata.cn/t/Nd>
4. 创建 API Key：<https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys>
5. 复制 Key 到 `~/.openclaw/.env`：

```bash
ZAI_API_KEY=xxxxxxx.xxxxxxxxxxxx
ZAI_BASE_URL=https://open.bigmodel.cn/api/coding/paas/v4
```

⚠️ **端点必须是** `…/coding/paas/v4`，不是 `…/paas/v4`，否则计费走错套餐。

验证：

```bash
node scripts/smoke-test.mjs
```

预期 1–3 秒内流式吐字。错误码对照：

| HTTP | 原因 |
| --- | --- |
| 401 | Key 错（粘贴漏字符是常见原因） |
| 403 | 没订阅 / 套餐过期 |
| 429 | 限流，等 1 分钟再试 |
| ECONNRESET / ETIMEDOUT | 网络（多半是代理串到墙外） |

---

## 4. 微信账号

| 接入方式 | 账号 | 优缺点 |
| --- | --- | --- |
| **iLink（推荐）** | 个人微信小号 + 手机扫码 | 即开即用，有封号风险 |
| **gewechat** | 个人微信 + 本地服务 | 免费但维护成本高 |
| **企业微信自建应用** | 企业微信 + 公网 IP | 稳定无封号 |
| **公众号 / 服务号** | 认证公众号 | 5s 超时严格 |

铁律：

- **不用主号**
- 发送间隔 ≥ 800ms
- 不拉进无关群

---

## 5. 网络

需要直连的域名：

```
openclaw.ai / docs.openclaw.ai
open.bigmodel.cn
registry.npmmirror.com
ilinkai.weixin.qq.com
clawhub.ai
```

clash 分流（强烈建议）：

```yaml
- DOMAIN-SUFFIX,bigmodel.cn,DIRECT
- DOMAIN-SUFFIX,openclaw.ai,DIRECT
- DOMAIN-SUFFIX,weixin.qq.com,DIRECT
- DOMAIN-SUFFIX,npmmirror.com,DIRECT
- DOMAIN-SUFFIX,clawhub.ai,DIRECT
```

GitHub 加速（拉 skill 用）：

```bash
git config --global url."https://mirror.ghproxy.com/https://github.com/".insteadOf "https://github.com/"
```

---

## 6. 目录规划

```
~/.openclaw/
├── openclaw.json     # 主配置（templates/openclaw.json.template）
├── .env              # 密钥环境变量（templates/openclaw.env.template，chmod 600）
├── workspace/        # Agent 沙箱（唯一允许写入的目录）
├── weixin/           # 微信凭证 / 长轮询游标
├── skills/           # 已装技能
├── memory.db         # SQLite + FTS5 长期记忆
├── traces/           # 决策链路日志
├── audit/            # 审计日志
└── logs/             # 运行日志
```

预创建：

```bash
mkdir -p ~/.openclaw/{workspace,weixin/accounts,skills,traces,audit,logs}
chmod 700 ~/.openclaw
[ -f ~/.openclaw/.env ] && chmod 600 ~/.openclaw/.env
```

---

## 7. 安装当天

```
1. bash scripts/preflight-check.sh   # 全 ✔
2. node scripts/smoke-test.mjs       # GLM 通
3. 手机解锁、微信小号在手
4. curl -fsSL https://openclaw.ai/install.sh | bash
   # Windows: iwr -useb https://openclaw.ai/install.ps1 | iex
5. onboard 向导：
     Provider: Z.AI / Coding-Plan-CN
     Key:      粘贴 ZAI_API_KEY
     Model:    glm-5-turbo
     Channel:  iLink / gewechat / 企业微信
6. Hatch in TUI（推荐）→ 对机器人发"你好"
7. open.bigmodel.cn 看 token 用量是否计入 Coding Plan
8. openclaw doctor / openclaw status / openclaw dashboard
```

---

## 8. 常见坑

| 坑 | 解决 |
| --- | --- |
| `node -v` 是 16/18 | 必须 ≥ 22，用 nvm 升级 |
| `pnpm install` 卡 sharp / node-llama-cpp | 没配二进制镜像（见 setup-env.sh） |
| 智谱 401 | Key 漏字符 / 没复制全 |
| 智谱 403 | 没订阅 Coding Plan |
| 端点写成普通 `paas/v4` | 改成 `coding/paas/v4` |
| 选错模型（Flash/FlashX） | Coding Plan 下只能用 GLM-5.1 / GLM-5-Turbo / GLM-4.7 / GLM-4.5-Air |
| 微信扫码超时 | 重新 `openclaw config`，保持手机在线 |
| 代理把请求绕出国 | clash 加 DIRECT 分流（见 §5） |
| 二维码乱码 | `pnpm add -g qrcode-terminal` 或开提示 URL |
| 写不进 ~/.openclaw | `chmod 700 ~/.openclaw` |

---

## 9. 备份（已装过的人）

```bash
cp -a ~/.openclaw ~/.openclaw.bak.$(date +%F)
```

至少保留：`openclaw.json`、`weixin/accounts/`、`memory.db`、`persona.yaml`、`intents.yaml`。

---

## 10. 参考

- OpenClaw 官方文档：<https://docs.openclaw.ai/>
- 智谱 OpenClaw 配置指南：<https://docs.bigmodel.cn/cn/coding-plan/tool/openclaw>
- 智谱开放平台：<https://open.bigmodel.cn/>
- ClawHub 技能市场：<https://clawhub.ai/>
- npmmirror：<https://npmmirror.com/>

---

**一句话总结**：
> 装前三件套——**Node 22、智谱 Coding Plan Key、小号微信**。
> 跑通 `preflight-check.sh` + `smoke-test.mjs`，就可以放心 `install.sh`。
