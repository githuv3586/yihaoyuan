/**
 * @fileoverview 卡片组件
 * @module components/Card
 * @description 提供可复用的卡片组件，用于展示内容块
 */

import React from 'react';

/**
 * 卡片组件属性接口
 * @interface CardProps
 */
export interface CardProps {
  /**
   * 卡片标题
   */
  title?: string;
  
  /**
   * 卡片副标题
   */
  subtitle?: string;
  
  /**
   * 卡片变体
   * @default 'elevated'
   */
  variant?: 'elevated' | 'outlined' | 'filled';
  
  /**
   * 内边距大小
   * @default 'medium'
   */
  padding?: 'none' | 'small' | 'medium' | 'large';
  
  /**
   * 是否可点击
   * @default false
   */
  clickable?: boolean;
  
  /**
   * 点击回调
   */
  onClick?: () => void;
  
  /**
   * 头部额外内容（如操作按钮）
   */
  headerAction?: React.ReactNode;
  
  /**
   * 底部内容
   */
  footer?: React.ReactNode;
  
  /**
   * 封面图片URL
   */
  coverImage?: string;
  
  /**
   * 封面图片高度
   * @default '200px'
   */
  coverHeight?: string;
  
  /**
   * 子元素
   */
  children: React.ReactNode;
  
  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * 卡片组件
 * @component Card
 * @description 可复用的卡片组件，用于展示各种内容块
 * 
 * @param {CardProps} props - 组件属性
 * @returns {JSX.Element} 卡片元素
 * 
 * @example
 * // 基本用法
 * <Card>
 *   <p>卡片内容</p>
 * </Card>
 * 
 * @example
 * // 带标题
 * <Card title="卡片标题" subtitle="副标题">
 *   <p>卡片内容</p>
 * </Card>
 * 
 * @example
 * // 带封面图片
 * <Card 
 *   title="文章标题"
 *   coverImage="/path/to/image.jpg"
 *   coverHeight="180px"
 * >
 *   <p>文章摘要...</p>
 * </Card>
 * 
 * @example
 * // 可点击卡片
 * <Card 
 *   clickable 
 *   onClick={() => navigate('/detail')}
 * >
 *   <p>点击查看详情</p>
 * </Card>
 * 
 * @example
 * // 带底部操作
 * <Card 
 *   title="产品名称"
 *   footer={
 *     <div className="flex justify-between">
 *       <span>¥99.00</span>
 *       <Button size="small">加入购物车</Button>
 *     </div>
 *   }
 * >
 *   <p>产品描述...</p>
 * </Card>
 * 
 * @example
 * // 不同变体
 * <Card variant="elevated">有阴影的卡片</Card>
 * <Card variant="outlined">有边框的卡片</Card>
 * <Card variant="filled">有背景色的卡片</Card>
 */
export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  variant = 'elevated',
  padding = 'medium',
  clickable = false,
  onClick,
  headerAction,
  footer,
  coverImage,
  coverHeight = '200px',
  children,
  className = ''
}) => {
  // 变体样式映射
  const variantStyles: Record<string, string> = {
    elevated: 'bg-white shadow-lg hover:shadow-xl',
    outlined: 'bg-white border border-gray-200',
    filled: 'bg-gray-50'
  };

  // 内边距样式映射
  const paddingStyles: Record<string, string> = {
    none: 'p-0',
    small: 'p-3',
    medium: 'p-5',
    large: 'p-8'
  };

  // 组合样式
  const cardClasses = [
    'rounded-xl overflow-hidden transition-all duration-200',
    variantStyles[variant],
    clickable ? 'cursor-pointer transform hover:-translate-y-1' : '',
    className
  ].filter(Boolean).join(' ');

  // 内容区域样式
  const contentClasses = paddingStyles[padding];

  // 处理点击
  const handleClick = () => {
    if (clickable && onClick) {
      onClick();
    }
  };

  return (
    <div
      className={cardClasses}
      onClick={handleClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {/* 封面图片 */}
      {coverImage && (
        <div
          className="w-full bg-gray-200 bg-cover bg-center"
          style={{
            backgroundImage: `url(${coverImage})`,
            height: coverHeight
          }}
        />
      )}
      
      {/* 头部（标题和操作） */}
      {(title || subtitle || headerAction) && (
        <div className={`flex items-start justify-between ${contentClasses} ${children ? 'pb-0' : ''}`}>
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          {headerAction && (
            <div className="ml-4">{headerAction}</div>
          )}
        </div>
      )}
      
      {/* 主体内容 */}
      <div className={contentClasses}>
        {children}
      </div>
      
      {/* 底部 */}
      {footer && (
        <div className={`border-t border-gray-100 ${contentClasses}`}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
