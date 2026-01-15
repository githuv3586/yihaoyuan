# HTTP 客户端 API 文档

本文档详细介绍了 HTTP 客户端的使用方法，包括配置选项、请求方法和拦截器。

## 目录

- [快速开始](#快速开始)
- [创建客户端](#创建客户端)
- [配置选项](#配置选项)
- [请求方法](#请求方法)
- [拦截器](#拦截器)
- [文件上传](#文件上传)
- [错误处理](#错误处理)
- [完整示例](#完整示例)

---

## 快速开始

```typescript
import { createHttpClient } from '@/api';

// 创建HTTP客户端实例
const http = createHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 10000
});

// 发送GET请求
const users = await http.get('/users');

// 发送POST请求
const newUser = await http.post('/users', {
  name: 'John',
  email: 'john@example.com'
});
```

---

## 创建客户端

### 使用 createHttpClient 函数

```typescript
import { createHttpClient } from '@/api';

const http = createHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 10000,
  debug: false,
  retryCount: 3,
  headers: {
    'Authorization': 'Bearer your-token'
  }
});
```

### 使用 HttpClient 类

```typescript
import { HttpClient } from '@/api';

const http = new HttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 10000,
  debug: true,
  retryCount: 2
});
```

---

## 配置选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| baseUrl | string | 'http://localhost:3000' | API基础URL |
| timeout | number | 30000 | 请求超时时间（毫秒） |
| debug | boolean | false | 是否启用调试模式 |
| retryCount | number | 3 | 失败重试次数 |
| headers | Record<string, string> | {} | 自定义请求头 |

### 配置示例

```typescript
import { ConfigOptions } from '@/types';

const config: ConfigOptions = {
  baseUrl: 'https://api.myapp.com',
  timeout: 15000,
  debug: process.env.NODE_ENV === 'development',
  retryCount: 2,
  headers: {
    'X-App-Version': '1.0.0',
    'Accept-Language': 'zh-CN'
  }
};

const http = createHttpClient(config);
```

---

## 请求方法

### GET 请求

获取数据。

**函数签名:**
```typescript
async get<T>(url: string, params?: Record<string, string | number>): Promise<ApiResponse<T>>
```

**参数:**
| 参数 | 类型 | 描述 |
|------|------|------|
| url | string | 请求URL |
| params | Record<string, string \| number> | 查询参数（可选） |

**示例:**
```typescript
// 基本GET请求
const response = await http.get<User[]>('/users');

// 带查询参数
const response = await http.get<User[]>('/users', {
  page: 1,
  limit: 10,
  status: 'active'
});
// 请求URL: /users?page=1&limit=10&status=active
```

---

### POST 请求

创建新资源。

**函数签名:**
```typescript
async post<T, D = unknown>(url: string, data: D): Promise<ApiResponse<T>>
```

**示例:**
```typescript
interface CreateUserDto {
  name: string;
  email: string;
  role: string;
}

const response = await http.post<User, CreateUserDto>('/users', {
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user'
});

if (response.success) {
  console.log('创建成功:', response.data);
} else {
  console.error('创建失败:', response.message);
}
```

---

### PUT 请求

完全更新资源。

**函数签名:**
```typescript
async put<T, D = unknown>(url: string, data: D): Promise<ApiResponse<T>>
```

**示例:**
```typescript
interface UpdateUserDto {
  name: string;
  email: string;
}

const response = await http.put<User, UpdateUserDto>('/users/1', {
  name: 'Jane Doe',
  email: 'jane@example.com'
});
```

---

### PATCH 请求

部分更新资源。

**函数签名:**
```typescript
async patch<T, D = unknown>(url: string, data: D): Promise<ApiResponse<T>>
```

**示例:**
```typescript
// 只更新邮箱
const response = await http.patch<User, Partial<User>>('/users/1', {
  email: 'newemail@example.com'
});
```

---

### DELETE 请求

删除资源。

**函数签名:**
```typescript
async delete<T>(url: string): Promise<ApiResponse<T>>
```

**示例:**
```typescript
const response = await http.delete<void>('/users/1');

if (response.success) {
  console.log('删除成功');
}
```

---

## 拦截器

### 请求拦截器

在请求发送前修改请求配置。

**函数签名:**
```typescript
addRequestInterceptor(interceptor: RequestInterceptor): void

type RequestInterceptor = (config: RequestInit) => RequestInit | Promise<RequestInit>
```

**示例:**
```typescript
// 添加认证Token
http.addRequestInterceptor((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  return config;
});

// 添加请求ID
http.addRequestInterceptor((config) => {
  config.headers = {
    ...config.headers,
    'X-Request-ID': crypto.randomUUID()
  };
  return config;
});

// 异步拦截器
http.addRequestInterceptor(async (config) => {
  const token = await refreshTokenIfNeeded();
  config.headers = {
    ...config.headers,
    'Authorization': `Bearer ${token}`
  };
  return config;
});
```

---

### 响应拦截器

在响应返回后处理响应数据。

**函数签名:**
```typescript
addResponseInterceptor(interceptor: ResponseInterceptor): void

type ResponseInterceptor = (response: Response) => Response | Promise<Response>
```

**示例:**
```typescript
// 处理401错误
http.addResponseInterceptor((response) => {
  if (response.status === 401) {
    // Token过期，跳转到登录页
    window.location.href = '/login';
  }
  return response;
});

// 处理500错误
http.addResponseInterceptor((response) => {
  if (response.status >= 500) {
    // 记录错误日志
    console.error('服务器错误:', response.status);
    // 可以发送到监控系统
  }
  return response;
});

// 响应时间监控
http.addResponseInterceptor((response) => {
  const responseTime = response.headers.get('X-Response-Time');
  if (responseTime && parseInt(responseTime) > 3000) {
    console.warn('慢请求:', response.url, responseTime + 'ms');
  }
  return response;
});
```

---

## 文件上传

### upload 方法

上传文件到服务器。

**函数签名:**
```typescript
async upload<T>(
  url: string,
  file: File,
  fieldName?: string,
  additionalData?: Record<string, string>
): Promise<ApiResponse<T>>
```

**参数:**
| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| url | string | - | 上传URL |
| file | File | - | 文件对象 |
| fieldName | string | 'file' | 表单字段名 |
| additionalData | Record<string, string> | - | 额外的表单数据 |

**示例:**
```typescript
// 基本文件上传
const fileInput = document.getElementById('file') as HTMLInputElement;
const file = fileInput.files[0];

const response = await http.upload<UploadResult>('/upload', file);

if (response.success) {
  console.log('上传成功:', response.data.url);
}

// 带额外数据的上传
const response = await http.upload<UploadResult>(
  '/upload',
  file,
  'avatar',
  {
    userId: '123',
    description: 'Profile picture'
  }
);

// React组件示例
function FileUploader() {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const response = await http.upload<{ url: string }>('/upload', file);
    
    if (response.success) {
      console.log('文件URL:', response.data.url);
    }
  };

  return <input type="file" onChange={handleFileChange} />;
}
```

---

## 错误处理

### ApiResponse 类型

所有请求方法都返回统一的响应格式。

```typescript
interface ApiResponse<T> {
  success: boolean;    // 请求是否成功
  data: T;            // 响应数据
  message: string;    // 响应消息
  statusCode: number; // HTTP状态码
  timestamp: string;  // 时间戳
}
```

### 错误处理示例

```typescript
// 基本错误处理
const response = await http.get<User>('/users/1');

if (response.success) {
  // 处理成功响应
  console.log('用户:', response.data);
} else {
  // 处理错误响应
  console.error('错误:', response.message);
  console.error('状态码:', response.statusCode);
}

// 使用try-catch
try {
  const response = await http.get<User>('/users/1');
  
  if (!response.success) {
    throw new Error(response.message);
  }
  
  return response.data;
} catch (error) {
  console.error('请求失败:', error);
}

// 封装统一错误处理
async function safeRequest<T>(
  requestFn: () => Promise<ApiResponse<T>>
): Promise<T | null> {
  const response = await requestFn();
  
  if (response.success) {
    return response.data;
  }
  
  // 统一错误处理
  switch (response.statusCode) {
    case 401:
      // 未授权
      redirectToLogin();
      break;
    case 403:
      // 无权限
      showForbiddenMessage();
      break;
    case 404:
      // 未找到
      showNotFoundMessage();
      break;
    default:
      // 其他错误
      showErrorMessage(response.message);
  }
  
  return null;
}

// 使用
const user = await safeRequest(() => http.get<User>('/users/1'));
```

---

## 完整示例

### API 服务封装

```typescript
// services/userService.ts
import { createHttpClient } from '@/api';
import type { User, CreateUserDto, UpdateUserDto, PaginatedResponse, PaginationParams } from '@/types';

// 创建专用的HTTP客户端
const http = createHttpClient({
  baseUrl: process.env.REACT_APP_API_URL || 'https://api.example.com',
  timeout: 10000,
  debug: process.env.NODE_ENV === 'development',
  retryCount: 2
});

// 添加认证拦截器
http.addRequestInterceptor((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  return config;
});

// 添加响应拦截器
http.addResponseInterceptor((response) => {
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  return response;
});

/**
 * 用户服务API
 */
export const userService = {
  /**
   * 获取用户列表
   */
  async getUsers(params: PaginationParams) {
    const response = await http.get<PaginatedResponse<User>>('/users', params);
    return response;
  },

  /**
   * 获取单个用户
   */
  async getUser(id: string) {
    const response = await http.get<User>(`/users/${id}`);
    return response;
  },

  /**
   * 创建用户
   */
  async createUser(data: CreateUserDto) {
    const response = await http.post<User, CreateUserDto>('/users', data);
    return response;
  },

  /**
   * 更新用户
   */
  async updateUser(id: string, data: UpdateUserDto) {
    const response = await http.put<User, UpdateUserDto>(`/users/${id}`, data);
    return response;
  },

  /**
   * 部分更新用户
   */
  async patchUser(id: string, data: Partial<User>) {
    const response = await http.patch<User, Partial<User>>(`/users/${id}`, data);
    return response;
  },

  /**
   * 删除用户
   */
  async deleteUser(id: string) {
    const response = await http.delete<void>(`/users/${id}`);
    return response;
  },

  /**
   * 上传用户头像
   */
  async uploadAvatar(userId: string, file: File) {
    const response = await http.upload<{ url: string }>(
      `/users/${userId}/avatar`,
      file,
      'avatar'
    );
    return response;
  }
};

export default userService;
```

### 在React组件中使用

```tsx
// components/UserList.tsx
import React, { useEffect, useState } from 'react';
import { userService } from '@/services/userService';
import type { User, PaginatedResponse } from '@/types';

function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadUsers();
  }, [page]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    
    const response = await userService.getUsers({
      page,
      pageSize: 10
    });

    if (response.success) {
      setUsers(response.data.items);
      setTotal(response.data.total);
    } else {
      setError(response.message);
    }
    
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除吗？')) return;
    
    const response = await userService.deleteUser(id);
    
    if (response.success) {
      // 重新加载列表
      loadUsers();
    } else {
      alert('删除失败: ' + response.message);
    }
  };

  if (loading) return <p>加载中...</p>;
  if (error) return <p>错误: {error}</p>;

  return (
    <div>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            {user.name} - {user.email}
            <button onClick={() => handleDelete(user.id)}>删除</button>
          </li>
        ))}
      </ul>
      <div>
        <button onClick={() => setPage(p => Math.max(1, p - 1))}>上一页</button>
        <span>第 {page} 页</span>
        <button onClick={() => setPage(p => p + 1)}>下一页</button>
      </div>
    </div>
  );
}

export default UserList;
```
