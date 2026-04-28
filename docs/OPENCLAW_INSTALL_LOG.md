# OpenClaw 实测安装日志

> 本日志记录在 Linux VM（Node 22.22.2 / Ubuntu / kernel 6.1）上完整跑过一次官方 `install.sh` 的过程，沉淀几个关键事实，方便后人少走弯路。

## 环境

| 项 | 值 |
| --- | --- |
| OS | Linux 6.1.147 |
| 内存 | 15 GB |
| Node | v22.22.2（nvm 管理） |
| npm | 10.9.7 |
| pnpm | 10.33.0 |
| Disk free | 116 GB |

## 装机命令

```bash
bash <(curl -fsSL https://openclaw.ai/install.sh) --no-onboard --no-prompt
```

## 实际花费

- 时长：~19 秒
- 磁盘占用：`/home/<user>/.nvm/versions/node/v22.22.2/lib/node_modules/openclaw` ≈ **337 MB**
- 状态目录初始：`~/.openclaw/{flows, identity, plugin-runtime-deps, plugins}`（首次自动创建，700 权限）
- 全局命令：`openclaw`（解析到 nvm 下 node_modules 的 `openclaw.mjs`）

## 安装器关键参数

| 参数 | 等价环境变量 | 作用 |
| --- | --- | --- |
| `--no-prompt` | `OPENCLAW_NO_PROMPT=1` | 全程无询问（云 / CI 必需） |
| `--no-onboard` | `OPENCLAW_NO_ONBOARD=1` | 跳过装后向导，事后再 `openclaw configure` |
| `--method git` | `OPENCLAW_INSTALL_METHOD=git` | 从 git 装而不是 npm（默认 npm） |
| `--profile <name>` | `OPENCLAW_PROFILE=<name>` | 隔离的状态目录 `~/.openclaw-<name>` |
| `--gateway-port <port>` | `OPENCLAW_GATEWAY_PORT=...` | 提前定 gateway 端口 |
| `--dry-run` | `OPENCLAW_DRY_RUN=1` | 只打印不动手 |

## 装完立刻能跑的命令

```bash
openclaw --version
# OpenClaw 2026.4.26 (be8c246)

openclaw doctor --non-interactive
# Skills: Eligible 11 / Missing requirements 41 / Blocked 0
# Plugins: Loaded 47 / Errors 0
# Gateway: not running（正常，chat / gateway start 会拉起）

openclaw config schema | wc -c
# 1946290（≈ 1.9 MB JSON Schema，覆盖 38 个顶级配置段）

openclaw config file
# ~/.openclaw/openclaw.json
```

## 配置 GLM Coding Plan CN 实测

```bash
# 用 batch JSON 一次性写入 7 条路径
openclaw config set --batch-json '[
  {"path":"gateway.port","value":18789},
  {"path":"models.providers.zai.baseUrl","value":"https://open.bigmodel.cn/api/coding/paas/v4"},
  {"path":"models.providers.zai.api","value":"openai-completions"},
  {"path":"models.providers.zai.authHeader","value":true},
  {"path":"models.providers.zai.models","value":[
    {"id":"glm-5-turbo","name":"GLM-5 Turbo"},
    {"id":"glm-4.5-air","name":"GLM-4.5 Air"}
  ]},
  {"path":"auth.profiles.zai-coding-cn","value":{
    "provider":"zai","mode":"api_key","displayName":"GLM Coding Plan CN"
  }},
  {"path":"auth.order.zai","value":["zai-coding-cn"]}
]'

# Key 走 SecretRef → 不写入文件
openclaw config set models.providers.zai.apiKey \
    --ref-source env --ref-provider default --ref-id ZAI_API_KEY

openclaw config validate
# Config valid: /home/<user>/.openclaw/openclaw.json
```

## 重要发现

1. **`models.providers.zai.models` 是必填 `array`**，不能省。最少要塞一个 `{id,name}` 才能 validate 通过。
2. **`baseUrl` 和 `api` 都必填**：`api` 用 OpenAI 兼容协议时填 `"openai-completions"`，OpenClaw 会自动套 `Authorization: Bearer ...` 头。
3. **`apiKey` 字段支持 SecretRef**：写法是 `{source:"env", provider:"default", id:"ZAI_API_KEY"}`。Plugin 元数据 (`dist/extensions/zai/openclaw.plugin.json`) 里登记了 `providerAuthEnvVars: ["ZAI_API_KEY", "Z_AI_API_KEY"]`，所以两个名字 OpenClaw 都认。
4. **4 个 Z.AI 端点**（来自插件 plugin.json）：
   - `coding-cn`     → `https://open.bigmodel.cn/api/coding/paas/v4`
   - `coding-global` → `https://api.z.ai/api/paas/v4`
   - `cn`            → `https://open.bigmodel.cn/api/paas/v4`
   - `global`        → `https://api.z.ai/api/paas/v4`
5. **支持的 GLM 模型 ID**（实测自 `dist/model-definitions-*.js`）：`glm-5.1 / glm-5 / glm-5-turbo / glm-5v-turbo / glm-4.7 / glm-4.7-flash / glm-4.7-flashx / glm-4.6 / glm-4.6v / glm-4.5 / glm-4.5-air / glm-4.5-flash / glm-4.5v`，共 13 款。`ZAI_DEFAULT_MODEL_ID = "glm-5.1"`。
6. **`openclaw config`（不带子命令）会强制进交互式向导**，CI / 云环境只能用 `openclaw config set/get/unset/validate/file/schema` 子命令。
7. **首次安装 doctor 会报 `Session store dir missing` + `Gateway not running`**，这是预期行为：第一次 `openclaw chat` 或 `openclaw gateway start` 时它自动建表/起服务。
8. **systemd 不可用时**（容器 / WSL 没 systemd）doctor 会建议用进程管理器跑 gateway 前台：`openclaw gateway run`。

## 接下来做什么

- 配大模型：见 `docs/MODEL_CONFIGURATION_CN.md`
- 配微信通道：`openclaw configure --section channels`
- 启服务：`openclaw chat`（自动拉 gateway） 或 `openclaw gateway start`
