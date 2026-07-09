# 密钥文件说明

本目录**只提交示例**，真实密钥请放到 CNB「密钥仓库」。

1. 复制 `cos-deploy.example.yml` 到密钥仓（建议：`zhanxiaoyu/opc-so-secrets`）  
2. 在 Web 界面填入腾讯云 `SecretId` / `SecretKey`  
3. 确认业务仓 `.cnb.yml` 的 `imports` URL 指向该文件  

详见 `docs/cicd-cos.md`。
