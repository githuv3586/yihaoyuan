/**
 * @fileoverview 输入框组件
 * @module components/Input
 * @description 提供可复用的输入框组件，支持验证、图标和各种输入类型
 */

import React, { forwardRef, useState } from 'react';

/**
 * 输入框组件属性接口
 * @interface InputProps
 * @extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>
 */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * 输入框标签
   */
  label?: string;
  
  /**
   * 错误消息
   */
  error?: string;
  
  /**
   * 帮助文本
   */
  helperText?: string;
  
  /**
   * 输入框尺寸
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * 是否全宽显示
   * @default false
   */
  fullWidth?: boolean;
  
  /**
   * 左侧图标
   */
  leftIcon?: React.ReactNode;
  
  /**
   * 右侧图标
   */
  rightIcon?: React.ReactNode;
  
  /**
   * 是否显示清除按钮
   * @default false
   */
  clearable?: boolean;
  
  /**
   * 清除回调函数
   */
  onClear?: () => void;
}

/**
 * 输入框组件
 * @component Input
 * @description 可复用的输入框组件，支持标签、验证、图标等功能
 * 
 * @param {InputProps} props - 组件属性
 * @param {React.Ref<HTMLInputElement>} ref - 输入框引用
 * @returns {JSX.Element} 输入框元素
 * 
 * @example
 * // 基本用法
 * <Input placeholder="请输入内容" />
 * 
 * @example
 * // 带标签
 * <Input label="用户名" placeholder="请输入用户名" />
 * 
 * @example
 * // 带错误提示
 * <Input 
 *   label="邮箱" 
 *   error="请输入有效的邮箱地址" 
 *   placeholder="example@email.com" 
 * />
 * 
 * @example
 * // 带图标
 * <Input 
 *   leftIcon={<SearchIcon />} 
 *   placeholder="搜索..." 
 * />
 * 
 * @example
 * // 可清除
 * <Input 
 *   clearable 
 *   value={value}
 *   onChange={(e) => setValue(e.target.value)}
 *   onClear={() => setValue('')}
 * />
 * 
 * @example
 * // 密码输入框
 * <Input 
 *   type="password"
 *   label="密码"
 *   placeholder="请输入密码"
 * />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  size = 'medium',
  fullWidth = false,
  leftIcon,
  rightIcon,
  clearable = false,
  onClear,
  className = '',
  disabled,
  value,
  ...restProps
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  // 尺寸样式映射
  const sizeStyles: Record<string, string> = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-5 py-3 text-lg'
  };

  // 组合输入框样式
  const inputClasses = [
    'block rounded-lg border transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-0',
    sizeStyles[size],
    fullWidth ? 'w-full' : '',
    error 
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white',
    leftIcon ? 'pl-10' : '',
    (rightIcon || clearable) ? 'pr-10' : '',
    className
  ].filter(Boolean).join(' ');

  // 容器样式
  const containerClasses = [
    'relative',
    fullWidth ? 'w-full' : 'inline-block'
  ].join(' ');

  // 处理清除
  const handleClear = () => {
    onClear?.();
  };

  // 是否显示清除按钮
  const showClearButton = clearable && value && !disabled;

  return (
    <div className={containerClasses}>
      {/* 标签 */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      {/* 输入框容器 */}
      <div className="relative">
        {/* 左侧图标 */}
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {leftIcon}
          </div>
        )}
        
        {/* 输入框 */}
        <input
          ref={ref}
          className={inputClasses}
          disabled={disabled}
          value={value}
          onFocus={(e) => {
            setIsFocused(true);
            restProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            restProps.onBlur?.(e);
          }}
          {...restProps}
        />
        
        {/* 右侧图标或清除按钮 */}
        {(rightIcon || showClearButton) && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {showClearButton ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : (
              <span className="text-gray-400">{rightIcon}</span>
            )}
          </div>
        )}
      </div>
      
      {/* 错误消息 */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {/* 帮助文本 */}
      {!error && helperText && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
