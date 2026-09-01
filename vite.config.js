import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
server: {
    // Em desenvolvimento, o frontend acessa a API via proxy (sem CORS).
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API_TARGET || "http://localhost:4000",
        changeOrigin: true,
      },
      "/uploads": {
        target: process.env.VITE_DEV_API_TARGET || "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
