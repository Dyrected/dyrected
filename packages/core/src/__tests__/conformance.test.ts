import { describe, expect, it } from "vitest";
import { createDyrectedApp } from "../app.js";
import { conformanceAssert, conformanceCases, type ConformanceHarness } from "../conformance/index.js";
import { InMemoryAdapter } from "./mocks.js";

/** The reference runtime: the config exactly as authored, functions called in-process. */
const inProcessHarness: ConformanceHarness = {
  async start(config) {
    const db = new InMemoryAdapter();
    const app = await createDyrectedApp({ ...config, db } as any);
    return { request: (path, init) => Promise.resolve(app.request(path, init)), db };
  },
};

describe("conformance suite: in-process runtime (reference)", () => {
  it.each(conformanceCases.map((c) => [c.id, c] as const))("%s", async (_id, testCase) => {
    await testCase.run(inProcessHarness, conformanceAssert);
  });

  it("has unique, stable case ids", () => {
    const ids = conformanceCases.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
