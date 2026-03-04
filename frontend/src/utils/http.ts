/**
 * ============================================
 * HTTP工具类
 * ============================================
 *
 * 功能说明：
 * - Axios实例配置
 * - 请求/响应拦截器
 * - Token管理（从userStore获取）
 * - 错误处理
 *
 * @author Emergency Dispatch Team
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getMessage } from '@/utils/message';
import type { ApiResponse } from '@/types';
import { getToken } from '@/store/userStore';
import { useUserStore } from '@/store/userStore';

// 请求配置接口
interface RequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
  skipErrorHandler?: boolean;
}

/**
 * 将snake_case转换为camelCase
 */
function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = toCamelCase(obj[key]);
      }
    }
    return result;
  }
  
  return obj;
}

/**
 * 创建Axios实例
 */
const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
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
    // 从userStore获取token
    const token = getToken();

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

    // 如果响应有 code 字段，处理业务错误码
    if (res && typeof res === 'object' && 'code' in res) {
      if (res.code !== 200) {
        try {
          getMessage().error(res.message || '请求失败');
        } catch (error) {
          // Message instance not initialized yet
        }
        return Promise.reject(new Error(res.message));
      }
    }

    return toCamelCase(response.data);
  },
  (error) => {
    // 处理HTTP错误
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          try {
            getMessage().error('未授权，请重新登录');
          } catch (error) {
            // Message instance not initialized yet
          }
          // 使用userStore的logout清除状态
          useUserStore.getState().logout();
          window.location.href = '/login';
          break;
        case 403:
          try {
            getMessage().error('权限不足');
          } catch (error) {
            // Message instance not initialized yet
          }
          break;
        case 404:
          try {
            getMessage().error('请求的资源不存在');
          } catch (error) {
            // Message instance not initialized yet
          }
          break;
        case 500:
          try {
            getMessage().error('服务器内部错误');
          } catch (error) {
            // Message instance not initialized yet
          }
          break;
        default:
          try {
            getMessage().error(data?.message || '请求失败');
          } catch (error) {
            // Message instance not initialized yet
          }
      }
    } else if (error.code === 'ECONNABORTED') {
      try {
        getMessage().error('请求超时');
      } catch (error) {
        // Message instance not initialized yet
      }
    } else if (error.message === 'Network Error') {
      try {
        getMessage().error('网络错误，请检查网络连接');
      } catch (error) {
        // Message instance not initialized yet
      }
    } else {
      try {
        getMessage().error('请求失败');
      } catch (error) {
        // Message instance not initialized yet
      }
    }

    return Promise.reject(error);
  }
);

/**
 * GET请求
 */
export function get<T = any>(
  url: string,
  config?: RequestConfig & { params?: any }
): Promise<ApiResponse<T>> {
  return http.get(url, config);
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

// 导出 http 实例供其他模块使用
export { http };

export default {
  get,
  post,
  put,
  del,
  upload,
  http,
};
