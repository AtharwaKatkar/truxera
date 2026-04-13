import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // dev only: proxy API calls to FastAPI
    proxy: {
      "/auth": "http://localhost:8000",
      "/website": "http://localhost:8000",
      "/websites": "http://localhost:8000",
      "/report": "http://localhost:8000",
      "/reports": "http://localhost:8000",
    },
  },
  build: {
    outDir: "dist",
  },
});
