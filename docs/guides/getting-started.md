# 快速入门指南

本指南将帮助你快速上手使用这个工具库。

## 目录

- [安装](#安装)
- [基本使用](#基本使用)
- [项目结构](#项目结构)
- [最佳实践](#最佳实践)

---

## 安装

### 使用 npm

```bash
npm install @your-org/utils-library
```

### 使用 yarn

```bash
yarn add @your-org/utils-library
```

### 使用 pnpm

```bash
pnpm add @your-org/utils-library
```

---

## 基本使用

### 导入方式

你可以按需导入所需的功能：

```typescript
// 导入工具函数
import { formatDate, toCamelCase, unique } from '@your-org/utils-library';

// 导入组件
import { Button, Input, Modal, Card } from '@your-org/utils-library';

// 导入 Hooks
import { useDebounce, useLocalStorage, useFetch } from '@your-org/utils-library';

// 导入类型
import type { User, ApiResponse, ConfigOptions } from '@your-org/utils-library';

// 导入 HTTP 客户端
import { createHttpClient, HttpClient } from '@your-org/utils-library';
```

### 工具函数示例

```typescript
import { formatDate, toCamelCase, unique, isValidEmail } from '@your-org/utils-library';

// 日期格式化
const dateStr = formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss');
console.log(dateStr); // '2024-01-15 14:30:00'

// 字符串转换
const camelCase = toCamelCase('hello-world');
console.log(camelCase); // 'helloWorld'

// 数组去重
const uniqueArr = unique([1, 2, 2, 3, 3, 3]);
console.log(uniqueArr); // [1, 2, 3]

// 邮箱验证
const isValid = isValidEmail('user@example.com');
console.log(isValid); // true
```

### 组件使用示例

```tsx
import { Button, Input, Modal } from '@your-org/utils-library';
import { useState } from 'react';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');

  return (
    <div>
      <Input
        label="邮箱"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="请输入邮箱"
      />
      
      <Button onClick={() => setIsModalOpen(true)}>
        打开模态框
      </Button>
      
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="提示"
      >
        <p>你输入的邮箱是: {email}</p>
      </Modal>
    </div>
  );
}
```

### Hooks 使用示例

```tsx
import { useDebounce, useLocalStorage, useFetch } from '@your-org/utils-library';
import { useState } from 'react';

function SearchComponent() {
  // 使用防抖
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  
  // 使用本地存储
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  
  // 使用数据获取
  const { data, loading, error } = useFetch(`/api/search?q=${debouncedSearch}`, {
    immediate: !!debouncedSearch,
    deps: [debouncedSearch]
  });

  return (
    <div className={theme}>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索..."
      />
      
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        切换主题
      </button>
      
      {loading && <p>加载中...</p>}
      {error && <p>错误: {error.message}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

### HTTP 客户端使用示例

```typescript
import { createHttpClient } from '@your-org/utils-library';
import type { User, ApiResponse } from '@your-org/utils-library';

// 创建客户端
const http = createHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 10000,
  debug: true,
  retryCount: 3
});

// 添加认证拦截器
http.addRequestInterceptor((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`
    };
  }
  return config;
});

// 使用
async function getUsers() {
  const response = await http.get<User[]>('/users');
  
  if (response.success) {
    return response.data;
  }
  
  throw new Error(response.message);
}
```

---

## 项目结构

```
src/
├── types/           # 类型定义
│   └── index.ts
├── utils/           # 工具函数
│   ├── string.ts    # 字符串处理
│   ├── array.ts     # 数组处理
│   ├── date.ts      # 日期处理
│   ├── validation.ts # 数据验证
│   └── index.ts
├── api/             # API 相关
│   ├── http.ts      # HTTP 客户端
│   └── index.ts
├── components/      # React 组件
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── Card.tsx
│   └── index.ts
├── hooks/           # React Hooks
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   ├── useFetch.ts
│   ├── useToggle.ts
│   └── index.ts
└── index.ts         # 主入口
```

---

## 最佳实践

### 1. 按需导入

只导入你需要的功能，避免引入不必要的代码：

```typescript
// ✅ 推荐
import { formatDate } from '@your-org/utils-library';

// ❌ 不推荐
import * as utils from '@your-org/utils-library';
```

### 2. 类型安全

充分利用 TypeScript 类型：

```typescript
import type { User, ApiResponse } from '@your-org/utils-library';

// 明确指定泛型类型
const response = await http.get<User>('/users/1');

// 使用类型守卫
if (response.success) {
  // TypeScript 知道 response.data 是 User 类型
  console.log(response.data.username);
}
```

### 3. 错误处理

始终处理可能的错误：

```typescript
import { useFetch } from '@your-org/utils-library';

function UserProfile({ userId }: { userId: string }) {
  const { data, loading, error, refetch } = useFetch<User>(`/api/users/${userId}`);

  if (loading) return <LoadingSpinner />;
  
  if (error) {
    return (
      <ErrorMessage
        message={error.message}
        onRetry={refetch}
      />
    );
  }

  return <UserCard user={data} />;
}
```

### 4. 组件组合

将组件组合使用以构建复杂 UI：

```tsx
import { Button, Input, Modal, Card } from '@your-org/utils-library';

function CreateUserForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });

  return (
    <Card title="用户管理">
      <Button onClick={() => setIsOpen(true)}>添加用户</Button>
      
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="创建用户"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              创建
            </Button>
          </>
        }
      >
        <Input
          label="姓名"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label="邮箱"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </Modal>
    </Card>
  );
}
```

### 5. 封装业务逻辑

将 HTTP 客户端封装成业务服务：

```typescript
// services/userService.ts
import { createHttpClient } from '@your-org/utils-library';
import type { User } from '@your-org/utils-library';

const http = createHttpClient({
  baseUrl: process.env.API_URL,
  timeout: 10000,
  retryCount: 2
});

export const userService = {
  getUsers: () => http.get<User[]>('/users'),
  getUser: (id: string) => http.get<User>(`/users/${id}`),
  createUser: (data: Partial<User>) => http.post<User>('/users', data),
  updateUser: (id: string, data: Partial<User>) => http.patch<User>(`/users/${id}`, data),
  deleteUser: (id: string) => http.delete<void>(`/users/${id}`)
};
```

---

## 下一步

- 查看 [工具函数 API 文档](../api/utils.md)
- 查看 [组件文档](../components/README.md)
- 查看 [Hooks 文档](../api/hooks.md)
- 查看 [HTTP 客户端文档](../api/http-client.md)
