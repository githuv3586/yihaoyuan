/**
 * @fileoverview 数组处理工具函数
 * @module utils/array
 * @description 提供各种数组操作和转换的工具函数
 */

/**
 * 将数组分割成指定大小的块
 * @function chunk
 * @template T - 数组元素类型
 * @param {T[]} array - 需要分割的数组
 * @param {number} size - 每个块的大小
 * @returns {T[][]} 分割后的二维数组
 * @throws {Error} 当size小于1时抛出错误
 * @example
 * chunk([1, 2, 3, 4, 5], 2)    // 返回: [[1, 2], [3, 4], [5]]
 * chunk(['a', 'b', 'c'], 1)    // 返回: [['a'], ['b'], ['c']]
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (size < 1) {
    throw new Error('Chunk size must be at least 1');
  }
  
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

/**
 * 数组去重
 * @function unique
 * @template T - 数组元素类型
 * @param {T[]} array - 需要去重的数组
 * @returns {T[]} 去重后的数组
 * @example
 * unique([1, 2, 2, 3, 3, 3])    // 返回: [1, 2, 3]
 * unique(['a', 'b', 'a'])       // 返回: ['a', 'b']
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * 根据指定键对数组元素去重
 * @function uniqueBy
 * @template T - 数组元素类型
 * @template K - 键的类型
 * @param {T[]} array - 需要去重的数组
 * @param {(item: T) => K} keyFn - 用于获取唯一键的函数
 * @returns {T[]} 去重后的数组
 * @example
 * const users = [
 *   { id: 1, name: 'John' },
 *   { id: 2, name: 'Jane' },
 *   { id: 1, name: 'John Doe' }
 * ];
 * uniqueBy(users, u => u.id)   // 返回: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]
 */
