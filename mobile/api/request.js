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
      // 上传所有文件
      const uploadTasks = files.map(file => {
        return new Promise((resolve, reject) => {
          wx.uploadFile({
            url: baseUrl + '/api/notes',
            filePath: file.tempFilePath || file.url,
            name: file.type === 'video' ? 'video' : 'images',
            formData: {
              type: file.type,
              thumb: file.thumb,
              title:title,
              content:content
            },
            header: {
              'Authorization': `Bearer ${wx.getStorageSync('access_token')}`
            },
            success: (res) => {
              if (res.statusCode === 200 || res.code === 1) {
                try {
                  const data = JSON.parse(res.data);
                  console.log('上传成功:', data);
                  resolve(data);
                } catch (e) {
                  reject(new Error('解析上传响应失败'));
                }
              } else {
                reject(new Error(`上传失败: ${res.statusCode}`));
                // reject(new Error('文件上传在这失败'));
              }
            },
            fail: (err) => {
              reject(err);
            }
          });
        });
      });

      // 等待所有文件上传完成
      const uploadResults = await Promise.all(uploadTasks);

      // 提取上传后的文件URL
      const uploadedFiles = uploadResults.map(result => ({
        url: result.url,
        type: result.type,
        thumb: result.thumb
      }));

      // 发布游记
      const publishData = {
        title,
        content,
        files: uploadedFiles,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          name: location.name,
          address: location.address
        } : null
      };

      return request('/api/notes', 'POST', publishData);
    } catch (error) {
      console.error('上传文件失败：', error);
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
