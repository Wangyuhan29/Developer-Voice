import { analyticsApi } from "./src/services/analyticsApi.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const svgNS = "http://www.w3.org/2000/svg";
const createSvg = (name, attrs = {}) => {
  const el = document.createElementNS(svgNS, name);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
};
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
let warehouseSnapshot = null;
let warehouseSyncTimer;
let warehouseRequestVersion = 0;

const dimensions = [
  { id: "overall", name: "整体情感", score: 4.18 },
  { id: "performance", name: "Performance", score: 4.32 },
  { id: "security", name: "Security", score: 3.86 },
  { id: "reliability", name: "Reliability", score: 4.08 },
  { id: "maintainability", name: "Maintainability", score: 4.21 },
  { id: "community", name: "Community", score: 4.47 },
  { id: "documentation", name: "Documentation", score: 4.39 },
  { id: "feature", name: "Feature Support", score: 4.28 },
  { id: "usability", name: "Usability", score: 3.91 },
  { id: "ownership", name: "Ownership", score: 3.72 },
  { id: "type_system", name: "Type System", score: 4.16 },
  { id: "learning_curve", name: "Learning Curve", score: 3.38 },
  { id: "compile_time", name: "Compile Time", score: 3.24 },
  { id: "error_message", name: "Error Message", score: 4.02 },
  { id: "ecosystem", name: "Ecosystem", score: 4.11 },
  { id: "tooling", name: "Tooling", score: 4.25 },
  { id: "api_design", name: "API Design", score: 3.96 }
];

const keywordSets = {
  overall: [["compilation",98],["error",82],["memory",72],["build",66],["borrow",50],["cargo",47],["slow",42],["lifetime",39],["documentation",35],["thread",28],["windows",23],["docker",20]],
  performance: [["compilation",100],["slow",82],["build",75],["memory",61],["benchmark",48],["incremental",43],["linker",35],["runtime",32],["optimization",28],["binary size",22]],
  security: [["unsafe",100],["memory safety",86],["CVE",72],["soundness",64],["FFI",52],["vulnerability",48],["audit",36],["sandbox",27]],
  maintainability: [["refactor",95],["breaking change",83],["readability",71],["API",61],["migration",53],["edition",45],["lint",33],["technical debt",28]],
  community: [["contributor",92],["governance",80],["RFC",74],["discussion",66],["mentoring",52],["issue triage",45],["code of conduct",31]],
  documentation: [["example",93],["docs.rs",82],["tutorial",77],["unclear",61],["guide",56],["missing docs",47],["rustdoc",39]],
  ownership: [["borrow",100],["lifetime",88],["move",74],["ownership",69],["mutable",51],["reference",45],["borrow checker",41]],
  learning_curve: [["confusing",98],["beginner",85],["learning",74],["borrow",61],["lifetime",56],["error",44],["tutorial",38]],
  compile_time: [["compilation",100],["slow",91],["incremental",76],["linker",60],["build",57],["cache",42],["LLVM",36]],
  error_message: [["error",100],["diagnostic",79],["compiler hint",67],["unclear",58],["trace",43],["suggestion",38]]
};

const events = [
  { date: "2010-07", title: "Rust 项目首次公开", type: "language", impact: .18, dimension: "community", description: "Mozilla 公开 Rust 项目，围绕内存安全、并发与性能开启系统语言探索。", keywords: ["community","memory safety","systems"] },
  { date: "2014-03", title: "Cargo 成为官方包管理器", type: "language", impact: .27, dimension: "ecosystem", description: "统一依赖管理、构建与发布体验，为 Rust 工程生态形成共同基础。", keywords: ["cargo","build","ecosystem"] },
  { date: "2015-05", title: "Rust 1.0 正式发布", type: "language", impact: .42, dimension: "reliability", description: "稳定版本确立内存安全、零成本抽象与无畏并发的核心承诺。", keywords: ["memory safety","ownership","stability"] },
  { date: "2018-12", title: "Rust 2018 Edition", type: "language", impact: .31, dimension: "usability", description: "模块系统与工程体验进一步成熟，版本迁移机制开始形成稳定节奏。", keywords: ["edition","migration","modules"] },
  { date: "2019-11", title: "async / await 稳定", type: "language", impact: .38, dimension: "performance", description: "异步语法进入稳定版本，高性能网络服务开发体验获得显著改善。", keywords: ["async","performance","runtime"] },
  { date: "2021-02", title: "Rust 基金会成立", type: "community", impact: .29, dimension: "community", description: "基金会独立运作，推动语言治理、基础设施与全球社区长期发展。", keywords: ["governance","community","foundation"] },
  { date: "2021-10", title: "Rust 2021 Edition", type: "language", impact: .25, dimension: "maintainability", description: "闭包捕获、预导入和 Cargo 行为更新，继续强化工程一致性。", keywords: ["edition","cargo","migration"] },
  { date: "2022-12", title: "Rust 进入 Linux 内核", type: "community", impact: .46, dimension: "security", description: "Linux 6.1 合入 Rust 初始支持，系统级基础设施开始正式接纳 Rust。", keywords: ["memory safety","linux","security"] },
  { date: "2023-12", title: "async trait 稳定", type: "language", impact: .32, dimension: "feature", description: "异步 trait 能力进入稳定工具链，服务端与库设计讨论热度上升。", keywords: ["async","trait","API"] },
  { date: "2024-02", title: "crates.io 安全策略升级", type: "community", impact: .21, dimension: "security", description: "生态供应链与包发布安全受到更多关注，安全主题讨论快速增长。", keywords: ["cargo","audit","security"] },
  { date: "2024-11", title: "Rust 2024 Edition 就绪", type: "language", impact: .34, dimension: "maintainability", description: "语言一致性与迁移体验继续改善，工程可维护性的正向反馈增加。", keywords: ["edition","migration","readability"] },
  { date: "2025-05", title: "Rust 1.0 发布十周年", type: "community", impact: .28, dimension: "community", description: "社区回顾十年演进，安全、生产力与学习门槛成为讨论焦点。", keywords: ["community","learning","memory safety"] },
  { date: "2026-03", title: "项目完成全量语料预测", type: "project", impact: .19, dimension: "overall", description: "细粒度情感分析流程覆盖 Rust 社区语料，16 个技术维度进入聚合展示阶段。", keywords: ["dataset","sentiment","visualization"] },
  { date: "2026-06", title: "工程社区画像数据更新", type: "project", impact: .16, dimension: "documentation", description: "新增 Issue、PR 与评论数据，时间趋势和高频问题画像同步更新。", keywords: ["issue","documentation","data"] }
];

