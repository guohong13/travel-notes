// pages/edit/index.js
import { notesApi } from '~/api/request';

// 路径处理函数
const processResourcePath = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `http://localhost:3300/${path.replace(/\\/g, '/').replace(/^\/+/, '')}`;
};

Page({
  data: {
    id: null,
    title: '',
    content: '',
    location: '',
    files: [],
    gridConfig: {
      column: 3,
      width: 200,
      height: 200
    },
    config: {
      mediaType: ['image', 'video'],
      maxCount: 9,
      videoMaxDuration: 30
    }
  },

  onLoad(options) {
    if (options.data) {
      try {
        const editData = JSON.parse(decodeURIComponent(options.data));
        this.initializeEditData(editData);
        console.log(editData)
      } catch (error) {
        console.error('数据解析失败:', error);
        wx.showToast({ title: '数据加载失败', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    }
  },

  // 初始化编辑数据
  initializeEditData(editData) {
    const { id, title, content, location, images = [], video_url } = editData;

    const processedFiles = [];

    // 处理视频
    if (video_url) {
      processedFiles.push({
        type: 'video',
        url: processResourcePath(video_url),
        isRemote: true,
        // tempFilePath: video_url,
        status: 'done'
      });
    }

    // 处理图片
    images.forEach(url => {
      processedFiles.push({
        type: 'image',
        url: processResourcePath(url),
        isRemote: true,
        // tempFilePath: url,
        status: 'done'
      });
    });

    this.setData({
      id,
      title: title || '',
      content: content || '',
      location: location || '',
      files: processedFiles
    });

    console.log('初始化后的files数据:', this.data.files);
  },

  // 表单输入处理
  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },
  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  // 校验数据
  validateData() {
    const {
      files,
      title,
      content
    } = this.data;

    console.log('校验数据：', {
      files,
      title,
      content
    });

    // 检查是否上传了图片或视频
    if (files.filter(f => f.type === 'image').length === 0) {
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
              // console.log("获取视频信息失败", err);
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
      const updatedFiles = [newFile, ...this.data.files.filter(f => f.type !== 'video')];

      this.setData({
        files: updatedFiles,
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

  async onUploadSuccess(e) {
    const { files } = e.detail;
    const { files: currentFiles, hasVideo, videoIndex } = this.data;
  
    // 分离新上传的视频和图片文件
    const newVideoFiles = files.filter(file => file.type === 'video');
    const newImageFiles = files.filter(file => file.type === 'image');
  
    // 校验视频数量（最多1个）
    if (newVideoFiles.length > 1) {
      wx.showToast({
        title: '只能上传一个视频',
        icon: 'none',
        duration: 2000
      });
      return;
    }
  
    // 状态跟踪
    let errorTips = [];
    let successTips = [];
  
    // 处理新视频文件（如果有）
    let processedVideo = null;
    if (newVideoFiles.length === 1) {
      const newVideoFile = newVideoFiles[0];
      const filePath = newVideoFile.url || newVideoFile.tempFilePath;
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
          processedFile = await this.generateVideoThumbnail(newVideoFile);
        } else {
          const compressedFile = await this.compressVideo(newVideoFile);
          processedFile = await this.generateVideoThumbnail(compressedFile);
        }
  
        processedVideo = {
          ...processedFile,
          type: 'video',
          status: 'done',
          name: newVideoFile.name || '视频文件',
          size: processedFile.size || 0,
          url: processedFile.url || newVideoFile.url,
          thumb: processedFile.thumb,
          thumbUrl: processedFile.thumb
        };
        // successTips.push('视频上传成功');
      } catch (error) {
        console.error('处理视频失败：', error);
        errorTips.push('处理视频失败');
        wx.showToast({
          title: '处理视频失败',
          icon: 'none'
        });
        return;
      }
    }
  
    // 处理新图片文件
    const processedImages = newImageFiles.map(file => ({
      ...file,
      type: 'image',
      status: 'done',
      name: file.name || '图片文件',
      size: file.size || 0,
      url: file.url,
      thumbUrl: file.url
    }));
  
    // if (processedImages.length > 0) {
    //   successTips.push(`成功上传${processedImages.length}张图片`);
    // }
  
    // 合并文件列表
    const newFiles = [processedVideo].filter(Boolean).concat(processedImages);
    
    // 更新数据
    this.setData({
      files: newFiles,
      hasVideo: !!processedVideo,
      videoIndex: processedVideo ? 0 : -1 // 视频始终在第一个位置
    });
  
    // 提示上传结果
    if (successTips.length > 0) {
      wx.showToast({
        title: successTips.join('，'),
        icon: 'success',
        duration: 2000
      });
    }
    
    if (errorTips.length > 0) {
      wx.showToast({
        title: errorTips.join('，'),
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 删除文件
  onUploadRemove(e) {
    const { index } = e.detail;
    const files = this.data.files.filter((_, i) => i !== index);
    this.setData({ files });
  },

  // 文件预览
  onUploadClick(e) {
    const { index } = e.detail;
    const file = this.data.files[index];
    
    if (file.type === 'video') {
      wx.navigateTo({
        url: `/pages/video-player/index?url=${encodeURIComponent(file.url)}`
      });
    } else {
      wx.previewImage({
        current: file.url,
        urls: this.data.files.filter(f => f.type === 'image').map(f => f.url)
      });
    }
  },

  // 选择位置
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({ location: res.name || res.address });
      }
    });
  },
  async onSave() {
    const {
      id,
      title,
      content,
      files: originFiles,
      location,
      locationName,
      address
    } = this.data;
  
    try {
      wx.showLoading({
        title: '更新中...',
        mask: true
      });
  
      // 校验ID是否存在（编辑场景必须有id）
      if (!id) throw new Error('无效的游记ID');
  
      // 检查文件
      const hasValidFiles = originFiles.length > 0 || 
        (this.data.hasVideo || this.data.images.length > 0);
      if (!title || !content || !hasValidFiles) {
        throw new Error('请填写完整信息');
      }
  
      // 合并新旧文件
      const validFiles = originFiles.map(file => ({
        ...file,
        tempFilePath: file.tempFilePath || file.url,
      }));
      console.log(id,validFiles,title,content);
  
      // 调用更新接口
      const updateRes = await notesApi.uploadFilesAndUpdate({
        id,
        files: validFiles,
        title,
        content,
        location,
        token: wx.getStorageSync('access_token')
      });
  
      wx.hideLoading();
  
      if (updateRes.code === 1) {
        wx.showToast({
          title: '更新成功',
          icon: 'success',
          duration: 2000,
          success: () => {
            // 返回上一页或刷新列表
            wx.navigateBack({
              delta: 1
            });
          }
        });
      } else {
        throw new Error(updateRes.message || '更新失败');
      }
  
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message,
        icon: 'none',
        duration: 2000
      });
    }
  }

});