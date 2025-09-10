import { fileURLToPath, URL } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig(({ mode }) => ({
  server: {
    port: 5173,
    host: true,
    ...(mode === "development"
      ? {
          proxy: {
            "/api": {
              target: "http://localhost:8080",
              changeOrigin: true,
              rewrite: (p) => p.replace(/^\/api/, ""),
            },
          },
        }
      : {}),
  },
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
      { find: "lib", replacement: resolve(__dirname, "lib") },
    ],
  },
}));
