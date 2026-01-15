/**
 * @fileoverview 模态框组件
 * @module components/Modal
 * @description 提供可复用的模态框组件，支持自定义内容、标题和底部操作按钮
 */

import React, { useEffect, useCallback } from 'react';

/**
 * 模态框组件属性接口
 * @interface ModalProps
 */
export interface ModalProps {
  /**
   * 是否显示模态框
   */
  isOpen: boolean;
  
  /**
   * 关闭模态框的回调函数
   */
  onClose: () => void;
  
  /**
   * 模态框标题
   */
  title?: string;
  
  /**
   * 模态框尺寸
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large' | 'full';
  
  /**
   * 是否显示关闭按钮
   * @default true
   */
  showCloseButton?: boolean;
  
  /**
   * 点击遮罩层是否关闭
   * @default true
   */
  closeOnOverlayClick?: boolean;
  
  /**
   * 按ESC键是否关闭
   * @default true
   */
  closeOnEsc?: boolean;
  
  /**
   * 底部内容（操作按钮等）
   */
  footer?: React.ReactNode;
  
  /**
   * 子元素（模态框主体内容）
   */
  children: React.ReactNode;
  
  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * 模态框组件
 * @component Modal
 * @description 可复用的模态框组件，支持自定义内容、标题、底部操作按钮等功能
 * 
 * @param {ModalProps} props - 组件属性
 * @returns {JSX.Element | null} 模态框元素或null
 * 
 * @example
 * // 基本用法
 * const [isOpen, setIsOpen] = useState(false);
 * 
 * <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
 *   <p>模态框内容</p>
 * </Modal>
 * 
 * @example
 * // 带标题
 * <Modal 
 *   isOpen={isOpen} 
 *   onClose={() => setIsOpen(false)}
 *   title="确认操作"
 * >
 *   <p>确定要执行此操作吗？</p>
 * </Modal>
 * 
 * @example
 * // 带底部按钮
 * <Modal 
 *   isOpen={isOpen} 
 *   onClose={() => setIsOpen(false)}
 *   title="删除确认"
 *   footer={
 *     <>
 *       <Button variant="ghost" onClick={() => setIsOpen(false)}>取消</Button>
 *       <Button variant="danger" onClick={handleDelete}>删除</Button>
 *     </>
 *   }
 * >
 *   <p>此操作不可撤销，确定要删除吗？</p>
 * </Modal>
 * 
 * @example
 * // 不同尺寸
 * <Modal size="small" ...>小模态框</Modal>
 * <Modal size="medium" ...>中模态框</Modal>
 * <Modal size="large" ...>大模态框</Modal>
 * <Modal size="full" ...>全屏模态框</Modal>
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'medium',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  footer,
  children,
  className = ''
}) => {
  // 处理ESC键关闭
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (closeOnEsc && event.key === 'Escape') {
      onClose();
    }
  }, [closeOnEsc, onClose]);

  // 监听键盘事件
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // 不显示时返回null
  if (!isOpen) return null;

  // 尺寸样式映射
  const sizeStyles: Record<string, string> = {
    small: 'max-w-sm',
    medium: 'max-w-lg',
    large: 'max-w-3xl',
    full: 'max-w-full mx-4'
  };

  // 处理遮罩层点击
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleOverlayClick}
      />
      
      {/* 模态框容器 */}
      <div
        className="flex min-h-full items-center justify-center p-4"
        onClick={handleOverlayClick}
      >
        {/* 模态框内容 */}
        <div
          className={`
            relative w-full ${sizeStyles[size]} 
            bg-white rounded-xl shadow-xl 
            transform transition-all
            ${className}
          `}
        >
          {/* 头部 */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
          
          {/* 主体内容 */}
          <div className="px-6 py-4">
            {children}
          </div>
          
          {/* 底部 */}
          {footer && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
