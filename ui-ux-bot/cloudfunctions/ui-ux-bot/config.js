/**
 * 云函数运行配置
 *
 * 说明：
 *   - 所有可调参数集中维护，避免散落在 index.js
 *   - 敏感信息（API Key）只能来自环境变量，禁止写入仓库
 */

const REQUIRED_ENV = ['GLM_API_KEY']
for (const k of REQUIRED_ENV) {
  if (!process.env[k]) {
    console.warn(`[ui-ux-bot] 警告：环境变量 ${k} 未配置，云函数将无法调用 GLM 接口`)
  }
}

module.exports = {
  // GLM Coding Plan 专用端点（通用端点会扣费/报余额不足）
  GLM_API: process.env.GLM_API || 'https://open.bigmodel.cn/api/coding/paas/v4/chat/completions',

  // 仅从环境变量注入；运行期为空字符串则在调用处直接拒绝
  GLM_KEY: process.env.GLM_API_KEY || '',

  // 模型名通过 env 覆盖，便于在控制台切换
  MODEL: process.env.GLM_MODEL || 'glm-4-plus',

  // 计费表（元/百万 token），按 prompt / completion 分别计算
  PRICING: {
    'glm-4-plus':   { in: 50, out: 50 },
    'glm-4-flash':  { in: 0,  out: 0  },
    'glm-4.5':      { in: 5,  out: 5  },
    'glm-4.6':      { in: 5,  out: 5  }
  },

  // 上下文窗口：保留最近 N 轮（user+assistant 各算一条）
  MAX_HISTORY: Number(process.env.MAX_HISTORY) || 20,

  // 单次 prompt 最大字符数（粗粒度防滥用）
  MAX_PROMPT_CHARS: Number(process.env.MAX_PROMPT_CHARS) || 4000,

  // 单用户每日最大调用次数
  DAILY_QUOTA_PER_USER: Number(process.env.DAILY_QUOTA_PER_USER) || 200,

  // GLM 请求参数
  TEMPERATURE: 0.7,
  MAX_TOKENS: 2048,
  REQUEST_TIMEOUT_MS: 50000
}
