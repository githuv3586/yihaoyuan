# OpenClaw 大模型配置手册（智谱 GLM / Z.AI）

> 适用版本：OpenClaw `2026.4.x`，CLI 命令 `openclaw config / configure / infer`。
>
> 本手册基于 VM 实测沉淀（`bash scripts/install-openclaw.sh` 装机 + `openclaw config validate` 通过），所有命令都能直接复制运行。

---

## 0. 一页纸

```
□ 1. 装好 OpenClaw（见仓库 README）
□ 2. ~/.openclaw/.env 里填 ZAI_API_KEY
□ 3. 选端点：coding-cn(国内) / coding-global / cn / global
□ 4. 跑：bash scripts/configure-zai-coding-cn.sh --endpoint coding-cn
□ 5. openclaw config validate     ← 必须 "Config valid"
□ 6. openclaw doctor --non-interactive
□ 7. openclaw chat                ← 实测一句
```

---

## 1. 端点矩阵（来自 `dist/extensions/zai/openclaw.plugin.json` + 实测）

| ENDPOINT | baseUrl | Auth profile choiceId | 适用 |
| --- | --- | --- | --- |
| `coding-cn`     | `https://open.bigmodel.cn/api/coding/paas/v4` | `zai-coding-cn`     | **GLM Coding Plan 中国大陆**（推荐 OpenClaw 用） |
| `coding-global` | `https://api.z.ai/api/paas/v4`                | `zai-coding-global` | GLM Coding Plan 海外 |
| `cn`            | `https://open.bigmodel.cn/api/paas/v4`        | `zai-cn`            | Z.AI 通用计费（非 Coding Plan） |
| `global`        | `https://api.z.ai/api/paas/v4`                | `zai-global`        | Z.AI 海外通用计费 |

⚠️ Coding Plan 必须走 `coding/paas/v4` 端点，写错会按通用价格计费。

支持的 GLM 模型 ID（实测自 `dist/model-definitions-*.js`）：

```
glm-5.1   glm-5   glm-5-turbo   glm-5v-turbo
glm-4.7   glm-4.7-flash  glm-4.7-flashx
glm-4.6   glm-4.6v
glm-4.5   glm-4.5-air   glm-4.5-flash   glm-4.5v
```

> Coding Plan 计费规则：用 `glm-4.5-flash` / `glm-4.7-flash` / `glm-4.7-flashx` 会被单独扣费。常驻主模型用 `glm-5-turbo` / `glm-5.1` / `glm-4.7` / `glm-4.5-air`。

---

## 2. 三种配置方式（按推荐程度）

### 2.1 推荐：脚本一键配（非交互、安全模式）

```bash
# 默认：coding-cn 端点 + glm-5-turbo + Key 用 SecretRef 引环境变量
bash scripts/configure-zai-coding-cn.sh

# 切换端点 / 主模型
bash scripts/configure-zai-coding-cn.sh --endpoint coding-global --default-model glm-5.1

# 多 profile（开发态）
bash scripts/configure-zai-coding-cn.sh --profile dev --gateway-port 19001
```

脚本做的事（每一步都是 `openclaw config set` 真实命令，可手工拆开重做）：

```bash
openclaw config set --batch-json '[
  { "path": "gateway.port", "value": 18789 },
  { "path": "models.providers.zai.baseUrl", "value": "https://open.bigmodel.cn/api/coding/paas/v4" },
  { "path": "models.providers.zai.api", "value": "openai-completions" },
  { "path": "models.providers.zai.authHeader", "value": true },
  { "path": "models.providers.zai.models", "value": [
      { "id": "glm-5-turbo", "name": "GLM-5 Turbo" },
      { "id": "glm-5.1",     "name": "GLM-5.1" },
      { "id": "glm-4.7",     "name": "GLM-4.7" },
      { "id": "glm-4.5-air", "name": "GLM-4.5 Air" }
  ]},
  { "path": "auth.profiles.zai-coding-cn", "value": {
      "provider": "zai", "mode": "api_key",
      "displayName": "GLM Coding Plan CN"
  }},
  { "path": "auth.order.zai", "value": ["zai-coding-cn"] }
]'

# Key 用 SecretRef 引用环境变量（不入磁盘文件）
openclaw config set models.providers.zai.apiKey \
    --ref-source env --ref-provider default --ref-id ZAI_API_KEY

openclaw config validate
```

