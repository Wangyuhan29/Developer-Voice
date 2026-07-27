# Developer Voice · 工程社区情感分析平台

Developer Voice 是一个面向 GitHub 工程社区的细粒度情感分析与可视化平台。

项目首期以 `rust-lang/rust` 及其相关生态仓库为案例，聚合 Issue、Pull Request 和评论数据，通过情感模型、技术维度分类和时间序列统计，观察开发者关注点、社区情绪变化与 Rust 语言事件之间的关系。

当前目录为前端展示系统。页面已经接入统一数据服务，默认使用拟造数据仓库；后续部署到服务器时，可以通过环境变量切换到真实后端。

## 一、设计目标

平台不是单纯展示模型预测结果，而是帮助用户回答以下问题：

- Rust 社区整体情感如何随时间变化？
- 性能、安全、文档、所有权、编译时间等技术维度分别表现如何？
- Rust 语言版本、Edition、生态和社区事件是否与情感变化有关？
- 当前最集中的负面问题和高频讨论关键词是什么？
- 不同时间范围和分析维度之间有什么关联？

因此页面采用“时间线为主图，其他板块围绕时间线联动”的设计。

## 二、页面结构

### 1. 总览分析

对应左侧导航“总览分析”，主要包含：

- 项目健康指数
- 分析语料数量
- 负面问题数量
- 活跃贡献者数量
- 当前时间范围和数据仓库同步状态

指标会随时间范围和分析维度变化。

### 2. 趋势与事件

对应左侧导航“趋势与事件”，是页面的核心主图。

主图同时展示：

- 社区平均情感趋势
- Rust 语言里程碑
- Rust 社区事件
- 本项目的数据处理事件

支持：

- 鼠标滚轮调整时间详细度
- 以鼠标位置为中心进行时间缩放
- 鼠标左右拖动浏览时间窗口
- 年度、季度、月度精度切换
- 点击事件查看影响解读
- 自定义开始和结束月份
- 近 1 年、近 3 年、近 6 年及全部时间快捷切换

时间线采用以中性为中心的五级情感倾向：

```text
-2 = 强烈消极
-1 = 消极
 0 = 中性
 1 = 积极
 2 = 强烈积极
```

主图强化显示 `0` 中性基准线。曲线穿过零轴时，可以直接看出社区情感由积极转向消极，或由消极转向积极。

### 3. 维度画像

对应左侧导航“维度画像”，包含：

- 默认展示全部 16 个技术维度的雷达图
- 16 个技术维度得分排行
- 当前事件影响解读

雷达图右上角提供维度多选面板。用户可以：

- 自由勾选需要比较的维度
- 一键恢复全部 16 维
- 快速切换为核心 8 维

为保证雷达图仍能形成有效多边形，至少需要保留 3 个维度。

点击维度排行或雷达图维度后，会同步切换：

- 主时间线趋势
- 统计指标
- 高频问题关键词
- 事件关联状态

当前预留的 16 个维度：

1. Performance
2. Security
3. Reliability
4. Maintainability
5. Community
6. Documentation
7. Feature Support
8. Usability
9. Ownership
10. Type System
11. Learning Curve
12. Compile Time
13. Error Message
14. Ecosystem
15. Tooling
16. API Design

### 4. 问题洞察

对应左侧导航“问题洞察”，保留高频问题关键词板块。

支持：

- 负面问题、全部情感、正面反馈切换
- 根据当前维度生成对应关键词
- 点击关键词定位关联事件
- 联动时间线、维度和事件详情
- 显示当前关键词关联问题数量和摘要

## 三、板块联动规则

页面共享一套筛选状态：

```text
开始时间
结束时间
时间详细度
分析维度
情感类别
高频关键词
当前事件
```

主要联动关系：

```text
时间范围变化
  ├─ 更新核心指标
  ├─ 更新情感趋势
  ├─ 更新维度画像
  └─ 更新问题关键词

选择技术维度
  ├─ 主时间线切换到该维度
  ├─ 维度排行高亮
  ├─ 雷达图同步
  └─ 关键词切换为该维度的问题

选择 Rust 事件
  ├─ 在事件节点旁打开浮动影响解读
  ├─ 切换关联技术维度
  └─ 高亮对应时间节点

选择高频关键词
  ├─ 定位关联事件
  ├─ 调整时间窗口
  └─ 显示关联问题统计
```

