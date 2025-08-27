import config from '~/config';

const {
  baseUrl
} = config;
const delay = config.isMock ? 500 : 0;

function parseUploadResponse(res) {
  try {
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    return data.data || data;
  } catch (_) {
    return {};
  }
}

export const userApi = {
  login: (data) => request('/api/users/login', 'POST', data),
  register: (data) => request('/api/users/register', 'POST', data),
  getProfile: () => request('/api/users/profile', 'GET'),
  updateProfile: (data) => request('/api/users/profile', 'PUT', data),
  changePassword: (data) => request('/api/users/password', 'PUT', data),
  uploadAvatar: (filePath) => new Promise((resolve, reject) => {
    wx.uploadFile({
      url: baseUrl + '/api/upload/avatar',
      filePath,
      name: 'avatar',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('access_token')}`
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data);
          if (data.code === 1) resolve(data);
          else reject(new Error(data.message || '上传失败'));
        } catch (_) {
          reject(new Error('上传响应解析失败'));
        }
      },
      fail: (err) => reject(new Error('上传失败: ' + err.errMsg))
    });
  }),
  followUser: (targetUserId) => request('/api/users/follow', 'POST', {
    targetUserId
  }),
  getFollowStatus: (targetUserId) => request(`/api/users/follow/status/${targetUserId}`, 'GET'),
  getFollowingList: (page = 1, pageSize = 20) => request(`/api/users/following?page=${page}&pageSize=${pageSize}`, 'GET'),
  getFollowersList: (page = 1, pageSize = 20) => request(`/api/users/followers?page=${page}&pageSize=${pageSize}`, 'GET'),
  getCollectsList: (page = 1, pageSize = 20) => request(`/api/users/collects?page=${page}&pageSize=${pageSize}`, 'GET'),
  getLikesList: (page = 1, pageSize = 20) => request(`/api/users/likes?page=${page}&pageSize=${pageSize}`, 'GET'),
  getReceivedLikes: () => request('/api/users/received-likes', 'GET')
};

export const notesApi = {
  getHomeNotes: (page = 1, pageSize = 10) => request(`/api/notes?page=${page}&pageSize=${pageSize}`, 'GET'),
  getFollowingNotes: (page = 1, pageSize = 10) => request(`/api/notes/following?page=${page}&pageSize=${pageSize}`, 'GET'),
  getNoteDetail: (id) => request(`/api/notes/detail/${id}`, 'GET'),
  getUserNotes: (userId) => request(`/api/notes/user/${userId}`, 'GET'),
  searchNotes: (params) => request('/api/notes/search', 'GET', params),
  publishNote: (data) => request('/api/notes', 'POST', data),
  updateNote: (id, data) => request(`/api/notes/modify/${id}`, 'PUT', data),
  deleteNote: (id) => request(`/api/notes/delete/${id}`, 'DELETE'),
  toggleLike: (id) => request(`/api/notes/${id}/like`, 'POST'),
  getLikeStatus: (id) => request(`/api/notes/${id}/like`, 'GET'),
  toggleCollect: (id) => request(`/api/notes/${id}/collect`, 'POST'),
  getCollectStatus: (id) => request(`/api/notes/${id}/collect`, 'GET'),
  getCommentList: (noteId, page = 1, pageSize = 20) => request(`/api/notes/${noteId}/comments?page=${page}&pageSize=${pageSize}`, 'GET'),
  addComment: (noteId, content) => request(`/api/notes/${noteId}/comments`, 'POST', {
    content
  }),
  toggleCommentLike: (commentId) => request(`/api/comments/${commentId}/like`, 'POST'),

  uploadFilesAndPublish: async ({
    files,
    title,
    content,
    location,
    locationName,
    address
  }) => {
    try {
      wx.showLoading({
        title: '正在发布...',
        mask: true
      });
      const videoFile = files.find(f => f.type === 'video');
      const imageFiles = files.filter(f => f.type === 'image');

      const uploadTasks = [];
      const createUploadTask = (filePath, name, type) => new Promise((resolve, reject) => {
        wx.uploadFile({
          url: baseUrl + '/api/upload',
          filePath,
          name,
          header: {
            'Authorization': `Bearer ${wx.getStorageSync('access_token')}`
          },
          success: (res) => resolve({
            type,
            data: parseUploadResponse(res)
          }),
          fail: reject
        });
      });

      imageFiles.forEach((file) => uploadTasks.push(createUploadTask(file.tempFilePath, 'images', 'image')));
      if (videoFile) uploadTasks.push(createUploadTask(videoFile.tempFilePath, 'video', 'video'));

      const uploadResults = await Promise.all(uploadTasks);
      const uploadedFiles = uploadResults.reduce((acc, result) => {
        if (result.type === 'image' && result.data.images?.length) acc.images = [...(acc.images || []), ...result.data.images];
        if (result.type === 'video' && result.data.video) acc.video = result.data.video;
        return acc;
      }, {
        images: [],
        video: null
      });

      const publishResult = await request('/api/notes', 'POST', {
        title,
        content,
        images: uploadedFiles.images,
        video_url: uploadedFiles.video,
        location,
        locationName,
        address
      });

      wx.hideLoading();
      return publishResult;
    } catch (error) {
      wx.hideLoading();
      throw error;
    }
  },

  uploadFilesAndUpdate: async ({
    id,
    files,
    title,
    content,
    location,
    locationName,
    address
  }) => {
    try {
      wx.showLoading({
        title: '正在更新...',
        mask: true
      });
      const newFiles = files.filter(f => !f.isRemote && f.tempFilePath);
      const existingFiles = {
        images: files.filter(f => f.isRemote && f.type === 'image').map(f => f.url),
        video: files.find(f => f.isRemote && f.type === 'video')?.url
      };
      const videoFile = newFiles.find(f => f.type === 'video');
      const imageFiles = newFiles.filter(f => f.type === 'image');

      const uploadTasks = [];
      const createUploadTask = (filePath, name, type) => new Promise((resolve, reject) => {
        wx.uploadFile({
          url: baseUrl + '/api/upload',
          filePath,
          name,
          header: {
            'Authorization': `Bearer ${wx.getStorageSync('access_token')}`
          },
          success: (res) => resolve({
            type,
            data: parseUploadResponse(res)
          }),
          fail: reject
        });
      });

      imageFiles.forEach((file) => uploadTasks.push(createUploadTask(file.tempFilePath, 'images', 'image')));
      if (videoFile) uploadTasks.push(createUploadTask(videoFile.tempFilePath, 'video', 'video'));

      const uploadResults = await Promise.all(uploadTasks);
      const uploadedFiles = uploadResults.reduce((acc, result) => {
        if (result.type === 'image' && result.data.images?.length) acc.images = [...(acc.images || []), ...result.data.images];
        if (result.type === 'video' && result.data.video) acc.video = result.data.video;
        return acc;
      }, {
        images: [],
        video: null
      });

      const finalData = {
        id,
        title,
        content,
        images: [...existingFiles.images, ...uploadedFiles.images],
        video_url: uploadedFiles.video || existingFiles.video,
        location,
        locationName,
        address
      };

      const updateResult = await request(`/api/notes/modify/${id}`, 'PUT', finalData);
      if (updateResult.code !== 1) throw new Error(updateResult.message || '更新失败');
      wx.hideLoading();
      return updateResult;
    } catch (error) {
      wx.hideLoading();
      throw error;
    }
  }
};

function request(url, method = 'GET', data = {}, customHeader = {}) {
  const header = {
    'content-type': 'application/json',
    ...customHeader
  };
  const tokenString = wx.getStorageSync('access_token');
  if (tokenString) header.Authorization = `Bearer ${tokenString}`;
  return new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl + url,
      method,
      data,
      dataType: 'json',
      header,
      success(res) {
        setTimeout(() => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
          else reject(res);
        }, delay);
      },
      fail(err) {
        setTimeout(() => reject(err), delay);
      }
    });
  });
}

export default request;