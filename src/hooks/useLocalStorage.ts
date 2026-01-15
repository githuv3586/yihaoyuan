/**
 * @fileoverview 本地存储Hook
 * @module hooks/useLocalStorage
 * @description 提供与localStorage交互的React Hook，支持自动序列化和持久化
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * 本地存储Hook返回值类型
 * @typedef UseLocalStorageReturn
 * @template T - 存储值的类型
 */
export type UseLocalStorageReturn<T> = [
  T,
  (value: T | ((prev: T) => T)) => void,
  () => void
];

/**
 * 本地存储Hook
 * @function useLocalStorage
 * @template T - 存储值的类型
 * @param {string} key - 存储键名
 * @param {T} initialValue - 初始值
 * @returns {UseLocalStorageReturn<T>} [存储的值, 设置值的函数, 移除值的函数]
 * @description 
 * 提供与localStorage的响应式交互，自动处理JSON序列化/反序列化，
 * 支持服务端渲染，并在多标签页之间同步。
 * 
 * @example
 * // 存储用户设置
 * function SettingsComponent() {
 *   const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'light');
 *   
 *   return (
 *     <div>
 *       <p>当前主题: {theme}</p>
 *       <button onClick={() => setTheme('dark')}>深色模式</button>
 *       <button onClick={() => setTheme('light')}>浅色模式</button>
 *       <button onClick={removeTheme}>重置</button>
 *     </div>
 *   );
 * }
 * 
 * @example
 * // 存储复杂对象
 * function UserPreferences() {
 *   const [preferences, setPreferences] = useLocalStorage('userPreferences', {
 *     language: 'zh-CN',
 *     notifications: true,
 *     fontSize: 14
 *   });
 *   
 *   const toggleNotifications = () => {
 *     setPreferences(prev => ({
 *       ...prev,
 *       notifications: !prev.notifications
 *     }));
 *   };
 *   
 *   return (
 *     <div>
 *       <p>语言: {preferences.language}</p>
 *       <button onClick={toggleNotifications}>
 *         {preferences.notifications ? '关闭' : '开启'}通知
 *       </button>
 *     </div>
 *   );
 * }
 * 
 * @example
 * // 存储数组
 * function TodoList() {
 *   const [todos, setTodos] = useLocalStorage<string[]>('todos', []);
 *   
 *   const addTodo = (text: string) => {
 *     setTodos(prev => [...prev, text]);
 *   };
 *   
 *   return (
 *     <ul>
 *       {todos.map((todo, index) => (
 *         <li key={index}>{todo}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 */
export function useLocalStorage<T>(key: string, initialValue: T): UseLocalStorageReturn<T> {
  // 获取初始值
  const readValue = useCallback((): T => {
    // 服务端渲染时返回初始值
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // 设置值
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      // 支持函数式更新
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        // 触发storage事件，用于多标签页同步
        window.dispatchEvent(new StorageEvent('storage', {
          key,
          newValue: JSON.stringify(valueToStore)
        }));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // 移除值
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        window.dispatchEvent(new StorageEvent('storage', {
          key,
          newValue: null
        }));
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // 监听storage事件，实现多标签页同步
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue));
        } catch {
          setStoredValue(event.newValue as unknown as T);
        }
      } else if (event.key === key && event.newValue === null) {
        setStoredValue(initialValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

export default useLocalStorage;
