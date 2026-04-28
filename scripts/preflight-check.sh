#!/usr/bin/env bash
# OpenClaw 安装预飞自检（Linux / macOS）
#
# 用法：
#   bash scripts/preflight-check.sh
#   ZAI_API_KEY=xxx bash scripts/preflight-check.sh   # 显式传 Key
#
# 退出码：
#   0 — 全部 ✔（可直接装 OpenClaw）
#   1 — 有 ✖（必须修复）
#   2 — 仅有 ⚠（可装但建议先优化）

set -u

PASS=0
WARN=0
FAIL=0

if [ -t 1 ]; then
  G='\033[0;32m'; Y='\033[0;33m'; R='\033[0;31m'; B='\033[0;34m'; N='\033[0m'
else
  G=''; Y=''; R=''; B=''; N=''
fi

ok()   { printf "  ${G}✔${N} %s\n" "$1"; PASS=$((PASS+1)); }
warn() { printf "  ${Y}⚠${N} %s\n" "$1"; WARN=$((WARN+1)); }
fail() { printf "  ${R}✖${N} %s\n" "$1"; FAIL=$((FAIL+1)); }
info() { printf "  ${B}ℹ${N} %s\n" "$1"; }
section() { printf "\n${B}== %s ==${N}\n" "$1"; }

ver_ge() {
  # ver_ge "22.4.0" "22" → 0  (a >= b)
  [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

# 加载 ~/.openclaw/.env（如有）
if [ -z "${ZAI_API_KEY:-}" ] && [ -r "$HOME/.openclaw/.env" ]; then
  # shellcheck disable=SC2046
  set -o allexport
  # shellcheck disable=SC1091
  . "$HOME/.openclaw/.env" 2>/dev/null || true
  set +o allexport
fi

printf "${B}OpenClaw 预飞自检 — %s${N}\n" "$(date '+%F %T')"

# 1. 操作系统
section "1. 操作系统"
OS="$(uname -s)"
case "$OS" in
  Linux*)  ok "Linux ($(uname -r))" ;;
  Darwin*) ok "macOS ($(uname -r))" ;;
  *)       warn "未识别的系统：$OS（脚本未针对此系统优化）" ;;
esac

# 2. 内存
section "2. 硬件"
MEM_GB=0
if command -v free >/dev/null 2>&1; then
  MEM_GB=$(free -g | awk '/^Mem:/{print $2}')
elif [ "$OS" = "Darwin" ]; then
  MEM_BYTES=$(sysctl -n hw.memsize 2>/dev/null || echo 0)
  MEM_GB=$((MEM_BYTES / 1024 / 1024 / 1024))
fi
if [ "$MEM_GB" -ge 16 ]; then
  ok "内存 ${MEM_GB} GB"
elif [ "$MEM_GB" -ge 8 ]; then
  warn "内存 ${MEM_GB} GB（推荐 16 GB，跑 RAG/本地模型会吃紧）"
elif [ "$MEM_GB" -ge 4 ]; then
  warn "内存 ${MEM_GB} GB（最低标准，性能会差）"
else
  fail "内存 ${MEM_GB} GB（< 4 GB，不建议安装）"
fi

DISK_AVAIL=$(df -P "$HOME" 2>/dev/null | awk 'NR==2{print $4}')
DISK_GB=$((DISK_AVAIL / 1024 / 1024))
if [ "$DISK_GB" -ge 20 ]; then
  ok "家目录可用磁盘 ${DISK_GB} GB"
elif [ "$DISK_GB" -ge 10 ]; then
  warn "家目录可用磁盘 ${DISK_GB} GB（推荐 ≥ 20 GB）"
else
  fail "家目录可用磁盘 ${DISK_GB} GB（< 10 GB，会装不下技能 + 缓存）"
fi

# 3. Node.js
section "3. Node.js（必须 ≥ 22）"
if command -v node >/dev/null 2>&1; then
  NV=$(node -v 2>/dev/null | sed 's/^v//')
  if ver_ge "$NV" "22.0.0"; then
    ok "node v$NV"
  else
    fail "node v$NV（需要 ≥ 22，建议 nvm install 22）"
  fi
else
  fail "未找到 node（建议跑 scripts/setup-env.sh）"
fi

# 4. 包管理器
section "4. 包管理器"
if command -v pnpm >/dev/null 2>&1; then
  ok "pnpm $(pnpm -v)"
  PNPM_REG=$(pnpm config get registry 2>/dev/null || echo "")
  case "$PNPM_REG" in
    *npmmirror*) ok "pnpm registry → $PNPM_REG" ;;
    *)           warn "pnpm registry 不是 npmmirror（当前：$PNPM_REG）" ;;
  esac
else
  warn "未装 pnpm（推荐用 pnpm；npm 也能跑）"
fi

if command -v npm >/dev/null 2>&1; then
  ok "npm $(npm -v)"
  NPM_REG=$(npm config get registry 2>/dev/null || echo "")
  case "$NPM_REG" in
    *npmmirror*) ok "npm registry → $NPM_REG" ;;
    *)           warn "npm registry 不是 npmmirror（当前：$NPM_REG），原生模块下载会慢" ;;
  esac

  for k in disturl sharp_binary_host sharp_libvips_binary_host; do
    v=$(npm config get "$k" 2>/dev/null || echo "")
    case "$v" in
      *npmmirror*) ok "npm $k → $v" ;;
      ""|undefined|null) warn "npm $k 未设置（sharp/原生模块可能下载失败）" ;;
      *) warn "npm $k = $v（不是 npmmirror）" ;;
    esac
  done
