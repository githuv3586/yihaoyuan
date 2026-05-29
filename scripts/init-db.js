/**
 * 锦鸿行 - 文档数据库初始化脚本
 *
 * 作用：把 public/data/seed-data.json 中的种子数据导入云开发文档数据库
 *       （集合：categories / activities / orders）。
 *
 * 使用：
 *   1. npm i @cloudbase/manager-node
 *   2. 设置环境变量：
 *        export TCB_ENV_ID=你的环境ID
 *        export TCB_SECRET_ID=腾讯云SecretId
 *        export TCB_SECRET_KEY=腾讯云SecretKey
 *   3. node scripts/init-db.js
 *
 * 注意：脚本会在集合不存在时自动创建，并以「文档 _id」为主键写入，可重复执行（覆盖式）。
 */
const fs = require("fs");
const path = require("path");

async function main() {
  const { ENV_ID, SECRET_ID, SECRET_KEY } = {
    ENV_ID: process.env.TCB_ENV_ID,
    SECRET_ID: process.env.TCB_SECRET_ID,
    SECRET_KEY: process.env.TCB_SECRET_KEY,
  };
  if (!ENV_ID || !SECRET_ID || !SECRET_KEY) {
    console.error(
      "缺少环境变量，请设置 TCB_ENV_ID / TCB_SECRET_ID / TCB_SECRET_KEY"
    );
    process.exit(1);
  }

  const CloudBase = require("@cloudbase/manager-node");
  const app = new CloudBase({
    secretId: SECRET_ID,
    secretKey: SECRET_KEY,
    envId: ENV_ID,
  });
  const { database } = app;

  const seed = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "public", "data", "seed-data.json"),
      "utf-8"
    )
  );

  const collections = ["categories", "activities", "orders"];
  for (const name of collections) {
    try {
      await database.createCollection(name);
      console.log(`✓ 已创建集合 ${name}`);
    } catch (e) {
      console.log(`· 集合 ${name} 已存在`);
    }
  }

  for (const name of collections) {
    const docs = seed[name] || [];
    for (const doc of docs) {
      const _id = doc._id;
      try {
        // 先删后增，保证幂等
        await database.deleteDocument(name, { _id }).catch(() => {});
        await database.importDocuments(name, [doc], { upsert: true }).catch(
          async () => {
            await database.addDocument(name, doc);
          }
        );
      } catch (e) {
        console.warn(`! 写入 ${name}/${_id} 失败：${e.message}`);
      }
    }
    console.log(`✓ ${name} 导入 ${docs.length} 条`);
  }

  console.log("\n🎉 数据库初始化完成");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
