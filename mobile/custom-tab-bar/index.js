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
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];
      if (curPage) {
        const nameRe = /pages\/(\w+)\/index/.exec(curPage.route);
        if (nameRe === null) return;
        if (nameRe[1] && nameRe) {
          this.setData({
            value: nameRe[1],
          });
        }
      }
    },
  },
  methods: {
    handleChange(e) {
    const { value } = e.detail;
    // wx.switchTab({ url: `/pages/${value}/index` });
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
            }
            else if (res.cancel) {
                this.setData({
                    value: 'home' 
                }, () => {
                    wx.switchTab({
                        url: '/pages/home/index' 
                    });
                });
            }}
        });
      } else {
        // 已登录，可进行发布相关操作
        console.log('用户已登录，可进行发布操作');
        this.setData({
            value
          });
          wx.switchTab({ url: `/pages/${value}/index` });
      }
    } else {
      this.setData({
        value
      });
      wx.switchTab({ url: `/pages/${value}/index` });
    }
    },
}});
