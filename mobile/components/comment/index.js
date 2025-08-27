Component({
  properties: {
    comment: {
      type: Object,
      value: {}
    }
  },
  data: {},
  methods: {
    onLikeTap() {
      const {
        comment
      } = this.properties;
      this.triggerEvent('like', {
        commentId: comment.id,
        isLiked: comment.isLiked
      });
    },
    formatTime(timeString) {
      if (!timeString) return '';
      const date = new Date(timeString);
      const now = new Date();
      const diff = now - date;
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (minutes < 1) return '刚刚';
      if (minutes < 60) return `${minutes}分钟前`;
      if (hours < 24) return `${hours}小时前`;
      if (days < 7) return `${days}天前`;
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}月${day}日`;
    }
  },
  lifetimes: {
    attached() {
      if (this.properties.comment.created_at) {
        const formattedTime = this.formatTime(this.properties.comment.created_at);
        this.setData({
          'comment.formattedTime': formattedTime
        });
      }
    }
  }
});