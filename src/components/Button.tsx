/**
 * @fileoverview 按钮组件
 * @module components/Button
 * @description 提供可复用的按钮组件，支持多种变体和状态
 */

import React from 'react';

/**
 * 按钮组件属性接口
 * @interface ButtonProps
 * @extends React.ButtonHTMLAttributes<HTMLButtonElement>
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * 按钮变体样式
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  
  /**
   * 按钮尺寸
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * 是否显示加载状态
   * @default false
   */
  loading?: boolean;
  
  /**
   * 是否禁用按钮
   * @default false
   */
  disabled?: boolean;
  
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
   * 子元素
   */
  children: React.ReactNode;
}

/**
 * 按钮组件
 * @component Button
 * @description 可复用的按钮组件，支持多种变体、尺寸和状态
 * 
 * @param {ButtonProps} props - 组件属性
 * @returns {JSX.Element} 按钮元素
 * 
 * @example
 * // 基本用法
 * <Button>点击我</Button>
 * 
 * @example
 * // 不同变体
 * <Button variant="primary">主要按钮</Button>
 * <Button variant="secondary">次要按钮</Button>
 * <Button variant="outline">边框按钮</Button>
 * <Button variant="ghost">幽灵按钮</Button>
 * <Button variant="danger">危险按钮</Button>
 * 
 * @example
 * // 不同尺寸
 * <Button size="small">小按钮</Button>
 * <Button size="medium">中按钮</Button>
 * <Button size="large">大按钮</Button>
 * 
 * @example
 * // 加载状态
 * <Button loading>加载中...</Button>
 * 
 * @example
 * // 带图标
 * <Button leftIcon={<SearchIcon />}>搜索</Button>
 * <Button rightIcon={<ArrowIcon />}>下一步</Button>
 * 
 * @example
 * // 全宽按钮
 * <Button fullWidth>提交</Button>
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  onClick,
  ...restProps
}) => {
  // 变体样式映射
  const variantStyles: Record<string, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };

  // 尺寸样式映射
  const sizeStyles: Record<string, string> = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg'
  };

  // 组合样式类名
  const buttonClasses = [
    'inline-flex items-center justify-center',
    'font-medium rounded-lg',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    variantStyles[variant],
    sizeStyles[size],
    fullWidth ? 'w-full' : '',
    (disabled || loading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
    className
  ].filter(Boolean).join(' ');

  // 处理点击事件
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={handleClick}
      {...restProps}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

export default Button;
