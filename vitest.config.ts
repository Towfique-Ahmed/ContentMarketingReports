import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.ts"],
  },
});
