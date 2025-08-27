Page({
  data: {
    historyWords: [],
    searchValue: '',
    dialog: { title: '确认删除当前历史记录', showCancelButton: true, message: '' },
    dialogShow: false
  },

  onLoad() {
    const cached = wx.getStorageSync('search_history') || [];
    this.setData({ historyWords: Array.isArray(cached) ? cached : [] });
  },

  setHistoryWords(searchValue) {
    if (!searchValue) return;
    const historyWords = [...this.data.historyWords];
    const idx = historyWords.indexOf(searchValue);
    if (idx !== -1) historyWords.splice(idx, 1);
    historyWords.unshift(searchValue);
    if (historyWords.length > 10) historyWords.length = 10;
    this.setData({ searchValue, historyWords });
    wx.setStorageSync('search_history', historyWords);
    wx.navigateTo({ url: `/pages/search/results/index?q=${encodeURIComponent(searchValue)}` });
  },

  confirm() {
    const historyWords = [...this.data.historyWords];
    const { deleteType, deleteIndex } = this;
    if (deleteType === 0) historyWords.splice(deleteIndex, 1);
    else historyWords.length = 0;
    this.setData({ historyWords, dialogShow: false });
    wx.setStorageSync('search_history', historyWords);
  },

  close() { this.setData({ dialogShow: false }); },

  handleClearHistory() {
    const { dialog } = this.data;
    this.deleteType = 1;
    this.setData({ dialog: { ...dialog, message: '确认删除所有历史记录' }, dialogShow: true });
  },

  deleteCurr(e) {
    const { index } = e.currentTarget.dataset;
    const { dialog } = this.data;
    this.deleteIndex = index;
    this.deleteType = 0;
    this.setData({ dialog: { ...dialog, message: '确认删除当前历史记录' }, dialogShow: true });
  },

  handleHistoryTap(e) {
    const { historyWords } = this.data;
    const { index } = e.currentTarget.dataset;
    const searchValue = historyWords[index || 0] || '';
    this.setHistoryWords(searchValue);
  },

  handleSubmit(e) {
    const { value } = e.detail;
    if (!value) return;
    this.setHistoryWords(value);
  },

  actionHandle() {
    this.setData({ searchValue: '' });
    wx.switchTab({ url: '/pages/home/index' });
  }
});