const allMonths = [];
for (let year = 2010, month = 0; year < 2026 || (year === 2026 && month <= 6);) {
  allMonths.push(`${year}-${String(month + 1).padStart(2, "0")}`);
  month += 1;
  if (month === 12) { month = 0; year += 1; }
}

const monthIndex = value => {
  const normalized = value.length === 7 ? value : value.slice(0, 7);
  const index = allMonths.indexOf(normalized);
  return index < 0 ? 0 : index;
};

const state = {
  start: monthIndex("2021-01"),
  end: monthIndex("2026-07"),
  dimension: "overall",
  keyword: null,
  selectedEvent: events.find(event => event.date === "2024-11"),
  eventPopoverOpen: false,
  eventPopoverPosition: { x: 0, y: 0 },
  granularity: "quarter",
  sentiment: "negative",
  radarDimensions: dimensions.slice(1).map(item => item.id)
};

const dimensionById = id => dimensions.find(item => item.id === id) || dimensions[0];
const dimensionName = id => dimensionById(id).name;
const scoreAt = (monthIdx, dimension = state.dimension) => {
  const dimIndex = dimensions.findIndex(item => item.id === dimension);
  const base = dimensionById(dimension).score;
  const wave = Math.sin(monthIdx * .31 + dimIndex * .73) * .17 + Math.cos(monthIdx * .09 + dimIndex) * .11;
  const evolution = ((monthIdx / (allMonths.length - 1)) - .5) * .27;
  const eventLift = events.reduce((sum, event) => {
    const distance = Math.abs(monthIdx - monthIndex(event.date));
    return sum + (distance < 5 && (event.dimension === dimension || dimension === "overall") ? event.impact * (1 - distance / 5) : 0);
  }, 0);
  return clamp(base + wave + evolution + eventLift, 1.2, 4.85);
};
const sentimentAt = (monthIdx, dimension = state.dimension) => {
  const dimIndex = dimensions.findIndex(item => item.id === dimension);
  const baseline = (dimensionById(dimension).score - 4) * .55;
  const wave = Math.sin(monthIdx * .23 + dimIndex * .61) * .68
    + Math.cos(monthIdx * .075 + dimIndex * .39) * .34;
  const evolution = ((monthIdx / (allMonths.length - 1)) - .5) * .22;
  const eventLift = events.reduce((sum, event) => {
    const distance = Math.abs(monthIdx - monthIndex(event.date));
    const related = event.dimension === dimension || dimension === "overall";
    return sum + (distance < 4 && related ? event.impact * .85 * (1 - distance / 4) : 0);
  }, 0);
  return clamp(baseline + wave + evolution + eventLift, -2, 2);
};

const sentimentLabel = value => {
  if (value <= -1.5) return "强烈消极";
  if (value < -.35) return "消极";
  if (value <= .35) return "中性";
  if (value < 1.5) return "积极";
  return "强烈积极";
};

function populateControls() {
  $("#dimensionSelect").innerHTML = dimensions.map(item => `<option value="${item.id}">${item.name}</option>`).join("");
  $("#dimensionSelect").value = state.dimension;
  renderRadarOptions();
}

function svgText(x, y, text, attrs = {}) {
  const node = createSvg("text", { x, y, ...attrs });
  node.textContent = text;
  return node;
}

