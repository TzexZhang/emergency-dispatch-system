/**
 * ============================================
 * HTTP工具类
 * ============================================
 *
 * 功能说明：
 * - Axios实例配置
 * - 请求/响应拦截器
 * - Token管理
 * - 错误处理
 *
 * @author Emergency Dispatch Team
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';

// 请求配置接口
interface RequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
  skipErrorHandler?: boolean;
}

/**
 * 创建Axios实例
 */
const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 请求拦截器
 */
http.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token');

    if (token && !(config as RequestConfig).skipAuth) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器
 */
http.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data;

    // 处理业务错误码
    if (res.code !== 200) {
      message.error(res.message || '请求失败');
      return Promise.reject(new Error(res.message));
    }

    return res;
  },
  (error) => {
    // 处理HTTP错误
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          message.error('未授权，请重新登录');
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 403:
          message.error('权限不足');
          break;
        case 404:
          message.error('请求的资源不存在');
          break;
        case 500:
          message.error('服务器内部错误');
          break;
        default:
          message.error(data?.message || '请求失败');
      }
    } else if (error.code === 'ECONNABORTED') {
      message.error('请求超时');
    } else if (error.message === 'Network Error') {
      message.error('网络错误，请检查网络连接');
    } else {
      message.error('请求失败');
    }

    return Promise.reject(error);
  }
);

/**
 * GET请求
 */
export function get<T = any>(
  url: string,
  params?: any,
  config?: RequestConfig
): Promise<ApiResponse<T>> {
  return http.get(url, { params, ...config });
}

/**
 * POST请求
 */
export function post<T = any>(
  url: string,
  data?: any,
  config?: RequestConfig
): Promise<ApiResponse<T>> {
  return http.post(url, data, config);
}

/**
 * PUT请求
 */
export function put<T = any>(
  url: string,
  data?: any,
  config?: RequestConfig
): Promise<ApiResponse<T>> {
  return http.put(url, data, config);
}

/**
 * DELETE请求
 */
export function del<T = any>(
  url: string,
  config?: RequestConfig
): Promise<ApiResponse<T>> {
  return http.delete(url, config);
}

/**
 * 文件上传
 */
export function upload<T = any>(
  url: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<ApiResponse<T>> {
  const formData = new FormData();
  formData.append('file', file);

  return http.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
}

export default {
  get,
  post,
  put,
  del: delete,
  upload,
  http,
};
