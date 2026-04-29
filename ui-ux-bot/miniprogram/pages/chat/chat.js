// pages/chat/chat.js
const app = getApp()

// 先转义 HTML 元字符，再做 Markdown 替换，避免 AI 输出含原始标签时
// 在 rich-text 中产生标签错乱或样式注入。
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 临时占位符，避免代码块内的内容被后续行内规则二次替换
const CODE_BLOCK_PLACEHOLDER = '\u0000CODE_BLOCK_'
const INLINE_CODE_PLACEHOLDER = '\u0000INLINE_CODE_'

function md2html(text) {
  if (!text) return ''
  const codeBlocks = []
  const inlineCodes = []

  let safe = String(text)
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      codeBlocks.push(code)
      return `${CODE_BLOCK_PLACEHOLDER}${codeBlocks.length - 1}\u0000`
    })
    .replace(/`([^`]+)`/g, (_, code) => {
      inlineCodes.push(code)
      return `${INLINE_CODE_PLACEHOLDER}${inlineCodes.length - 1}\u0000`
    })

  safe = escapeHtml(safe)

  let html = safe
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<div style="padding-left:24rpx">• $1</div>')
    .replace(/^\d+\. (.+)$/gm, '<div style="padding-left:24rpx">$1</div>')
    .replace(/\|(.+?)\|/g, '<div style="font-size:24rpx;color:#475569">$1</div>')
    .replace(/\n/g, '<br/>')

  html = html
    .replace(new RegExp(`${CODE_BLOCK_PLACEHOLDER}(\\d+)\u0000`, 'g'), (_, i) => {
      const code = escapeHtml(codeBlocks[Number(i)] || '')
      return `<div style="background:#1E293B;color:#E2E8F0;padding:24rpx;border-radius:12rpx;font-size:24rpx;overflow-x:auto;margin:12rpx 0"><code>${code}</code></div>`
    })
    .replace(new RegExp(`${INLINE_CODE_PLACEHOLDER}(\\d+)\u0000`, 'g'), (_, i) => {
      const code = escapeHtml(inlineCodes[Number(i)] || '')
      return `<span style="background:#F1F5F9;padding:4rpx 8rpx;border-radius:4rpx;font-size:24rpx;color:#DC2626">${code}</span>`
    })

  return html
}

Page({
  data: {
    messages: [],
    inputText: '',
    loading: false,
    scrollToId: '',
    sessionId: null
  },

  onLoad(options) {
    const sessionId = `sid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    this.setData({ sessionId })

    // 加载历史消息（如果有 sessionId 传入）
    if (options.sessionId) {
      this.setData({ sessionId: options.sessionId })
      this.loadHistory(options.sessionId)
    }

    if (options.prompt) {
      this.setData({ inputText: decodeURIComponent(options.prompt) })
      setTimeout(() => this.send(), 300)
    }
  },

  async loadHistory(sessionId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'ui-ux-bot',
        data: { action: 'history', sessionId }
      })
      if (res.result.code === 0) {
        const messages = res.result.data.messages.map(m => ({
          id: m._id,
          role: m.role,
          content: m.content,
          htmlContent: m.role === 'assistant' ? md2html(m.content) : ''
        }))
        this.setData({ messages })
      }
    } catch (e) { console.error(e) }
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value })
  },

  async send() {
    const text = this.data.inputText.trim()
    if (!text || this.data.loading) return

    const userMsg = { id: Date.now(), role: 'user', content: text }
    const messages = [...this.data.messages, userMsg]
    this.setData({
      messages,
      inputText: '',
      loading: true,
      scrollToId: `msg-${messages.length}`
    })

    try {
      const res = await wx.cloud.callFunction({
        name: 'ui-ux-bot',
        data: {
          action: 'chat',
          prompt: text,
          sessionId: this.data.sessionId
        }
      })

      const result = res.result || {}

      if (result.code === 0) {
        const aiMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: result.data.reply,
          htmlContent: md2html(result.data.reply)
        }
        this.setData({
          messages: [...this.data.messages, aiMsg],
          scrollToId: `msg-${this.data.messages.length}`
        })
      } else {
        wx.showToast({ title: result.message || '请求失败', icon: 'none' })
      }
    } catch (err) {
      console.error('调用云函数失败:', err)
      wx.showToast({ title: '网络错误，请重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async resetChat() {
    try {
      await wx.cloud.callFunction({
        name: 'ui-ux-bot',
        data: { action: 'reset', sessionId: this.data.sessionId }
      })
    } catch (e) { /* ignore */ }

    this.setData({
      messages: [],
      sessionId: `sid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    })
    wx.showToast({ title: '已开启新对话', icon: 'success' })
  },

  copyLast() {
    const msgs = this.data.messages.filter(m => m.role === 'assistant')
    if (msgs.length === 0) {
      wx.showToast({ title: '暂无回复', icon: 'none' })
      return
    }
    const last = msgs[msgs.length - 1]
    wx.setClipboardData({
      data: last.content,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    })
  },

  copyMsg(e) {
    const idx = e.currentTarget.dataset.index
    const msg = this.data.messages[idx]
    if (!msg) return
    wx.setClipboardData({
      data: msg.content,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    })
  },

  async saveDesign(e) {
    const idx = e.currentTarget.dataset.index
    const msg = this.data.messages[idx]
    if (!msg || msg.role !== 'assistant') return

    wx.showLoading({ title: '保存中...' })
    try {
      const res = await wx.cloud.callFunction({
        name: 'ui-ux-bot',
        data: {
          action: 'save_design',
          sessionId: this.data.sessionId,
          title: '设计系统 ' + new Date().toLocaleDateString('zh-CN'),
          rawReply: msg.content
        }
      })
      wx.hideLoading()
      if (res.result.code === 0) {
        wx.showToast({ title: '已保存到我的设计', icon: 'success' })
      }
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  }
})
