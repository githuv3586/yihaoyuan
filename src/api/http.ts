/**
 * @fileoverview HTTP客户端封装
 * @module api/http
 * @description 提供基于Fetch API的HTTP请求封装，支持请求拦截、响应拦截和错误处理
 */

import { ApiResponse, ConfigOptions } from '../types';

/**
 * 请求拦截器类型
 * @typedef RequestInterceptor
 * @description 用于在请求发送前修改请求配置
 */
export type RequestInterceptor = (config: RequestInit) => RequestInit | Promise<RequestInit>;

/**
 * 响应拦截器类型
 * @typedef ResponseInterceptor
 * @description 用于在响应返回后处理响应数据
 */
export type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

/**
 * HTTP客户端类
 * @class HttpClient
 * @description 封装HTTP请求的客户端类，支持GET、POST、PUT、DELETE、PATCH方法
 * @example
 * // 创建HTTP客户端实例
 * const http = new HttpClient({
 *   baseUrl: 'https://api.example.com',
 *   timeout: 10000,
 *   debug: false,
 *   retryCount: 3
 * });
 * 
 * // 发送GET请求
 * const response = await http.get('/users');
 * 
 * // 发送POST请求
 * const newUser = await http.post('/users', { name: 'John', email: 'john@example.com' });
 */
export class HttpClient {
  private baseUrl: string;
  private timeout: number;
  private debug: boolean;
  private retryCount: number;
  private headers: Record<string, string>;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  /**
   * 创建HttpClient实例
   * @constructor
   * @param {ConfigOptions} options - 配置选项
   * @example
   * const client = new HttpClient({
   *   baseUrl: 'https://api.example.com',
   *   timeout: 5000,
   *   debug: true,
   *   retryCount: 2,
   *   headers: { 'Authorization': 'Bearer token' }
   * });
   */
  constructor(options: ConfigOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.timeout = options.timeout;
    this.debug = options.debug;
    this.retryCount = options.retryCount;
    this.headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
  }

  /**
   * 添加请求拦截器
   * @method addRequestInterceptor
   * @param {RequestInterceptor} interceptor - 请求拦截器函数
   * @returns {void}
   * @example
   * http.addRequestInterceptor((config) => {
   *   config.headers = {
   *     ...config.headers,
   *     'X-Request-ID': generateRequestId()
   *   };
   *   return config;
   * });
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * 添加响应拦截器
   * @method addResponseInterceptor
   * @param {ResponseInterceptor} interceptor - 响应拦截器函数
   * @returns {void}
   * @example
   * http.addResponseInterceptor((response) => {
   *   if (response.status === 401) {
   *     // 处理认证失败
   *     refreshToken();
   *   }
   *   return response;
   * });
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * 执行HTTP请求
   * @private
   * @method request
   * @template T - 响应数据类型
   * @param {string} url - 请求URL
   * @param {RequestInit} options - 请求选项
   * @returns {Promise<ApiResponse<T>>} API响应
   */
  private async request<T>(url: string, options: RequestInit): Promise<ApiResponse<T>> {
    const fullUrl = `${this.baseUrl}${url}`;
    
    // 应用请求拦截器
    let config: RequestInit = {
      ...options,
      headers: {
        ...this.headers,
        ...(options.headers as Record<string, string>)
      }
    };

    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(config);
    }

    if (this.debug) {
      console.log(`[HTTP] ${options.method} ${fullUrl}`, config);
    }

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    let lastError: Error | null = null;
    
    // 重试逻辑
    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        let response = await fetch(fullUrl, {
          ...config,
          signal: controller.signal
        });

        // 应用响应拦截器
        for (const interceptor of this.responseInterceptors) {
          response = await interceptor(response);
        }

        clearTimeout(timeoutId);

        const data = await response.json();

        if (this.debug) {
          console.log(`[HTTP] Response:`, data);
        }

