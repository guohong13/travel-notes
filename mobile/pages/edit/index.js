import request from '~/api/request';
import {
  notesApi
} from '~/api/request';
// 路径处理函数
const processResourcePath = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  // 统一处理路径格式
  return `http://localhost:3300/${
    path.replace(/\\/g, '/')      // 替换反斜杠为正斜杠
       .replace(/^\/+/, '')       // 去除开头多余斜杠
       .replace(/\/+/g, '/')      // 合并连续斜杠
  }`;
};
Page({
  data: {
    id: null,
    title: '',
    content: '',
    location: '',
    images: [],
    hasVideo: false,
    tempVideoUrl: '',
    gridConfig: {
      column: 3,
      width: 200,
      height: 200
    },
    config: {
      count: 9,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      compressed: true,
      maxCount: 9,
      videoSize: 50,
      videoQuality: 'medium',
      sizeType: ['original', 'compressed'],
      extension: ['.mp4', '.avi', '.mov']
    }
  },

  onLoad(options) {
    if (options.data) {
      try {
        const editData = JSON.parse(decodeURIComponent(options.data));
        console.log('编辑数据:', editData);

        // 转换文件数据为images数组格式
        const images = [];

        // 处理视频
        if (editData.video_url) {
          images.push({
            url: processResourcePath(editData.video_url),
            type: 'video',
            status: 'done'
          });
        }

        // 处理图片
        if (editData.images && editData.images.length > 0) {
          editData.images.forEach(imgUrl => {
            images.push({
              url: imgUrl,
              type: 'image',
              status: 'done'
            });
          });
        }

        this.setData({
          id: editData.id,
          title: editData.title || '',
          content: editData.content || '',
          location: editData.location || '',
          images: images,
          hasVideo: !!editData.video_url
        });
      } catch (error) {
        console.error('解析编辑数据失败:', error);
        wx.showToast({
          title: '数据加载失败',
          icon: 'none'
        });
      }
    }
  },

  onTitleInput(e) {
    this.setData({
      title: e.detail.value
    });
  },

  onContentInput(e) {
    this.setData({
      content: e.detail.value
    });
  },

  onUploadSuccess(e) {
    const {
      files
    } = e.detail;

    // 检查是否有视频文件
    const videoFiles = files.filter(file => file.type === 'video');
    if (videoFiles.length > 0) {
      if (this.data.hasVideo) {
        // 如果已经有视频，询问是否替换
        wx.showModal({
          title: '提示',
          content: '已存在视频，是否替换？',
          success: (res) => {
            if (res.confirm) {
              // 用户确认替换
              const newFiles = files.filter(file => file.type === 'image');
              newFiles.unshift(videoFiles[0]); // 将视频放在最前面
              this.setData({
                images: newFiles,
                hasVideo: true
              });
            }
          }
        });
      } else {
        // 如果没有视频，直接添加
        const newFiles = files.filter(file => file.type === 'image');
        newFiles.unshift(videoFiles[0]); // 将视频放在最前面
        this.setData({
          images: newFiles,
          hasVideo: true
        });
      }
    } else {
      // 如果没有视频文件，直接更新图片
      this.setData({
        images: files
      });
    }
  },

  onUploadRemove(e) {
    const {
      index
    } = e.detail;
    const {
      images
    } = this.data;
    const removedFile = images[index];

    // 如果删除的是视频，更新视频状态
    if (removedFile.type === 'video') {
      this.setData({
        hasVideo: false
      });
    }

    images.splice(index, 1);
    this.setData({
      images
    });
  },

  onUploadClick(e) {
    const {
      index
    } = e.detail;
    const {
      images
    } = this.data;
    const file = images[index];

    if (file.type === 'video') {
      // 使用视频播放器预览视频
      wx.navigateTo({
        url: `/pages/video-player/index?url=${encodeURIComponent(file.url)}`
      });
    } else {
      // 图片预览
      wx.previewImage({
        current: file.url,
        urls: images.filter(f => f.type === 'image').map(f => f.url)
      });
    }
  },

  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          location: res.name || res.address
        });
      },
      fail: (err) => {
        console.error('选择位置失败:', err);
      }
    });
  },

  onBack() {
    wx.navigateBack();
  },

  onCancel() {
    wx.navigateBack();
  },

  async onSave() {
    const {
      id,
      title,
      content,
      location,
      images
    } = this.data;

    // 基础校验
    if (!title || !content || images.length === 0) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    // 登录检查
    const token = wx.getStorageSync('access_token');
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        success: () => {
          setTimeout(() => wx.navigateTo({
            url: '/pages/login/index'
          }), 1500);
        }
      });
      return;
    }

    try {
      wx.showLoading({
        title: '提交中...',
        mask: true
      });

      // 分离新旧文件：已存在的文件有 http 前缀
      const {
        existingFiles,
        newFiles
      } = images.reduce((acc, file) => {
        if (file.url.startsWith('http')) {
          acc.existingFiles.push({
            type: file.type,
            url: file.url.replace('http://localhost:3300/', '') // 去除基础路径
          });
        } else {
          acc.newFiles.push({
            type: file.type,
            tempFilePath: file.url,
            thumb: file.thumb
          });
        }
        return acc;
      }, {
        existingFiles: [],
        newFiles: []
      });

      // 上传新文件
      let uploadedFiles = [];
      if (newFiles.length > 0) {
        const uploadRes = await notesApi.uploadMediaFiles({
          files: newFiles,
          token
        });
        uploadedFiles = uploadRes.data.map(f => ({
          type: f.fileType,
          url: f.filePath
        }));
      }

      // 合并所有文件路径
      const allFiles = [...existingFiles, ...uploadedFiles];

      // 调用更新接口
      const updateRes = await notesApi.updateNote(id, {
        title,
        content,
        location,
        files: allFiles,
        token
      });

      wx.hideLoading();

      if (updateRes.code === 1) {
        wx.showToast({
          title: '更新成功',
          icon: 'success',
          success: () => {
            setTimeout(() => wx.navigateBack(), 1500);
          }
        });
      } else {
        throw new Error(updateRes.message || '更新失败');
      }
    } catch (error) {
      wx.hideLoading();
      console.error('保存失败:', error);

      // 处理过期 token
      if (error.message.includes('token')) {
        wx.showToast({
          title: '登录已过期',
          icon: 'none',
          success: () => {
            setTimeout(() => wx.navigateTo({
              url: '/pages/login/index'
            }), 1500);
          }
        });
      } else {
        wx.showToast({
          title: error.message || '保存失败',
          icon: 'none'
        });
      }
    }
  },
});