/**
 * @fileoverview 日期时间处理工具函数
 * @module utils/date
 * @description 提供各种日期时间操作和格式化的工具函数
 */

/**
 * 将日期格式化为指定格式的字符串
 * @function formatDate
 * @param {Date | string | number} date - 日期对象、日期字符串或时间戳
 * @param {string} [format='YYYY-MM-DD'] - 格式化模板
 * @returns {string} 格式化后的日期字符串
 * @description
 * 支持的格式化占位符：
 * - YYYY: 四位年份
 * - MM: 两位月份
 * - DD: 两位日期
 * - HH: 两位小时（24小时制）
 * - mm: 两位分钟
 * - ss: 两位秒钟
 * - SSS: 三位毫秒
 * @example
 * formatDate(new Date('2024-01-15'), 'YYYY-MM-DD')           // 返回: '2024-01-15'
 * formatDate(new Date('2024-01-15 14:30:00'), 'YYYY/MM/DD HH:mm:ss')  // 返回: '2024/01/15 14:30:00'
 * formatDate(1705312200000, 'YYYY年MM月DD日')                // 返回: '2024年01月15日'
 */
export function formatDate(
  date: Date | string | number,
  format: string = 'YYYY-MM-DD'
): string {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date');
  }
  
  const pad = (num: number, len: number = 2): string => 
    String(num).padStart(len, '0');
  
  const replacements: Record<string, string> = {
    'YYYY': String(d.getFullYear()),
    'MM': pad(d.getMonth() + 1),
    'DD': pad(d.getDate()),
    'HH': pad(d.getHours()),
    'mm': pad(d.getMinutes()),
    'ss': pad(d.getSeconds()),
    'SSS': pad(d.getMilliseconds(), 3)
  };
  
  return format.replace(/YYYY|MM|DD|HH|mm|ss|SSS/g, match => 
    replacements[match] || match
  );
}

/**
 * 解析日期字符串为Date对象
 * @function parseDate
 * @param {string} dateString - 日期字符串
 * @param {string} [format='YYYY-MM-DD'] - 日期格式
 * @returns {Date} 解析后的Date对象
 * @throws {Error} 当日期字符串格式不匹配时抛出错误
 * @example
 * parseDate('2024-01-15', 'YYYY-MM-DD')    // 返回: Date对象
 * parseDate('15/01/2024', 'DD/MM/YYYY')    // 返回: Date对象
 */
export function parseDate(dateString: string, format: string = 'YYYY-MM-DD'): Date {
  const formatParts = format.match(/YYYY|MM|DD|HH|mm|ss/g) || [];
  const regex = format
    .replace(/YYYY/g, '(\\d{4})')
    .replace(/MM|DD|HH|mm|ss/g, '(\\d{2})');
  
  const match = dateString.match(new RegExp(regex));
  
  if (!match) {
    throw new Error(`Date string "${dateString}" does not match format "${format}"`);
  }
  
  const values: Record<string, number> = {
    'YYYY': 1970, 'MM': 1, 'DD': 1, 'HH': 0, 'mm': 0, 'ss': 0
  };
  
  formatParts.forEach((part, index) => {
    values[part] = parseInt(match[index + 1], 10);
  });
  
  return new Date(
    values['YYYY'],
    values['MM'] - 1,
    values['DD'],
    values['HH'],
    values['mm'],
    values['ss']
  );
}

/**
 * 计算两个日期之间的差值
 * @function dateDiff
 * @param {Date | string | number} date1 - 第一个日期
 * @param {Date | string | number} date2 - 第二个日期
 * @param {string} [unit='days'] - 返回的单位
 * @returns {number} 日期差值
 * @description
 * 支持的单位：
 * - milliseconds: 毫秒
 * - seconds: 秒
 * - minutes: 分钟
 * - hours: 小时
 * - days: 天
 * - weeks: 周
 * - months: 月（近似值）
 * - years: 年（近似值）
 * @example
 * dateDiff('2024-01-15', '2024-01-10', 'days')     // 返回: 5
 * dateDiff('2024-01-15', '2024-01-10', 'hours')    // 返回: 120
 */
