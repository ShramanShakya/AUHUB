import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/store/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/project": "http://localhost:3000",
    },
  },
});
