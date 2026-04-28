"""GitHub Bot 入口 — 解析 issue/PR 评论中的 ``@design-bot`` 指令并回复.

设计为 GitHub Actions 中调用，不依赖任何 SDK，只需要：
- ``GITHUB_TOKEN``  (默认通过 actions/checkout 的 ``${{ secrets.GITHUB_TOKEN }}``)
- ``GITHUB_REPOSITORY``  e.g. ``owner/repo``
- ``GITHUB_EVENT_PATH``   actions 自动注入

用户在评论里这样写即可触发::

    @design-bot 帮我设计一个 SaaS Landing Page，科技风格，暗黑模式

机器人会自动：
1. 调用 DesignSystemGenerator 生成方案；
2. 把方案以 Markdown 表格形式回复到同一 issue/PR；
3. 同时附上 HTML 预览作为 attachment（保存到 ``$GITHUB_OUTPUT`` artifact）。
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request

from .design_system import DesignSystemGenerator, format_markdown
from .preview import generate_preview_html

TRIGGER_RE = re.compile(r"@design-bot(?:\s*\(([^)]*)\))?\s+(.+)", re.IGNORECASE | re.DOTALL)


def parse_command(comment_body: str) -> tuple[str, str | None] | None:
    """从评论文本里抽取查询语句和可选项目名.

    支持::

        @design-bot 我要一个金融仪表盘
        @design-bot(Acme Bank) 我要一个金融仪表盘
    """
    m = TRIGGER_RE.search(comment_body or "")
    if not m:
        return None
    project_name = (m.group(1) or "").strip() or None
    query = m.group(2).strip()
    return query, project_name


def _post_comment(repo: str, issue_number: int, body: str, token: str) -> None:
    url = f"https://api.github.com/repos/{repo}/issues/{issue_number}/comments"
    data = json.dumps({"body": body}).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp.read()
    except urllib.error.HTTPError as e:  # pragma: no cover - network
        print(f"GitHub API error {e.code}: {e.read().decode('utf-8', 'replace')}", file=sys.stderr)
        raise


def _build_reply_body(query: str, design_system: dict, preview_artifact_url: str | None = None) -> str:
    md = format_markdown(design_system)
    parts = [
        "👋 Design Bot 来啦！基于你的需求 **`{}`** 生成的设计系统方案如下：\n".format(query),
        md,
    ]
    if preview_artifact_url:
        parts.append(f"\n🎨 **HTML 预览：** [{preview_artifact_url}]({preview_artifact_url})")
    parts.append(
        "\n---\n*由 [design-bot](https://github.com/) 自动生成 · "
        "复刻自 [cnbnn/ui-ux-pro-max](https://cnb.cool/cnbnn/ui-ux-pro-max)*"
    )
    return "\n".join(parts)


def run_from_event(event_path: str, repo: str, token: str, write_preview_to: str | None = None) -> int:
    with open(event_path, "r", encoding="utf-8") as f:
        event = json.load(f)

    comment = event.get("comment") or {}
    body = comment.get("body", "")
    parsed = parse_command(body)
    if not parsed:
        print("评论中没有触发 @design-bot 指令，跳过。")
        return 0

    query, project_name = parsed
    issue = event.get("issue") or event.get("pull_request") or {}
    issue_number = issue.get("number")
    if not issue_number:
        print("无法确定 issue/PR 编号。", file=sys.stderr)
        return 1

    generator = DesignSystemGenerator()
    ds = generator.generate(query, project_name)

    preview_path = None
    if write_preview_to:
        preview_path = write_preview_to
        os.makedirs(os.path.dirname(os.path.abspath(preview_path)) or ".", exist_ok=True)
        generate_preview_html(ds, preview_path)
        print(f"HTML preview written to: {preview_path}")

    reply = _build_reply_body(query, ds)
    _post_comment(repo, int(issue_number), reply, token)
    print(f"已回复 issue #{issue_number}")
    return 0


def main(argv: list[str] | None = None) -> int:
    event_path = os.environ.get("GITHUB_EVENT_PATH")
    repo = os.environ.get("GITHUB_REPOSITORY")
    token = os.environ.get("GITHUB_TOKEN")
    preview_out = os.environ.get("DESIGN_BOT_PREVIEW_PATH") or "design-preview.html"
    if not event_path or not repo or not token:
        print(
            "缺少必需的环境变量: GITHUB_EVENT_PATH / GITHUB_REPOSITORY / GITHUB_TOKEN",
            file=sys.stderr,
        )
        return 2
    return run_from_event(event_path, repo, token, preview_out)


if __name__ == "__main__":
    raise SystemExit(main())
