# Developer Voice 数据仓库与 API 契约

## 1. 当前后端原型

`distilbert-demo-first-training.zip` 中的模型是三分类 DistilBERT 调试版本：

- 输入：`id`, `text`
- 标签：`0 = negative`, `1 = neutral`, `2 = positive`
- 模型：`distilbert-base-uncased`
- 训练样本：100
- epoch：5
- max length：128

当前模型没有时间、仓库和 aspect 维度。数据仓库应在保存预测结果时补充这些业务字段。

## 2. 推荐仓库结构

### sentiment_prediction_fact

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| prediction_id | bigint | 预测记录主键 |
| source_id | bigint | 原始 Issue、PR 或评论 ID |
| repository_id | bigint | 仓库外键 |
| created_at | datetime | 原始内容发布时间 |
| dimension | varchar(64) | 16 维 aspect；第一版允许为空 |
| label | tinyint | 0 负面、1 中性、2 正面 |
| confidence | decimal(6,5) | 预测置信度 |
| model_version | varchar(64) | 模型版本 |

### repository_dim

保存仓库名称、语言、创建时间和数据源。

### model_registry

保存模型名称、版本、标签映射、训练参数和上线状态。

### sentiment_aggregate_monthly

建议由后端或离线任务预聚合：

```text
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

前端趋势查询应读取聚合表，不应直接扫描完整预测明细。

## 3. API

所有时间使用 ISO 8601；月粒度参数使用 `YYYY-MM`。

### GET /api/v1/health

返回数据源、模型版本与最近更新时间。

### GET /api/v1/analytics/dashboard

参数：

```text
start_date=2021-01
end_date=2026-07
dimension=overall
sentiment=negative
```

返回：

```json
{
  "summary": {
    "health_index": 82,
    "corpus_count": 438522,
    "negative_issue_count": 30912,
    "active_contributor_count": 1256
  },
  "repository": {
    "repository_id": 1,
    "full_name": "rust-lang/rust"
  },
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

### GET /api/v1/analytics/trend

附加参数：`granularity=month|quarter|year`。

```json
{
  "dimension": "performance",
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

### GET /api/v1/analytics/dimensions

返回 16 个维度在当前时间窗口的画像得分和三类情感数量。维度画像仍使用 1—5 分制；时间趋势使用 -2—2 情感倾向分。

### GET /api/v1/analytics/keywords

参数包含 `dimension`、`sentiment`、`start_date`、`end_date`。

### GET /api/v1/events

返回 Rust 语言事件、社区事件和项目数据事件。

### POST /api/v1/inference/sentiment

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

## 4. 前端切换真实后端

复制 `.env.example` 为 `.env.production`：

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=/api/v1
VITE_API_TIMEOUT=12000
```

构建：

```powershell
npm.cmd run build
```

服务器托管 `dist`，并把 `/api/` 反向代理到后端服务。前端组件不需要修改。
