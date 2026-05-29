/**
 * 云函数 getMyOrders
 * 查询某用户的报名记录；action="cancel" 时取消报名并回退名额。
 * 入参：{ action?: "list" | "cancel", userId?, orderId? }
 */
const tcb = require("@cloudbase/node-sdk");

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
const db = app.database();
const _ = db.command;

exports.main = async (event) => {
  try {
    const { action = "list", userId, orderId } = event || {};

    if (action === "cancel") {
      if (!orderId) return { code: -1, message: "缺少 orderId" };
      const res = await db.collection("orders").doc(orderId).get();
      const order = res.data && res.data[0];
      if (!order) return { code: -1, message: "订单不存在" };
      await db
        .collection("activities")
        .doc(order.activityId)
        .update({ enrolled: _.inc(-order.ticketCount), status: "open" });
      await db.collection("orders").doc(orderId).remove();
      return { code: 0, data: true };
    }

    if (!userId) return { code: 0, data: [] };
    const res = await db
      .collection("orders")
      .where({ userId })
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    return { code: 0, data: res.data };
  } catch (e) {
    return { code: -1, message: e.message };
  }
};
