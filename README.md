# opc.so — OPC 一人公司全周期赋能平台

基于 CNB OpenAPI 的零依赖 Node.js 后端 + 静态前端，提供政策匹配、AI 智能推荐与咨询提交。

## 功能

- **OPC 政策雷达**：按城市/类型筛选，或用自然语言 AI 匹配可申报补贴
- **AI 智能匹配**：`/api/ai-match` 代理 CNB AI Chat API
- **咨询提交**：`/api/apply` 创建 CNB Issue，失败时降级到本地日志

## 技术栈

- 后端：纯 Node.js 内置模块（`http` / `fs` / `path`），无任何运行时依赖
- 前端：原生 HTML/CSS/JS，入口为 `index.html`
- 数据：`data/policies.json`

## 本地开发

```bash
# 必须提供 CNB_TOKEN，否则拒绝启动
export CNB_TOKEN=your_token_here
npm start          # 默认监听 8686
# 或
PORT=9000 node server.js
```

健康检查：`GET http://localhost:8686/api/health`

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/api/health`   | 健康检查 |
| GET  | `/api/policies` | 返回政策数据 |
| POST | `/api/ai-match` | AI 智能匹配，body: `{ "query": "..." }` |
| POST | `/api/apply`    | 提交咨询，body: `{ name, contact, city, type, message }` |

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `CNB_TOKEN` | ✅ | CNB API Token，缺失则拒绝启动 |
| `PORT` | | 监听端口，默认 8686 |
| `CORS_ORIGINS` | | 允许的前端来源（逗号分隔），默认 `https://opc.so,https://www.opc.so,http://localhost:8686` |
| `INQUIRY_LOG_DIR` | | 降级日志目录，默认 `../private-logs` |

## Docker 部署

```bash
docker build -t opc-so .
# CNB_TOKEN 通过 -e 或 Secret 注入，不要写进 Dockerfile
docker run -p 8686:8686 -e CNB_TOKEN=xxx opc-so
```

镜像以非 root 用户运行，自带 `HEALTHCHECK`。

## CI/CD（CNB → opc.hejinhong.site）

推送 `main` 后自动部署静态站到腾讯云 COS，并刷新 CDN：

```
git push origin main
  → CNB 流水线 (.cnb.yml)
  → scripts/ci_verify.sh
  → scripts/deploy_cos.py
  → https://opc.hejinhong.site/
```

**首次使用前**请完成密钥仓库配置，见 [`docs/cicd-cos.md`](docs/cicd-cos.md)。

本地演练：

```bash
DRY_RUN=1 python3 scripts/deploy_cos.py
```

## ⚠️ 安全须知

**`CNB_TOKEN` 永远不要写进代码、Dockerfile 或 CI 配置。** 历史版本曾将其硬编码并提交，已在本仓库的安全修复中移除——如你从历史 commit 提取到该 token，**它已视为泄露，必须在 CNB 平台吊销并轮换**。
