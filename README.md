# opc-so 项目评审

本仓库存放对 [cnb.cool/zhanxiaoyu/opc-so](https://cnb.cool/zhanxiaoyu/opc-so) 的独立代码评审。

完整报告见：[OPC_SO_CODE_REVIEW.md](./OPC_SO_CODE_REVIEW.md)

## 结论摘要

- **P0**：`/api/chat` 前后端响应字段不匹配（AI 聊天实际全走本地 fallback）；文档仍含 Agnes API Key；Node/Docker 下 `/images` 与 `data/policies.json` 不可用。
- **P1**：爬虫缺 key 时 `NameError`；`/api/apply` 失败仍报成功；Issue 正文未转义；城市数口径不准。
- 仓库内原有 `REVIEW_REPORT.md` 声称多项已修复，复核后仍有回归与未闭环项。
