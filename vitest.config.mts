import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "convex-svelte": path.resolve(
        __dirname,
        "node_modules/convex-svelte/dist/index.js",
      ),
    },
  },
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    onConsoleLog(log) {
      if (log.startsWith("Convex functions should not directly call")) {
        return false;
      }
    },
  },
});
