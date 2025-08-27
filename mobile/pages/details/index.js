import { processResourcePath } from '../../utils/path';

Page({
  data: {
    travelNote: {
      avatar: '',
      nickname: '',
      desc: '',
      content: '',
      mediaList: [],
    },
    currentIndex: 0,
    isLiked: false,
    likeCount: 0,
    collectCount: 0,
    indicatorDots: true,
    isCollected: false,
    isCommentInputShow: false,
    commentContent: '',
    commentList: [],
    noteId: null,
    isFollowing: false,
    isOwnNote: false,
    authorId: null,
    commentSort: 'time',
    noteTimeText: ''
  },

  onLoad(options) {
    let travelNote = null;
    if (options.travelNote) {
      const travelNoteStr = decodeURIComponent(options.travelNote);
      travelNote = JSON.parse(travelNoteStr);
    }
    const incomingNoteId = options.noteId ? parseInt(options.noteId) : null;

    // 直接传递游记对象
    if (travelNote) {
      this.setData({
        travelNote,
        noteId: travelNote.id,
        authorId: travelNote.user_id
      });
    }
    // 传递游记noteId重新发送请求
    else if (incomingNoteId) {
      this.setData({ noteId: incomingNoteId });
      const { notesApi } = require('~/api/request');
      notesApi.getNoteDetail(incomingNoteId).then(res => {
        if (res.code === 1 && res.data) {
          const note = res.data;
          const mediaList = [];
          if (Array.isArray(note.images)) {
            note.images.forEach(img => {
              const url = processResourcePath(img);
              if (url) mediaList.push({ type: 'image', url });
            });
          }
          if (note.video_url) {
            const vurl = processResourcePath(note.video_url);
            if (vurl) mediaList.push({ type: 'video', url: vurl });
          }
          const normalized = {
            id: note.id,
            user_id: note.user_id,
            avatar: processResourcePath(note.avatar_url),
            nickname: note.nickname,
            title: note.title,
            content: note.content,
            mediaList,
            created_at: note.created_at,
            updated_at: note.updated_at,
            // 位置相关字段
            locationName: note.location_name || '',
            address: note.location_address || '',
            location: (typeof note.location_lat === 'number' && typeof note.location_lng === 'number')
              ? { latitude: note.location_lat, longitude: note.location_lng }
              : null,
          };
          this.setData({
            travelNote: normalized,
            authorId: note.user_id
          });
          this.computeNoteTimeText(note);
          this.getLikeStatus();
          this.getCollectStatus();
          this.getFollowStatus();
          this.checkIsOwnNote();
          this.getCommentList();
        } else {
          wx.showToast({ title: '游记不存在或未通过审核', icon: 'none' });
        }
      }).catch(err => {
        wx.showToast({ title: '获取游记详情失败', icon: 'none' });
      });
      return;
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      return;
    }

    this.computeNoteTimeText(travelNote);
    this.getLikeStatus();
    this.getCollectStatus();
    this.getFollowStatus();
    this.checkIsOwnNote();
    this.getCommentList();
  },

  onSwiperChange(e) {
    this.setData({
      currentIndex: e.detail.current
    });
  },

  onImageTap() {
    const currentImage = this.data.travelNote.mediaList[this.data.currentIndex].url;
    const imageUrls = this.data.travelNote.mediaList.filter(item => item.type === 'image').map(item => item.url);
    wx.previewImage({
      urls: imageUrls,
      current: currentImage,
    });
  },

  onVideoTap() {
    const currentVideo = this.data.travelNote.mediaList[this.data.currentIndex].url;
    wx.previewMedia({
      current: 0,
      sources: [{
        url: currentVideo,
        type: 'video'
      }]
    })
  },

  onShareAppMessage() {
    const { title } = this.data.travelNote;
    const { url } = this.data.travelNote.mediaList[0];
    return {
      title,
      path: `/pages/details/index?travelNote=${encodeURIComponent(JSON.stringify(this.data.travelNote))}`,
      imageUrl: url
    }
  },

  getLikeStatus() {
    const { noteId } = this.data;
    if (!noteId) return;

    const { notesApi } = require('~/api/request');
    notesApi.getLikeStatus(noteId).then(res => {
      if (res.code === 1) {
        this.setData({
          isLiked: res.data.isLiked,
          likeCount: res.data.likeCount
        });
      }
    }).catch(err => {});
  },

  onLikeTap() {
    const { noteId } = this.data;
    if (!noteId) {
      wx.showToast({
        title: '游记信息错误',
        icon: 'none'
      });
      return;
    }

    const { notesApi } = require('~/api/request');
    notesApi.toggleLike(noteId).then(res => {
      if (res.code === 1) {
        this.setData({
          isLiked: res.data.isLiked,
          likeCount: res.data.likeCount
        });
        
        wx.showToast({
          title: res.data.isLiked ? '点赞成功' : '取消点赞成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.message || '操作失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      });
    });
  },

  onCollectTap() {
    const { noteId } = this.data;
    if (!noteId) {
      wx.showToast({ title: '游记信息错误', icon: 'none' });
      return;
    }
    const { notesApi } = require('~/api/request');
    notesApi.toggleCollect(noteId).then(res => {
      if (res.code === 1) {
        this.setData({
          isCollected: res.data.isCollected,
          collectCount: res.data.collectCount,
        });
        wx.showToast({
          title: res.data.isCollected ? '收藏成功' : '取消收藏成功',
          icon: 'success'
        });
      } else {
        wx.showToast({ title: res.message || '操作失败', icon: 'none' });
      }
    }).catch(err => {
      wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
    });
  },

  getCollectStatus() {
    const { noteId } = this.data;
    if (!noteId) return;
    const { notesApi } = require('~/api/request');
    notesApi.getCollectStatus(noteId).then(res => {
      if (res.code === 1) {
        this.setData({
          isCollected: res.data.isCollected,
          collectCount: res.data.collectCount,
        });
      }
    }).catch(err => {});
  },

  onCommentTap() {
    this.setData({
      isCommentInputShow: true
    });
  },

  onCommentInput(e) {
    this.setData({
      commentContent: e.detail.value
    });
  },

  onSubmitComment() {
    const { commentContent, noteId } = this.data;

    if (!commentContent || !commentContent.trim()) {
      wx.showToast({
        title: '评论内容不能为空',
        icon: 'none'
      });
      return;
    }

    if (!noteId) {
      wx.showToast({
        title: '游记信息错误',
        icon: 'none'
      });
      return;
    }

    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    const { notesApi } = require('~/api/request');
    wx.showLoading({ title: '正在发布...', mask: true });
    notesApi.addComment(noteId, commentContent.trim())
      .then(res => {
        wx.hideLoading();
        if (res.code === 1) {
          wx.showToast({ title: '评论成功', icon: 'success' });
          this.setData({
            isCommentInputShow: false,
            commentContent: ''
          });
          this.getCommentList();
        } else {
          wx.showToast({ title: res.message || '评论失败', icon: 'none' });
        }
      })
      .catch(err => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
      });
  },

  onCancelComment() {
    this.setData({
      isCommentInputShow: false,
      commentContent: ''
    });
  },

  getFollowStatus() {
    const { authorId } = this.data;
    
    if (!authorId) {
      return;
    }

    const userInfo = wx.getStorageSync('userInfo');
    
    if (!userInfo || !userInfo.id) {
      const token = wx.getStorageSync('access_token');
      if (token) {
        const { userApi } = require('~/api/request');
        userApi.getProfile().then(res => {
          if (res.code === 1) {
            wx.setStorageSync('userInfo', res.data);
            this.getFollowStatus();
          }
        }).catch(err => {});
      }
      return;
    }

    if (userInfo.id === authorId) {
      return;
    }

    const { userApi } = require('~/api/request');
    userApi.getFollowStatus(authorId).then(res => {
      if (res.code === 1) {
        this.setData({
          isFollowing: res.data.isFollowing
        });
      }
    }).catch(err => {});
  },

  onFollowTap() {
    const { authorId, isFollowing } = this.data;
    
    if (!authorId) {
      wx.showToast({
        title: '作者信息错误',
        icon: 'none'
      });
      return;
    }

    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.id) {
      const token = wx.getStorageSync('access_token');
      if (token) {
        const { userApi } = require('~/api/request');
        userApi.getProfile().then(res => {
          if (res.code === 1) {
            wx.setStorageSync('userInfo', res.data);
            this.onFollowTap();
          } else {
            wx.showToast({
              title: '请先登录',
              icon: 'none'
            });
          }
        }).catch(err => {
          wx.showToast({
            title: '请先登录',
            icon: 'none'
          });
        });
      } else {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
      }
      return;
    }

    if (userInfo.id === authorId) {
      wx.showToast({
        title: '不能关注自己',
        icon: 'none'
      });
      return;
    }

    const { userApi } = require('~/api/request');
    userApi.followUser(authorId).then(res => {
      if (res.code === 1) {
        this.setData({
          isFollowing: res.data.isFollowing
        });
        
        wx.showToast({
          title: res.data.isFollowing ? '关注成功' : '取消关注成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.message || '操作失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      });
    });
  },

  checkIsOwnNote() {
    const { authorId } = this.data;
    
    if (!authorId) {
      return;
    }

    const userInfo = wx.getStorageSync('userInfo');
    
    if (userInfo && userInfo.id === authorId) {
      this.setData({
        isOwnNote: true
      });
    }
  },

  getCommentList() {
    const { noteId } = this.data;
    if (!noteId) return;

    const { notesApi } = require('~/api/request');
    notesApi.getCommentList(noteId).then(res => {
      if (res.code === 1) {
        const list = (res.data.list || []).map(item => ({
          ...item,
          avatar: processResourcePath(item.avatar || item.avatar_url),
          like_count: typeof item.like_count === 'number' ? item.like_count : 0,
          formattedTime: this.formatTime(item.created_at)
        }));
        const sorted = this.sortComments(list, this.data.commentSort);
        this.setData({ commentList: sorted });
      }
    }).catch(err => {});
  },

  formatTime(timeString) {
    if (!timeString) return '';
    const date = new Date(timeString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    const m = date.getMonth() + 1;
    const d = date.getDate();
    return `${m}月${d}日`;
  },

  sortComments(list, sort) {
    const arr = [...list].map(item => ({
      ...item,
      formattedTime: item.formattedTime || this.formatTime(item.created_at)
    }));
    if (sort === 'like') {
      arr.sort((a, b) => {
        const likeDiff = (b.like_count || 0) - (a.like_count || 0);
        if (likeDiff !== 0) return likeDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else {
      arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return arr;
  },

  onChangeCommentSort(e) {
    const { sort } = e.currentTarget.dataset;
    if (!sort || sort === this.data.commentSort) return;
    const sorted = this.sortComments(this.data.commentList, sort);
    this.setData({ commentSort: sort, commentList: sorted });
  },

  onCommentLike(e) {
    const { commentId } = e.detail || {};
    if (!commentId) return;

    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.id) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const list = [...this.data.commentList];
    const idx = list.findIndex(c => c.id === commentId);
    if (idx === -1) return;

    const prev = list[idx];
    const next = {
      ...prev,
      isLiked: !prev.isLiked,
      like_count: (prev.like_count || 0) + (prev.isLiked ? -1 : 1)
    };
    list[idx] = next;
    this.setData({ commentList: list });

    const { notesApi } = require('~/api/request');
    notesApi.toggleCommentLike(commentId)
      .then(res => {
        if (res.code === 1) {
          const synced = [...this.data.commentList];
          const i = synced.findIndex(c => c.id === commentId);
          if (i !== -1) {
            synced[i] = {
              ...synced[i],
              isLiked: res.data.isLiked,
              like_count: res.data.likeCount
            };
            this.setData({ commentList: synced });
          }
        } else {
          const rollback = [...this.data.commentList];
          const i = rollback.findIndex(c => c.id === commentId);
          if (i !== -1) {
            rollback[i] = prev;
            this.setData({ commentList: rollback });
          }
          wx.showToast({ title: res.message || '操作失败', icon: 'none' });
        }
      })
      .catch(() => {
        const rollback = [...this.data.commentList];
        const i = rollback.findIndex(c => c.id === commentId);
        if (i !== -1) {
          rollback[i] = prev;
          this.setData({ commentList: rollback });
        }
        wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
      });
  },

  computeNoteTimeText(note) {
    if (!note) return;
    const created = note.created_at;
    const fallback = note.updated_at;
    const timeStr = created || fallback || '';
    const formatted = this.formatNoteDatetime(timeStr);
    this.setData({ noteTimeText: formatted ? `发布于：${formatted}` : '' });
  },

  formatNoteDatetime(timeString) {
    if (!timeString) return '';
    const d = new Date(timeString);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${y}-${m}-${day} ${hh}:${mm}`;
  },
})