else
  fail "未找到 npm"
fi

# 5. 网络
section "5. 网络（关键域名直连）"
need_curl() {
  if ! command -v curl >/dev/null 2>&1; then
    fail "未找到 curl，无法做网络自检"
    return 1
  fi
}
check_url() {
  local name="$1" url="$2" expect="${3:-}"
  if ! need_curl; then return; fi
  local code
  code=$(curl -sS -o /dev/null -m 8 -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  if [ "$code" = "000" ]; then
    fail "$name 无法连接（$url）"
  elif [ -n "$expect" ] && [ "$code" != "$expect" ]; then
    warn "$name 返回 HTTP $code（期望 $expect，可能被代理改写）"
  else
    ok "$name HTTP $code"
  fi
}

check_url "OpenClaw 官网" "https://openclaw.ai"
check_url "智谱开放平台" "https://open.bigmodel.cn"
check_url "npmmirror"   "https://registry.npmmirror.com"
check_url "ClawHub"     "https://clawhub.ai"

# 6. 智谱 API Key
section "6. 智谱 GLM API Key"
if [ -z "${ZAI_API_KEY:-}" ]; then
  fail "环境变量 ZAI_API_KEY 未设置（也未在 ~/.openclaw/.env 找到）"
else
  case "$ZAI_API_KEY" in
    *.*) ok "ZAI_API_KEY 已设置（长度 ${#ZAI_API_KEY}）" ;;
    *)   warn "ZAI_API_KEY 已设置但格式可疑（通常含一个 '.'）" ;;
  esac

  BASE_URL="${ZAI_BASE_URL:-https://open.bigmodel.cn/api/coding/paas/v4}"
  case "$BASE_URL" in
    *coding/paas/v4*) ok "ZAI_BASE_URL = $BASE_URL（Coding 端点正确）" ;;
    *)                fail "ZAI_BASE_URL = $BASE_URL（必须是 .../coding/paas/v4）" ;;
  esac

  if command -v curl >/dev/null 2>&1; then
    info "调用 GLM API 实测（max_tokens=4）..."
    RESP=$(curl -sS -m 15 -o /tmp/openclaw-preflight.json -w "%{http_code}" \
      "$BASE_URL/chat/completions" \
      -H "Authorization: Bearer $ZAI_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"model":"glm-5-turbo","messages":[{"role":"user","content":"ping"}],"max_tokens":4}' \
      2>/dev/null || echo "000")
    case "$RESP" in
      200) ok "GLM API 200 OK（Key 有效、套餐正常）" ;;
      401) fail "GLM API 401 — Key 错或漏字符" ;;
      403) fail "GLM API 403 — 未订阅 Coding Plan 或已过期" ;;
      404) fail "GLM API 404 — 端点错（检查 ZAI_BASE_URL）" ;;
      429) warn "GLM API 429 — 限流（说明 Key 通了，等 1 分钟）" ;;
      000) fail "GLM API 无响应（网络/代理把请求绕走了）" ;;
      *)   warn "GLM API HTTP $RESP（详情：cat /tmp/openclaw-preflight.json）" ;;
    esac
  fi
fi

# 7. 目录与权限
section "7. ~/.openclaw 目录"
if [ -d "$HOME/.openclaw" ]; then
  PERM=$(stat -c "%a" "$HOME/.openclaw" 2>/dev/null || stat -f "%A" "$HOME/.openclaw" 2>/dev/null)
  if [ "$PERM" = "700" ]; then
    ok "~/.openclaw 权限 700"
  else
    warn "~/.openclaw 权限 $PERM（建议 chmod 700）"
  fi
  if [ -f "$HOME/.openclaw/.env" ]; then
    EPERM=$(stat -c "%a" "$HOME/.openclaw/.env" 2>/dev/null || stat -f "%A" "$HOME/.openclaw/.env" 2>/dev/null)
    if [ "$EPERM" = "600" ]; then
      ok "~/.openclaw/.env 权限 600"
    else
      warn "~/.openclaw/.env 权限 $EPERM（建议 chmod 600）"
    fi
  else
    info "~/.openclaw/.env 不存在（首次安装可在向导里生成）"
  fi
  if [ -d "$HOME/.openclaw/weixin/accounts" ] || [ -f "$HOME/.openclaw/openclaw.json" ]; then
    info "检测到旧安装 → 强烈建议先 cp -a ~/.openclaw ~/.openclaw.bak.\$(date +%F)"
  fi
else
  info "~/.openclaw 不存在（首次安装会自动创建）"
fi

# 8. 可选依赖
section "8. 可选依赖"
for cmd in git python3 docker sqlite3; do
  if command -v "$cmd" >/dev/null 2>&1; then
    ok "$cmd → $(command -v "$cmd")"
  else
    info "$cmd 未装（按需）"
  fi
done

# 汇总
printf "\n${B}============ 汇总 ============${N}\n"
printf "  ${G}✔ 通过${N} : %d\n" "$PASS"
printf "  ${Y}⚠ 警告${N} : %d\n" "$WARN"
printf "  ${R}✖ 失败${N} : %d\n" "$FAIL"
echo

if [ "$FAIL" -gt 0 ]; then
  printf "${R}有失败项 → 修复后再装。${N}\n"
  exit 1
elif [ "$WARN" -gt 0 ]; then
  printf "${Y}有警告项 → 可装，但建议先修复。${N}\n"
  exit 2
else
  printf "${G}全部通过 → 可以执行：curl -fsSL https://openclaw.ai/install.sh | bash${N}\n"
  exit 0
fi
