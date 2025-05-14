Component({
  options: {
    styleIsolation: 'shared',
  },
  properties: {
    navType: {
      type: String,
      value: 'title',
    },
    titleText: String,
  },
  data: {
    statusHeight: 0,
  },
  lifetimes: {
    ready() {
      const statusHeight = wx.getWindowInfo().statusBarHeight;
      this.setData({
        statusHeight
      });
    },
  },
  methods: {
    searchTurn() {
      wx.navigateTo({
        url: `/pages/search/index`,
      });
    },
  },
});