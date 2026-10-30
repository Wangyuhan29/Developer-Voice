# GLM-5.3 分析建议（独立服务）

## 保持不变的部分

原后端 `/opt/GITHUB-SENTIMENT/github-sentiment` 不修改；原 `/api/v1/*` 接口、数据库与 8000 端口不变。
新增 AI 功能全部放在本仓库：

- `src/aiAdvice.js`：生成按钮、任务轮询、建议和证据引用展示。
- `src/changeProbe.js`：保留变化证据，提供进入 04 的单月环比入口；AI 面板统一由 `app.js` 挂载到 04。
- `server/advice_service.py`：独立服务，Python 3.11+ 标准库即可运行，无第三方依赖。
- `deploy/developer-voice-advice.service`：部署到已有服务器的独立 systemd 服务。
- `deploy/nginx-ai-advice.conf.example`：只新增 `/ai-advice/` 路径，原 `/api/` 代理不改。

## 密钥放在哪里

线上密钥仅放在 `/home/wyh/.config/developer-voice/ai.env`，权限 `600`，不在前端、源码、构建目录或 Git 中。
文件格式参考 `deploy/ai.env.example`，使用 `GLM_API_KEY`。模型由 `GLM_MODEL=glm-5.3` 指定。
前端拿不到密钥，只提交月份、所选方面和是否重新生成，不接受自定义 prompt。

更换密钥后重启 `developer-voice-advice`；不要将真实值写入 README 或示例文件。

## 调用与证据

1. 在 01 选择时间、02 选择方面，03 核对主题关键词后进入 04。04 默认区间分析，点击生成才调用 AI。变化探针也可把单月环比带入 04，并可切回整个区间。
2. 前端 POST `/ai-advice/jobs`，区间请求为 `{start_date:"2025-01", end_date:"2026-10", aspects:["ownership"], refresh:false}`。旧的 `{month:"2026-01", aspects:["ownership"], refresh:false}` 保留兼容，只用于单月环比。两种口径互斥。
3. 独立服务通过原有统计接口重新读取所选区间，汇总全部月份标注，评分按总正负标注计算。区间分析不是末月环比；单月区间也支持，不虚构前月变化。月度入口仍获取相邻两月数据。
4. 读取固定运行版本的季度主题，按语料 ID、UTC 日期边界及所选方面核对最多 6 条代表语料。区间最多均匀抽取 12 个相交季度，每季度读取前 3,000 条明细；样例分布覆盖所选范围，非全量。统计覆盖整个区间，不受样例上限影响。月度入口仍最多核对 10,000 条明细。
5. 使用官方 `https://open.bigmodel.cn/api/paas/v4/chat/completions`，`model=glm-5.3`、`reasoning_effort=low`、最大输出 5000 tokens。思考内容不返回给页面。
6. 前端轮询 GET `/ai-advice/jobs/{id}`；页面展示变化解读、1～3 条行动建议、验证方式和局限。D 类引用是统计，E 类引用是实际语料。未知或缺失引用会拒绝展示为有效建议。

API 和模型说明：[GLM-5.3 官方文档](https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3)。

建议基于相关数据，不认定 Rust mock 事件造成变化，也不把代表语料当作全部讨论。明细最多读取 10,000 条，覆盖不足时纳入模型上下文。少于 30 次标注会提示低样本。

## 缓存与试用额度

- 相同数据版本、季度运行、方面组合、月份、模型与提示版本缓存 24 小时；缓存命中不调用模型。
- “重新生成”绕过缓存，会再次调用 GLM。
- `AI_DAILY_LIMIT=20` 是本项目的试用设置，不是 GLM 官方限制：按 UTC 日统计整个站点最多 20 次新模型调用（失败的上游尝试也占一次）。可修改配置后重启服务。
- 同时最多生成一个任务；同一组合正在生成时复用任务，其他组合提示稍后再试。
- SQLite 位于 `/home/wyh/.local/share/developer-voice-advice/cache.sqlite`，仅保存结果、证据和每日计数，不保存 API key。重启服务不会重置每日计数；运行中的任务不持久化，完成结果才进入缓存。
- 小组公网试用期间仍保留额度限制；不提供通用聊天或任意提示词代理。

## 启动与部署

```bash
# 独立服务仅监听本机 8001
cd /opt/GITHUB-SENTIMENT/Developer-Voice
# 环境变量由 systemd EnvironmentFile 加载
sudo cp deploy/developer-voice-advice.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now developer-voice-advice
# 将 deploy/nginx-ai-advice.conf.example 的 location 加入现有 server {} 后
sudo nginx -t && sudo systemctl reload nginx
```

开发时可单独运行服务并设置 `DEV_AI_TARGET`。Vite 只新增 `/ai-advice` 代理，现有 `DEV_API_TARGET` 与 `/api` 代理规则不变。

```bash
# 只读状态检查，不返回密钥
curl http://127.0.0.1:8001/ai-advice/health
# 标准库单元测试
python3 -m unittest discover -s server -p 'test_*.py'
```

发布依然先推送 GitHub，再同步服务器到相同提交；AI 代码更新后重启独立服务。
关闭功能：停止 `developer-voice-advice` 并移除单独的 Nginx location。其余图表和原后端不受影响；点击生成时会提示服务不可用。

## 四步流程与旧结果

04 顶部始终显示当前时间范围、方面和分析模式。进入 04 不调用 AI；改变筛选后保留此前结果并标记“当前时间或方面已改变”，结果自身仍显示原范围，只有点击生成才替换。旧任务的异步响应不会覆盖新范围。缓存键加入分析模式和提示版本，区间结果与环比结果不会互相复用。导航新增 04，02—03 的主题和选择逻辑保持原样。
