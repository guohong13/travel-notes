import request from '~/api/request';

Page({
  data: {
    id: null,
    title: '',
    content: '',
    location: '',
    images: [],
    gridConfig: {
      column: 3,
      width: 200,
      height: 200
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
    this.setData({
      images: files
    });
  },

  onUploadRemove(e) {
    const { index } = e.detail;
    const { images } = this.data;
    images.splice(index, 1);
    this.setData({
      images
    });
  },

  onUploadClick(e) {
    const { index } = e.detail;
    const { images } = this.data;
    wx.previewImage({
      current: images[index].url,
      urls: images.map(img => img.url)
    });
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
      // 使用第一张图片作为封面
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
  }
}); 