import {
  userApi
} from '~/api/request';
import {
  processResourcePath
} from '../../../utils/path';

Page({
  data: {
    loading: true,
    likes: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loadingMore: false
  },

  onLoad() {
    this.loadLikes();
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar && tabBar.setTabBarValue) {
      tabBar.setTabBarValue('my');
    }
  },

  async loadLikes(isLoadMore = false) {
    if (isLoadMore && !this.data.hasMore) return;

    try {
      if (isLoadMore) {
        this.setData({
          loadingMore: true
        });
      } else {
        this.setData({
          loading: true
        });
      }

      const res = await userApi.getLikesList(this.data.page, this.data.pageSize);
      if (res.code === 1 && res.data) {
        const list = Array.isArray(res.data.list) ? res.data.list : [];
        const formatted = list.map(note => {
          const images = Array.isArray(note.images) ? note.images : (typeof note.images === 'string' ? note.images.split(',') : []);
          const processedImages = images.map(img => processResourcePath(img)).filter(Boolean);
          const shortContent = note.content && note.content.length > 50 ? note.content.slice(0, 50) + '...' : (note.content || '');
          return {
            id: note.id,
            title: note.title || '',
            content: note.content || '',
            shortContent,
            images: processedImages,
            nickname: note.nickname || '',
            created_at: note.created_at || ''
          };
        });
        const pagination = res.data.pagination || {};
        this.setData({
          likes: isLoadMore ? [...this.data.likes, ...formatted] : formatted,
          hasMore: !!pagination.hasMore,
          loading: false,
          loadingMore: false
        });
      } else {
        this.setData({
          loading: false,
          loadingMore: false
        });
        wx.showToast({
          title: res.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      this.setData({
        loading: false,
        loadingMore: false
      });
      wx.showToast({
        title: '获取数据失败',
        icon: 'none'
      });
    }
  },

  onPullDownRefresh() {
    this.setData({
      page: 1,
      hasMore: true
    });
    this.loadLikes().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.setData({
        page: this.data.page + 1
      });
      this.loadLikes(true);
    }
  },

  onTapCard(e) {
    const {
      travelNote
    } = e.detail || {};
    if (!travelNote || !travelNote.id) return;
    wx.navigateTo({
      url: `/pages/details/index?noteId=${travelNote.id}`
    });
  }
});