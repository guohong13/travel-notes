import Message from 'tdesign-miniprogram/message/index';
import { notesApi } from '~/api/request';


// 获取应用实例
// const app = getApp()

Page({
  data: {
    enable: false,
    swiperList: [],
    cardInfo: [],
    notesList: [], // 游记列表
    loading: false, // 加载状态
    currentNote: null, // 当前选中的游记详情
    // 发布
    motto: 'Hello World',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    canIUseGetUserProfile: false,
    canIUseOpenData: wx.canIUse('open-data.type.userAvatarUrl') && wx.canIUse('open-data.type.userNickName'), // 如需尝试获取用户信息可改为false
  },
  // 生命周期
  onReady() {
    console.log('Page ready');
  },
  onLoad(option) {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true,
      });
    }
    // 首次加载数据
    this.loadNotesList();

    if (option.oper) {
      let content = '';
      if (option.oper === 'release') {
        content = '发布成功';
      } else if (option.oper === 'save') {
        content = '保存成功';
      }
      this.showOperMsg(content);
    }
  },
  onShow() {
    // 每次显示页面时尝试刷新数据，确保数据是最新的
    // 如果不希望每次onShow都刷新，可以注释掉下面这行，仅依赖下拉刷新
    this.loadNotesList(); 
    
    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setTabBarValue('home');
    }
  },
  // 加载游记列表 (下拉刷新或初次加载)
  async loadNotesList() {
    if (this.data.loading && this.data.enable === false) { // 如果正在加载且不是下拉刷新触发，则返回
      console.log('loadNotesList: Bailing, already loading and not pull-to-refresh');
      return;
    }
    
    console.log('loadNotesList: Starting to load notes');
    this.setData({ loading: true });

    try {
      const res = await notesApi.getHomeNotes();
      console.log('loadNotesList: API response', res);
      
      if (res.code === 1 && Array.isArray(res.data)) {
        const BASE_URL = 'http://localhost:3300'; // 例如 https://api.xxx.com

        const formattedList = res.data.map(note => ({
          id: note.id,
          desc: note.title,
          mediaList: [
            {
              url: (note.images && note.images.length > 0) 
                ? (note.images[0].startsWith('http') ? note.images[0] : BASE_URL + note.images[0])
                : '',
              type: 'image'
            }
          ],
          avatar: note.avatar_url || '/assets/images/default-avatar.png',
          nickname: note.nickname || '游客',
          title: note.title,
          content: note.content,
          images: note.images
            ? note.images.map(img => img.startsWith('http') ? img : BASE_URL + img)
            : [],
          video_url: note.video_url,
          created_at: note.created_at
        }));

        this.setData({
          notesList: formattedList,
          cardInfo: formattedList,
          focusCardInfo: formattedList.slice(0, 3) // 这个属性似乎没有在WXML中使用，但保留
        });
        console.log('loadNotesList: Data formatted and set', formattedList);
      } else {
        console.warn('loadNotesList: Failed to load notes or data is not an array', res);
        wx.showToast({
          title: res.message || '加载游记失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('loadNotesList: Exception while loading notes', error);
      wx.showToast({
        title: '加载游记异常，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ 
        loading: false,
        enable: false // 结束下拉刷新状态（如果是由下拉刷新触发的）
      });
      console.log('loadNotesList: Finished loading, loading set to false');
    }
  },
  // 加载游记详情 (这个方法主要在点击卡片时使用)
  async loadNoteDetail(noteId) {
    try {
      const res = await notesApi.getNoteDetail(noteId);
      if (res.code === 1) {
        this.setData({
          currentNote: res.data
        });
      } else {
        wx.showToast({
          title: res.message || '获取详情失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载游记详情失败：', error);
      wx.showToast({
        title: '获取详情失败',
        icon: 'none'
      });
    }
  },
  // 下拉刷新处理
  async onRefresh() {
    console.log('onRefresh: Pull to refresh triggered');
    this.setData({
      enable: true, // 开启下拉刷新动画
    });
    await this.loadNotesList(); // 调用加载列表的方法
  },
  showOperMsg(content) {
    Message.success({
      context: this,
      offset: [120, 32],
      duration: 4000,
      content,
    });
  },
  goRelease() {
    wx.navigateTo({
      url: '/pages/release/index',
    });
  },
  godetails(){
    wx.navigateTo({
        url: '/pages/details/details',
      });
  },
  async onTapCard(e) {
    const travelNote = e.currentTarget.dataset.item;
    if (!travelNote || typeof travelNote.id === 'undefined') {
      console.error('onTapCard: Invalid travelNote item', travelNote);
      wx.showToast({
        title: '游记数据错误',
        icon: 'none'
      });
      return;
    }

    // 构造完整的mediaList
    let mediaList = [];
    
    // 如果有视频，放在第一位
    if (travelNote.video_url) {
      mediaList.push({
        url: travelNote.video_url,
        type: 'video'
      });
    }
    
    // 添加所有图片
    if (Array.isArray(travelNote.images)) {
      mediaList = mediaList.concat(
        travelNote.images.map(url => ({
          url: url,
          type: 'image'
        }))
      );
    }

    // 组装新的travelNote对象
    const detailNote = {
      ...travelNote,
      mediaList
    };

    // 跳转到详情页
    wx.navigateTo({
      url: `/pages/details/details?travelNote=${encodeURIComponent(JSON.stringify(detailNote))}`
    });
  },
  onShow() {
    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setTabBarValue('home');
    }
  }
});
