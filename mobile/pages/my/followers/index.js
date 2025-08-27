import {
  userApi
} from '~/api/request';
import {
  processResourcePath
} from '../../../utils/path';

Page({
  data: {
    users: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: true
  },

  onLoad() {
    this.loadFollowers();
  },

  async loadFollowers(isLoadMore = false) {
    if (isLoadMore && !this.data.hasMore) return;
    try {
      const [followersRes, followingRes] = await Promise.all([
        userApi.getFollowersList(this.data.page, this.data.pageSize),
        userApi.getFollowingList(1, 9999)
      ]);

      if (followersRes.code === 1 && followersRes.data) {
        const followingIds = new Set((followingRes.code === 1 ? (followingRes.data?.list || []) : []).map(u => u.id));
        const list = followersRes.data.list.map(u => ({
          ...u,
          avatar: processResourcePath(u.avatar_url),
          isFollower: true,
          isFollowing: followingIds.has(u.id)
        }));
        const pagination = followersRes.data.pagination;
        this.setData({
          users: isLoadMore ? [...this.data.users, ...list] : list,
          hasMore: !!pagination.hasMore,
          loading: false
        });
      } else {
        this.setData({
          loading: false
        });
        wx.showToast({
          title: (followersRes.message || '加载失败'),
          icon: 'none'
        });
      }
    } catch (e) {
      this.setData({
        loading: false
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  onReachBottom() {
    if (!this.data.hasMore) return;
    this.setData({
      page: this.data.page + 1
    });
    this.loadFollowers(true);
  },

  onPullDownRefresh() {
    this.setData({
      page: 1,
      hasMore: true
    });
    this.loadFollowers().finally(() => wx.stopPullDownRefresh());
  },

  onTapUser(e) {
    const {
      user
    } = e.detail || {};
    if (!user || !user.id) return;
    wx.showToast({
      title: `用户: ${user.nickname}`,
      icon: 'none'
    });
  },

  async onAction(e) {
    const {
      user,
      action
    } = e.detail || {};
    if (!user || !user.id) return;
    if (action === 'noop') return;

    if (action === 'unfollow') {
      wx.showModal({
        title: '取消关注',
        content: `确定不再关注 “${user.nickname}” 吗？`,
        confirmText: '取消关注',
        confirmColor: '#666666',
        success: async (res) => {
          if (!res.confirm) return;
          try {
            const resp = await userApi.followUser(user.id);
            if (resp.code === 1) {
              const list = this.data.users.map(u => u.id === user.id ? {
                ...u,
                isFollowing: false
              } : u);
              this.setData({
                users: list
              });
              wx.showToast({
                title: '已取消关注',
                icon: 'success'
              });
            } else {
              wx.showToast({
                title: resp.message || '操作失败',
                icon: 'none'
              });
            }
          } catch (err) {
            wx.showToast({
              title: '网络错误，请稍后重试',
              icon: 'none'
            });
          }
        }
      });
      return;
    }

    try {
      const res = await userApi.followUser(user.id);
      if (res.code === 1) {
        const {
          isFollowing
        } = res.data || {};
        const list = this.data.users.map(u => u.id === user.id ? {
          ...u,
          isFollowing: !!isFollowing
        } : u);
        this.setData({
          users: list
        });
        wx.showToast({
          title: isFollowing ? '关注成功' : '取消关注成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.message || '操作失败',
          icon: 'none'
        });
      }
    } catch (err) {
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      });
    }
  }
});