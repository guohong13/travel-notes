import { register } from '~/api/request';

const app = getApp()

Page({
  data: {
    avatarUrl: '',
    username: '',
    nickname: '',
    password: '',
    confirmPassword: '',
    isSubmit: false
  },

  onLoad() {
    // 设置默认头像
    this.setData({
      avatarUrl: '/static/avatar1.png'
    })
  },

  // 选择头像
  async chooseAvatar() {
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      
      this.setData({
        avatarUrl: res.tempFilePaths[0]
      })
    } catch (error) {
      console.error('选择头像失败：', error)
    }
  },

  // 处理注册
  async handleRegister() {
    const { username, nickname, password, confirmPassword, avatarUrl } = this.data

    // 表单验证
    if (!username || !nickname || !password || !confirmPassword) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      })
      return
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次输入的密码不一致',
        icon: 'none'
      })
      return
    }

    if (password.length < 6) {
      wx.showToast({
        title: '密码长度不能少于6位',
        icon: 'none'
      })
      return
    }

    try {
      // 注册用户
      const res = await register({
        username,
        nickname,
        password,
        avatar_url: avatarUrl
      })

      if (res.code === 1) {
        wx.showToast({
          title: res.message || '注册成功',
          icon: 'success'
        })
        
        // 延迟返回登录页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: res.message || '注册失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('注册失败：', error)
      wx.showToast({
        title: '注册失败，请重试',
        icon: 'none'
      })
    }
  }
}) 