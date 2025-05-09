// pages/mynotes/index.js
import request from '~/api/request';

Page({

  /**
   * 页面的初始数据
   */
  data: {
    notesList: []
  },

  async onReady() {
    const [cardRes, swiperRes] = await Promise.all([
      request('/home/cards').then((res) => res.data),
      request('/home/swipers').then((res) => res.data),
    ]);

    this.setData({
      cardInfo: cardRes.data,
      focusCardInfo: cardRes.data.slice(0, 3),
      swiperList: swiperRes.data,
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad() {
    await this.loadNotesList();
  },

  async loadNotesList() {
    try {
      const res = await request('/mynotes/list');
      if (res.code === 200) {
        this.setData({
          notesList: res.data
        });
      }
    } catch (error) {
      console.error('加载游记列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  goToPublish() {
    wx.switchTab({
      url: '/pages/release/index',
    });
  },

  onDeleteTravelNote(e) {
    const { travelNote } = e.detail;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这篇游记吗？',
      success: (res) => {
        if (res.confirm) {
          // 从列表中删除该游记
          const newList = this.data.notesList.filter(item => item.id !== travelNote.id);
          this.setData({
            notesList: newList
          });
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  onEditTravelNote(e) {
    const { travelNote } = e.detail;
    // 将游记数据编码后传递到编辑页面
    const url = `/pages/edit/index?data=${encodeURIComponent(JSON.stringify(travelNote))}`;
    console.log('跳转URL:', url); // 添加日志
    wx.navigateTo({
      url,
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadNotesList().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})