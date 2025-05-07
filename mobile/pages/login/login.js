import request from '~/api/request';

Page({
  data: {
    phoneNumber: '',
    isPhoneNumber: false,
    isCheck: false,
    isSubmit: false,
    isPasswordLogin: false,
    passwordInfo: {
      account: '',
      password: '',
    },
    radioValue: '',
  },

  /* 自定义功能函数 */
  changeSubmit() {
    if (this.data.isPasswordLogin) {
      if (this.data.passwordInfo.account !== '' && this.data.passwordInfo.password !== '' && this.data.isCheck) {
        this.setData({ isSubmit: true });
      } else {
        this.setData({ isSubmit: false });
      }
    } else if (this.data.isPhoneNumber && this.data.isCheck) {
      this.setData({ isSubmit: true });
    } else {
      this.setData({ isSubmit: false });
    }
  },

  // 手机号变更
  onPhoneInput(e) {
    const isPhoneNumber = /^[1][3,4,5,7,8,9][0-9]{9}$/.test(e.detail.value);
    this.setData({
      isPhoneNumber,
      phoneNumber: e.detail.value,
    });
    this.changeSubmit();
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
      url: '/pages/home/index', // 替换为你的首页路径
    });
  },

  onAccountChange(e) {
    this.setData({ passwordInfo: { ...this.data.passwordInfo, account: e.detail.value } });
    this.changeSubmit();
  },

  onPasswordChange(e) {
    this.setData({ passwordInfo: { ...this.data.passwordInfo, password: e.detail.value } });
    this.changeSubmit();
  },

  // 切换登录方式
  changeLogin() {
    this.setData({ isPasswordLogin: !this.data.isPasswordLogin, isSubmit: false });
  },

  onWechatLogin() {
    wx.login({
      success: (res) => {
        if (res.code) {
          // 获取到临时登录凭证 code，将 code 发送到后端服务器
          wx.request({
            url: 'https://your-api-url.com/login/wechat', // 替换为实际的后端登录接口地址
            method: 'POST',
            data: {
              code: res.code
            },
            success: (response) => {
              if (response.data.code === 200) {
                // 登录成功，处理登录成功逻辑，如存储用户信息、跳转到首页等
                console.log('微信登录成功：', response.data.data);
                wx.showToast({
                  title: '登录成功',
                  icon: 'success'
                });
                // 跳转到首页
                wx.switchTab({
                  url: '/pages/index/index'
                });
              } else {
                // 登录失败，处理登录失败逻辑
                console.error('微信登录失败：', response.data.message);
                wx.showToast({
                  title: '登录失败，请稍后重试',
                  icon: 'none'
                });
              }
            },
            fail: (err) => {
              console.error('请求后端接口失败：', err);
              wx.showToast({
                title: '网络请求失败，请稍后重试',
                icon: 'none'
              });
            }
          });
        } else {
          console.error('获取临时登录凭证失败：', res.errMsg);
          wx.showToast({
            title: '获取登录凭证失败，请稍后重试',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('调用 wx.login 失败：', err);
        wx.showToast({
          title: '登录失败，请稍后重试',
          icon: 'none'
        });
      }
    });
  },
  async login() {
    if (this.data.isPasswordLogin) {
      const res = await request('/login/postPasswordLogin', 'post', { data: this.data.passwordInfo });
      if (res.success) {
        await wx.setStorageSync('access_token', res.data.token);
        wx.switchTab({
          url: `/pages/my/index`,
        });
      }
    } else {
      const res = await request('/login/getSendMessage', 'get');
      if (res.success) {
        wx.navigateTo({
          url: `/pages/loginCode/loginCode?phoneNumber=${this.data.phoneNumber}`,
        });
      }
    }
  },
});
