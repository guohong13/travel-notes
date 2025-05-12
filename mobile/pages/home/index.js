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
    // 发布
    motto: 'Hello World',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    canIUseGetUserProfile: false,
    canIUseOpenData: wx.canIUse('open-data.type.userAvatarUrl') && wx.canIUse('open-data.type.userNickName'), // 如需尝试获取用户信息可改为false
  },
  // 生命周期
  async onReady() {
    await this.loadNotesList();
  },
  // 加载游记列表
  async loadNotesList() {
    try {
      this.setData({ loading: true });
      const res = await notesApi.getHomeNotes();
      
      if (res.code === 1) {
        this.setData({
          notesList: res.data,
          cardInfo: res.data, // 将游记数据也设置到cardInfo中用于展示
          focusCardInfo: res.data.slice(0, 3)
        });
      } else {
        wx.showToast({
          title: res.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载游记列表失败：', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  onLoad(option) {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true,
      });
    }
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
  onRefresh() {
    this.refresh();
  },
  async refresh() {
    this.setData({
      enable: true,
    });

    await this.loadNotesList();

    setTimeout(() => {
      this.setData({
        enable: false,
      });
    }, 1500);
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
  onTapCard(e) {
    const travelNote = e.currentTarget.dataset.item; 
    wx.navigateTo({
      url: `/pages/details/details?travelNote=${encodeURIComponent(JSON.stringify(travelNote))}`
    });
  },
  onShow() {
    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setTabBarValue('home');
    }
  }
});