export function uniqueBy<T, K>(array: T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  return array.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 将数组扁平化到指定深度
 * @function flatten
 * @template T - 数组元素类型
 * @param {T[]} array - 需要扁平化的数组
 * @param {number} [depth=1] - 扁平化深度
 * @returns {T[]} 扁平化后的数组
 * @example
 * flatten([[1, 2], [3, 4]])           // 返回: [1, 2, 3, 4]
 * flatten([[[1]], [[2]]], 2)          // 返回: [1, 2]
 * flatten([[1, [2, [3]]]], Infinity)  // 返回: [1, 2, 3]
 */
export function flatten<T>(array: unknown[], depth: number = 1): T[] {
  return array.flat(depth) as T[];
}

/**
 * 计算两个数组的交集
 * @function intersection
 * @template T - 数组元素类型
 * @param {T[]} array1 - 第一个数组
 * @param {T[]} array2 - 第二个数组
 * @returns {T[]} 交集数组
 * @example
 * intersection([1, 2, 3], [2, 3, 4])    // 返回: [2, 3]
 * intersection(['a', 'b'], ['b', 'c'])  // 返回: ['b']
 */
export function intersection<T>(array1: T[], array2: T[]): T[] {
  const set2 = new Set(array2);
  return array1.filter((item) => set2.has(item));
}

/**
 * 计算两个数组的差集（在array1中但不在array2中的元素）
 * @function difference
 * @template T - 数组元素类型
 * @param {T[]} array1 - 第一个数组
 * @param {T[]} array2 - 第二个数组
 * @returns {T[]} 差集数组
 * @example
 * difference([1, 2, 3], [2, 3, 4])    // 返回: [1]
 * difference(['a', 'b', 'c'], ['b'])  // 返回: ['a', 'c']
 */
export function difference<T>(array1: T[], array2: T[]): T[] {
  const set2 = new Set(array2);
  return array1.filter((item) => !set2.has(item));
}

/**
 * 计算两个数组的并集
 * @function union
 * @template T - 数组元素类型
 * @param {T[]} array1 - 第一个数组
 * @param {T[]} array2 - 第二个数组
 * @returns {T[]} 并集数组
 * @example
 * union([1, 2], [2, 3])        // 返回: [1, 2, 3]
 * union(['a'], ['b', 'c'])     // 返回: ['a', 'b', 'c']
 */
export function union<T>(array1: T[], array2: T[]): T[] {
  return unique([...array1, ...array2]);
}

/**
 * 根据指定键对数组进行分组
 * @function groupBy
 * @template T - 数组元素类型
 * @template K - 键的类型
 * @param {T[]} array - 需要分组的数组
 * @param {(item: T) => K} keyFn - 用于获取分组键的函数
 * @returns {Map<K, T[]>} 分组后的Map对象
 * @example
 * const users = [
 *   { name: 'John', age: 30 },
 *   { name: 'Jane', age: 25 },
 *   { name: 'Bob', age: 30 }
 * ];
 * groupBy(users, u => u.age)
 * // 返回: Map { 30 => [{name: 'John', ...}, {name: 'Bob', ...}], 25 => [{name: 'Jane', ...}] }
 */
export function groupBy<T, K>(array: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  
  for (const item of array) {
    const key = keyFn(item);
    const group = map.get(key) || [];
    group.push(item);
    map.set(key, group);
  }
  
  return map;
}

/**
 * 将数组转换为以指定键为索引的对象
 * @function keyBy
 * @template T - 数组元素类型
 * @param {T[]} array - 需要转换的数组
 * @param {(item: T) => string} keyFn - 用于获取键的函数
 * @returns {Record<string, T>} 转换后的对象
 * @example
 * const users = [
 *   { id: '1', name: 'John' },
 *   { id: '2', name: 'Jane' }
 * ];
 * keyBy(users, u => u.id)
 * // 返回: { '1': { id: '1', name: 'John' }, '2': { id: '2', name: 'Jane' } }
 */
export function keyBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T> {
  const result: Record<string, T> = {};
  
  for (const item of array) {
    const key = keyFn(item);
    result[key] = item;
  }
  
  return result;
}

/**
 * 随机打乱数组顺序
 * @function shuffle
 * @template T - 数组元素类型
 * @param {T[]} array - 需要打乱的数组
 * @returns {T[]} 打乱后的新数组
 * @example
 * shuffle([1, 2, 3, 4, 5])    // 返回: [3, 1, 5, 2, 4]（示例）
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

/**
 * 从数组中随机选取指定数量的元素
 * @function sample
 * @template T - 数组元素类型
 * @param {T[]} array - 源数组
 * @param {number} count - 选取数量
 * @returns {T[]} 随机选取的元素数组
 * @example
 * sample([1, 2, 3, 4, 5], 2)    // 返回: [3, 1]（示例）
 */
export function sample<T>(array: T[], count: number): T[] {
  const shuffled = shuffle(array);
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * 获取数组中的第一个元素
 * @function first
 * @template T - 数组元素类型
 * @param {T[]} array - 源数组
 * @returns {T | undefined} 第一个元素，如果数组为空则返回undefined
 * @example
 * first([1, 2, 3])    // 返回: 1
 * first([])           // 返回: undefined
 */
export function first<T>(array: T[]): T | undefined {
  return array[0];
}

/**
 * 获取数组中的最后一个元素
 * @function last
 * @template T - 数组元素类型
 * @param {T[]} array - 源数组
 * @returns {T | undefined} 最后一个元素，如果数组为空则返回undefined
 * @example
 * last([1, 2, 3])    // 返回: 3
 * last([])           // 返回: undefined
 */
export function last<T>(array: T[]): T | undefined {
  return array[array.length - 1];
}

/**
 * 计算数组中数字的总和
 * @function sum
 * @param {number[]} array - 数字数组
 * @returns {number} 总和
 * @example
 * sum([1, 2, 3, 4, 5])    // 返回: 15
 * sum([])                 // 返回: 0
 */
export function sum(array: number[]): number {
  return array.reduce((acc, val) => acc + val, 0);
}

/**
 * 计算数组中数字的平均值
 * @function average
 * @param {number[]} array - 数字数组
 * @returns {number} 平均值，如果数组为空则返回0
 * @example
 * average([1, 2, 3, 4, 5])    // 返回: 3
 * average([10, 20])           // 返回: 15
 */
export function average(array: number[]): number {
  if (array.length === 0) return 0;
  return sum(array) / array.length;
}

/**
 * 获取数组中的最大值
 * @function max
 * @param {number[]} array - 数字数组
 * @returns {number | undefined} 最大值，如果数组为空则返回undefined
 * @example
 * max([1, 5, 3, 9, 2])    // 返回: 9
 * max([])                 // 返回: undefined
 */
export function max(array: number[]): number | undefined {
  if (array.length === 0) return undefined;
  return Math.max(...array);
}

/**
 * 获取数组中的最小值
 * @function min
 * @param {number[]} array - 数字数组
 * @returns {number | undefined} 最小值，如果数组为空则返回undefined
 * @example
 * min([1, 5, 3, 9, 2])    // 返回: 1
 * min([])                 // 返回: undefined
 */
export function min(array: number[]): number | undefined {
  if (array.length === 0) return undefined;
  return Math.min(...array);
}

/**
 * 对数组进行排序
 * @function sortBy
 * @template T - 数组元素类型
 * @param {T[]} array - 需要排序的数组
 * @param {(item: T) => number | string} keyFn - 用于获取排序键的函数
 * @param {'asc' | 'desc'} [order='asc'] - 排序方向
 * @returns {T[]} 排序后的新数组
 * @example
 * const users = [
 *   { name: 'John', age: 30 },
 *   { name: 'Jane', age: 25 }
 * ];
 * sortBy(users, u => u.age)           // 返回: [{ name: 'Jane', ... }, { name: 'John', ... }]
 * sortBy(users, u => u.age, 'desc')   // 返回: [{ name: 'John', ... }, { name: 'Jane', ... }]
 */
export function sortBy<T>(
  array: T[],
  keyFn: (item: T) => number | string,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const keyA = keyFn(a);
    const keyB = keyFn(b);
    
    let comparison = 0;
    if (keyA < keyB) comparison = -1;
    else if (keyA > keyB) comparison = 1;
    
    return order === 'desc' ? -comparison : comparison;
  });
}

/**
 * 将数组按指定大小进行分页
 * @function paginate
 * @template T - 数组元素类型
 * @param {T[]} array - 需要分页的数组
 * @param {number} page - 页码（从1开始）
 * @param {number} pageSize - 每页大小
 * @returns {{ items: T[]; total: number; totalPages: number }} 分页结果
 * @example
 * const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
 * paginate(data, 1, 3)
 * // 返回: { items: [1, 2, 3], total: 10, totalPages: 4 }
 * paginate(data, 2, 3)
 * // 返回: { items: [4, 5, 6], total: 10, totalPages: 4 }
 */
export function paginate<T>(
  array: T[],
  page: number,
  pageSize: number
): { items: T[]; total: number; totalPages: number } {
  const startIndex = (page - 1) * pageSize;
  const items = array.slice(startIndex, startIndex + pageSize);
  const total = array.length;
  const totalPages = Math.ceil(total / pageSize);
  
  return { items, total, totalPages };
}
