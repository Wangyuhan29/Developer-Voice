import { runtimeConfig } from "../config.js";
import { mockWarehouseQueries } from "../data/mockWarehouse.js";

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
    if (!response.ok) throw new Error(`API ${response.status}: ${response.statusText}`);
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

  getDashboard(filters) {
    return runtimeConfig.useMock
      ? mockWarehouseQueries.dashboard(filters)
      : request(`/analytics/dashboard?${buildQuery(filters)}`);
  },

  getTrend(filters) {
    return request(`/analytics/trend?${buildQuery(filters)}`);
  },

  getDimensions(filters) {
    return request(`/analytics/dimensions?${buildQuery(filters)}`);
  },

  getKeywords(filters) {
    return request(`/analytics/keywords?${buildQuery(filters)}`);
  },

  getEvents(filters) {
    return request(`/events?${buildQuery(filters)}`);
  },

  predictSentiment(text, dimension = null) {
    const body = { text, dimension };
    return runtimeConfig.useMock
      ? mockWarehouseQueries.predict(body)
      : request("/inference/sentiment", {
          method: "POST",
          body: JSON.stringify(body)
        });
  }
};
