/**
 * @fileoverview 基本使用示例
 * @description 展示工具库各功能的基本使用方法
 */

import React, { useState, useEffect } from 'react';

// 导入工具函数
import {
  formatDate,
  toCamelCase,
  toKebabCase,
  unique,
  chunk,
  groupBy,
  isValidEmail,
  validatePassword,
  timeAgo
} from '../src/utils';

// 导入组件
import { Button, Input, Modal, Card } from '../src/components';

// 导入 Hooks
import { useDebounce, useLocalStorage, useFetch, useToggle } from '../src/hooks';

// 导入 HTTP 客户端
import { createHttpClient } from '../src/api';

// 导入类型
import type { User, ApiResponse } from '../src/types';

/**
 * 工具函数使用示例
 */
function UtilsExample() {
  // 字符串转换
  const camelCase = toCamelCase('hello-world');
  const kebabCase = toKebabCase('helloWorld');
  
  // 日期格式化
  const formattedDate = formatDate(new Date(), 'YYYY年MM月DD日 HH:mm:ss');
  const relativeTime = timeAgo(new Date(Date.now() - 3600000)); // 1小时前
  
  // 数组操作
  const uniqueNumbers = unique([1, 2, 2, 3, 3, 3]);
  const chunkedArray = chunk([1, 2, 3, 4, 5, 6, 7], 3);
  
  // 验证
  const emailValid = isValidEmail('user@example.com');
  const passwordResult = validatePassword('MyPassword123');

  return (
    <div>
      <h2>工具函数示例</h2>
      
      <h3>字符串转换</h3>
      <p>toCamelCase('hello-world') = {camelCase}</p>
      <p>toKebabCase('helloWorld') = {kebabCase}</p>
      
      <h3>日期处理</h3>
      <p>格式化日期: {formattedDate}</p>
      <p>相对时间: {relativeTime}</p>
      
      <h3>数组操作</h3>
      <p>去重: [{uniqueNumbers.join(', ')}]</p>
      <p>分块: {JSON.stringify(chunkedArray)}</p>
      
      <h3>验证</h3>
      <p>邮箱验证: {emailValid ? '✓ 有效' : '✗ 无效'}</p>
      <p>密码验证: {passwordResult.isValid ? '✓ 有效' : '✗ 无效'}</p>
    </div>
  );
}

/**
 * 组件使用示例
 */
function ComponentsExample() {
  const [modalOpen, { setTrue: openModal, setFalse: closeModal }] = useToggle(false);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');

  const validateInput = (value: string) => {
    if (!value) {
      setInputError('请输入内容');
    } else if (value.length < 3) {
      setInputError('内容至少3个字符');
    } else {
      setInputError('');
    }
  };

  return (
    <div>
      <h2>组件示例</h2>
      
      <h3>Button 组件</h3>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Button variant="primary">主要按钮</Button>
        <Button variant="secondary">次要按钮</Button>
        <Button variant="outline">边框按钮</Button>
        <Button variant="ghost">幽灵按钮</Button>
        <Button variant="danger">危险按钮</Button>
        <Button loading>加载中</Button>
        <Button disabled>禁用</Button>
      </div>
      
      <h3>Input 组件</h3>
      <Input
        label="用户名"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          validateInput(e.target.value);
        }}
        error={inputError}
        placeholder="请输入用户名"
        clearable
        onClear={() => {
          setInputValue('');
          setInputError('');
        }}
      />
      
      <h3>Modal 组件</h3>
      <Button onClick={openModal}>打开模态框</Button>
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="示例模态框"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>取消</Button>
            <Button onClick={closeModal}>确定</Button>
          </>
        }
      >
        <p>这是模态框的内容</p>
      </Modal>
      
      <h3>Card 组件</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        <Card title="卡片标题" subtitle="副标题">
          <p>这是卡片的内容</p>
        </Card>
        <Card 
          title="可点击卡片" 
          clickable 
          onClick={() => alert('卡片被点击')}
        >
          <p>点击我试试</p>
        </Card>
        <Card 
          title="带底部的卡片"
          footer={<Button size="small" fullWidth>操作按钮</Button>}
        >
          <p>这是卡片内容</p>
        </Card>
      </div>
    </div>
  );
}

/**
 * Hooks 使用示例
 */
function HooksExample() {
  // useDebounce
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // useLocalStorage
  const [theme, setTheme, removeTheme] = useLocalStorage('example-theme', 'light');
  
  // useToggle
  const [isEnabled, { toggle }] = useToggle(false);
  
  // useFetch (使用模拟数据)
  const { data, loading, error, refetch } = useFetch<{ message: string }>(
    'https://jsonplaceholder.typicode.com/posts/1',
    { immediate: false }
  );

  return (
    <div>
      <h2>Hooks 示例</h2>
      
      <h3>useDebounce</h3>
      <Input
        label="搜索（500ms 防抖）"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="输入搜索内容..."
      />
      <p>实时值: {searchTerm}</p>
      <p>防抖值: {debouncedSearchTerm}</p>
      
      <h3>useLocalStorage</h3>
      <p>当前主题: {theme}</p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button onClick={() => setTheme('light')}>浅色</Button>
        <Button onClick={() => setTheme('dark')}>深色</Button>
        <Button variant="ghost" onClick={removeTheme}>重置</Button>
      </div>
      
      <h3>useToggle</h3>
      <p>状态: {isEnabled ? '开启' : '关闭'}</p>
      <Button onClick={toggle}>切换</Button>
      
      <h3>useFetch</h3>
      <Button onClick={refetch} loading={loading}>
        获取数据
      </Button>
      {error && <p style={{ color: 'red' }}>错误: {error.message}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}

/**
 * HTTP 客户端使用示例
 */
function HttpClientExample() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const http = createHttpClient({
    baseUrl: 'https://jsonplaceholder.typicode.com',
    timeout: 10000,
    debug: true,
    retryCount: 2
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await http.get<any[]>('/users', { _limit: 5 });
      if (response.success) {
        setResult(JSON.stringify(response.data, null, 2));
      } else {
        setResult(`错误: ${response.message}`);
      }
    } catch (error) {
      setResult(`异常: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>HTTP 客户端示例</h2>
      <Button onClick={fetchUsers} loading={loading}>
        获取用户列表
      </Button>
      {result && (
        <pre style={{ 
          background: '#f5f5f5', 
          padding: '16px', 
          borderRadius: '8px',
          overflow: 'auto',
          maxHeight: '300px'
        }}>
          {result}
        </pre>
      )}
    </div>
  );
}

/**
 * 主应用组件
 */
export default function App() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <h1>工具库使用示例</h1>
      
      <section style={{ marginBottom: '48px' }}>
        <UtilsExample />
      </section>
      
      <section style={{ marginBottom: '48px' }}>
        <ComponentsExample />
      </section>
      
      <section style={{ marginBottom: '48px' }}>
        <HooksExample />
      </section>
      
      <section style={{ marginBottom: '48px' }}>
        <HttpClientExample />
      </section>
    </div>
  );
}
