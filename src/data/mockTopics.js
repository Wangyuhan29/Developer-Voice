import { mockAnalytics } from "./aspects.js";

// Topic clustering is not connected to the database yet. Counts and scores are
// deliberately omitted so these examples cannot replace sentiment_facts data.
export const mockTopicQueries = {
  async topics(filters = {}) {
    return {
      source: "mock",
      filters,
      topics: mockAnalytics(0, 0).categories.map(category => ({
        topic_id: `demo-${category.id}`,
        aspect: category.id,
        name: `${category.name}主题示例`,
        keywords: category.keywords
      }))
    };
  },

  async keywords(filters = {}) {
    const result = await this.topics(filters);
    return { source: "mock", filters, categories: result.topics };
  }
};
