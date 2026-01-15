# React Hooks API 文档

本文档详细介绍了所有自定义 React Hooks 的使用方法，包括参数说明、返回值和使用示例。

## 目录

- [useDebounce](#usedebounce)
- [useLocalStorage](#uselocalstorage)
- [useFetch](#usefetch)
- [useToggle](#usetoggle)

---

## useDebounce

防抖 Hook，当输入值在指定延迟时间内没有变化时，才会更新返回值。常用于搜索输入框，避免频繁请求 API。

### 引入方式

```typescript
import { useDebounce } from '@/hooks';
```

### 函数签名

```typescript
function useDebounce<T>(value: T, delay: number): T
```

### 参数

| 参数 | 类型 | 描述 |
|------|------|------|
| value | T | 需要防抖的值 |
| delay | number | 延迟时间（毫秒） |

### 返回值

| 类型 | 描述 |
|------|------|
| T | 防抖后的值 |

### 使用示例

#### 搜索输入框防抖

```tsx
import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks';

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (debouncedSearchTerm) {
      // 只有在用户停止输入500ms后才发起请求
      fetch(`/api/search?q=${debouncedSearchTerm}`)
        .then(res => res.json())
        .then(data => setResults(data));
    }
  }, [debouncedSearchTerm]);

  return (
    <div>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="搜索..."
      />
      <ul>
        {results.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

#### 窗口大小监听防抖

```tsx
function ResponsiveComponent() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const debouncedWidth = useDebounce(windowWidth, 200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 使用 debouncedWidth 进行布局计算，避免频繁重渲染
  const columns = debouncedWidth > 1024 ? 4 : debouncedWidth > 768 ? 3 : 2;

  return (
    <div className={`grid grid-cols-${columns}`}>
      {/* 内容 */}
    </div>
  );
}
```

#### 表单自动保存

```tsx
function AutoSaveForm() {
  const [content, setContent] = useState('');
  const debouncedContent = useDebounce(content, 1000);

  useEffect(() => {
    if (debouncedContent) {
      // 自动保存草稿
      saveDraft(debouncedContent);
    }
  }, [debouncedContent]);

  return (
    <textarea
      value={content}
      onChange={(e) => setContent(e.target.value)}
      placeholder="输入内容，自动保存..."
    />
  );
}
```

---

## useLocalStorage

本地存储 Hook，提供与 localStorage 的响应式交互，自动处理 JSON 序列化/反序列化，支持多标签页同步。

### 引入方式

```typescript
import { useLocalStorage } from '@/hooks';
import type { UseLocalStorageReturn } from '@/hooks';
```

### 函数签名

```typescript
function useLocalStorage<T>(key: string, initialValue: T): UseLocalStorageReturn<T>

type UseLocalStorageReturn<T> = [
  T,                                    // 当前值
  (value: T | ((prev: T) => T)) => void, // 设置值
  () => void                            // 移除值
]
```

### 参数

| 参数 | 类型 | 描述 |
|------|------|------|
| key | string | 存储键名 |
| initialValue | T | 初始值 |

### 返回值

| 索引 | 类型 | 描述 |
|------|------|------|
| [0] | T | 当前存储的值 |
| [1] | (value: T \| ((prev: T) => T)) => void | 设置值的函数 |
| [2] | () => void | 移除值的函数 |

### 使用示例

#### 主题切换

```tsx
function ThemeSwitcher() {
  const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'light');

  return (
    <div className={theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'}>
      <button onClick={() => setTheme('light')}>浅色</button>
      <button onClick={() => setTheme('dark')}>深色</button>
      <button onClick={removeTheme}>重置</button>
    </div>
  );
}
```

#### 存储用户偏好设置

```tsx
interface UserPreferences {
  language: string;
  notifications: boolean;
  fontSize: number;
}

function SettingsPanel() {
  const [preferences, setPreferences] = useLocalStorage<UserPreferences>(
    'userPreferences',
    {
      language: 'zh-CN',
      notifications: true,
      fontSize: 14
    }
  );

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <select
        value={preferences.language}
        onChange={(e) => updatePreference('language', e.target.value)}
      >
        <option value="zh-CN">中文</option>
        <option value="en-US">English</option>
      </select>

      <label>
        <input
          type="checkbox"
          checked={preferences.notifications}
          onChange={(e) => updatePreference('notifications', e.target.checked)}
        />
        启用通知
      </label>

      <input
        type="range"
        min="12"
        max="20"
        value={preferences.fontSize}
        onChange={(e) => updatePreference('fontSize', Number(e.target.value))}
      />
    </div>
  );
}
```

#### 购物车持久化

```tsx
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

function useCart() {
  const [cart, setCart, clearCart] = useLocalStorage<CartItem[]>('cart', []);

  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setCart(prev =>
      prev.map(i => (i.id === id ? { ...i, quantity } : i))
    );
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return { cart, addItem, removeItem, updateQuantity, clearCart, total };
}
```

---

## useFetch

数据获取 Hook，提供便捷的数据获取功能，自动处理加载状态和错误，支持缓存、手动刷新和数据变更。

### 引入方式

```typescript
import { useFetch } from '@/hooks';
import type { UseFetchOptions, UseFetchReturn } from '@/hooks';
```

### 函数签名

```typescript
function useFetch<T>(
  url: string,
  options?: UseFetchOptions<T>
): UseFetchReturn<T>
```

### 配置选项

```typescript
interface UseFetchOptions<T> {
  initialData?: T;              // 初始数据
  immediate?: boolean;          // 是否立即执行请求，默认 true
  cacheTime?: number;           // 缓存时间（毫秒），默认 0
  headers?: Record<string, string>; // 请求头
  onSuccess?: (data: T) => void;    // 成功回调
  onError?: (error: Error) => void; // 失败回调
  deps?: unknown[];             // 依赖项数组
}
```

### 返回值

```typescript
interface UseFetchReturn<T> {
  data: T | undefined;           // 响应数据
  loading: boolean;              // 是否正在加载
  error: Error | null;           // 错误对象
  refetch: () => Promise<void>;  // 手动触发请求
  mutate: (data: T | ((prev: T | undefined) => T)) => void; // 手动设置数据
}
```

### 使用示例

#### 基本用法

```tsx
function UserList() {
  const { data, loading, error } = useFetch<User[]>('/api/users');

  if (loading) return <p>加载中...</p>;
  if (error) return <p>错误: {error.message}</p>;

  return (
    <ul>
      {data?.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

#### 带缓存

```tsx
function UserProfile({ userId }: { userId: string }) {
  const { data, loading, refetch } = useFetch<User>(
    `/api/users/${userId}`,
    {
      cacheTime: 60000, // 缓存1分钟
      deps: [userId]    // userId变化时重新请求
    }
  );

  return (
    <div>
      {loading ? (
        <p>加载中...</p>
      ) : (
        <>
          <h1>{data?.name}</h1>
          <p>{data?.email}</p>
        </>
      )}
      <button onClick={refetch}>刷新</button>
    </div>
  );
}
```

#### 手动触发请求

```tsx
function SearchComponent() {
  const [query, setQuery] = useState('');
  const { data, loading, refetch } = useFetch<SearchResult[]>(
    `/api/search?q=${query}`,
    { immediate: false } // 不立即执行
  );

  const handleSearch = () => {
    if (query.trim()) {
      refetch();
    }
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
      />
      <button onClick={handleSearch} disabled={loading}>
        {loading ? '搜索中...' : '搜索'}
      </button>
      
      {data && (
        <ul>
          {data.map(item => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

#### 乐观更新

```tsx
function TodoItem({ todo }: { todo: Todo }) {
  const { data, mutate } = useFetch<Todo>(`/api/todos/${todo.id}`);

  const toggleComplete = async () => {
    // 乐观更新 - 立即更新UI
    mutate(prev => prev ? { ...prev, completed: !prev.completed } : prev);

    // 发送实际请求
    try {
      await fetch(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !data?.completed })
      });
    } catch (error) {
      // 请求失败，回滚
      mutate(prev => prev ? { ...prev, completed: !prev.completed } : prev);
    }
  };

  return (
    <div onClick={toggleComplete}>
      {data?.completed ? '✓' : '○'} {data?.title}
    </div>
  );
}
```

#### 回调处理

```tsx
function DataComponent() {
  const { data, loading } = useFetch<Data>('/api/data', {
    onSuccess: (data) => {
      console.log('数据获取成功:', data);
      // 可以进行一些副作用操作
      analytics.track('data_loaded');
    },
    onError: (error) => {
      console.error('数据获取失败:', error);
      // 显示错误通知
      toast.error('获取数据失败，请重试');
    }
  });

  // ...
}
```

---

## useToggle

切换状态 Hook，提供便捷的布尔值状态管理。

### 引入方式

```typescript
import { useToggle } from '@/hooks';
import type { UseToggleReturn } from '@/hooks';
```

### 函数签名

```typescript
function useToggle(initialValue?: boolean): UseToggleReturn

type UseToggleReturn = [
  boolean,  // 当前值
  {
    toggle: () => void;           // 切换状态
    setTrue: () => void;          // 设置为 true
    setFalse: () => void;         // 设置为 false
    setValue: (value: boolean) => void; // 设置为指定值
  }
]
```

### 参数

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| initialValue | boolean | false | 初始值 |

### 返回值

| 索引 | 类型 | 描述 |
|------|------|------|
| [0] | boolean | 当前布尔值 |
| [1].toggle | () => void | 切换状态 |
| [1].setTrue | () => void | 设置为 true |
| [1].setFalse | () => void | 设置为 false |
| [1].setValue | (value: boolean) => void | 设置为指定值 |

### 使用示例

#### 模态框控制

```tsx
function ModalExample() {
  const [isOpen, { setTrue: open, setFalse: close }] = useToggle(false);

  return (
    <div>
      <button onClick={open}>打开模态框</button>
      
      <Modal isOpen={isOpen} onClose={close}>
        <p>模态框内容</p>
        <button onClick={close}>关闭</button>
      </Modal>
    </div>
  );
}
```

#### 展开/折叠

```tsx
function AccordionItem({ title, content }: { title: string; content: string }) {
  const [isExpanded, { toggle }] = useToggle(false);

  return (
    <div className="border rounded">
      <button
        onClick={toggle}
        className="w-full p-4 text-left flex justify-between"
      >
        {title}
        <span>{isExpanded ? '▲' : '▼'}</span>
      </button>
      
      {isExpanded && (
        <div className="p-4 border-t">
          {content}
        </div>
      )}
    </div>
  );
}
```

#### 密码可见性

```tsx
function PasswordInput() {
  const [showPassword, { toggle }] = useToggle(false);

  return (
    <div className="relative">
      <input
        type={showPassword ? 'text' : 'password'}
        className="pr-10"
      />
      <button
        type="button"
        onClick={toggle}
        className="absolute right-2 top-1/2 -translate-y-1/2"
      >
        {showPassword ? '🙈' : '👁️'}
      </button>
    </div>
  );
}
```

#### 编辑模式

```tsx
function EditableText({ initialText }: { initialText: string }) {
  const [isEditing, { setTrue: startEdit, setFalse: stopEdit }] = useToggle(false);
  const [text, setText] = useState(initialText);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    stopEdit();
    // 保存文本...
  };

  if (isEditing) {
    return (
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSave()}
        />
        <button onClick={handleSave}>保存</button>
        <button onClick={stopEdit}>取消</button>
      </div>
    );
  }

  return (
    <div onClick={startEdit} className="cursor-pointer hover:bg-gray-100 p-2">
      {text}
    </div>
  );
}
```

#### 侧边栏控制

```tsx
function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, { toggle, setFalse: closeSidebar }] = useToggle(true);

  return (
    <div className="flex">
      {/* 侧边栏 */}
      <aside className={`
        transition-all duration-300
        ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}
      `}>
        <nav>
          {/* 导航内容 */}
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1">
        <header>
          <button onClick={toggle}>
            {sidebarOpen ? '收起' : '展开'}侧边栏
          </button>
        </header>
        {children}
      </main>

      {/* 移动端遮罩层 */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50"
          onClick={closeSidebar}
        />
      )}
    </div>
  );
}
```

---

## 组合使用示例

### 搜索组件（结合多个 Hooks）

```tsx
function AdvancedSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [searchHistory, setSearchHistory] = useLocalStorage<string[]>('searchHistory', []);
  const [showHistory, { setTrue: openHistory, setFalse: closeHistory }] = useToggle(false);
  
  const { data, loading, error } = useFetch<SearchResult[]>(
    `/api/search?q=${debouncedQuery}`,
    {
      immediate: !!debouncedQuery,
      deps: [debouncedQuery]
    }
  );

  const handleSearch = (term: string) => {
    setQuery(term);
    closeHistory();
    
    // 添加到搜索历史
    if (term && !searchHistory.includes(term)) {
      setSearchHistory(prev => [term, ...prev.slice(0, 9)]);
    }
  };

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={openHistory}
        placeholder="搜索..."
      />
      
      {/* 搜索历史下拉 */}
      {showHistory && searchHistory.length > 0 && !query && (
        <div className="absolute top-full left-0 right-0 bg-white border shadow-lg">
          <div className="p-2 text-sm text-gray-500">搜索历史</div>
          {searchHistory.map(term => (
            <div
              key={term}
              onClick={() => handleSearch(term)}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              {term}
            </div>
          ))}
        </div>
      )}
      
      {/* 搜索结果 */}
      {loading && <p>搜索中...</p>}
      {error && <p>搜索出错: {error.message}</p>}
      {data && (
        <ul>
          {data.map(item => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```