function renderTimeline() {
  const svg = $("#timelineSvg");
  const viewport = $("#timelineViewport");
  const width = Math.max(720, viewport.clientWidth);
  const height = viewport.clientHeight;
  const margin = { left: 48, right: 28, top: 108, bottom: 50 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = "";

  const visibleCount = Math.max(1, state.end - state.start);
  const x = index => margin.left + ((index - state.start) / visibleCount) * innerW;
  const y = score => margin.top + ((2 - score) / 4) * innerH;

  const defs = createSvg("defs");
  const areaGradient = createSvg("linearGradient", { id: "areaGradient", x1: "0", y1: "0", x2: "0", y2: "1" });
  areaGradient.append(createSvg("stop", { offset: "0%", "stop-color": "#7b61ff", "stop-opacity": ".36" }));
  areaGradient.append(createSvg("stop", { offset: "100%", "stop-color": "#7b61ff", "stop-opacity": "0" }));
  const lineGradient = createSvg("linearGradient", { id: "lineGradient", x1: "0", y1: "0", x2: "1", y2: "0" });
  lineGradient.append(createSvg("stop", { offset: "0%", "stop-color": "#49bdf0" }));
  lineGradient.append(createSvg("stop", { offset: "55%", "stop-color": "#8065ff" }));
  lineGradient.append(createSvg("stop", { offset: "100%", "stop-color": "#ad68ff" }));
  defs.append(areaGradient, lineGradient);
  svg.append(defs);

  for (let score = -2; score <= 2; score += 1) {
    const gy = y(score);
    svg.append(createSvg("line", {
      x1: margin.left,
      y1: gy,
      x2: width - margin.right,
      y2: gy,
      stroke: score === 0 ? "rgba(151,137,255,.48)" : "rgba(132,154,193,.11)",
      "stroke-width": score === 0 ? 1.5 : 1
    }));
    svg.append(svgText(margin.left - 16, gy + 3, score, { fill: "#63728b", "font-size": 10, "text-anchor": "middle" }));
  }

  const points = [];
  for (let i = state.start; i <= state.end; i += 1) points.push([x(i), y(sentimentAt(i))]);
  const pointString = points.map(p => p.join(",")).join(" ");
  const neutralY = y(0);
  const areaPoints = `${margin.left},${neutralY} ${pointString} ${width - margin.right},${neutralY}`;
  svg.append(createSvg("polygon", { points: areaPoints, fill: "url(#areaGradient)" }));
  svg.append(createSvg("polyline", { points: pointString, fill: "none", stroke: "url(#lineGradient)", "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round" }));

  const tickStep = state.granularity === "year" ? 12 : state.granularity === "quarter" ? 3 : 1;
  const adjustedStep = Math.max(tickStep, Math.ceil((state.end - state.start) / 12 / tickStep) * tickStep);
  for (let i = state.start; i <= state.end; i += adjustedStep) {
    const tx = x(i);
    const label = allMonths[i];
    svg.append(createSvg("line", { x1: tx, y1: height - margin.bottom, x2: tx, y2: height - margin.bottom + 5, stroke: "#596981" }));
    svg.append(svgText(tx, height - margin.bottom + 20, adjustedStep >= 12 ? label.slice(0,4) : label.replace("-", "."), { fill: "#68778f", "font-size": 10, "text-anchor": "middle" }));
  }

  const dotStep = state.granularity === "month" ? 1 : state.granularity === "quarter" ? 3 : 12;
  points.forEach((point, pointIndex) => {
    const dataIndex = state.start + pointIndex;
    if ((dataIndex - state.start) % dotStep !== 0 && dataIndex !== state.end) return;
    const dot = createSvg("circle", { cx: point[0], cy: point[1], r: 3.2, fill: "#8a70ff", stroke: "#c1b7ff", "stroke-width": 1, class: "trend-dot" });
    dot.dataset.index = dataIndex;
    dot.addEventListener("pointerenter", event => showTrendTooltip(event, dataIndex));
    dot.addEventListener("pointerleave", hideTooltip);
    svg.append(dot);
  });

  const hasKeywordEvent = state.keyword && events.some(event =>
    event.keywords.some(k => k.toLowerCase().includes(state.keyword.toLowerCase()) || state.keyword.toLowerCase().includes(k.toLowerCase()))
  );
  const visibleEvents = events.filter(event => {
    const idx = monthIndex(event.date);
    const keywordMatch = !hasKeywordEvent || event.keywords.some(k => k.toLowerCase().includes(state.keyword.toLowerCase()) || state.keyword.toLowerCase().includes(k.toLowerCase()));
    return idx >= state.start && idx <= state.end && keywordMatch;
  });

  visibleEvents.forEach((event, index) => {
    const idx = monthIndex(event.date);
    const ex = x(idx);
    const ey = y(sentimentAt(idx));
    const selected = state.selectedEvent?.date === event.date && state.selectedEvent?.title === event.title;
    const color = event.type === "language" ? "#ff9b53" : event.type === "project" ? "#20d88b" : "#49bdf0";
    const lightTheme = document.documentElement.dataset.theme === "light";
    const pillFill = selected
      ? (lightTheme ? "rgba(105,86,223,.16)" : "rgba(128,101,255,.28)")
      : (lightTheme ? "rgba(255,255,255,.97)" : "rgba(14,29,49,.95)");
    const pillStroke = selected
      ? (lightTheme ? "#6956df" : "#8d79ff")
      : (lightTheme ? "rgba(63,82,116,.22)" : "rgba(139,161,199,.18)");
    const pillText = selected
      ? (lightTheme ? "#4634bd" : "#fff")
      : (lightTheme ? "#40506a" : "#aab5c8");
    const nodeStroke = lightTheme ? "#f8faff" : "#0c192b";
    const topY = 49 + (index % 3) * 27;
    svg.append(createSvg("line", { x1: ex, y1: topY + 8, x2: ex, y2: ey - 8, stroke: color, "stroke-opacity": selected ? .9 : .35, "stroke-width": selected ? 1.5 : 1, "stroke-dasharray": "3 4" }));
    const group = createSvg("g", { class: `event-node${selected ? " selected" : ""}`, tabindex: 0, role: "button", "aria-label": event.title });
    const pillW = clamp(event.title.length * 11 + 38, 118, 190);
    const pillX = clamp(ex - pillW / 2, margin.left, width - margin.right - pillW);
    group.append(createSvg("rect", { x: pillX, y: topY - 13, width: pillW, height: 27, rx: 5, fill: pillFill, stroke: pillStroke }));
    group.append(createSvg("circle", { cx: pillX + 12, cy: topY, r: 3, fill: color }));
    group.append(svgText(pillX + 21, topY + 3, event.title, { fill: pillText, "font-size": 9.5 }));
    group.append(createSvg("circle", { cx: ex, cy: ey, r: selected ? 6 : 4.5, fill: color, stroke: nodeStroke, "stroke-width": 2 }));
    group.addEventListener("pointerdown", e => e.stopPropagation());
    group.addEventListener("click", e => {
      e.stopPropagation();
      selectEvent(event, e);
    });
    group.addEventListener("pointerenter", e => showEventTooltip(e, event));
    group.addEventListener("pointerleave", hideTooltip);
    group.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectEvent(event);
      }
    });
    svg.append(group);
  });

  updateRangeUI();
}

