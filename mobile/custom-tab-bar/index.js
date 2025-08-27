Component({
  data: {
    value: 'home',
    color: '#7A7E83',
    selectedColor: '#3cc51f',
    unreadCount: 0,
    list: [{
        pagePath: '/pages/home/index',
        icon: 'home',
        value: 'home',
        text: '首页'
      },
      {
        pagePath: '/pages/release/index',
        icon: 'add',
        value: 'release',
        text: '发布',
        needLogin: true
      },
      {
        pagePath: '/pages/message/index',
        icon: 'chat',
        value: 'message',
        text: '消息',
        needLogin: true
      },
      {
        pagePath: '/pages/my/index',
        icon: 'user',
        value: 'my',
        text: '我的',
        needLogin: true
      }
    ]
  },
  lifetimes: {
    ready() {
      this.updateTabBar();
      try {
        const app = getApp();
        const unread = (app.globalData && app.globalData.unreadCount) || 0;
        if (unread !== this.data.unreadCount) this.setData({
          unreadCount: unread
        });
        const bus = app.globalData && app.globalData.bus;
        if (bus && !this._busHandler) {
          this._busHandler = () => {
            try {
              const next = Math.max(0, ((getApp().globalData && getApp().globalData.unreadCount) || 0));
              this.setData({
                unreadCount: next
              });
            } catch (_) {}
          };
          bus.on('ws-message', this._busHandler);
          this._unreadHandler = (num) => {
            try {
              const n = Math.max(0, parseInt(num) || 0);
              if (n !== this.data.unreadCount) this.setData({
                unreadCount: n
              });
            } catch (_) {}
          };
          bus.on('unread-change', this._unreadHandler);
        }
      } catch (_) {}
    },
    detached() {
      try {
        const app = getApp();
        const bus = app.globalData && app.globalData.bus;
        if (bus && this._busHandler) {
          bus.off('ws-message', this._busHandler);
          this._busHandler = null;
        }
        if (bus && this._unreadHandler) {
          bus.off('unread-change', this._unreadHandler);
          this._unreadHandler = null;
        }
      } catch (_) {}
    }
  },
  pageLifetimes: {
    show() {
      this.updateTabBar();
      const app = getApp();
      const unread = (app.globalData && app.globalData.unreadCount) || 0;
      if (unread !== this.data.unreadCount) this.setData({
        unreadCount: unread
      });
    }
  },
  methods: {
    setUnread(count) {
      this.setData({
        unreadCount: Math.max(0, parseInt(count) || 0)
      });
    },
    updateTabBar() {
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];
      if (!curPage) return;
      const route = curPage.route || '';
      const normalized = '/' + route;
      const item = this.data.list.find(it => it.pagePath === normalized);
      if (item && this.data.value !== item.value) this.setData({
        value: item.value
      });
    },
    async switchTab(e) {
      const value = e.detail.value;
      const item = this.data.list.find(it => it.value === value);
      if (!item) return;
      if (item.needLogin) {
        const token = wx.getStorageSync('access_token');
        if (!token) {
          const currentValue = this.data.value;
          wx.showToast({
            title: '请先登录',
            icon: 'none',
            duration: 1200
          });
          setTimeout(() => {
            const fromParam = item.value;
            wx.navigateTo({
              url: `/pages/login/index?from=${fromParam}`,
              success: () => this.setData({
                value: currentValue
              })
            });
          }, 800);
          return;
        }
      }
      this.setData({
        value
      });
      wx.switchTab({
        url: item.pagePath,
        fail: () => this.updateTabBar()
      });
    },
    setTabBarValue(value) {
      if (this.data.value !== value) this.setData({
        value
      });
    }
  }
});