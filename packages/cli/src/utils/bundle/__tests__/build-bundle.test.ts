import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildBundle } from "../build-bundle.js";

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "dyrected-bundle-"));
});
afterEach(async () => {
  await fs.remove(dir);
});

const write = async (name: string, contents: string) => {
  const file = path.join(dir, name);
  await fs.outputFile(file, contents);
  return file;
};

const goodConfig = `
  import { slugify } from "./lib/slugify";
  export default {
    collections: [{
      slug: "posts",
      fields: [{ name: "title", type: "text" }],
      access: { read: () => true },
      hooks: { beforeChange: [({ data }) => ({ ...data, slug: slugify(data.title) })] },
    }],
    globals: [],
    db: { adapter: "something-the-platform-replaces" },
  };
`;
const slugifyLib = `export const slugify = (s) => s.toLowerCase().replace(/\\s+/g, "-");`;

describe("buildBundle", () => {
  it("splits a config into a function-free schema and a self-contained server bundle", async () => {
    const configPath = await write("dyrected.config.ts", goodConfig);
    await write("lib/slugify.ts", slugifyLib);

    const { manifest, directory } = await buildBundle({ configPath, outDir: path.join(dir, "out") });

    expect(manifest.compatibility).toMatchObject({ ok: true, findings: [] });
    expect(manifest.functions).toEqual(["collections.0.access.read", "collections.0.hooks.beforeChange.0"]);
    expect(path.basename(directory!)).toBe(manifest.version);

    const schema = await fs.readJson(path.join(directory!, "schema.json"));
    expect(schema.collections[0].hooks.beforeChange[0]).toEqual({ $fn: "collections.0.hooks.beforeChange.0" });
    expect(schema.collections[0].access.read).toEqual({ $fn: "collections.0.access.read" });
    expect(schema).not.toHaveProperty("db");
    expect(JSON.stringify(schema)).not.toContain("=>");
  });

  it("produces a bundle whose functions behave like the originals, with imports inlined", async () => {
    const configPath = await write("dyrected.config.ts", goodConfig);
    await write("lib/slugify.ts", slugifyLib);
    const { directory } = await buildBundle({ configPath, outDir: path.join(dir, "out") });

    // Move it out of the project: it must not need anything beside it.
    const isolated = path.join(os.tmpdir(), `dyrected-isolated-${Date.now()}`);
    await fs.copy(directory!, isolated);
    try {
      const mod = await import(pathToFileURL(path.join(isolated, "server.js")).href);
      expect(Object.keys(mod.functions)).toEqual(["collections.0.access.read", "collections.0.hooks.beforeChange.0"]);
      expect(mod.functions["collections.0.hooks.beforeChange.0"]({ data: { title: "Hello World" } })).toEqual({
        title: "Hello World",
        slug: "hello-world",
      });
      expect(mod.functions["collections.0.access.read"]()).toBe(true);
    } finally {
      await fs.remove(isolated);
    }
  });

  it("is deterministic: the same source gives the same version", async () => {
    const configPath = await write("dyrected.config.ts", goodConfig);
    await write("lib/slugify.ts", slugifyLib);
    const a = await buildBundle({ configPath, outDir: path.join(dir, "a") });
    const b = await buildBundle({ configPath, outDir: path.join(dir, "b") });
    expect(a.manifest.version).toBe(b.manifest.version);
    expect(a.manifest.server.sha256).toBe(b.manifest.server.sha256);
  });

  it("changes version when a function changes", async () => {
    const configPath = await write("dyrected.config.ts", goodConfig);
    await write("lib/slugify.ts", slugifyLib);
    const before = await buildBundle({ configPath, outDir: path.join(dir, "a") });
    await write("lib/slugify.ts", `export const slugify = (s) => s.toUpperCase();`);
    const after = await buildBundle({ configPath, outDir: path.join(dir, "b") });
    expect(after.manifest.version).not.toBe(before.manifest.version);
  });

  it("stubs platform adapters instead of bundling them", async () => {
    const configPath = await write(
      "dyrected.config.ts",
      `
      import { postgresAdapter } from "@dyrected/db-postgres";
      import { s3Storage } from "@dyrected/storage-s3";
      export default { collections: [], globals: [], db: postgresAdapter({ url: "x" }), storage: s3Storage({}) };
    `,
    );
    const { manifest } = await buildBundle({ configPath, outDir: path.join(dir, "out"), checkOnly: true });
    expect(manifest.compatibility.ok).toBe(true);
    expect(manifest.server.bytes).toBeLessThan(20_000);
  });

  it("fails the compatibility check for Node-only code, naming the file and a fix", async () => {
    const configPath = await write(
      "dyrected.config.ts",
      `
      import fs from "node:fs";
      export default { collections: [{ slug: "a", fields: [], hooks: { afterChange: [() => fs.readFileSync("/etc/passwd")] } }], globals: [] };
    `,
    );
    const { manifest, directory } = await buildBundle({ configPath, outDir: path.join(dir, "out"), checkOnly: true });

    expect(directory).toBeNull();
    expect(manifest.compatibility.ok).toBe(false);
    expect(manifest.compatibility.findings).toContainEqual(
      expect.objectContaining({ severity: "error", code: "node-builtin", suggestion: expect.stringContaining("fetch") }),
    );
  });

  it("reports an unresolvable import clearly", async () => {
    const configPath = await write("dyrected.config.ts", `import x from "./does-not-exist"; export default { collections: [], globals: [], x };`);
    await expect(buildBundle({ configPath, outDir: path.join(dir, "out") })).rejects.toThrow(/does-not-exist/);
  });

  it("writes nothing in check-only mode", async () => {
    const configPath = await write("dyrected.config.ts", goodConfig);
    await write("lib/slugify.ts", slugifyLib);
    await buildBundle({ configPath, outDir: path.join(dir, "out"), checkOnly: true });
    expect(await fs.pathExists(path.join(dir, "out"))).toBe(false);
  });

  it("writes a manifest that matches the files", async () => {
    const configPath = await write("dyrected.config.ts", goodConfig);
    await write("lib/slugify.ts", slugifyLib);
    const { directory, manifest } = await buildBundle({ configPath, outDir: path.join(dir, "out") });
    expect(await fs.readJson(path.join(directory!, "manifest.json"))).toEqual(manifest);
    expect(await fs.pathExists(path.join(directory!, "server.js.map"))).toBe(true);
    expect((await fs.readFile(path.join(directory!, "server.js"), "utf8")).length).toBe(manifest.server.bytes);
  });
});

describe("namedImportsFrom", () => {
  it("finds named, aliased and type imports, ignoring defaults and other modules", async () => {
    const { namedImportsFrom } = await import("../build-bundle.js");
    const source = `
      import { postgresAdapter, type PostgresOptions, createPool as pool } from "@dyrected/db-postgres";
      import defaultThing, { other } from "@dyrected/db-postgres";
      import { unrelated } from "@dyrected/db-sqlite";
      export { reexported } from "@dyrected/db-postgres";
    `;
    expect(namedImportsFrom(source, "@dyrected/db-postgres").sort()).toEqual(
      ["createPool", "other", "postgresAdapter", "PostgresOptions", "reexported"].sort(),
    );
  });
});