### 2.2 模板拷贝法（你想看清整张配置）

```bash
mkdir -p ~/.openclaw
cp templates/openclaw.json.template ~/.openclaw/openclaw.json
chmod 700 ~/.openclaw
chmod 600 ~/.openclaw/openclaw.json

# Key 走环境变量（推荐）
echo 'ZAI_API_KEY=xxxxxx.xxxxxx' >> ~/.openclaw/.env
chmod 600 ~/.openclaw/.env

openclaw config validate     # 必须 "Config valid"
```

模板长这样（实测可验证通过）：

```1:42:templates/openclaw.json.template
{
  "gateway": {
    "port": 18789
  },
  "models": {
    "providers": {
      "zai": {
        "baseUrl": "https://open.bigmodel.cn/api/coding/paas/v4",
        "api": "openai-completions",
        "authHeader": true,
        "apiKey": {
          "source": "env",
          "provider": "default",
          "id": "ZAI_API_KEY"
        },
        "models": [
          { "id": "glm-5-turbo",  "name": "GLM-5 Turbo" },
          { "id": "glm-5.1",      "name": "GLM-5.1" },
          { "id": "glm-4.7",      "name": "GLM-4.7" },
          { "id": "glm-4.5-air",  "name": "GLM-4.5 Air" },
          { "id": "glm-5v-turbo", "name": "GLM-5V Turbo (vision)" },
          { "id": "glm-4.6v",     "name": "GLM-4.6V (vision)" }
        ]
      }
    }
  },
  "auth": {
    "profiles": {
      "zai-coding-cn": {
        "provider": "zai",
        "mode": "api_key",
        "displayName": "GLM Coding Plan CN"
      }
    },
    "order": {
      "zai": ["zai-coding-cn"]
    }
  }
}
```

### 2.3 官方交互式向导（适合首次摸索）

```bash
openclaw configure --section model
```

在 Auth choice 选 `Coding-Plan-CN`，粘贴 Key，向导会写出和上面一致的配置。

---

## 3. API Key 的三种保管方式（按安全性排序）

| 方式 | 操作 | 安全级别 | 备份是否包含 Key |
| --- | --- | --- | --- |
| **A. SecretRef → 环境变量（推荐）** | `--ref-source env --ref-id ZAI_API_KEY` | ⭐⭐⭐ | 不包含 |
| **B. SecretRef → 文件** | `--provider-source file --provider-path /etc/openclaw/keys.json` | ⭐⭐⭐ | 不包含（路径外） |
| **C. 内联到 openclaw.json** | `openclaw config set models.providers.zai.apiKey "$ZAI_API_KEY"` | ⭐ | 包含 ❌ |

**默认强烈建议 A**。脚本默认走 A；要走 C 加 `--inline-key`。

A 模式下 `openclaw.json` 里长这样：

```json
"apiKey": {
  "source": "env",
  "provider": "default",
  "id": "ZAI_API_KEY"
}
```

启动 OpenClaw 时它从 `process.env.ZAI_API_KEY` 解出真值。所以 **`~/.openclaw/.env` 必须在 shell 启动时被加载**：

```bash
# 加到 ~/.bashrc 或 ~/.zshrc
set -a; . ~/.openclaw/.env; set +a
```

或者用 systemd / launchd / pm2 启动 OpenClaw 时，把 `EnvironmentFile=~/.openclaw/.env` 显式挂上。

---

## 4. 多模型与 fallback

OpenClaw 在 provider 下声明的 `models[]` 是**可选模型清单**；运行期默认模型由 agent / TUI 选取。要做 provider 级 fallback，用 `auth.order` 控制：

