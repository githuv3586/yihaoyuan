#!/usr/bin/env sh
# CNB / 本地通用：部署前静态校验（不依赖密钥）
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "========================================="
echo "  opc.so 部署前校验"
echo "========================================="
echo "PWD: $ROOT"

# 必备文件
for f in index.html css/style.css js/main.js data/policies.json; do
  if [ ! -f "$f" ]; then
    echo "[FATAL] 缺少文件: $f" >&2
    exit 1
  fi
  echo "✓ $f"
done

# JSON 合法性
if command -v node >/dev/null 2>&1; then
  node -e "JSON.parse(require('fs').readFileSync('data/policies.json','utf8')); console.log('✓ policies.json JSON OK')"
  if [ -f server.js ]; then
    node --check server.js && echo "✓ server.js syntax OK"
  fi
  if [ -f js/main.js ]; then
    node --check js/main.js && echo "✓ js/main.js syntax OK"
  fi
  if [ -f js/chat.js ]; then
    node --check js/chat.js && echo "✓ js/chat.js syntax OK"
  fi
elif command -v python3 >/dev/null 2>&1; then
  python3 -c "import json; json.load(open('data/policies.json',encoding='utf-8')); print('✓ policies.json JSON OK')"
else
  echo "[FATAL] 需要 node 或 python3 做校验" >&2
  exit 1
fi

# 部署脚本自身语法
if command -v python3 >/dev/null 2>&1; then
  python3 -m py_compile scripts/deploy_cos.py
  echo "✓ scripts/deploy_cos.py syntax OK"
fi

# dry-run 收集文件列表（不需要密钥）
DRY_RUN=1 python3 scripts/deploy_cos.py

echo "✅ 校验通过"
