/**
 * @fileoverview 数据验证工具函数
 * @module utils/validation
 * @description 提供各种数据验证和校验的工具函数
 */

import { ValidationResult } from '../types';

/**
 * 验证电子邮件地址格式
 * @function isValidEmail
 * @param {string} email - 需要验证的电子邮件地址
 * @returns {boolean} 是否为有效的电子邮件格式
 * @example
 * isValidEmail('user@example.com')     // 返回: true
 * isValidEmail('user@domain.co.uk')    // 返回: true
 * isValidEmail('invalid-email')         // 返回: false
 * isValidEmail('user@')                 // 返回: false
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证手机号码格式（中国大陆）
 * @function isValidPhone
 * @param {string} phone - 需要验证的手机号码
 * @returns {boolean} 是否为有效的手机号码格式
 * @example
 * isValidPhone('13800138000')    // 返回: true
 * isValidPhone('1380013800')     // 返回: false
 * isValidPhone('12345678901')    // 返回: false
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证URL格式
 * @function isValidUrl
 * @param {string} url - 需要验证的URL
 * @returns {boolean} 是否为有效的URL格式
 * @example
 * isValidUrl('https://example.com')           // 返回: true
 * isValidUrl('http://example.com/path')       // 返回: true
 * isValidUrl('ftp://files.example.com')       // 返回: true
 * isValidUrl('not-a-url')                     // 返回: false
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证身份证号码格式（中国大陆18位）
 * @function isValidIdCard
 * @param {string} idCard - 需要验证的身份证号码
 * @returns {boolean} 是否为有效的身份证号码格式
 * @description 验证18位身份证号码，包括基本格式和校验位验证
 * @example
 * isValidIdCard('110101199003074518')    // 返回: true（示例）
 * isValidIdCard('123456789012345678')    // 返回: false
 */
export function isValidIdCard(idCard: string): boolean {
  const idCardRegex = /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
  
  if (!idCardRegex.test(idCard)) {
    return false;
  }
  
  // 验证校验位
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(idCard[i], 10) * weights[i];
  }
  
  const checkCode = checkCodes[sum % 11];
  return idCard[17].toUpperCase() === checkCode;
}

/**
 * 验证密码强度
 * @function validatePassword
 * @param {string} password - 需要验证的密码
 * @param {Object} [options] - 验证选项
 * @param {number} [options.minLength=8] - 最小长度
 * @param {number} [options.maxLength=32] - 最大长度
 * @param {boolean} [options.requireUppercase=true] - 是否需要大写字母
 * @param {boolean} [options.requireLowercase=true] - 是否需要小写字母
 * @param {boolean} [options.requireNumber=true] - 是否需要数字
 * @param {boolean} [options.requireSpecial=false] - 是否需要特殊字符
 * @returns {ValidationResult} 验证结果
 * @example
 * validatePassword('Abc12345')
 * // 返回: { isValid: true, errors: [], field: 'password' }
 * 
 * validatePassword('abc')
 * // 返回: { isValid: false, errors: ['密码长度至少为8位', '密码需要包含大写字母', '密码需要包含数字'], field: 'password' }
 */
export function validatePassword(
  password: string,
  options: {
    minLength?: number;
    maxLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumber?: boolean;
    requireSpecial?: boolean;
  } = {}
): ValidationResult {
  const {
    minLength = 8,
    maxLength = 32,
    requireUppercase = true,
    requireLowercase = true,
    requireNumber = true,
    requireSpecial = false
  } = options;
  
  const errors: string[] = [];
  
  if (password.length < minLength) {
    errors.push(`密码长度至少为${minLength}位`);
  }
  
  if (password.length > maxLength) {
    errors.push(`密码长度不能超过${maxLength}位`);
  }
  
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('密码需要包含大写字母');
  }
  
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('密码需要包含小写字母');
  }
  
  if (requireNumber && !/\d/.test(password)) {
    errors.push('密码需要包含数字');
  }
  
  if (requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('密码需要包含特殊字符');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    field: 'password'
  };
}

/**
 * 验证用户名格式
 * @function validateUsername
 * @param {string} username - 需要验证的用户名
 * @param {Object} [options] - 验证选项
 * @param {number} [options.minLength=3] - 最小长度
 * @param {number} [options.maxLength=20] - 最大长度
 * @param {boolean} [options.allowSpecialChars=false] - 是否允许特殊字符
 * @returns {ValidationResult} 验证结果
 * @example
 * validateUsername('john_doe')
 * // 返回: { isValid: true, errors: [], field: 'username' }
 * 
 * validateUsername('ab')
 * // 返回: { isValid: false, errors: ['用户名长度至少为3位'], field: 'username' }
 */
export function validateUsername(
  username: string,
  options: {
    minLength?: number;
    maxLength?: number;
    allowSpecialChars?: boolean;
  } = {}
): ValidationResult {
  const {
    minLength = 3,
    maxLength = 20,
    allowSpecialChars = false
  } = options;
  
  const errors: string[] = [];
  
  if (username.length < minLength) {
    errors.push(`用户名长度至少为${minLength}位`);
  }
  
  if (username.length > maxLength) {
    errors.push(`用户名长度不能超过${maxLength}位`);
  }
  
  if (!allowSpecialChars && !/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('用户名只能包含字母、数字和下划线');
  }
  
  if (/^\d/.test(username)) {
    errors.push('用户名不能以数字开头');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    field: 'username'
  };
}

