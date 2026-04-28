# yihaoyuan — OpenClaw 安装准备包

> 中国大陆环境下安装 OpenClaw 之前要做的所有准备工作。
>
> 给你一份**可执行**的预安装资产，而不是又一份纯文档。

## 内容

```
docs/
  ├── OPENCLAW_INSTALL_PREP_CN.md   # 装机前一页清单 + 常见坑
  ├── OPENCLAW_INSTALL_LOG.md       # VM 实测装机日志（事实依据）
  └── MODEL_CONFIGURATION_CN.md     # 大模型配置手册（GLM / Z.AI 4 端点）

scripts/
  ├── preflight-check.sh            # Linux/macOS 预飞自检（必跑）
  ├── preflight-check.ps1           # Windows PowerShell 预飞自检
  ├── setup-env.sh                  # Linux/macOS 一键备 nvm/Node22/pnpm + 镜像
  ├── smoke-test.mjs                # GLM Coding 端点流式联通测试
  ├── install-openclaw.sh           # 装机包装器（先 preflight、后官方 install.sh）
  └── configure-zai-coding-cn.sh    # 非交互式配大模型（4 端点 + SecretRef）

templates/
  ├── openclaw.env.template         # ~/.openclaw/.env 模板
  └── openclaw.json.template        # ~/.openclaw/openclaw.json 模板（schema-valid）
```

## 快速开始（Linux / macOS）

```bash
# 1) 一键装环境（nvm + Node 22 + pnpm + 全套镜像）
bash scripts/setup-env.sh
exec $SHELL -l

# 2) 准备配置 + 填 Key
mkdir -p ~/.openclaw
cp templates/openclaw.env.template  ~/.openclaw/.env
cp templates/openclaw.json.template ~/.openclaw/openclaw.json
chmod 600 ~/.openclaw/.env
$EDITOR ~/.openclaw/.env             # 把 ZAI_API_KEY 填进去

# 3) 验证 GLM 链路（流式吐字 = 成功）
export $(grep -v '^#' ~/.openclaw/.env | xargs)
node scripts/smoke-test.mjs

# 4) 全量预飞自检
bash scripts/preflight-check.sh

# 5) 装 OpenClaw（包装器：先预飞、再调官方脚本、带重试）
bash scripts/install-openclaw.sh

# 6) 非交互式配大模型（默认 GLM Coding-Plan-CN + SecretRef 安全模式）
bash scripts/configure-zai-coding-cn.sh

# 7) 自检 + 进入聊天
openclaw doctor --non-interactive
openclaw chat
```

详见：

- 装机：[`docs/OPENCLAW_INSTALL_PREP_CN.md`](docs/OPENCLAW_INSTALL_PREP_CN.md) + [`docs/OPENCLAW_INSTALL_LOG.md`](docs/OPENCLAW_INSTALL_LOG.md)
- 配大模型：[`docs/MODEL_CONFIGURATION_CN.md`](docs/MODEL_CONFIGURATION_CN.md)

## 快速开始（Windows）

```powershell
# 1) 装 Node 22
winget install CoreyButler.NVMforWindows
nvm install 22
nvm use 22

# 2) 配镜像 + 装 pnpm
npm config set registry https://registry.npmmirror.com
npm i -g pnpm
pnpm config set registry https://registry.npmmirror.com

# 3) 准备 ~/.openclaw
New-Item -ItemType Directory -Force "$HOME\.openclaw" | Out-Null
Copy-Item templates\openclaw.env.template  "$HOME\.openclaw\.env"
Copy-Item templates\openclaw.json.template "$HOME\.openclaw\openclaw.json"
notepad "$HOME\.openclaw\.env"       # 填 ZAI_API_KEY

# 4) 联通测试 + 自检
$lines = Get-Content "$HOME\.openclaw\.env" | Where-Object {$_ -notmatch '^\s*#' -and $_ -match '='}
foreach ($l in $lines) {
    $kv = $l -split '=', 2
    [Environment]::SetEnvironmentVariable($kv[0].Trim(), $kv[1].Trim(), 'Process')
}
node scripts/smoke-test.mjs
pwsh scripts/preflight-check.ps1

# 全 ✔ 后正式安装
iwr -useb https://openclaw.ai/install.ps1 | iex
```

## 装前三件套

1. **Node.js ≥ 22**（用 nvm 管理）
2. **智谱 GLM Coding Plan API Key**（端点必须是 `…/coding/paas/v4`）
3. **小号微信 + 手机**（扫码用，铁律：不用主号）

详见 [`docs/OPENCLAW_INSTALL_PREP_CN.md`](docs/OPENCLAW_INSTALL_PREP_CN.md)。
