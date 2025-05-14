import Message from 'tdesign-miniprogram/message/index';
import {
  notesApi
} from '~/api/request';

// 路径处理函数
const processResourcePath = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  // 统一处理路径格式
  return `http://localhost:3300/${
    path.replace(/\\/g, '/')
       .replace(/^\/+/, '')
       .replace(/\/+/g, '/')
  }`;
};

Page({
  data: {
    enable: false,
    swiperList: [],
    cardInfo: [],
    notesList: [],
    loading: false,
    currentNote: null,
    motto: 'Hello World',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    canIUseGetUserProfile: false,
    canIUseOpenData: wx.canIUse('open-data.type.userAvatarUrl') && wx.canIUse('open-data.type.userNickName'),
  },

  onLoad(option) {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      });
    }
    this.loadNotesList();

    if (option.oper) {
      this.showOperMsg(option.oper === 'release' ? '发布成功' : '保存成功');
    }
  },

  onShow() {
    this.loadNotesList();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setTabBarValue('home');
    }
  },

  async loadNotesList() {
    if (this.data.loading && !this.data.enable) return;

    this.setData({
      loading: true
    });

    try {
      const res = await notesApi.getHomeNotes();
      if (res.code === 1 && Array.isArray(res.data)) {
        const formattedList = res.data.map(note => {
          // 处理图片数组
          const processedImages = (note.images || []).map(img => processResourcePath(img));

          // 处理视频路径
          const processedVideo = processResourcePath(note.video_url);

          // 处理头像路径
          const processedAvatar = note.avatar_url ?
            processResourcePath(note.avatar_url) :
            '/assets/images/default-avatar.png';

          return {
            id: note.id,
            desc: note.title,
            mediaList: this.createMediaList(processedImages, processedVideo),
            avatar: processedAvatar,
            nickname: note.nickname || '游客',
            coverImage: processedImages[0] || '',
            title: note.title,
            content: note.content,
            images: processedImages,
            video_url: processedVideo,
            created_at: note.created_at
          };
        });

        this.setData({
          notesList: formattedList,
          cardInfo: formattedList,
          focusCardInfo: formattedList.slice(0, 3)
        });
      }
    } catch (error) {
      wx.showToast({
        title: '加载异常，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({
        loading: false,
        enable: false
      });
    }
  },

  // 创建媒体列表（视频优先）
  createMediaList(images, video) {
    const mediaList = [];
    if (video) {
      mediaList.push({
        url: video,
        type: 'video'
      });
    }
    if (images.length > 0) {
      mediaList.push({
        url: images[0],
        type: 'image'
      });
    }
    return mediaList;
  },

  onRefresh() {
    this.setData({
      enable: true
    });
    this.loadNotesList();
  },

  onTapCard(e) {
    const travelNote = e.currentTarget.dataset.item;
    if (!travelNote?.id) {
      wx.showToast({
        title: '数据错误',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/details/details?travelNote=${encodeURIComponent(
        JSON.stringify({
          ...travelNote,
          mediaList: this.createFullMediaList(travelNote)
        })
      )}`
    });
  },

  // 创建完整媒体列表（用于详情页）
  createFullMediaList(travelNote) {
    const mediaList = [];
    if (travelNote.video_url) {
      mediaList.push({
        url: travelNote.video_url,
        type: 'video'
      });
    }
    return mediaList.concat(
      (travelNote.images || []).map(url => ({
        url,
        type: 'image'
      }))
    );
  },

  showOperMsg(content) {
    Message.success({
      context: this,
      offset: [120, 32],
      duration: 4000,
      content
    });
  },
  goRelease() {
    wx.navigateTo({
      url: '/pages/release/index'
    });
  },
  godetails() {
    wx.navigateTo({
      url: '/pages/details/details'
    });
  }
});