```bash
# 把 coding-cn 设为主，cn（通用计费）做兜底
openclaw config set --batch-json '[
  { "path": "auth.profiles.zai-cn", "value": {
      "provider": "zai", "mode": "api_key", "displayName": "Z.AI CN (fallback)"
  }},
  { "path": "auth.order.zai", "value": ["zai-coding-cn", "zai-cn"] }
]'
```

`auth.cooldowns` 控制因为 billing / overload / 429 自动跳到下一个 profile 的策略，schema 里一组开箱默认值已够用，如有特殊需要再调。

---

## 5. 验证清单

每一步都是直接可跑的命令：

```bash
# 1) schema 校验
openclaw config validate
#   → "Config valid: ~/.openclaw/openclaw.json"

# 2) Key 是否被读到
echo "${ZAI_API_KEY:0:6}..."

# 3) 端点是否真的能通（不依赖 OpenClaw，仅用 Node 内置 fetch）
node scripts/smoke-test.mjs

# 4) Doctor 全面体检（首装会有 gateway 未跑等正常告警，关心 ✖）
openclaw doctor --non-interactive

# 5) 进 TUI 实测
openclaw chat
```

---

## 6. 常见错误对应表

| 错误信息 | 根因 | 修复 |
| --- | --- | --- |
| `Config validation failed: models.providers.zai.baseUrl: Invalid input` | 没设 baseUrl | 用脚本或先 `config set ... .baseUrl` |
| `Config validation failed: models.providers.zai.models: expected array` | 没声明 models 数组 | 至少塞一个 `[{id,name}]` |
| 调用模型 401 | Key 错或漏字符；端点是 coding 但 Key 是普通 | 重粘 Key；或换端点为 `cn` |
| 调用模型 403 | 没订阅 GLM Coding Plan / 已过期 | 去 https://zhipuaishengchan.datasink.sensorsdata.cn/t/Nd 订阅 |
| 调用模型 404 | baseUrl 漏了 `coding/` 段 | 改回 `https://open.bigmodel.cn/api/coding/paas/v4` |
| 调用模型 429 | 限流 | 等 1 分钟；或在 `auth.order` 增加 fallback profile |
| `ECONNRESET` | 代理把请求绕到墙外 | clash 加 `DOMAIN-SUFFIX,bigmodel.cn,DIRECT` |
| `Doctor: Gateway not running` | 首装的正常状态 | `openclaw chat` 会自动起 gateway，或 `openclaw gateway start` |

---

## 7. 何时用 `--profile` 隔离

OpenClaw 用 `--profile <name>` 把状态目录改到 `~/.openclaw-<name>`，配置文件改到 `~/.openclaw-<name>/openclaw.json`。

适用场景：

- 同一台机器既有**生产 (default)** 又有**开发 (dev)**，互不污染
- 同时连**个人微信**和**企业微信**，各自一个 profile
- 救援模式（`--profile rescue --gateway-port 19001`）

```bash
# 装机时声明 profile（写到 service 名字 / 状态目录）
bash scripts/install-openclaw.sh --profile dev

# 配 dev profile 的大模型
bash scripts/configure-zai-coding-cn.sh --profile dev --gateway-port 19001

# 之后所有命令都要带 --profile dev
openclaw --profile dev chat
```

---

## 8. 真实参照

- `dist/extensions/zai/openclaw.plugin.json` — 4 个 auth choice 的官方定义
- `dist/model-definitions-*.js` — 12 个 GLM 模型的官方常量
- `templates/openclaw.json.template` — 本仓库 schema-valid 模板（已 `config validate` 通过）
- `scripts/configure-zai-coding-cn.sh` — 4 端点切换 + SecretRef + dry-run
- `docs/OPENCLAW_INSTALL_LOG.md` — VM 实测全过程

---

**一句话总结**：
> 用 `bash scripts/configure-zai-coding-cn.sh` 写配置，用 SecretRef 守护 Key，用 `openclaw config validate` 立刻验真。出错对照 §6，跑通 `openclaw chat` 就算配完。
