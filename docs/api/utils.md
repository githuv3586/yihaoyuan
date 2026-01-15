# 工具函数 API 文档

本文档详细介绍了工具函数库中所有可用的函数，包括参数说明、返回值和使用示例。

## 目录

- [字符串处理 (String)](#字符串处理-string)
- [数组处理 (Array)](#数组处理-array)
- [日期时间处理 (Date)](#日期时间处理-date)
- [数据验证 (Validation)](#数据验证-validation)

---

## 字符串处理 (String)

### toCamelCase

将字符串转换为驼峰命名格式。

**函数签名:**
```typescript
function toCamelCase(str: string): string
```

**参数:**
| 参数 | 类型 | 描述 |
|------|------|------|
| str | string | 需要转换的字符串 |

**返回值:** `string` - 转换后的驼峰命名字符串

**示例:**
```typescript
import { toCamelCase } from '@/utils';

toCamelCase('hello-world');     // 'helloWorld'
toCamelCase('hello_world');     // 'helloWorld'
toCamelCase('HelloWorld');      // 'helloWorld'
toCamelCase('hello world');     // 'helloWorld'
```

---

### toKebabCase

将字符串转换为短横线命名格式（kebab-case）。

**函数签名:**
```typescript
function toKebabCase(str: string): string
```

**参数:**
| 参数 | 类型 | 描述 |
|------|------|------|
| str | string | 需要转换的字符串 |

**返回值:** `string` - 转换后的短横线命名字符串

**示例:**
```typescript
import { toKebabCase } from '@/utils';

toKebabCase('helloWorld');      // 'hello-world'
toKebabCase('HelloWorld');      // 'hello-world'
toKebabCase('hello_world');     // 'hello-world'
```

---

### toSnakeCase

将字符串转换为下划线命名格式（snake_case）。

**函数签名:**
```typescript
function toSnakeCase(str: string): string
```

**参数:**
| 参数 | 类型 | 描述 |
|------|------|------|
| str | string | 需要转换的字符串 |

**返回值:** `string` - 转换后的下划线命名字符串

**示例:**
```typescript
import { toSnakeCase } from '@/utils';

toSnakeCase('helloWorld');      // 'hello_world'
toSnakeCase('HelloWorld');      // 'hello_world'
toSnakeCase('hello-world');     // 'hello_world'
```

---

### toPascalCase

将字符串转换为帕斯卡命名格式（PascalCase）。

**函数签名:**
```typescript
function toPascalCase(str: string): string
```

**参数:**
| 参数 | 类型 | 描述 |
|------|------|------|
| str | string | 需要转换的字符串 |

**返回值:** `string` - 转换后的帕斯卡命名字符串

**示例:**
```typescript
import { toPascalCase } from '@/utils';

toPascalCase('hello-world');    // 'HelloWorld'
toPascalCase('hello_world');    // 'HelloWorld'
toPascalCase('helloWorld');     // 'HelloWorld'
```

---

### truncate

截断字符串到指定长度，并添加省略号。

**函数签名:**
```typescript
function truncate(str: string, maxLength: number, suffix?: string): string
```

**参数:**
| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| str | string | - | 需要截断的字符串 |
| maxLength | number | - | 最大长度 |
| suffix | string | '...' | 省略号后缀 |

**返回值:** `string` - 截断后的字符串

**示例:**
```typescript
import { truncate } from '@/utils';

truncate('Hello World', 8);           // 'Hello...'
truncate('Hello World', 8, '…');      // 'Hello W…'
truncate('Hello', 10);                // 'Hello'
```

---

### capitalize

将字符串首字母大写。

**函数签名:**
```typescript
function capitalize(str: string): string
```

**示例:**
```typescript
import { capitalize } from '@/utils';

capitalize('hello');        // 'Hello'
capitalize('hello world');  // 'Hello world'
```

---

### capitalizeWords

将字符串中每个单词的首字母大写。

**函数签名:**
```typescript
function capitalizeWords(str: string): string
```

**示例:**
```typescript
import { capitalizeWords } from '@/utils';

capitalizeWords('hello world');     // 'Hello World'
```

---

### isBlank

检查字符串是否为空或只包含空白字符。

**函数签名:**
```typescript
function isBlank(str: string | null | undefined): boolean
```

**示例:**
```typescript
import { isBlank } from '@/utils';

isBlank('');           // true
isBlank('   ');        // true
isBlank(null);         // true
isBlank('hello');      // false
```

---

### randomString

生成指定长度的随机字符串。

**函数签名:**
```typescript
function randomString(length: number, charset?: string): string
```

**参数:**
| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| length | number | - | 字符串长度 |
| charset | string | 字母+数字 | 字符集 |

**示例:**
```typescript
import { randomString } from '@/utils';

randomString(8);                    // 'aB3xY9kL' (示例)
randomString(4, '0123456789');      // '7291' (示例)
```

---

## 数组处理 (Array)

### chunk

将数组分割成指定大小的块。

**函数签名:**
```typescript
function chunk<T>(array: T[], size: number): T[][]
```

**参数:**
| 参数 | 类型 | 描述 |
|------|------|------|
| array | T[] | 需要分割的数组 |
| size | number | 每个块的大小 |

**返回值:** `T[][]` - 分割后的二维数组

**示例:**
```typescript
import { chunk } from '@/utils';

chunk([1, 2, 3, 4, 5], 2);    // [[1, 2], [3, 4], [5]]
chunk(['a', 'b', 'c'], 1);    // [['a'], ['b'], ['c']]
```

---

### unique

数组去重。

**函数签名:**
```typescript
function unique<T>(array: T[]): T[]
```

**示例:**
```typescript
import { unique } from '@/utils';

unique([1, 2, 2, 3, 3, 3]);    // [1, 2, 3]
unique(['a', 'b', 'a']);       // ['a', 'b']
```

---

### uniqueBy

根据指定键对数组元素去重。

**函数签名:**
```typescript
function uniqueBy<T, K>(array: T[], keyFn: (item: T) => K): T[]
```

**示例:**
```typescript
import { uniqueBy } from '@/utils';

const users = [
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' },
  { id: 1, name: 'John Doe' }
];

uniqueBy(users, u => u.id);
// [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]
```

---

### groupBy

根据指定键对数组进行分组。

**函数签名:**
```typescript
function groupBy<T, K>(array: T[], keyFn: (item: T) => K): Map<K, T[]>
```

**示例:**
```typescript
import { groupBy } from '@/utils';

const users = [
  { name: 'John', age: 30 },
  { name: 'Jane', age: 25 },
  { name: 'Bob', age: 30 }
];

const grouped = groupBy(users, u => u.age);
// Map { 
//   30 => [{ name: 'John', age: 30 }, { name: 'Bob', age: 30 }], 
//   25 => [{ name: 'Jane', age: 25 }] 
// }
```

---

### intersection

计算两个数组的交集。

**函数签名:**
```typescript
function intersection<T>(array1: T[], array2: T[]): T[]
```

**示例:**
```typescript
import { intersection } from '@/utils';

intersection([1, 2, 3], [2, 3, 4]);    // [2, 3]
intersection(['a', 'b'], ['b', 'c']);  // ['b']
```

---

### difference

计算两个数组的差集。

**函数签名:**
```typescript
function difference<T>(array1: T[], array2: T[]): T[]
```

**示例:**
```typescript
import { difference } from '@/utils';

difference([1, 2, 3], [2, 3, 4]);    // [1]
difference(['a', 'b', 'c'], ['b']);  // ['a', 'c']
```

---

### union

计算两个数组的并集。

**函数签名:**
```typescript
function union<T>(array1: T[], array2: T[]): T[]
```

**示例:**
```typescript
import { union } from '@/utils';

union([1, 2], [2, 3]);        // [1, 2, 3]
union(['a'], ['b', 'c']);     // ['a', 'b', 'c']
```

---

### shuffle

随机打乱数组顺序。

**函数签名:**
```typescript
function shuffle<T>(array: T[]): T[]
```

**示例:**
```typescript
import { shuffle } from '@/utils';

shuffle([1, 2, 3, 4, 5]);    // [3, 1, 5, 2, 4] (示例)
```

---

### sortBy

对数组进行排序。

**函数签名:**
```typescript
function sortBy<T>(
  array: T[],
  keyFn: (item: T) => number | string,
  order?: 'asc' | 'desc'
): T[]
```

**示例:**
```typescript
import { sortBy } from '@/utils';

const users = [
  { name: 'John', age: 30 },
  { name: 'Jane', age: 25 }
];

sortBy(users, u => u.age);           // [{ name: 'Jane', ... }, { name: 'John', ... }]
sortBy(users, u => u.age, 'desc');   // [{ name: 'John', ... }, { name: 'Jane', ... }]
```

---

### sum / average / max / min

数组数值计算函数。

**函数签名:**
```typescript
function sum(array: number[]): number
function average(array: number[]): number
function max(array: number[]): number | undefined
function min(array: number[]): number | undefined
```

**示例:**
```typescript
import { sum, average, max, min } from '@/utils';

sum([1, 2, 3, 4, 5]);       // 15
average([1, 2, 3, 4, 5]);   // 3
max([1, 5, 3, 9, 2]);       // 9
min([1, 5, 3, 9, 2]);       // 1
```

---

### paginate

将数组按指定大小进行分页。

**函数签名:**
```typescript
function paginate<T>(
  array: T[],
  page: number,
  pageSize: number
): { items: T[]; total: number; totalPages: number }
```

**示例:**
```typescript
import { paginate } from '@/utils';

const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

paginate(data, 1, 3);
// { items: [1, 2, 3], total: 10, totalPages: 4 }

paginate(data, 2, 3);
// { items: [4, 5, 6], total: 10, totalPages: 4 }
```

---

## 日期时间处理 (Date)

### formatDate

将日期格式化为指定格式的字符串。

**函数签名:**
```typescript
function formatDate(
  date: Date | string | number,
  format?: string
): string
```

**参数:**
| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| date | Date \| string \| number | - | 日期对象、日期字符串或时间戳 |
| format | string | 'YYYY-MM-DD' | 格式化模板 |

**支持的格式化占位符:**
- `YYYY`: 四位年份
- `MM`: 两位月份
- `DD`: 两位日期
- `HH`: 两位小时（24小时制）
- `mm`: 两位分钟
- `ss`: 两位秒钟
- `SSS`: 三位毫秒

**示例:**
```typescript
import { formatDate } from '@/utils';

formatDate(new Date('2024-01-15'), 'YYYY-MM-DD');
// '2024-01-15'

formatDate(new Date('2024-01-15 14:30:00'), 'YYYY/MM/DD HH:mm:ss');
// '2024/01/15 14:30:00'

formatDate(1705312200000, 'YYYY年MM月DD日');
// '2024年01月15日'
```

---

### dateDiff

计算两个日期之间的差值。

**函数签名:**
```typescript
function dateDiff(
  date1: Date | string | number,
  date2: Date | string | number,
  unit?: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'
): number
```

**示例:**
```typescript
import { dateDiff } from '@/utils';

dateDiff('2024-01-15', '2024-01-10', 'days');     // 5
dateDiff('2024-01-15', '2024-01-10', 'hours');    // 120
```

---

### addTime

向日期添加指定时间。

**函数签名:**
```typescript
function addTime(
  date: Date | string | number,
  amount: number,
  unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'
): Date
```

**示例:**
```typescript
import { addTime } from '@/utils';

addTime('2024-01-15', 5, 'days');      // 2024-01-20
addTime('2024-01-15', -1, 'months');   // 2023-12-15
addTime('2024-01-15', 2, 'hours');     // 添加2小时后的Date
```

---

### timeAgo

将日期转换为相对时间描述。

**函数签名:**
```typescript
function timeAgo(
  date: Date | string | number,
  locale?: 'zh' | 'en'
): string
```

**示例:**
```typescript
import { timeAgo } from '@/utils';

// 假设当前时间为 2024-01-15 12:00:00
timeAgo('2024-01-15 11:59:00');    // '1分钟前'
timeAgo('2024-01-15 10:00:00');    // '2小时前'
timeAgo('2024-01-14 12:00:00');    // '1天前'

// 英文
timeAgo('2024-01-14 12:00:00', 'en');    // '1 day ago'
```

---

### 其他日期函数

```typescript
// 获取月份的第一天/最后一天
startOfMonth('2024-01-15');    // 2024-01-01 00:00:00
endOfMonth('2024-01-15');      // 2024-01-31 23:59:59.999

// 获取周的第一天/最后一天
startOfWeek('2024-01-15');     // 2024-01-15 00:00:00（周一）
endOfWeek('2024-01-15');       // 2024-01-21 23:59:59.999（周日）

// 日期检查
isToday(new Date());           // true
isYesterday(yesterday);        // true
isLeapYear(2024);              // true

// 获取月份天数
getDaysInMonth(2024, 2);       // 29（闰年2月）

// 获取ISO周数
getWeekNumber('2024-01-01');   // 1
```

---

## 数据验证 (Validation)

### isValidEmail

验证电子邮件地址格式。

**函数签名:**
```typescript
function isValidEmail(email: string): boolean
```

**示例:**
```typescript
import { isValidEmail } from '@/utils';

isValidEmail('user@example.com');     // true
isValidEmail('user@domain.co.uk');    // true
isValidEmail('invalid-email');         // false
```

---

### isValidPhone

验证手机号码格式（中国大陆）。

**函数签名:**
```typescript
function isValidPhone(phone: string): boolean
```

**示例:**
```typescript
import { isValidPhone } from '@/utils';

isValidPhone('13800138000');    // true
isValidPhone('1380013800');     // false
```

---

### isValidUrl

验证URL格式。

**函数签名:**
```typescript
function isValidUrl(url: string): boolean
```

**示例:**
```typescript
import { isValidUrl } from '@/utils';

isValidUrl('https://example.com');    // true
isValidUrl('not-a-url');              // false
```

---

### validatePassword

验证密码强度。

**函数签名:**
```typescript
function validatePassword(
  password: string,
  options?: {
    minLength?: number;
    maxLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumber?: boolean;
    requireSpecial?: boolean;
  }
): ValidationResult
```

**返回值类型:**
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  field: string;
}
```

**示例:**
```typescript
import { validatePassword } from '@/utils';

validatePassword('Abc12345');
// { isValid: true, errors: [], field: 'password' }

validatePassword('abc');
// { 
//   isValid: false, 
//   errors: ['密码长度至少为8位', '密码需要包含大写字母', '密码需要包含数字'], 
//   field: 'password' 
// }

// 自定义选项
validatePassword('abc123', {
  minLength: 6,
  requireUppercase: false,
  requireSpecial: true
});
// { isValid: false, errors: ['密码需要包含特殊字符'], field: 'password' }
```

---

### isEmpty

检查值是否为空。

**函数签名:**
```typescript
function isEmpty(value: unknown): boolean
```

**示例:**
```typescript
import { isEmpty } from '@/utils';

isEmpty(null);           // true
isEmpty(undefined);      // true
isEmpty('');             // true
isEmpty([]);             // true
isEmpty({});             // true
isEmpty('hello');        // false
isEmpty([1, 2]);         // false
```

---

### createValidator

创建自定义验证器。

**函数签名:**
```typescript
function createValidator<T>(config: {
  field: string;
  rules: Array<{ test: (value: T) => boolean; message: string }>;
}): (value: T) => ValidationResult
```

**示例:**
```typescript
import { createValidator } from '@/utils';

const validateAge = createValidator({
  field: 'age',
  rules: [
    { test: (v) => v >= 0, message: '年龄不能为负数' },
    { test: (v) => v <= 150, message: '年龄不能超过150' }
  ]
});

validateAge(25);   // { isValid: true, errors: [], field: 'age' }
validateAge(-1);   // { isValid: false, errors: ['年龄不能为负数'], field: 'age' }
```

---

## 完整示例

### 表单验证示例

```typescript
import { 
  isValidEmail, 
  isValidPhone, 
  validatePassword, 
  validateUsername,
  isEmpty 
} from '@/utils';

interface FormData {
  username: string;
  email: string;
  phone: string;
  password: string;
}

function validateForm(data: FormData) {
  const errors: Record<string, string[]> = {};

  // 验证用户名
  const usernameResult = validateUsername(data.username);
  if (!usernameResult.isValid) {
    errors.username = usernameResult.errors;
  }

  // 验证邮箱
  if (isEmpty(data.email)) {
    errors.email = ['邮箱不能为空'];
  } else if (!isValidEmail(data.email)) {
    errors.email = ['请输入有效的邮箱地址'];
  }

  // 验证手机号
  if (!isEmpty(data.phone) && !isValidPhone(data.phone)) {
    errors.phone = ['请输入有效的手机号码'];
  }

  // 验证密码
  const passwordResult = validatePassword(data.password, {
    minLength: 8,
    requireSpecial: true
  });
  if (!passwordResult.isValid) {
    errors.password = passwordResult.errors;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
```

### 数据处理示例

```typescript
import { 
  chunk, 
  groupBy, 
  sortBy, 
  formatDate,
  unique 
} from '@/utils';

// 处理用户列表
const users = [
  { id: 1, name: 'John', department: 'IT', joinDate: '2023-01-15' },
  { id: 2, name: 'Jane', department: 'HR', joinDate: '2023-03-20' },
  { id: 3, name: 'Bob', department: 'IT', joinDate: '2022-06-10' },
  // ...
];

// 按部门分组
const usersByDept = groupBy(users, u => u.department);

// 按入职日期排序
const sortedUsers = sortBy(users, u => u.joinDate);

// 分页显示
const pageData = chunk(sortedUsers, 10); // 每页10条

// 获取所有部门
const departments = unique(users.map(u => u.department));

// 格式化显示
sortedUsers.forEach(user => {
  console.log(`${user.name} - ${formatDate(user.joinDate, 'YYYY年MM月DD日')} 入职`);
});
```
