import { runtimeConfig } from "../config.js";
import { mockWarehouseQueries } from "../data/mockWarehouse.js";
import { mockTopicQueries } from "../data/mockTopics.js";
import { events } from "../data/mockEvents.js";

const buildQuery = params => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  return query.toString();
};

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), runtimeConfig.timeout);
  try {
    const response = await fetch(`${runtimeConfig.apiBaseUrl}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers
      },
      signal: controller.signal
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const detail = typeof body?.detail === "string" ? body.detail : response.statusText;
      throw new Error(`API ${response.status}: ${detail}`);
    }
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

export const analyticsApi = {
  runtime: runtimeConfig,

  health() {
    return runtimeConfig.useMock
      ? mockWarehouseQueries.health()
      : request("/health");
  },

  async getDashboard(filters) {
    if (runtimeConfig.useMock) return mockWarehouseQueries.dashboard(filters);
    const [snapshot, topics] = await Promise.all([
      request(`/analytics/dashboard?${buildQuery(filters)}`),
      mockTopicQueries.topics(filters)
    ]);
    return {
      ...snapshot,
      topics,
      analytics: snapshot.analytics && {
        ...snapshot.analytics,
        categories: snapshot.analytics.categories.map(category => ({
          ...category,
          keywords: topics.topics.find(topic => topic.aspect === category.id)?.keywords,
          keywords_source: "mock"
        }))
      }
    };
  },

  getTrend(filters) {
    return request(`/analytics/trend?${buildQuery(filters)}`);
  },

  getDimensions(filters) {
    return request(`/analytics/dimensions?${buildQuery(filters)}`);
  },

  getKeywords(filters) {
    return mockTopicQueries.keywords(filters);
  },

  getTopics(filters) {
    return mockTopicQueries.topics(filters);
  },

  getEvents(filters) {
    return Promise.resolve({ source: "mock", events: events.filter(event =>
      (!filters?.start_date || event.date >= filters.start_date)
      && (!filters?.end_date || event.date <= filters.end_date)
    ) });
  },

  getRepositories() {
    return request("/repositories");
  },

  getFacts(filters) {
    return request(`/sentiment-facts?${buildQuery(filters)}`);
  },

  predictSentiment(text, dimension = null) {
    const body = { text, dimension };
    return mockWarehouseQueries.predict(body);
  }
};
