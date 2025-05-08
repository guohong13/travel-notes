import request from '~/api/request';

Page({
  data: {
    isCheck: false,
    isSubmit: false,
    passwordInfo: {
      account: '',
      password: '',
    },
    radioValue: '',
  },

  /* 自定义功能函数 */
  changeSubmit() {
    if (this.data.passwordInfo.account !== '' && this.data.passwordInfo.password !== '' && this.data.isCheck) {
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
    this.setData({ passwordInfo: { ...this.data.passwordInfo, account: e.detail.value } });
    this.changeSubmit();
  },

  onPasswordChange(e) {
    this.setData({ passwordInfo: { ...this.data.passwordInfo, password: e.detail.value } });
    this.changeSubmit();
  },

  onRegister() {
    wx.navigateTo({
      url: '/pages/login/register/index'
    });
  },

  async login() {
    const res = await request('/login/postPasswordLogin', 'post', { data: this.data.passwordInfo });
    if (res.success) {
      await wx.setStorageSync('access_token', res.data.token);
      wx.switchTab({
        url: `/pages/my/index`,
      });
    }
  },
});
