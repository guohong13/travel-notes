// pages/mynotes/index.js
import { notesApi } from '~/api/request';

Page({

  /**
   * 页面的初始数据
   */
  data: {
    notesList: []
  },

  async onReady() {
    await this.loadNotesList();
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad() {
    await this.loadNotesList();
  },

  async loadNotesList() {
    try {
      const token = wx.getStorageSync('access_token');
      if (!token) {
        wx.redirectTo({
          url: '/pages/login/index'
        });
        return;
      }

      wx.showLoading({
        title: '加载中...',
        mask: true
      });

      const res = await notesApi.getUserNotes();

      wx.hideLoading();

      if (res.code === 1) {
        // 处理空数据的情况
        const notesList = res.data || [];
        this.setData({
          notesList,
          isEmpty: notesList.length === 0
        });
      } else if (res.code === 401 || res.code === 403) {
        // token失效，需要重新登录
        wx.removeStorageSync('access_token');
        const app = getApp();
        app.globalData.isLoggedIn = false;
        
        wx.showToast({
          title: '登录已过期，请重新登录',
          icon: 'none',
          duration: 2000,
          success: () => {
            setTimeout(() => {
              wx.redirectTo({
                url: '/pages/login/index'
              });
            }, 2000);
          }
        });
      } else {
        throw new Error(res.message || '加载失败');
      }
    } catch (error) {
      console.error('加载游记列表失败:', error);
      wx.hideLoading();
      
      wx.showToast({
        title: error.message || '加载失败，请稍后重试',
        icon: 'none',
        duration: 2000
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
      success: async (res) => {
        if (res.confirm) {
          try {
            const deleteRes = await notesApi.deleteNote(travelNote.id);
            if (deleteRes.code === 1) {
              // 从列表中删除该游记
              const newList = this.data.notesList.filter(item => item.id !== travelNote.id);
              this.setData({
                notesList: newList
              });
              
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
            } else {
              throw new Error(deleteRes.message || '删除失败');
            }
          } catch (error) {
            console.error('删除游记失败:', error);
            wx.showToast({
              title: error.message || '删除失败，请重试',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  onEditTravelNote(e) {
    const { travelNote } = e.detail;
    // 将游记数据编码后传递到编辑页面
    const url = `/pages/edit/index?data=${encodeURIComponent(JSON.stringify(travelNote))}`;
    console.log('跳转URL:', url);
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
  onBackToHome() {
    wx.switchTab({
      url: '/pages/home/index',
    });
  },
  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    const token = wx.getStorageSync('access_token');
    
    // 如果已登录，直接显示页面内容
    if (token) {
      // 加载笔记数据
      this.loadNotesList();
    } else {
      // 如果未登录，跳转到登录页面
      wx.redirectTo({
        url: '/pages/login/index'
      });
      return;
    }

    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setTabBarValue('mynotes');
    }
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

  },

  loadNotes: function() {
    // TODO: 实现加载笔记的逻辑
  }
})