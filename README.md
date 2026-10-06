# Developer Voice · Rust 社区情感分析平台

面向 GitHub Issue、Pull Request 和评论的方面级情感分析前端。当前采用 `rust-aspects-v2` 的 13 个方面，以及正面、中性、负面三分类。

> 当前默认使用模拟仓库。页面中的数量、关键词、情感评分和事件影响解读均为演示结果，尚未接入服务器真实数据，不用于报告实际模型效果。

## 页面功能

### 顶部统计卡

依次展示总数据量、有效数据量、正向数据量、负面问题量，单位均为“条”。有效量为清洗后可分析的语料数，正负面量为对应情感语料数。真实统计应按语料去重，不能直接累加多标签方面次数代替。

### 时间线

- 自由选择起始、截止年月，包含两端月份，支持单月；倒置的时间范围自动排序。
- 点击整个日期框可打开年月选择器；日期标签位于框外。
- 支持快捷范围、滚轮缩放、拖动浏览及下方范围条。
- 按分析维度展示一条月度情感评分折线，纵轴上方为 `1`，下方为 `-1`，`0` 为中性基准。
- 评分计算：`(positive - negative) / total`，其中 `total = positive + neutral + negative`。中性样本参与分母。
- Rust 事件节点位于对应月份的评分曲线上；点击节点查看事件解读。

### 13 大类情感画像

左侧饼图展示各方面标注量占比，每个扇区用引导线标明分类。右侧雷达图展示各类在选定时间范围的情感评分，使用相同评分公式；中心为 `-1`，中间环为 `0`，外圈为 `1`，轴标签为实际分类名称。

下方统一展示“Topic分类、占比与评分”。一条文本可以涉及多个方面，所以分类占比的分母是方面标注次数，与去重语料总量不同。

点击分类名称、饼图扇区或雷达图评分点，可打开详情悬浮窗，展示选定范围内该类总量、正面／中性／负面数量，以及各类关键词。点击窗口外、关闭按钮或按 Escape 关闭。独立的“高频问题关键词”板块已移除。

| Aspect | 分类 |
| --- | --- |
| package_manager | 包管理 |
| api_extensibility | API 与扩展性 |
| tooling_documentation | 工具与文档 |
| diagnostics_debugging | 诊断与调试 |
| runtime_performance | 运行性能 |
| compile_time | 编译时间 |
| safety | 安全性 |
| readability_maintainability | 可读性与可维护性 |
| ownership | 所有权 |
| libraries_frameworks | 库与框架 |
| type_system | 类型系统 |
| learning_curve | 学习曲线 |
| community | 社区 |

支持浅色、深色及跟随系统主题，偏好保存在本地浏览器。

## 本地运行

需要能运行 Vite 7 的 Node.js 环境。

```bash
npm install
npm run dev
```

浏览器打开终端显示的地址，通常为 `http://localhost:5173/`。端口已占用时，以终端输出为准。在启动服务的终端按 Control+C 停止；已加载的浏览器页面会保留，刷新后才会重新请求服务。

```bash
npm run build
npm run preview
```

构建产物位于 `dist/`。

## 项目结构

```text
index.html                     页面结构
styles.css                     样式和响应式布局
app.js                         图表、联动和事件交互
src/config.js                  环境配置
src/services/analyticsApi.js    请求封装
src/data/aspects.js             13 类定义和模拟聚合数据
src/data/mockWarehouse.js       模拟仓库与接口
.env.example                   配置示例
deploy/nginx.conf.example       部署配置示例
docs/frontend-update-20261006.md 当前统计接口说明
```

`backups/` 为本地修改前备份，已加入 Git 忽略规则。

## 接入后端

本地开发可复制 `.env.example` 为 `.env.local`，生产构建使用 `.env.production`：

```env
VITE_USE_MOCK=false
VITE_API_BASE_URL=/api/v1
VITE_API_TIMEOUT=12000
```

也可将 API 地址改为服务器地址；跨域访问需要后端配置 CORS。修改环境变量后重新启动开发服务或重新构建。

当前页面主要请求 `GET /analytics/dashboard`，查询参数为 `start_date`、`end_date`（`YYYY-MM`）、`dimension`、`sentiment` 和 `granularity`。图表始终使用月度统计，后端应返回所选范围内完整的月度数据。情感编码为 `0=negative`、`1=neutral`、`2=positive`。

响应示例（只列一个方面；实际应返回全部 13 类）：

```json
{
  "filters": {
    "start_date": "2026-07",
    "end_date": "2026-07",
    "dimension": "overall"
  },
  "updated_at": "2026-07-24T18:30:00+08:00",
  "summary": {
    "total_count": 150,
    "valid_count": 100,
    "positive_count": 40,
    "negative_count": 25
  },
  "analytics": {
    "trend": [{
      "month": "2026-07",
      "total": 100,
      "positive": 40,
      "neutral": 35,
      "negative": 25,
      "categories": {
        "ownership": {"total": 20, "positive": 8, "neutral": 7, "negative": 5}
      }
    }],
    "categories": [{
      "id": "ownership",
      "name": "所有权",
      "total": 20,
      "positive": 8,
      "neutral": 7,
      "negative": 5,
      "keywords": {
        "positive": ["borrow"],
        "neutral": ["lifetime"],
        "negative": ["move"]
      }
    }]
  }
}
```

`trend` 是每月统计，`categories` 是选定范围的方面聚合。每项 `total` 必须等于三类数量之和；关键词应从对应范围、方面、情感的语料中提取。真实模式缺少 `analytics` 时显示无统计数据，不自动填充模拟图表。顶部缺少统计字段显示 `—`；兼容旧字段 `corpus_count` 和 `negative_issue_count`。

请求层还保留 `/health`、`/analytics/trend`、`/analytics/dimensions`、`/analytics/keywords`、`/events`、`/inference/sentiment`，用于后续扩展；它们并非当前页面全部已接入的真实数据功能。旧版 `docs/API_CONTRACT.md` 中的维度及评分约定应以本 README 和更新说明为准。

## 部署

将 `npm run build` 生成的 `dist/` 部署到静态资源服务器。Nginx 示例见 `deploy/nginx.conf.example`，将 `/api/` 反向代理到后端，并为页面路由配置 `try_files $uri $uri/ /index.html`。

## GitHub 推送

此仓库使用 SSH 远程地址：

```bash
git remote set-url origin git@github.com:Wangyuhan29/Developer-Voice.git
git add .
git commit -m "更新前端"
git push origin main
```

若网络无法连接 SSH 22 端口，可使用 GitHub 的 SSH 443 端口；首次连接应核对官方主机指纹。SSH 登录使用本机密钥，不使用 GitHub 账户密码。
