const app = getApp();

Component({
  data: {
    value: '', // 初始值设置为空，避免第一次加载时闪烁
    list: [
      {
        icon: 'home',
        value: 'home',
        label: '首页',
      },
      {
        icon: 'add',
        value: 'release',
        label: '发布',
      },
      {
        icon: 'user',
        value: 'my',
        label: '我的',
      },
    ],
    isLoggedIn: false // 定义 isLoggedIn
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
    // 新增更新tabBar状态的方法
    updateTabBar() {
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];
      if (curPage) {
        const nameRe = /pages\/(\w+)\/index/.exec(curPage.route);
        if (nameRe && nameRe[1]) {
          this.setData({
            value: nameRe[1]
          });
        }
      }
    },
    handleChange(e) {
      const { value } = e.detail;
      
      if (value === 'release') {
        if (!this.data.isLoggedIn) {
          wx.showModal({
            title: '提示',
            content: '你还未登录，是否现在进行登录？',
            success: (res) => {
              if (res.confirm) {
                wx.navigateTo({
                  url: '/pages/login/login' 
                });
              } else if (res.cancel) {
                // 取消登录时，保持当前页面状态
                this.updateTabBar();
              }
            }
          });
        } else {
          this.setData({ value });
          wx.switchTab({ url: `/pages/${value}/index` });
          this.updateTabBar();
        }
      } else {
        this.setData({ value });
        wx.switchTab({ url: `/pages/${value}/index` });
        this.updateTabBar();
      }
    },
  }
});
