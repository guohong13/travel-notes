import {
  userApi
} from '~/api/request';
import config from '../../config';

Page({
  data: {
    loading: true,
    userInfo: {
      avatar: '',
      nickname: '用户昵称',
      userId: 1
    },
    stats: {
      likes: 0,
      follows: 0,
      followers: 0,
      mutuals: 0
    },
    menuList: [{
        icon: 'edit',
        text: '我的游记',
        path: '/pages/my/mynotes/index',
        type: 'navigate'
      },
      {
        icon: 'heart',
        text: '我的点赞',
        path: '/pages/my/likes/index',
        type: 'navigate'
      },
      {
        icon: 'star',
        text: '我的收藏',
        path: '/pages/my/collects/index',
        type: 'navigate'
      },
      {
        icon: 'logout',
        text: '退出登录',
        type: 'logout'
      }
    ],
    isCheckingLogin: false
  },

  onLoad() {
    const token = wx.getStorageSync('access_token');
    if (!token) {
      this.setData({
        isCheckingLogin: true
      });
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 1500
      });
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/index?from=my',
          events: {
            loginSuccess: () => {
              this.setData({
                isCheckingLogin: false
              });
              setTimeout(() => {
                this.loadUserInfo();
                this.loadUserStats();
              }, 200);
            }
          }
        });
      }, 1500);
      return;
    }

    this.loadUserInfo();
    this.loadUserStats();
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar && tabBar.setTabBarValue) {
      tabBar.setTabBarValue('my');
    }

    if (this.data.isCheckingLogin) {
      return;
    }

    const token = wx.getStorageSync('access_token');
    if (!token) {
      this.setData({
        isCheckingLogin: true
      });
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 1500
      });
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/index?from=my',
          events: {
            loginSuccess: () => {
              this.setData({
                isCheckingLogin: false
              });
              setTimeout(() => {
                this.loadUserInfo();
                this.loadUserStats();
              }, 200);
            }
          }
        });
      }, 1500);
      return;
    }

    this.loadUserInfo();
    this.loadUserStats();
  },

  onMenuTap(e) {
    const {
      index
    } = e.currentTarget.dataset;
    const item = this.data.menuList[index];

    if (item.type === 'navigate') {
      wx.navigateTo({
        url: item.path
      });
    } else if (item.type === 'logout') {
      this.showLogoutConfirm();
    }
  },

  onEditProfile() {
    wx.navigateTo({
      url: '/pages/my/edit-profile/index'
    });
  },

  onStatsTap(e) {
    const {
      type
    } = e.currentTarget.dataset;

    if (type === 'likes') {
      const totalLikes = this.data.stats?.likes || 0;
      const nickname = this.data.userInfo?.nickname || '我';
      const content = totalLikes > 0 ?
        `"${nickname}" 共获得 ${totalLikes} 个赞` :
        '暂时还没有获得点赞，继续加油！';

      wx.showModal({
        content,
        showCancel: false,
        confirmText: '知道了'
      });
      return;
    }

    const paths = {
      follows: '/pages/my/follows/index',
      followers: '/pages/my/followers/index',
      mutuals: '/pages/my/mutuals/index'
    };

    const path = paths[type];
    if (path) {
      wx.navigateTo({
        url: path
      });
    }
  },

  async loadUserInfo() {
    try {
      const res = await userApi.getProfile();
      if (res.code === 1 && res.data) {
        const userData = res.data;
        let avatarUrl = userData.avatar_url || '';
        if (avatarUrl) {
          avatarUrl = `${config.baseUrl}${avatarUrl}`;
        }

        this.setData({
          userInfo: {
            avatar: avatarUrl,
            nickname: userData.nickname || '用户昵称',
            userId: userData.id || 1
          }
        });
      }
    } catch (error) {
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      });
    }
  },

  async loadUserStats() {
    try {
      const [followingRes, followersRes, receivedLikesRes] = await Promise.all([
        userApi.getFollowingList(1, 9999),
        userApi.getFollowersList(1, 9999),
        userApi.getReceivedLikes()
      ]);

      const followingList = followingRes.data?.list || [];
      const followersList = followersRes.data?.list || [];
      
      const follows = followingRes.data?.pagination?.total || followingList.length;
      const followers = followersRes.data?.pagination?.total || followersList.length;
      const likes = receivedLikesRes.data?.total || 0;

      const followingIds = new Set(followingList.map(u => u.id));
      const mutuals = followersList.reduce((cnt, u) => cnt + (followingIds.has(u.id) ? 1 : 0), 0);

      this.setData({
        stats: { likes, follows, followers, mutuals },
        loading: false
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: '获取统计数据失败',
        icon: 'none'
      });
    }
  },

  showLogoutConfirm() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmText: '退出',
      confirmColor: '#666666',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.logout();
        }
      }
    });
  },

  logout() {
    try {
      wx.removeStorageSync('access_token');
      wx.removeStorageSync('userInfo');

      const app = getApp();
      if (app && app.globalData) {
        app.globalData.userInfo = null;
        app.globalData.unreadCount = 0;
      }

      if (app && app.globalData && app.globalData.ws) {
        app.globalData.ws.close();
        app.globalData.ws = null;
      }

      wx.showToast({
        title: '已退出登录',
        icon: 'success',
        duration: 1500
      });

      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/login/index'
        });
      }, 1500);

    } catch (error) {
      wx.showToast({
        title: '退出登录失败',
        icon: 'none'
      });
    }
  }
});