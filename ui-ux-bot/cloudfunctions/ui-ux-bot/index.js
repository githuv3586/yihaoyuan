const cloud = require('wx-server-sdk')
const axios = require('axios')
const SYSTEM_PROMPT = require('./knowledge')
const SCHEMA = require('./schema')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// GLM-5.1 Coding Plan API 配置
// ⚠️ Coding Plan 必须使用 coding 专用端点，通用端点会扣费/报余额不足
const GLM_API = 'https://open.bigmodel.cn/api/coding/paas/v4/chat/completions'
const GLM_KEY = process.env.GLM_API_KEY || '5bc34d988520410aa432a5deda58af9d.qeHP0S1GtnrSGwet'
const MODEL = 'glm-5-turbo'
const MAX_HISTORY = 20 // 保留最近 20 轮

exports.main = async (event) => {
  const { action } = event
  const { OPENID } = cloud.getWXContext()

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

// ==================== 对话 ====================

async function handleChat(event, openid) {
  const { prompt, sessionId } = event
  if (!prompt) return { code: 400, message: '请输入设计需求' }

  const sid = sessionId || `sid_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  const startTime = Date.now()

  // 1. 获取或创建会话
  let session = await db.collection('chat_sessions')
    .where({ session_id: sid, openid })
    .get()

  if (session.data.length === 0) {
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
  }

  // 2. 从数据库加载历史消息（最近 N 轮）
  const historyDocs = await db.collection('chat_messages')
    .where({ session_id: sid, openid })
    .orderBy('created_at', 'desc')
    .limit(MAX_HISTORY)
    .get()

  const history = historyDocs.data
    .reverse()
    .map(m => ({ role: m.role, content: m.content }))

  // 3. 构建 GLM 请求
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: prompt }
  ]

  try {
    const resp = await axios.post(GLM_API, {
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2048
    }, {
      headers: {
        'Authorization': `Bearer ${GLM_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 50000
    })

    const reply = resp.data.choices?.[0]?.message?.content || '抱歉，未获取到设计建议'
    const usage = resp.data.usage || {}
    const latency = Date.now() - startTime

    // 4. 存储用户消息
    await db.collection('chat_messages').add({
      data: {
        session_id: sid,
        openid,
        role: 'user',
        content: prompt,
        tokens_used: 0,
        model: MODEL,
        created_at: db.serverDate()
      }
    })

    // 5. 存储 AI 消息
    await db.collection('chat_messages').add({
      data: {
        session_id: sid,
        openid,
        role: 'assistant',
        content: reply,
        tokens_used: usage.total_tokens || 0,
        model: MODEL,
        created_at: db.serverDate()
      }
    })

    // 6. 更新会话
    await db.collection('chat_sessions')
      .where({ session_id: sid, openid })
      .update({
        data: {
          msg_count: _.inc(2),
          last_msg_at: db.serverDate(),
          updated_at: db.serverDate()
        }
      })

    // 7. 记录 API 调用
    await db.collection('api_usage').add({
      data: {
        openid,
        api_name: MODEL,
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 0,
        cost_cny: ((usage.total_tokens || 0) / 1000000 * 5), // GLM-5-turbo 约5元/百万token
        latency_ms: latency,
        is_success: true,
        created_at: db.serverDate()
      }
    })

    // 8. 更新用户设计次数
    await db.collection('users')
      .where({ openid })
      .update({ data: { design_count: _.inc(1), last_login: db.serverDate() } })

    return {
      code: 0,
      data: { reply, sessionId: sid, usage, latency_ms: latency }
    }

  } catch (err) {
    const latency = Date.now() - startTime
    // 记录失败
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
        error_msg: err.response?.data?.error?.message || err.message,
        created_at: db.serverDate()
      }
    })

    console.error('GLM API 调用失败:', err.response?.data || err.message)
    return {
      code: 500,
      message: 'AI 服务暂时不可用，请稍后重试',
      error: err.response?.data?.error?.message || err.message
    }
  }
}

// ==================== 历史消息 ====================

async function handleHistory(event, openid) {
  const { sessionId, limit = 50 } = event

  const msgs = await db.collection('chat_messages')
    .where({ session_id: sessionId, openid })
    .orderBy('created_at', 'asc')
    .limit(limit)
    .get()

  return {
    code: 0,
    data: { messages: msgs.data }
  }
}

// ==================== 重置对话 ====================

async function handleReset(event, openid) {
  const { sessionId } = event

  if (sessionId) {
    await db.collection('chat_sessions')
      .where({ session_id: sessionId, openid })
      .update({ data: { status: 'archived', updated_at: db.serverDate() } })
  }

  return { code: 0, message: '对话已归档' }
}

// ==================== 设计系统收藏 ====================

async function handleSaveDesign(event, openid) {
  const { sessionId, title, industry, style, colors, typography, components, codeSnippets, rawReply } = event

  const doc = {
    openid,
    session_id: sessionId || '',
    title: title || '未命名设计系统',
    industry: industry || '',
    style: style || '',
    colors: colors || {},
    typography: typography || {},
    components: components || [],
    code_snippets: codeSnippets || [],
    raw_reply: rawReply || '',
    is_favorite: false,
    created_at: db.serverDate(),
    updated_at: db.serverDate()
  }

  const res = await db.collection('design_systems').add({ data: doc })

  return { code: 0, data: { _id: res._id } }
}

async function handleListDesigns(event, openid) {
  const { favoriteOnly = false, page = 1, pageSize = 20 } = event

  let query = { openid }
  if (favoriteOnly) query.is_favorite = true

  const total = (await db.collection('design_systems').where(query).count()).total
  const docs = await db.collection('design_systems')
    .where(query)
    .orderBy('created_at', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    code: 0,
    data: { list: docs.data, total, page, pageSize }
  }
}

async function handleDeleteDesign(event, openid) {
  const { designId } = event
  await db.collection('design_systems').doc(designId).remove()
  return { code: 0, message: '已删除' }
}

async function handleToggleFavorite(event, openid) {
  const { designId } = event
  const doc = await db.collection('design_systems').doc(designId).get()
  const newVal = !doc.data.is_favorite

  await db.collection('design_systems').doc(designId).update({
    data: { is_favorite: newVal, updated_at: db.serverDate() }
  })

  return { code: 0, data: { is_favorite: newVal } }
}

// ==================== 用量统计 ====================

async function handleUsage(event, openid) {
  const { days = 7 } = event
  const since = new Date(Date.now() - days * 24 * 3600 * 1000)

  const stats = await db.collection('api_usage')
    .where({ openid, created_at: _.gte(since) })
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
