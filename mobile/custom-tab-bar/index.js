const app = getApp();

Component({
  data: {
    value: 'home', // 当前选中的值
    color: "#7A7E83",
    selectedColor: "#3cc51f",
    list: [{
      pagePath: "/pages/home/index",
      icon: "home",
      value: "home",
      text: "首页"
    }, {
      pagePath: "/pages/release/index",
      icon: "add",
      value: "release",
      text: "发布",
      needLogin: true
    }, {
      pagePath: "/pages/mynotes/index",
      icon: "user",
      value: "mynotes",
      text: "我的",
      needLogin: true
    }]
  },
  lifetimes: {
    ready() {
      this.updateTabBar();
    },
  },
  pageLifetimes: {
    show() {
      // 每次页面显示时更新tabBar状态
      this.updateTabBar();
    }
  },
  methods: {
    // 更新tabBar状态的方法
    updateTabBar() {
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];
      if (curPage) {
        const route = curPage.route;
        const item = this.data.list.find(item => item.pagePath.includes(route));
        if (item) {
          this.setData({
            value: item.value
          });
        }
      }
    },
    
    async switchTab(e) {
      const value = e.detail.value;
      const item = this.data.list.find(item => item.value === value);
      
      if (!item) {
        console.error('未找到对应的tab项：', value);
        return;
      }

      // 检查是否需要登录
      if (item.needLogin) {
        const token = wx.getStorageSync('access_token');
        if (!token) {
          // 保存当前选中状态
          const currentValue = this.data.value;
          
          wx.showToast({
            title: '请先登录',
            icon: 'none',
            duration: 1500
          });
          
          setTimeout(() => {
            wx.navigateTo({
              url: '/pages/login/index',
              success: () => {
                // 恢复之前的选中状态
                this.setData({
                  value: currentValue
                });
              }
            });
          }, 1000);
          return;
        }
      }

      // 更新选中状态并跳转
      this.setData({
        value: value
      });

      wx.switchTab({
        url: item.pagePath,
        fail: (err) => {
          console.error('跳转失败：', err);
          // 跳转失败时恢复选中状态
          this.updateTabBar();
        }
      });
    },

    setTabBarValue(value) {
      this.setData({ value });
    }
  }
});
