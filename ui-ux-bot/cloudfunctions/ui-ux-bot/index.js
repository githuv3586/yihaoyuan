const cloud = require('wx-server-sdk')
const axios = require('axios')
const SYSTEM_PROMPT = require('./knowledge')
const CONFIG = require('./config')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const {
  GLM_API,
  GLM_KEY,
  MODEL,
  PRICING,
  MAX_HISTORY,
  MAX_PROMPT_CHARS,
  DAILY_QUOTA_PER_USER,
  TEMPERATURE,
  MAX_TOKENS,
  REQUEST_TIMEOUT_MS
} = CONFIG

exports.main = async (event) => {
  const { action } = event
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) return { code: 401, message: '未授权调用' }

  switch (action) {
    case 'chat':
      return await handleChat(event, OPENID)
    case 'history':
      return await handleHistory(event, OPENID)
    case 'reset':
      return await handleReset(event, OPENID)
    case 'save_design':
      return await handleSaveDesign(event, OPENID)
    case 'list_designs':
      return await handleListDesigns(event, OPENID)
    case 'delete_design':
      return await handleDeleteDesign(event, OPENID)
    case 'toggle_favorite':
      return await handleToggleFavorite(event, OPENID)
    case 'usage':
      return await handleUsage(event, OPENID)
    default:
      return { code: 400, message: '未知操作' }
  }
}

// ==================== 工具函数 ====================

// 计算费用（元）。prompt / completion 分开计价。
function calcCost(model, promptTokens, completionTokens) {
  const p = PRICING[model] || { in: 5, out: 5 }
  return ((promptTokens || 0) * p.in + (completionTokens || 0) * p.out) / 1_000_000
}

// 确保 users 集合中存在当前用户记录，不存在则插入。
async function ensureUser(openid) {
  const { total } = await db.collection('users').where({ openid }).count()
  if (total > 0) return

  try {
    await db.collection('users').add({
      data: {
        openid,
        nickname: '',
        avatar_url: '',
        role: 'user',
        status: 1,
        design_count: 0,
        created_at: db.serverDate(),
        updated_at: db.serverDate(),
        last_login: db.serverDate()
      }
    })
  } catch (e) {
    // 唯一索引并发场景下忽略冲突
    if (!String(e.message || '').includes('duplicate')) {
      console.error('ensureUser 失败:', e)
    }
  }
}

// 检查当日调用配额；超出则返回 false。
async function checkQuota(openid) {
  if (!DAILY_QUOTA_PER_USER) return true
  const since = new Date()
  since.setHours(0, 0, 0, 0)

  const { total } = await db.collection('api_usage')
    .where({ openid, created_at: _.gte(since), is_success: true })
    .count()
  return total < DAILY_QUOTA_PER_USER
}

// ==================== 对话 ====================

