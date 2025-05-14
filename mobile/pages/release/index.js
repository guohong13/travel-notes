// pages/release/index.js

import {
  notesApi
} from '~/api/request';

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
      maxCount: 12,
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
      tempVideoUrl: ''
    });
  },
  onLoad() {
    // 初始化数据
    this.setData({
      originFiles: [],
      title: '',
      content: '',
      location: null,
      locationName: '',
      address: '',
      hasVideo: false,
      tempVideoUrl: ''
    });
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
    if (!originFiles || originFiles.length === 0) {
      wx.showToast({
        title: '请上传图片或视频',
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

  // 选择视频文件
  chooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      success: (res) => {
        const tempFiles = res.tempFiles;
        if (tempFiles && tempFiles.length > 0) {
          const videoFile = tempFiles[0];
          this.processVideoFile(videoFile);
        }
      },
      fail: (err) => {
        console.error('选择视频失败：', err);
        wx.showToast({
          title: '选择视频失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
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
              // 如果获取视频信息失败，使用默认缩略图
              resolve({
                ...file,
                thumb: '/assets/images/video-placeholder.png',
                thumbUrl: '/assets/images/video-placeholder.png',
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

      // 更新文件列表
      const {
        originFiles
      } = this.data;
      const updatedFiles = [newFile, ...originFiles];

      this.setData({
        originFiles: updatedFiles,
        hasVideo: true,
        tempVideoUrl: '' // 清除临时视频URL
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
    console.log('上传的文件：', files);

    // 处理文件
    const processFiles = async () => {
      const validFiles = [];
      let hasNewVideo = false;

      for (const file of files) {
        if (file.type === 'video') {
          // 检查是否已经有视频
          if (this.data.hasVideo) {
            wx.showToast({
              title: '只能上传一个视频',
              icon: 'none',
              duration: 2000
            });
            continue;
          }

          const filePath = file.url || file.tempFilePath;
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
            continue;
          }

          let processedFile;
          if (isMov) {
            // 对于MOV格式，直接使用原文件，不进行压缩
            processedFile = await this.generateVideoThumbnail(file);
          } else {
            // 对于其他格式，进行压缩
            const compressedFile = await this.compressVideo(file);
            processedFile = await this.generateVideoThumbnail(compressedFile);
          }

          validFiles.push({
            ...processedFile,
            type: 'video',
            status: 'done',
            name: file.name || '视频文件',
            size: processedFile.size || 0,
            url: processedFile.url || file.url,
            thumb: processedFile.thumb,
            thumbUrl: processedFile.thumb
          });
          hasNewVideo = true;
        } else {
          validFiles.push({
            ...file,
            type: 'image',
            status: 'done',
            name: file.name || '图片文件',
            size: file.size || 0,
            url: file.url,
            thumbUrl: file.url
          });
        }
      }

      // 将视频文件放在最前面
      const videoFiles = validFiles.filter(file => file.type === 'video');
      const imageFiles = validFiles.filter(file => file.type === 'image');

      // 更新视频状态
      if (hasNewVideo) {
        this.setData({
          hasVideo: true
        });
      }

      return [...videoFiles, ...imageFiles];
    };

    try {
      const sortedFiles = await processFiles();
      console.log('处理后的文件：', sortedFiles);

      this.setData({
        originFiles: sortedFiles,
      });
    } catch (error) {
      console.error('文件处理失败：', error);
      wx.showToast({
        title: '文件处理失败',
        icon: 'none',
        duration: 2000
      });
    }
  },
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
  handleRemove(e) {
    const {
      index
    } = e.detail;
    const {
      originFiles
    } = this.data;
    const removedFile = originFiles[index];

    // 如果删除的是视频，更新视频状态
    if (removedFile.type === 'video') {
      this.setData({
        hasVideo: false
      });
    }

    originFiles.splice(index, 1);
    this.setData({
      originFiles,
    });
  },
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
  saveDraft() {
    if (!this.validateData()) {
      return;
    }

    // 数据校验通过，继续保存草稿流程
    wx.reLaunch({
      url: `/pages/home/index?oper=save`,
    });
  },
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
  onBackToHome() {
    wx.switchTab({
      url: '/pages/home/index',
    });
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
});