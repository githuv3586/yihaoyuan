#!/usr/bin/env bash
# 非交互式配置 OpenClaw 大模型（智谱 GLM）
#
# 这个脚本用 `openclaw config set` 写出 schema-valid 的 ~/.openclaw/openclaw.json，
# 跳过 `openclaw configure` 交互式向导。
#
# 支持四种端点（与 dist/extensions/zai/openclaw.plugin.json 对齐）：
#   coding-cn      — GLM Coding Plan 中国大陆       https://open.bigmodel.cn/api/coding/paas/v4
#   coding-global  — GLM Coding Plan 海外            https://api.z.ai/api/paas/v4
#   cn             — Z.AI 通用 中国大陆              https://open.bigmodel.cn/api/paas/v4
#   global         — Z.AI 通用 海外                  https://api.z.ai/api/paas/v4
#
# 用法：
#   bash scripts/configure-zai-coding-cn.sh                            # 默认 coding-cn + glm-5-turbo
#   bash scripts/configure-zai-coding-cn.sh --endpoint coding-global
#   bash scripts/configure-zai-coding-cn.sh --default-model glm-5.1
#   bash scripts/configure-zai-coding-cn.sh --gateway-port 19001 --profile main
#   bash scripts/configure-zai-coding-cn.sh --inline-key                # 把 Key 直接写进 openclaw.json（不推荐）
#
# 默认安全模式：把 Key 用 SecretRef 引用 ZAI_API_KEY 环境变量，不写入文件。
# OpenClaw 启动时从环境变量解出真值，便于 git/备份场景下保护密钥。

set -euo pipefail

if [ -t 1 ]; then
  G='\033[0;32m'; Y='\033[0;33m'; R='\033[0;31m'; B='\033[0;34m'; N='\033[0m'
else
  G=''; Y=''; R=''; B=''; N=''
fi
log() { printf "${B}==>${N} %s\n" "$*"; }
ok()  { printf "  ${G}✔${N} %s\n" "$*"; }
warn(){ printf "  ${Y}⚠${N} %s\n" "$*"; }
err() { printf "  ${R}✖${N} %s\n" "$*" >&2; }

# 默认值
ENDPOINT="${ZAI_ENDPOINT:-coding-cn}"
GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-18789}"
PROFILE=""
DEFAULT_MODEL="${ZAI_DEFAULT_MODEL:-glm-5-turbo}"
INLINE_KEY=0
DRY_RUN=0

while [ $# -gt 0 ]; do
  case "$1" in
    --endpoint)       ENDPOINT="$2"; shift 2 ;;
    --gateway-port)   GATEWAY_PORT="$2"; shift 2 ;;
    --profile)        PROFILE="$2"; shift 2 ;;
    --default-model)  DEFAULT_MODEL="$2"; shift 2 ;;
    --inline-key)     INLINE_KEY=1; shift ;;
    --dry-run)        DRY_RUN=1; shift ;;
    -h|--help)        sed -n '2,32p' "$0"; exit 0 ;;
    *) err "未知选项 $1"; exit 1 ;;
  esac
done

# 端点 → baseUrl + auth choiceId
case "$ENDPOINT" in
  coding-cn)
    BASE_URL="https://open.bigmodel.cn/api/coding/paas/v4"
    PROFILE_ID="zai-coding-cn"
    DISPLAY_NAME="GLM Coding Plan CN"
    ;;
  coding-global)
    BASE_URL="https://api.z.ai/api/paas/v4"
    PROFILE_ID="zai-coding-global"
    DISPLAY_NAME="GLM Coding Plan Global"
    ;;
  cn)
    BASE_URL="https://open.bigmodel.cn/api/paas/v4"
    PROFILE_ID="zai-cn"
    DISPLAY_NAME="Z.AI CN"
    ;;
  global)
    BASE_URL="https://api.z.ai/api/paas/v4"
    PROFILE_ID="zai-global"
    DISPLAY_NAME="Z.AI Global"
    ;;
  *)
    err "未知端点 '$ENDPOINT'，可选：coding-cn / coding-global / cn / global"
    exit 1
    ;;
esac

