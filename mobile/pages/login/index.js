import { login } from '~/api/request';

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
      const res = await login({ username, password });
      console.log('登录返回数据：', res);
      if (res.code === 200 || res.code === 1) {
        // 存储token
        wx.setStorageSync('token', res.data.token);
        console.log('Token已保存');
        
        // 设置全局登录状态
        const app = getApp();
        app.globalData.isLoggedIn = true;
        
        wx.showToast({
          title: res.message || '登录成功',
          icon: 'success',
          duration: 1500
        });

        // 延迟跳转
        setTimeout(() => {
          // 获取页面栈
          const pages = getCurrentPages();
          if (pages.length > 1) {
            // 如果有上一页，返回上一页
            wx.navigateBack({
              delta: 1
            });
          } else {
            // 如果没有上一页，跳转到我的页面
            wx.switchTab({
              url: '/pages/mynotes/index'
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
      wx.showToast({
        title: res.message || '登录失败，请重试',
        icon: 'none'
      });
    }
  },
});
