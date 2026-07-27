/**
 * 前端拟造数据仓库
 *
 * 表结构与后端 DistilBERT 原型保持兼容：
 * - 原型输入：id, text
 * - 原型输出：label（0 negative / 1 neutral / 2 positive）
 *
 * 为后续时序与 16 维分析扩展：
 * repository_id, created_at, dimension, confidence, model_version。
 */

const monthDistance = (start, end) => {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  return Math.max(1, (ey - sy) * 12 + em - sm + 1);
};

const dimensions = [
  "performance", "security", "reliability", "maintainability",
  "community", "documentation", "feature", "usability",
  "ownership", "type_system", "learning_curve", "compile_time",
  "error_message", "ecosystem", "tooling", "api_design"
];

export const mockWarehouse = Object.freeze({
  repository_dim: [
    {
      repository_id: 1,
      full_name: "rust-lang/rust",
      language: "Rust",
      source: "github",
      created_at: "2010-07-08",
      is_active: true
    }
  ],

  model_registry: [
    {
      model_version: "distilbert-demo-v0.1",
      model_name: "distilbert-base-uncased",
      task: "sentiment-classification",
      labels: { 0: "negative", 1: "neutral", 2: "positive" },
      aspect_mode: "reserved",
      training_samples: 100,
      training_epochs: 5,
      max_length: 128,
      status: "demo",
      note: "第一轮流程调试模型，不代表最终模型效果"
    }
  ],

  sentiment_prediction_fact: [
    { prediction_id: 1, source_id: 103120, repository_id: 1, created_at: "2025-01-14T08:30:00Z", dimension: "usability", label: 0, confidence: .91, model_version: "distilbert-demo-v0.1" },
    { prediction_id: 2, source_id: 184071, repository_id: 1, created_at: "2025-02-07T12:10:00Z", dimension: "ecosystem", label: 1, confidence: .76, model_version: "distilbert-demo-v0.1" },
    { prediction_id: 3, source_id: 2321, repository_id: 1, created_at: "2025-03-16T03:20:00Z", dimension: "tooling", label: 2, confidence: .88, model_version: "distilbert-demo-v0.1" },
    { prediction_id: 4, source_id: 76878, repository_id: 1, created_at: "2025-04-09T14:42:00Z", dimension: "reliability", label: 1, confidence: .81, model_version: "distilbert-demo-v0.1" },
    { prediction_id: 5, source_id: 448324, repository_id: 1, created_at: "2025-05-22T18:05:00Z", dimension: "maintainability", label: 2, confidence: .84, model_version: "distilbert-demo-v0.1" },
    { prediction_id: 6, source_id: 23073, repository_id: 1, created_at: "2025-06-11T09:17:00Z", dimension: "documentation", label: 0, confidence: .73, model_version: "distilbert-demo-v0.1" }
  ],

  sentiment_label_dim: [
    { label: 0, key: "negative", display_name: "负面" },
    { label: 1, key: "neutral", display_name: "中性" },
    { label: 2, key: "positive", display_name: "正面" }
  ],

  aspect_dim: dimensions.map((key, index) => ({
    aspect_id: index + 1,
    key,
    enabled: true
  })),

  source_type_dim: [
    { source_type_id: 1, key: "issue", display_name: "Issue" },
    { source_type_id: 2, key: "pull_request", display_name: "Pull Request" },
    { source_type_id: 3, key: "comment", display_name: "Comment" }
  ]
});

const wait = (value, delay = 120) => new Promise(resolve => {
  window.setTimeout(() => resolve(structuredClone(value)), delay);
});

export const mockWarehouseQueries = {
  async health() {
    return wait({
      status: "ok",
      source: "mock-warehouse",
      repository: mockWarehouse.repository_dim[0].full_name,
      model: mockWarehouse.model_registry[0],
      updated_at: "2026-07-24T18:30:00+08:00"
    }, 80);
  },

  async dashboard({ start_date, end_date, dimension = "overall", sentiment = "negative" }) {
    const months = monthDistance(start_date, end_date);
    const coverage = Math.min(1, months / 199);
    const phase = dimensions.indexOf(dimension);
    const health = Math.round(80 + Math.sin(months * .11 + phase) * 3);
    return wait({
      filters: { start_date, end_date, dimension, sentiment },
      summary: {
        health_index: health,
        corpus_count: Math.round(438522 * (.18 + coverage * .82)),
        negative_issue_count: Math.round(30912 * (.2 + coverage * .8)),
        active_contributor_count: Math.round(1256 * (.38 + coverage * .62))
      },
      model: mockWarehouse.model_registry[0],
      repository: mockWarehouse.repository_dim[0],
      updated_at: "2026-07-24T18:30:00+08:00"
    });
  },

  async predict({ text, dimension = null }) {
    const lower = text.toLowerCase();
    const negativeTokens = ["terrible", "error", "slow", "difficult", "bad", "fail"];
    const positiveTokens = ["fast", "reliable", "great", "thanks", "fixed", "love"];
    const negative = negativeTokens.some(token => lower.includes(token));
    const positive = positiveTokens.some(token => lower.includes(token));
    const label = negative && !positive ? 0 : positive && !negative ? 2 : 1;
    const probabilities = label === 0
      ? { negative: .84, neutral: .12, positive: .04 }
      : label === 2
        ? { negative: .04, neutral: .13, positive: .83 }
        : { negative: .12, neutral: .76, positive: .12 };
    return wait({
      label,
      label_name: mockWarehouse.model_registry[0].labels[label],
      confidence: probabilities[mockWarehouse.model_registry[0].labels[label]],
      probabilities,
      dimension,
      model_version: mockWarehouse.model_registry[0].model_version
    });
  }
};
