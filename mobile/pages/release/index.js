import {
  notesApi
} from '\~/api/request';

Page({
  /**
   * 页面的初始数据
   */
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
    draftSaved: false,
  },

  // 重置表单数据
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
      draftSaved: false,
    });
  },

  // 初始化
  onLoad() {
    this.resetFormData();
    this.loadDraft(); // 加载草稿
  },

  // 监听标题输入
  onTitleInput(e) {
    this.setData({
      title: e.detail.value
    });
  },

  // 监听内容输入
  onContentInput(e) {
    this.setData({
      content: e.detail.value
    });
  },

  // 校验数据
  validateData() {
    const {
      originFiles,
      title,
      content
    } = this.data;

    console.log('校验数据：', {
      originFiles,
      title,
      content
    });

    // 检查是否上传了图片或视频
    if (originFiles.filter(f => f.type === 'image').length === 0) {
      wx.showToast({
        title: '请至少上传一张图片',
        icon: 'none',
        duration: 1500
      });
      return false;
    }

    // 检查标题是否填写
    if (!title || title.trim() === '') {
      wx.showToast({
        title: '请输入游记标题',
        icon: 'none',
        duration: 1500
      });
      return false;
    }

    // 检查内容是否填写
    if (!content || content.trim() === '') {
      wx.showToast({
        title: '请输入游记内容',
        icon: 'none',
        duration: 1500
      });
      return false;
    }

    // 所有检查都通过
    return true;
  },
  // 生成视频缩略图
  async generateVideoThumbnail(file) {
    return new Promise((resolve, reject) => {
      // 创建一个临时的video标签来获取视频信息
      const videoUrl = file.url || file.tempFilePath;

      // 设置视频源
      this.setData({
        tempVideoUrl: videoUrl
      }, () => {
        // 等待视频加载
        setTimeout(() => {
          // 获取视频信息
          wx.getVideoInfo({
            src: videoUrl,
            success: (res) => {
              resolve({
                ...file,
                thumb: res.thumbTempFilePath,
                thumbUrl: res.thumbTempFilePath,
                duration: res.duration,
                width: res.width,
                height: res.height
              });
            },
            fail: (err) => {
              console.log("获取视频信息失败", err);
              resolve({
                ...file,
                thumb: '',
                thumbUrl: '',
                duration: 0,
                width: 0,
                height: 0
              });
            }
          });
        }, 100);
      });
    });
  },

  // 处理视频文件
  async processVideoFile(videoFile) {
    try {
      // 检查文件格式
      const filePath = videoFile.tempFilePath || videoFile.url;
      const isMov = filePath.toLowerCase().endsWith('.mov');

      let processedFile;
      if (isMov) {
        // 对于MOV格式，直接使用原文件，不进行压缩
        processedFile = await this.generateVideoThumbnail(videoFile);
      } else {
        // 对于其他格式，进行压缩
        const compressedFile = await this.compressVideo(videoFile);
        processedFile = await this.generateVideoThumbnail(compressedFile);
      }

      const newFile = {
        ...processedFile,
        type: 'video',
        status: 'done',
        name: videoFile.tempFilePath.split('/').pop() || '视频文件',
        size: processedFile.size || videoFile.size || 0,
        url: processedFile.url || videoFile.tempFilePath,
        thumb: processedFile.thumb,
        thumbUrl: processedFile.thumb
      };

      // 更新文件列表，确保视频文件始终作为第一个元素
      const updatedFiles = [newFile, ...this.data.originFiles.filter(f => f.type !== 'video')];

      this.setData({
        originFiles: updatedFiles,
        hasVideo: true,
        tempVideoUrl: '', // 清除临时视频URL
        videoIndex: 0 // 视频始终在第一个位置
      });

      wx.showToast({
        title: '视频上传成功',
        icon: 'success',
        duration: 2000
      });
    } catch (error) {
      console.error('处理视频失败：', error);
      wx.showToast({
        title: '处理视频失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 压缩视频文件
  async compressVideo(file) {
    return new Promise((resolve, reject) => {
      wx.compressVideo({
        src: file.tempFilePath || file.url,
        quality: 'medium',
        bitrate: 1000,
        fps: 30,
        resolution: 0.8,
        success: (res) => {
          resolve({
            ...file,
            url: res.tempFilePath,
            size: res.size,
            compressed: true
          });
        },
        fail: (err) => {
          resolve(file); // 压缩失败时返回原文件
        }
      });
    });
  },

  async handleSuccess(e) {
    const {
      files
    } = e.detail;
    const {
      originFiles,
      hasVideo
    } = this.data;
    // console.log('上传的文件：', files);

    // 分离视频和图片文件
    const videoFiles = files.filter(file => file.type === 'video');
    const imageFiles = files.filter(file => file.type === 'image');
    // 状态跟踪
    let errorTips = [];
    let successTips = [];

    // 校验视频数量（最多1个）
    if (videoFiles.length > 1) {
      wx.showToast({
        title: '只能上传一个视频',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 处理视频文件（如果有）
    let processedVideo = null;
    if (videoFiles.length === 1) {
      // 检查是否已有视频
      if (this.data.hasVideo) {
        processedVideo = null;
      }

      const videoFile = videoFiles[0];
      const filePath = videoFile.url || videoFile.tempFilePath;
      const isMov = filePath.toLowerCase().endsWith('.mov');
      const isValid = filePath.toLowerCase().endsWith('.mp4') ||
        filePath.toLowerCase().endsWith('.avi') ||
        isMov;

      if (!isValid) {
        wx.showToast({
          title: '仅支持mp4、avi和mov格式',
          icon: 'none',
          duration: 2000
        });
        return;
      }

      try {
        let processedFile;
        if (isMov) {
          processedFile = await this.generateVideoThumbnail(videoFile);
        } else {
          const compressedFile = await this.compressVideo(videoFile);
          processedFile = await this.generateVideoThumbnail(compressedFile);
        }

        processedVideo = {
          ...processedFile,
          type: 'video',
          status: 'done',
          name: videoFile.name || '视频文件',
          size: processedFile.size || 0,
          url: processedFile.url || videoFile.url,
          thumb: processedFile.thumb,
          thumbUrl: processedFile.thumb
        };
      } catch (error) {
        console.error('处理视频失败：', error);
        wx.showToast({
          title: '处理视频失败',
          icon: 'none'
        });
        return;
      }
    }

    // 处理图片文件（直接添加）
    const processedImages = imageFiles.map(file => ({
      ...file,
      type: 'image',
      status: 'done',
      name: file.name || '图片文件',
      size: file.size || 0,
      url: file.url,
      thumbUrl: file.url
    }));

    // 合并文件列表（视频在前，图片在后）
    const newFiles = [processedVideo].filter(Boolean).concat(processedImages);

    // 更新数据
    this.setData({
      originFiles: newFiles,
      hasVideo: !!processedVideo,
      videoIndex: processedVideo ? 0 : -1 // 视频始终在第一个位置
    });

    // // 提示上传结果
    // if (processedVideo) {
    //   wx.showToast({
    //     title: '视频上传成功',
    //     icon: 'success'
    //   });
    // } else if (imageFiles.length > 0) {
    //   wx.showToast({
    //     title: '图片上传成功',
    //     icon: 'success'
    //   });
    // }
  },

  // 图片视频预览
  handlePreview(e) {
    const {
      index
    } = e.detail;
    const {
      originFiles
    } = this.data;
    const file = originFiles[index];

    if (file.type === 'video') {
      // 使用视频播放器预览视频
      wx.navigateTo({
        url: `/pages/video-player/index?url=${encodeURIComponent(file.url)}`
      });
    } else {
      // 图片预览
      wx.previewImage({
        current: file.url,
        urls: originFiles.filter(f => f.type === 'image').map(f => f.url)
      });
    }
  },

  // 移除图片和视频
  handleRemove(e) {
    const {
      index
    } = e.detail;
    const {
      originFiles,
      videoIndex
    } = this.data;
    const removedFile = originFiles[index];

    // 如果删除的是视频，更新视频状态
    if (removedFile.type === 'video') {
      this.setData({
        hasVideo: false,
        videoIndex: -1
      });
    } else if (index < videoIndex) {
      // 如果删除的是视频前面的图片，更新视频索引
      this.setData({
        videoIndex: videoIndex - 1
      });
    }

    originFiles.splice(index, 1);
    this.setData({
      originFiles
    });
  },

  // 获取当前位置
  getCurrentLocation() {
    wx.showLoading({
      title: '获取位置中...',
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

        // 获取地址信息
        this.getAddressFromLocation(latitude, longitude);
      },
      fail: (err) => {
        console.error('获取位置失败：', err);
        wx.hideLoading();
        wx.showModal({
          title: '提示',
          content: '获取位置失败，是否手动选择位置？',
          confirmText: '去选择',
          success: (res) => {
            if (res.confirm) {
              this.chooseLocation();
            }
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
            duration: 1500,
          });
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '获取地址信息失败',
            icon: 'none',
            duration: 1500,
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({
          title: '获取地址信息失败',
          icon: 'none',
          duration: 1500,
        });
      }
    });
  },

  // 选择位置
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
          address: address,
          locationName: name || address
        });
        wx.showToast({
          title: '位置选择成功',
          icon: 'success',
          duration: 1500,
        });
      },
      fail: (err) => {
        console.error('选择位置失败：', err);
        wx.showToast({
          title: '选择位置失败',
          icon: 'none',
          duration: 1000,
        });
      }
    });
  },

  // 跳转到地图
  gotoMap() {
    wx.showActionSheet({
      itemList: ['获取当前位置', '在地图中选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.getCurrentLocation();
        } else if (res.tapIndex === 1) {
          this.chooseLocation();
        }
      }
    });
  },

  // 发布
  async release() {
    // 校验数据
    if (!this.validateData()) {
      return;
    }

    // 检查是否登录
    const token = wx.getStorageSync('access_token');
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 1500,
        success: () => {
          setTimeout(() => {
            wx.navigateTo({
              url: '/pages/login/index'
            });
          }, 1500);
        }
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

      // 检查文件
      if (!originFiles || originFiles.length === 0) {
        throw new Error('请选择要上传的文件');
      }

      // 处理文件路径
      const validFiles = originFiles.map(file => {
        if (!file.url && !file.tempFilePath) {
          throw new Error('文件路径无效');
        }

        return {
          ...file,
          tempFilePath: file.tempFilePath || file.url,
          thumb: file.thumb || undefined
        };
      });

      console.log('开始上传，数据：', {
        title,
        content,
        filesCount: validFiles.length,
        files: validFiles.map(f => ({
          type: f.type,
          tempFilePath: f.tempFilePath,
          hasThumb: !!f.thumb
        }))
      });

      // 调用API上传文件并发布游记
      const publishRes = await notesApi.uploadFilesAndPublish({
        files: validFiles,
        title,
        content,
        token
      });

      wx.hideLoading();

      if (publishRes.code === 1) {
        wx.showToast({
          title: publishRes.message || '发布成功',
          icon: 'success',
          duration: 2000,
          success: () => {
            this.resetFormData();
            // 延迟跳转到游记列表页
            setTimeout(() => {
              wx.switchTab({
                url: '/pages/mynotes/index'
              });
            }, 2000);
          }
        });
      } else {
        throw new Error(publishRes.message || '发布失败');
      }
    } catch (error) {
      wx.hideLoading();

      if (error.message === '登录已过期，请重新登录') {
        wx.showToast({
          title: '登录已过期，请重新登录',
          icon: 'none',
          duration: 1500,
          success: () => {
            setTimeout(() => {
              wx.navigateTo({
                url: '/pages/login/index'
              });
            }, 1500);
          }
        });
      } else {
        wx.showToast({
          title: error.message || '发布失败，请检查网络连接',
          icon: 'none',
          duration: 2000
        });
      }
    }
  },

  // 返回主页
  onBackToHome() {
    const hasUnpublishedData = this.data.title || this.data.content || (this.data.originFiles && this.data.originFiles.length > 0) && !this.data.draftSaved;;

    if (hasUnpublishedData) {
      wx.showModal({
        title: '草稿提醒',
        content: '您有未发布的内容，是否保存为草稿？',
        confirmText: '保存草稿',
        cancelText: '放弃草稿',
        success: (res) => {
          if (res.confirm) {
            // 用户选择保存草稿
            this.saveDraft();
          } else {
            // 用户选择放弃，清空草稿数据并回首页
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
      // 没有未发布内容，直接返回首页
      this.resetFormData();
      wx.switchTab({
        url: '/pages/home/index'
      });
    }
  },
  onShow() {
    // 检查登录状态
    const app = getApp();
    const token = wx.getStorageSync('access_token');

    if (!token || !app.globalData.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再发布游记',
        confirmText: '去登录',
        cancelText: '返回首页',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/index',
              events: {
                // 监听登录页面返回
                loginSuccess: () => {
                  // 登录成功后刷新页面状态
                  this.onShow();
                }
              }
            });
          } else {
            wx.switchTab({
              url: '/pages/home/index'
            });
          }
        }
      });
      return;
    }

    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setTabBarValue('release');
    }
  },
  // 保存草稿
  saveDraft() {

    // 构造草稿数据（优化文件处理）
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
      saveTime: new Date().getTime()
    };

    // 保存到本地（使用用户ID区分）
    const userId = wx.getStorageSync('userId') || 'defaultUser';
    try {
      wx.setStorageSync(`draft_${userId}`, draftData);

      // 显示保存结果
      this.setData({
        draftSaved: true
      });
      wx.showToast({
        title: '草稿保存成功',
        icon: 'success',
        duration: 1500
      });
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/home/index'
        });
      }, 1500);

    } catch (e) {
      console.error('草稿保存失败:', e);
      wx.showToast({
        title: '草稿保存失败',
        icon: 'none',
        duration: 1500
      });
    }
  },

  // 加载草稿方法
  loadDraft() {
    const userId = wx.getStorageSync('userId') || 'defaultUser';
    try {
      const draft = wx.getStorageSync(`draft_${userId}`);
      if (draft) {
        // 转换文件数据
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
    } catch (e) {
      console.error('草稿加载失败:', e);
    }
  },

  // 时间格式化方法
  formatTime(timestamp) {
    const date = new Date(timestamp);
    return `${date.getMonth()+1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  },
});