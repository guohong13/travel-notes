Component({
  properties: {
    url: String,
    desc: String,
    tags: Array,
    avatar:String,
    nickname:String,
  },
  data: {},
  methods: {
    details(e) {
        const { value } = e.detail;
        wx.switchTab({ url: `/pages/${value}/index` });
      },
  },
});
