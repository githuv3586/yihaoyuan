<#
.SYNOPSIS
  OpenClaw 安装预飞自检（Windows / PowerShell）

.DESCRIPTION
  自动检查 Node.js / npm / pnpm 镜像 / 智谱 API Key 与端点 / 网络 / 目录权限。

.EXAMPLE
  pwsh scripts/preflight-check.ps1
  $env:ZAI_API_KEY = "xxxx.yyyy"; pwsh scripts/preflight-check.ps1

.NOTES
  退出码：0 全 ✔ / 1 有 ✖ / 2 仅有 ⚠
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'

$script:Pass = 0
$script:Warn = 0
$script:Fail = 0

function Write-OK    { param($m) Write-Host "  " -NoNewline; Write-Host "✔" -ForegroundColor Green -NoNewline; Write-Host " $m"; $script:Pass++ }
function Write-Warn2 { param($m) Write-Host "  " -NoNewline; Write-Host "⚠" -ForegroundColor Yellow -NoNewline; Write-Host " $m"; $script:Warn++ }
function Write-Fail  { param($m) Write-Host "  " -NoNewline; Write-Host "✖" -ForegroundColor Red    -NoNewline; Write-Host " $m"; $script:Fail++ }
function Write-Info  { param($m) Write-Host "  " -NoNewline; Write-Host "ℹ" -ForegroundColor Cyan   -NoNewline; Write-Host " $m" }
function Write-Section { param($m) Write-Host ""; Write-Host "== $m ==" -ForegroundColor Blue }

function VerGE {
    param([string]$a, [string]$b)
    try { return [version]$a -ge [version]$b } catch { return $false }
}

# 加载 ~/.openclaw/.env
$envFile = Join-Path $HOME ".openclaw\.env"
if (-not $env:ZAI_API_KEY -and (Test-Path $envFile)) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$') {
            [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
        }
    }
}

Write-Host "OpenClaw 预飞自检 — $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Blue

# 1. OS
Write-Section "1. 操作系统"
$os = [Environment]::OSVersion
if ($os.Version.Major -ge 10) {
    Write-OK "Windows $($os.Version)"
} else {
    Write-Warn2 "Windows $($os.Version)（建议 Win10+）"
}

# 2. 硬件
Write-Section "2. 硬件"
try {
    $cs = Get-CimInstance Win32_ComputerSystem -ErrorAction Stop
    $memGB = [math]::Round($cs.TotalPhysicalMemory / 1GB, 0)
    if     ($memGB -ge 16) { Write-OK   "内存 ${memGB} GB" }
    elseif ($memGB -ge 8)  { Write-Warn2 "内存 ${memGB} GB（推荐 16 GB）" }
    elseif ($memGB -ge 4)  { Write-Warn2 "内存 ${memGB} GB（最低标准）" }
    else                   { Write-Fail  "内存 ${memGB} GB（< 4 GB）" }
} catch {
    Write-Warn2 "无法读取内存信息：$_"
}

try {
    $home_drive = (Get-Item $HOME).PSDrive
    $freeGB = [math]::Round($home_drive.Free / 1GB, 0)
    if     ($freeGB -ge 20) { Write-OK   "家目录可用磁盘 ${freeGB} GB" }
    elseif ($freeGB -ge 10) { Write-Warn2 "家目录可用磁盘 ${freeGB} GB（推荐 ≥ 20 GB）" }
    else                    { Write-Fail  "家目录可用磁盘 ${freeGB} GB（< 10 GB）" }
} catch {
    Write-Warn2 "无法读取磁盘信息"
}

# 3. Node.js
Write-Section "3. Node.js（必须 ≥ 22）"
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    $nv = (& node -v).TrimStart('v')
    if (VerGE $nv "22.0.0") { Write-OK "node v$nv" }
    else                    { Write-Fail "node v$nv（需要 ≥ 22，nvm install 22）" }
} else {
    Write-Fail "未找到 node（winget install CoreyButler.NVMforWindows）"
}

# 4. 包管理器
Write-Section "4. 包管理器"
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    Write-OK "pnpm $(& pnpm -v)"
    $pnpmReg = (& pnpm config get registry) 2>$null
    if ($pnpmReg -like '*npmmirror*') { Write-OK   "pnpm registry → $pnpmReg" }
    else                              { Write-Warn2 "pnpm registry 不是 npmmirror（当前：$pnpmReg）" }
} else {
    Write-Warn2 "未装 pnpm（推荐：npm i -g pnpm）"
}

if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-OK "npm $(& npm -v)"
    $npmReg = (& npm config get registry) 2>$null
    if ($npmReg -like '*npmmirror*') { Write-OK   "npm registry → $npmReg" }
    else                             { Write-Warn2 "npm registry 不是 npmmirror（当前：$npmReg）" }

    foreach ($k in @('disturl','sharp_binary_host','sharp_libvips_binary_host')) {
        $v = (& npm config get $k) 2>$null
        if ($v -like '*npmmirror*')                       { Write-OK   "npm $k → $v" }
        elseif (-not $v -or $v -in @('undefined','null')) { Write-Warn2 "npm $k 未设置" }
        else                                              { Write-Warn2 "npm $k = $v（不是 npmmirror）" }
    }
} else {
    Write-Fail "未找到 npm"
}

