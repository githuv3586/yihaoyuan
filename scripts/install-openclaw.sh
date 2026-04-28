#!/usr/bin/env bash
# OpenClaw 安装包装器（中国大陆环境优化）
#
# 它做这几件事：
#   1. 加载 ~/.openclaw/.env 的环境变量（如 ZAI_API_KEY）
#   2. 跑预飞自检（preflight-check.sh），不通过就不动手
#   3. 调用官方 https://openclaw.ai/install.sh，加 retry + 镜像友好选项
#   4. 装完用 openclaw doctor --non-interactive 复检
#
# 用法：
#   bash scripts/install-openclaw.sh                 # 默认装最新稳定版，跳过 onboard
#   bash scripts/install-openclaw.sh --onboard       # 装完进入交互式 onboard
#   bash scripts/install-openclaw.sh --beta          # 用 beta 版
#   bash scripts/install-openclaw.sh --skip-preflight  # 不跑预飞（不推荐）
#
# 也接受官方 install.sh 支持的所有标志，会原封不动透传给它。

set -euo pipefail

if [ -t 1 ]; then
  G='\033[0;32m'; Y='\033[0;33m'; R='\033[0;31m'; B='\033[0;34m'; N='\033[0m'
else
  G=''; Y=''; R=''; B=''; N=''
fi
log()  { printf "${B}==>${N} %s\n" "$*"; }
ok()   { printf "  ${G}✔${N} %s\n" "$*"; }
warn() { printf "  ${Y}⚠${N} %s\n" "$*"; }
err()  { printf "  ${R}✖${N} %s\n" "$*" >&2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SKIP_PREFLIGHT=0
WANT_ONBOARD=0
EXTRA_ARGS=()

# ---------- 1. 加载 ~/.openclaw/.env ----------
if [ -f "$HOME/.openclaw/.env" ]; then
  log "加载 ~/.openclaw/.env"
  set -a
  # shellcheck disable=SC1091
  . "$HOME/.openclaw/.env"
  set +a
  ok "环境已注入（ZAI_API_KEY 长度=${#ZAI_API_KEY}）"
else
  warn "~/.openclaw/.env 不存在；onboard 时需手工粘贴 Key"
fi

# ---------- 2. 解析参数 ----------
while [ $# -gt 0 ]; do
  case "$1" in
    --skip-preflight) SKIP_PREFLIGHT=1; shift ;;
    --onboard)        WANT_ONBOARD=1; shift ;;
    --no-onboard)     WANT_ONBOARD=0; shift ;;
    -h|--help)
      sed -n '2,18p' "$0"
      exit 0
      ;;
    *) EXTRA_ARGS+=("$1"); shift ;;
  esac
done

# ---------- 3. 预飞自检 ----------
if [ "$SKIP_PREFLIGHT" -eq 0 ] && [ -x "$REPO_ROOT/scripts/preflight-check.sh" ]; then
  log "运行预飞自检"
  set +e
  bash "$REPO_ROOT/scripts/preflight-check.sh"
  rc=$?
  set -e
  case "$rc" in
    0) ok "预飞自检全部通过" ;;
    2) warn "预飞自检有警告项（继续装；建议事后修复）" ;;
    *) err "预飞自检失败（exit=$rc），修复后再装。如需强行装：--skip-preflight"; exit 1 ;;
  esac
else
  warn "已跳过预飞自检"
fi

# ---------- 4. 下载官方 install.sh（带重试）----------
TMP_INSTALLER="$(mktemp -t openclaw-install.XXXXXX.sh)"
trap 'rm -f "$TMP_INSTALLER"' EXIT

INSTALLER_URL="${OPENCLAW_INSTALLER_URL:-https://openclaw.ai/install.sh}"
log "下载官方安装脚本：$INSTALLER_URL"

attempt=1
max_attempts=4
delay=4
while :; do
  if curl -fsSL --proto '=https' --tlsv1.2 --retry 3 --retry-delay 1 \
        --max-time 60 -o "$TMP_INSTALLER" "$INSTALLER_URL"; then
    ok "下载成功（$(wc -c < "$TMP_INSTALLER") 字节）"
    break
  fi
  if [ "$attempt" -ge "$max_attempts" ]; then
    err "下载失败 ${max_attempts} 次，放弃。检查网络或代理。"
    exit 1
  fi
  warn "第 $attempt 次下载失败，${delay}s 后重试..."
  sleep "$delay"
  attempt=$((attempt + 1))
  delay=$((delay * 2))
done

# ---------- 5. 调用官方安装器 ----------
INSTALL_ARGS=("--no-prompt")
if [ "$WANT_ONBOARD" -eq 0 ]; then
  INSTALL_ARGS+=("--no-onboard")
fi
INSTALL_ARGS+=("${EXTRA_ARGS[@]:-}")
INSTALL_ARGS=("${INSTALL_ARGS[@]/#""}")

log "调用：bash install.sh ${INSTALL_ARGS[*]}"
bash "$TMP_INSTALLER" "${INSTALL_ARGS[@]}"
ok "openclaw 安装命令执行完毕"

# ---------- 6. 装后复检 ----------
log "openclaw doctor --non-interactive"
if command -v openclaw >/dev/null 2>&1; then
  openclaw doctor --non-interactive || warn "doctor 报告了若干警告（多数首装是正常的）"
  ok "已装版本：$(openclaw --version 2>/dev/null || echo unknown)"
else
  err "openclaw 命令未在 PATH 中，请重启终端或 exec \$SHELL -l 后重试"
  exit 1
fi

cat <<EOF

${G}安装完成${N}

下一步：
  1. 配置 GLM Coding-Plan-CN（非交互式，免向导）：
       bash $REPO_ROOT/scripts/configure-zai-coding-cn.sh
     或者交互式：
       openclaw configure --section model
  2. 接入微信通道（个人号 / 企业微信 / 公众号）：
       openclaw configure --section channels
  3. 启动 Gateway + 进入 TUI：
       openclaw chat
EOF
