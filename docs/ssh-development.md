# 本机前端通过 SSH 连接 Ubuntu 后端

开发路径：浏览器 → 本机 Vite /api/v1 → 本机 SSH 隧道 18000 → Ubuntu 127.0.0.1:8000。
部署路径：浏览器 → 服务器 Nginx /api/v1 → Ubuntu 127.0.0.1:8000。
两种模式使用相同 HTTP 接口；Topic 和关键词依旧为 mock。

2026-10-07 已验证本机 SSH 隧道、Vite 代理和服务器真实查询表的完整连接。
本机 `.env.development.local` 已填入当前 SSH 目标；密码只在 OpenSSH 登录提示中输入。

## 1. 服务器准备

先按 [Ubuntu 部署说明](ubuntu-deployment.md) 安装并启动后端 API，
确认服务器上 `curl --fail http://127.0.0.1:8000/api/v1/health` 能返回数据。
后端继续监听服务器的 127.0.0.1:8000，不需要为 SSH 开发改成 0.0.0.0，
也无需开放 8000 公网端口或额外配置 CORS。
SSH 登录账号需要允许本地 TCP 转发；默认 OpenSSH 配置通常允许。

## 2. 本机配置

本机需要 Node.js 22.12+、npm 和 OpenSSH 客户端；先确认正常 `ssh user@host` 可以登录。
如果服务器要求密钥口令或密码，由本机 OpenSSH 在终端中提示输入，项目不保存密码。
首次连接按正常 SSH 流程核对服务器指纹，不自动跳过主机校验。

在 Developer-Voice 目录首次复制配置（已有 .env.development.local 时直接编辑它）：

Windows PowerShell：

```powershell
Copy-Item .env.development.local.example .env.development.local
```

Ubuntu/macOS 本机：

```bash
cp .env.development.local.example .env.development.local
```

编辑 `.env.development.local`：

```dotenv
SSH_TARGET=你的用户名@你的服务器
SSH_PORT=
SSH_IDENTITY_FILE=
SSH_REMOTE_PORT=8000
DEV_API_TARGET=http://127.0.0.1:18000
```

SSH_TARGET 也可使用已有 `~/.ssh/config` 的 Host 别名。
SSH_PORT、SSH_IDENTITY_FILE 留空时沿用 OpenSSH 默认值或别名配置。
需要指定密钥时填写本机路径，例如 C:/Users/你的用户/.ssh/id_ed25519 或 ~/.ssh/id_ed25519。
此文件已被 Git 忽略，不会提交个人连接设置。
不要将 SSH 配置改成 VITE_ 前缀变量；浏览器只需要 `/api/v1`。

## 3. 启动开发

终端一：

```bash
npm ci
npm run tunnel:check
npm run tunnel
```

`tunnel:check` 只检查本地配置并打印转发目标，不发起 SSH 连接。
`tunnel` 前台运行 SSH，保留登录提示；绑定失败会退出，断连后重新运行。
也可临时指定目标：`npm run tunnel -- user@host`。

终端二（同一项目目录）：

```bash
npm run dev
```

浏览器打开 Vite 打印的本机地址，通常为 http://127.0.0.1:5173。
在另一个本机终端可检查隧道：

```bash
curl --fail http://127.0.0.1:18000/api/v1/health
```

Windows PowerShell 使用 `curl.exe --fail http://127.0.0.1:18000/api/v1/health`。
隧道和 Vite 都要保持运行；Ctrl+C 分别停止。
本机 18000 被占用时，在同一配置文件改 DEV_API_TARGET 端口，然后重启两者；
隧道脚本和 Vite 共用此值，避免转发端口不一致。

如需手动启动等价隧道：

```bash
ssh -N -T -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -L 127.0.0.1:18000:127.0.0.1:8000 user@host
```

## 4. 后续部署

开发使用 `.env.development` 和 `.env.development.local`；`npm run build` 使用 `.env.production`。
生产构建保留 VITE_API_BASE_URL=/api/v1，不依赖 SSH_TARGET 或本机 18000 端口。
将本机生成的 dist 上传 Ubuntu 后，继续使用现有 Nginx 配置即可。
完整服务器部署步骤见 [Ubuntu 部署说明](ubuntu-deployment.md)。
`npm run preview` 不提供 API 代理，不能替代开发 Vite 或部署 Nginx。
