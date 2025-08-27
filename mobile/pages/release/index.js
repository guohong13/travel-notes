import {
  notesApi
} from '~/api/request';

Page({
  data: {
    originFiles: [],
    gridConfig: {
      column: 4,
      width: 160,
      height: 160,
      style: {
        marginRight: '16rpx'
      }
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
    },
    hasVideo: false,
    location: null,
    address: '',
    locationName: '',
    title: '',
    content: '',
    tempVideoUrl: '',
    videoIndex: -1,
    draftSaved: false
  },

  resetFormData() {
    this.setData({
      originFiles: [],
      title: '',
      content: '',
      location: null,
      address: '',
      locationName: '',
      hasVideo: false,
      tempVideoUrl: '',
      videoIndex: -1,
      draftSaved: false
    });
  },

  onLoad() {
    this.resetFormData();
    this.loadDraft();
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

  validateData() {
    const {
      originFiles,
      title,
      content
    } = this.data;
    if (originFiles.filter(f => f.type === 'image').length === 0) {
      wx.showToast({
        title: '请至少上传一张图片',
        icon: 'none',
        duration: 1500
      });
      return false;
    }
    if (!title || title.trim() === '') {
      wx.showToast({
        title: '请输入游记标题',
        icon: 'none',
        duration: 1500
      });
      return false;
    }
    if (!content || content.trim() === '') {
      wx.showToast({
        title: '请输入游记内容',
        icon: 'none',
        duration: 1500
      });
      return false;
    }
    return true;
  },

  async generateVideoThumbnail(file) {
    return new Promise((resolve) => {
      const videoUrl = file.url || file.tempFilePath;
      this.setData({
        tempVideoUrl: videoUrl
      }, () => {
        setTimeout(() => {
          wx.getVideoInfo({
            src: videoUrl,
            success: (res) => resolve({
              ...file,
              thumb: res.thumbTempFilePath,
              thumbUrl: res.thumbTempFilePath,
              duration: res.duration,
              width: res.width,
              height: res.height
            }),
            fail: () => resolve({
              ...file,
              thumb: '',
              thumbUrl: '',
              duration: 0,
              width: 0,
              height: 0
            })
          });
        }, 100);
      });
    });
  },

  async processVideoFile(videoFile) {
    try {
      const filePath = videoFile.tempFilePath || videoFile.url;
      const isMov = String(filePath).toLowerCase().endsWith('.mov');
      const processedFile = isMov ? await this.generateVideoThumbnail(videoFile) : await this.generateVideoThumbnail(await this.compressVideo(videoFile));
      const newFile = {
        ...processedFile,
        type: 'video',
        status: 'done',
        name: (videoFile.tempFilePath || '').split('/').pop() || '视频文件',
        size: processedFile.size || videoFile.size || 0,
        url: processedFile.url || videoFile.tempFilePath,
        thumb: processedFile.thumb,
        thumbUrl: processedFile.thumb
      };
      const updatedFiles = [newFile, ...this.data.originFiles.filter(f => f.type !== 'video')];
      this.setData({
        originFiles: updatedFiles,
        hasVideo: true,
        tempVideoUrl: '',
        videoIndex: 0
      });
      wx.showToast({
        title: '视频上传成功',
        icon: 'success',
        duration: 2000
      });
    } catch (_) {
      wx.showToast({
        title: '处理视频失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  async compressVideo(file) {
    return new Promise((resolve) => {
      wx.compressVideo({
        src: file.tempFilePath || file.url,
        quality: 'medium',
        bitrate: 1000,
        fps: 30,
        resolution: 0.8,
        success: (res) => resolve({
          ...file,
          url: res.tempFilePath,
          size: res.size,
          compressed: true
        }),
        fail: () => resolve(file)
      });
    });
  },

  async handleSuccess(e) {
    const {
      files
    } = e.detail;
    const videoFiles = files.filter(file => file.type === 'video');
    const imageFiles = files.filter(file => file.type === 'image');

    if (videoFiles.length > 1) {
      wx.showToast({
        title: '只能上传一个视频',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    let processedVideo = null;
    if (videoFiles.length === 1 && !this.data.hasVideo) {
      const videoFile = videoFiles[0];
      const filePath = videoFile.url || videoFile.tempFilePath || '';
      const isMov = filePath.toLowerCase().endsWith('.mov');
      const isValid = isMov || filePath.toLowerCase().endsWith('.mp4') || filePath.toLowerCase().endsWith('.avi');
      if (!isValid) {
        wx.showToast({
          title: '仅支持mp4、avi和mov格式',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      try {
        processedVideo = isMov ? await this.generateVideoThumbnail(videoFile) : await this.generateVideoThumbnail(await this.compressVideo(videoFile));
        processedVideo = {
          ...processedVideo,
          type: 'video',
          status: 'done',
          name: videoFile.name || '视频文件',
          size: processedVideo.size || 0,
          url: processedVideo.url || videoFile.url,
          thumb: processedVideo.thumb,
          thumbUrl: processedVideo.thumb
        };
      } catch (_) {
        wx.showToast({
          title: '处理视频失败',
          icon: 'none'
        });
        return;
      }
    }

    const processedImages = imageFiles.map(file => ({
      ...file,
      type: 'image',
      status: 'done',
      name: file.name || '图片文件',
      size: file.size || 0,
      url: file.url,
      thumbUrl: file.url
    }));
    const newFiles = [processedVideo].filter(Boolean).concat(processedImages);
    this.setData({
      originFiles: newFiles,
      hasVideo: !!processedVideo,
      videoIndex: processedVideo ? 0 : -1
    });
  },

  handlePreview(e) {
    const {
      index
    } = e.detail;
    const {
      originFiles
    } = this.data;
    const file = originFiles[index];
    if (file.type === 'video') wx.navigateTo({
      url: `/pages/video-player/index?url=${encodeURIComponent(file.url)}`
    });
    else wx.previewImage({
      current: file.url,
      urls: originFiles.filter(f => f.type === 'image').map(f => f.url)
    });
  },

  handleRemove(e) {
    const {
      index
    } = e.detail;
    const {
      originFiles,
      videoIndex
    } = this.data;
    const removedFile = originFiles[index];
    if (removedFile.type === 'video') this.setData({
      hasVideo: false,
      videoIndex: -1
    });
    else if (index < videoIndex) this.setData({
      videoIndex: videoIndex - 1
    });
    originFiles.splice(index, 1);
    this.setData({
      originFiles
    });
  },

  getCurrentLocation() {
    wx.showLoading({
      title: '获取位置中...'
    });
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const {
          latitude,
          longitude
        } = res;
        this.setData({
          location: {
            latitude,
            longitude
          }
        });
        this.getAddressFromLocation(latitude, longitude);
      },
      fail: () => {
        wx.hideLoading();
        wx.showModal({
          title: '提示',
          content: '获取位置失败，是否手动选择位置？',
          confirmText: '去选择',
          success: (r) => {
            if (r.confirm) this.chooseLocation();
          }
        });
      }
    });
  },

  getAddressFromLocation(latitude, longitude) {
    wx.request({
      url: 'https://apis.map.qq.com/ws/geocoder/v1/',
      data: {
        location: `${latitude},${longitude}`,
        key: 'Q34BZ-OUU6U-QFVVN-GWUZ7-R3RST-ULB3Z',
        get_poi: 1
      },
      success: (res) => {
        if (res.data.status === 0) {
          const result = res.data.result;
          this.setData({
            address: result.address,
            locationName: result.formatted_addresses.recommend || result.address
          });
          wx.hideLoading();
          wx.showToast({
            title: '位置获取成功',
            icon: 'success',
            duration: 1500
          });
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '获取地址信息失败',
            icon: 'none',
            duration: 1500
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({
          title: '获取地址信息失败',
          icon: 'none',
          duration: 1500
        });
      }
    });
  },

  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        const {
          latitude,
          longitude,
          name,
          address
        } = res;
        this.setData({
          location: {
            latitude,
            longitude
          },
          address,
          locationName: name || address
        });
      },
      fail: () => {
        wx.showToast({
          title: '选择位置失败',
          icon: 'none',
          duration: 1000
        });
      }
    });
  },

  gotoMap() {
    wx.showActionSheet({
      itemList: ['获取当前位置', '在地图中选择'],
      success: (res) => {
        if (res.tapIndex === 0) this.getCurrentLocation();
        else if (res.tapIndex === 1) this.chooseLocation();
      }
    });
  },

  async release() {
    if (!this.validateData()) return;
    const token = wx.getStorageSync('access_token');
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 1500,
        success: () => setTimeout(() => wx.navigateTo({
          url: '/pages/login/index?from=release'
        }), 1500)
      });
      return;
    }
    const {
      title,
      content,
      originFiles,
      location,
      locationName,
      address
    } = this.data;
    try {
      wx.showLoading({
        title: '发布中...',
        mask: true
      });
      if (!originFiles || originFiles.length === 0) throw new Error('请选择要上传的文件');
      const validFiles = originFiles.map(file => ({
        ...file,
        tempFilePath: file.tempFilePath || file.url,
        thumb: file.thumb || undefined
      }));
      const publishRes = await notesApi.uploadFilesAndPublish({
        files: validFiles,
        title,
        content,
        token,
        location,
        locationName,
        address
      });
      wx.hideLoading();
      if (publishRes.code === 1) {
        wx.showToast({
          title: publishRes.message || '发布成功',
          icon: 'success',
          duration: 2000,
          success: () => {
            this.resetFormData();
            setTimeout(() => wx.switchTab({
              url: '/pages/home/index'
            }), 2000);
          }
        });
      } else {
        throw new Error(publishRes.message || '发布失败');
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '发布失败，请检查网络连接',
        icon: 'none',
        duration: 2000
      });
    }
  },

  onBackToHome() {
    const hasUnpublishedData = (this.data.title || this.data.content || (this.data.originFiles && this.data.originFiles.length > 0)) && !this.data.draftSaved;
    if (hasUnpublishedData) {
      wx.showModal({
        title: '草稿提醒',
        content: '您有未发布的内容，是否保存为草稿？',
        confirmText: '保存草稿',
        cancelText: '放弃草稿',
        success: (res) => {
          if (res.confirm) this.saveDraft();
          else {
            const userId = wx.getStorageSync('userId') || 'defaultUser';
            wx.removeStorageSync(`draft_${userId}`);
            this.resetFormData();
            wx.switchTab({
              url: '/pages/home/index'
            });
          }
        }
      });
    } else {
      this.resetFormData();
      wx.switchTab({
        url: '/pages/home/index'
      });
    }
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar && tabBar.setTabBarValue) tabBar.setTabBarValue('release');
    const token = wx.getStorageSync('access_token');
    if (!token) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再发布游记',
        confirmText: '去登录',
        cancelText: '返回首页',
        success: (res) => {
          if (res.confirm) wx.navigateTo({
            url: '/pages/login/index?from=release'
          });
          else wx.switchTab({
            url: '/pages/home/index'
          });
        }
      });
    }
  },

  saveDraft() {
    const draftData = {
      title: this.data.title,
      content: this.data.content,
      location: this.data.location,
      address: this.data.address,
      locationName: this.data.locationName,
      originFiles: this.data.originFiles.map(file => ({
        type: file.type,
        path: file.tempFilePath || file.url,
        name: file.name,
        size: file.size,
        duration: file.duration || 0,
        thumb: file.thumb
      })),
      saveTime: Date.now()
    };
    const userId = wx.getStorageSync('userId') || 'defaultUser';
    try {
      wx.setStorageSync(`draft_${userId}`, draftData);
      this.setData({
        draftSaved: true
      });
      wx.showToast({
        title: '草稿保存成功',
        icon: 'success',
        duration: 1500
      });
      setTimeout(() => wx.switchTab({
        url: '/pages/home/index'
      }), 1500);
    } catch (_) {
      wx.showToast({
        title: '草稿保存失败',
        icon: 'none',
        duration: 1500
      });
    }
  },

  loadDraft() {
    const userId = wx.getStorageSync('userId') || 'defaultUser';
    try {
      const draft = wx.getStorageSync(`draft_${userId}`);
      if (draft) {
        const files = draft.originFiles.map(file => ({
          ...file,
          status: 'done',
          tempFilePath: file.path,
          url: file.path,
          thumbUrl: file.thumb
        }));
        this.setData({
          title: draft.title,
          content: draft.content,
          originFiles: files,
          location: draft.location,
          address: draft.address,
          locationName: draft.locationName,
          hasVideo: files.some(f => f.type === 'video'),
          videoIndex: files.findIndex(f => f.type === 'video')
        });
      }
    } catch (_) {}
  }
});