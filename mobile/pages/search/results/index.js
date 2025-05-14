import {
  notesApi
} from '~/api/request';
// 路径处理函数
const processResourcePath = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  // 统一处理路径格式
  return `http://localhost:3300/${
    path.replace(/\\/g, '/')      // 替换反斜杠为正斜杠
       .replace(/^\/+/, '')       // 去除开头多余斜杠
       .replace(/\/+/g, '/')      // 合并连续斜杠
  }`;
};
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

  async searchNotes(q, page = 1) {
    if (this.data.loading) return;

    console.log('搜索关键词:', q);
    this.setData({
      loading: true
    });

    try {
      const res = await notesApi.searchNotes({
        title: q,
        nickname: q
      });
      console.log('搜索结果:', res);

      if (res.code === 1) {
        const BASE_URL = 'http://localhost:3300';
        const noteList = res.data.list || [];
        const formattedList = noteList.map(note => ({
          id: note.id,
          desc: note.title,
          mediaList: [{
            url: (note.images && note.images.length > 0) ?
              (processResourcePath(note.images[0])) :
              '',
            type: 'image'
          }],
          avatar: processResourcePath(note.avatar_url),
          nickname: note.nickname || '游客',
          title: note.title,
          content: note.content,
          images: note.images ?
            note.images.map(img => processResourcePath(img)) :
            [],
          video_url: note.video_url,
          created_at: note.created_at
        }));

        this.setData({
          results: page === 1 ? formattedList : [...this.data.results, ...formattedList],
          hasMore: formattedList.length === this.data.pageSize,
          page: page
        });
        console.log('处理后的结果:', formattedList);
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
    } catch (error) {
      console.error('搜索失败:', error);
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
    this.searchNotes(this.data.searchValue, 1).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.searchNotes(this.data.searchValue, this.data.page);
    }
  },

  goToDetail(e) {
    const travelNote = e.currentTarget.dataset.item;
    if (!travelNote || typeof travelNote.id === 'undefined') {
      console.error('goToDetail: Invalid travelNote item', travelNote);
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
  }
});