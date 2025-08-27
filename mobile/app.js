import config from './config';
import createBus from './utils/eventBus';

App({
  onLaunch() {
    // 检查更新
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      updateManager.onCheckForUpdate(function (res) {
        if (res.hasUpdate) {
          updateManager.onUpdateReady(function () {
            wx.showModal({
              title: '更新提示',
              content: '新版本已经准备好，是否重启应用？',
              success: function (res) {
                if (res.confirm) {
                  updateManager.applyUpdate();
                }
              }
            });
          });
          updateManager.onUpdateFailed(function () {
            wx.showModal({
              title: '已经有新版本了哟~',
              content: '新版本已经上线啦~，请您删除当前小程序，重新搜索打开哟~'
            });
          });
        }
      });
    }
    // 从本地缓存检查登录状态
    const token = wx.getStorageSync('access_token');
    if (token) {
      this.globalData.isLoggedIn = true;
      this.globalData.token = token;
      this.initWebSocket(token);
    }
  },

  globalData: {
    userInfo: null,
    isLoggedIn: false,
    token: null,
    bus: createBus(),
    pendingMessages: [],
    unreadCount: 0,
    hasWelcomed: false,
  },

  initWebSocket(token) {
    try {
      if (!token) return;
      if (this.ws && this.ws.readyState === 1) return;
      const BASE = (config && (config.baseUrl || (config.config && config.config.baseUrl))) || '';
      const WS_BASE = BASE.replace(/^http/, 'ws');
      const url = `${WS_BASE}/ws?token=${encodeURIComponent(token)}`;
      const ws = wx.connectSocket({
        url
      });
      this.ws = ws;
      const pushIncoming = (msg) => {
        try {
          // 进入全局待处理队列，供消息页在未打开时也能消费
          this.globalData.pendingMessages.push(msg);
          if (this.globalData.pendingMessages.length > 200) {
            this.globalData.pendingMessages.shift();
          }
          // 广播给当前已订阅的页面
          this.globalData.bus.emit('ws-message', msg);
          // 更新未读计数
          try {
            const isWelcome = msg && msg.type === 'system' && msg.data && msg.data.isWelcome;
            if (!isWelcome) {
              this.globalData.unreadCount = (this.globalData.unreadCount || 0) + 1;
            }
          } catch (_) {
            this.globalData.unreadCount = (this.globalData.unreadCount || 0) + 1;
          }
          // 刷新自定义 tab-bar 红点
          const pages = getCurrentPages();
          const cur = pages[pages.length - 1];
          if (cur && cur.getTabBar) {
            const tb = cur.getTabBar();
            if (tb && tb.setUnread) tb.setUnread(this.globalData.unreadCount);
          }
          // 广播未读变化，便于所有 tabbar 同步
          try {
            this.globalData.bus.emit('unread-change', this.globalData.unreadCount);
          } catch (_) {}
        } catch (_) {}
      };

      ws.onOpen(() => {
        // 连接成功，发一条系统欢迎消息
        try {
          if (!this.globalData.hasWelcomed) {
            this.globalData.hasWelcomed = true;
            pushIncoming({
              type: 'system',
              data: {
                title: '系统通知',
                desc: '欢迎登录！',
                isWelcome: true
              }
            });
          }
        } catch (_) {}
      });
      ws.onMessage((evt) => {
        try {
          const msg = JSON.parse(evt.data);
          pushIncoming(msg);
        } catch (_) {}
      });
      ws.onError(() => {});
      ws.onClose(() => {
        // 重连
        setTimeout(() => {
          const latest = wx.getStorageSync('access_token');
          if (latest) this.initWebSocket(latest);
        }, 2000);
      });
    } catch (_) {}
  }
});