async function handleChat(event, openid) {
  if (!GLM_KEY) {
    return { code: 500, message: 'AI 服务未配置（GLM_API_KEY 缺失）' }
  }

  let { prompt, sessionId } = event
  if (!prompt || typeof prompt !== 'string') return { code: 400, message: '请输入设计需求' }

  prompt = prompt.trim()
  if (!prompt) return { code: 400, message: '请输入设计需求' }
  if (prompt.length > MAX_PROMPT_CHARS) {
    prompt = prompt.slice(0, MAX_PROMPT_CHARS)
  }

  if (!(await checkQuota(openid))) {
    return { code: 429, message: '今日调用次数已达上限，请明天再试' }
  }

  const sid = sessionId || `sid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const startTime = Date.now()

  await ensureUser(openid)

  // 获取或创建会话
  const sessionQuery = await db.collection('chat_sessions')
    .where({ session_id: sid, openid })
    .get()

  if (sessionQuery.data.length === 0) {
    try {
      await db.collection('chat_sessions').add({
        data: {
          session_id: sid,
          openid,
          title: prompt.slice(0, 30),
          status: 'active',
          msg_count: 0,
          last_msg_at: db.serverDate(),
          created_at: db.serverDate(),
          updated_at: db.serverDate()
        }
      })
    } catch (e) {
      // session_id_unique 索引并发兜底
      if (!String(e.message || '').includes('duplicate')) throw e
    }
  }

  // 加载最近历史消息：先按 desc 取最新 N 条，再 reverse 得到正序
  const historyDocs = await db.collection('chat_messages')
    .where({ session_id: sid, openid })
    .orderBy('created_at', 'desc')
    .limit(MAX_HISTORY)
    .get()

  const history = historyDocs.data
    .reverse()
    .map(m => ({ role: m.role, content: m.content }))

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: prompt }
  ]

  let resp
  try {
    resp = await axios.post(GLM_API, {
      model: MODEL,
      messages,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS
    }, {
      headers: {
        'Authorization': `Bearer ${GLM_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: REQUEST_TIMEOUT_MS
    })
  } catch (err) {
    const latency = Date.now() - startTime
    // 失败也写一条用量日志，便于追溯
    await db.collection('api_usage').add({
      data: {
        openid,
        api_name: MODEL,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        cost_cny: 0,
        latency_ms: latency,
        is_success: false,
        error_msg: (err.response && err.response.data && err.response.data.error && err.response.data.error.message) || err.message,
        created_at: db.serverDate()
      }
    }).catch(e => console.error('写入失败日志失败:', e))

    console.error('GLM API 调用失败:', (err.response && err.response.data) || err.message)
    return {
      code: 500,
      message: 'AI 服务暂时不可用，请稍后重试'
    }
  }

  const reply = (resp.data.choices && resp.data.choices[0] && resp.data.choices[0].message && resp.data.choices[0].message.content) || '抱歉，未获取到设计建议'
  const usage = resp.data.usage || {}
  const latency = Date.now() - startTime

  // 写库失败不影响给用户的回复，因此用 Promise.allSettled 兜底
  const writeOps = [
    db.collection('chat_messages').add({
      data: {
        session_id: sid,
        openid,
        role: 'user',
        content: prompt,
        tokens_used: usage.prompt_tokens || 0,
        model: MODEL,
        created_at: db.serverDate()
      }
    }),
    db.collection('chat_messages').add({
      data: {
        session_id: sid,
        openid,
        role: 'assistant',
        content: reply,
        tokens_used: usage.completion_tokens || 0,
        model: MODEL,
        created_at: db.serverDate()
      }
    }),
    db.collection('chat_sessions')
      .where({ session_id: sid, openid })
      .update({
        data: {
          msg_count: _.inc(2),
          last_msg_at: db.serverDate(),
          updated_at: db.serverDate()
        }
      }),
    db.collection('api_usage').add({
      data: {
        openid,
        api_name: MODEL,
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 0,
        cost_cny: calcCost(MODEL, usage.prompt_tokens, usage.completion_tokens),
        latency_ms: latency,
        is_success: true,
        created_at: db.serverDate()
      }
    }),
    db.collection('users')
      .where({ openid })
      .update({ data: { design_count: _.inc(1), last_login: db.serverDate(), updated_at: db.serverDate() } })
  ]

  const results = await Promise.allSettled(writeOps)
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`持久化第 ${i} 步失败:`, r.reason)
  })

  return {
    code: 0,
    data: { reply, sessionId: sid, usage, latency_ms: latency }
  }
}

// ==================== 历史消息 ====================

async function handleHistory(event, openid) {
  const { sessionId, limit = 50, beforeId } = event
  if (!sessionId) return { code: 400, message: '缺少 sessionId' }

  const cap = Math.min(Number(limit) || 50, 100)
  const where = { session_id: sessionId, openid }

  let query = db.collection('chat_messages').where(where).orderBy('created_at', 'desc')
  if (beforeId) {
    try {
      const cursor = await db.collection('chat_messages').doc(beforeId).get()
      if (cursor.data && cursor.data.openid === openid) {
        query = db.collection('chat_messages')
          .where(Object.assign({}, where, { created_at: _.lt(cursor.data.created_at) }))
          .orderBy('created_at', 'desc')
      }
    } catch (e) { /* ignore invalid cursor */ }
  }

  const msgs = await query.limit(cap).get()
  return {
    code: 0,
    data: { messages: msgs.data.reverse() }
  }
}

// ==================== 重置对话 ====================

