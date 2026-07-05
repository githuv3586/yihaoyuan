# opc.so v1.1.0 — 代码复审修复补丁

针对 CNB 仓库 [`zhanxiaoyu/opc-so`](https://cnb.cool/zhanxiaoyu/opc-so) 复审后的修复。由于无法直接向 CNB 推送，修复以补丁文件 `opc-so-v1.1.0-review.patch` 交付，请在 CNB 仓库应用。

## 应用方式

```bash
git clone https://cnb.cool/zhanxiaoyu/opc-so.git && cd opc-so
git checkout -b fix/v1.1.0-review
git am < /path/to/opc-so-v1.1.0-review.patch   # 或 git apply
# 校验
node --check server.js && node scripts/validate-policies.js && npm test
```

## 修复项

| 级别 | 问题 | 修复 |
|------|------|------|
| 安全 | `getClientIP` 无条件信任 `X-Forwarded-For` 第一段，可伪造绕过限流刷爆 AI 配额 / Issue | 默认改用真实连接地址；新增 `TRUST_PROXY=N` 在可信反代后按跳数取值 |
| 可靠性 | `/api/apply` 在 Issue 创建 + 本地日志双双失败时仍返回 `success:true`，咨询静默丢失 | `logged=false` 时如实返回 502 失败 |
| 正确性 | 缺失的静态资源（`/js/*.js` 等）回退 `index.html + 200`，掩盖错误、Content-Type 错误 | 带扩展名资源找不到直接 404，SPA 回退仅对无扩展名页面路由生效 |
| 健壮性 | `/api/ai-match` 透传 AI 返回的政策 `id`，可能是模型幻觉出的不存在政策 | 仅接受真实存在于政策库的 `id`，并对 `title/reason/relevance` 做长度与枚举收敛 |

## ⚠️ 需人工处理（补丁无法覆盖）

`CNB_TOKEN`（`aflmuMezOyq181dCmWhfWuOtekU`）仍完整保留在 git 历史提交 `3643876` 中，可被 `git show 3643876:server.js` 取出。**必须立即在 CNB 平台吊销并轮换**；轮换后旧 token 失效即解除风险，如需彻底抹除历史可用 `git filter-repo` 重写并强推。

## 验证

- `node --check` server.js / calc.js / main.js 全过
- `scripts/validate-policies.js`：15 条政策全部通过
- `npm test`：17/17 通过
- 运行时冒烟：健康检查 / 政策接口正常；`/js/nope.js` 返回 404 JSON（修复前为 index.html + 200）
