/**
 * 锦鸿行 - 前端应用（hash 路由 + 视图渲染 + 交互）
 *
 * 账号：登录即自动注册（手机号首次登录自动建号），不提供独立注册入口。
 */
(function () {
  const store = window.JHX_STORE;
  const cfg = window.JHX_CONFIG;
  const viewEl = document.getElementById("view");
  const appbarEl = document.getElementById("appbar-inner");

  const state = { categories: [], activeCat: "all", keyword: "" };

  // --------------------------------------------------------------------- utils
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));

  const maskPhone = (p) =>
    p && p.length === 11 ? p.slice(0, 3) + "****" + p.slice(7) : p;

  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add("hidden"), 1800);
  }

  function catName(id) {
    const c = state.categories.find((x) => x._id === id);
    return c ? c.name : "活动";
  }
  function catIcon(id) {
    const c = state.categories.find((x) => x._id === id);
    return c ? c.icon : "📌";
  }
  function priceText(p) {
    return p === 0 ? '<span class="free">免费</span>' : `¥${p}`;
  }
  function loading() {
    viewEl.innerHTML = '<div class="loading">加载中…</div>';
  }

  // -------------------------------------------------------------- 登录弹窗
  // 登录即自动注册：onSuccess 在登录成功后回调
  function openLogin(onSuccess) {
    const modal = document.getElementById("login-modal");
    const form = document.getElementById("login-form");
    form.reset();
    modal.classList.remove("hidden");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const phone = form.phone.value.trim();
      const password = form.password.value;
      if (!/^1[0-9]{10}$/.test(phone)) return toast("请输入正确的手机号");
      if (password.length < 6) return toast("密码至少 6 位");
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = "登录中…";
      try {
        const user = await store.login(phone, password);
        closeLogin();
        toast(user.isNew ? "已为你自动注册并登录 🎉" : "登录成功");
        if (typeof onSuccess === "function") onSuccess(user);
      } catch (err) {
        toast(err.message || "登录失败");
      } finally {
        btn.disabled = false;
        btn.textContent = "登录";
      }
    };
  }
  function closeLogin() {
    document.getElementById("login-modal").classList.add("hidden");
  }

  // ---------------------------------------------------------------- 首页视图
  async function renderHome() {
    setAppbar(`
      <div class="brand">
        <span class="brand-logo">锦</span>
        <div class="brand-text">
          <strong>锦鸿行</strong>
          <small>发现身边的精彩活动</small>
        </div>
      </div>
      <span class="mode-badge">${store.mode === "cloud" ? "云开发" : "演示数据"}</span>
    `);
    setTab("home");
    loading();

    if (!state.categories.length) {
      state.categories = await store.getCategories();
    }
    const list = await store.getActivities({
      categoryId: state.activeCat,
      keyword: state.keyword,
    });

    const cats = [{ _id: "all", name: "全部", icon: "✨" }, ...state.categories];

    viewEl.innerHTML = `
      <div class="search">
        <input id="search-input" type="search" placeholder="搜索活动 / 城市 / 标签"
               value="${esc(state.keyword)}" />
      </div>
      <div class="cats">
        ${cats
          .map(
            (c) => `
          <button class="cat ${c._id === state.activeCat ? "active" : ""}"
                  data-cat="${c._id}">
            <span class="cat-ico">${c.icon}</span>${esc(c.name)}
          </button>`
          )
          .join("")}
      </div>
      <div class="section-title">
        ${state.activeCat === "all" ? "热门活动" : catName(state.activeCat)}
        <span class="count">${list.length} 场</span>
      </div>
      <div class="cards">
        ${list.length ? list.map(card).join("") : '<div class="empty">没有找到相关活动</div>'}
      </div>
    `;

    $("#search-input").addEventListener("input", (e) => {
      state.keyword = e.target.value;
      clearTimeout(renderHome._t);
      renderHome._t = setTimeout(renderHome, 250);
    });
    viewEl.querySelectorAll(".cat").forEach((b) =>
      b.addEventListener("click", () => {
        state.activeCat = b.dataset.cat;
        renderHome();
      })
    );
    viewEl.querySelectorAll(".card").forEach((c) =>
      c.addEventListener("click", () => {
        location.hash = "#/detail/" + c.dataset.id;
      })
    );
  }

  function card(a) {
    const ratio = Math.round((a.enrolled / a.capacity) * 100);
    return `
      <article class="card" data-id="${a._id}">
        <div class="card-cover" style="background:linear-gradient(135deg,${a.cover.from},${a.cover.to})">
          <span class="cover-emoji">${a.cover.emoji}</span>
          <span class="cover-cat">${catIcon(a.categoryId)} ${esc(catName(a.categoryId))}</span>
          ${a.status === "full" ? '<span class="cover-full">已满</span>' : ""}
        </div>
        <div class="card-body">
          <h3 class="card-title">${esc(a.title)}</h3>
          <div class="card-meta">📅 ${esc(a.startTime)}</div>
          <div class="card-meta">📍 ${esc(a.city)} · ${esc(a.address)}</div>
          <div class="card-foot">
            <span class="card-price">${priceText(a.price)}</span>
            <span class="card-enroll">${a.enrolled}/${a.capacity} 人 · ${ratio}%</span>
          </div>
        </div>
      </article>`;
  }

  // ---------------------------------------------------------------- 详情视图
  async function renderDetail(id) {
    setTab("home");
    loading();
    if (!state.categories.length) state.categories = await store.getCategories();
    const a = await store.getActivity(id);
    if (!a) {
      viewEl.innerHTML = '<div class="empty">活动不存在</div>';
      return;
    }
    setAppbar(`
      <button class="back" onclick="history.back()">‹ 返回</button>
      <strong class="appbar-title">活动详情</strong>
      <span></span>
    `);
    const full = a.status === "full" || a.enrolled >= a.capacity;
    viewEl.innerHTML = `
      <div class="detail-cover" style="background:linear-gradient(135deg,${a.cover.from},${a.cover.to})">
        <span class="detail-emoji">${a.cover.emoji}</span>
      </div>
      <div class="detail-body">
        <span class="chip">${catIcon(a.categoryId)} ${esc(catName(a.categoryId))}</span>
        <h1 class="detail-title">${esc(a.title)}</h1>
        <div class="detail-tags">${(a.tags || [])
          .map((t) => `<span class="tag">#${esc(t)}</span>`)
          .join("")}</div>

        <div class="info-list">
          <div class="info"><span>🕒 时间</span><b>${esc(a.startTime)} ~ ${esc(a.endTime)}</b></div>
          <div class="info"><span>📍 地点</span><b>${esc(a.city)} · ${esc(a.address)}</b></div>
          <div class="info"><span>🧑‍💼 主办</span><b>${esc(a.host)}</b></div>
          <div class="info"><span>👥 报名</span><b>${a.enrolled}/${a.capacity} 人</b></div>
        </div>

        <div class="detail-section-title">活动简介</div>
        <p class="detail-summary">${esc(a.summary)}</p>
        <div class="detail-section-title">活动详情</div>
        <div class="detail-text">${esc(a.detail).replace(/\n/g, "<br/>")}</div>
      </div>

      <div class="detail-bar">
        <div class="detail-price">
          ${priceText(a.price)}<small>${full ? "名额已满" : "剩余 " + (a.capacity - a.enrolled) + " 席"}</small>
        </div>
        <button class="btn btn-primary btn-lg" id="btn-signup" ${full ? "disabled" : ""}>
          ${full ? "已满额" : "立即报名"}
        </button>
      </div>
    `;
    if (!full) {
      $("#btn-signup").addEventListener("click", () => {
        // 报名前需登录；未登录则先登录（登录即自动注册）
        if (!store.getCurrentUser()) {
          toast("请先登录后报名");
          openLogin(() => openSignup(a));
        } else {
          openSignup(a);
        }
      });
    }
  }

  // ---------------------------------------------------------------- 报名弹窗
  function openSignup(a) {
    const user = store.getCurrentUser();
    const modal = document.getElementById("modal");
    const form = document.getElementById("signup-form");
    const amountEl = document.getElementById("signup-amount");
    form.reset();
    form.ticketCount.value = 1;
    // 自动带入当前登录用户信息
    if (user) {
      form.userName.value = user.name || "";
      form.userPhone.value = user.phone || "";
    }

    function updateAmount() {
      const n = Math.max(1, parseInt(form.ticketCount.value, 10) || 1);
      amountEl.innerHTML =
        a.price === 0
          ? "应付：<b>免费</b>"
          : `应付：<b>¥${a.price * n}</b>（¥${a.price} × ${n}）`;
    }
    updateAmount();
    form.ticketCount.oninput = updateAmount;

    modal.classList.remove("hidden");

    form.onsubmit = async (e) => {
      e.preventDefault();
      const data = {
        userName: form.userName.value.trim(),
        userPhone: form.userPhone.value.trim(),
        ticketCount: form.ticketCount.value,
      };
      if (!/^1[0-9]{10}$/.test(data.userPhone)) {
        toast("请输入正确的手机号");
        return;
      }
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = "提交中…";
      try {
        await store.signup(a._id, data);
        closeModal();
        toast("报名成功 🎉");
        setTimeout(() => (location.hash = "#/my"), 600);
      } catch (err) {
        toast(err.message || "报名失败");
      } finally {
        btn.disabled = false;
        btn.textContent = "确认报名";
      }
    };
  }

  function closeModal() {
    document.getElementById("modal").classList.add("hidden");
  }

  // ---------------------------------------------------------------- 我的报名
  async function renderMy() {
    setAppbar(`
      <strong class="appbar-title">我的报名</strong>
      <button class="reset-btn" id="reset-btn" title="重置演示数据">↻</button>
    `);
    setTab("my");
    loading();

    const user = store.getCurrentUser();
    if (!user) {
      // 未登录：仅展示登录入口（登录即自动注册，无独立注册入口）
      viewEl.innerHTML = `
        <div class="login-panel">
          <div class="login-logo">锦</div>
          <h2 class="login-welcome">欢迎来到锦鸿行</h2>
          <p class="login-sub">登录后查看与管理你的活动报名</p>
          <button class="btn btn-primary btn-lg login-entry" id="go-login">登录 / 一键注册</button>
          <p class="login-hint">未注册的手机号，登录时将自动为你创建账号</p>
        </div>`;
      $("#go-login").addEventListener("click", () => openLogin(renderMy));
      bindReset();
      return;
    }

    const orders = await store.getMyOrders();
    viewEl.innerHTML = `
      <div class="user-bar">
        <div class="user-info">
          <span class="user-avatar">${esc((user.name || "用").slice(0, 1))}</span>
          <div>
            <strong>${esc(user.name)}</strong>
            <small>${esc(maskPhone(user.phone))}</small>
          </div>
        </div>
        <button class="logout-btn" id="logout-btn">退出登录</button>
      </div>
      ${
        orders.length
          ? `<div class="orders">${orders.map(orderItem).join("")}</div>`
          : `<div class="empty">还没有报名记录<br/><a class="link" href="#/">去发现活动 ›</a></div>`
      }
    `;

    viewEl.querySelectorAll(".order-cancel").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("确定取消这条报名吗？")) return;
        await store.cancelOrder(b.dataset.id);
        toast("已取消报名");
        renderMy();
      })
    );
    viewEl.querySelectorAll(".order-card").forEach((c) =>
      c.addEventListener("click", (e) => {
        if (e.target.closest(".order-cancel")) return;
        location.hash = "#/detail/" + c.dataset.act;
      })
    );
    $("#logout-btn").addEventListener("click", () => {
      store.logout();
      toast("已退出登录");
      renderMy();
    });
    bindReset();
  }

  function bindReset() {
    const reset = $("#reset-btn");
    if (reset)
      reset.addEventListener("click", async () => {
        if (!confirm("重置为初始演示数据？（不影响登录状态）")) return;
        await store.reset();
        state.categories = [];
        toast("已重置");
        renderMy();
      });
  }

  function orderItem(o) {
    return `
      <article class="order-card" data-act="${o.activityId}">
        <div class="order-head">
          <span class="order-status ${o.status === "已确认" ? "ok" : ""}">${esc(o.status)}</span>
          <span class="order-time">${esc(o.createdAt)}</span>
        </div>
        <h3 class="order-title">${esc(o.activityTitle)}</h3>
        <div class="order-meta">
          <span>👤 ${esc(o.userName)} · ${esc(maskPhone(o.userPhone))}</span>
        </div>
        <div class="order-foot">
          <span>🎟️ ${o.ticketCount} 张 · ${
            o.amount === 0 ? "免费" : "¥" + o.amount
          }</span>
          <button class="order-cancel" data-id="${o._id}">取消报名</button>
        </div>
      </article>`;
  }

  // ------------------------------------------------------------------ 公共 UI
  function setAppbar(html) {
    appbarEl.innerHTML = html;
  }
  function setTab(name) {
    document.querySelectorAll(".tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.tab === name)
    );
  }

  // 弹窗关闭
  document.getElementById("modal").addEventListener("click", (e) => {
    if (e.target.dataset.close) closeModal();
  });
  document.getElementById("login-modal").addEventListener("click", (e) => {
    if (e.target.dataset.lclose) closeLogin();
  });

  // ------------------------------------------------------------------- 路由
  async function router() {
    const hash = location.hash || "#/";
    closeModal();
    closeLogin();
    window.scrollTo(0, 0);
    viewEl.scrollTop = 0;
    if (hash.startsWith("#/detail/")) {
      await renderDetail(hash.slice("#/detail/".length));
    } else if (hash === "#/my") {
      await renderMy();
    } else {
      await renderHome();
    }
  }

  window.addEventListener("hashchange", router);
  window.addEventListener("DOMContentLoaded", router);
  if (document.readyState !== "loading") router();
})();