/**
 * 检查值是否为空（null、undefined、空字符串、空数组、空对象）
 * @function isEmpty
 * @param {unknown} value - 需要检查的值
 * @returns {boolean} 是否为空
 * @example
 * isEmpty(null)           // 返回: true
 * isEmpty(undefined)      // 返回: true
 * isEmpty('')             // 返回: true
 * isEmpty([])             // 返回: true
 * isEmpty({})             // 返回: true
 * isEmpty('hello')        // 返回: false
 * isEmpty([1, 2])         // 返回: false
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * 检查值是否为数字（包括数字字符串）
 * @function isNumeric
 * @param {unknown} value - 需要检查的值
 * @returns {boolean} 是否为数字
 * @example
 * isNumeric(123)          // 返回: true
 * isNumeric('123')        // 返回: true
 * isNumeric('12.34')      // 返回: true
 * isNumeric('-123')       // 返回: true
 * isNumeric('abc')        // 返回: false
 * isNumeric('')           // 返回: false
 */
export function isNumeric(value: unknown): boolean {
  if (typeof value === 'number') return !isNaN(value);
  if (typeof value === 'string') {
    return value.trim() !== '' && !isNaN(Number(value));
  }
  return false;
}

/**
 * 检查值是否为整数
 * @function isInteger
 * @param {unknown} value - 需要检查的值
 * @returns {boolean} 是否为整数
 * @example
 * isInteger(123)          // 返回: true
 * isInteger('123')        // 返回: true
 * isInteger(12.34)        // 返回: false
 * isInteger('12.34')      // 返回: false
 */
export function isInteger(value: unknown): boolean {
  if (!isNumeric(value)) return false;
  return Number.isInteger(Number(value));
}

/**
 * 验证值是否在指定范围内
 * @function isInRange
 * @param {number} value - 需要验证的值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @param {boolean} [inclusive=true] - 是否包含边界值
 * @returns {boolean} 是否在范围内
 * @example
 * isInRange(5, 1, 10)           // 返回: true
 * isInRange(1, 1, 10)           // 返回: true（包含边界）
 * isInRange(1, 1, 10, false)    // 返回: false（不包含边界）
 * isInRange(15, 1, 10)          // 返回: false
 */
export function isInRange(
  value: number,
  min: number,
  max: number,
  inclusive: boolean = true
): boolean {
  if (inclusive) {
    return value >= min && value <= max;
  }
  return value > min && value < max;
}

/**
 * 验证银行卡号格式（Luhn算法）
 * @function isValidBankCard
 * @param {string} cardNumber - 需要验证的银行卡号
 * @returns {boolean} 是否为有效的银行卡号
 * @description 使用Luhn算法验证银行卡号的有效性
 * @example
 * isValidBankCard('6222021234567890123')    // 返回: true（示例）
 * isValidBankCard('1234567890')             // 返回: false
 */
export function isValidBankCard(cardNumber: string): boolean {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  
  if (!/^\d{16,19}$/.test(cleanNumber)) {
    return false;
  }
  
  // Luhn算法
  let sum = 0;
  let isEven = false;
  
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * 验证IPv4地址格式
 * @function isValidIPv4
 * @param {string} ip - 需要验证的IP地址
 * @returns {boolean} 是否为有效的IPv4地址
 * @example
 * isValidIPv4('192.168.1.1')      // 返回: true
 * isValidIPv4('255.255.255.255')  // 返回: true
 * isValidIPv4('256.1.1.1')        // 返回: false
 * isValidIPv4('192.168.1')        // 返回: false
 */
export function isValidIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  
  return parts.every(part => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255 && part === String(num);
  });
}

/**
 * 创建自定义验证器
 * @function createValidator
 * @template T - 验证值的类型
 * @param {Object} rules - 验证规则配置
 * @returns {(value: T) => ValidationResult} 验证函数
 * @example
 * const validateAge = createValidator({
 *   field: 'age',
 *   rules: [
 *     { test: (v) => v >= 0, message: '年龄不能为负数' },
 *     { test: (v) => v <= 150, message: '年龄不能超过150' }
 *   ]
 * });
 * 
 * validateAge(25)   // 返回: { isValid: true, errors: [], field: 'age' }
 * validateAge(-1)   // 返回: { isValid: false, errors: ['年龄不能为负数'], field: 'age' }
 */
export function createValidator<T>(config: {
  field: string;
  rules: Array<{ test: (value: T) => boolean; message: string }>;
}): (value: T) => ValidationResult {
  return (value: T): ValidationResult => {
    const errors: string[] = [];
    
    for (const rule of config.rules) {
      if (!rule.test(value)) {
        errors.push(rule.message);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      field: config.field
    };
  };
}
