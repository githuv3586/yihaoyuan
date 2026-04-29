// pages/chat/chat.js
const app = getApp()

// 简易 Markdown 转 rich-text
function md2html(text) {
  if (!text) return ''
  let html = text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<div style="background:#1E293B;color:#E2E8F0;padding:24rpx;border-radius:12rpx;font-size:24rpx;overflow-x:auto;margin:12rpx 0"><code>$2</code></div>')
    .replace(/`([^`]+)`/g, '<span style="background:#F1F5F9;padding:4rpx 8rpx;border-radius:4rpx;font-size:24rpx;color:#DC2626">$1</span>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<div style="padding-left:24rpx">• $1</div>')
    .replace(/^\d+\. (.+)$/gm, '<div style="padding-left:24rpx">$1</div>')
    .replace(/\|(.+)\|/g, '<div style="font-size:24rpx;color:#475569">$1</div>')
    .replace(/\n/g, '<br/>')
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
    const sessionId = `sid_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
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
      sessionId: `sid_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
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
