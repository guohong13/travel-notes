import {
  userApi
} from '~/api/request';
import {
  processResourcePath
} from '../../../utils/path';

Page({
  data: {
    users: [],
    loading: true
  },

  onLoad() {
    this.loadMutuals();
  },

  async loadMutuals() {
    try {
      const [followingRes, followersRes] = await Promise.all([
        userApi.getFollowingList(1, 9999),
        userApi.getFollowersList(1, 9999)
      ]);
      const following = (followingRes.code === 1 ? (followingRes.data?.list || []) : []).map(u => ({
        id: u.id,
        nickname: u.nickname || u.username,
        avatar: processResourcePath(u.avatar_url),
        isFollowing: true
      }));
      const followers = (followersRes.code === 1 ? (followersRes.data?.list || []) : []).map(u => ({
        id: u.id,
        nickname: u.nickname || u.username,
        avatar: processResourcePath(u.avatar_url),
        isFollower: true,
        isFollowing: !!u.isFollowing
      }));
      const followerMap = new Map(followers.map(u => [u.id, u]));
      const mutuals = following.filter(u => followerMap.has(u.id)).map(u => ({
        ...u,
        isFollower: true
      }));
      this.setData({
        users: mutuals,
        loading: false
      });
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
              const newList = this.data.users.filter(u => u.id !== user.id);
              this.setData({
                users: newList
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