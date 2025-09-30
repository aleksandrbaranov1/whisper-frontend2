import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Алиасируем node-пакет 'websocket' на браузерный WebSocket
      websocket: path.resolve(__dirname, "./src/shims/websocket-browser.js"),
    },
  },
  server: {
    port: 3000,
  },
  define: {
    global: "window",
  },
  optimizeDeps: {
    exclude: ["websocket"],
  },
});
