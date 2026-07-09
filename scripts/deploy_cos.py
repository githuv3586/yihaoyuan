#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 opc.so 静态站点部署到腾讯云 COS，并刷新 CDN。

必填环境变量：
  TENCENTCLOUD_SECRET_ID
  TENCENTCLOUD_SECRET_KEY

可选环境变量：
  COS_BUCKET   默认 opc-site-1256908292
  COS_REGION   默认 ap-guangzhou
  CDN_DOMAIN   默认 opc.hejinhong.site
  DRY_RUN=1    仅打印将上传的文件，不实际上传/刷新
"""

from __future__ import annotations

import mimetypes
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# 允许上传的静态资源（与线上 COS 站点结构一致）
UPLOAD_ROOT_FILES = ("index.html", "robots.txt", "favicon.ico", "favicon.svg")
UPLOAD_DIRS = ("css", "js", "data", "images")

# 明确排除，避免把密钥/后端/工具脚本推上 CDN
SKIP_NAME_PARTS = (
    "__pycache__",
    ".git",
    ".cnb",
    "node_modules",
    "private-logs",
    "scraper",
    "scripts",
    "secrets",
    "docs",
    "test",
)


def log(msg: str) -> None:
    print(msg, flush=True)


def require_env(name: str) -> str:
    value = (os.environ.get(name) or "").strip()
    if not value:
        raise SystemExit(f"[FATAL] 缺少环境变量 {name}")
    return value


def content_type(path: Path) -> str:
    ctype, _ = mimetypes.guess_type(str(path))
    if ctype:
        return ctype
    ext = path.suffix.lower()
    return {
        ".js": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".webp": "image/webp",
        ".ico": "image/x-icon",
        ".txt": "text/plain; charset=utf-8",
        ".woff2": "font/woff2",
    }.get(ext, "application/octet-stream")


def cache_control(path: Path) -> str:
    # HTML / JSON 短缓存，便于发布后尽快生效；静态资源稍长
    if path.suffix.lower() in {".html", ".json"}:
        return "public, max-age=60, must-revalidate"
    if path.suffix.lower() in {".js", ".css"}:
        return "public, max-age=300"
    return "public, max-age=86400"


def collect_files() -> list[tuple[Path, str]]:
    files: list[tuple[Path, str]] = []

    for name in UPLOAD_ROOT_FILES:
        p = ROOT / name
        if p.is_file():
            files.append((p, name))

    for dirname in UPLOAD_DIRS:
        base = ROOT / dirname
        if not base.is_dir():
            continue
        for path in sorted(base.rglob("*")):
            if not path.is_file():
                continue
            rel = path.relative_to(ROOT).as_posix()
            if any(part in rel.split("/") for part in SKIP_NAME_PARTS):
                continue
            if path.name.startswith("."):
                continue
            files.append((path, rel))

    if not files:
        raise SystemExit("[FATAL] 未找到可部署的静态文件")
    return files


def upload_with_cos_sdk(files: list[tuple[Path, str]], bucket: str, region: str,
                        secret_id: str, secret_key: str) -> None:
    try:
        from qcloud_cos import CosConfig, CosS3Client
    except ImportError as e:
        raise SystemExit(
            "[FATAL] 缺少 cos-python-sdk-v5，请先 pip install cos-python-sdk-v5"
        ) from e

    config = CosConfig(Region=region, SecretId=secret_id, SecretKey=secret_key, Scheme="https")
    client = CosS3Client(config)

    ok = 0
    for local, key in files:
        body = local.read_bytes()
        client.put_object(
            Bucket=bucket,
            Key=key,
            Body=body,
            ContentType=content_type(local),
            CacheControl=cache_control(local),
        )
        ok += 1
        log(f"  ✓ {key} ({len(body)} bytes)")
    log(f"COS 上传完成：{ok}/{len(files)} 个文件 → {bucket}")


def purge_cdn(domain: str, secret_id: str, secret_key: str) -> None:
    try:
        from tencentcloud.common import credential
        from tencentcloud.cdn.v20180606 import cdn_client, models
    except ImportError as e:
        raise SystemExit(
            "[FATAL] 缺少 tencentcloud-sdk-python-cdn，请先 pip install tencentcloud-sdk-python-cdn"
        ) from e

    cred = credential.Credential(secret_id, secret_key)
    client = cdn_client.CdnClient(cred, "")

    # 目录刷新：覆盖站点根路径下全部缓存
    paths = [
        f"https://{domain}/",
        f"https://{domain}/index.html",
        f"https://{domain}/css/",
        f"https://{domain}/js/",
        f"https://{domain}/data/",
        f"https://{domain}/images/",
    ]

    req = models.PurgePathCacheRequest()
    req.Paths = paths
    req.FlushType = "flush"
    resp = client.PurgePathCache(req)
    task_id = getattr(resp, "TaskId", None) or getattr(resp, "taskId", None)
    log(f"CDN 刷新已提交：domain={domain} taskId={task_id}")
    for p in paths:
        log(f"  · {p}")


def verify_site(domain: str) -> None:
    """部署后做一次轻量可达性检查（失败不阻断，仅告警）。"""
    import urllib.error
    import urllib.request

    url = f"https://{domain}/"
    try:
        req = urllib.request.Request(url, method="GET", headers={"User-Agent": "opc-so-deploy/1.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            code = resp.getcode()
            body = resp.read(200)
            log(f"站点探测：{url} → HTTP {code}, bytes={len(body)}")
            if code >= 400:
                log("⚠ 站点返回非 2xx，请稍后在 CDN 控制台确认刷新状态")
    except Exception as e:
        log(f"⚠ 站点探测失败（可能是 CDN 刷新延迟）：{e}")


def main() -> int:
    dry_run = (os.environ.get("DRY_RUN") or "").strip() in {"1", "true", "TRUE", "yes"}
    bucket = (os.environ.get("COS_BUCKET") or "opc-site-1256908292").strip()
    region = (os.environ.get("COS_REGION") or "ap-guangzhou").strip()
    domain = (os.environ.get("CDN_DOMAIN") or "opc.hejinhong.site").strip()

    files = collect_files()
    log("=========================================")
    log("  opc.so → COS/CDN 部署")
    log("=========================================")
    log(f"ROOT     : {ROOT}")
    log(f"BUCKET   : {bucket}")
    log(f"REGION   : {region}")
    log(f"DOMAIN   : {domain}")
    log(f"FILES    : {len(files)}")
    log(f"DRY_RUN  : {dry_run}")
    log(f"COMMIT   : {os.environ.get('CNB_COMMIT', os.environ.get('GITHUB_SHA', 'local'))}")
    log(f"BRANCH   : {os.environ.get('CNB_BRANCH', os.environ.get('GITHUB_REF_NAME', 'local'))}")

    if dry_run:
        for _, key in files:
            log(f"  (dry-run) {key}")
        log("DRY_RUN 完成，未实际上传。")
        return 0

    secret_id = require_env("TENCENTCLOUD_SECRET_ID")
    secret_key = require_env("TENCENTCLOUD_SECRET_KEY")

    t0 = time.time()
    upload_with_cos_sdk(files, bucket, region, secret_id, secret_key)
    purge_cdn(domain, secret_id, secret_key)
    verify_site(domain)
    log(f"✔ 部署完成，耗时 {time.time() - t0:.1f}s → https://{domain}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
