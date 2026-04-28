#!/usr/bin/env bash
# OpenClaw 安装前环境一键准备（Linux / macOS）
#
# 做的事：
#   - 用 gitee 镜像装 nvm
#   - 装 Node 22 LTS（npmmirror 镜像加速）
#   - 配 npm registry + sharp / node-llama-cpp 二进制镜像
#   - 装 pnpm + 配 registry
#   - 创建 ~/.openclaw 目录骨架
#
# 注意：
#   - 只做幂等操作，重复运行安全
#   - 不会写入 ZAI_API_KEY；密钥请手工填到 ~/.openclaw/.env
#   - 已装过更高版本 Node 时不会回退

set -e

if [ -t 1 ]; then
  G='\033[0;32m'; Y='\033[0;33m'; R='\033[0;31m'; B='\033[0;34m'; N='\033[0m'
else
  G=''; Y=''; R=''; B=''; N=''
fi
log()  { printf "${B}==>${N} %s\n" "$*"; }
ok()   { printf "  ${G}✔${N} %s\n" "$*"; }
warn() { printf "  ${Y}⚠${N} %s\n" "$*"; }
err()  { printf "  ${R}✖${N} %s\n" "$*"; }

OS="$(uname -s)"
case "$OS" in
  Linux*|Darwin*) ;;
  *) err "本脚本仅支持 Linux / macOS（你是 $OS）"; exit 1 ;;
esac

# 选 shell rc
RC=""
case "${SHELL:-}" in
  */zsh)  RC="$HOME/.zshrc" ;;
  */bash) RC="$HOME/.bashrc" ;;
  *)      RC="$HOME/.bashrc" ;;
esac
[ -f "$RC" ] || touch "$RC"

# ---------- 1. 安装 nvm ----------
log "1. 安装 / 更新 nvm（gitee 镜像）"
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL https://gitee.com/mirrors/nvm/raw/master/install.sh | bash
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- https://gitee.com/mirrors/nvm/raw/master/install.sh | bash
  else
    err "缺少 curl/wget，请先安装"
    exit 1
  fi
  ok "nvm 已安装"
else
  ok "nvm 已存在（跳过）"
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"

# 写入 rc（幂等）
if ! grep -q 'NVM_NODEJS_ORG_MIRROR' "$RC" 2>/dev/null; then
  {
    echo ''
    echo '# === OpenClaw setup-env.sh ==='
    echo 'export NVM_DIR="$HOME/.nvm"'
    echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"'
    echo 'export NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node'
    echo '# === end OpenClaw ==='
  } >> "$RC"
  ok "已写入 $RC（NVM_DIR + 镜像）"
fi
export NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node

# ---------- 2. 安装 Node 22 ----------
log "2. 安装 Node.js 22 LTS"
CURRENT_NODE=""
command -v node >/dev/null 2>&1 && CURRENT_NODE="$(node -v 2>/dev/null || true)"
if echo "$CURRENT_NODE" | grep -qE '^v(2[2-9]|[3-9][0-9])\.'; then
  ok "已装 Node $CURRENT_NODE（≥ 22，跳过）"
else
  nvm install 22
  nvm alias default 22
  nvm use 22
  ok "Node $(node -v) 已就位"
fi

# ---------- 3. 配 npm 镜像 ----------
log "3. 配置 npm 镜像（npmmirror）"
npm config set registry https://registry.npmmirror.com
npm config set disturl  https://npmmirror.com/mirrors/node
npm config set sharp_binary_host        https://npmmirror.com/mirrors/sharp
npm config set sharp_libvips_binary_host https://npmmirror.com/mirrors/sharp-libvips
npm config set node_llama_cpp_binary_host https://npmmirror.com/mirrors/node-llama-cpp 2>/dev/null || true
npm config set canvas_binary_host_mirror https://npmmirror.com/mirrors/canvas 2>/dev/null || true
ok "npm registry → $(npm config get registry)"

# ---------- 4. 装 pnpm ----------
log "4. 安装 pnpm"
if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm
  ok "pnpm $(pnpm -v) 已安装"
else
  ok "pnpm $(pnpm -v) 已存在"
fi
pnpm config set registry https://registry.npmmirror.com
ok "pnpm registry → $(pnpm config get registry)"

# ---------- 5. ~/.openclaw 骨架 ----------
log "5. 创建 ~/.openclaw 目录骨架"
mkdir -p "$HOME/.openclaw"/{workspace,weixin/accounts,skills,traces,audit,logs}
chmod 700 "$HOME/.openclaw"
ok "目录已创建（chmod 700）"

if [ -f "$HOME/.openclaw/.env" ]; then
  chmod 600 "$HOME/.openclaw/.env"
  warn "~/.openclaw/.env 已存在，未覆盖（chmod 600 完成）"
else
  warn "~/.openclaw/.env 不存在 → 拷贝 templates/openclaw.env.template 并填 ZAI_API_KEY"
fi

# ---------- 6. 提示 ----------
echo
log "下一步"
cat <<'EOF'
  1. 重新加载 shell（让 nvm 生效）：
       exec $SHELL -l
  2. 把模板拷过去并填 Key：
       cp templates/openclaw.env.template  ~/.openclaw/.env
       cp templates/openclaw.json.template ~/.openclaw/openclaw.json
       chmod 600 ~/.openclaw/.env
       $EDITOR ~/.openclaw/.env
  3. 验证 GLM 链路：
       export $(grep -v '^#' ~/.openclaw/.env | xargs)
       node scripts/smoke-test.mjs
  4. 全量预飞自检：
       bash scripts/preflight-check.sh
  5. 全 ✔ 后正式安装：
       curl -fsSL https://openclaw.ai/install.sh | bash
EOF
