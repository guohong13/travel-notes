import {
  notesApi
} from '~/api/request';
import {
  processResourcePath
} from '../../../utils/path';

Page({
  data: {
    results: [],
    searchValue: '',
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10
  },

  onLoad(options) {
    if (options.q) {
      const searchValue = decodeURIComponent(options.q);
      this.setData({
        searchValue
      });
      this.searchNotes(searchValue);
    }
  },

  onBackToHome() {
    wx.navigateBack({
      fail: () => wx.switchTab({
        url: '/pages/home/index'
      })
    });
  },

  async searchNotes(q, page = 1) {
    if (this.data.loading) return;
    this.setData({
      loading: true
    });

    try {
      const res = await notesApi.searchNotes({
        title: q,
        nickname: q
      });
      if (res.code === 1) {
        const noteList = res.data.list || [];
        const formattedList = noteList.map(note => ({
          id: note.id,
          desc: note.title,
          likeCount: Number(note.like_count || 0),
          mediaList: [{
            url: (note.images && note.images.length > 0) ? processResourcePath(note.images[0]) : '',
            type: 'image'
          }],
          avatar: processResourcePath(note.avatar_url),
          nickname: note.nickname || '游客',
          title: note.title,
          content: note.content,
          images: Array.isArray(note.images) ? note.images.map(img => processResourcePath(img)) : [],
          video_url: processResourcePath(note.video_url),
          created_at: note.created_at
        }));

        this.setData({
          results: page === 1 ? formattedList : [...this.data.results, ...formattedList],
          hasMore: formattedList.length === this.data.pageSize,
          page
        });
      } else {
        this.setData({
          results: [],
          hasMore: false
        });
        wx.showToast({
          title: '暂无相关游记',
          icon: 'none'
        });
      }
    } catch (_) {
      wx.showToast({
        title: '搜索失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  onPullDownRefresh() {
    this.setData({
      page: 1
    });
    this.searchNotes(this.data.searchValue, 1).then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.searchNotes(this.data.searchValue, this.data.page);
  },

  goToDetail(e) {
    const travelNote = e.currentTarget.dataset.item;
    if (!travelNote || typeof travelNote.id === 'undefined') {
      wx.showToast({
        title: '游记数据错误',
        icon: 'none'
      });
      return;
    }
    let mediaList = [];
    if (travelNote.video_url) mediaList.push({
      url: travelNote.video_url,
      type: 'video'
    });
    if (Array.isArray(travelNote.images)) mediaList = mediaList.concat(travelNote.images.map(url => ({
      url,
      type: 'image'
    })));
    const detailNote = {
      ...travelNote,
      mediaList
    };
    wx.navigateTo({
      url: `/pages/details/index?travelNote=${encodeURIComponent(JSON.stringify(detailNote))}`
    });
  }
});