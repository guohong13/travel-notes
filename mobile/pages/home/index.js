import {
  notesApi
} from '~/api/request';
import {
  processResourcePath
} from '../../utils/path';

Page({
  data: {
    enable: false, // 下拉刷新触发标记
    cardInfo: [],
    likeList: [],
    loading: false,
    // 分页相关
    page: 1,
    pageSize: 6,
    hasMore: true,
    loadingMore: false,
    followingHasMore: true,
    activeTab: 'recommend'
  },

  onLoad() {
    this.loadNotesList();
    this.loadFollowist();
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar && tabBar.setTabBarValue) {
      tabBar.setTabBarValue('home');
    }
    // 返回首页时刷新关注流
    if (this.data.activeTab === 'follow') {
      this.loadFollowist();
    }
  },

  // 触底事件 - 自动加载更多游记内容
  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMoreData();
    }
  },

  // 加载发现列表
  async loadNotesList() {
    if (this.data.loading && !this.data.enable) return;

    this.setData({
      loading: true
    });

    try {
      const res = await notesApi.getHomeNotes(1, this.data.pageSize);
      if (res.code === 1 && res.data && res.data.list) {
        const formattedList = res.data.list.map(note => {
          const processedImages = (note.images || []).map(img => processResourcePath(img));
          const processedVideo = processResourcePath(note.video_url);
          const processedAvatar = processResourcePath(note.avatar_url)

          return {
            id: note.id,
            user_id: note.user_id,
            desc: note.title,
            mediaList: this.createMediaList(processedImages, processedVideo),
            avatar: processedAvatar,
            nickname: note.nickname || '游客',
            coverImage: processedImages[0] || '',
            title: note.title,
            content: note.content,
            images: processedImages,
            video_url: processedVideo,
            created_at: note.created_at,
            likeCount: note.like_count || 0,
            collect_count: note.collect_count || 0,
            // 位置字段映射
            locationName: note.location_name || '',
            address: note.location_address || '',
            location: (typeof note.location_lat === 'number' && typeof note.location_lng === 'number')
              ? { latitude: note.location_lat, longitude: note.location_lng }
              : null,
          };
        });

        this.setData({
          cardInfo: formattedList,
          page: 1,
          hasMore: res.data.pagination.hasMore
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

  // 加载关注列表
  async loadFollowist() {
    try {
      // 未登录直接清空并返回
      const token = wx.getStorageSync('access_token');
      if (!token) {
        this.setData({
          likeList: [],
          followingHasMore: false
        });
        return;
      }
      const res = await notesApi.getFollowingNotes(1, this.data.pageSize);
      if (res.code === 1 && res.data && res.data.list) {
        const formattedList = res.data.list.map(note => {
          const processedImages = (note.images || []).map(img => processResourcePath(img));
          const processedVideo = processResourcePath(note.video_url);
          const processedAvatar = processResourcePath(note.avatar_url)

          return {
            id: note.id,
            user_id: note.user_id,
            desc: note.title,
            mediaList: this.createMediaList(processedImages, processedVideo),
            avatar: processedAvatar,
            nickname: note.nickname || '游客',
            coverImage: processedImages[0] || '',
            title: note.title,
            content: note.content,
            images: processedImages,
            video_url: processedVideo,
            created_at: note.created_at,
            likeCount: note.like_count || 0,
            collect_count: note.collect_count || 0,
            // 位置字段映射
            locationName: note.location_name || '',
            address: note.location_address || '',
            location: (typeof note.location_lat === 'number' && typeof note.location_lng === 'number')
              ? { latitude: note.location_lat, longitude: note.location_lng }
              : null,
          };
        });

        this.setData({
          likeList: formattedList,
          followingHasMore: res.data.pagination.hasMore
        });
      } else {
        // 如果没有关注数据，显示提示
        this.setData({
          likeList: [],
          followingHasMore: false
        });
      }
    } catch (error) {
      // 如果接口调用失败，显示空状态
      this.setData({
        likeList: [],
        followingHasMore: false
      });
      // 若是未授权，提示登录
      if (error && (error.statusCode === 401 || error.statusCode === 403)) {
        wx.showToast({
          title: '请先登录以查看关注内容',
          icon: 'none'
        });
      }
    }
  },

  // 下拉刷新
  onRefresh() {
    this.setData({
      enable: true,
      page: 1,
      hasMore: true,
      followingHasMore: true
    });
    this.loadNotesList();
    this.loadFollowist();
  },

  onHomeTabChange(e) {
    const {
      value
    } = e.detail || {};
    if (!value) return;
    this.setData({
      activeTab: value
    });
    if (value === 'follow') {
      // 每次切换到关注页签主动刷新
      this.loadFollowist();
    }
  },

  // 自动加载更多数据
  async loadMoreData() {
    if (!this.data.hasMore || this.data.loadingMore) return;

    this.setData({
      loadingMore: true
    });

    try {
      const nextPage = this.data.page + 1;
      const res = await notesApi.getHomeNotes(nextPage, this.data.pageSize);

      if (res.code === 1 && res.data && res.data.list) {
        const newData = res.data.list.map(note => {
          const processedImages = (note.images || []).map(img => processResourcePath(img));
          const processedVideo = processResourcePath(note.video_url);
          const processedAvatar = processResourcePath(note.avatar_url)

          return {
            id: note.id,
            user_id: note.user_id,
            desc: note.title,
            mediaList: this.createMediaList(processedImages, processedVideo),
            avatar: processedAvatar,
            nickname: note.nickname || '游客',
            coverImage: processedImages[0] || '',
            title: note.title,
            content: note.content,
            images: processedImages,
            video_url: processedVideo,
            created_at: note.created_at,
            likeCount: note.like_count,
            collect_count: note.collect_count,
            // 位置字段映射
            locationName: note.location_name || '',
            address: note.location_address || '',
            location: (typeof note.location_lat === 'number' && typeof note.location_lng === 'number')
              ? { latitude: note.location_lat, longitude: note.location_lng }
              : null,
          };
        });

        this.setData({
          cardInfo: [...this.data.cardInfo, ...newData],
          page: nextPage,
          hasMore: res.data.pagination.hasMore,
          loadingMore: false
        });

        // 显示加载成功提示
        if (res.data.pagination.hasMore) {
          wx.showToast({
            title: `已加载第${nextPage}页`,
            icon: 'none',
            duration: 1500
          });
        }
      } else {
        this.setData({
          hasMore: false,
          loadingMore: false
        });
      }
    } catch (error) {
      console.error('加载更多数据失败:', error);
      this.setData({
        loadingMore: false
      });
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  // 创建媒体列表（视频优先）
  createMediaList(processedImages, processedVideo) {
    const mediaList = [];
    if (processedVideo) {
      mediaList.push({
        type: 'video',
        url: processedVideo
      });
    }
    if (processedImages && processedImages.length) {
      processedImages.forEach(img => mediaList.push({
        type: 'image',
        url: img
      }));
    }
    return mediaList;
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
      url: `/pages/details/index?travelNote=${encodeURIComponent(
        JSON.stringify(travelNote)
      )}`
    });
  },

});