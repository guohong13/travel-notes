import axios from "axios";

// 创建axios实例
const service = axios.create({
  baseURL: "http://localhost:3300/api",
  timeout: 10000,
});

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use((response) => {
  const res = response.data;
  return res;
});

export default service;
