/**
 * 锦鸿行 - 数据访问层
 *
 * 对外暴露统一的异步 API（基于 Promise），UI 层无需关心底层是
 * 「腾讯云云开发文档数据库」还是「本地演示模式」。
 *
 *   - 当 JHX_CONFIG.ENV_ID 非空且加载了 @cloudbase/js-sdk 时，走真实云开发：
 *       前端 SDK -> 云函数 -> 文档数据库
 *   - 否则走本地演示模式：localStorage 模拟同样结构的文档数据库
 */
(function () {
  const cfg = window.JHX_CONFIG;
  const LS_KEY = "jhx_db_v1";

  // ---------------------------------------------------------------------------
  // 本地演示模式：用 localStorage 模拟文档数据库
  // ---------------------------------------------------------------------------
  const Local = {
    db: null,

    async ensure() {
      if (this.db) return this.db;
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        this.db = JSON.parse(raw);
        return this.db;
      }
      // 首次进入，加载种子数据
      const res = await fetch("./data/seed-data.json");
      const seed = await res.json();
      this.db = seed;
      this.persist();
      return this.db;
    },

    persist() {
      localStorage.setItem(LS_KEY, JSON.stringify(this.db));
    },

    async getCategories() {
      const db = await this.ensure();
      return db.categories.slice();
    },

    async getActivities({ categoryId, keyword } = {}) {
      const db = await this.ensure();
      let list = db.activities.slice();
      if (categoryId && categoryId !== "all") {
        list = list.filter((a) => a.categoryId === categoryId);
      }
      if (keyword) {
        const kw = keyword.trim().toLowerCase();
        list = list.filter(
          (a) =>
            a.title.toLowerCase().includes(kw) ||
            a.city.toLowerCase().includes(kw) ||
            (a.tags || []).some((t) => t.toLowerCase().includes(kw))
        );
      }
      return list;
    },

    async getActivity(id) {
      const db = await this.ensure();
      return db.activities.find((a) => a._id === id) || null;
    },

    async signup(activityId, form) {
      const db = await this.ensure();
      const act = db.activities.find((a) => a._id === activityId);
      if (!act) throw new Error("活动不存在");
      if (act.status === "full" || act.enrolled >= act.capacity) {
        throw new Error("名额已满");
      }
      const tickets = Math.max(1, parseInt(form.ticketCount, 10) || 1);
      const order = {
        _id: "ord_" + Date.now(),
        activityId,
        activityTitle: act.title,
        userName: form.userName,
        userPhone: form.userPhone,
        ticketCount: tickets,
        amount: act.price * tickets,
        status: "已确认",
        createdAt: formatNow(),
      };
      db.orders.unshift(order);
      act.enrolled = Math.min(act.capacity, act.enrolled + tickets);
      if (act.enrolled >= act.capacity) act.status = "full";
      this.persist();
      return order;
    },

    async getMyOrders() {
      const db = await this.ensure();
      return db.orders.slice();
    },

    async cancelOrder(orderId) {
      const db = await this.ensure();
      const idx = db.orders.findIndex((o) => o._id === orderId);
      if (idx === -1) return false;
      const order = db.orders[idx];
      const act = db.activities.find((a) => a._id === order.activityId);
      if (act) {
        act.enrolled = Math.max(0, act.enrolled - order.ticketCount);
        if (act.status === "full" && act.enrolled < act.capacity) {
          act.status = "open";
        }
      }
      db.orders.splice(idx, 1);
      this.persist();
      return true;
    },

    async reset() {
      localStorage.removeItem(LS_KEY);
      this.db = null;
      await this.ensure();
    },
  };

  // ---------------------------------------------------------------------------
  // 云开发模式：通过 @cloudbase/js-sdk 调用云函数
  // ---------------------------------------------------------------------------
  const Cloud = {
    app: null,

    async ensure() {
      if (this.app) return this.app;
      this.app = window.cloudbase.init({ env: cfg.ENV_ID });
      await this.app.auth({ persistence: "local" }).signInAnonymously();
      return this.app;
    },

    async call(name, data) {
      const app = await this.ensure();
      const res = await app.callFunction({ name, data });
      if (res.result && res.result.code === 0) return res.result.data;
      throw new Error((res.result && res.result.message) || "云函数调用失败");
    },

    getCategories() {
      return this.call("getActivities", { action: "categories" });
    },
    getActivities(params) {
      return this.call("getActivities", { action: "list", ...params });
    },
    getActivity(id) {
      return this.call("getActivityDetail", { id });
    },
    signup(activityId, form) {
      return this.call("signup", { activityId, ...form });
    },
    getMyOrders() {
      return this.call("getMyOrders", {});
    },
    cancelOrder(orderId) {
      return this.call("getMyOrders", { action: "cancel", orderId });
    },
    async reset() {
      /* 云端模式不支持前端重置 */
    },
  };

  function formatNow() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
      d.getHours()
    )}:${p(d.getMinutes())}`;
  }

  const useCloud = !!cfg.ENV_ID && !!window.cloudbase;
  const impl = useCloud ? Cloud : Local;

  window.JHX_STORE = {
    mode: useCloud ? "cloud" : "local",
    getCategories: () => impl.getCategories(),
    getActivities: (params) => impl.getActivities(params),
    getActivity: (id) => impl.getActivity(id),
    signup: (activityId, form) => impl.signup(activityId, form),
    getMyOrders: () => impl.getMyOrders(),
    cancelOrder: (id) => impl.cancelOrder(id),
    reset: () => impl.reset(),
  };
})();
