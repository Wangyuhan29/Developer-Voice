# Developer Voice · Rust 社区情感分析平台

面向 GitHub Issue、Pull Request 和评论的方面级情感分析前端。当前采用 `rust-aspects-v2` 的 13 个方面，以及正面、中性、负面三分类。

> 当前默认连接后端 sentiment_facts 查询表；统计数量和情感评分来自查询表。独立的季度主题模块读取服务器 BERTopic 结果；方面详情中的示例关键词、事件解读及单文本推理仍为 mock。生产服务器需按部署说明启动 API 并刷新查询表。

## 页面功能

### 顶部统计卡

依次展示已标注语料量、方面标注量、正向数据量、负面问题量。语料及正负面卡片按 corpus_id 去重；方面标注量为查询表行数。一条语料可能在不同方面同时包含正面和负面标签。

### 时间线

- 自由选择起始、截止年月，包含两端月份，支持单月；倒置的时间范围自动排序。
- 点击整个日期框可打开年月选择器；日期标签位于框外。
- 支持快捷范围、滚轮缩放、拖动浏览及下方范围条。
- 按分析维度展示一条月度情感评分折线，纵轴上方为 `1`，下方为 `-1`，`0` 为中性基准。
- 评分计算：`(positive - negative) / total`，其中 `total = positive + neutral + negative`。中性样本参与分母。
- Rust 事件节点位于对应月份的评分曲线上；点击节点查看事件解读。

### 13 大类情感画像

左侧饼图展示各方面标注量占比，每个扇区用引导线标明分类。右侧雷达图展示各类在选定时间范围的情感评分，使用相同评分公式；中心为 `-1`，中间环为 `0`，外圈为 `1`，轴标签为实际分类名称。

下方统一展示“方面分类、占比与评分”。一条文本可以涉及多个方面，所以分类占比的分母是方面标注次数，与去重语料总量不同。

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

### 季度主题探索

新增侧栏“季度主题”，保留原有总览、趋势与方面画像。季度范围跟随顶部月份范围，
选择与范围相交的完整自然季度（UTC），支持季度下拉切换、前后季度、主题关键词搜索。
展示去重语料数、主题数、已归类/未归类数量及占比，主题卡片可以展开真实代表语料并跳转 GitHub 原文。
样本不足、全部未归类、无匹配季度与接口错误分别展示，主题名称直接使用后端保存的中文概括。
各季度独立聚类，主题编号不能直接跨季度比较。新模块始终请求真实接口，不回退至模拟主题。

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
src/topicsPanel.js             真实季度主题、搜索和语料展开
src/data/aspects.js             13 类定义和模拟聚合数据
src/data/mockWarehouse.js       模拟仓库与接口
src/data/mockTopics.js          Topic 关键词 mock 接口
src/data/mockEvents.js          事件及影响的 mock 数据
vite.config.js                 开发时的 API 代理
.env.example                   配置示例
deploy/nginx.conf.example       部署配置示例
docs/frontend-update-20261006.md 当前统计接口说明
```

`backups/` 为本地修改前备份，已加入 Git 忽略规则。

## 接入后端与 Ubuntu 部署

前端和后端分别位于并列的 Developer-Voice、github-sentiment 目录。
开发阶段通过 SSH 隧道连接服务器后端：配置 `.env.development.local`，
分别运行 `npm run tunnel` 和 `npm run dev`；见 [SSH 开发联调](docs/ssh-development.md)。
生产构建已默认使用 `.env.production` 的真实统计模式。
通过 Nginx 将 `/api/v1` 代理到后端 `127.0.0.1:8000`；Vite 开发服务器也配置了 `/api` 代理。
季度主题通过 `/api/v1/topics` 读取服务器本地结果；方面详情示例关键词、事件和单文本推理仍为 mock。
接口错误不会回退到模拟统计或模拟季度主题。

- [当前 API 契约](docs/API_CONTRACT.md)：五字段明细、统计口径和 Topic mock。
- [Ubuntu 部署说明](docs/ubuntu-deployment.md)：依赖、查询表刷新、systemd、Nginx 和跨服务器配置。

`npm run preview` 只预览静态构建，不代理 API；使用 Nginx 或开发服务器联调。
仓库携带的 node_modules 是开发机产物，Ubuntu 上先执行 `npm ci` 安装 Linux 依赖。

## GitHub 推送

此仓库使用 SSH 远程地址：

```bash
git remote set-url origin git@github.com:Wangyuhan29/Developer-Voice.git
git add .
git commit -m "更新前端"
git push origin main
```

若网络无法连接 SSH 22 端口，可使用 GitHub 的 SSH 443 端口；首次连接应核对官方主机指纹。SSH 登录使用本机密钥，不使用 GitHub 账户密码。

## 联动分析工作台

页面顶部的“分析范围”统一展示起止月份和所选方面，并支持独立清除方面筛选、返回上一个聚焦时间范围和重置分析。

方面分类树按语言机制、工程工具、性能效率、生态协作四组组织现有 13 个模型标签。父级只控制展开与收起，不新增模型分类，也不将多标签去重语料直接相加。搜索同时支持中文名称和 aspect 标识。

- 在分类树、画像扇区或雷达图标签选择方面，会同步维度下拉、月度时间线、去重语料统计卡与当前方面概览。画像仍保留所有方面作比较，选中项高亮。
- 月份点详情中的入口可打开该月所在季度的真实主题。
- 季度主题提供“时间线聚焦本季度”，把全局范围设为该季度；可通过范围栏返回原范围。
- 代表语料日期可反向定位到对应月份。
- 方面计数是提及次数；季度主题来自独立 BERTopic 聚类，没有方面映射，不会伪装成按方面过滤。主题按完整季度统计，遇到月度部分范围会提示口径。

## 后续修改与发布顺序

固定流程：本地修改和验证 → 提交并推送 GitHub → 服务器同步 GitHub 中的同一提交 → 检查线上页面与接口。不要先部署服务器、再补推 GitHub。个人 `.env.*.local`、依赖缓存和本地备份不参与提交。