左侧导航也与右侧内容对应：点击导航可定位板块，页面滚动时导航会自动更新高亮。

事件解读不占用固定页面栏位。首次点击时间线事件时，解读窗口会在节点附近浮动出现；再次点击同一事件、点击窗口关闭按钮、点击浮窗外部区域或按下 Esc 时均会收起。点击事件时还会主动关闭鼠标悬停提示，SVG 键盘焦点使用主题色描边，避免出现浏览器默认黑色焦点框。

趋势、维度画像和问题洞察章节在桌面端均至少占据一个可视窗口高度，使每个导航项拥有明确的纵向内容区间。滚动到页面最下方时，“问题洞察”会强制成为当前导航项，避免最后一个板块因页面剩余滚动距离不足而无法激活。

为充分利用纵向空间，维度区将放大的雷达图居中置于上方，下方展示当前得分最高的 8 个维度；桌面端为 4 列 × 2 行，窄屏会自动调整为 3 行或更多。事件解读补充事件窗口情感构成及 Issue、PR、Comment 来源比例；问题洞察区同时展示词云、Top 6 问题排行和当前情感比例。

## 四、主题系统

右上角提供三种主题：

- 浅色
- 深色
- 跟随系统

用户选择保存在浏览器 `localStorage`：

```text
developer-voice-theme
```

选择“跟随系统”时，页面监听：

```css
prefers-color-scheme
```

系统主题变化后页面会自动切换。

页面采用适合桌面数据分析场景的增强字号体系：导航和正文不低于约 11—12px，板块标题约 16px，关键指标和事件标题进一步放大；图表坐标、事件标签和雷达轴文字也单独提高字号，避免只放大 HTML 文本而图内文字仍然过小。

## 五、项目结构

```text
前端/
├─ index.html
├─ app.js
├─ styles.css
├─ package.json
├─ .env.example
├─ src/
│  ├─ config.js
│  ├─ data/
│  │  └─ mockWarehouse.js
│  └─ services/
│     └─ analyticsApi.js
├─ docs/
│  └─ API_CONTRACT.md
├─ deploy/
│  └─ nginx.conf.example
└─ dist/
```

各文件职责：

- `index.html`：页面语义结构和基础控件。
- `styles.css`：Dashboard 布局、响应式样式和主题颜色。
- `app.js`：时间线绘制、交互状态、板块联动和导航行为。
- `src/config.js`：环境变量和运行时配置。
- `src/data/mockWarehouse.js`：前端拟造数据仓库。
- `src/services/analyticsApi.js`：模拟仓库与真实后端之间的统一数据访问层。
- `docs/API_CONTRACT.md`：更详细的数据表和 API 契约。
- `deploy/nginx.conf.example`：服务器静态资源和 API 反向代理示例。

## 六、当前后端模型兼容情况

提供的 `distilbert-demo-first-training.zip` 是第一轮 DistilBERT 调试实验。

当前训练数据格式：

```csv
id,text,label
103120,"The current behavior is error-prone.",0
184071,"This dependency is old.",1
2321,"Would love to see this feature.",2
```

当前标签：

```text
0 = negative
1 = neutral
2 = positive
```

模型配置：

```text
model: distilbert-base-uncased
num_labels: 3
epoch: 5
batch_size: 8
max_length: 128
```

当前模型只输出整体三分类情感，还没有输出：

- 数据创建时间
- 仓库 ID
- Issue、PR、Comment 类型
- 16 个技术 aspect
- 模型置信度的统一业务格式

因此前端拟造仓库在原模型输出上扩展了以下字段：

```text
repository_id
source_id
created_at
dimension
label
confidence
model_version
```

时间趋势显示的 `-2—2` 情感倾向分属于聚合层指标，不是 DistilBERT 直接输出。后端可将三分类概率映射为连续趋势得分，例如：

```text
sentiment_score =
positive_probability × 2
- negative_probability × 2
```

结果范围为 `-2—2`，中性概率不会推动分数向任一方向变化。

