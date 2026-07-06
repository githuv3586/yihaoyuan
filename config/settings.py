"""
鹿功汇平台 Django 配置。

传承武学 · 修习身心 —— 武学文化传承与学习平台。
包含 H5 移动端(用户端)与管理后台(运营端)。
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "dev-only-insecure-key-change-me-in-production",
)

DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"

ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",")

CSRF_TRUSTED_ORIGINS = [
    origin
    for origin in os.environ.get("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",")
    if origin
]

# 部署在 HTTPS 反向代理(如 PythonAnywhere)之后时置为 1
if os.environ.get("DJANGO_BEHIND_PROXY_SSL", "0") == "1":
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # 领域应用
    "apps.users",
    "apps.courses",
    "apps.content",
    "apps.orders",
    "apps.points",
    "apps.notifications",
    "apps.services",
    "apps.core",
    # 界面应用
    "apps.h5",
    "apps.panel",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
]

LANGUAGE_CODE = "zh-hans"
TIME_ZONE = "Asia/Shanghai"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LOGIN_URL = "/login/"

# ---- 业务配置 ----
# 积分兑换比例: 100 积分 = 1 元
POINTS_PER_YUAN = 100
# 兑换 30 天 VIP 所需积分
VIP_EXCHANGE_POINTS = 1000
# 一次兑换的 VIP 天数
VIP_EXCHANGE_DAYS = 30
# 开发环境固定短信验证码(生产环境应接入真实短信服务)
DEV_SMS_CODE = "123456"
# 演示模式:未接入短信服务商时,使用固定验证码并在接口中返回,便于演示体验。
# 生产环境接入真实短信服务后应设置 DEV_SMS_MODE=0。
DEV_SMS_MODE = os.environ.get("DEV_SMS_MODE", "1" if DEBUG else "0") == "1"
