import { userApi } from '~/api/request';

Page({
  data: {
    isCheck: false,
    isSubmit: false,
    passwordInfo: {
      username: '',
      password: '',
    },
    radioValue: '',
  },

  /* 校验信息是否输入完整 */
  changeSubmit() {
    if (this.data.passwordInfo.username !== '' && this.data.passwordInfo.password !== '' && this.data.isCheck) {
      this.setData({ isSubmit: true });
    } else {
      this.setData({ isSubmit: false });
    }
  },

  // 用户协议选择变更
  onCheckChange(e) {
    const { value } = e.detail;
    this.setData({
      radioValue: value,
      isCheck: value === 'agree',
    });
    this.changeSubmit();
  },

  onBackToHome() {
    wx.switchTab({
      url: '/pages/home/index',
    });
  },

  onAccountChange(e) {
    this.setData({ 
      passwordInfo: { 
        ...this.data.passwordInfo, 
        username: e.detail.value 
      } 
    });
    this.changeSubmit();
  },

  onPasswordChange(e) {
    this.setData({ 
      passwordInfo: { 
        ...this.data.passwordInfo, 
        password: e.detail.value 
      } 
    });
    this.changeSubmit();
  },

  onRegister() {
    wx.navigateTo({
      url: '/pages/login/register/index'
    });
  },

  async login() {
    const { username, password } = this.data.passwordInfo;
    
    // 表单验证
    if (!username || !password) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    if (!this.data.isCheck) {
      wx.showToast({
        title: '请同意用户协议',
        icon: 'none'
      });
      return;
    }

    try {
      const res = await userApi.login({ username, password });
      if (res.code === 1) {
        wx.setStorageSync('access_token', res.data.token);
        // 更新全局登录状态
        const app = getApp();
        app.globalData.isLoggedIn = true;
        app.globalData.token = res.data.token;
        
        wx.showToast({
          title: res.message || '登录成功',
          icon: 'success',
          duration: 1500
        });

        // 延迟跳转
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/mynotes/index',
          });
          
          // 通知上一个页面登录成功
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];
          if (prevPage && prevPage.route === 'pages/release/index') {
            const eventChannel = this.getOpenerEventChannel();
            eventChannel.emit('loginSuccess');
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