function tooltipPosition(event) {
  const rect = $("#timelineViewport").getBoundingClientRect();
  return {
    left: clamp(event.clientX - rect.left + 12, 8, rect.width - 225),
    top: clamp(event.clientY - rect.top + 12, 35, rect.height - 90)
  };
}
function showTrendTooltip(event, index) {
  const tip = $("#chartTooltip");
  const pos = tooltipPosition(event);
  const score = sentimentAt(index);
  tip.innerHTML = `<span>${allMonths[index]}</span><strong>${score > 0 ? "+" : ""}${score.toFixed(2)}</strong><span>${dimensionName(state.dimension)} · ${sentimentLabel(score)}</span>`;
  tip.style.left = `${pos.left}px`; tip.style.top = `${pos.top}px`; tip.hidden = false;
}
function showEventTooltip(event, item) {
  const tip = $("#chartTooltip");
  const pos = tooltipPosition(event);
  tip.innerHTML = `<span>${item.date} · ${item.type === "language" ? "Rust 语言事件" : item.type === "project" ? "项目事件" : "社区事件"}</span><strong>${item.title}</strong><span>点击查看事件影响与关联主题</span>`;
  tip.style.left = `${pos.left}px`; tip.style.top = `${pos.top}px`; tip.hidden = false;
}
function hideTooltip() { $("#chartTooltip").hidden = true; }

function renderRadar() {
  const svg = $("#radarSvg");
  svg.innerHTML = "";
  const items = state.radarDimensions.map(dimensionById);
  const center = { x: 220, y: 180 }, radius = 132;
  for (let level = 1; level <= 5; level += 1) {
    const r = radius * level / 5;
    const points = items.map((_, i) => {
      const angle = -Math.PI / 2 + i * Math.PI * 2 / items.length;
      return `${center.x + Math.cos(angle) * r},${center.y + Math.sin(angle) * r}`;
    }).join(" ");
    svg.append(createSvg("polygon", { points, fill: "none", stroke: "rgba(124,146,184,.16)", "stroke-width": 1 }));
  }
  items.forEach((item, i) => {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / items.length;
    const x2 = center.x + Math.cos(angle) * radius;
    const y2 = center.y + Math.sin(angle) * radius;
    svg.append(createSvg("line", { x1: center.x, y1: center.y, x2, y2, stroke: "rgba(124,146,184,.13)" }));
    const labelR = radius + (items.length > 10 && i % 2 ? 23 : 17);
    const cos = Math.cos(angle);
    const anchor = cos > .25 ? "start" : cos < -.25 ? "end" : "middle";
    const labelText = item.name
      .replace("Maintainability","Maintain.")
      .replace("Documentation","Docs")
      .replace("Learning Curve","Learning")
      .replace("Compile Time","Compile")
      .replace("Error Message","Errors")
      .replace("Feature Support","Features");
    const label = svgText(center.x + cos * labelR, center.y + Math.sin(angle) * labelR + 3, labelText, {
      fill: item.id === state.dimension ? "#a99aff" : "#77869d",
      "font-size": items.length > 12 ? 8 : 9,
      "text-anchor": anchor
    });
    label.style.cursor = "pointer";
    label.addEventListener("click", () => selectDimension(item.id));
    svg.append(label);
  });
  const valuePoints = items.map((item, i) => {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / items.length;
    const value = scoreAt(Math.floor((state.start + state.end) / 2), item.id) / 5;
    return `${center.x + Math.cos(angle) * radius * value},${center.y + Math.sin(angle) * radius * value}`;
  }).join(" ");
  svg.append(createSvg("polygon", { points: valuePoints, fill: "rgba(128,101,255,.22)", stroke: "#826bff", "stroke-width": 2 }));
  valuePoints.split(" ").forEach(point => {
    const [cx, cy] = point.split(",");
    svg.append(createSvg("circle", { cx, cy, r: 2.5, fill: "#53b9fa" }));
  });
  const avg = items.reduce((sum, item) => sum + scoreAt(Math.floor((state.start + state.end) / 2), item.id), 0) / items.length;
  $("#radarScore").childNodes[0].nodeValue = avg.toFixed(2);
  updateRadarSelectorState();
}

