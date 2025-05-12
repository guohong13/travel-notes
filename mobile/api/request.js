import config from '~/config';

const { baseUrl } = config;
const delay = config.isMock ? 500 : 0;

// 用户相关接口
export const userApi = {
  // 登录请求
  login: (data) => {
    return request('/api/users/login', 'POST', data);
  },
  // 注册请求
  register: (data) => {
    return request('/api/users/register', 'POST', data);
  },
  // 获取用户信息
  getProfile: () => {
    return request('/api/users/profile', 'GET');
  }
};

// 游记相关接口
export const notesApi = {
  // 获取首页游记列表
  getHomeNotes: () => {
    return request('/api/notes', 'GET');
  },
  // 获取用户游记列表
  getUserNotes: (userId) => {
    return request(`/api/notes/user/${userId}`, 'GET');
  },
  // 搜索游记
  searchNotes: (params) => {
    return request('/api/notes/search', 'GET', params);
  },
  // 发布游记
  publishNote: (data) => {
    return request('/api/notes', 'POST', data);
  },
  // 修改游记
  updateNote: (id, data) => {
    return request(`/api/notes/modify/${id}`, 'PUT', data);
  },
  // 删除游记
  deleteNote: (id) => {
    return request(`/api/notes/delete/${id}`, 'DELETE');
  },
  // 上传文件并发布游记
  uploadFilesAndPublish: async ({ files, title, content, location }) => {
    try {
      wx.showLoading({
        title: '正在发布...',
        mask: true
      });

      // 找出视频和图片文件
      const videoFile = files.find(f => f.type === 'video');
      const imageFiles = files.filter(f => f.type === 'image');

      return new Promise((resolve, reject) => {
        // 创建 FormData 对象
        const formData = {
          title,
          content
        };

        // 创建上传任务
        const uploadTask = wx.uploadFile({
          url: baseUrl + '/api/notes',
          filePath: imageFiles[0].tempFilePath,
          name: 'images',
          formData,
          header: {
            'Authorization': `Bearer ${wx.getStorageSync('access_token')}`,
            'X-Extra-Images': imageFiles.length > 1 ? 
              imageFiles.slice(1).map(img => img.tempFilePath).join(',') : '',
            'X-Video-File': videoFile ? videoFile.tempFilePath : ''
          },
          success: (res) => {
            wx.hideLoading();
            try {
              const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
              console.log('发布响应:', data);
              
              if (res.statusCode === 200 || res.statusCode === 201 || data.code === 1) {
                resolve(data);
              } else {
                reject(new Error(data.message || `发布失败: ${res.statusCode}`));
              }
            } catch (e) {
              console.error('解析响应失败:', e);
              reject(new Error('解析响应失败'));
            }
          },
          fail: (err) => {
            wx.hideLoading();
            console.error('发布请求失败:', err);
            reject(new Error(err.errMsg || '网络请求失败'));
          }
        });

        // 监听上传进度
        uploadTask.onProgressUpdate((res) => {
          console.log('上传进度:', res.progress);
          // 这里可以添加进度条显示
          wx.showLoading({
            title: `上传中 ${res.progress}%`,
            mask: true
          });
        });
      });
    } catch (error) {
      wx.hideLoading();
      console.error('发布失败：', error);
      throw error;
    }
  }
};

function request(url, method = 'GET', data = {}, customHeader = {}) {
  const header = {
    'content-type': 'application/json',
    ...customHeader
  };
  // 获取token，有就丢进请求头
  const tokenString = wx.getStorageSync('access_token');
  if (tokenString) {
    header.Authorization = `Bearer ${tokenString}`;
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl + url,
      method,
      data,
      dataType: 'json',
      header,
      success(res) {
        setTimeout(() => {
          // HTTP状态码为200或201才视为成功
          if (res.statusCode === 200 || res.statusCode === 201 || res.code === 1) {
            resolve(res.data);
          } else {
            // wx.request的特性，只要有响应就会走success回调，所以在这里判断状态，非200/201的均视为请求失败
            reject(res);
          }
        }, delay);
      },
      fail(err) {
        setTimeout(() => {
          reject(err);
        }, delay);
      },
    });
  });
}

export default request;
