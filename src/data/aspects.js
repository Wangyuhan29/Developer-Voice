export const aspects = [{"id": "package_manager", "name": "包管理"}, {"id": "api_extensibility", "name": "API 与扩展性"}, {"id": "tooling_documentation", "name": "工具与文档"}, {"id": "diagnostics_debugging", "name": "诊断与调试"}, {"id": "runtime_performance", "name": "运行性能"}, {"id": "compile_time", "name": "编译时间"}, {"id": "safety", "name": "安全性"}, {"id": "readability_maintainability", "name": "可读性与可维护性"}, {"id": "ownership", "name": "所有权"}, {"id": "libraries_frameworks", "name": "库与框架"}, {"id": "type_system", "name": "类型系统"}, {"id": "learning_curve", "name": "学习曲线"}, {"id": "community", "name": "社区"}];
export const sentiments = [{ key: "positive", name: "正面", color: "#16a875" }, { key: "neutral", name: "中性", color: "#5b94db" }, { key: "negative", name: "负面", color: "#ed687b" }];
const words = ["cargo dependency resolver", "API extension interface", "rustdoc IDE tutorial", "diagnostic debugger error", "runtime benchmark memory", "compile incremental linker", "unsafe safety thread", "readability refactor maintainability", "borrow lifetime move", "crate framework ecosystem", "trait generic type", "beginner learning complexity", "contributor governance discussion"];
export function mockAnalytics(start, end) {
  const trend = [], categories = aspects.map((aspect, i) => ({...aspect, total: 0, positive: 0, neutral: 0, negative: 0, keywords: Object.fromEntries(sentiments.map(s => [s.key, words[i].split(" ")]))}));
  for (let month = start; month <= end; month++) {
    const row = { month, positive: 0, neutral: 0, negative: 0, total: 0, categories: {} };
    categories.forEach((item, i) => {
      const total = 80 + ((month * 17 + i * 31) % 140);
      const positive = Math.round(total * (.30 + .13 * Math.sin(month * .2 + i)));
      const negative = Math.round(total * (.24 + .12 * Math.cos(month * .17 + i)));
      const counts = { total, positive, negative, neutral: total - positive - negative };
      row.categories[item.id] = counts;
      for (const key of ["total", "positive", "neutral", "negative"]) { item[key] += counts[key]; row[key] += counts[key]; }
    });
    trend.push(row);
  }
  return { trend, categories };
}
