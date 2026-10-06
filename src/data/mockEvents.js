// Event descriptions and impact numbers are demonstration data.
export const events = [
  { date: "2010-07", title: "Rust 项目首次公开", type: "language", impact: .18, dimension: "community", description: "Mozilla 公开 Rust 项目，围绕内存安全、并发与性能开启系统语言探索。", keywords: ["community","memory safety","systems"] },
  { date: "2014-03", title: "Cargo 成为官方包管理器", type: "language", impact: .27, dimension: "libraries_frameworks", description: "统一依赖管理、构建与发布体验，为 Rust 工程生态形成共同基础。", keywords: ["cargo","build","ecosystem"] },
  { date: "2015-05", title: "Rust 1.0 正式发布", type: "language", impact: .42, dimension: "safety", description: "稳定版本确立内存安全、零成本抽象与无畏并发的核心承诺。", keywords: ["memory safety","ownership","stability"] },
  { date: "2018-12", title: "Rust 2018 Edition", type: "language", impact: .31, dimension: "api_extensibility", description: "模块系统与工程体验进一步成熟，版本迁移机制开始形成稳定节奏。", keywords: ["edition","migration","modules"] },
  { date: "2019-11", title: "async / await 稳定", type: "language", impact: .38, dimension: "runtime_performance", description: "异步语法进入稳定版本，高性能网络服务开发体验获得显著改善。", keywords: ["async","performance","runtime"] },
  { date: "2021-02", title: "Rust 基金会成立", type: "community", impact: .29, dimension: "community", description: "基金会独立运作，推动语言治理、基础设施与全球社区长期发展。", keywords: ["governance","community","foundation"] },
  { date: "2021-10", title: "Rust 2021 Edition", type: "language", impact: .25, dimension: "readability_maintainability", description: "闭包捕获、预导入和 Cargo 行为更新，继续强化工程一致性。", keywords: ["edition","cargo","migration"] },
  { date: "2022-12", title: "Rust 进入 Linux 内核", type: "community", impact: .46, dimension: "safety", description: "Linux 6.1 合入 Rust 初始支持，系统级基础设施开始正式接纳 Rust。", keywords: ["memory safety","linux","security"] },
  { date: "2023-12", title: "async trait 稳定", type: "language", impact: .32, dimension: "type_system", description: "异步 trait 能力进入稳定工具链，服务端与库设计讨论热度上升。", keywords: ["async","trait","API"] },
  { date: "2024-02", title: "crates.io 安全策略升级", type: "community", impact: .21, dimension: "safety", description: "生态供应链与包发布安全受到更多关注，安全主题讨论快速增长。", keywords: ["cargo","audit","security"] },
  { date: "2024-11", title: "Rust 2024 Edition 就绪", type: "language", impact: .34, dimension: "readability_maintainability", description: "语言一致性与迁移体验继续改善，工程可维护性的正向反馈增加。", keywords: ["edition","migration","readability"] },
  { date: "2025-05", title: "Rust 1.0 发布十周年", type: "community", impact: .28, dimension: "community", description: "社区回顾十年演进，安全、生产力与学习门槛成为讨论焦点。", keywords: ["community","learning","memory safety"] },
  { date: "2026-03", title: "项目完成全量语料预测", type: "project", impact: .19, dimension: "overall", description: "细粒度情感分析流程覆盖 Rust 社区语料，13 个方面分类进入聚合展示阶段。", keywords: ["dataset","sentiment","visualization"] },
  { date: "2026-06", title: "工程社区画像数据更新", type: "project", impact: .16, dimension: "tooling_documentation", description: "新增 Issue、PR 与评论数据，时间趋势和高频问题画像同步更新。", keywords: ["issue","documentation","data"] }
];
