#!/bin/bash
# 通过 PythonAnywhere API 部署鹿功汇平台(适用于免费账号,无需服务器端控制台)。
#
# 免费账号的限制与对应做法:
#   - API 创建的控制台必须在浏览器中打开后才能执行命令,计划任务也不可用,
#     因此本脚本在本地完成 migrate/seed/collectstatic,再把产物(含 SQLite
#     数据库)通过 files API 逐个上传;
#   - PythonAnywhere 系统镜像已预装 Django(python3.13 对应 5.1.x),
#     Web 应用直接使用系统解释器,无需创建虚拟环境。
#
# 用法:
#   export PA_USER=<用户名>
#   export PA_TOKEN=<API Token,在 Account -> API Token 页面生成>
#   export DJANGO_SECRET_KEY=<生产密钥,可用 secrets.token_urlsafe(48) 生成>
#   bash deploy/deploy_pythonanywhere.sh
#
# 参考文档: https://help.pythonanywhere.com/pages/API
set -eu

: "${PA_USER:?请设置 PA_USER}"
: "${PA_TOKEN:?请设置 PA_TOKEN}"
: "${DJANGO_SECRET_KEY:?请设置 DJANGO_SECRET_KEY}"

PA_API="https://www.pythonanywhere.com/api/v0/user/$PA_USER"
DOMAIN="$PA_USER.pythonanywhere.com"
REMOTE_ROOT="/home/$PA_USER/wuxue"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

api() {
    # api <method> <url后缀> [curl 额外参数...]
    local method="$1" path="$2"
    shift 2
    curl -s -X "$method" -H "Authorization: Token $PA_TOKEN" "$PA_API$path" "$@"
}

upload_file() {
    # upload_file <本地路径> <远程绝对路径>,带 429 限流重试
    local src="$1" dest="$2" code attempt
    for attempt in 1 2 3 4 5; do
        code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
            -H "Authorization: Token $PA_TOKEN" \
            -F "content=@$src" \
            "$PA_API/files/path$dest")
        case "$code" in
            200|201) return 0 ;;
            429) sleep 15 ;;
            *) sleep 3 ;;
        esac
    done
    echo "上传失败: $src -> $dest (HTTP $code)" >&2
    return 1
}

echo "==> 1/6 本地构建(migrate + seed + collectstatic)"
cd "$PROJECT_DIR"
python3 manage.py migrate --noinput
python3 manage.py seed_demo
python3 manage.py collectstatic --noinput

echo "==> 2/6 上传项目文件"
find . -type f \
    ! -path "./.git/*" ! -path "*__pycache__*" \
    ! -path "./media/*" ! -name "*.pyc" ! -name "db.sqlite3" \
    ! -path "./staticfiles/*" | while read -r f; do
    upload_file "$f" "$REMOTE_ROOT/${f#./}"
done
upload_file db.sqlite3 "$REMOTE_ROOT/db.sqlite3"
find staticfiles -type f | while read -r f; do
    upload_file "$f" "$REMOTE_ROOT/$f"
done

echo "==> 3/6 创建 Web 应用(已存在则忽略报错)"
api POST /webapps/ -d "domain_name=$DOMAIN" -d "python_version=python313" || true

echo "==> 4/6 上传 WSGI 配置"
WSGI_TMP=$(mktemp)
cat > "$WSGI_TMP" <<EOF
"""PythonAnywhere WSGI 配置:鹿功汇平台。"""
import os
import sys

path = '$REMOTE_ROOT'
if path not in sys.path:
    sys.path.insert(0, path)

os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
os.environ['DJANGO_DEBUG'] = '0'
os.environ['DJANGO_ALLOWED_HOSTS'] = '$DOMAIN'
os.environ['DJANGO_CSRF_TRUSTED_ORIGINS'] = 'https://$DOMAIN'
os.environ['DJANGO_BEHIND_PROXY_SSL'] = '1'
os.environ['DEV_SMS_MODE'] = '1'
os.environ['DJANGO_SECRET_KEY'] = '$DJANGO_SECRET_KEY'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
EOF
upload_file "$WSGI_TMP" "/var/www/${PA_USER}_pythonanywhere_com_wsgi.py"
rm -f "$WSGI_TMP"

echo "==> 5/6 配置源码目录、静态映射与强制 HTTPS"
api PATCH "/webapps/$DOMAIN/" \
    -d "source_directory=$REMOTE_ROOT" -d "force_https=true" > /dev/null
api POST "/webapps/$DOMAIN/static_files/" \
    -d "url=/static/" -d "path=$REMOTE_ROOT/staticfiles" > /dev/null || true

echo "==> 6/6 重载 Web 应用"
api POST "/webapps/$DOMAIN/reload/"
echo
echo "部署完成: https://$DOMAIN/"