# 5. 网络
Write-Section "5. 网络（关键域名直连）"
function Test-Url {
    param($Name, $Url)
    try {
        $r = Invoke-WebRequest -Uri $Url -Method Head -TimeoutSec 8 -UseBasicParsing -ErrorAction Stop
        Write-OK "$Name HTTP $($r.StatusCode)"
    } catch {
        if ($_.Exception.Response) {
            Write-Warn2 "$Name HTTP $($_.Exception.Response.StatusCode.value__)（可达但非 2xx）"
        } else {
            Write-Fail "$Name 无法连接（$Url）"
        }
    }
}
Test-Url "OpenClaw 官网" "https://openclaw.ai"
Test-Url "智谱开放平台" "https://open.bigmodel.cn"
Test-Url "npmmirror"    "https://registry.npmmirror.com"
Test-Url "ClawHub"      "https://clawhub.ai"

# 6. 智谱 API Key
Write-Section "6. 智谱 GLM API Key"
if (-not $env:ZAI_API_KEY) {
    Write-Fail "环境变量 ZAI_API_KEY 未设置（也未在 ~/.openclaw/.env 找到）"
} else {
    if ($env:ZAI_API_KEY -match '\.') { Write-OK "ZAI_API_KEY 已设置（长度 $($env:ZAI_API_KEY.Length)）" }
    else                              { Write-Warn2 "ZAI_API_KEY 格式可疑（通常含 '.'）" }

    $baseUrl = if ($env:ZAI_BASE_URL) { $env:ZAI_BASE_URL } else { "https://open.bigmodel.cn/api/coding/paas/v4" }
    if ($baseUrl -like '*coding/paas/v4*') { Write-OK   "ZAI_BASE_URL = $baseUrl" }
    else                                   { Write-Fail "ZAI_BASE_URL = $baseUrl（必须是 .../coding/paas/v4）" }

    Write-Info "调用 GLM API 实测（max_tokens=4）..."
    try {
        $body = @{
            model    = "glm-5-turbo"
            messages = @(@{ role = "user"; content = "ping" })
            max_tokens = 4
        } | ConvertTo-Json -Depth 5

        $resp = Invoke-WebRequest -Uri "$baseUrl/chat/completions" `
            -Method POST -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop `
            -Headers @{
                "Authorization" = "Bearer $($env:ZAI_API_KEY)"
                "Content-Type"  = "application/json"
            } -Body $body
        Write-OK "GLM API $($resp.StatusCode) OK"
    } catch {
        $code = $null
        if ($_.Exception.Response) { $code = $_.Exception.Response.StatusCode.value__ }
        switch ($code) {
            401 { Write-Fail  "GLM API 401 — Key 错或漏字符" }
            403 { Write-Fail  "GLM API 403 — 未订阅 Coding Plan 或已过期" }
            404 { Write-Fail  "GLM API 404 — 端点错（检查 ZAI_BASE_URL）" }
            429 { Write-Warn2 "GLM API 429 — 限流（Key 通了，等 1 分钟）" }
            default { Write-Fail "GLM API 失败：$($_.Exception.Message)" }
        }
    }
}

# 7. 目录
Write-Section "7. ~/.openclaw 目录"
$ocDir = Join-Path $HOME ".openclaw"
if (Test-Path $ocDir) {
    Write-OK "~/.openclaw 已存在"
    if (Test-Path (Join-Path $ocDir "openclaw.json")) {
        Write-Info "检测到旧安装 → 强烈建议先 Copy-Item -Recurse $ocDir `"$ocDir.bak.$(Get-Date -Format yyyy-MM-dd)`""
    }
} else {
    Write-Info "~/.openclaw 不存在（首次安装会自动创建）"
}

# 8. 可选依赖
Write-Section "8. 可选依赖"
foreach ($cmd in @('git','python','python3','docker','sqlite3')) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        Write-OK "$cmd → $((Get-Command $cmd).Source)"
    } else {
        Write-Info "$cmd 未装（按需）"
    }
}

# 汇总
Write-Host ""
Write-Host "============ 汇总 ============" -ForegroundColor Blue
Write-Host "  ✔ 通过 : $script:Pass" -ForegroundColor Green
Write-Host "  ⚠ 警告 : $script:Warn" -ForegroundColor Yellow
Write-Host "  ✖ 失败 : $script:Fail" -ForegroundColor Red
Write-Host ""

if ($script:Fail -gt 0) {
    Write-Host "有失败项 → 修复后再装。" -ForegroundColor Red
    exit 1
} elseif ($script:Warn -gt 0) {
    Write-Host "有警告项 → 可装，但建议先修复。" -ForegroundColor Yellow
    exit 2
} else {
    Write-Host "全部通过 → 可以执行：iwr -useb https://openclaw.ai/install.ps1 | iex" -ForegroundColor Green
    exit 0
}
