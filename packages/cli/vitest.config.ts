import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Builds the Vue fixtures once, in Node, for the test that runs them in a simulated browser.
    globalSetup: ["./test-setup/build-vue-fixtures.ts"],
  },
});
