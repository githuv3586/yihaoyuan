// pages/designs/designs.js
Page({
  data: {
    list: [],
    filter: 'all',
    loading: false,
    page: 1
  },

  onShow() {
    this.loadDesigns()
  },

  async loadDesigns() {
    this.setData({ loading: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'ui-ux-bot',
        data: {
          action: 'list_designs',
          favoriteOnly: this.data.filter === 'favorite',
          page: 1,
          pageSize: 50
        }
      })
      const result = res.result || {}
      if (result.code === 0) {
        const list = result.data.list.map(item => ({
          ...item,
          created_at_str: item.created_at
            ? new Date(item.created_at).toLocaleDateString('zh-CN')
            : ''
        }))
        this.setData({ list })
      }
    } catch (e) {
      console.error(e)
    } finally {
      this.setData({ loading: false })
    }
  },

  setFilter(e) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ filter })
    this.loadDesigns()
  },

  async toggleFav(e) {
    const { id, index } = e.currentTarget.dataset
    try {
      const res = await wx.cloud.callFunction({
        name: 'ui-ux-bot',
        data: { action: 'toggle_favorite', designId: id }
      })
      if (res.result.code === 0) {
        const key = `list[${index}].is_favorite`
        this.setData({ [key]: res.result.data.is_favorite })
      }
    } catch (e) {
      console.error(e)
    }
  },

  viewDetail(e) {
    const item = this.data.list[e.currentTarget.dataset.index]
    // 复制原始回复到剪贴板
    wx.setClipboardData({
      data: item.raw_reply || item.title,
      success: () => wx.showToast({ title: '设计内容已复制', icon: 'success' })
    })
  }
})
