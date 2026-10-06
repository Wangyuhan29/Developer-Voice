# Ubuntu 前后端连接与部署

默认沿用部署根目录 /opt/GITHUB-SENTIMENT，下面并列存放 github-sentiment 和 Developer-Voice。
以下均为 Ubuntu Bash 命令。2026-10-07 已通过 SSH 将查询表和 API 部署到现有后端服务器，
`developer-voice-api` 已启用并监听 127.0.0.1:8000，实际运行用户为 cyg。
首次刷新包含 56,388 条语料、74,911 行方面标注；前端及 Nginx 的生产部署步骤保留供后续使用。
本次代码备份位于后端 `run/api-code-backup-20261007T014741`。

## 1. 后端 API

在后端现有 .env 中保留 DATABASE_URL，并增加或核对：

```dotenv
API_DATABASE_URL=
API_CORS_ORIGINS=
API_CACHE_SECONDS=30
```

API_DATABASE_URL 留空时复用 DATABASE_URL；也可填写单独只读账号的 URL。
只读账号需对 sentiment_facts、repositories、pipeline_runs 具有 SELECT 权限。
API 不启动采集、标注或刷新。数据库密码只放在后端；同域 Nginx 代理不需要 CORS。

```bash
cd /opt/GITHUB-SENTIMENT/github-sentiment
# 尚无虚拟环境时，先执行 python3 -m venv .venv
.venv/bin/python -m pip install -e '.[api]'
.venv/bin/python pipeline.py init-db
.venv/bin/python pipeline.py refresh-sentiment-facts
.venv/bin/python -m uvicorn api.app:create_app --factory --host 127.0.0.1 --port 8000
```

最后一条用于前台验证，Ctrl+C 后用 systemd 持久运行。
既有服务器的虚拟环境没有 pip 时，可用现有 uv 安装 API 依赖：

```bash
uv pip install --python .venv/bin/python -e '.[api]'
```

建表及刷新仍使用具备写入权限的 DATABASE_URL；新增标注后需再次刷新，缓存最多延迟 30 秒。

已有完整后端数据库仅补充查询表时，可使用以下命令代替 `init-db`，
避免 `init-db` 同时触发历史语料的 model_input_chars 回填：

```bash
.venv/bin/python - <<'PY'
from config import Settings
from storage import Storage
from storage.models import SentimentFact
storage = Storage(Settings.from_env().database_url)
SentimentFact.__table__.create(storage.engine, checkfirst=True)
storage.engine.dispose()
PY
.venv/bin/python pipeline.py refresh-sentiment-facts --batch-size 1000
```

已提供 deploy/developer-voice-api.service。先检查实际路径，创建服务用户（如不存在）：

```bash
id developer-voice || sudo useradd --system --user-group --no-create-home --shell /usr/sbin/nologin developer-voice
sudo chgrp developer-voice .env
sudo chmod 640 .env
sudo cp deploy/developer-voice-api.service /etc/systemd/system/developer-voice-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now developer-voice-api
sudo systemctl status developer-voice-api --no-pager
journalctl -u developer-voice-api -n 50 --no-pager
```

确保服务用户可遍历项目路径、读取代码及虚拟环境。服务监听本机 8000，单 worker；
适合既有两核 4 GB 服务器，无需安装主题模型依赖。另使用其他服务用户时同步修改 unit。
本次既有服务器沿用 cyg 用户，安装的 unit 已修改 User/Group；未修改原有 .env 的权限。

## 2. 前端与 Nginx

使用 Node.js 22.12 或更高版本。仓库包含开发机 node_modules，Ubuntu 必须用 npm ci
重装 Linux 依赖，不能直接使用克隆的 macOS/Windows 二进制。
前端已提供 .env.production：

```dotenv
VITE_USE_MOCK=false
VITE_API_BASE_URL=/api/v1
VITE_API_TIMEOUT=12000
```

变量在构建时生效，更改后必须重建。Topic 始终为 mock，不受统计开关影响。

```bash
cd /opt/GITHUB-SENTIMENT/Developer-Voice
npm ci
npm run build
sudo mkdir -p /var/www/developer-voice
sudo cp -r dist/. /var/www/developer-voice/
```

Nginx 使用 /var/www/developer-voice 静态目录，并保留 /api/v1 前缀代理到本机 8000。
检查 deploy/nginx.conf.example 的域名和路径；已有网站配置时合并相应 location，避免重复监听。
尚未安装 Nginx 时先执行 sudo apt install nginx。

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/developer-voice
sudo ln -sfn /etc/nginx/sites-available/developer-voice /etc/nginx/sites-enabled/developer-voice
sudo nginx -t
sudo systemctl reload nginx
```

HTTPS 证书沿用现有服务器配置。浏览器里的 localhost 是用户电脑，不是服务器地址。

## 3. 检查连接

在服务器执行（按实际数据月份替换示例）：

```bash
curl --fail http://127.0.0.1:8000/api/v1/health
curl --fail 'http://127.0.0.1:8000/api/v1/analytics/dashboard?start_date=2025-01&end_date=2025-02&dimension=overall'
curl --fail 'http://127.0.0.1/api/v1/sentiment-facts?start_date=2025-01&end_date=2025-02&limit=10'
```

空范围返回零值，503 通常为未建表或数据库无法连接。
页面应显示“数据仓库”，分类详情中的 Topic 关键词明确为 mock。
字段和计数口径见 [API 契约](API_CONTRACT.md)。

## 4. 开发及两台服务器

开发时按 [SSH 开发联调](ssh-development.md) 配置本机 `.env.development.local`，
分别运行 `npm run tunnel` 和 `npm run dev`。
Vite 将 /api 代理到 SSH 隧道，默认 http://127.0.0.1:18000，远端为后端 127.0.0.1:8000。
npm run preview 仅预览静态构建，不提供 API 代理；生产联调走 Nginx。

前后端位于不同 Ubuntu 主机时：前端仍使用 /api/v1，把 Nginx 的 proxy_pass 和
开发时的 DEV_API_TARGET 改成后端私网地址；后端 unit 的 --host 改为可访问的私网 IP，
只允许前端服务器访问 8000。浏览器依旧同域，不需要 CORS。
如果浏览器直接请求独立 API 域名，修改 VITE_API_BASE_URL 后重建，并在后端设置
API_CORS_ORIGINS=https://实际前端域名（协议和端口必须匹配）。
