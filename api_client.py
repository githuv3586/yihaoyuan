"""
API 客户端示例 - 演示如何正确处理 model 参数

错误信息: {"error":{"type":"client","reason":"invalid_input","message":"model is required","retryable":false}}

这个错误发生在调用 AI 模型 API 时缺少了必需的 'model' 参数。
本文件演示了正确的使用方式。
"""

import os
from typing import Optional, Dict, Any


class APIClient:
    """API 客户端，确保 model 参数始终被正确设置"""
    
    # 默认模型配置
    DEFAULT_MODEL = "gpt-4"
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        """
        初始化 API 客户端
        
        Args:
            api_key: API 密钥，如果未提供则从环境变量获取
            model: 要使用的模型名称，如果未提供则使用默认值
        """
        self.api_key = api_key or os.getenv("API_KEY")
        self.model = model or os.getenv("MODEL_NAME") or self.DEFAULT_MODEL
        
        if not self.api_key:
            raise ValueError("API key is required. Set API_KEY environment variable or pass api_key parameter.")
    
    def _validate_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        验证并补充请求数据，确保 model 参数存在
        
        Args:
            request_data: 原始请求数据
            
        Returns:
            验证后的请求数据
            
        Raises:
            ValueError: 如果缺少必需参数且无法提供默认值
        """
        # 确保 model 参数存在
        if "model" not in request_data or not request_data["model"]:
            request_data["model"] = self.model
            
        # 最终验证
        if not request_data.get("model"):
            raise ValueError(
                "model is required. Please provide a model name in the request or set it during client initialization."
            )
        
        return request_data
    
    def create_completion(
        self,
        prompt: str,
        model: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.7,
        **kwargs
    ) -> Dict[str, Any]:
        """
        创建文本补全请求
        
        Args:
            prompt: 输入提示
            model: 模型名称（可选，如果未提供则使用客户端默认值）
            max_tokens: 最大生成令牌数
            temperature: 采样温度
            **kwargs: 其他参数
            
        Returns:
            API 响应数据
        """
        request_data = {
            "model": model,  # 可能为 None，将在 _validate_request 中处理
            "prompt": prompt,
            "max_tokens": max_tokens,
            "temperature": temperature,
            **kwargs
        }
        
        # 验证并补充请求数据
        validated_data = self._validate_request(request_data)
        
        # 这里应该是实际的 API 调用
        # response = requests.post(API_ENDPOINT, json=validated_data, headers=self.headers)
        
        print(f"Request validated successfully. Using model: {validated_data['model']}")
        return validated_data
    
    def chat(
        self,
        messages: list,
        model: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.7,
        **kwargs
    ) -> Dict[str, Any]:
        """
        创建聊天补全请求
        
        Args:
            messages: 消息列表
            model: 模型名称（可选，如果未提供则使用客户端默认值）
            max_tokens: 最大生成令牌数
            temperature: 采样温度
            **kwargs: 其他参数
            
        Returns:
            API 响应数据
        """
        request_data = {
            "model": model,  # 可能为 None，将在 _validate_request 中处理
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            **kwargs
        }
        
        # 验证并补充请求数据
        validated_data = self._validate_request(request_data)
        
        # 这里应该是实际的 API 调用
        print(f"Request validated successfully. Using model: {validated_data['model']}")
        return validated_data


def main():
    """演示正确的使用方式"""
    
    print("=" * 60)
    print("修复 'model is required' 错误的示例")
    print("=" * 60)
    
    # 方式 1：在初始化时设置默认模型
    print("\n方式 1：在客户端初始化时设置默认模型")
    try:
        client = APIClient(api_key="your-api-key", model="gpt-4")
        result = client.chat(messages=[{"role": "user", "content": "Hello"}])
        print(f"  成功！使用模型: {result['model']}")
    except ValueError as e:
        print(f"  错误: {e}")
    
    # 方式 2：在每个请求中明确指定模型
    print("\n方式 2：在每个请求中明确指定模型")
    try:
        client = APIClient(api_key="your-api-key")
        result = client.chat(
            messages=[{"role": "user", "content": "Hello"}],
            model="gpt-3.5-turbo"  # 在请求中明确指定
        )
        print(f"  成功！使用模型: {result['model']}")
    except ValueError as e:
        print(f"  错误: {e}")
    
    # 方式 3：使用环境变量设置默认模型
    print("\n方式 3：通过环境变量设置默认模型")
    print("  设置 MODEL_NAME 环境变量后，客户端将自动使用该模型")
    print("  例如: export MODEL_NAME=gpt-4")
    
    print("\n" + "=" * 60)
    print("问题解决！确保在 API 请求中始终包含 'model' 参数")
    print("=" * 60)


if __name__ == "__main__":
    main()
