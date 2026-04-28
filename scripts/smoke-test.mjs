#!/usr/bin/env node
// OpenClaw 装机前 smoke test：验证 GLM-5-Turbo（Coding 端点）连通 + 流式
//
// 用法：
//   ZAI_API_KEY=xxxxxxx.xxxxxxxxxxxx node scripts/smoke-test.mjs
//
// 也可以用 ~/.openclaw/.env 的方式：
//   export $(grep -v '^#' ~/.openclaw/.env | xargs) && node scripts/smoke-test.mjs
//
// 依赖：仅 Node 内置（≥ 22）。不引入第三方包，免得装包失败干扰排错。

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function loadDotEnv(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    // 文件不存在就跳过
  }
}

loadDotEnv(join(homedir(), ".openclaw", ".env"));

const KEY = process.env.ZAI_API_KEY;
const BASE = process.env.ZAI_BASE_URL || "https://open.bigmodel.cn/api/coding/paas/v4";
const MODEL = process.env.ZAI_MODEL || "glm-5-turbo";

function fail(msg, code = 1) {
  console.error(`\x1b[31m✖\x1b[0m ${msg}`);
  process.exit(code);
}
function ok(msg) {
  console.log(`\x1b[32m✔\x1b[0m ${msg}`);
}
function info(msg) {
  console.log(`\x1b[34mℹ\x1b[0m ${msg}`);
}

if (!KEY) {
  fail("缺少 ZAI_API_KEY。设置环境变量后重试，例如：\n  export ZAI_API_KEY=xxxxxxx.xxxxxxxxxxxx");
}
if (!/^https?:\/\/.+\/coding\/paas\/v4\/?$/.test(BASE.replace(/\/+$/, "") + "/")) {
  // 简单形式校验
  if (!BASE.includes("coding/paas/v4")) {
    fail(`ZAI_BASE_URL = ${BASE}\n端点必须包含 "coding/paas/v4"，否则计费走错套餐。`);
  }
}
ok(`KEY 已加载（长度 ${KEY.length}）`);
ok(`端点：${BASE}`);
ok(`模型：${MODEL}`);

const url = `${BASE.replace(/\/+$/, "")}/chat/completions`;
const body = {
  model: MODEL,
  messages: [{ role: "user", content: "用一句话介绍你自己，并以「准备就绪」结尾。" }],
  stream: true,
  max_tokens: 80,
};

info(`POST ${url}（streaming）...`);
const t0 = Date.now();

let resp;
try {
  resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
  });
} catch (e) {
  fail(`网络请求失败：${e.message}\n常见原因：代理把请求绕到墙外。clash 加 DOMAIN-SUFFIX,bigmodel.cn,DIRECT`);
}

if (!resp.ok) {
  let detail = "";
  try { detail = await resp.text(); } catch {}
  const hint = {
    401: "Key 错或漏字符（检查 ZAI_API_KEY 是否完整复制）",
    403: "未订阅 Coding Plan 或已过期",
    404: "端点错（检查 ZAI_BASE_URL 是否含 coding/paas/v4）",
    429: "限流（说明 Key 通了，等 1 分钟再试）",
  }[resp.status] || "未知错误";
  fail(`HTTP ${resp.status} ${resp.statusText}\n提示：${hint}\n响应：${detail.slice(0, 400)}`);
}

ok(`HTTP ${resp.status}（首字节 ${Date.now() - t0}ms）`);
process.stdout.write("\n回复：");

const decoder = new TextDecoder();
let buf = "";
let firstTokenAt = 0;
let totalChars = 0;

for await (const chunk of resp.body) {
  buf += decoder.decode(chunk, { stream: true });
  let idx;
  while ((idx = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (payload === "[DONE]") break;
    try {
      const obj = JSON.parse(payload);
      const delta = obj?.choices?.[0]?.delta?.content ?? "";
      if (delta) {
        if (!firstTokenAt) firstTokenAt = Date.now();
        process.stdout.write(delta);
        totalChars += delta.length;
      }
    } catch {
      // 偶发非 JSON 行，忽略
    }
  }
}

const elapsed = Date.now() - t0;
console.log("\n");
ok(`流式完成：共 ${totalChars} 字 / 总耗时 ${elapsed}ms / 首 token ${firstTokenAt ? firstTokenAt - t0 : -1}ms`);

if (totalChars === 0) {
  fail("未收到任何 token，可能模型没在 Coding Plan 套餐内或被限流。");
}

ok("OpenClaw 安装前置：GLM 链路通畅 ✅");
