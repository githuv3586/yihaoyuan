/**
 * 锦鸿行 - 数据访问层
 *
 * 对外暴露统一的异步 API（基于 Promise），UI 层无需关心底层是
 * 「腾讯云云开发文档数据库」还是「本地演示模式」。
 *
 *   - 当 JHX_CONFIG.ENV_ID 非空且加载了 @cloudbase/js-sdk 时，走真实云开发：
 *       前端 SDK -> 云函数 -> 文档数据库
 *   - 否则走本地演示模式：localStorage 模拟同样结构的文档数据库
 *
 * 账号策略：登录即自动注册（手机号首次登录时自动创建账号），不提供独立注册入口。
 */
(function () {
  const cfg = window.JHX_CONFIG;
  const LS_KEY = "jhx_db_v1";
  const USER_KEY = "jhx_user_v1";

  // 当前登录用户（两种模式共用本地缓存）
  const Session = {
    get() {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    },
    set(user) {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_KEY);
    },
  };

  function formatNow() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
      d.getHours()
    )}:${p(d.getMinutes())}`;
  }

  function defaultName(phone) {
    return "用户" + String(phone).slice(-4);
  }

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
        if (!this.db.users) this.db.users = [];
        return this.db;
      }
      const res = await fetch("./data/seed-data.json");
      const seed = await res.json();
      this.db = seed;
      if (!this.db.users) this.db.users = [];
      this.persist();
      return this.db;
    },

    persist() {
      localStorage.setItem(LS_KEY, JSON.stringify(this.db));
    },

    // 登录即自动注册：手机号不存在时自动创建账号
    async login(phone, password) {
      const db = await this.ensure();
      let user = db.users.find((u) => u.phone === phone);
      let isNew = false;
      if (!user) {
        user = {
          _id: "user_" + Date.now(),
          phone,
          password,
          name: defaultName(phone),
          createdAt: formatNow(),
        };
        db.users.push(user);
        this.persist();
        isNew = true;
      } else if (user.password !== password) {
        throw new Error("手机号或密码错误");
      }
      const safe = { _id: user._id, phone: user.phone, name: user.name, isNew };
      Session.set(safe);
      return safe;
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
      const user = Session.get();
      if (!user) throw new Error("请先登录");
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
        userId: user._id,
        userName: form.userName || user.name,
        userPhone: form.userPhone || user.phone,
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
      const user = Session.get();
      if (!user) return [];
      return db.orders.filter((o) => o.userId === user._id);
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

    async login(phone, password) {
      const user = await this.call("login", { phone, password });
      Session.set(user);
      return user;
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
      const user = Session.get();
      if (!user) return Promise.reject(new Error("请先登录"));
      return this.call("signup", { activityId, userId: user._id, ...form });
    },
    getMyOrders() {
      const user = Session.get();
      if (!user) return Promise.resolve([]);
      return this.call("getMyOrders", { userId: user._id });
    },
    cancelOrder(orderId) {
      return this.call("getMyOrders", { action: "cancel", orderId });
    },
    async reset() {
      /* 云端模式不支持前端重置 */
    },
  };

  const useCloud = !!cfg.ENV_ID && !!window.cloudbase;
  const impl = useCloud ? Cloud : Local;

  window.JHX_STORE = {
    mode: useCloud ? "cloud" : "local",
    // 账号
    login: (phone, password) => impl.login(phone, password),
    logout: () => Session.set(null),
    getCurrentUser: () => Session.get(),
    // 业务
    getCategories: () => impl.getCategories(),
    getActivities: (params) => impl.getActivities(params),
    getActivity: (id) => impl.getActivity(id),
    signup: (activityId, form) => impl.signup(activityId, form),
    getMyOrders: () => impl.getMyOrders(),
    cancelOrder: (id) => impl.cancelOrder(id),
    reset: () => impl.reset(),
  };
})();
