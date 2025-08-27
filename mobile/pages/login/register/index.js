import {
  userApi
} from '~/api/request';
import config from '../../../config';

Page({
  data: {
    avatarUrl: `${config.baseUrl}/uploads/user.jpg`, // 默认头像
    username: '',
    nickname: '',
    password: '',
    confirmPassword: ''
  },

  // 选择头像（修改后）
  async chooseAvatar() {
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });

      this.setData({
        avatarUrl: res.tempFilePaths[0] // 本地临时路径
      });
    } catch (_) {}
  },

  // 注册处理
  async handleRegister() {
    const {
      username,
      nickname,
      password,
      confirmPassword,
      avatarUrl
    } = this.data;

    if (!this.validateForm(username, nickname, password, confirmPassword)) return;

    try {
      const BASE = config.baseUrl;
      const isDefaultAvatar = avatarUrl.startsWith(`${BASE}/uploads/user.jpg`);

      if (isDefaultAvatar) {
        await this.registerWithoutAvatar(username, nickname, password);
      } else {
        await this.registerWithAvatar(username, nickname, password, avatarUrl);
      }

      wx.showToast({
        title: '注册成功',
        icon: 'success',
        success: () => {
          setTimeout(() => wx.navigateBack(), 1500);
        }
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '注册失败',
        icon: 'none'
      });
    }
  },

  // 表单验证
  validateForm(username, nickname, password, confirmPassword) {
    if (!username || !nickname || !password || !confirmPassword) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return false;
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: '密码不一致',
        icon: 'none'
      });
      return false;
    }

    if (password.length < 6) {
      wx.showToast({
        title: '密码不能少于6位',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  // 带头像注册
  registerWithAvatar(username, nickname, password, avatarPath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${config.baseUrl}/api/users/register`,
        filePath: avatarPath,
        name: 'avatar',
        formData: {
          username,
          nickname,
          password
        },
        success: (res) => {
          const result = JSON.parse(res.data);
          result.code === 1 ? resolve() : reject(new Error(result.message));
        },
        fail: (err) => reject(new Error('文件上传失败'))
      });
    });
  },

  // 无头像注册
  async registerWithoutAvatar(username, nickname, password) {
    const res = await userApi.register({
      username,
      nickname,
      password
    });

    if (res.code !== 1) {
      throw new Error(res.message || '注册失败');
    }
  }
});