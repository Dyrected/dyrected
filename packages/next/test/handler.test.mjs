import assert from "node:assert/strict";
import test from "node:test";

import { dyrectedNextHandler } from "../dist/handler.js";

test("awaits app initialization and mounts routes at /dyrected", async () => {
  let syncCalls = 0;
  const config = {
    collections: [],
    globals: [],
    db: {
      async sync() {
        syncCalls += 1;
        await Promise.resolve();
      },
    },
  };
  const { GET } = dyrectedNextHandler(config);

  const first = await GET(new Request("http://localhost/dyrected/api/schemas"));
  const second = await GET(new Request("http://localhost/dyrected/health"));

  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), {
    collections: [],
    globals: [],
    admin: {},
    adminAuth: {
      mode: "local",
      providers: [],
    },
  });
  assert.equal(second.status, 200);
  assert.equal(syncCalls, 1);
});

test("supports a custom catch-all route base path", async () => {
  const { GET } = dyrectedNextHandler(
    { collections: [], globals: [] },
    { basePath: "/cms/" },
  );

  const mounted = await GET(new Request("http://localhost/cms/health"));
  const defaultPath = await GET(new Request("http://localhost/dyrected/health"));

  assert.equal(mounted.status, 200);
  assert.equal(defaultPath.status, 404);
});
