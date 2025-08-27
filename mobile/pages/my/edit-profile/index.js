import {
  userApi
} from '~/api/request';
import {
  processResourcePath
} from '../../../utils/path';

Page({
  data: {
    loading: false,
    userInfo: {
      nickname: '',
      avatar: '',
      newPassword: '',
      confirmPassword: ''
    },
    originalUserInfo: {},
    hasChanges: false
  },

  onLoad() {
    this.loadUserInfo();
  },

  async loadUserInfo() {
    try {
      this.setData({
        loading: true
      });
      const res = await userApi.getProfile();
      if (res.code === 1 && res.data) {
        const u = res.data;
        const userInfo = {
          nickname: u.nickname || '',
          avatar: processResourcePath(u.avatar_url),
          newPassword: '',
          confirmPassword: ''
        };
        this.setData({
          userInfo,
          originalUserInfo: {
            ...userInfo
          }
        });
      }
    } catch (_) {
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  onNicknameInput(e) {
    this.setData({
      'userInfo.nickname': e.detail.value,
      hasChanges: this.checkHasChanges()
    });
  },
  onNewPasswordInput(e) {
    this.setData({
      'userInfo.newPassword': e.detail.value,
      hasChanges: this.checkHasChanges()
    });
  },
  onConfirmPasswordInput(e) {
    this.setData({
      'userInfo.confirmPassword': e.detail.value,
      hasChanges: this.checkHasChanges()
    });
  },

  onChooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          'userInfo.avatar': res.tempFilePaths[0],
          hasChanges: this.checkHasChanges()
        });
      }
    });
  },

  checkHasChanges() {
    const {
      userInfo,
      originalUserInfo
    } = this.data;
    return (
      userInfo.nickname !== originalUserInfo.nickname ||
      userInfo.avatar !== originalUserInfo.avatar ||
      !!userInfo.newPassword ||
      !!userInfo.confirmPassword
    );
  },

  async onSave() {
    if (!this.data.hasChanges) {
      wx.showToast({
        title: '没有修改内容',
        icon: 'none'
      });
      return;
    }

    if (!this.data.userInfo.nickname.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }

    if (this.data.userInfo.newPassword || this.data.userInfo.confirmPassword) {
      if (!this.data.userInfo.newPassword) {
        wx.showToast({
          title: '请输入新密码',
          icon: 'none'
        });
        return;
      }
      if (!this.data.userInfo.confirmPassword) {
        wx.showToast({
          title: '请确认新密码',
          icon: 'none'
        });
        return;
      }
      if (this.data.userInfo.newPassword !== this.data.userInfo.confirmPassword) {
        wx.showToast({
          title: '两次密码输入不一致',
          icon: 'none'
        });
        return;
      }
      if (this.data.userInfo.newPassword.length < 6) {
        wx.showToast({
          title: '密码长度不能少于6位',
          icon: 'none'
        });
        return;
      }
    }

    try {
      this.setData({
        loading: true
      });

      let avatarUrl = this.data.userInfo.avatar;
      if (avatarUrl && avatarUrl !== this.data.originalUserInfo.avatar) {
        const avatarRes = await userApi.uploadAvatar(avatarUrl);
        if (avatarRes.code !== 1) {
          wx.showToast({
            title: avatarRes.message || '头像上传失败',
            icon: 'none'
          });
          this.setData({
            loading: false
          });
          return;
        }
        avatarUrl = avatarRes.data.url;
      }

      const updateData = {
        nickname: this.data.userInfo.nickname
      };
      if (avatarUrl && avatarUrl !== this.data.originalUserInfo.avatar) {
        updateData.avatar_url = avatarUrl;
      }

      if (updateData.avatar_url || updateData.nickname !== this.data.originalUserInfo.nickname) {
        const profileRes = await userApi.updateProfile(updateData);
        if (profileRes.code !== 1) {
          throw new Error(profileRes.message || '更新资料失败');
        }
      }

      if (this.data.userInfo.newPassword) {
        const passwordRes = await userApi.changePassword({
          newPassword: this.data.userInfo.newPassword
        });
        if (passwordRes.code !== 1) {
          throw new Error(passwordRes.message || '修改密码失败');
        }
      }

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.userInfo = {
          ...app.globalData.userInfo,
          ...updateData
        };
      }
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (error) {
      wx.showToast({
        title: error.message || '保存失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  }
});