function renderRadarOptions() {
  $("#radarDimensionOptions").innerHTML = dimensions.slice(1).map(item => `
    <label class="radar-option">
      <input type="checkbox" value="${item.id}"${state.radarDimensions.includes(item.id) ? " checked" : ""}>
      <span><i></i>${item.name}</span>
    </label>`).join("");
  $$("#radarDimensionOptions input").forEach(input => input.addEventListener("change", () => {
    if (input.checked) {
      if (!state.radarDimensions.includes(input.value)) state.radarDimensions.push(input.value);
    } else if (state.radarDimensions.length > 3) {
      state.radarDimensions = state.radarDimensions.filter(id => id !== input.value);
    } else {
      input.checked = true;
      $("#radarSelectionHint").textContent = "雷达图至少需要 3 个维度";
      window.setTimeout(updateRadarSelectorState, 1200);
      return;
    }
    renderRadar();
  }));
  updateRadarSelectorState();
}

function updateRadarSelectorState() {
  const count = state.radarDimensions.length;
  $("#radarSelectionCount").textContent = `${count} / 16`;
  $("#radarSelectionHint").textContent = `已选择 ${count} 项`;
  $$("#radarDimensionOptions input").forEach(input => {
    input.checked = state.radarDimensions.includes(input.value);
  });
}

function renderRankings() {
  const ranked = dimensions.slice(1)
    .map(item => ({ ...item, current: scoreAt(Math.floor((state.start + state.end) / 2), item.id) }))
    .sort((a,b) => b.current - a.current)
    .slice(0, 8);
  $("#rankList").innerHTML = ranked.map((item, i) => `
    <div class="rank-item${item.id === state.dimension ? " active" : ""}" data-dimension="${item.id}">
      <i>${String(i + 1).padStart(2,"0")}</i><span>${item.name}</span>
      <div class="rank-track"><i style="width:${item.current / 5 * 100}%"></i></div><b>${item.current.toFixed(1)}</b>
    </div>`).join("");
  $$(".rank-item").forEach(item => item.addEventListener("click", () => selectDimension(item.dataset.dimension)));
}

function keywordsForDimension() {
  const base = keywordSets[state.dimension] || keywordSets.overall;
  if (state.sentiment === "positive") return base.map(([word, heat], i) => [i % 2 ? `clear ${word}` : word, Math.round(heat * .82)]);
  if (state.sentiment === "all") return base.map(([word, heat]) => [word, Math.round(heat * .9)]);
  return base;
}

function renderKeywords() {
  const words = keywordsForDimension();
  const cloudLayout = [
    [50, 49, 1.12], [50, 24, .95], [30, 67, .88], [69, 67, .9],
    [73, 31, .83], [34, 33, .82], [18, 49, .77], [82, 49, .76],
    [50, 83, .72], [18, 74, .68], [82, 73, .66], [83, 18, .64]
  ];
  $("#keywordCloud").innerHTML = words.map(([word, heat], i) => {
    const [x, y, scale] = cloudLayout[i % cloudLayout.length];
    const size = (12 + heat * .21) * scale;
    const tone = i < 3 ? "hot" : i < 6 ? "warm" : "";
    return `<button class="keyword ${tone}${state.keyword === word ? " active" : ""}" data-word="${word}" style="left:${x}%;top:${y}%;font-size:${size}px;z-index:${Math.round(heat)}">${word}</button>`;
  }).join("");
  $$(".keyword").forEach(button => button.addEventListener("click", () => selectKeyword(button.dataset.word)));
  $("#keywordRankList").innerHTML = words.slice(0, 6).map(([word, heat], index) => {
    const count = Math.round(heat * (61 + (state.end - state.start) * .7));
    return `<button class="keyword-rank-row${state.keyword === word ? " active" : ""}" data-word="${word}">
      <i>${String(index + 1).padStart(2, "0")}</i>
      <span>${word}<small>${count.toLocaleString()} 次</small></span>
      <b><i style="width:${heat}%"></i></b>
    </button>`;
  }).join("");
  $$(".keyword-rank-row").forEach(button => button.addEventListener("click", () => selectKeyword(button.dataset.word)));
  const negative = state.sentiment === "negative" ? 48 : state.sentiment === "positive" ? 18 : 36;
  const positive = state.sentiment === "positive" ? 55 : state.sentiment === "negative" ? 21 : 32;
  const neutral = 100 - negative - positive;
  $("#keywordNegativeBar").style.width = `${negative}%`;
  $("#keywordNeutralBar").style.width = `${neutral}%`;
  $("#keywordPositiveBar").style.width = `${positive}%`;
  $("#keywordNegativeValue").textContent = `${negative}%`;
  $("#keywordNeutralValue").textContent = `${neutral}%`;
  $("#keywordPositiveValue").textContent = `${positive}%`;
  $("#sentimentSampleCount").textContent = `${Math.round((state.end - state.start + 1) * 188).toLocaleString()} 条`;
  const top = words[0]?.[0] || "compilation";
  $("#keywordIssueCount").textContent = Math.round((state.end - state.start + 1) * 117 * (state.keyword ? .42 : 1)).toLocaleString();
  $("#keywordInsight").textContent = state.keyword
    ? `“${state.keyword}” 已关联到主时间线；事件、趋势与当前维度将共同高亮。`
    : `${top} 是当前时间窗口中最集中的${dimensionName(state.dimension)}问题。`;
}

