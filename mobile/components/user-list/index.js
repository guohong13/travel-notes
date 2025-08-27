Component({
  properties: {
    users: {
      type: Array,
      value: []
    },
    context: {
      type: String,
      value: 'generic'
    }
  },
  methods: {
    onTapUser(e) {
      const {
        id
      } = e.currentTarget.dataset || {};
      const user = (this.data.users || []).find(u => u.id === id);
      this.triggerEvent('tapuser', {
        user
      });
    },
    onAction(e) {
      const {
        id
      } = e.currentTarget.dataset || {};
      const user = (this.data.users || []).find(u => u.id === id);
      if (!user) return;
      const isFollowing = !!user.isFollowing;
      const isFollower = !!user.isFollower;
      const action = isFollowing && !isFollower ? 'unfollow' : 'follow';
      this.triggerEvent('action', {
        user,
        action
      });
    }
  }
});