export function dateDiff(
  date1: Date | string | number,
  date2: Date | string | number,
  unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years' = 'days'
): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  
  const conversions: Record<string, number> = {
    'milliseconds': 1,
    'seconds': 1000,
    'minutes': 1000 * 60,
    'hours': 1000 * 60 * 60,
    'days': 1000 * 60 * 60 * 24,
    'weeks': 1000 * 60 * 60 * 24 * 7,
    'months': 1000 * 60 * 60 * 24 * 30.44, // 平均月长
    'years': 1000 * 60 * 60 * 24 * 365.25  // 考虑闰年
  };
  
  return Math.floor(diffMs / conversions[unit]);
}

/**
 * 向日期添加指定时间
 * @function addTime
 * @param {Date | string | number} date - 基准日期
 * @param {number} amount - 添加的数量
 * @param {string} unit - 时间单位
 * @returns {Date} 新的日期对象
 * @example
 * addTime('2024-01-15', 5, 'days')      // 返回: 2024-01-20对应的Date
 * addTime('2024-01-15', -1, 'months')   // 返回: 2023-12-15对应的Date
 * addTime('2024-01-15', 2, 'hours')     // 返回: 添加2小时后的Date
 */
export function addTime(
  date: Date | string | number,
  amount: number,
  unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'
): Date {
  const d = new Date(date);
  
  switch (unit) {
    case 'milliseconds':
      d.setMilliseconds(d.getMilliseconds() + amount);
      break;
    case 'seconds':
      d.setSeconds(d.getSeconds() + amount);
      break;
    case 'minutes':
      d.setMinutes(d.getMinutes() + amount);
      break;
    case 'hours':
      d.setHours(d.getHours() + amount);
      break;
    case 'days':
      d.setDate(d.getDate() + amount);
      break;
    case 'weeks':
      d.setDate(d.getDate() + amount * 7);
      break;
    case 'months':
      d.setMonth(d.getMonth() + amount);
      break;
    case 'years':
      d.setFullYear(d.getFullYear() + amount);
      break;
  }
  
  return d;
}

/**
 * 获取日期所在月份的第一天
 * @function startOfMonth
 * @param {Date | string | number} date - 日期
 * @returns {Date} 该月第一天的Date对象
 * @example
 * startOfMonth('2024-01-15')    // 返回: 2024-01-01 00:00:00
 */
export function startOfMonth(date: Date | string | number): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 获取日期所在月份的最后一天
 * @function endOfMonth
 * @param {Date | string | number} date - 日期
 * @returns {Date} 该月最后一天的Date对象
 * @example
 * endOfMonth('2024-01-15')    // 返回: 2024-01-31 23:59:59.999
 */
