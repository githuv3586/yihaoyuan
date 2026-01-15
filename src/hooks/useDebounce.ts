/**
 * @fileoverview 防抖Hook
 * @module hooks/useDebounce
 * @description 提供防抖功能的React Hook，用于处理频繁触发的事件
 */

import { useState, useEffect } from 'react';

/**
 * 防抖Hook
 * @function useDebounce
 * @template T - 值的类型
 * @param {T} value - 需要防抖的值
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {T} 防抖后的值
 * @description 
 * 当输入值在指定延迟时间内没有变化时，才会更新返回值。
 * 常用于搜索输入框，避免频繁请求API。
 * 
 * @example
 * // 搜索输入框防抖
 * function SearchComponent() {
 *   const [searchTerm, setSearchTerm] = useState('');
 *   const debouncedSearchTerm = useDebounce(searchTerm, 500);
 *   
 *   useEffect(() => {
 *     if (debouncedSearchTerm) {
 *       // 发起搜索请求
 *       searchAPI(debouncedSearchTerm);
 *     }
 *   }, [debouncedSearchTerm]);
 *   
 *   return (
 *     <input
 *       value={searchTerm}
 *       onChange={(e) => setSearchTerm(e.target.value)}
 *       placeholder="搜索..."
 *     />
 *   );
 * }
 * 
 * @example
 * // 窗口大小监听防抖
 * function ResponsiveComponent() {
 *   const [windowWidth, setWindowWidth] = useState(window.innerWidth);
 *   const debouncedWidth = useDebounce(windowWidth, 200);
 *   
 *   useEffect(() => {
 *     const handleResize = () => setWindowWidth(window.innerWidth);
 *     window.addEventListener('resize', handleResize);
 *     return () => window.removeEventListener('resize', handleResize);
 *   }, []);
 *   
 *   // 使用debouncedWidth进行布局计算
 *   return <div>当前宽度: {debouncedWidth}px</div>;
 * }
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 设置定时器
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 清除定时器
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