维度雷达图、维度排行和项目健康画像仍使用 `1—5` 分制，表示维度质量或项目健康程度，与时间线的情感倾向分含义不同。

## 七、拟造数据仓库

模拟仓库位于：

```text
src/data/mockWarehouse.js
```

当前包含以下逻辑表：

### repository_dim

仓库维表：

```text
repository_id
full_name
language
source
created_at
is_active
```

### model_registry

模型注册表：

```text
model_version
model_name
task
labels
training_samples
training_epochs
max_length
status
```

### sentiment_prediction_fact

情感预测事实表：

```text
prediction_id
source_id
repository_id
created_at
dimension
label
confidence
model_version
```

### sentiment_label_dim

情感标签维表：

```text
0 negative
1 neutral
2 positive
```

### aspect_dim

保存 16 个技术维度。

### source_type_dim

数据来源类型：

```text
issue
pull_request
comment
```

真实数据量较大时，建议后端增加月度聚合表：

```text
sentiment_aggregate_monthly

repository_id
month
dimension
negative_count
neutral_count
positive_count
sentiment_score
issue_count
pr_count
comment_count
```

前端趋势查询应读取聚合表，避免直接扫描完整预测明细。

## 八、统一数据服务

前端组件不直接访问模拟数据，也不直接拼接服务器地址，而是统一调用：

```text
src/services/analyticsApi.js
```

当前提供：

```js
analyticsApi.health()
analyticsApi.getDashboard(filters)
analyticsApi.getTrend(filters)
analyticsApi.getDimensions(filters)
analyticsApi.getKeywords(filters)
analyticsApi.getEvents(filters)
analyticsApi.predictSentiment(text, dimension)
```

运行模式由环境变量控制：

```env
VITE_USE_MOCK=true
VITE_API_BASE_URL=/api/v1
VITE_API_TIMEOUT=12000
```

当 `VITE_USE_MOCK=true` 时：

```text
前端组件
  → analyticsApi
  → mockWarehouse
```

当 `VITE_USE_MOCK=false` 时：

```text
前端组件
  → analyticsApi
  → HTTP /api/v1
  → 后端聚合服务
  → 数据仓库
```

## 九、预留 API

### 1. 健康检查

```http
GET /api/v1/health
```

用于返回后端状态、仓库、模型版本和更新时间。

响应示例：

```json
{
  "status": "ok",
  "source": "warehouse",
  "repository": "rust-lang/rust",
  "model": {
    "model_version": "distilbert-demo-v0.1",
    "labels": {
      "0": "negative",
      "1": "neutral",
      "2": "positive"
    }
  },
  "updated_at": "2026-07-24T18:30:00+08:00"
}
```

### 2. Dashboard 汇总

```http
GET /api/v1/analytics/dashboard
```

查询参数：

```text
start_date=2021-01
end_date=2026-07
dimension=overall
sentiment=negative
granularity=quarter
```

响应示例：

```json
{
  "filters": {
    "start_date": "2021-01",
    "end_date": "2026-07",
    "dimension": "overall",
    "sentiment": "negative"
  },
  "summary": {
    "health_index": 82,
    "corpus_count": 438522,
    "negative_issue_count": 30912,
    "active_contributor_count": 1256
  },
  "updated_at": "2026-07-24T18:30:00+08:00"
}
```

### 3. 情感趋势

```http
GET /api/v1/analytics/trend
```

查询参数：

```text
start_date
end_date
dimension
granularity=month|quarter|year
```

响应示例：

```json
{
  "dimension": "performance",
  "granularity": "month",
  "series": [
    {
      "period": "2026-01",
      "sentiment_score": 0.82,
      "negative": 214,
      "neutral": 601,
      "positive": 487
    }
  ]
}
```

### 4. 16 维画像

```http
GET /api/v1/analytics/dimensions
```

查询参数：

```text
start_date
end_date
```

响应示例：

```json
{
  "dimensions": [
    {
      "key": "performance",
      "display_name": "Performance",
      "average_score": 4.32,
      "negative": 1021,
      "neutral": 3012,
      "positive": 5421
    }
  ]
}
```

### 5. 高频关键词

```http
GET /api/v1/analytics/keywords
```

查询参数：

