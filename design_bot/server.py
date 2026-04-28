"""FastAPI Web 服务 — 把 design-bot 暴露为 HTTP API + 简易 Web 表单.

启动:
    uvicorn design_bot.server:app --reload --port 8000
    # 或
    python -m design_bot.server

主要端点:
    GET  /                — 简易 HTML 表单 (输入需求 -> 即时渲染设计预览)
    GET  /healthz         — 健康检查
    POST /api/search      — 通用 BM25 搜索 (按 domain 或 stack)
    POST /api/design-system  — 生成完整设计系统 (JSON)
    POST /api/preview     — 生成完整 HTML 预览（直接返回 text/html）
"""

from __future__ import annotations

from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field

from . import __version__
from .core import AVAILABLE_STACKS, CSV_CONFIG, search, search_stack
from .design_system import DesignSystemGenerator
from .preview import generate_preview_html

app = FastAPI(
    title="Design Bot",
    description="AI 驱动的 UI/UX 设计智能助手 — 复刻自 cnbnn/ui-ux-pro-max",
    version=__version__,
)


class SearchRequest(BaseModel):
    query: str = Field(..., description="搜索查询文本")
    domain: Optional[str] = Field(None, description=f"可选域：{list(CSV_CONFIG.keys())}")
    stack: Optional[str] = Field(None, description=f"可选技术栈：{AVAILABLE_STACKS}")
    max_results: int = 3


class DesignSystemRequest(BaseModel):
    query: str
    project_name: Optional[str] = None


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok", "version": __version__}


@app.post("/api/search")
def api_search(req: SearchRequest) -> JSONResponse:
    if req.stack:
        if req.stack not in AVAILABLE_STACKS:
            raise HTTPException(400, f"未知 stack: {req.stack}")
        result = search_stack(req.query, req.stack, req.max_results)
    else:
        if req.domain and req.domain not in CSV_CONFIG:
            raise HTTPException(400, f"未知 domain: {req.domain}")
        result = search(req.query, req.domain, req.max_results)
    return JSONResponse(result)


@app.post("/api/design-system")
def api_design_system(req: DesignSystemRequest) -> JSONResponse:
    generator = DesignSystemGenerator()
    return JSONResponse(generator.generate(req.query, req.project_name))


@app.post("/api/preview", response_class=HTMLResponse)
def api_preview(req: DesignSystemRequest) -> HTMLResponse:
    generator = DesignSystemGenerator()
    ds = generator.generate(req.query, req.project_name)
    html = generate_preview_html(ds)
    return HTMLResponse(html)


_INDEX_HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Design Bot — UI/UX 设计智能助手</title>
<style>
  :root { --bg:#0F172A; --card:#1E293B; --primary:#6366F1; --text:#F8FAFC; --muted:#94A3B8; }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;padding:2rem 1rem;line-height:1.6}
  .wrap{max-width:760px;margin:0 auto}
  h1{font-size:2rem;font-weight:700;letter-spacing:-.02em;margin-bottom:.5rem}
  .subtitle{color:var(--muted);margin-bottom:2rem}
  form{background:var(--card);padding:1.75rem;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,.25)}
  label{display:block;font-size:.85rem;font-weight:600;margin-bottom:.4rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
  textarea,input{width:100%;padding:.8rem 1rem;background:#0F172A;border:1px solid #334155;border-radius:8px;color:var(--text);font-size:1rem;font-family:inherit;outline:none;transition:border-color .2s}
  textarea:focus,input:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(99,102,241,.25)}
  textarea{resize:vertical;min-height:90px}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem}
  @media(max-width:640px){.row{grid-template-columns:1fr}}
  button{margin-top:1.25rem;width:100%;padding:.9rem;background:var(--primary);color:white;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;transition:opacity .2s,transform .1s}
  button:hover{opacity:.9}
  button:active{transform:translateY(1px)}
  .examples{margin-top:1.25rem;display:flex;flex-wrap:wrap;gap:.5rem}
  .chip{background:#0F172A;border:1px solid #334155;padding:.35rem .8rem;border-radius:20px;font-size:.82rem;color:var(--muted);cursor:pointer;transition:all .2s}
  .chip:hover{border-color:var(--primary);color:var(--text)}
  .footer{margin-top:2rem;text-align:center;color:var(--muted);font-size:.85rem}
  a{color:var(--primary);text-decoration:none}
  a:hover{text-decoration:underline}
</style>
</head>
<body>
<div class="wrap">
  <h1>Design Bot</h1>
  <p class="subtitle">AI 驱动的 UI/UX 设计智能助手 · 输入需求一键生成完整设计系统</p>

  <form action="/api/preview" method="post" enctype="application/x-www-form-urlencoded" id="form">
    <label for="q">设计需求描述</label>
    <textarea id="q" name="query" placeholder="例：帮我设计一个 SaaS 产品的 Landing Page，科技风格，需要暗黑模式" required></textarea>

    <div class="row">
      <div>
        <label for="p">项目名 (可选)</label>
        <input id="p" name="project_name" placeholder="Acme Bank" />
      </div>
    </div>

    <div class="examples">
      <span class="chip" data-q="医疗健康数据分析仪表盘 专业 清爽">医疗仪表盘</span>
      <span class="chip" data-q="电商 App 年轻女性 时尚 活泼">电商 App</span>
      <span class="chip" data-q="SaaS landing page 科技 暗黑模式">科技 SaaS</span>
      <span class="chip" data-q="beauty spa wellness service">水疗服务</span>
      <span class="chip" data-q="crypto wallet fintech security">加密钱包</span>
    </div>

    <button type="submit">生成设计系统并预览</button>
  </form>

  <p class="footer">
    复刻自 <a href="https://cnb.cool/cnbnn/ui-ux-pro-max" target="_blank">cnbnn/ui-ux-pro-max</a> · MIT ·
    JSON API: <code>POST /api/design-system</code>
  </p>
</div>

<script>
  // POST 表单需要 application/json 给 API，但 /api/preview 这里处理表单
  // 为了兼容，submit 时改用 fetch 提交 JSON 并打开新窗口
  const form = document.getElementById('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = { query: fd.get('query'), project_name: fd.get('project_name') || null };
    const res = await fetch('/api/preview', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    });
    const html = await res.text();
    const w = window.open('', '_blank');
    w.document.open(); w.document.write(html); w.document.close();
  });
  document.querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', () => {
      document.getElementById('q').value = c.dataset.q;
      document.getElementById('q').focus();
    });
  });
</script>
</body>
</html>
"""


@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
    return HTMLResponse(_INDEX_HTML)


def main() -> None:
    import uvicorn
    uvicorn.run("design_bot.server:app", host="0.0.0.0", port=int(__import__("os").environ.get("PORT", 8000)))


if __name__ == "__main__":
    main()
