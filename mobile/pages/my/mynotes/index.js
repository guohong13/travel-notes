import {
  notesApi,
  userApi
} from '~/api/request';
import {
  processResourcePath
} from '../../../utils/path';

const statusMap = {
  approved: '已通过',
  rejected: '未通过',
  pending: '待审核'
};

const statusStyleMap = {
  approved: {
    bg: '#e6f4ea',
    text: '#389e0d'
  },
  rejected: {
    bg: '#fff1f0',
    text: '#cf1322'
  },
  pending: {
    bg: '#fffbe6',
    text: '#d48806'
  },
  default: {
    bg: '#f0f0f0',
    text: '#666'
  }
};

Page({
  data: {
    notesList: []
  },

  async onLoad() {
    await this.loadNotesList();
  },

  async loadNotesList() {
    try {
      const token = wx.getStorageSync('access_token');
      if (!token) {
        wx.navigateTo({
          url: '/pages/login/index?from=mynotes'
        });
        return;
      }

      const userRes = await userApi.getProfile();
      if (userRes.code !== 1 || !userRes.data || !userRes.data.id) {
        throw new Error('获取用户信息失败');
      }
      const userId = userRes.data.id;

      const res = await notesApi.getUserNotes(userId);

      wx.hideLoading();

      if (res.code === 1) {
        const notesList = (res.data || []).map(note => ({
          ...note,
          images: note.images.map(img => processResourcePath(img)),
          shortContent: note.content?.length > 50 ? note.content.slice(0, 50) + '...' : note.content || '',
          statusText: statusMap[note.status?.toLowerCase()] || '未知状态',
          statusStyle: statusStyleMap[note.status?.toLowerCase()] || statusStyleMap.default
        }));
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
              wx.navigateTo({
                url: '/pages/login/index?from=mynotes'
              });
            }, 2000);
          }
        });
      } else {
        throw new Error(res.message || '加载失败');
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '加载失败，请稍后重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  onShowRejectReason(e) {
    const reason = e.detail.reason;
    wx.showModal({
      title: '未通过原因',
      content: reason,
      showCancel: false,
      confirmText: '知道了'
    })
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
    const files = [];

    if (travelNote.images && travelNote.images.length > 0) {
      travelNote.images.forEach(imgUrl => {
        files.push({
          type: 'image',
          url: imgUrl,
          tempFilePath: imgUrl
        });
      });
    }

    if (travelNote.video_url) {
      files.push({
        type: 'video',
        url: travelNote.video_url,
        tempFilePath: travelNote.video_url
      });
    }

    const editData = {
      ...travelNote,
      files
    };

    const url = `/pages/edit/index?data=${JSON.stringify(editData)}`;
    wx.navigateTo({
      url,
      fail: (err) => {
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  onBackToMy() {
    wx.navigateBack();
  },

  onShow() {
    const token = wx.getStorageSync('access_token');

    if (token) {
      this.loadNotesList();
    } else {
      wx.navigateTo({
        url: '/pages/login/index?from=mynotes'
      });
      return;
    }
  },

  onPullDownRefresh() {
    this.loadNotesList().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});