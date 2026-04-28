"""命令行入口 — 等价于原项目的 ``scripts/search.py``.

用法:
    python -m design_bot "<query>" [--domain ...] [--stack ...]
    python -m design_bot "<query>" --design-system [-p "Project Name"] [--preview] [--screenshot]
    design-bot "<query>" --design-system -p "My Project"  # 安装包后

支持的域: style / color / chart / landing / product / ux / typography / icons / react / web
支持的栈: html-tailwind, react, nextjs, vue, nuxtjs, nuxt-ui, svelte, astro, shadcn,
          swiftui, react-native, flutter, jetpack-compose
"""

from __future__ import annotations

import argparse
import io
import os
import sys

from .core import AVAILABLE_STACKS, CSV_CONFIG, MAX_RESULTS, search, search_stack
from .design_system import DesignSystemGenerator, generate_design_system
from .preview import generate_preview_html, generate_screenshot


def _force_utf8() -> None:
    if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    if sys.stderr.encoding and sys.stderr.encoding.lower() != "utf-8":
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")


def format_output(result: dict) -> str:
    if "error" in result:
        return f"Error: {result['error']}"
    out: list[str] = []
    if result.get("stack"):
        out.append("## Design Bot Stack Guidelines")
        out.append(f"**Stack:** {result['stack']} | **Query:** {result['query']}")
    else:
        out.append("## Design Bot Search Results")
        out.append(f"**Domain:** {result['domain']} | **Query:** {result['query']}")
    out.append(f"**Source:** {result['file']} | **Found:** {result['count']} results\n")
    for i, row in enumerate(result["results"], 1):
        out.append(f"### Result {i}")
        for key, value in row.items():
            value_str = str(value)
            if len(value_str) > 300:
                value_str = value_str[:300] + "..."
            out.append(f"- **{key}:** {value_str}")
        out.append("")
    return "\n".join(out)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="design-bot",
        description="UI/UX 设计智能助手 — BM25 检索 + 设计系统生成 + HTML 预览",
    )
    parser.add_argument("query", help="搜索查询语句，例如：'SaaS dashboard fintech'")
    parser.add_argument("--domain", "-d", choices=list(CSV_CONFIG.keys()), help="指定搜索域")
    parser.add_argument("--stack", "-s", choices=AVAILABLE_STACKS, help="指定技术栈")
    parser.add_argument("--max-results", "-n", type=int, default=MAX_RESULTS)
    parser.add_argument("--json", action="store_true", help="以 JSON 格式输出")

    parser.add_argument("--design-system", "-ds", action="store_true", help="生成完整设计系统方案")
    parser.add_argument("--project-name", "-p", default=None, help="项目名（输出标题用）")
    parser.add_argument("--format", "-f", choices=["ascii", "markdown"], default="ascii")

    parser.add_argument("--persist", action="store_true", help="保存 MASTER.md 到 design-system/")
    parser.add_argument("--page", default=None, help="生成页面级 override 文件")
    parser.add_argument("--output-dir", "-o", default=None)

    parser.add_argument("--preview", action="store_true", help="生成 HTML 设计预览")
    parser.add_argument("--preview-output", default=None)
    parser.add_argument("--screenshot", "-ss", action="store_true", help="将预览渲染为 PNG (需要 Playwright 或 Chrome)")
    parser.add_argument("--screenshot-output", default=None)
    parser.add_argument("--screenshot-width", type=int, default=1200)
    return parser


def main(argv: list[str] | None = None) -> int:
    _force_utf8()
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.design_system:
        generator = DesignSystemGenerator()
        ds_data = generator.generate(args.query, args.project_name)
        result = generate_design_system(
            args.query,
            args.project_name,
            args.format,
            persist=args.persist,
            page=args.page,
            output_dir=args.output_dir,
        )
        print(result)

        if args.persist:
            project_slug = (args.project_name or "default").lower().replace(" ", "-")
            print("\n" + "=" * 60)
            print(f"已持久化 design-system/{project_slug}/")
            print(f"  - design-system/{project_slug}/MASTER.md")
            if args.page:
                page_filename = args.page.lower().replace(" ", "-")
                print(f"  - design-system/{project_slug}/pages/{page_filename}.md")
            print("=" * 60)

        if args.preview:
            preview_path = args.preview_output
            if not preview_path:
                base = args.output_dir or "."
                slug = (args.project_name or "design").lower().replace(" ", "-")
                preview_path = os.path.join(base, f"{slug}-preview.html")
            generate_preview_html(ds_data, preview_path)
            print(f"\nHTML Preview: {preview_path}")

            if args.screenshot:
                ss_path = args.screenshot_output or os.path.splitext(preview_path)[0] + ".png"
                ss_result = generate_screenshot(preview_path, ss_path, width=args.screenshot_width)
                if ss_result:
                    size_kb = os.path.getsize(ss_result) / 1024
                    print(f"Screenshot: {ss_result} ({size_kb:.0f} KB)")
                else:
                    print("截图生成失败 (未检测到 Playwright/Chrome)")
        return 0

    if args.stack:
        result = search_stack(args.query, args.stack, args.max_results)
    else:
        result = search(args.query, args.domain, args.max_results)

    if args.json:
        import json
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(format_output(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
