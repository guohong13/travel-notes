import {
  notesApi
} from '~/api/request';
import {
  processResourcePath
} from '../../utils/path';

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
        console.log(editData)
        this.initializeEditData(editData);
      } catch (_) {
        wx.showToast({
          title: '数据加载失败',
          icon: 'none'
        });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    }
  },

  initializeEditData(editData) {
    const {
      id,
      title,
      content,
      location,
      images = [],
      video_url
    } = editData;

    const processedFiles = [];

    if (video_url) {
      processedFiles.push({
        type: 'video',
        url: processResourcePath(video_url),
        isRemote: true,
        status: 'done'
      });
    }

    images.forEach(url => {
      processedFiles.push({
        type: 'image',
        url: processResourcePath(url),
        isRemote: true,
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
      files,
      title,
      content
    } = this.data;

    if (files.filter(f => f.type === 'image').length === 0) {
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
        fail: () => {
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
    });
  },

  async processVideoFile(videoFile) {
    try {
      const filePath = videoFile.tempFilePath || videoFile.url;
      const isMov = String(filePath || '').toLowerCase().endsWith('.mov');

      let processedFile;
      if (isMov) {
        processedFile = await this.generateVideoThumbnail(videoFile);
      } else {
        const compressedFile = await this.compressVideo(videoFile);
        processedFile = await this.generateVideoThumbnail(compressedFile);
      }

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

      const updatedFiles = [newFile, ...this.data.files.filter(f => f.type !== 'video')];
      this.setData({
        files: updatedFiles,
        hasVideo: true,
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
        success: (res) => {
          resolve({
            ...file,
            url: res.tempFilePath,
            size: res.size,
            compressed: true
          });
        },
        fail: () => {
          resolve(file);
        }
      });
    });
  },

  async onUploadSuccess(e) {
    const {
      files
    } = e.detail;

    const newVideoFiles = files.filter(file => file.type === 'video');
    const newImageFiles = files.filter(file => file.type === 'image');

    if (newVideoFiles.length > 1) {
      wx.showToast({
        title: '只能上传一个视频',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    let processedVideo = null;
    if (newVideoFiles.length === 1) {
      const newVideoFile = newVideoFiles[0];
      const filePath = newVideoFile.url || newVideoFile.tempFilePath || '';
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
        if (isMov) {
          processedVideo = await this.generateVideoThumbnail(newVideoFile);
        } else {
          const compressedFile = await this.compressVideo(newVideoFile);
          processedVideo = await this.generateVideoThumbnail(compressedFile);
        }
        processedVideo = {
          ...processedVideo,
          type: 'video',
          status: 'done',
          name: newVideoFile.name || '视频文件',
          size: processedVideo.size || 0,
          url: processedVideo.url || newVideoFile.url,
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

    const processedImages = newImageFiles.map(file => ({
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
      files: newFiles,
      hasVideo: !!processedVideo,
      videoIndex: processedVideo ? 0 : -1
    });
  },

  onUploadRemove(e) {
    const {
      index
    } = e.detail;
    const files = this.data.files.filter((_, i) => i !== index);
    this.setData({
      files
    });
  },

  onUploadClick(e) {
    const {
      index
    } = e.detail;
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

  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          location: res.name || res.address
        });
      }
    });
  },

  async onSave() {
    const {
      id,
      title,
      content,
      files: originFiles,
      location
    } = this.data;
    try {
      wx.showLoading({
        title: '更新中...',
        mask: true
      });
      if (!id) throw new Error('无效的游记ID');
      if (!this.validateData()) throw new Error('请填写完整信息');

      const validFiles = originFiles.map(file => ({
        ...file,
        tempFilePath: file.tempFilePath || file.url
      }));

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
          success: () => wx.navigateBack({
            delta: 1
          })
        });
      } else {
        throw new Error(updateRes.message || '更新失败');
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '更新失败',
        icon: 'none',
        duration: 2000
      });
    }
  }
});