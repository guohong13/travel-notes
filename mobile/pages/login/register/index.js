const app = getApp()

Page({
  data: {
    avatarUrl: '',
    username: '',
    nickname: '',
    password: '',
    confirmPassword: ''
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

    try {
      // 检查用户名是否已存在
      const checkUsernameRes = await wx.cloud.callFunction({
        name: 'checkUsername',
        data: { username }
      })

      if (checkUsernameRes.result.exists) {
        wx.showToast({
          title: '用户名已存在',
          icon: 'none'
        })
        return
      }

      // 检查昵称是否已存在
      const checkNicknameRes = await wx.cloud.callFunction({
        name: 'checkNickname',
        data: { nickname }
      })

      if (checkNicknameRes.result.exists) {
        wx.showToast({
          title: '昵称已被使用',
          icon: 'none'
        })
        return
      }

      // 上传头像到云存储
      let avatarFileID = ''
      if (avatarUrl !== '/static/images/default-avatar.png') {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}-${Math.random().toString(36).substr(2)}.${avatarUrl.match(/\.(\w+)$/)[1]}`,
          filePath: avatarUrl
        })
        avatarFileID = uploadRes.fileID
      }

      // 注册用户
      const registerRes = await wx.cloud.callFunction({
        name: 'register',
        data: {
          username,
          nickname,
          password,
          avatarUrl: avatarFileID || '/static/images/default-avatar.png'
        }
      })

      if (registerRes.result.success) {
        wx.showToast({
          title: '注册成功',
          icon: 'success'
        })
        
        // 延迟返回登录页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        throw new Error('注册失败')
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