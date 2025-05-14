// pages/mynotes/index.js
import {
  notesApi
} from '~/api/request';
import {
  userApi
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
const statusMap = {
  approved: '已通过',
  rejected: '未通过',
  pending: '待审核'
};
const statusStyleMap = {
  approved: {
    bg: '#e6f4ea', // 浅绿色背景
    text: '#389e0d' // 深绿色文字
  },
  rejected: {
    bg: '#fff1f0', // 浅红色背景
    text: '#cf1322' // 深红色文字
  },
  pending: {
    bg: '#fffbe6', // 浅黄色背景
    text: '#d48806' // 深黄色文字
  },
  default: {
    bg: '#f0f0f0',
    text: '#666'
  }
};
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

      //   wx.showLoading({
      //     title: '加载中...',
      //     mask: true
      //   });

      const userRes = await userApi.getProfile();
      if (userRes.code !== 1 || !userRes.data || !userRes.data.id) {
        throw new Error('获取用户信息失败');
      }
      const userId = userRes.data.id;

      const res = await notesApi.getUserNotes(userId);

      wx.hideLoading();

      if (res.code === 1) {
        const BASE_URL = 'http://localhost:3300';
        const notesList = (res.data || []).map(note => ({
          ...note,
          images: note.images.map(img => processResourcePath(img)),
          shortContent: note.content?.length > 50 ? note.content.slice(0, 50) + '...' : note.content || '',
          statusText: statusMap[note.status?.toLowerCase()] || '未知状态',
          statusStyle: statusStyleMap[note.status?.toLowerCase()] || statusStyleMap.default
          // images: note.images
          //   ? note.images.map(img => img.startsWith('http') ? img : BASE_URL + img)
          //   : [],
          //   avatar: note.avatar || '/assets/images/default-avatar.png',
          //   nickname: note.nickname || '游客'
        }));
        console.log("noteslist:", notesList)
        this.setData({
          notesList,
          isEmpty: notesList.length === 0
        });
      } else if (res.code === 401 || res.code === 403) {
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

  onDeleteTravelNote(e) {
    const {
      travelNote
    } = e.detail;
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
    const {
      travelNote
    } = e.detail;
    // 处理图片和视频数据
    const files = [];

    // 添加图片
    if (travelNote.images && travelNote.images.length > 0) {
      travelNote.images.forEach(imgUrl => {
        files.push({
          type: 'image',
          url: imgUrl,
          tempFilePath: imgUrl
        });
      });
    }

    // 添加视频
    if (travelNote.video_url) {
      files.push({
        type: 'video',
        url: travelNote.video_url,
        tempFilePath: travelNote.video_url
      });
    }

    // 构建要传递的数据
    const editData = {
      ...travelNote,
      files
    };

    // 将游记数据编码后传递到编辑页面
    const url = `/pages/edit/index?data=${encodeURIComponent(JSON.stringify(editData))}`;
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

  loadNotes: function () {
    // TODO: 实现加载笔记的逻辑
  }
})