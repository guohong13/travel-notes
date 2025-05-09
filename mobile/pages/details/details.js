// import { CubeTextureLoader } from "XrFrame/loader";

// pages/details.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    travelNote: {
        avatar: '',
        nickname: '',
        desc: '',
        content: '',
        mediaList: []
      }, // 完整的游记数据
    currentIndex: 0,
    isLiked: false,
    likeCount: 0,
    isCollected: false,
    isCommentInputShow: false,
    commentContent: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 从页面参数中获取传入的数据
    const travelNoteStr = decodeURIComponent(options.travelNote);
    const travelNote = JSON.parse(travelNoteStr);
    
    // 打印图片路径进行调试
    // travelNote.mediaList.forEach(item => {
    //     if (item.type === 'image') {
    //         console.log('图片路径:', item.url);
    //     }
    // });
    // 更新页面数据
    this.setData({
      travelNote
    });
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
  onSwiperChange(e) {
    this.setData({
      currentIndex: e.detail.current
    });
  },
  onImageTap() {
    // 获取当前图片的 URL
    const currentImage = this.data.travelNote.mediaList[this.data.currentIndex].url;
    // 过滤出 mediaList 中的图片链接
    const imageUrls = this.data.travelNote.mediaList.filter(item => item.type === 'image').map(item => item.url);
    console.log('imageUrls:', imageUrls);
    console.log('currentImage:', currentImage);
    wx.previewImage({
      urls: imageUrls,
      current: currentImage,
    });
  },
  onVideoTap() {
    const currentVideo = this.data.travelNote.mediaList[this.data.currentIndex].url;
    wx.previewMedia({
        current: 0, // 当前显示的视频序号，默认为0
        sources: [
          {
            url: currentVideo, // 需要预览的视频链接
            type: 'video' // 明确指定类型为视频
          }
        ]
      })      
  },
  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const { title } = this.data.travelNote;
    const { url } = this.data.travelNote.mediaList[0];
    return {
      title,
      path: `/pages/details/details?travelNote=${encodeURIComponent(JSON.stringify(this.data.travelNote))}`,
      imageUrl: url
    }
  },
  /**
   * 点赞事件处理函数
   */
  onLikeTap() {
    let { isLiked, likeCount } = this.data;
    if (isLiked) {
      likeCount--;
    } else {
      likeCount++;
    }
    this.setData({
      isLiked: !isLiked,
      likeCount
    });
    // 这里可以添加实际的点赞请求逻辑，比如发送请求到服务器
  },

  /**
   * 收藏事件处理函数
   */
  onCollectTap() {
    let { isCollected } = this.data;
    this.setData({
      isCollected: !isCollected
    });
    // 这里可以添加实际的收藏请求逻辑，比如发送请求到服务器
  },

  /**
   * 显示评论输入框
   */
  onCommentTap() {
    this.setData({
      isCommentInputShow: true
    });
  },

  /**
   * 评论输入事件处理函数
   */
  onCommentInput(e) {
    this.setData({
      commentContent: e.detail.value
    });
  },

  /**
   * 提交评论事件处理函数
   */
  onSubmitComment() {
    const { commentContent } = this.data;
    if (commentContent.trim()) {
      // 这里可以添加实际的提交评论请求逻辑，比如发送请求到服务器
      console.log('提交的评论内容：', commentContent);
      this.setData({
        isCommentInputShow: false,
        commentContent: ''
      });
    } else {
      wx.showToast({
        title: '评论内容不能为空',
        icon: 'none'
      });
    }
  },

  /**
   * 取消评论事件处理函数
   */
  onCancelComment() {
    this.setData({
      isCommentInputShow: false,
      commentContent: ''
    });
  },
})