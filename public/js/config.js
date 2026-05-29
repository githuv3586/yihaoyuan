/**
 * 锦鸿行 - 运行配置
 *
 * 接入真实腾讯云云开发（CloudBase）时：
 *   1. 在 https://console.cloud.tencent.com/tcb 创建环境，拿到「环境 ID」
 *   2. 把下面的 ENV_ID 改成你的环境 ID
 *   3. 在 index.html 中取消 @cloudbase/js-sdk 的引入注释
 *   4. 运行 scripts/init-db.js 初始化文档数据库（activities / categories / orders）
 *   5. 部署 cloudfunctions 下的云函数，并开启匿名登录
 *
 * 当 ENV_ID 为空字符串时，应用自动进入「本地演示模式」：
 *   使用浏览器 localStorage 模拟文档数据库，保证 Demo 离线也能交互、有数据。
 */
window.JHX_CONFIG = {
  ENV_ID: "", // 例如 "jinhongxing-1a2b3c4d"，留空则使用本地演示模式
  APP_NAME: "锦鸿行",
  // 数据库集合名（与云开发文档数据库一致）
  COLLECTIONS: {
    categories: "categories",
    activities: "activities",
    orders: "orders",
  },
};
