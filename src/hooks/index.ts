/**
 * @fileoverview Hooks库入口文件
 * @module hooks
 * @description 导出所有自定义React Hooks
 */

// 防抖Hook
export { useDebounce } from './useDebounce';

// 本地存储Hook
export { useLocalStorage } from './useLocalStorage';
export type { UseLocalStorageReturn } from './useLocalStorage';

// 数据获取Hook
export { useFetch } from './useFetch';
export type { UseFetchOptions, UseFetchReturn } from './useFetch';

// 切换状态Hook
export { useToggle } from './useToggle';
export type { UseToggleReturn } from './useToggle';