async function handleReset(event, openid) {
  const { sessionId } = event
  if (!sessionId) return { code: 0, message: '无会话可重置' }

  await db.collection('chat_sessions')
    .where({ session_id: sessionId, openid })
    .update({ data: { status: 'archived', updated_at: db.serverDate() } })

  return { code: 0, message: '对话已归档' }
}

// ==================== 设计系统收藏 ====================

async function handleSaveDesign(event, openid) {
  const { sessionId, title, industry, style, colors, typography, components, codeSnippets, rawReply } = event

  const doc = {
    openid,
    session_id: sessionId || '',
    title: (title || '').slice(0, 80) || '未命名设计系统',
    industry: (industry || '').slice(0, 32),
    style: (style || '').slice(0, 32),
    colors: colors || {},
    typography: typography || {},
    components: components || [],
    code_snippets: codeSnippets || [],
    raw_reply: (rawReply || '').slice(0, 20000),
    is_favorite: false,
    created_at: db.serverDate(),
    updated_at: db.serverDate()
  }

  const res = await db.collection('design_systems').add({ data: doc })
  return { code: 0, data: { _id: res._id } }
}

async function handleListDesigns(event, openid) {
  const { favoriteOnly = false, page = 1, pageSize = 20 } = event
  const cap = Math.min(Number(pageSize) || 20, 50)
  const p = Math.max(Number(page) || 1, 1)

  const query = { openid }
  if (favoriteOnly) query.is_favorite = true

  // 仅在第 1 页计 total，避免大表反复 count
  const total = p === 1
    ? (await db.collection('design_systems').where(query).count()).total
    : undefined

  const docs = await db.collection('design_systems')
    .where(query)
    .orderBy('created_at', 'desc')
    .skip((p - 1) * cap)
    .limit(cap)
    .get()

  return {
    code: 0,
    data: { list: docs.data, total, page: p, pageSize: cap }
  }
}

// 校验 designId 归当前 openid 所有，防止越权操作
async function assertDesignOwnership(designId, openid) {
  if (!designId) return { ok: false, code: 400, message: '缺少 designId' }
  let doc
  try {
    doc = await db.collection('design_systems').doc(designId).get()
  } catch (e) {
    return { ok: false, code: 404, message: '设计不存在' }
  }
  if (!doc.data || doc.data.openid !== openid) {
    return { ok: false, code: 403, message: '无权操作该设计' }
  }
  return { ok: true, doc: doc.data }
}

async function handleDeleteDesign(event, openid) {
  const { designId } = event
  const guard = await assertDesignOwnership(designId, openid)
  if (!guard.ok) return guard

  await db.collection('design_systems').doc(designId).remove()
  return { code: 0, message: '已删除' }
}

async function handleToggleFavorite(event, openid) {
  const { designId } = event
  const guard = await assertDesignOwnership(designId, openid)
  if (!guard.ok) return guard

  const newVal = !guard.doc.is_favorite
  await db.collection('design_systems').doc(designId).update({
    data: { is_favorite: newVal, updated_at: db.serverDate() }
  })
  return { code: 0, data: { is_favorite: newVal } }
}

// ==================== 用量统计 ====================

async function handleUsage(event, openid) {
  const days = Math.max(Math.min(Number(event.days) || 7, 90), 1)
  const since = new Date(Date.now() - days * 24 * 3600 * 1000)

  const stats = await db.collection('api_usage')
    .where({ openid, created_at: _.gte(since) })
    .limit(1000)
    .get()

  const total_calls = stats.data.length
  const success_calls = stats.data.filter(s => s.is_success).length
  const total_tokens = stats.data.reduce((sum, s) => sum + (s.total_tokens || 0), 0)
  const total_cost = stats.data.reduce((sum, s) => sum + (s.cost_cny || 0), 0)
  const avg_latency = total_calls > 0
    ? Math.round(stats.data.reduce((sum, s) => sum + (s.latency_ms || 0), 0) / total_calls)
    : 0

  return {
    code: 0,
    data: {
      days,
      total_calls,
      success_calls,
      fail_calls: total_calls - success_calls,
      total_tokens,
      total_cost: total_cost.toFixed(4),
      avg_latency_ms: avg_latency
    }
  }
}
