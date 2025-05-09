import request from '~/api/request';

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
        const travelNote = JSON.parse(decodeURIComponent(options.data));
        // 将coverImage转换为images数组格式
        const images = travelNote.coverImage ? [{
          url: travelNote.coverImage,
          type: 'image',
          name: 'cover'
        }] : [];
        
        this.setData({
          id: travelNote.id,
          title: travelNote.title,
          content: travelNote.content,
          location: travelNote.location,
          images
        });
      } catch (error) {
        console.error('解析游记数据失败:', error);
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
    const { files } = e.detail;
    
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
    const { index } = e.detail;
    const { images } = this.data;
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
    const { index } = e.detail;
    const { images } = this.data;
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
    const { id, title, content, location, images } = this.data;
    
    if (!title || !content || !location || images.length === 0) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    try {
      // 使用第一张图片或视频作为封面
      const coverImage = images[0].url;
      
      await request('/mynotes/update', {
        id,
        title,
        content,
        location,
        coverImage
      });

      wx.showToast({
        title: '保存成功',
        icon: 'success',
        success: () => {
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      });
    } catch (error) {
      console.error('保存失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
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
          const filePath = videoFile.tempFilePath;
          
          // 检查文件格式
          const isValid = filePath.toLowerCase().endsWith('.mp4') || 
                         filePath.toLowerCase().endsWith('.avi') || 
                         filePath.toLowerCase().endsWith('.mov');

          if (!isValid) {
            wx.showToast({
              title: '仅支持mp4、avi和mov格式',
              icon: 'none',
              duration: 2000
            });
            return;
          }

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
      const videoContext = wx.createVideoContext('tempVideo');
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
              console.error('获取视频信息失败：', err);
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

      // 检查是否已有视频
      if (this.data.hasVideo) {
        wx.showModal({
          title: '提示',
          content: '已存在视频，是否替换？',
          success: (res) => {
            if (res.confirm) {
              // 用户确认替换
              const currentImages = this.data.images.filter(file => file.type === 'image');
              currentImages.unshift(newFile);
              this.setData({
                images: currentImages,
                hasVideo: true,
                tempVideoUrl: ''
              });
            }
          }
        });
      } else {
        // 如果没有视频，直接添加
        const currentImages = this.data.images;
        currentImages.unshift(newFile);
        this.setData({
          images: currentImages,
          hasVideo: true,
          tempVideoUrl: ''
        });
      }

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
}); 