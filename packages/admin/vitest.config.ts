import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    pool: "forks",
    setupFiles: ["./src/test/setup.ts"],
  },
});
