# yihaoyuan  2025年12月3日08:03:21

## 问题修复：model is required

### 错误信息

```json
{"error":{"type":"client","reason":"invalid_input","message":"model is required","retryable":false}}
```

### 问题原因

这个错误发生在调用 AI 模型 API（如 OpenAI、Anthropic 等）时，请求体中缺少了必需的 `model` 参数。

### 解决方案

确保在每个 API 请求中都包含 `model` 参数。有以下几种方式：

#### 方式 1：在客户端初始化时设置默认模型

```python
client = APIClient(api_key="your-api-key", model="gpt-4")
result = client.chat(messages=[{"role": "user", "content": "Hello"}])
```

#### 方式 2：在每个请求中明确指定模型

```python
client = APIClient(api_key="your-api-key")
result = client.chat(
    messages=[{"role": "user", "content": "Hello"}],
    model="gpt-3.5-turbo"
)
```

#### 方式 3：通过环境变量设置

```bash
export MODEL_NAME=gpt-4
export API_KEY=your-api-key
```

### 示例代码

查看 `api_client.py` 文件获取完整的示例代码，展示了如何正确处理 `model` 参数以避免此错误。

运行示例：

```bash
python api_client.py
```

### 常见模型名称

| 提供商 | 模型名称示例 |
|--------|-------------|
| OpenAI | `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo` |
| Anthropic | `claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku` |
| Google | `gemini-pro`, `gemini-ultra` |
