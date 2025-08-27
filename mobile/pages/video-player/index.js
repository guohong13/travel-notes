Page({
  data: {
    videoUrl: '',
  },

  onLoad(options) {
    if (options.url) {
      this.setData({
        videoUrl: decodeURIComponent(options.url)
      });
    }
  }
});