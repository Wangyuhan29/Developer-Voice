import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: {
      host: "127.0.0.1",
      proxy: {
        "/ai-advice": {
          target: env.DEV_AI_TARGET || "http://127.0.0.1:8001",
          changeOrigin: true,
          configure: proxy => proxy.on("proxyReq", request => request.removeHeader("origin"))
        },
        "/api": {
          target: env.DEV_API_TARGET || "http://127.0.0.1:8000",
          changeOrigin: true
        }
      }
    }
  };
});
