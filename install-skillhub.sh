#!/usr/bin/env bash
# install-skillhub.sh
# 一键安装 SkillHub CLI 及精选 OpenClaw Skills（国内镜像版本）
# 用法:
#   bash install-skillhub.sh              # 安装核心 + 通用 20 个 Skill
#   bash install-skillhub.sh --dev        # 额外安装开发者增强包
#   bash install-skillhub.sh --core       # 只装保底 5 件套
#   bash install-skillhub.sh --all        # 通用 + 开发者全部安装
#   bash install-skillhub.sh --dry-run    # 仅打印将要执行的命令
#
# 提示: 装陌生 Skill 前建议先用 skill-vetter 扫描，避免 ClawHavoc 类投毒。

set -u

INSTALL_URL="https://skillhub-1388575217.cos.ap-guangzhou.myqcloud.com/install/install.sh"

# 保底必装 5 件套
CORE_SKILLS=(
  skill-vetter
  self-improving-agent
  summarize
  agent-browser
  github
)

# 通用真实有用的 Skill（不含 core，避免重复）
COMMON_SKILLS=(
  gog
  ontology
  proactive-agent
  multi-search-engine
  tavily-search
  humanizer
  nano-pdf
  notion
  obsidian
  api-gateway
  automation-workflows
  auto-updater
  openai-whisper
  nano-banana-pro
  weather
)

# 开发者增强包
DEV_SKILLS=(
  agent-council
  claude-team
  pr-reviewer
  debug-pro
  conventional-commits
  code-mentor
  emergency-rescue
  docker-essentials
  capability-evolver
)

DRY_RUN=0
MODE="default"   # default | core | dev | all

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --core)    MODE="core" ;;
    --dev)     MODE="dev" ;;
    --all)     MODE="all" ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "未知参数: $arg" >&2
      exit 1
      ;;
  esac
done

run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "[dry-run] $*"
  else
    echo ">>> $*"
    eval "$@"
  fi
}

ensure_skillhub() {
  if command -v skillhub >/dev/null 2>&1; then
    echo "[ok] 已检测到 skillhub: $(skillhub --version 2>/dev/null || echo unknown)"
    return
  fi
  echo "[info] 未检测到 skillhub，开始安装 SkillHub CLI..."
  if ! command -v curl >/dev/null 2>&1; then
    echo "[error] 缺少 curl，请先安装 curl 后重试。" >&2
    exit 1
  fi
  run "curl -fsSL '$INSTALL_URL' | bash"

  if ! command -v skillhub >/dev/null 2>&1; then
    echo "[warn] 安装脚本已执行，但当前 shell 仍未找到 skillhub。"
    echo "       请重新打开终端 (或 source 你的 shell rc) 后再次运行本脚本。"
    [[ $DRY_RUN -eq 1 ]] || exit 1
  fi
}

install_skills() {
  local list=("$@")
  local total=${#list[@]}
  local i=0
  local fail=()
  for s in "${list[@]}"; do
    i=$((i+1))
    echo "----- [$i/$total] 安装 $s -----"
    if [[ $DRY_RUN -eq 1 ]]; then
      echo "[dry-run] skillhub install $s"
      continue
    fi
    if ! skillhub install "$s"; then
      echo "[warn] 安装失败: $s"
      fail+=("$s")
    fi
  done
  if [[ ${#fail[@]} -gt 0 ]]; then
    echo
    echo "[summary] 失败 Skill: ${fail[*]}"
  fi
}

ensure_skillhub

case "$MODE" in
  core)
    echo "[mode] 仅安装保底 5 件套"
    install_skills "${CORE_SKILLS[@]}"
    ;;
  dev)
    echo "[mode] 安装核心 + 通用 + 开发者增强包"
    install_skills "${CORE_SKILLS[@]}" "${COMMON_SKILLS[@]}" "${DEV_SKILLS[@]}"
    ;;
  all)
    echo "[mode] 全部安装（与 --dev 等价）"
    install_skills "${CORE_SKILLS[@]}" "${COMMON_SKILLS[@]}" "${DEV_SKILLS[@]}"
    ;;
  default)
    echo "[mode] 安装核心 + 通用 20 个 Skill（不含开发者增强包）"
    install_skills "${CORE_SKILLS[@]}" "${COMMON_SKILLS[@]}"
    ;;
esac

echo
echo "[done] 安装流程结束。"
echo "       使用 'skillhub list' 查看已装 Skill。"
echo "       使用 'skillhub update --all' 一键更新全部。"
echo "       重启 'openclaw chat' 让新 Skill 生效。"
