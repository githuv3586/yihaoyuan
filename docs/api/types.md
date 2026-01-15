# 类型定义文档

本文档详细介绍了项目中所有公共类型和接口的定义。

## 目录

- [接口 (Interfaces)](#接口-interfaces)
- [枚举 (Enums)](#枚举-enums)
- [类型别名 (Type Aliases)](#类型别名-type-aliases)

---

## 接口 (Interfaces)

### User

用户信息接口，表示系统中的用户实体。

```typescript
interface User {
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
```

**使用示例:**

```typescript
import { User, UserRole } from '@/types';

const user: User = {
  id: '1',
  username: 'john_doe',
  email: 'john@example.com',
  role: UserRole.USER,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date()
};
```

---

### ApiResponse<T>

标准化的 API 响应格式，使用泛型 `T` 表示响应数据的类型。

```typescript
interface ApiResponse<T> {
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
```

**使用示例:**

```typescript
import { ApiResponse, User } from '@/types';

// 获取单个用户的响应
type GetUserResponse = ApiResponse<User>;

// 获取用户列表的响应
type GetUsersResponse = ApiResponse<User[]>;

// 使用示例
async function getUser(id: string): Promise<ApiResponse<User>> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

const result = await getUser('1');
if (result.success) {
  console.log(result.data.username);
}
```

---

### PaginationParams

用于分页查询的参数接口。

```typescript
interface PaginationParams {
  /** 当前页码（从1开始） */
  page: number;
  
  /** 每页数量 */
  pageSize: number;
  
  /** 排序字段（可选） */
  sortBy?: string;
  
  /** 排序方向（可选） */
  sortOrder?: 'asc' | 'desc';
}
```

**使用示例:**

```typescript
import { PaginationParams } from '@/types';

const params: PaginationParams = {
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};

// 在API请求中使用
const response = await http.get('/users', params);
```

---

### PaginatedResponse<T>

带分页信息的响应格式。

```typescript
interface PaginatedResponse<T> {
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
```

**使用示例:**

```typescript
import { PaginatedResponse, User } from '@/types';

type UserListResponse = PaginatedResponse<User>;

// 在组件中使用
function UserList() {
  const [data, setData] = useState<UserListResponse | null>(null);
  
  useEffect(() => {
    fetch('/api/users?page=1&pageSize=10')
      .then(res => res.json())
      .then(setData);
  }, []);
  
  if (!data) return <p>Loading...</p>;
  
  return (
    <div>
      <ul>
        {data.items.map(user => (
          <li key={user.id}>{user.username}</li>
        ))}
      </ul>
      <div>
        共 {data.total} 条，第 {data.page}/{data.totalPages} 页
      </div>
      {data.hasPrevPage && <button>上一页</button>}
      {data.hasNextPage && <button>下一页</button>}
    </div>
  );
}
```

---

### ValidationResult

表单字段验证的结果接口。

```typescript
interface ValidationResult {
  /** 是否验证通过 */
  isValid: boolean;
  
  /** 错误消息列表 */
  errors: string[];
  
  /** 字段名称 */
  field: string;
}
```

**使用示例:**

```typescript
import { ValidationResult } from '@/types';
import { validatePassword } from '@/utils';

const result: ValidationResult = validatePassword('abc123');

if (!result.isValid) {
  console.log(`字段 ${result.field} 验证失败:`);
  result.errors.forEach(error => {
    console.log(`  - ${error}`);
  });
}
```

---

### ConfigOptions

应用程序配置选项接口。

```typescript
interface ConfigOptions {
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
```

**使用示例:**

```typescript
import { ConfigOptions } from '@/types';
import { createHttpClient } from '@/api';

const config: ConfigOptions = {
  baseUrl: 'https://api.example.com',
  timeout: 10000,
  debug: process.env.NODE_ENV === 'development',
  retryCount: 3,
  headers: {
    'X-App-Version': '1.0.0'
  }
};

const http = createHttpClient(config);
```

---

## 枚举 (Enums)

### UserRole

定义系统中可用的用户角色。

```typescript
enum UserRole {
  /** 普通用户 */
  USER = 'user',
  
  /** 管理员 */
  ADMIN = 'admin',
  
  /** 超级管理员 */
  SUPER_ADMIN = 'super_admin',
  
  /** 访客 */
  GUEST = 'guest'
}
```

**使用示例:**

```typescript
import { UserRole, User } from '@/types';

// 创建用户
const newUser: Partial<User> = {
  username: 'john',
  email: 'john@example.com',
  role: UserRole.USER
};

// 权限检查
function canEditPost(user: User): boolean {
  return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
}

// 获取角色显示名称
function getRoleName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    [UserRole.USER]: '普通用户',
    [UserRole.ADMIN]: '管理员',
    [UserRole.SUPER_ADMIN]: '超级管理员',
    [UserRole.GUEST]: '访客'
  };
  return roleNames[role];
}
```

---

## 类型别名 (Type Aliases)

### EventHandler<T>

通用事件处理器函数类型。

```typescript
type EventHandler<T = unknown> = (event: T) => void | Promise<void>;
```

**使用示例:**

```typescript
import { EventHandler } from '@/types';

interface ClickEvent {
  x: number;
  y: number;
  target: HTMLElement;
}

// 同步处理器
const handleClick: EventHandler<ClickEvent> = (event) => {
  console.log(`Clicked at (${event.x}, ${event.y})`);
};

// 异步处理器
const handleSubmit: EventHandler<FormData> = async (data) => {
  await submitForm(data);
};
```

---

### AsyncFunction<T, R>

异步函数的类型定义。

```typescript
type AsyncFunction<T = void, R = void> = (arg: T) => Promise<R>;
```

**使用示例:**

```typescript
import { AsyncFunction, User } from '@/types';

// 定义获取用户的函数类型
type GetUserFn = AsyncFunction<string, User>;

const getUser: GetUserFn = async (id) => {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
};

// 通用的异步操作包装器
async function withLoading<T, R>(
  fn: AsyncFunction<T, R>,
  setLoading: (loading: boolean) => void
): AsyncFunction<T, R> {
  return async (arg: T) => {
    setLoading(true);
    try {
      return await fn(arg);
    } finally {
      setLoading(false);
    }
  };
}
```

---

### Nullable<T>

表示可以为 null 的类型。

```typescript
type Nullable<T> = T | null;
```

**使用示例:**

```typescript
import { Nullable, User } from '@/types';

// 可能为空的用户
type MaybeUser = Nullable<User>;

function useCurrentUser(): MaybeUser {
  const [user, setUser] = useState<Nullable<User>>(null);
  
  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);
  
  return user;
}

// 使用时需要检查 null
const user = useCurrentUser();
if (user !== null) {
  console.log(user.username);
}
```

---

### Optional<T>

表示可以为 undefined 的类型。

```typescript
type Optional<T> = T | undefined;
```

**使用示例:**

```typescript
import { Optional } from '@/types';

interface SearchParams {
  query: string;
  page: Optional<number>;
  category: Optional<string>;
}

function search(params: SearchParams) {
  const { query, page = 1, category } = params;
  
  let url = `/api/search?q=${query}&page=${page}`;
  if (category !== undefined) {
    url += `&category=${category}`;
  }
  
  return fetch(url);
}
```

---

## 类型工具

### 扩展现有类型

```typescript
// 创建用户时不需要 id 和时间戳
type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;

// 更新用户时所有字段可选
type UpdateUserDto = Partial<User>;

// 只选择部分字段
type UserPreview = Pick<User, 'id' | 'username' | 'avatar'>;
```

### 实际应用示例

```typescript
import { User, UserRole, ApiResponse, PaginatedResponse } from '@/types';

// DTO 类型
type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateUserDto = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;

// API 服务类型
interface UserService {
  getUsers(page: number, pageSize: number): Promise<ApiResponse<PaginatedResponse<User>>>;
  getUser(id: string): Promise<ApiResponse<User>>;
  createUser(data: CreateUserDto): Promise<ApiResponse<User>>;
  updateUser(id: string, data: UpdateUserDto): Promise<ApiResponse<User>>;
  deleteUser(id: string): Promise<ApiResponse<void>>;
}

// 实现示例
const userService: UserService = {
  async getUsers(page, pageSize) {
    return http.get('/users', { page, pageSize });
  },
  
  async getUser(id) {
    return http.get(`/users/${id}`);
  },
  
  async createUser(data) {
    return http.post('/users', data);
  },
  
  async updateUser(id, data) {
    return http.patch(`/users/${id}`, data);
  },
  
  async deleteUser(id) {
    return http.delete(`/users/${id}`);
  }
};
```
