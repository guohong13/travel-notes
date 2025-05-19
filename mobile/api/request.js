import config from '~/config';

const {
  baseUrl
} = config;
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
  // 获取游记详情
  getNoteDetail: (id) => {
    return request(`/api/notes/${id}`, 'GET');
  },
  // 获取用户游记列表
  getUserNotes: (userId) => {
    return request(`/api/notes/user/${userId}`, 'GET');
  },
  // 搜索游记
  searchNotes: (params) => {
    console.log('搜索参数:', params);
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
  uploadFilesAndPublish: async ({
    files,
    title,
    content
  }) => {
    try {
      wx.showLoading({
        title: '正在发布...',
        mask: true
      });

      // 找出视频和图片文件
      const videoFile = files.find(f => f.type === 'video');
      const imageFiles = files.filter(f => f.type === 'image');
      console.log('文件信息：', {
        totalFiles: files.length,
        imageFiles: imageFiles.length,
        hasVideo: !!videoFile,
        files: files.map(f => ({
          type: f.type,
          tempFilePath: f.tempFilePath,
          url: f.url
        }))
      });

      // 第一步：上传文件
      const uploadTasks = [];

      function parseResponse(res) {
        try {
          // 处理后端返回格式: { code, message, data }
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          return data.data || data; // 直接返回data字段
        } catch (error) {
          console.error('解析响应失败:', error);
          return {};
        }
      }

      function createUploadTask(filePath, name, type) {
        return new Promise((resolve, reject) => {
          wx.uploadFile({
            url: baseUrl + '/api/upload',
            filePath,
            name,
            header: {
              'Authorization': `Bearer ${wx.getStorageSync('access_token')}`
            },
            success: (res) => {
              try {
                const data = parseResponse(res);
                resolve({
                  type,
                  data
                });
              } catch (e) {
                reject(new Error('解析响应失败'));
              }
            },
            fail: reject
          });
          // 监听上传进度
          // uploadTask.onProgressUpdate((res) => {
          //     console.log(`${type}上传进度: ${res.progress}%`);
          //   });
        });
      }

      // 使用函数创建上传任务
      imageFiles.forEach((file, index) => {
        uploadTasks.push(createUploadTask(file.tempFilePath, 'images', 'image'));
        // console.log(file.tempFilePath);
      });

      if (videoFile) {
        uploadTasks.push(createUploadTask(videoFile.tempFilePath, 'video', 'video'));
      }

      // 等待所有文件上传完成
      const uploadResults = await Promise.all(uploadTasks);
      // console.log("uploadResults:", uploadResults);

      // 收集所有上传的文件路径
      const uploadedFiles = uploadResults.reduce((acc, result) => {
        if (result.type === 'image') {
          // 处理图片上传结果
          if (result.data.images && result.data.images.length > 0) {
            acc.images = [...(acc.images || []), ...result.data.images];
          }
        } else if (result.type === 'video') {
          // 处理视频上传结果
          if (result.data.video) {
            acc.video = result.data.video;
          }
        }
        return acc;
      }, {
        images: [],
        video: null
      });

      // console.log("图片路径：", uploadedFiles.images)
      // console.log("视频路径：", uploadedFiles.video)

      // 第二步：发布游记
      const publishResult = await request('/api/notes', 'POST', {
        title,
        content,
        images: uploadedFiles.images,
        video_url: uploadedFiles.video
      });

      wx.hideLoading();
      return publishResult;

    } catch (error) {
      wx.hideLoading();
      console.error('发布失败：', error);
      throw error;
    }
  },

  // 上传文件并更新游记
  uploadFilesAndUpdate: async ({ id, files, title, content }) => {
    try {
      wx.showLoading({ title: '正在更新...', mask: true });
  
      // 分离新旧文件
      const newFiles = files.filter(f => !f.isRemote && f.tempFilePath); 
      const existingFiles = {
        images: files.filter(f => f.isRemote && f.type === 'image').map(f => f.url),
        video: files.find(f => f.isRemote && f.type === 'video')?.url
      };
  
      const videoFile = newFiles.find(f => f.type === 'video');
      const imageFiles = newFiles.filter(f => f.type === 'image');
      console.log(imageFiles,videoFile)
      const uploadTasks = [];
  
      function parseResponse(res) {
        try {
          // 处理后端返回格式: { code, message, data }
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          return data.data || data; // 直接返回data字段
        } catch (error) {
          console.error('解析响应失败:', error);
          return {};
        }
      }

      function createUploadTask(filePath, name, type) {
        return new Promise((resolve, reject) => {
          wx.uploadFile({
            url: baseUrl + '/api/upload',
            filePath,
            name,
            header: {
              'Authorization': `Bearer ${wx.getStorageSync('access_token')}`
            },
            success: (res) => {
              try {
                const data = parseResponse(res);
                resolve({
                  type,
                  data
                });
              } catch (e) {
                reject(new Error('解析响应失败'));
              }
            },
            fail: reject
          });
          // 监听上传进度
          // uploadTask.onProgressUpdate((res) => {
          //     console.log(`${type}上传进度: ${res.progress}%`);
          //   });
        });
      }

      // 使用函数创建上传任务
      imageFiles.forEach((file, index) => {
        uploadTasks.push(createUploadTask(file.tempFilePath, 'images', 'image'));
        // console.log(file.tempFilePath);
      });

      if (videoFile) {
        uploadTasks.push(createUploadTask(videoFile.tempFilePath, 'video', 'video'));
      }
  
      // 等待所有文件上传完成
      const uploadResults = await Promise.all(uploadTasks);
      console.log("uploadResults:", uploadResults);

      // 收集所有上传的文件路径
      const uploadedFiles = uploadResults.reduce((acc, result) => {
        if (result.type === 'image') {
          // 处理图片上传结果
          if (result.data.images && result.data.images.length > 0) {
            acc.images = [...(acc.images || []), ...result.data.images];
          }
        } else if (result.type === 'video') {
          // 处理视频上传结果
          if (result.data.video) {
            acc.video = result.data.video;
          }
        }
        return acc;
      }, {
        images: [],
        video: null
      });
  
      // 构建更新数据（合并新旧文件路径）
      const finalData = {
        id,
        title,
        content,
        images: [...existingFiles.images, ...uploadedFiles.images], // 合并新旧图片
        video_url: uploadedFiles.video || existingFiles.video
      };
      console.log(finalData.images,finalData.video_url);
  
      // 调用更新接口
      const updateResult = await request(`/api/notes/modify/${id}`, 'PUT', finalData);
      
      // 检查更新结果
      if (updateResult.code !== 1) {
        throw new Error(updateResult.message || '更新失败');
      }
  
      wx.hideLoading();
      return updateResult;
  
    } catch (error) {
      wx.hideLoading();
      console.error('更新失败:', error);
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