function renderEventDetail() {
  const selectedInRange = state.selectedEvent && monthIndex(state.selectedEvent.date) >= state.start && monthIndex(state.selectedEvent.date) <= state.end;
  const event = (selectedInRange ? state.selectedEvent : null) || events.filter(item => monthIndex(item.date) >= state.start && monthIndex(item.date) <= state.end).at(-1) || events[0];
  state.selectedEvent = event;
  $("#eventType").textContent = event.type === "language" ? "RUST LANGUAGE" : event.type === "project" ? "PROJECT DATA" : "COMMUNITY";
  $("#eventDate").textContent = event.date.replace("-",".");
  $("#eventTitle").textContent = event.title;
  $("#eventDescription").textContent = event.description;
  $("#impactValue").textContent = `+${event.impact.toFixed(2)}`;
  $("#impactBar").style.width = `${clamp(event.impact / .5 * 100, 18, 100)}%`;
  $("#impactLabel").textContent = `${dimensionName(event.dimension)} 相关情感提升`;
  $("#eventKeywords").innerHTML = event.keywords.map(word => `<span>${word}</span>`).join("");
  const positive = clamp(Math.round(45 + event.impact * 42), 35, 70);
  const negative = clamp(Math.round(24 - event.impact * 18), 8, 28);
  const neutral = 100 - positive - negative;
  $("#eventPositive").textContent = `${positive}%`;
  $("#eventNeutral").textContent = `${neutral}%`;
  $("#eventNegative").textContent = `${negative}%`;
  const eventSeed = monthIndex(event.date) % 9;
  const issue = 43 + eventSeed;
  const pr = 35 - Math.floor(eventSeed / 2);
  const comment = 100 - issue - pr;
  [
    ["Issue", issue],
    ["Pr", pr],
    ["Comment", comment]
  ].forEach(([key, value]) => {
    $(`#event${key}Bar`).style.width = `${value}%`;
    $(`#event${key}Value`).textContent = `${value}%`;
  });
  const panel = $("#eventDetail");
  panel.hidden = !state.eventPopoverOpen;
  if (state.eventPopoverOpen) window.requestAnimationFrame(positionEventPopover);
}

function positionEventPopover() {
  const panel = $("#eventDetail");
  const viewport = $("#timelineViewport");
  if (panel.hidden) return;
  const gap = 16;
  const panelWidth = panel.offsetWidth;
  const panelHeight = panel.offsetHeight;
  const anchorX = state.eventPopoverPosition.x || viewport.clientWidth / 2;
  const anchorY = state.eventPopoverPosition.y || viewport.clientHeight / 2;
  let left = anchorX + gap;
  if (left + panelWidth > viewport.clientWidth - 12) left = anchorX - panelWidth - gap;
  left = clamp(left, 12, Math.max(12, viewport.clientWidth - panelWidth - 12));
  const top = clamp(anchorY - 54, 12, Math.max(12, viewport.clientHeight - panelHeight - 12));
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
}

function updateMetrics() {
  const ratio = (state.end - state.start + 1) / allMonths.length;
  const center = Math.round((state.start + state.end) / 2);
  const currentFilters = warehouseSnapshot?.filters;
  const snapshotMatches = currentFilters
    && currentFilters.start_date === allMonths[state.start]
    && currentFilters.end_date === allMonths[state.end]
    && currentFilters.dimension === state.dimension;
  const summary = snapshotMatches ? warehouseSnapshot.summary : null;
  $("#healthValue").textContent = summary?.health_index ?? Math.round(scoreAt(center) / 5 * 100);
  $("#corpusValue").textContent = (summary?.corpus_count ?? Math.round(438522 * (.18 + ratio * .82))).toLocaleString();
  $("#issueValue").textContent = (summary?.negative_issue_count ?? Math.round(30912 * (.2 + ratio * .8))).toLocaleString();
  $("#contributorValue").textContent = (summary?.active_contributor_count ?? Math.round(1256 * (.38 + ratio * .62))).toLocaleString();
}

function warehouseFilters() {
  return {
    start_date: allMonths[state.start],
    end_date: allMonths[state.end],
    dimension: state.dimension,
    sentiment: state.sentiment,
    granularity: state.granularity
  };
}

async function syncWarehouse() {
  const requestVersion = ++warehouseRequestVersion;
  const syncState = $("#syncState");
  syncState.classList.remove("error");
  syncState.innerHTML = "<i></i> 正在同步分析数据…";
  try {
    const snapshot = await analyticsApi.getDashboard(warehouseFilters());
    if (requestVersion !== warehouseRequestVersion) return;
    warehouseSnapshot = snapshot;
    updateMetrics();
    const updatedAt = new Date(snapshot.updated_at);
    const timeLabel = Number.isNaN(updatedAt.getTime())
      ? snapshot.updated_at
      : updatedAt.toLocaleString("zh-CN", { hour12: false });
    syncState.classList.toggle("mock", analyticsApi.runtime.useMock);
    syncState.innerHTML = `<i></i> ${analyticsApi.runtime.useMock ? "模拟仓库" : "数据仓库"} · 更新于 ${timeLabel}`;
  } catch (error) {
    if (requestVersion !== warehouseRequestVersion) return;
    syncState.classList.add("error");
    syncState.innerHTML = `<i></i> 数据接口暂不可用 · ${error.message}`;
  }
}

function scheduleWarehouseSync(delay = 320) {
  window.clearTimeout(warehouseSyncTimer);
  warehouseSyncTimer = window.setTimeout(syncWarehouse, delay);
}

