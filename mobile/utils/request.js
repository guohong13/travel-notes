import axios from 'axios';

// 创建 axios 实例
const service = axios.create({
    baseURL: 'http://localhost:3300/api',
    timeout: 5000 // 请求超时时间
});

// 请求拦截器
service.interceptors.request.use(
    config => {
        config.headers['Content-Type'] = 'application/json';
        return config;
    },
    error => {
        // 处理请求错误
        console.log(error);
        return Promise.reject(error);
    }
);

// 响应拦截器
service.interceptors.response.use(
    response => {
        return response.data;
    },
    error => {
        // 处理响应错误
        console.log('err' + error);
        return Promise.reject(error);
    }
);

export default service;    