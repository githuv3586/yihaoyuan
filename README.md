# 公共 API 文档库

一个功能完整的 TypeScript/React 工具库，包含工具函数、HTTP 客户端、React 组件和自定义 Hooks。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0-61dafb.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 📚 目录

- [特性](#-特性)
- [快速开始](#-快速开始)
- [项目结构](#-项目结构)
- [API 文档](#-api-文档)
- [使用示例](#-使用示例)
- [贡献指南](#-贡献指南)

---

## ✨ 特性

### 工具函数
- **字符串处理**: `toCamelCase`, `toKebabCase`, `truncate`, `capitalize` 等
- **数组操作**: `chunk`, `unique`, `groupBy`, `intersection`, `sortBy` 等
- **日期时间**: `formatDate`, `dateDiff`, `addTime`, `timeAgo` 等
- **数据验证**: `isValidEmail`, `isValidPhone`, `validatePassword` 等

### HTTP 客户端
- 基于 Fetch API 的封装
- 请求/响应拦截器
- 自动重试机制
- 请求超时控制
- 文件上传支持

### React 组件
- **Button**: 多变体、多尺寸的按钮组件
- **Input**: 带验证、图标支持的输入框
- **Modal**: 可配置的模态框组件
- **Card**: 灵活的卡片容器组件

### React Hooks
- **useDebounce**: 输入防抖
- **useLocalStorage**: 本地存储状态管理
- **useFetch**: 数据获取与缓存
- **useToggle**: 布尔状态切换

---

## 🚀 快速开始

### 安装

```bash
# npm
npm install @your-org/utils-library

# yarn
yarn add @your-org/utils-library

# pnpm
pnpm add @your-org/utils-library
```

### 基本使用

```typescript
// 工具函数
import { formatDate, unique, isValidEmail } from '@your-org/utils-library';

formatDate(new Date(), 'YYYY-MM-DD');  // '2024-01-15'
unique([1, 2, 2, 3]);                   // [1, 2, 3]
isValidEmail('test@example.com');       // true

// React 组件
import { Button, Input, Modal } from '@your-org/utils-library';

function App() {
  return (
    <div>
      <Input label="用户名" placeholder="请输入用户名" />
      <Button variant="primary">提交</Button>
    </div>
  );
}

// React Hooks
import { useDebounce, useFetch } from '@your-org/utils-library';

function SearchComponent() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const { data, loading } = useFetch(`/api/search?q=${debouncedQuery}`);
  // ...
}

// HTTP 客户端
import { createHttpClient } from '@your-org/utils-library';

const http = createHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 10000
});

const users = await http.get('/users');
```

---

## 📁 项目结构

```
src/
├── types/                 # 类型定义
│   └── index.ts          # 公共接口、枚举和类型别名
├── utils/                 # 工具函数
│   ├── string.ts         # 字符串处理函数
│   ├── array.ts          # 数组处理函数
│   ├── date.ts           # 日期时间函数
│   ├── validation.ts     # 数据验证函数
│   └── index.ts          # 导出入口
├── api/                   # API 相关
│   ├── http.ts           # HTTP 客户端实现
│   └── index.ts          # 导出入口
├── components/            # React 组件
│   ├── Button.tsx        # 按钮组件
│   ├── Input.tsx         # 输入框组件
│   ├── Modal.tsx         # 模态框组件
│   ├── Card.tsx          # 卡片组件
│   └── index.ts          # 导出入口
├── hooks/                 # React Hooks
│   ├── useDebounce.ts    # 防抖 Hook
│   ├── useLocalStorage.ts # 本地存储 Hook
│   ├── useFetch.ts       # 数据获取 Hook
│   ├── useToggle.ts      # 切换状态 Hook
│   └── index.ts          # 导出入口
└── index.ts              # 库主入口

docs/
├── api/                   # API 文档
│   ├── utils.md          # 工具函数文档
│   ├── http-client.md    # HTTP 客户端文档
│   ├── hooks.md          # Hooks 文档
│   └── types.md          # 类型定义文档
├── components/            # 组件文档
│   └── README.md         # 组件使用指南
└── guides/                # 指南
    └── getting-started.md # 快速入门指南
```

---

## 📖 API 文档

### 工具函数

#### 字符串处理

| 函数 | 描述 | 示例 |
|------|------|------|
| `toCamelCase(str)` | 转换为驼峰命名 | `toCamelCase('hello-world')` → `'helloWorld'` |
| `toKebabCase(str)` | 转换为短横线命名 | `toKebabCase('helloWorld')` → `'hello-world'` |
| `toSnakeCase(str)` | 转换为下划线命名 | `toSnakeCase('helloWorld')` → `'hello_world'` |
| `truncate(str, len)` | 截断字符串 | `truncate('Hello World', 8)` → `'Hello...'` |
| `capitalize(str)` | 首字母大写 | `capitalize('hello')` → `'Hello'` |
| `isBlank(str)` | 检查是否为空 | `isBlank('')` → `true` |
| `randomString(len)` | 生成随机字符串 | `randomString(8)` → `'aB3xY9kL'` |

#### 数组处理

| 函数 | 描述 | 示例 |
|------|------|------|
| `chunk(arr, size)` | 分割数组 | `chunk([1,2,3,4,5], 2)` → `[[1,2],[3,4],[5]]` |
| `unique(arr)` | 数组去重 | `unique([1,2,2,3])` → `[1,2,3]` |
| `groupBy(arr, fn)` | 按键分组 | `groupBy(users, u => u.age)` |
| `intersection(a, b)` | 计算交集 | `intersection([1,2,3], [2,3,4])` → `[2,3]` |
| `difference(a, b)` | 计算差集 | `difference([1,2,3], [2])` → `[1,3]` |
| `sortBy(arr, fn)` | 排序数组 | `sortBy(users, u => u.name)` |
| `sum(arr)` | 求和 | `sum([1,2,3])` → `6` |
| `paginate(arr, page, size)` | 分页 | `paginate(data, 1, 10)` |

#### 日期时间

| 函数 | 描述 | 示例 |
|------|------|------|
| `formatDate(date, fmt)` | 格式化日期 | `formatDate(date, 'YYYY-MM-DD')` |
| `parseDate(str, fmt)` | 解析日期字符串 | `parseDate('2024-01-15', 'YYYY-MM-DD')` |
| `dateDiff(d1, d2, unit)` | 计算日期差 | `dateDiff(d1, d2, 'days')` |
| `addTime(date, n, unit)` | 添加时间 | `addTime(date, 7, 'days')` |
| `timeAgo(date)` | 相对时间 | `timeAgo(date)` → `'2小时前'` |
| `isToday(date)` | 是否是今天 | `isToday(new Date())` → `true` |

#### 数据验证

| 函数 | 描述 | 示例 |
|------|------|------|
| `isValidEmail(str)` | 验证邮箱 | `isValidEmail('a@b.com')` → `true` |
| `isValidPhone(str)` | 验证手机号 | `isValidPhone('13800138000')` → `true` |
| `isValidUrl(str)` | 验证URL | `isValidUrl('https://...')` → `true` |
| `validatePassword(str)` | 验证密码强度 | 返回 `ValidationResult` |
| `isEmpty(val)` | 检查是否为空 | `isEmpty([])` → `true` |
| `isNumeric(val)` | 检查是否为数字 | `isNumeric('123')` → `true` |

📄 详细文档: [工具函数 API](docs/api/utils.md)

---

### HTTP 客户端

```typescript
import { createHttpClient } from '@your-org/utils-library';

const http = createHttpClient({
  baseUrl: 'https://api.example.com',
  timeout: 10000,
  debug: false,
  retryCount: 3
});

// GET 请求
const users = await http.get<User[]>('/users', { page: 1, limit: 10 });

// POST 请求
const newUser = await http.post<User>('/users', { name: 'John', email: 'john@example.com' });

// PUT 请求
const updated = await http.put<User>('/users/1', { name: 'Jane' });

// PATCH 请求
const patched = await http.patch<User>('/users/1', { email: 'new@email.com' });

// DELETE 请求
await http.delete('/users/1');

// 文件上传
const result = await http.upload('/upload', file, 'avatar');

// 拦截器
http.addRequestInterceptor((config) => {
  config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});
```

📄 详细文档: [HTTP 客户端 API](docs/api/http-client.md)

---

### React 组件

#### Button 按钮

```tsx
import { Button } from '@your-org/utils-library';

<Button variant="primary" size="medium" onClick={handleClick}>
  点击我
</Button>

<Button variant="danger" loading={isLoading}>
  删除
</Button>

<Button leftIcon={<SearchIcon />}>
  搜索
</Button>
```

#### Input 输入框

```tsx
import { Input } from '@your-org/utils-library';

<Input
  label="邮箱"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={emailError}
  placeholder="请输入邮箱"
/>
```

#### Modal 模态框

```tsx
import { Modal, Button } from '@your-org/utils-library';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="确认删除"
  footer={
    <>
      <Button variant="ghost" onClick={() => setIsOpen(false)}>取消</Button>
      <Button variant="danger" onClick={handleDelete}>删除</Button>
    </>
  }
>
  <p>确定要删除这条记录吗？</p>
</Modal>
```

#### Card 卡片

```tsx
import { Card } from '@your-org/utils-library';

<Card
  title="文章标题"
  coverImage="/path/to/image.jpg"
  clickable
  onClick={() => navigate('/article/1')}
>
  <p>文章摘要...</p>
</Card>
```

📄 详细文档: [组件文档](docs/components/README.md)

---

### React Hooks

#### useDebounce

```tsx
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

useEffect(() => {
  if (debouncedSearch) {
    fetchResults(debouncedSearch);
  }
}, [debouncedSearch]);
```

#### useLocalStorage

```tsx
const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'light');

<button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
  切换主题
</button>
```

#### useFetch

```tsx
const { data, loading, error, refetch } = useFetch<User[]>('/api/users', {
  cacheTime: 60000,
  onSuccess: (data) => console.log('成功:', data),
  onError: (err) => console.error('失败:', err)
});
```

#### useToggle

```tsx
const [isOpen, { toggle, setTrue, setFalse }] = useToggle(false);

<button onClick={toggle}>切换</button>
<button onClick={setTrue}>打开</button>
<button onClick={setFalse}>关闭</button>
```

📄 详细文档: [Hooks API](docs/api/hooks.md)

---

## 💡 使用示例

### 完整表单示例

```tsx
import { useState } from 'react';
import { Button, Input, Modal } from '@your-org/utils-library';
import { isValidEmail, validatePassword } from '@your-org/utils-library';

function RegisterForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const validate = () => {
    const newErrors = { email: '', password: '' };
    
    if (!isValidEmail(form.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }
    
    const passwordResult = validatePassword(form.password);
    if (!passwordResult.isValid) {
      newErrors.password = passwordResult.errors[0];
    }
    
    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setLoading(true);
    try {
      await registerUser(form);
      setShowSuccess(true);
    } catch (error) {
      // 处理错误
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        label="邮箱"
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        error={errors.email}
        fullWidth
      />
      
      <Input
        label="密码"
        type="password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        error={errors.password}
        helperText="密码至少8位，包含大小写字母和数字"
        fullWidth
      />
      
      <Button onClick={handleSubmit} loading={loading} fullWidth>
        注册
      </Button>
      
      <Modal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="注册成功">
        <p>欢迎加入！</p>
      </Modal>
    </div>
  );
}
```

### API 服务封装示例

```typescript
import { createHttpClient } from '@your-org/utils-library';
import type { User, ApiResponse, PaginatedResponse } from '@your-org/utils-library';

const http = createHttpClient({
  baseUrl: process.env.API_URL,
  timeout: 10000,
  retryCount: 2
});

// 添加认证拦截器
http.addRequestInterceptor((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  }
  return config;
});

// 用户服务
export const userService = {
  getUsers: (page: number, pageSize: number) =>
    http.get<PaginatedResponse<User>>('/users', { page, pageSize }),
  
  getUser: (id: string) =>
    http.get<User>(`/users/${id}`),
  
  createUser: (data: Partial<User>) =>
    http.post<User>('/users', data),
  
  updateUser: (id: string, data: Partial<User>) =>
    http.patch<User>(`/users/${id}`, data),
  
  deleteUser: (id: string) =>
    http.delete<void>(`/users/${id}`)
};
```

---

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

### 开发命令

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 构建
npm run build

# 代码检查
npm run lint
```

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

## 📬 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 [Issue](https://github.com/your-org/utils-library/issues)
- 发送邮件至 support@example.com

---

> 📅 最后更新: 2024年1月15日
