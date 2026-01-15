/**
 * @fileoverview 数据获取Hook
 * @module hooks/useFetch
 * @description 提供数据获取功能的React Hook，包含加载状态、错误处理和缓存
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useFetch Hook的配置选项
 * @interface UseFetchOptions
 */
export interface UseFetchOptions<T> {
  /**
   * 初始数据
   */
  initialData?: T;
  
  /**
   * 是否立即执行请求
   * @default true
   */
  immediate?: boolean;
  
  /**
   * 缓存时间（毫秒）
   * @default 0 - 不缓存
   */
  cacheTime?: number;
  
  /**
   * 请求头
   */
  headers?: Record<string, string>;
  
  /**
   * 请求成功回调
   */
  onSuccess?: (data: T) => void;
  
  /**
   * 请求失败回调
   */
  onError?: (error: Error) => void;
  
  /**
   * 依赖项数组，变化时重新请求
   */
  deps?: unknown[];
}

/**
 * useFetch Hook的返回值
 * @interface UseFetchReturn
 * @template T - 数据类型
 */
export interface UseFetchReturn<T> {
  /**
   * 响应数据
   */
  data: T | undefined;
  
  /**
   * 是否正在加载
   */
  loading: boolean;
  
  /**
   * 错误对象
   */
  error: Error | null;
  
  /**
   * 手动触发请求
   */
  refetch: () => Promise<void>;
  
  /**
   * 手动设置数据
   */
  mutate: (data: T | ((prev: T | undefined) => T)) => void;
}

// 简单的缓存存储
const cache = new Map<string, { data: unknown; timestamp: number }>();

/**
 * 数据获取Hook
 * @function useFetch
 * @template T - 响应数据类型
 * @param {string} url - 请求URL
 * @param {UseFetchOptions<T>} [options] - 配置选项
 * @returns {UseFetchReturn<T>} Hook返回值
 * @description 
 * 提供便捷的数据获取功能，自动处理加载状态和错误，
 * 支持缓存、手动刷新和数据变更。
 * 
 * @example
 * // 基本用法
 * function UserList() {
 *   const { data, loading, error } = useFetch<User[]>('/api/users');
 *   
 *   if (loading) return <p>加载中...</p>;
 *   if (error) return <p>错误: {error.message}</p>;
 *   
 *   return (
 *     <ul>
 *       {data?.map(user => (
 *         <li key={user.id}>{user.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * 
 * @example
 * // 带选项的用法
 * function UserProfile({ userId }: { userId: string }) {
 *   const { data, loading, refetch } = useFetch<User>(`/api/users/${userId}`, {
 *     initialData: undefined,
 *     cacheTime: 60000, // 缓存1分钟
 *     onSuccess: (data) => console.log('获取成功:', data),
 *     onError: (error) => console.error('获取失败:', error),
 *     deps: [userId] // userId变化时重新请求
 *   });
 *   
 *   return (
 *     <div>
 *       {loading ? <p>加载中...</p> : <p>{data?.name}</p>}
 *       <button onClick={refetch}>刷新</button>
 *     </div>
 *   );
 * }
 * 
 * @example
 * // 手动触发请求
 * function SearchComponent() {
 *   const [query, setQuery] = useState('');
 *   const { data, loading, refetch } = useFetch<SearchResult[]>(
 *     `/api/search?q=${query}`,
 *     { immediate: false } // 不立即执行
 *   );
 *   
 *   const handleSearch = () => {
 *     refetch();
 *   };
 *   
 *   return (
 *     <div>
 *       <input value={query} onChange={e => setQuery(e.target.value)} />
 *       <button onClick={handleSearch} disabled={loading}>
 *         搜索
 *       </button>
 *     </div>
 *   );
 * }
 * 
 * @example
 * // 乐观更新
 * function TodoItem({ todo }: { todo: Todo }) {
 *   const { data, mutate } = useFetch<Todo>(`/api/todos/${todo.id}`);
 *   
 *   const toggleComplete = async () => {
 *     // 乐观更新
 *     mutate(prev => prev ? { ...prev, completed: !prev.completed } : prev);
 *     
 *     // 实际请求
 *     await fetch(`/api/todos/${todo.id}`, {
 *       method: 'PATCH',
 *       body: JSON.stringify({ completed: !data?.completed })
 *     });
 *   };
 *   
 *   return (
 *     <div onClick={toggleComplete}>
 *       {data?.completed ? '✓' : '○'} {data?.title}
 *     </div>
 *   );
 * }
 */
export function useFetch<T>(
  url: string,
  options: UseFetchOptions<T> = {}
): UseFetchReturn<T> {
  const {
    initialData,
    immediate = true,
    cacheTime = 0,
    headers = {},
    onSuccess,
    onError,
    deps = []
  } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<Error | null>(null);
  
  // 用于取消请求
  const abortControllerRef = useRef<AbortController | null>(null);

  // 获取数据
  const fetchData = useCallback(async () => {
    // 检查缓存
    if (cacheTime > 0) {
      const cached = cache.get(url);
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        setData(cached.data as T);
        setLoading(false);
        return;
      }
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json() as T;
      
      // 更新缓存
      if (cacheTime > 0) {
        cache.set(url, { data: result, timestamp: Date.now() });
      }

      setData(result);
      onSuccess?.(result);
    } catch (err) {
      // 忽略取消请求的错误
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [url, cacheTime, headers, onSuccess, onError]);

  // 手动设置数据
  const mutate = useCallback((newData: T | ((prev: T | undefined) => T)) => {
    setData(prevData => {
      const nextData = newData instanceof Function ? newData(prevData) : newData;
      // 同时更新缓存
      if (cacheTime > 0) {
        cache.set(url, { data: nextData, timestamp: Date.now() });
      }
      return nextData;
    });
  }, [url, cacheTime]);

  // 初始加载和依赖变化时重新请求
  useEffect(() => {
    if (immediate) {
      fetchData();
    }

    return () => {
      // 组件卸载时取消请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, ...deps]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    mutate
  };
}

export default useFetch;
