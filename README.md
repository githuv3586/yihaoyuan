# Design Bot — AI 驱动的 UI/UX 设计智能助手

> 这是 [`cnbnn/ui-ux-pro-max`](https://cnb.cool/cnbnn/ui-ux-pro-max)（CNB 平台 NPC）的**平台无关复刻版**。
> 把原项目里基于 BM25 的 UI/UX 知识检索能力 + 设计系统生成 + HTML 预览，重构成可独立部署的：
>
> - **Python 包 / CLI**（`design-bot ...`）
> - **HTTP 服务**（FastAPI · 提供 Web 表单 + JSON API）
> - **GitHub Action**（在 Issue / PR 评论里 `@design-bot ...` 即可触发回复）

## ✨ 核心能力（沿用原项目的知识库）

| 维度 | 规模 |
| ---- | ---- |
| UI 风格 | 67 种 (Glassmorphism、Brutalism、Bento Grid 等) |
| 配色方案 | 95 种（按行业分类） |
| 字体组合 | 56 种（含 Google Fonts 链接） |
| 图表类型 | 25 种 |
| 行业推理规则 | 100 条 |
| UX 准则 | 98 条 |
| 技术栈分库 | 13 个（Web / iOS / Android / 跨平台） |

支持的栈：HTML+Tailwind / React / Next.js / Vue / Nuxt.js / Nuxt UI / Svelte / Astro / shadcn/ui / SwiftUI / React Native / Flutter / Jetpack Compose。

## 🚀 快速开始

### 1) 命令行（CLI）

```bash
pip install -e .

# 通用搜索
design-bot "glassmorphism dashboard" --domain style

# 生成完整设计系统（推荐）
design-bot "SaaS landing page 科技 暗黑模式" --design-system -p "Acme"

# 生成 HTML 预览（+ 可选 PNG 截图）
design-bot "beauty spa wellness service" --design-system --preview --screenshot -p "Serenity Spa"

# 持久化为可复用的 design-system/ 目录（含 MASTER.md + pages/）
design-bot "fintech mobile app" --design-system --persist -p "FinX" --page "dashboard"
```

### 2) HTTP 服务（FastAPI）

```bash
pip install -e ".[server]"
python -m design_bot.server
# 打开 http://localhost:8000 — 简易 Web 表单
```

主要端点：

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| `GET` | `/` | 简易交互式表单 |
| `POST` | `/api/search` | 通用搜索：`{"query": "...", "domain": "style"}` 或 `{"stack": "react"}` |
| `POST` | `/api/design-system` | 返回 JSON 格式的完整设计系统 |
| `POST` | `/api/preview` | 返回完整 HTML 预览（`Content-Type: text/html`） |
| `GET` | `/healthz` | 健康检查 |

示例：

```bash
curl -X POST http://localhost:8000/api/design-system \
  -H 'Content-Type: application/json' \
  -d '{"query":"crypto wallet fintech security","project_name":"NovaWallet"}'
```

### 3) GitHub Bot

在仓库里启用 [`.github/workflows/design-bot.yml`](.github/workflows/design-bot.yml) 之后，
只要在任意 Issue / PR 评论中写：

```
@design-bot 帮我设计一个 SaaS 产品的 Landing Page，科技风格，需要暗黑模式
```

或带项目名：

```
@design-bot(Acme Bank) 做一个金融数据分析仪表盘，要求专业、清爽
```

机器人会自动：

1. 解析评论并调用知识库；
2. 生成 Markdown 格式的设计系统方案直接回复在评论区；
3. 把生成的 HTML 预览保存为 workflow artifact，方便下载查看。

### 4) Docker

```bash
docker build -t design-bot .
docker run --rm -p 8000:8000 design-bot
```

## 🧩 架构

```
design_bot/
├── core.py              # BM25 搜索引擎 + CSV 知识库装载
├── design_system.py     # 多域聚合 + 推理 + Master/Override 持久化
├── preview.py           # HTML 预览渲染 + Playwright/Chrome 截图
├── cli.py / __main__.py # CLI 入口（design-bot）
├── server.py            # FastAPI HTTP 服务 + 简易 Web 表单
├── bot.py               # GitHub Issue/PR 评论触发器
└── data/                # CSV 知识库 (源自 cnbnn/ui-ux-pro-max)
    ├── styles.csv, colors.csv, typography.csv, ...
    └── stacks/          # 13 个技术栈分库
```

## 📜 License

MIT — 详见 [LICENSE](LICENSE)。

> 知识库 (`design_bot/data/`) 衍生自 [`cnbnn/ui-ux-pro-max`](https://cnb.cool/cnbnn/ui-ux-pro-max)（同样为 MIT）。
> 感谢原作者的设计系统知识工程化工作。
