# 组件库文档

本文档详细介绍了组件库中所有可用的 React 组件，包括属性说明、使用示例和最佳实践。

## 目录

- [Button 按钮](#button-按钮)
- [Input 输入框](#input-输入框)
- [Modal 模态框](#modal-模态框)
- [Card 卡片](#card-卡片)

---

## Button 按钮

可复用的按钮组件，支持多种变体、尺寸和状态。

### 引入方式

```typescript
import { Button } from '@/components';
import type { ButtonProps } from '@/components';
```

### 属性说明

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| variant | 'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'danger' | 'primary' | 按钮变体样式 |
| size | 'small' \| 'medium' \| 'large' | 'medium' | 按钮尺寸 |
| loading | boolean | false | 是否显示加载状态 |
| disabled | boolean | false | 是否禁用按钮 |
| fullWidth | boolean | false | 是否全宽显示 |
| leftIcon | ReactNode | - | 左侧图标 |
| rightIcon | ReactNode | - | 右侧图标 |
| children | ReactNode | - | 按钮内容 |
| onClick | (e: MouseEvent) => void | - | 点击回调 |

### 基本用法

```tsx
import { Button } from '@/components';

function Example() {
  return (
    <Button onClick={() => console.log('点击了')}>
      点击我
    </Button>
  );
}
```

### 变体样式

```tsx
<Button variant="primary">主要按钮</Button>
<Button variant="secondary">次要按钮</Button>
<Button variant="outline">边框按钮</Button>
<Button variant="ghost">幽灵按钮</Button>
<Button variant="danger">危险按钮</Button>
```

**效果说明:**
- **primary**: 蓝色背景，白色文字，用于主要操作
- **secondary**: 灰色背景，深色文字，用于次要操作
- **outline**: 蓝色边框，蓝色文字，用于次要但需要突出的操作
- **ghost**: 透明背景，深色文字，用于不太重要的操作
- **danger**: 红色背景，白色文字，用于危险操作（如删除）

### 不同尺寸

```tsx
<Button size="small">小按钮</Button>
<Button size="medium">中按钮</Button>
<Button size="large">大按钮</Button>
```

### 加载状态

```tsx
function SubmitButton() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await submitData();
    setLoading(false);
  };

  return (
    <Button loading={loading} onClick={handleSubmit}>
      {loading ? '提交中...' : '提交'}
    </Button>
  );
}
```

### 带图标

```tsx
import { SearchIcon, ArrowRightIcon } from '@/icons';

<Button leftIcon={<SearchIcon />}>搜索</Button>
<Button rightIcon={<ArrowRightIcon />}>下一步</Button>
<Button leftIcon={<PlusIcon />} rightIcon={<ChevronDownIcon />}>
  添加
</Button>
```

### 全宽按钮

```tsx
<Button fullWidth>提交订单</Button>
```

### 禁用状态

```tsx
<Button disabled>禁用按钮</Button>
<Button disabled variant="danger">禁用的危险按钮</Button>
```

### 组合使用

```tsx
function FormActions() {
  return (
    <div className="flex gap-3">
      <Button variant="ghost">取消</Button>
      <Button variant="primary">保存</Button>
    </div>
  );
}

function DangerZone() {
  const [deleting, setDeleting] = useState(false);

  return (
    <Button 
      variant="danger" 
      loading={deleting}
      onClick={async () => {
        setDeleting(true);
        await deleteAccount();
        setDeleting(false);
      }}
    >
      删除账户
    </Button>
  );
}
```

---

## Input 输入框

可复用的输入框组件，支持标签、验证、图标等功能。

### 引入方式

```typescript
import { Input } from '@/components';
import type { InputProps } from '@/components';
```

### 属性说明

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| label | string | - | 输入框标签 |
| error | string | - | 错误消息 |
| helperText | string | - | 帮助文本 |
| size | 'small' \| 'medium' \| 'large' | 'medium' | 输入框尺寸 |
| fullWidth | boolean | false | 是否全宽显示 |
| leftIcon | ReactNode | - | 左侧图标 |
| rightIcon | ReactNode | - | 右侧图标 |
| clearable | boolean | false | 是否显示清除按钮 |
| onClear | () => void | - | 清除回调函数 |

> 组件继承所有原生 `input` 元素的属性

### 基本用法

```tsx
import { Input } from '@/components';

function Example() {
  const [value, setValue] = useState('');

  return (
    <Input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="请输入内容"
    />
  );
}
```

### 带标签

```tsx
<Input label="用户名" placeholder="请输入用户名" />
<Input label="邮箱" type="email" placeholder="example@email.com" />
```

### 验证错误

```tsx
function ValidatedInput() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const validate = (value: string) => {
    if (!value) {
      setError('邮箱不能为空');
    } else if (!isValidEmail(value)) {
      setError('请输入有效的邮箱地址');
    } else {
      setError('');
    }
  };

  return (
    <Input
      label="邮箱"
      value={email}
      onChange={(e) => {
        setEmail(e.target.value);
        validate(e.target.value);
      }}
      error={error}
      placeholder="example@email.com"
    />
  );
}
```

### 帮助文本

```tsx
<Input
  label="密码"
  type="password"
  helperText="密码至少8位，包含大小写字母和数字"
  placeholder="请输入密码"
/>
```

### 带图标

```tsx
import { SearchIcon, EmailIcon } from '@/icons';

// 左侧图标
<Input
  leftIcon={<SearchIcon />}
  placeholder="搜索..."
/>

// 右侧图标
<Input
  rightIcon={<EmailIcon />}
  placeholder="输入邮箱"
/>
```

### 可清除

```tsx
function ClearableInput() {
  const [value, setValue] = useState('');

  return (
    <Input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      clearable
      onClear={() => setValue('')}
      placeholder="输入内容后可清除"
    />
  );
}
```

### 不同尺寸

```tsx
<Input size="small" placeholder="小输入框" />
<Input size="medium" placeholder="中输入框" />
<Input size="large" placeholder="大输入框" />
```

### 禁用状态

```tsx
<Input disabled value="禁用的输入框" />
```

### 完整表单示例

```tsx
function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors = { email: '', password: '' };
    
    if (!form.email) {
      newErrors.email = '请输入邮箱';
    } else if (!isValidEmail(form.email)) {
      newErrors.email = '邮箱格式不正确';
    }
    
    if (!form.password) {
      newErrors.password = '请输入密码';
    } else if (form.password.length < 8) {
      newErrors.password = '密码至少8位';
    }
    
    setErrors(newErrors);
    
    if (!newErrors.email && !newErrors.password) {
      // 提交表单
      login(form);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="邮箱"
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        error={errors.email}
        leftIcon={<EmailIcon />}
        fullWidth
      />
      
      <Input
        label="密码"
        type="password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        error={errors.password}
        leftIcon={<LockIcon />}
        fullWidth
      />
      
      <Button type="submit" fullWidth>
        登录
      </Button>
    </form>
  );
}
```

---

## Modal 模态框

可复用的模态框组件，支持自定义内容、标题和底部操作按钮。

### 引入方式

```typescript
import { Modal } from '@/components';
import type { ModalProps } from '@/components';
```

### 属性说明

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| isOpen | boolean | - | 是否显示模态框 |
| onClose | () => void | - | 关闭回调函数 |
| title | string | - | 模态框标题 |
| size | 'small' \| 'medium' \| 'large' \| 'full' | 'medium' | 模态框尺寸 |
| showCloseButton | boolean | true | 是否显示关闭按钮 |
| closeOnOverlayClick | boolean | true | 点击遮罩层是否关闭 |
| closeOnEsc | boolean | true | 按ESC键是否关闭 |
| footer | ReactNode | - | 底部内容 |
| children | ReactNode | - | 模态框主体内容 |

### 基本用法

```tsx
import { useState } from 'react';
import { Modal, Button } from '@/components';

function Example() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>打开模态框</Button>
      
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <p>这是模态框的内容</p>
      </Modal>
    </>
  );
}
```

### 带标题

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="用户信息"
>
  <p>用户名: John Doe</p>
  <p>邮箱: john@example.com</p>
</Modal>
```

### 带底部按钮

```tsx
function ConfirmModal() {
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = () => {
    // 执行确认操作
    console.log('确认');
    setIsOpen(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="确认删除"
      footer={
        <>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            取消
          </Button>
          <Button variant="danger" onClick={handleConfirm}>
            确认删除
          </Button>
        </>
      }
    >
      <p>确定要删除这条记录吗？此操作不可撤销。</p>
    </Modal>
  );
}
```

### 不同尺寸

```tsx
<Modal size="small" ...>小模态框</Modal>
<Modal size="medium" ...>中模态框</Modal>
<Modal size="large" ...>大模态框</Modal>
<Modal size="full" ...>全屏模态框</Modal>
```

### 禁用关闭方式

```tsx
// 禁止点击遮罩层关闭
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  closeOnOverlayClick={false}
>
  <p>必须点击按钮才能关闭</p>
</Modal>

// 禁止ESC键关闭
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  closeOnEsc={false}
>
  <p>按ESC键不会关闭</p>
</Modal>

// 隐藏关闭按钮
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  showCloseButton={false}
>
  <p>没有关闭按钮</p>
</Modal>
```

### 表单模态框

```tsx
function EditUserModal({ user, isOpen, onClose, onSave }) {
  const [form, setForm] = useState(user);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑用户"
      closeOnOverlayClick={false}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button onClick={handleSave} loading={saving}>
            保存
          </Button>
        </>
      }
    >
      <Input
        label="用户名"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        fullWidth
      />
      <Input
        label="邮箱"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        fullWidth
      />
    </Modal>
  );
}
```

---

## Card 卡片

可复用的卡片组件，用于展示各种内容块。

### 引入方式

```typescript
import { Card } from '@/components';
import type { CardProps } from '@/components';
```

### 属性说明

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| title | string | - | 卡片标题 |
| subtitle | string | - | 卡片副标题 |
| variant | 'elevated' \| 'outlined' \| 'filled' | 'elevated' | 卡片变体 |
| padding | 'none' \| 'small' \| 'medium' \| 'large' | 'medium' | 内边距大小 |
| clickable | boolean | false | 是否可点击 |
| onClick | () => void | - | 点击回调 |
| headerAction | ReactNode | - | 头部额外内容 |
| footer | ReactNode | - | 底部内容 |
| coverImage | string | - | 封面图片URL |
| coverHeight | string | '200px' | 封面图片高度 |
| children | ReactNode | - | 卡片内容 |

### 基本用法

```tsx
import { Card } from '@/components';

function Example() {
  return (
    <Card>
      <p>这是卡片的内容</p>
    </Card>
  );
}
```

### 带标题

```tsx
<Card title="卡片标题">
  <p>卡片内容</p>
</Card>

<Card title="卡片标题" subtitle="这是副标题">
  <p>卡片内容</p>
</Card>
```

### 不同变体

```tsx
// 有阴影（默认）
<Card variant="elevated">
  <p>有阴影的卡片</p>
</Card>

// 有边框
<Card variant="outlined">
  <p>有边框的卡片</p>
</Card>

// 有背景色
<Card variant="filled">
  <p>有背景色的卡片</p>
</Card>
```

### 带封面图片

```tsx
<Card
  title="风景照片"
  coverImage="/path/to/image.jpg"
  coverHeight="180px"
>
  <p>这是一张美丽的风景照片...</p>
</Card>
```

### 可点击卡片

```tsx
function ProductCard({ product }) {
  const navigate = useNavigate();

  return (
    <Card
      clickable
      onClick={() => navigate(`/products/${product.id}`)}
      title={product.name}
      coverImage={product.image}
    >
      <p>{product.description}</p>
    </Card>
  );
}
```

### 带头部操作按钮

```tsx
<Card
  title="任务列表"
  headerAction={
    <Button size="small" variant="ghost">
      添加
    </Button>
  }
>
  <ul>
    <li>任务1</li>
    <li>任务2</li>
  </ul>
</Card>
```

### 带底部

```tsx
<Card
  title="商品名称"
  coverImage="/product.jpg"
  footer={
    <div className="flex justify-between items-center">
      <span className="text-xl font-bold">¥99.00</span>
      <Button size="small">加入购物车</Button>
    </div>
  }
>
  <p>商品描述...</p>
</Card>
```

### 商品卡片示例

```tsx
function ProductGrid({ products }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map(product => (
        <Card
          key={product.id}
          clickable
          onClick={() => viewProduct(product.id)}
          coverImage={product.image}
          coverHeight="200px"
          footer={
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-red-600">
                ¥{product.price}
              </span>
              <Button 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(product);
                }}
              >
                加购
              </Button>
            </div>
          }
        >
          <h3 className="font-medium truncate">{product.name}</h3>
          <p className="text-gray-500 text-sm mt-1 line-clamp-2">
            {product.description}
          </p>
        </Card>
      ))}
    </div>
  );
}
```

### 文章卡片示例

```tsx
function ArticleCard({ article }) {
  return (
    <Card
      clickable
      onClick={() => readArticle(article.id)}
      coverImage={article.coverImage}
      coverHeight="160px"
    >
      <h3 className="text-lg font-semibold line-clamp-2">
        {article.title}
      </h3>
      <p className="text-gray-500 text-sm mt-2 line-clamp-3">
        {article.summary}
      </p>
      <div className="flex items-center mt-4 text-sm text-gray-400">
        <img 
          src={article.author.avatar} 
          className="w-6 h-6 rounded-full mr-2"
        />
        <span>{article.author.name}</span>
        <span className="mx-2">·</span>
        <span>{formatDate(article.publishedAt, 'MM-DD')}</span>
      </div>
    </Card>
  );
}
```

---

## 最佳实践

### 1. 组件组合

```tsx
// 结合多个组件创建复杂UI
function CreateUserDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>创建用户</Button>
      
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="创建新用户"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              取消
            </Button>
            <Button loading={loading} onClick={handleSubmit}>
              创建
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="用户名"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            fullWidth
          />
          <Input
            label="邮箱"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            fullWidth
          />
        </div>
      </Modal>
    </>
  );
}
```

### 2. 无障碍访问

所有组件都遵循无障碍访问最佳实践：

- Button 组件正确设置 `disabled` 属性
- Input 组件关联 `label` 和输入框
- Modal 组件支持键盘导航（ESC关闭）
- Card 组件在 `clickable` 时设置正确的 `role` 和 `tabIndex`

### 3. 样式定制

组件支持通过 `className` 属性添加自定义样式：

```tsx
<Button className="bg-gradient-to-r from-purple-500 to-pink-500">
  渐变按钮
</Button>

<Card className="border-2 border-blue-500">
  自定义边框卡片
</Card>
```
