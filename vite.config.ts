import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 220,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/three")) return "three";
          if (id.includes("node_modules/zod")) return "zod";
          return undefined;
        }
      }
    }
  },
  server: { host: "0.0.0.0", port: 4173 },
  preview: { host: "0.0.0.0", port: 4173 },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/sim/**", "src/util/**", "src/data/**", "src/engine/events.ts", "src/engine/input.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  }
});
