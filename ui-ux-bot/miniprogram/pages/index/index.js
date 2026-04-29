// pages/index/index.js
const app = getApp()

Page({
  data: {},

  goChat(e) {
    const prompt = e.currentTarget.dataset.prompt || ''
    wx.navigateTo({
      url: `/pages/chat/chat?prompt=${encodeURIComponent(prompt)}`
    })
  }
})
