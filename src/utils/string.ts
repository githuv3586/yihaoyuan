/**
 * @fileoverview 字符串处理工具函数
 * @module utils/string
 * @description 提供各种字符串操作和格式化的工具函数
 */

/**
 * 将字符串转换为驼峰命名格式
 * @function toCamelCase
 * @param {string} str - 需要转换的字符串
 * @returns {string} 转换后的驼峰命名字符串
 * @example
 * toCamelCase('hello-world')     // 返回: 'helloWorld'
 * toCamelCase('hello_world')     // 返回: 'helloWorld'
 * toCamelCase('HelloWorld')      // 返回: 'helloWorld'
 * toCamelCase('hello world')     // 返回: 'helloWorld'
 */
export function toCamelCase(str: string): string {
  if (!str) return '';
  
  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
    .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

/**
 * 将字符串转换为短横线命名格式（kebab-case）
 * @function toKebabCase
 * @param {string} str - 需要转换的字符串
 * @returns {string} 转换后的短横线命名字符串
 * @example
 * toKebabCase('helloWorld')      // 返回: 'hello-world'
 * toKebabCase('HelloWorld')      // 返回: 'hello-world'
 * toKebabCase('hello_world')     // 返回: 'hello-world'
 * toKebabCase('hello world')     // 返回: 'hello-world'
 */
export function toKebabCase(str: string): string {
  if (!str) return '';
  
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * 将字符串转换为下划线命名格式（snake_case）
 * @function toSnakeCase
 * @param {string} str - 需要转换的字符串
 * @returns {string} 转换后的下划线命名字符串
 * @example
 * toSnakeCase('helloWorld')      // 返回: 'hello_world'
 * toSnakeCase('HelloWorld')      // 返回: 'hello_world'
 * toSnakeCase('hello-world')     // 返回: 'hello_world'
 * toSnakeCase('hello world')     // 返回: 'hello_world'
 */
export function toSnakeCase(str: string): string {
  if (!str) return '';
  
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * 将字符串转换为帕斯卡命名格式（PascalCase）
 * @function toPascalCase
 * @param {string} str - 需要转换的字符串
 * @returns {string} 转换后的帕斯卡命名字符串
 * @example
 * toPascalCase('hello-world')    // 返回: 'HelloWorld'
 * toPascalCase('hello_world')    // 返回: 'HelloWorld'
 * toPascalCase('helloWorld')     // 返回: 'HelloWorld'
 * toPascalCase('hello world')    // 返回: 'HelloWorld'
 */
export function toPascalCase(str: string): string {
  const camelCase = toCamelCase(str);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}

/**
 * 截断字符串到指定长度，并添加省略号
 * @function truncate
 * @param {string} str - 需要截断的字符串
 * @param {number} maxLength - 最大长度
 * @param {string} [suffix='...'] - 省略号后缀
 * @returns {string} 截断后的字符串
 * @example
 * truncate('Hello World', 8)           // 返回: 'Hello...'
 * truncate('Hello World', 8, '…')      // 返回: 'Hello W…'
 * truncate('Hello', 10)                // 返回: 'Hello'
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (!str || str.length <= maxLength) return str;
  
  const truncatedLength = maxLength - suffix.length;
  if (truncatedLength <= 0) return suffix.slice(0, maxLength);
  
  return str.slice(0, truncatedLength) + suffix;
}

/**
 * 将字符串首字母大写
 * @function capitalize
 * @param {string} str - 需要处理的字符串
 * @returns {string} 首字母大写的字符串
 * @example
 * capitalize('hello')        // 返回: 'Hello'
 * capitalize('hello world')  // 返回: 'Hello world'
 * capitalize('HELLO')        // 返回: 'HELLO'
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 将字符串中每个单词的首字母大写
 * @function capitalizeWords
 * @param {string} str - 需要处理的字符串
 * @returns {string} 每个单词首字母大写的字符串
 * @example
 * capitalizeWords('hello world')     // 返回: 'Hello World'
 * capitalizeWords('jOHN dOE')        // 返回: 'JOHN DOE'
 */
export function capitalizeWords(str: string): string {
  if (!str) return '';
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * 移除字符串中的所有空白字符
 * @function removeWhitespace
 * @param {string} str - 需要处理的字符串
 * @returns {string} 移除空白字符后的字符串
 * @example
 * removeWhitespace('hello world')    // 返回: 'helloworld'
 * removeWhitespace('  hello  ')      // 返回: 'hello'
 * removeWhitespace('h e l l o')      // 返回: 'hello'
 */
export function removeWhitespace(str: string): string {
  if (!str) return '';
  return str.replace(/\s+/g, '');
}

/**
 * 检查字符串是否为空或只包含空白字符
 * @function isBlank
 * @param {string | null | undefined} str - 需要检查的字符串
 * @returns {boolean} 如果字符串为空或只包含空白字符返回true
 * @example
 * isBlank('')           // 返回: true
 * isBlank('   ')        // 返回: true
 * isBlank(null)         // 返回: true
 * isBlank('hello')      // 返回: false
 */
export function isBlank(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}

/**
 * 反转字符串
 * @function reverse
 * @param {string} str - 需要反转的字符串
 * @returns {string} 反转后的字符串
 * @example
 * reverse('hello')      // 返回: 'olleh'
 * reverse('12345')      // 返回: '54321'
 */
export function reverse(str: string): string {
  if (!str) return '';
  return [...str].reverse().join('');
}

/**
 * 生成指定长度的随机字符串
 * @function randomString
 * @param {number} length - 字符串长度
 * @param {string} [charset='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'] - 字符集
 * @returns {string} 随机生成的字符串
 * @example
 * randomString(8)                    // 返回: 'aB3xY9kL'（示例）
 * randomString(4, '0123456789')      // 返回: '7291'（示例）
 */
export function randomString(
  length: number,
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * 将字符串重复指定次数
 * @function repeat
 * @param {string} str - 需要重复的字符串
 * @param {number} count - 重复次数
 * @returns {string} 重复后的字符串
 * @example
 * repeat('abc', 3)      // 返回: 'abcabcabc'
 * repeat('*', 5)        // 返回: '*****'
 */
export function repeat(str: string, count: number): string {
  if (!str || count <= 0) return '';
  return str.repeat(count);
}

/**
 * 在字符串左侧填充字符到指定长度
 * @function padStart
 * @param {string} str - 原始字符串
 * @param {number} targetLength - 目标长度
 * @param {string} [padString=' '] - 填充字符
 * @returns {string} 填充后的字符串
 * @example
 * padStart('5', 3, '0')     // 返回: '005'
 * padStart('42', 5, '0')    // 返回: '00042'
 */
export function padStart(str: string, targetLength: number, padString: string = ' '): string {
  return String(str).padStart(targetLength, padString);
}

/**
 * 在字符串右侧填充字符到指定长度
 * @function padEnd
 * @param {string} str - 原始字符串
 * @param {number} targetLength - 目标长度
 * @param {string} [padString=' '] - 填充字符
 * @returns {string} 填充后的字符串
 * @example
 * padEnd('hello', 10, '-')   // 返回: 'hello-----'
 * padEnd('hi', 5, '.')       // 返回: 'hi...'
 */
export function padEnd(str: string, targetLength: number, padString: string = ' '): string {
  return String(str).padEnd(targetLength, padString);
}
