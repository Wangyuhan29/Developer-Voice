const parseBoolean = (value, fallback) => {
  if (value === undefined || value === "") return fallback;
  return value === "true";
};

export const runtimeConfig = Object.freeze({
  useMock: parseBoolean(import.meta.env.VITE_USE_MOCK, false),
  topicsUseMock: true,
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, ""),
  timeout: Number(import.meta.env.VITE_API_TIMEOUT || 12000)
});