function updateRangeUI() {
  $("#startDate").value = allMonths[state.start];
  $("#endDate").value = allMonths[state.end];
  const total = allMonths.length - 1;
  const thumb = $("#rangeThumb");
  thumb.style.left = `${state.start / total * 100}%`;
  thumb.style.width = `${Math.max(2, (state.end - state.start) / total * 100)}%`;
  const labels = { year: "年度详细度", quarter: "季度详细度", month: "月度详细度" };
  $("#granularityLabel").textContent = labels[state.granularity];
  const filter = state.keyword ? ` · 关键词：${state.keyword}` : "";
  $("#linkMessage").textContent = `当前展示：${dimensionName(state.dimension)} · ${allMonths[state.start].replace("-",".")}—${allMonths[state.end].replace("-",".")}${filter}`;
  $("#clearFilter").hidden = !state.keyword && state.dimension === "overall";
}

function renderAll() {
  renderTimeline();
  renderRadar();
  renderRankings();
  renderKeywords();
  renderEventDetail();
  updateMetrics();
  updateRangeUI();
  scheduleWarehouseSync();
}

function selectDimension(id) {
  state.dimension = id;
  $("#dimensionSelect").value = id;
  renderAll();
}

function selectKeyword(word) {
  state.keyword = state.keyword === word ? null : word;
  if (state.keyword) {
    const related = events.find(event => event.keywords.some(k => k.toLowerCase().includes(word.toLowerCase()) || word.toLowerCase().includes(k.toLowerCase())));
    if (related) {
      state.selectedEvent = related;
      const idx = monthIndex(related.date);
      if (idx < state.start || idx > state.end) {
        const span = state.end - state.start;
        state.start = clamp(idx - Math.floor(span / 2), 0, allMonths.length - 1 - span);
        state.end = state.start + span;
      }
    }
  }
  renderAll();
}

function selectEvent(event, pointerEvent = null) {
  hideTooltip();
  const sameEvent = state.selectedEvent?.date === event.date && state.selectedEvent?.title === event.title;
  if (sameEvent && state.eventPopoverOpen) {
    state.eventPopoverOpen = false;
    renderAll();
    return;
  }
  const viewportRect = $("#timelineViewport").getBoundingClientRect();
  state.selectedEvent = event;
  state.eventPopoverOpen = true;
  state.eventPopoverPosition = pointerEvent
    ? { x: pointerEvent.clientX - viewportRect.left, y: pointerEvent.clientY - viewportRect.top }
    : { x: viewportRect.width / 2, y: viewportRect.height / 2 };
  state.dimension = event.dimension;
  $("#dimensionSelect").value = state.dimension;
  state.keyword = null;
  renderAll();
}

function setRange(start, end, source = "custom") {
  state.start = clamp(Math.min(start, end - 1), 0, allMonths.length - 2);
  state.end = clamp(Math.max(end, state.start + 1), 1, allMonths.length - 1);
  $$(".quick-ranges button").forEach(button => button.classList.toggle("active", button.dataset.months === source));
  renderAll();
}

$("#dimensionSelect").addEventListener("change", event => selectDimension(event.target.value));
$("#sentimentSelect").addEventListener("change", event => { state.sentiment = event.target.value; state.keyword = null; renderKeywords(); updateRangeUI(); });
$("#startDate").addEventListener("change", event => setRange(monthIndex(event.target.value), state.end));
$("#endDate").addEventListener("change", event => setRange(state.start, monthIndex(event.target.value)));
$$(".quick-ranges button").forEach(button => button.addEventListener("click", () => {
  const value = button.dataset.months;
  if (value === "all") setRange(0, allMonths.length - 1, value);
  else setRange(Math.max(0, allMonths.length - 1 - Number(value)), allMonths.length - 1, value);
}));
$$(".granularity button").forEach(button => button.addEventListener("click", () => {
  state.granularity = button.dataset.scale;
  $$(".granularity button").forEach(item => item.classList.toggle("active", item === button));
  renderTimeline();
}));
$("#resetView").addEventListener("click", () => {
  state.start = monthIndex("2021-01"); state.end = monthIndex("2026-07"); state.dimension = "overall"; state.keyword = null; state.granularity = "quarter";
  $("#dimensionSelect").value = "overall";
  $$(".granularity button").forEach(button => button.classList.toggle("active", button.dataset.scale === "quarter"));
  renderAll();
});
$("#clearFilter").addEventListener("click", () => { state.keyword = null; state.dimension = "overall"; $("#dimensionSelect").value = "overall"; renderAll(); });
const radarSelectorButton = $("#radarSelectorButton");
const radarSelectorMenu = $("#radarSelectorMenu");
function setRadarSelectorOpen(open) {
  radarSelectorMenu.hidden = !open;
  radarSelectorButton.setAttribute("aria-expanded", String(open));
}
radarSelectorButton.addEventListener("click", event => {
  event.stopPropagation();
  setRadarSelectorOpen(radarSelectorMenu.hidden);
});
$("#closeRadarSelector").addEventListener("click", () => setRadarSelectorOpen(false));
$("#selectAllRadar").addEventListener("click", () => {
  state.radarDimensions = dimensions.slice(1).map(item => item.id);
  renderRadar();
});
$("#selectCoreRadar").addEventListener("click", () => {
  state.radarDimensions = dimensions.slice(1, 9).map(item => item.id);
  renderRadar();
});
radarSelectorMenu.addEventListener("click", event => event.stopPropagation());
document.addEventListener("click", () => setRadarSelectorOpen(false));
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    setRadarSelectorOpen(false);
    state.eventPopoverOpen = false;
    $("#eventDetail").hidden = true;
  }
});

