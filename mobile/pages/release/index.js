// pages/release/index.js

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
      extension: ['.mp4', '.avi']
    },
    location: null,
    address: '',
    locationName: '',
    title: '',
    content: '',
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
    const { originFiles, title, content } = this.data;
    
    // 检查是否上传了图片或视频
    if (!originFiles || originFiles.length === 0) {
      wx.showToast({
        title: '请上传图片或视频',
        icon: 'none',
        duration: 2000
      });
      return false;
    }

    // 检查标题是否填写
    if (!title || title.trim() === '') {
      wx.showToast({
        title: '请输入游记标题',
        icon: 'none',
        duration: 2000
      });
      return false;
    }

    // 检查内容是否填写
    if (!content || content.trim() === '') {
      wx.showToast({
        title: '请输入游记内容',
        icon: 'none',
        duration: 2000
      });
      return false;
    }

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

  // 处理视频文件
  async processVideoFile(videoFile) {
    try {
      // 压缩视频
      const compressedFile = await this.compressVideo(videoFile);
      // 生成缩略图
      const processedFile = await this.generateVideoThumbnail(compressedFile);
      
      const newFile = {
        ...processedFile,
        type: 'video',
        status: 'done',
        name: videoFile.tempFilePath.split('/').pop() || '视频文件',
        size: processedFile.size || videoFile.size || 0,
        url: processedFile.url || videoFile.tempFilePath,
        thumb: processedFile.thumb || videoFile.thumbTempFilePath
      };

      // 更新文件列表
      const { originFiles } = this.data;
      const updatedFiles = [newFile, ...originFiles];
      
      this.setData({
        originFiles: updatedFiles
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
          console.error('视频压缩失败：', err);
          resolve(file); // 压缩失败时返回原文件
        }
      });
    });
  },

  // 生成视频缩略图
  async generateVideoThumbnail(file) {
    return new Promise((resolve, reject) => {
      wx.getVideoInfo({
        src: file.url || file.tempFilePath,
        success: (res) => {
          resolve({
            ...file,
            thumb: res.thumbTempFilePath,
            duration: res.duration,
            width: res.width,
            height: res.height
          });
        },
        fail: (err) => {
          console.error('获取视频信息失败：', err);
          resolve(file);
        }
      });
    });
  },

  async handleSuccess(e) {
    const { files } = e.detail;
    console.log('上传的文件：', files);

    // 处理文件
    const processFiles = async () => {
      const validFiles = [];
      
      for (const file of files) {
        if (file.type === 'video') {
          const isValid = file.url.endsWith('.mp4') || file.url.endsWith('.avi');
          if (!isValid) {
            wx.showToast({
              title: '仅支持mp4和avi格式',
              icon: 'none',
              duration: 2000
            });
            continue;
          }

          // 压缩视频
          const compressedFile = await this.compressVideo(file);
          // 生成缩略图
          const processedFile = await this.generateVideoThumbnail(compressedFile);
          
          validFiles.push({
            ...processedFile,
            type: 'video',
            status: 'done',
            name: file.name || '视频文件',
            size: processedFile.size || 0,
          });
        } else {
          validFiles.push({
            ...file,
            type: 'image',
            status: 'done',
            name: file.name || '图片文件',
            size: file.size || 0,
            url: file.url
          });
        }
      }

      // 将视频文件放在最前面
      const videoFiles = validFiles.filter(file => file.type === 'video');
      const imageFiles = validFiles.filter(file => file.type === 'image');
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
    const { index } = e.detail;
    const { originFiles } = this.data;
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
    const { index } = e.detail;
    const { originFiles } = this.data;
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
        const { latitude, longitude } = res;
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
        const { latitude, longitude, name, address } = res;
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
          duration: 1500,
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
  release() {
    if (!this.validateData()) {
      return;
    }

    // 数据校验通过，继续发布流程
    wx.reLaunch({
      url: `/pages/home/index?oper=release`,
    });
  },
  onBackToHome() {
    wx.switchTab({
      url: '/pages/home/index',
    });
  }
});
