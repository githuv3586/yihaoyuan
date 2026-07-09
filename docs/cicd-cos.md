# CNB → opc.hejinhong.site CI/CD

推送 `main` 后，CNB 流水线自动：

1. 安装 COS / CDN SDK  
2. 校验静态资源与 JSON  
3. 上传 `index.html`、`css/`、`js/`、`data/`、`images/` 到腾讯云 COS  
4. 刷新 CDN 路径缓存（域名 `opc.hejinhong.site`）

## 一次性配置（必须）

### 1. 创建密钥仓库

在 CNB 创建**密钥仓库**（建议名：`zhanxiaoyu/opc-so-secrets`），通过 Web 界面新建文件 `cos-deploy.yml`，内容参考本仓：

`secrets/cos-deploy.example.yml`

填入真实的：

- `TENCENTCLOUD_SECRET_ID`
- `TENCENTCLOUD_SECRET_KEY`

并确认 `allow_slugs` 包含 `zhanxiaoyu/opc-so`。

### 2. 对齐 `.cnb.yml` 中的 imports 地址

打开业务仓 `.cnb.yml`，确认：

```yaml
CNB_SECRETS_IMPORT: https://cnb.cool/zhanxiaoyu/opc-so-secrets/-/blob/main/cos-deploy.yml
```

若密钥仓路径不同，改成你的真实 URL。

### 3. 开启自动构建

仓库设置 → 云原生构建 → **允许自动触发**。

### 4. 腾讯云权限

密钥对应账号需至少具备：

- COS：对桶 `opc-site-1256908292` 的对象读写  
- CDN：`PurgePathCache`（刷新 `opc.hejinhong.site`）

## 触发方式

| 事件 | 行为 |
|------|------|
| `main` 分支 `push` | 校验 + 部署 COS/CDN |
| `web_trigger`（手动） | 仅校验，不部署 |

## 本地演练

```bash
# 仅看将上传哪些文件
DRY_RUN=1 python3 scripts/deploy_cos.py

# 真实部署（需本机导出腾讯云密钥）
export TENCENTCLOUD_SECRET_ID=xxx
export TENCENTCLOUD_SECRET_KEY=xxx
python3 scripts/deploy_cos.py
```

## 故障排查

| 现象 | 处理 |
|------|------|
| 流水线报缺少 `TENCENTCLOUD_SECRET_*` | 检查密钥仓文件与 `imports` URL、`allow_*` |
| COS 上传 403 | 检查密钥权限 / 桶名 / 地域 |
| 站点仍是旧页面 | CDN 刷新有延迟，或浏览器强刷；看流水线是否提交了 Purge |
| `imports` 被拒绝 | 密钥文件 `allow_slugs/events/branches` 是否覆盖本次触发 |

## 安全注意

- 密钥只放密钥仓库，禁止提交到 `opc-so`  
- 流水线日志不要 `echo` Secret  
- 历史若泄露过密钥，先在腾讯云控制台轮换