const viewport = $("#timelineViewport");
let dragging = false, pointerStart = 0, originalStart = 0, originalEnd = 0;
viewport.addEventListener("wheel", event => {
  if (event.target.closest?.(".event-detail-float")) return;
  event.preventDefault();
  const span = state.end - state.start;
  const minSpan = 11;
  const nextSpan = clamp(Math.round(span * (event.deltaY < 0 ? .82 : 1.2)), minSpan, allMonths.length - 1);
  const rect = viewport.getBoundingClientRect();
  const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  const anchor = state.start + span * ratio;
  let nextStart = Math.round(anchor - nextSpan * ratio);
  nextStart = clamp(nextStart, 0, allMonths.length - 1 - nextSpan);
  state.start = nextStart; state.end = nextStart + nextSpan;
  state.granularity = nextSpan > 96 ? "year" : nextSpan > 24 ? "quarter" : "month";
  $$(".granularity button").forEach(button => button.classList.toggle("active", button.dataset.scale === state.granularity));
  renderAll();
}, { passive: false });
viewport.addEventListener("pointerdown", event => {
  if (event.target.closest?.(".event-node, .event-detail-float")) return;
  dragging = true; pointerStart = event.clientX; originalStart = state.start; originalEnd = state.end;
  viewport.classList.add("dragging"); viewport.setPointerCapture(event.pointerId);
});
$("#eventDetail").addEventListener("pointerdown", event => event.stopPropagation());
$("#eventDetail").addEventListener("click", event => event.stopPropagation());
$("#eventDetail").addEventListener("wheel", event => event.stopPropagation(), { passive: true });
$("#closeEventDetail").addEventListener("click", () => {
  state.eventPopoverOpen = false;
  $("#eventDetail").hidden = true;
});
document.addEventListener("pointerdown", event => {
  if (!state.eventPopoverOpen) return;
  if (event.target.closest?.(".event-detail-float, .event-node")) return;
  state.eventPopoverOpen = false;
  $("#eventDetail").hidden = true;
});
viewport.addEventListener("pointermove", event => {
  if (!dragging) return;
  const span = originalEnd - originalStart;
  const deltaMonths = Math.round((pointerStart - event.clientX) / viewport.clientWidth * span);
  let nextStart = clamp(originalStart + deltaMonths, 0, allMonths.length - 1 - span);
  state.start = nextStart; state.end = nextStart + span;
  renderAll();
});
viewport.addEventListener("pointerup", event => {
  dragging = false; viewport.classList.remove("dragging");
  if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
});
viewport.addEventListener("keydown", event => {
  const span = state.end - state.start;
  if (event.key === "ArrowLeft") setRange(state.start - 3, state.end - 3);
  else if (event.key === "ArrowRight") setRange(state.start + 3, state.end + 3);
  else if (event.key === "+" || event.key === "=") setRange(state.start + Math.ceil(span*.1), state.end - Math.ceil(span*.1));
  else if (event.key === "-") setRange(state.start - Math.ceil(span*.1), state.end + Math.ceil(span*.1));
  else return;
  event.preventDefault();
});

$$(".side-nav button").forEach(button => button.addEventListener("click", () => {
  $$(".side-nav button").forEach(item => item.classList.toggle("active", item === button));
  $(`#${button.dataset.target}`).scrollIntoView({ behavior: "smooth", block: "start" });
}));

const navButtons = $$(".side-nav button");
function syncNavigationWithScroll() {
  const marker = 150;
  let current = navButtons[0];
  const documentHeight = document.documentElement.scrollHeight;
  const reachedBottom = window.scrollY + window.innerHeight >= documentHeight - 8;
  if (reachedBottom) {
    current = navButtons.at(-1);
  } else {
    navButtons.forEach(button => {
      const section = $(`#${button.dataset.target}`);
      if (section && section.getBoundingClientRect().top <= marker) current = button;
    });
  }
  navButtons.forEach(button => {
    const active = button === current;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "location");
    else button.removeAttribute("aria-current");
  });
}
window.addEventListener("scroll", syncNavigationWithScroll, { passive: true });

const themeSelect = $("#themeSelect");
const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
const storedTheme = localStorage.getItem("developer-voice-theme") || "system";
themeSelect.value = ["light", "dark", "system"].includes(storedTheme) ? storedTheme : "system";

function applyTheme(preference, persist = true) {
  const resolved = preference === "system" ? (systemTheme.matches ? "light" : "dark") : preference;
  document.documentElement.dataset.theme = resolved;
  if (persist) localStorage.setItem("developer-voice-theme", preference);
  renderTimeline();
  renderRadar();
}

themeSelect.addEventListener("change", event => applyTheme(event.target.value));
systemTheme.addEventListener("change", () => {
  if (themeSelect.value === "system") applyTheme("system", false);
});

$("#refreshButton").addEventListener("click", async () => {
  const button = $("#refreshButton");
  button.classList.add("loading"); button.disabled = true;
  try {
    await syncWarehouse();
  } finally {
    button.classList.remove("loading"); button.disabled = false;
    button.innerHTML = "<i>✓</i> 已更新";
    setTimeout(() => button.innerHTML = "<i>↻</i> 刷新数据", 1400);
  }
});

const dialog = $("#guideDialog");
$("#guideButton").addEventListener("click", () => dialog.showModal());
$("#closeGuide").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderAll, 100);
});

populateControls();
renderAll();
syncNavigationWithScroll();