```text
start_date
end_date
dimension
sentiment
limit
```

响应示例：

```json
{
  "keywords": [
    {
      "word": "compilation",
      "count": 7842,
      "weight": 100,
      "related_event_ids": [11]
    }
  ]
}
```

### 6. Rust 与项目事件

```http
GET /api/v1/events
```

查询参数：

```text
start_date
end_date
dimension
keyword
```

响应示例：

```json
{
  "events": [
    {
      "event_id": 11,
      "date": "2024-11",
      "title": "Rust 2024 Edition 就绪",
      "type": "language",
      "dimension": "maintainability",
      "impact": 0.34,
      "description": "语言一致性与迁移体验继续改善。",
      "keywords": ["edition", "migration", "readability"]
    }
  ]
}
```

事件类型：

```text
language
community
project
```

### 7. 实时情感推理

```http
POST /api/v1/inference/sentiment
```

请求：

```json
{
  "text": "Rust is fast and reliable.",
  "dimension": "performance"
}
```

响应：

```json
{
  "label": 2,
  "label_name": "positive",
  "confidence": 0.83,
  "probabilities": {
    "negative": 0.04,
    "neutral": 0.13,
    "positive": 0.83
  },
  "dimension": "performance",
  "model_version": "distilbert-demo-v0.1"
}
```

## 十、错误处理约定

HTTP 状态码建议：

```text
200 查询成功
400 参数错误
404 数据或仓库不存在
422 推理输入不符合要求
500 服务内部错误
503 模型或数据仓库不可用
```

错误响应统一格式：

```json
{
  "error": {
    "code": "INVALID_DATE_RANGE",
    "message": "start_date 不能晚于 end_date",
    "request_id": "req_123"
  }
}
```

前端请求默认超时为 12 秒，失败时会在页面右上区域显示数据接口不可用状态。

## 十一、本地运行

安装依赖：

```powershell
cd "E:\个人文件\大创\前端"
npm.cmd install
```

启动开发服务器：

```powershell
npm.cmd run dev
```

浏览器访问：

```text
http://localhost:5173/
```

默认使用拟造数据仓库，因此不启动后端也能浏览和操作页面。

停止开发服务器：

```text
在运行服务器的终端按 Ctrl+C
```

## 十二、连接真实后端

复制环境配置：

```powershell
Copy-Item .env.example .env.production
```

修改 `.env.production`：

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=/api/v1
VITE_API_TIMEOUT=12000
```

前端不需要修改组件代码。

后端需要：

1. 实现 `/api/v1` 下的接口。
2. 返回本 README 约定的字段。
3. 为前端域名配置 CORS，或通过 Nginx 使用同域反向代理。
4. 把 DistilBERT 的 `LABEL_0/1/2` 映射为 `negative/neutral/positive`。
5. 在保存预测结果时补充时间、仓库、来源类型和模型版本。
6. 优先查询预聚合结果，不直接扫描全量评论。

## 十三、构建与服务器部署

生产构建：

```powershell
npm.cmd run build
```

构建结果位于：

```text
dist/
```

服务器部署步骤：

1. 将 `dist` 上传到服务器静态资源目录。
2. 使用 Nginx 托管 `dist`。
3. 对单页应用配置 `try_files ... /index.html`。
4. 将 `/api/` 反向代理到 Python 后端。
5. 后端连接真实数据仓库和 DistilBERT 模型服务。

Nginx 示例：

```text
deploy/nginx.conf.example
```

核心配置：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}

location /api/ {
    proxy_pass http://127.0.0.1:8000/api/;
}
```

## 十四、后续开发建议

- 将 `train.py` 输出封装为 FastAPI 或 Flask 推理服务。
- 增加 aspect 分类模型，为每条文本输出一个或多个技术维度。
- 保存三分类概率，而不仅保存最大概率标签。
- 建立月度或季度聚合任务。
- 为 Rust 事件建立独立事件表。
- 关键词结果保存关联维度和事件 ID。
- 增加接口鉴权、访问日志和请求追踪 ID。
- 使用真实接口替换目前由前端生成的趋势和维度演示数据。

更严格的字段定义和接口说明见：

[docs/API_CONTRACT.md](docs/API_CONTRACT.md)
