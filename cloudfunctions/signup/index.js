/**
 * 云函数 signup
 * 报名活动：校验名额 -> 写入订单 -> 原子自增报名人数。
 * 入参：{ activityId, userId, userName, userPhone, ticketCount }
 */
const tcb = require("@cloudbase/node-sdk");

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
const db = app.database();
const _ = db.command;

function formatNow() {
  const d = new Date(Date.now() + 8 * 3600 * 1000); // 东八区
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(
    d.getUTCDate()
  )} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

exports.main = async (event) => {
  try {
    const { activityId, userId, userName, userPhone } = event || {};
    const ticketCount = Math.max(1, parseInt(event.ticketCount, 10) || 1);
    if (!activityId || !userId || !userName || !userPhone) {
      return { code: -1, message: "请先登录后再报名" };
    }
    if (!/^1[0-9]{10}$/.test(userPhone)) {
      return { code: -1, message: "手机号格式不正确" };
    }

    const actRes = await db.collection("activities").doc(activityId).get();
    const act = actRes.data && actRes.data[0];
    if (!act) return { code: -1, message: "活动不存在" };
    if (act.status === "full" || act.enrolled + ticketCount > act.capacity) {
      return { code: -1, message: "名额不足" };
    }

    const order = {
      activityId,
      activityTitle: act.title,
      userId,
      userName,
      userPhone,
      ticketCount,
      amount: act.price * ticketCount,
      status: "已确认",
      createdAt: formatNow(),
    };
    const addRes = await db.collection("orders").add(order);

    await db
      .collection("activities")
      .doc(activityId)
      .update({ enrolled: _.inc(ticketCount) });

    if (act.enrolled + ticketCount >= act.capacity) {
      await db.collection("activities").doc(activityId).update({ status: "full" });
    }

    return { code: 0, data: { _id: addRes.id, ...order } };
  } catch (e) {
    return { code: -1, message: e.message };
  }
};
