import config from '~/config';

const { baseUrl } = config;
const delay = config.isMock ? 500 : 0;

// 登录请求
export const login = (data) => {
  return request('/api/users/login', 'POST', data);
};

// 注册请求
export const register = (data) => {
  return request('/api/users/register', 'POST', data);
};

function request(url, method = 'GET', data = {}) {
  const header = {
    'content-type': 'application/json',
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
          // HTTP状态码为200才视为成功
          if (res.statusCode === 201 || res.code === 1) {
            resolve(res.data);
          } else {
            // wx.request的特性，只要有响应就会走success回调，所以在这里判断状态，非200的均视为请求失败
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

// 导出请求和服务地址
export default request;
