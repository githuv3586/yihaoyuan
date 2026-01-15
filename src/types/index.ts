/**
 * @fileoverview 公共类型定义
 * @module types
 * @description 包含项目中所有公共类型和接口的定义
 */

/**
 * 用户信息接口
 * @interface User
 * @description 表示系统中的用户实体
 */
export interface User {
  /** 用户唯一标识符 */
  id: string;
  /** 用户名 */
  username: string;
  /** 用户电子邮件 */
  email: string;
  /** 用户头像URL（可选） */
  avatar?: string;
  /** 用户角色 */
  role: UserRole;
  /** 账户创建时间 */
  createdAt: Date;
  /** 最后更新时间 */
  updatedAt: Date;
}

/**
 * 用户角色枚举
 * @enum {string}
 * @description 定义系统中可用的用户角色
 */
export enum UserRole {
  /** 普通用户 */
  USER = 'user',
  /** 管理员 */
  ADMIN = 'admin',
  /** 超级管理员 */
  SUPER_ADMIN = 'super_admin',
  /** 访客 */
  GUEST = 'guest'
}

/**
 * API响应接口
 * @interface ApiResponse
 * @template T - 响应数据的类型
 * @description 标准化的API响应格式
 */
export interface ApiResponse<T> {
  /** 响应是否成功 */
  success: boolean;
  /** 响应数据 */
  data: T;
  /** 响应消息 */
  message: string;
  /** HTTP状态码 */
  statusCode: number;
  /** 时间戳 */
  timestamp: string;
}

/**
 * 分页参数接口
 * @interface PaginationParams
 * @description 用于分页查询的参数
 */
export interface PaginationParams {
  /** 当前页码（从1开始） */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 排序字段（可选） */
  sortBy?: string;
  /** 排序方向（可选） */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应接口
 * @interface PaginatedResponse
 * @template T - 列表项的类型
 * @description 带分页信息的响应格式
 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  items: T[];
  /** 总数量 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNextPage: boolean;
  /** 是否有上一页 */
  hasPrevPage: boolean;
}

/**
 * 表单验证结果接口
 * @interface ValidationResult
 * @description 表单字段验证的结果
 */
export interface ValidationResult {
  /** 是否验证通过 */
  isValid: boolean;
  /** 错误消息列表 */
  errors: string[];
  /** 字段名称 */
  field: string;
}

/**
 * 配置选项接口
 * @interface ConfigOptions
 * @description 应用程序配置选项
 */
export interface ConfigOptions {
  /** API基础URL */
  baseUrl: string;
  /** 请求超时时间（毫秒） */
  timeout: number;
  /** 是否启用调试模式 */
  debug: boolean;
  /** 重试次数 */
  retryCount: number;
  /** 自定义请求头 */
  headers?: Record<string, string>;
}

/**
 * 事件处理器类型
 * @typedef EventHandler
 * @template T - 事件数据类型
 * @description 通用事件处理器函数类型
 */
export type EventHandler<T = unknown> = (event: T) => void | Promise<void>;

/**
 * 异步函数类型
 * @typedef AsyncFunction
 * @template T - 参数类型
 * @template R - 返回值类型
 * @description 异步函数的类型定义
 */
export type AsyncFunction<T = void, R = void> = (arg: T) => Promise<R>;

/**
 * 可空类型
 * @typedef Nullable
 * @template T - 基础类型
 * @description 表示可以为null的类型
 */
export type Nullable<T> = T | null;

/**
 * 可选类型
 * @typedef Optional
 * @template T - 基础类型
 * @description 表示可以为undefined的类型
 */
export type Optional<T> = T | undefined;
