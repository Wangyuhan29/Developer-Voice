# 2026-10-06 前端更新（历史记录）

2026-10-07 已新增查询表 API 连接，以下 mock 说明属于此前状态。
当前约定以 [API 契约](API_CONTRACT.md) 和 [Ubuntu 部署](ubuntu-deployment.md) 为准。

使用 rust-aspects-v2 的 13 个方面；情感编码为 0=negative、1=neutral、2=positive。
时间范围包含起始月和截止月，支持单月。起止倒置时自动按时间顺序排列。
折线图按月显示单条情感评分曲线，纵轴 −1 到 1，Rust 事件节点位于曲线上。评分为（positive − negative）/ total。饼图显示 13 类方面标注量占比，右侧雷达图显示各类情感评分，Topic 名称列在图下方。点击整个日期框可打开年月选择器。
同一文本可能命中多个方面，因此饼图总量为方面标注次数，不代表去重语料数。
点击分类名称或扇区打开详情；点击关闭、窗口外或按 Escape 关闭。

当前仍为模拟数据。关键词为演示词，不是从服务器语料抽取的统计结果。
接入真实后端时，/analytics/dashboard 保留原有 summary、filters、updated_at，并增加 analytics：

```json
{
  "analytics": {
    "trend": [
      {
        "month": "2026-07",
        "total": 100,
        "positive": 40,
        "neutral": 35,
        "negative": 25,
        "categories": {
          "ownership": {"total": 20, "positive": 8, "neutral": 7, "negative": 5}
        }
      }
    ],
    "categories": [
      {
        "id": "ownership", "name": "所有权", "total": 20,
        "positive": 8, "neutral": 7, "negative": 5,
        "keywords": {
          "positive": ["borrow"], "neutral": ["lifetime"], "negative": ["move"]
        }
      }
    ]
  }
}
```

trend 返回选定月份内每月统计，categories 返回选定范围的 13 类聚合统计。
每个 total 必须等于 positive + neutral + negative；关键词只从对应时间范围、方面和情感的语料提取。
设置 VITE_USE_MOCK=false 后，缺少 analytics 时图表显示暂无统计，不使用模拟数值填补。

顶部统计卡依次使用 summary.total_count、valid_count、positive_count、negative_count，均按条计数。有效数据量为清洗后可分析的去重语料数，正负面量为对应情感语料数，不用多标签方面次数相加代替。旧接口兼容 corpus_count 和 negative_issue_count；缺少统计字段显示 —。模拟模式的计数仅为演示。
