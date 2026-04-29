// app.js
App({
  globalData: {
    sessionId: null
  },

  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        traceUser: true
      });
    }
  }
});
