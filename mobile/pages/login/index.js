import {
  userApi
} from '~/api/request';

Page({
  data: {
    username: '',
    password: '',
    agreeProtocol: false,
    fromPage: ''
  },

  onLoad(options) {
    // 获取来源页面信息
    if (options.from) {
      this.setData({
        fromPage: options.from
      });
    }
  },

  // 用户协议选择变更
  onCheckChange(e) {
    const {
      value
    } = e.detail;
    this.setData({
      agreeProtocol: value === 'agree',
    });
  },

  onBackToHome() {
    wx.switchTab({
      url: '/pages/home/index',
    });
  },

  onAccountChange(e) {
    this.setData({
      username: e.detail.value
    });
  },

  onPasswordChange(e) {
    this.setData({
      password: e.detail.value
    });
  },

  onRegister() {
    wx.navigateTo({
      url: '/pages/login/register/index'
    });
  },

  async login() {
    const {
      username,
      password
    } = this.data;

    // 表单验证
    if (!username || !password) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    if (!this.data.agreeProtocol) {
      wx.showToast({
        title: '请同意用户协议',
        icon: 'none'
      });
      return;
    }

    try {
      const res = await userApi.login({
        username,
        password
      });
      if (res.code === 1) {
        wx.setStorageSync('access_token', res.data.token);
        // 更新全局登录状态
        const app = getApp();
        app.globalData.isLoggedIn = true;
        app.globalData.token = res.data.token;
        // 登录后初始化全局 WebSocket
        if (app.initWebSocket) {
          app.initWebSocket(res.data.token);
        }

        // 获取用户信息并存储
        try {
          const userRes = await userApi.getProfile();
          if (userRes.code === 1) {
            wx.setStorageSync('userInfo', userRes.data);
            app.globalData.userInfo = userRes.data;
          }
        } catch (userError) {
          console.error('获取用户信息失败：', userError);
        }

        wx.showToast({
          title: res.message || '登录成功',
          icon: 'success',
          duration: 1500
        });

        setTimeout(() => {
          // 获取来源页面信息
          const fromPage = this.data.fromPage;
          // 根据来源页面决定跳转目标
          if (fromPage === 'my') {
            wx.reLaunch({
              url: '/pages/my/index'
            });
          } else if (fromPage === 'release') {
            wx.reLaunch({
              url: '/pages/release/index'
            });
          } else if (fromPage === 'message') {
            wx.reLaunch({
              url: '/pages/message/index'
            });
          } else if (fromPage === 'mynotes') {
            wx.navigateBack();
          } else {
            wx.reLaunch({
              url: '/pages/home/index'
            });
          }
        }, 1500);
      } else {
        wx.showToast({
          title: res.message || '登录失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('登录失败：', error);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
    }
  },
});