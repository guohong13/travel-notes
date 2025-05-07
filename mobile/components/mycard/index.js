// components/mycard/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    travelNote: {
        coverImage: 'https://picsum.photos/200/200',
        title: '我的精彩游记',
        content: '这是一篇非常精彩的游记，记录了我在旅途中的点点滴滴，有美丽的风景、有趣的人物和难忘的经历。',
        status: '已审核'
      }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

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

  },
  onDeleteTravelNote(e) {
    console.log('删除游记:', e.detail.travelNote);
    // 这里可以添加实际的删除逻辑
  },
  onEditTravelNote(e) {
    console.log('编辑游记:', e.detail.travelNote);
    // 这里可以添加实际的编辑逻辑
  }
})