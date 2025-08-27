Component({
  options: {
    styleIsolation: 'shared'
  },
  properties: {
    navType: {
      type: String,
      value: 'title'
    },
    titleText: String
  },
  data: {
    statusHeight: 0
  },
  lifetimes: {
    ready() {
      const {
        statusBarHeight
      } = wx.getWindowInfo();
      this.setData({
        statusHeight: statusBarHeight
      });
    }
  },
  methods: {
    searchTurn() {
      wx.navigateTo({
        url: '/pages/search/index'
      });
    }
  }
});