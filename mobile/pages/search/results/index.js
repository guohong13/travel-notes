import request from '~/api/request';

Page({
  data: {
    results: [],
    searchValue: '',
  },

  onLoad(options) {
    const { q = '' } = options;
    this.setData({ searchValue: q });
    this.searchNotes(q);
  },

  async searchNotes(q) {
    // 假设后端接口为 /api/searchNotes?q=xxx
    // 支持作者昵称和游记标题模糊搜索
    const res = await request(`/api/searchNotes?q=${encodeURIComponent(q)}`);
    if (res.code === 200) {
      this.setData({ results: res.data.notes || [] });
    } else {
      this.setData({ results: [] });
    }
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/note/detail/index?id=${id}`,
    });
  },
}); 