if ! command -v openclaw >/dev/null 2>&1; then
  err "未找到 openclaw 命令；请先 bash scripts/install-openclaw.sh"
  exit 1
fi

# 加载 .env（用于读 ZAI_API_KEY）
if [ -f "$HOME/.openclaw/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$HOME/.openclaw/.env"
  set +a
fi

if [ -z "${ZAI_API_KEY:-}" ]; then
  warn "未检测到 ZAI_API_KEY 环境变量"
  warn "请先填到 ~/.openclaw/.env 或当前 shell 中导出 ZAI_API_KEY"
  warn "继续执行：配置文件仍会写好，运行时再读环境变量"
fi

CMD=(openclaw)
if [ -n "$PROFILE" ]; then
  CMD+=(--profile "$PROFILE")
fi

cat <<INFO
${B}计划写入：${N}
  端点          $ENDPOINT
  baseUrl       $BASE_URL
  默认模型      $DEFAULT_MODEL
  Gateway 端口  $GATEWAY_PORT
  Auth profile  $PROFILE_ID
  Key 模式      $([ "$INLINE_KEY" -eq 1 ] && echo '内联（不安全）' || echo 'SecretRef → env:ZAI_API_KEY（推荐）')

INFO

if [ "$DRY_RUN" -eq 1 ]; then
  ok "--dry-run：未执行写入"
  exit 0
fi

log "[1/3] 写入主配置（gateway / models / auth）"

read -r -d '' BATCH_JSON <<JSON || true
[
  { "path": "gateway.port", "value": $GATEWAY_PORT },
  { "path": "models.providers.zai.baseUrl", "value": "$BASE_URL" },
  { "path": "models.providers.zai.api", "value": "openai-completions" },
  { "path": "models.providers.zai.authHeader", "value": true },
  { "path": "models.providers.zai.models", "value": [
      { "id": "glm-5-turbo",  "name": "GLM-5 Turbo" },
      { "id": "glm-5.1",      "name": "GLM-5.1" },
      { "id": "glm-4.7",      "name": "GLM-4.7" },
      { "id": "glm-4.5-air",  "name": "GLM-4.5 Air" },
      { "id": "glm-5v-turbo", "name": "GLM-5V Turbo (vision)" },
      { "id": "glm-4.6v",     "name": "GLM-4.6V (vision)" }
  ]},
  { "path": "auth.profiles.$PROFILE_ID", "value": {
      "provider": "zai",
      "mode": "api_key",
      "displayName": "$DISPLAY_NAME"
  }},
  { "path": "auth.order.zai", "value": ["$PROFILE_ID"] }
]
JSON

"${CMD[@]}" config set --batch-json "$BATCH_JSON" >/dev/null
ok "主配置已写入"

log "[2/3] 配置 API Key 读取方式"
if [ "$INLINE_KEY" -eq 1 ]; then
  if [ -z "${ZAI_API_KEY:-}" ]; then
    err "--inline-key 模式必须先设置 ZAI_API_KEY 环境变量"
    exit 1
  fi
  "${CMD[@]}" config set models.providers.zai.apiKey "$ZAI_API_KEY" >/dev/null
  warn "Key 已内联到 openclaw.json（chmod 600 强烈建议）"
else
  "${CMD[@]}" config set models.providers.zai.apiKey \
      --ref-source env --ref-provider default --ref-id ZAI_API_KEY >/dev/null
  ok "Key 改为 SecretRef → 启动时从环境变量 ZAI_API_KEY 解析"
fi

log "[3/3] 验证 schema"
"${CMD[@]}" config validate
chmod 700 "$HOME/.openclaw" 2>/dev/null || true
chmod 600 "$HOME/.openclaw/openclaw.json" 2>/dev/null || true

cat <<EOF

${G}大模型配置就绪${N}（端点：$ENDPOINT  默认模型：$DEFAULT_MODEL）

下一步：
  1. 确认 Key 已加载：
       echo \${ZAI_API_KEY:0:6}...
  2. 自检：
       openclaw doctor --non-interactive
  3. 进 TUI 测一句：
       openclaw chat
  4. 配微信通道：
       openclaw configure --section channels
EOF
