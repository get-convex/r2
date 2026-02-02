import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: { conditions: ["@convex-dev/component-source"] },
  define: { "process.env": {} },
});