        return {
          success: response.ok,
          data: data as T,
          message: response.ok ? 'Success' : 'Request failed',
          statusCode: response.status,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        lastError = error as Error;
        
        if (this.debug) {
          console.error(`[HTTP] Attempt ${attempt + 1} failed:`, error);
        }

        if (attempt < this.retryCount) {
          // 指数退避
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    clearTimeout(timeoutId);

    return {
      success: false,
      data: null as unknown as T,
      message: lastError?.message || 'Request failed',
      statusCode: 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 发送GET请求
   * @method get
   * @template T - 响应数据类型
   * @param {string} url - 请求URL
   * @param {Record<string, string | number>} [params] - 查询参数
   * @returns {Promise<ApiResponse<T>>} API响应
   * @example
   * // 基本GET请求
   * const users = await http.get<User[]>('/users');
   * 
   * // 带查询参数的GET请求
   * const filteredUsers = await http.get<User[]>('/users', { 
   *   page: 1, 
   *   limit: 10,
   *   status: 'active'
   * });
   */
  async get<T>(url: string, params?: Record<string, string | number>): Promise<ApiResponse<T>> {
    let queryString = '';
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        searchParams.append(key, String(value));
      }
      queryString = `?${searchParams.toString()}`;
    }

    return this.request<T>(`${url}${queryString}`, {
      method: 'GET'
    });
  }

  /**
   * 发送POST请求
   * @method post
   * @template T - 响应数据类型
   * @template D - 请求数据类型
   * @param {string} url - 请求URL
   * @param {D} data - 请求体数据
   * @returns {Promise<ApiResponse<T>>} API响应
   * @example
   * // 创建新用户
   * const response = await http.post<User, CreateUserDto>('/users', {
   *   name: 'John Doe',
   *   email: 'john@example.com',
   *   role: 'user'
   * });
   */
  async post<T, D = unknown>(url: string, data: D): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * 发送PUT请求
   * @method put
   * @template T - 响应数据类型
   * @template D - 请求数据类型
   * @param {string} url - 请求URL
   * @param {D} data - 请求体数据
   * @returns {Promise<ApiResponse<T>>} API响应
   * @example
   * // 更新用户信息
   * const response = await http.put<User, UpdateUserDto>('/users/1', {
   *   name: 'Jane Doe',
   *   email: 'jane@example.com'
   * });
   */
  async put<T, D = unknown>(url: string, data: D): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * 发送PATCH请求
   * @method patch
   * @template T - 响应数据类型
   * @template D - 请求数据类型
   * @param {string} url - 请求URL
   * @param {D} data - 请求体数据
   * @returns {Promise<ApiResponse<T>>} API响应
   * @example
   * // 部分更新用户信息
   * const response = await http.patch<User, Partial<User>>('/users/1', {
   *   email: 'newemail@example.com'
   * });
   */
  async patch<T, D = unknown>(url: string, data: D): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  /**
   * 发送DELETE请求
   * @method delete
   * @template T - 响应数据类型
   * @param {string} url - 请求URL
   * @returns {Promise<ApiResponse<T>>} API响应
   * @example
   * // 删除用户
   * const response = await http.delete<void>('/users/1');
   */
  async delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      method: 'DELETE'
    });
  }

  /**
   * 上传文件
   * @method upload
   * @template T - 响应数据类型
   * @param {string} url - 上传URL
   * @param {File} file - 文件对象
   * @param {string} [fieldName='file'] - 表单字段名
   * @param {Record<string, string>} [additionalData] - 额外的表单数据
   * @returns {Promise<ApiResponse<T>>} API响应
   * @example
   * // 上传单个文件
   * const response = await http.upload<UploadResult>('/upload', myFile);
   * 
   * // 上传文件并附带额外数据
   * const response = await http.upload<UploadResult>('/upload', myFile, 'avatar', {
   *   userId: '123',
   *   description: 'Profile picture'
   * });
   */
  async upload<T>(
    url: string,
    file: File,
    fieldName: string = 'file',
    additionalData?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append(fieldName, file);

    if (additionalData) {
      for (const [key, value] of Object.entries(additionalData)) {
        formData.append(key, value);
      }
    }

    // 移除Content-Type头，让浏览器自动设置
    const headers = { ...this.headers };
    delete headers['Content-Type'];

    return this.request<T>(url, {
      method: 'POST',
      body: formData,
      headers
    });
  }
}

/**
 * 创建默认HTTP客户端实例
 * @function createHttpClient
 * @param {Partial<ConfigOptions>} [options] - 可选配置
 * @returns {HttpClient} HTTP客户端实例
 * @example
 * // 使用默认配置创建客户端
 * const http = createHttpClient();
 * 
 * // 使用自定义配置创建客户端
 * const http = createHttpClient({
 *   baseUrl: 'https://api.myapp.com',
 *   timeout: 15000
 * });
 */
export function createHttpClient(options?: Partial<ConfigOptions>): HttpClient {
  const defaultOptions: ConfigOptions = {
    baseUrl: 'http://localhost:3000',
    timeout: 30000,
    debug: false,
    retryCount: 3,
    ...options
  };

  return new HttpClient(defaultOptions);
}
