/**
 * @fileoverview 切换状态Hook
 * @module hooks/useToggle
 * @description 提供布尔值切换功能的React Hook
 */

import { useState, useCallback } from 'react';

/**
 * useToggle Hook的返回值类型
 * @typedef UseToggleReturn
 */
export type UseToggleReturn = [
  boolean,
  {
    toggle: () => void;
    setTrue: () => void;
    setFalse: () => void;
    setValue: (value: boolean) => void;
  }
];

/**
 * 切换状态Hook
 * @function useToggle
 * @param {boolean} [initialValue=false] - 初始值
 * @returns {UseToggleReturn} [当前值, 操作方法对象]
 * @description 
 * 提供便捷的布尔值状态管理，包含切换、设置为true、设置为false和自定义设置等方法。
 * 
 * @example
 * // 基本用法 - 模态框控制
 * function ModalExample() {
 *   const [isOpen, { toggle, setFalse }] = useToggle(false);
 *   
 *   return (
 *     <div>
 *       <button onClick={toggle}>打开模态框</button>
 *       <Modal isOpen={isOpen} onClose={setFalse}>
 *         <p>模态框内容</p>
 *       </Modal>
 *     </div>
 *   );
 * }
 * 
 * @example
 * // 展开/折叠控制
 * function AccordionItem({ title, content }: { title: string; content: string }) {
 *   const [isExpanded, { toggle }] = useToggle(false);
 *   
 *   return (
 *     <div>
 *       <button onClick={toggle}>
 *         {title} {isExpanded ? '▲' : '▼'}
 *       </button>
 *       {isExpanded && <div>{content}</div>}
 *     </div>
 *   );
 * }
 * 
 * @example
 * // 密码可见性切换
 * function PasswordInput() {
 *   const [showPassword, { toggle }] = useToggle(false);
 *   
 *   return (
 *     <div>
 *       <input type={showPassword ? 'text' : 'password'} />
 *       <button onClick={toggle}>
 *         {showPassword ? '隐藏' : '显示'}
 *       </button>
 *     </div>
 *   );
 * }
 * 
 * @example
 * // 编辑模式切换
 * function EditableText({ text }: { text: string }) {
 *   const [isEditing, { setTrue, setFalse }] = useToggle(false);
 *   const [value, setValue] = useState(text);
 *   
 *   if (isEditing) {
 *     return (
 *       <div>
 *         <input value={value} onChange={e => setValue(e.target.value)} />
 *         <button onClick={setFalse}>保存</button>
 *       </div>
 *     );
 *   }
 *   
 *   return (
 *     <div onClick={setTrue}>
 *       {value}
 *     </div>
 *   );
 * }
 */
export function useToggle(initialValue: boolean = false): UseToggleReturn {
  const [value, setValue] = useState<boolean>(initialValue);

  const toggle = useCallback(() => {
    setValue(v => !v);
  }, []);

  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  const set = useCallback((newValue: boolean) => {
    setValue(newValue);
  }, []);

  return [value, { toggle, setTrue, setFalse, setValue: set }];
}

export default useToggle;
