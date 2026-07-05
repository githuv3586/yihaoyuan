# wuxue 前端 UI/UX 与图标重构补丁

目标仓库：[cnb.cool/zhanxiaoyu/wuxue](https://cnb.cool/zhanxiaoyu/wuxue)（本环境无 cnb.cool 推送权限，改动以 patch 形式交付）。

## 应用方式

```bash
git clone https://cnb.cool/zhanxiaoyu/wuxue.git && cd wuxue
git checkout -b feat/uiux-refactor
git am uiux-refactor.patch
cd lhzx-admin && npm install   # 移除了 lucide-vue-next 死依赖，需要刷新 lockfile 安装
```

包含 2 个提交：

1. `refactor(lhzx-h5): 统一 UI 主题与图标体系`
2. `refactor(lhzx-admin): 重构后台 UI 与图标体系`

两个子项目均已通过 `vite build` 与 Playwright 页面冒烟验证（无页面级报错，CloudBase 环境变量缺失的告警除外）。
