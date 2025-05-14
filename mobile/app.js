// app.js
import config from './config';

App({
  onLaunch() {
    // 检查更新
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      updateManager.onCheckForUpdate(function (res) {
        if (res.hasUpdate) {
          updateManager.onUpdateReady(function () {
            wx.showModal({
              title: '更新提示',
              content: '新版本已经准备好，是否重启应用？',
              success: function (res) {
                if (res.confirm) {
                  updateManager.applyUpdate();
                }
              }
            });
          });
          updateManager.onUpdateFailed(function () {
            wx.showModal({
              title: '已经有新版本了哟~',
              content: '新版本已经上线啦~，请您删除当前小程序，重新搜索打开哟~'
            });
          });
        }
      });
    }
    // 检查登录状态
    const token = wx.getStorageSync('access_token');
    if (token) {
      this.globalData.isLoggedIn = true;
    }
  },

  globalData: {
    userInfo: null,
    isLoggedIn: false,
    token: null,
  }
});



