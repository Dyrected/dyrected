import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    pool: "forks",
    poolOptions: {
      forks: {
        execArgv: ["--max-old-space-size=4096"],
      },
    },
    setupFiles: ["./src/test/setup.ts"],
  },
});