export function endOfMonth(date: Date | string | number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * 获取日期所在周的第一天（周一）
 * @function startOfWeek
 * @param {Date | string | number} date - 日期
 * @returns {Date} 该周第一天的Date对象
 * @example
 * startOfWeek('2024-01-15')    // 返回: 2024-01-15 00:00:00（周一）
 */
export function startOfWeek(date: Date | string | number): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 获取日期所在周的最后一天（周日）
 * @function endOfWeek
 * @param {Date | string | number} date - 日期
 * @returns {Date} 该周最后一天的Date对象
 * @example
 * endOfWeek('2024-01-15')    // 返回: 2024-01-21 23:59:59.999（周日）
 */
export function endOfWeek(date: Date | string | number): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * 检查日期是否为今天
 * @function isToday
 * @param {Date | string | number} date - 需要检查的日期
 * @returns {boolean} 是否为今天
 * @example
 * isToday(new Date())           // 返回: true
 * isToday('2020-01-01')         // 返回: false
 */
export function isToday(date: Date | string | number): boolean {
  const d = new Date(date);
  const today = new Date();
  return d.getFullYear() === today.getFullYear() &&
         d.getMonth() === today.getMonth() &&
         d.getDate() === today.getDate();
}

/**
 * 检查日期是否为昨天
 * @function isYesterday
 * @param {Date | string | number} date - 需要检查的日期
 * @returns {boolean} 是否为昨天
 * @example
 * const yesterday = new Date();
 * yesterday.setDate(yesterday.getDate() - 1);
 * isYesterday(yesterday)    // 返回: true
 */
export function isYesterday(date: Date | string | number): boolean {
  const d = new Date(date);
  const yesterday = addTime(new Date(), -1, 'days');
  return d.getFullYear() === yesterday.getFullYear() &&
         d.getMonth() === yesterday.getMonth() &&
         d.getDate() === yesterday.getDate();
}

/**
 * 检查年份是否为闰年
 * @function isLeapYear
 * @param {number | Date} year - 年份或日期
 * @returns {boolean} 是否为闰年
 * @example
 * isLeapYear(2024)    // 返回: true
 * isLeapYear(2023)    // 返回: false
 */
export function isLeapYear(year: number | Date): boolean {
  const y = typeof year === 'number' ? year : year.getFullYear();
  return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

/**
 * 获取指定月份的天数
 * @function getDaysInMonth
 * @param {number} year - 年份
 * @param {number} month - 月份（1-12）
 * @returns {number} 该月的天数
 * @example
 * getDaysInMonth(2024, 2)    // 返回: 29（闰年2月）
 * getDaysInMonth(2023, 2)    // 返回: 28
 * getDaysInMonth(2024, 1)    // 返回: 31
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * 将日期转换为相对时间描述
 * @function timeAgo
 * @param {Date | string | number} date - 日期
 * @param {string} [locale='zh'] - 语言环境
 * @returns {string} 相对时间描述
 * @example
 * // 假设当前时间为 2024-01-15 12:00:00
 * timeAgo('2024-01-15 11:59:00')    // 返回: '1分钟前'
 * timeAgo('2024-01-15 10:00:00')    // 返回: '2小时前'
 * timeAgo('2024-01-14 12:00:00')    // 返回: '1天前'
 */
export function timeAgo(date: Date | string | number, locale: 'zh' | 'en' = 'zh'): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  const templates = {
    zh: {
      now: '刚刚',
      seconds: (n: number) => `${n}秒前`,
      minutes: (n: number) => `${n}分钟前`,
      hours: (n: number) => `${n}小时前`,
      days: (n: number) => `${n}天前`,
      months: (n: number) => `${n}个月前`,
      years: (n: number) => `${n}年前`
    },
    en: {
      now: 'just now',
      seconds: (n: number) => `${n} second${n > 1 ? 's' : ''} ago`,
      minutes: (n: number) => `${n} minute${n > 1 ? 's' : ''} ago`,
      hours: (n: number) => `${n} hour${n > 1 ? 's' : ''} ago`,
      days: (n: number) => `${n} day${n > 1 ? 's' : ''} ago`,
      months: (n: number) => `${n} month${n > 1 ? 's' : ''} ago`,
      years: (n: number) => `${n} year${n > 1 ? 's' : ''} ago`
    }
  };
  
  const t = templates[locale];
  
  if (seconds < 30) return t.now;
  if (seconds < 60) return t.seconds(seconds);
  if (minutes < 60) return t.minutes(minutes);
  if (hours < 24) return t.hours(hours);
  if (days < 30) return t.days(days);
  if (months < 12) return t.months(months);
  return t.years(years);
}

/**
 * 获取日期的ISO周数
 * @function getWeekNumber
 * @param {Date | string | number} date - 日期
 * @returns {number} ISO周数（1-53）
 * @example
 * getWeekNumber('2024-01-01')    // 返回: 1
 * getWeekNumber('2024-12-31')    // 返回: 1（属于2025年第1周）
 */
export function getWeekNumber(date: Date | string | number): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
