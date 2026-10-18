# Developer Voice 当前接口契约

前端 Developer-Voice 与后端 github-sentiment 并列。真实统计读取 sentiment_facts；
季度 Topic 读取后端本地 BERTopic 结果；方面详情示例关键词、事件、单文本推理仍为前端 mock。
部署见 [Ubuntu 部署](ubuntu-deployment.md)。

## 数据口径

查询表仅含 corpus_id、repository_id、created_at、aspect、sentiment。
created_at 为 GitHub 原文创建时间，使用 UTC，明细返回带 Z 的 ISO 8601。
方面采用 rust-aspects-v2 的 13 类；情感是 positive、neutral、negative 字符串。
最新成功标注及空方面过滤在刷新表时完成；API 不解析原始标注 JSON。

| 页面卡片 | summary 字段 | 口径 |
| --- | --- | --- |
| 已标注语料量 | total_count | COUNT(DISTINCT corpus_id) |
| 方面标注量 | aspect_count | 查询表行数 |
| 正向数据量 | positive_count | 至少有一个正面标签的去重语料数 |
| 负面问题量 | negative_count | 至少有一个负面标签的去重语料数 |

同一语料可能在不同方面既正面又负面；正负面数不能相加作为总语料数。
valid_count 为旧接口兼容字段，等于 total_count，不表示全部清洗后语料。
本次不提供原始采集总量、作者统计、模型置信度或模型版本。

## HTTP 路由

前缀 /api/v1，真实业务接口仅支持 GET。

| 路由 | 返回 |
| --- | --- |
| /health | 查询表状态、UTC 时间范围、语料/方面数量，topics_source=bertopic_quarterly 或 unavailable |
| /repositories | 查询表中的仓库 ID、名称和去重语料数 |
| /analytics/dashboard | 顶部卡片、月序列、方面画像 |
| /analytics/trend | 所选方面或 overall 的月度数量及情感得分 |
| /analytics/dimensions | 时间和仓库范围内全部方面画像 |
| /sentiment-facts | 五字段明细及下一页游标 |
| /topics | 最新完成运行的季度列表、每季度计数和源数据日期范围 |
| /topics/{YYYY-Qn} | 指定季度的主题、关键词、占比和代表语料 |

统计及明细接口必填 start_date、end_date，格式 YYYY-MM，包含两端月份。
倒置范围自动排序；最长 600 个月；月份分组以 UTC 为准。
可选 repository_id，不传表示全部仓库。
dimension=overall 表示全部方面，其他值必须为有效 aspect。
Dashboard 的 dimension 筛选顶部卡片；analytics 保留全部方面数据，
前端按选定方面绘制折线，同时保留完整饼图和雷达图。

sentiment=all|positive|neutral|negative 在明细接口筛选行；Dashboard 和趋势保留三类数量，
避免先过滤负面再计算情感评分。旧页面的 quarter/year 参数可接受，但响应始终按月。
无数据月份及方面返回零值。得分为 (positive-negative)/total，total 为零时为零。
画像和趋势统计方面提及次数，并非去重语料数。

Dashboard 返回 source=sentiment_facts、timezone=UTC、filters、summary、updated_at、analytics。
analytics.trend 的每项含 month（YYYY-MM）、total、positive、neutral、negative、categories；
categories 是以 aspect 为键的三分类数量。analytics.categories 是方面列表，
每项包含 id、name、total、positive、neutral、negative。total 等于三类数量之和。
后端不提供关键词，前端在统计响应外合并 Topic mock 示例。

updated_at 是最后一次成功刷新查询表的完成时间，无刷新记录时为 null，
不是最新 GitHub 讨论时间。统计默认缓存 30 秒，由 API_CACHE_SECONDS 配置。
无效参数返回 422；数据库异常返回 503。前端显示错误并清空旧统计，不回退到 mock 计数。

明细 limit 为 1～1000，默认 100，按 (corpus_id, aspect) 排序。
首次不传游标；响应 next_cursor 非空时，将 after_corpus_id、after_aspect
原样与相同筛选条件传入下一页。items 每行仅含查询表五字段。

## 真实季度主题

`analyticsApi.getTopicQuarters()` 调用 GET `/topics`，返回 `source=bertopic_quarterly`、
`run_name`、`finished_at_utc`、`data_start_utc`、`data_end_utc`、`selection`、`quarters`。
`quarters` 按时间倒序，每项有 quarter、UTC 起止边界、source_boundary、coverage_start_utc、
coverage_end_utc、document_count、topic_count、assigned_count、outlier_count、required_documents、status。
status 为 ready、insufficient、no_topics；后两者分别表示样本不足和已训练但全部未归类。

`analyticsApi.getQuarterTopics(quarter, runName)` 请求季度明细，并传 `run_name` 固定概览所指向的运行，
避免发布新结果时概览与明细来自不同快照。响应含季度上述字段及 topics（按语料数降序）。
每个主题包含 topic_id、name、document_count、share_within_quarter、keywords（term/weight）、examples。
examples 最多三条，优先模型代表语料，再补审计抽样；保留 kind、corpus_id、repository、created_at、
source_type、github_url、text。text 为最多 1200 字符的预览，完整原文通过 GitHub 链接查看。
未归类项 -1 不列为主题；占比分母保留季度全部合格语料，不会因搜索而改变。

语料从所有成功标注版本中先筛选方面非空，再按 corpus_id 取最新一条。不分方面或情感，
与 sentiment_facts 的统计口径独立。顶部月份仅筛选相交季度，主题始终按完整季度展示；
独立季度的 topic_id 不能直接对齐。边界季度源数据覆盖可能不完整，覆盖日期由接口提供。
结果来自服务器 `TOPICS_RESULTS_ROOT`（默认后端 data/topics/quarterly）中的 latest.json，
HTTP 请求仅读取 JSON/CSV，不加载模型或触发训练。不完整/缺失/损坏结果返回 503，
季度不存在返回 404，无效季度或运行名返回 422；前端显示错误和重试按钮，无模拟回退。

主题 `name` 直接使用后端保存的中文概括名称，`name_source=generated_summary`；
名称根据关键词和代表语料逐项整理，后端通过运行名及 manifest 校验值关联 `topic_labels.json`。
前端不拼接关键词生成名称。未发布名称的新运行返回编号名称和 `name_source=pending`。
季度切换加载时保留内容区域高度，完成后释放；模块设置最小视口高度，避免短结果使页面跳动。

## 保留的方面关键词示例

analyticsApi.getTopics(filters) 和 getKeywords(filters) 始终调用前端 mock，
用于原有方面画像详情，不是新增的季度主题；即使 VITE_USE_MOCK=false 也返回 source=mock；
主题只包含示例名称、方面和关键词，没有伪造数据库主题数量。
真实模式的 Dashboard 请求层增加 topics 及 keywords_source=mock，
统计数量及评分仍来自服务器；详情窗口标明“Topic 关键词为 mock”。
原“Topic 分类”实际为 aspect，页面已改成“方面分类”。
事件描述、影响数值、单文本推理保留原有演示实现，未接入真实模型接口。
