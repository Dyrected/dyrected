import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("publishes a dedicated server-safe handler entrypoint", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );

  assert.deepEqual(packageJson.exports["./server"], {
    types: "./dist/server.d.ts",
    import: "./dist/server.js",
  });
  assert.deepEqual(packageJson.exports["./handler"], {
    types: "./dist/handler.d.ts",
    import: "./dist/handler.js",
  });
});
