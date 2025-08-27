const app = getApp();
import config from '../../config';
let __msgSeq = 0;

Page({
  data: {
    messages: [],
    listAll: [],
    listComment: [],
    listLike: [],
    listCollect: [],
    listFollow: [],
    listSystem: [],
    activeTab: 'all',
    blocked: false,
  },
  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar && tabBar.setTabBarValue) {
      tabBar.setTabBarValue('message');
    }
    const token = wx.getStorageSync('access_token');
    if (!token) {
      this.setData({
        blocked: true
      });
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 1200
      });
      if (this.loginRedirectTimer) clearTimeout(this.loginRedirectTimer);
      this.loginRedirectTimer = setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/index?from=message'
        });
      }, 1200);
      return;
    }
    this.setData({
      blocked: false
    });
    // 初始化去重集合
    if (!this._seen) this._seen = new Set();
    // 从全局总线订阅消息
    const bus = app.globalData && app.globalData.bus;
    if (bus && !this._wsHandler) {
      this._wsHandler = (payload) => this.handleIncoming(payload, 'bus');
      bus.on('ws-message', this._wsHandler);
    }
    // 消费全局待处理消息（包括欢迎消息）
    const pending = (app.globalData && app.globalData.pendingMessages) || [];
    if (pending.length) {
      pending.forEach((p) => this.handleIncoming(p, 'pending'));
      app.globalData.pendingMessages = [];
    }
    this.ensureWs();
    this.recomputeLists();
  },
  onUnload() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    const bus = app.globalData && app.globalData.bus;
    if (bus && this._wsHandler) {
      bus.off('ws-message', this._wsHandler);
      this._wsHandler = null;
    }
    if (this.loginRedirectTimer) {
      clearTimeout(this.loginRedirectTimer);
      this.loginRedirectTimer = null;
    }
  },
  ensureWs() {
    if (this.ws && this.ws.readyState === 1) return;
    const token = wx.getStorageSync('access_token');
    if (!token) return;
    // 优先使用全局长连
    if (app.ws && app.ws.readyState === 1) return;
    const BASE = (config && (config.baseUrl || (config.config && config.config.baseUrl))) || '';
    const WS_BASE = BASE.replace(/^http/, 'ws');
    const url = `${WS_BASE}/ws?token=${encodeURIComponent(token)}`;
    const ws = wx.connectSocket({
      url
    });
    this.ws = ws;
    ws.onOpen(() => {});
    ws.onMessage((evt) => {
      try {
        const msg = JSON.parse(evt.data);
        this.handleIncoming(msg, 'ws');
      } catch (_) {}
    });
    ws.onClose(() => {});
    ws.onError(() => {});
  },
  handleIncoming(payload, origin) {
    try {
      console.log('MessagePage handleIncoming:', payload);
    } catch (_) {}
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    const normalizeAvatar = (u) => {
      if (!u) return '';
      if (u.startsWith('http')) return u;
      if (u.startsWith('/uploads')) {
        const BASE = (config && (config.baseUrl || (config.config && config.config.baseUrl))) || '';
        return `${BASE}${u}`;
      }
      return u;
    };
    let item = null;
    const fp = (() => {
      try {
        const t = payload && payload.type || '';
        const d = payload && payload.data || {};
        // 结合类型与关键字段生成指纹，避免重复入列
        return [t, d.noteId || '', d.title || d.noteTitle || '', d.fromNickname || '', d.desc || ''].join('|');
      } catch (_) {
        return '';
      }
    })();
    if (this._seen && fp) {
      if (this._seen.has(fp)) {
        // 已处理过，避免重复
        return;
      }
    }
    switch (payload.type) {
      case 'like':
        item = {
          type: 'like',
          title: '点赞提醒',
          desc: `${payload.data && payload.data.fromNickname ? payload.data.fromNickname : '有人'} 点赞了你的游记《${payload.data && payload.data.noteTitle ? payload.data.noteTitle : ''}》`,
          avatar: normalizeAvatar(payload.data && payload.data.fromAvatar ? payload.data.fromAvatar : '/assets/我的游记.png'),
          noteId: payload.data && payload.data.noteId ? payload.data.noteId : null,
          noteTitle: payload.data && payload.data.noteTitle ? payload.data.noteTitle : '',
          time,
        };
        break;
      case 'comment':
        item = {
          type: 'comment',
          title: '评论提醒',
          desc: `${payload.data && payload.data.fromNickname ? payload.data.fromNickname : '有人'} 评论了你的游记《${payload.data && payload.data.noteTitle ? payload.data.noteTitle : ''}》`,
          avatar: normalizeAvatar(payload.data && payload.data.fromAvatar ? payload.data.fromAvatar : '/assets/审核登入.png'),
          noteId: payload.data && payload.data.noteId ? payload.data.noteId : null,
          noteTitle: payload.data && payload.data.noteTitle ? payload.data.noteTitle : '',
          time,
        };
        break;
      case 'collect':
        item = {
          type: 'collect',
          title: '收藏提醒',
          desc: `${payload.data && payload.data.fromNickname ? payload.data.fromNickname : '有人'} 收藏了你的游记《${payload.data && payload.data.noteTitle ? payload.data.noteTitle : ''}》`,
          avatar: normalizeAvatar(payload.data && payload.data.fromAvatar ? payload.data.fromAvatar : '/assets/我的游记.png'),
          noteId: payload.data && payload.data.noteId ? payload.data.noteId : null,
          noteTitle: payload.data && payload.data.noteTitle ? payload.data.noteTitle : '',
          time,
        };
        break;
      case 'follow':
        item = {
          type: 'follow',
          title: '关注提醒',
          desc: `${payload.data && payload.data.fromNickname ? payload.data.fromNickname : '有人'} 关注了你`,
          avatar: normalizeAvatar(payload.data && payload.data.fromAvatar ? payload.data.fromAvatar : '/assets/我的游记.png'),
          time,
        };
        break;
      case 'note_review': {
        const action = (payload.data && payload.data.action) || '';
        const title = '审核通知';
        const noteTitle = (payload.data && payload.data.noteTitle) || '';
        let desc = '';
        if (action === 'approved') {
          desc = `你的游记《${noteTitle}》已通过审核`;
        } else if (action === 'rejected') {
          const reason = (payload.data && payload.data.reason) || '';
          desc = `你的游记《${noteTitle}》未通过审核${reason ? '，理由：' + reason : ''}`;
        } else if (action === 'deleted') {
          desc = `你的游记《${noteTitle}》已被删除`;
        } else {
          desc = `你的游记《${noteTitle}》审核状态已更新`;
        }
        item = {
          type: 'system',
          title,
          desc,
          avatar: `${((config && (config.baseUrl || (config.config && config.config.baseUrl))) || '')}/uploads/system.jpg`,
          noteId: payload.data && payload.data.noteId ? payload.data.noteId : null,
          noteTitle,
          time,
        };
        break;
      }
      default:
        if (payload.type === 'system') {
          const desc = payload.data && payload.data.desc ? payload.data.desc : '';
          if (!desc) return;
          item = {
            type: 'system',
            title: (payload.data && payload.data.title) || '系统通知',
            desc,
            avatar: `${((config && (config.baseUrl || (config.config && config.config.baseUrl))) || '')}/uploads/system.jpg`,
            time
          };
        } else {
          return;
        }
    }
    // 标记为未读，用于页面内红点展示
    if (item) {
      item.unread = true;
      item._k = `${Date.now()}_${__msgSeq++}`;
    }
    const list = [item, ...this.data.messages].slice(0, 200);
    // 记录指纹
    if (this._seen && fp) this._seen.add(fp);
    this.setData({
      messages: list
    }, () => this.recomputeLists());

    // 统一以列表未读数量为准，刷新角标并广播
    try {
      const appInst = getApp();
      const remaining = list.filter(v => v && v.unread).length;
      appInst.globalData.unreadCount = remaining;
      const tb = this.getTabBar && this.getTabBar();
      if (tb && tb.setUnread) tb.setUnread(remaining);
      if (appInst.globalData && appInst.globalData.bus) {
        appInst.globalData.bus.emit('unread-change', remaining);
      }
    } catch (_) {}
  },
  onMessageTap(e) {
    const {
      noteId,
      type,
      key
    } = e.currentTarget.dataset || {};
    // 将当前点击的消息标记为已读
    const arr = (this.data.messages || []).slice();
    if (key) {
      const pos = arr.findIndex(v => v && v._k === key);
      if (pos >= 0 && arr[pos]) arr[pos].unread = false;
    }
    this.setData({
      messages: arr
    }, () => this.recomputeLists());
    // 根据剩余未读数刷新Tab红点
    try {
      const appInst = getApp();
      const remaining = (this.data.messages || []).filter(v => v && v.unread).length;
      appInst.globalData.unreadCount = remaining;
      const tb = this.getTabBar && this.getTabBar();
      if (tb && tb.setUnread) tb.setUnread(remaining);
      // 广播未读变化，保证其它 Tab 也更新
      if (appInst.globalData && appInst.globalData.bus) {
        appInst.globalData.bus.emit('unread-change', remaining);
      }
    } catch (_) {}
    if (!noteId) {
      // wx.showToast({ title: '该消息无跳转目标', icon: 'none' });
      return;
    }
    // 点赞/评论/收藏跳转详情
    wx.navigateTo({
      url: `/pages/details/index?noteId=${noteId}`
    });
  },
  recomputeLists() {
    const list = this.data.messages || [];
    this.setData({
      listAll: list,
      listComment: list.filter(v => v.type === 'comment'),
      listLike: list.filter(v => v.type === 'like'),
      listCollect: list.filter(v => v.type === 'collect'),
      listFollow: list.filter(v => v.type === 'follow'),
      listSystem: list.filter(v => v.type === 'system'),
    });
  },
  onTabChange(e) {
    const {
      value
    } = e.detail || {};
    if (value) {
      this.setData({
        activeTab: value
      });
    }
  },
  onBackToHome() {
    wx.switchTab({
      url: '/pages/home/index'
    });
  }
})