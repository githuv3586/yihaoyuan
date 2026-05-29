/**
 * 云函数 getActivities
 * 返回活动列表或分类列表（基于云开发文档数据库）。
 *
 * 入参：
 *   { action: "list", categoryId?, keyword? }  -> 活动列表
 *   { action: "categories" }                   -> 分类列表
 */
const tcb = require("@cloudbase/node-sdk");

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
const db = app.database();
const _ = db.command;

exports.main = async (event) => {
  try {
    const { action = "list", categoryId, keyword } = event || {};

    if (action === "categories") {
      const res = await db.collection("categories").get();
      return { code: 0, data: res.data };
    }

    const query = {};
    if (categoryId && categoryId !== "all") query.categoryId = categoryId;

    let col = db.collection("activities");
    let res;
    if (keyword) {
      const reg = db.RegExp({ regexp: keyword, options: "i" });
      res = await col
        .where(
          _.and(
            query,
            _.or([{ title: reg }, { city: reg }, { tags: reg }])
          )
        )
        .limit(100)
        .get();
    } else {
      res = await col.where(query).limit(100).get();
    }
    return { code: 0, data: res.data };
  } catch (e) {
    return { code: -1, message: e.message };
  }
};
