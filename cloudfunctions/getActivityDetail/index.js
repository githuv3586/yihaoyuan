/**
 * 云函数 getActivityDetail
 * 根据 id 返回单个活动详情。
 * 入参：{ id }
 */
const tcb = require("@cloudbase/node-sdk");

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
const db = app.database();

exports.main = async (event) => {
  try {
    const { id } = event || {};
    if (!id) return { code: -1, message: "缺少活动 id" };
    const res = await db.collection("activities").doc(id).get();
    const doc = res.data && res.data[0];
    if (!doc) return { code: -1, message: "活动不存在" };
    return { code: 0, data: doc };
  } catch (e) {
    return { code: -1, message: e.message };
  }
};
