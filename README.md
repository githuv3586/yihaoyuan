# 锦鸿行 · JinHongXing

一个仿「活动行」的**活动发现与报名** Demo，基于 **腾讯云云开发（CloudBase）** 与 **文档数据库** 架构实现。

> 移动端风格的单页应用，开箱即可交互、自带演示数据；同时提供完整的云函数与数据库初始化脚本，可一键接入真实的腾讯云云开发环境。

## ✨ 功能特性

- **首页活动列表**：分类横滑筛选、关键词搜索（标题 / 城市 / 标签）、报名进度展示
- **活动详情**：封面、时间地点、主办方、简介与详情、剩余席位
- **在线报名**：弹窗填写姓名 / 手机号 / 票数，实时计算金额，名额校验
- **我的报名**：查看报名订单、取消报名（自动回退名额）、重置演示数据
- **双运行模式**：
  - 🟢 **演示模式**（默认）：用浏览器 `localStorage` 模拟文档数据库，离线即可体验全部交互
  - ☁️ **云开发模式**：前端 SDK → 云函数 → 云开发文档数据库，配置环境 ID 即可切换

## 🚀 本地运行

无需任何依赖，使用内置零依赖静态服务器：

```bash
npm start
# 或者
node scripts/serve.js
```

然后浏览器打开 <http://localhost:8080> 即可（建议用移动端视图 / 手机访问，体验更佳）。

> 也可以用任意静态服务器托管 `public/` 目录，例如 `python3 -m http.server -d public 8080`。

## 🗂️ 项目结构

```
.
├── public/                     # 前端（CloudBase 静态网站托管目录）
│   ├── index.html              # 应用入口（含底部导航、报名弹窗）
│   ├── css/style.css           # 移动端样式
│   ├── js/
│   │   ├── config.js           # 运行配置（环境 ID / 集合名）
│   │   ├── store.js            # 数据访问层（云开发 SDK + 本地 mock 适配）
│   │   └── app.js              # 路由与视图渲染、交互逻辑
│   └── data/seed-data.json     # 文档数据库种子数据（分类/活动/订单）
├── cloudfunctions/             # 云函数（Node.js）
│   ├── getActivities/          # 活动 / 分类列表
│   ├── getActivityDetail/      # 活动详情
│   ├── signup/                 # 报名（写订单 + 原子自增名额）
│   └── getMyOrders/            # 我的报名 / 取消报名
├── scripts/
│   ├── serve.js                # 本地静态服务器
│   └── init-db.js              # 文档数据库初始化（导入种子数据）
├── cloudbaserc.json            # CloudBase 部署配置
└── package.json
```

## 🧱 文档数据库设计

采用云开发文档数据库（类 MongoDB），共三个集合：

| 集合 | 说明 | 关键字段 |
| --- | --- | --- |
| `categories` | 活动分类 | `_id`, `name`, `icon`, `color` |
| `activities` | 活动 | `_id`, `title`, `categoryId`, `cover`, `city`, `address`, `startTime`, `endTime`, `price`, `host`, `capacity`, `enrolled`, `tags[]`, `summary`, `detail`, `status` |
| `orders` | 报名订单 | `_id`, `activityId`, `activityTitle`, `userName`, `userPhone`, `ticketCount`, `amount`, `status`, `openid`, `createdAt` |

## ☁️ 接入真实腾讯云云开发

1. 在 [云开发控制台](https://console.cloud.tencent.com/tcb) 创建环境，获取**环境 ID**。
2. 初始化文档数据库（导入种子数据）：

   ```bash
   npm i @cloudbase/manager-node
   export TCB_ENV_ID=你的环境ID
   export TCB_SECRET_ID=腾讯云SecretId
   export TCB_SECRET_KEY=腾讯云SecretKey
   npm run init-db
   ```

3. 部署云函数（使用 [CloudBase CLI](https://docs.cloudbase.net/cli-v1/intro)）：

   ```bash
   npm i -g @cloudbase/cli
   tcb login
   tcb fn deploy getActivities getActivityDetail signup getMyOrders -e 你的环境ID
   ```

4. 开启**匿名登录**，并把 `public/js/config.js` 中的 `ENV_ID` 改为你的环境 ID，
   同时在 `public/index.html` 中取消 `cloudbase.full.js` 这一行的注释。
5. 托管前端：`tcb hosting deploy public -e 你的环境ID`。

完成后，应用顶部徽标会从「演示数据」变为「云开发」，所有数据读写将走真实文档数据库。

## 📝 说明

本项目为教学 / 演示用途，UI 与交互参考「活动行」，数据均为虚构示例。
