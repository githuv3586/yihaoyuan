/**
 * 云函数 login
 * 登录即自动注册：手机号不存在时自动创建账号；存在则校验密码。
 * 入参：{ phone, password }
 * 返回：{ _id, phone, name, isNew }
 *
 * 注意：演示用途，密码为明文存储；生产环境请改为加盐哈希。
 */
const crypto = require("crypto");
const tcb = require("@cloudbase/node-sdk");

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
const db = app.database();

function hash(pwd) {
  return crypto.createHash("sha256").update("jhx_" + pwd).digest("hex");
}
function formatNow() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(
    d.getUTCDate()
  )} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

exports.main = async (event) => {
  try {
    const { phone, password } = event || {};
    if (!/^1[0-9]{10}$/.test(phone || "")) {
      return { code: -1, message: "手机号格式不正确" };
    }
    if (!password || password.length < 6) {
      return { code: -1, message: "密码至少 6 位" };
    }

    const pwd = hash(password);
    const found = await db
      .collection("users")
      .where({ phone })
      .limit(1)
      .get();
    const user = found.data && found.data[0];

    if (!user) {
      const doc = {
        phone,
        password: pwd,
        name: "用户" + phone.slice(-4),
        createdAt: formatNow(),
      };
      const add = await db.collection("users").add(doc);
      return {
        code: 0,
        data: { _id: add.id, phone, name: doc.name, isNew: true },
      };
    }

    if (user.password !== pwd) {
      return { code: -1, message: "手机号或密码错误" };
    }
    return {
      code: 0,
      data: { _id: user._id, phone: user.phone, name: user.name, isNew: false },
    };
  } catch (e) {
    return { code: -1, message: e.message };
  }
};
