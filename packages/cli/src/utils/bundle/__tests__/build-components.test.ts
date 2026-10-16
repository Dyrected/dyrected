import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildBundle } from "../build-bundle.js";
import { buildComponents, componentFindings, resolveComponentsEntry, SHARED_MODULES_GLOBAL } from "../build-components.js";

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "dyrected-components-"));
});
afterEach(async () => {
  await fs.remove(dir);
  delete (globalThis as Record<string, unknown>)[SHARED_MODULES_GLOBAL];
});

const write = async (name: string, contents: string) => {
  const file = path.join(dir, name);
  await fs.outputFile(file, contents);
  return file;
};

const fakeReact = { useState: (v: unknown) => [v, () => {}], createElement: (...a: unknown[]) => ({ el: a }) };
const jsxRuntime = { jsx: (type: unknown, props: unknown) => ({ type, props }), jsxs: (type: unknown, props: unknown) => ({ type, props }), Fragment: Symbol("Fragment") };

const entrySource = `
  import { useState } from "react";
  import { useDyrectedForm } from "@dyrected/admin";
  export function Scanner() {
    const [value] = useState("scanned");
    const form = useDyrectedForm();
    return <div data-value={value} data-form={String(typeof form)} />;
  }
  export default { fields: { scanner: Scanner } };
`;

async function loadBuilt(js: string, shared: Record<string, unknown>) {
  (globalThis as Record<string, unknown>)[SHARED_MODULES_GLOBAL] = shared;
  const file = path.join(dir, `loaded-${Math.random().toString(36).slice(2)}.mjs`);
  await fs.writeFile(file, js);
  return import(pathToFileURL(file).href);
}

describe("buildComponents", () => {
  it("builds the registry without bundling React or the admin's API", async () => {
    const entry = await write("dyrected.components.tsx", entrySource);
    const built = await buildComponents(entry);

    expect(built.findings).toEqual([]);
    expect(built.js).toContain(SHARED_MODULES_GLOBAL);
    // A bundled React would be ~100 KB of minified code; this file is only the component and the shims.
    expect(built.bytes).toBeLessThan(5_000);
  });

  it("runs against the admin's shared modules and produces working components", async () => {
    const built = await buildComponents(await write("dyrected.components.tsx", entrySource));
    const mod = await loadBuilt(built.js, {
      react: fakeReact,
      "react/jsx-runtime": jsxRuntime,
      "react/jsx-dev-runtime": jsxRuntime,
      "@dyrected/admin": { useDyrectedForm: () => ({ form: true }) },
    });

    expect(Object.keys(mod.default.fields)).toEqual(["scanner"]);
    const element = mod.default.fields.scanner();
    expect(element.props["data-value"]).toBe("scanned");
    expect(element.props["data-form"]).toBe("object");
  });

  it("maps @dyrected/react to the same API as @dyrected/admin", async () => {
    const built = await buildComponents(
      await write("dyrected.components.ts", `import { useThing } from "@dyrected/react"; export default { fields: { x: () => useThing() } };`),
    );
    const mod = await loadBuilt(built.js, { "@dyrected/admin": { useThing: () => "from-admin" } });
    expect(mod.default.fields.x()).toBe("from-admin");
  });

  it("fails clearly when loaded outside the admin", async () => {
    const built = await buildComponents(await write("dyrected.components.tsx", entrySource));
    await expect(loadBuilt(built.js, {})).rejects.toThrow(/loaded outside the admin/);
  });

  it("produces a Subresource Integrity string that matches the bytes", async () => {
    const { createHash } = await import("node:crypto");
    const built = await buildComponents(await write("dyrected.components.tsx", entrySource));
    expect(built.integrity).toBe(`sha384-${createHash("sha384").update(built.js).digest("base64")}`);
    expect(built.sha256).toBe(createHash("sha256").update(built.js).digest("hex"));
  });

  it("is deterministic", async () => {
    const entry = await write("dyrected.components.tsx", entrySource);
    expect((await buildComponents(entry)).sha256).toBe((await buildComponents(entry)).sha256);
  });

  it("reports a missing entry and unresolvable imports clearly", async () => {
    await expect(buildComponents(path.join(dir, "nope.tsx"))).rejects.toThrow(/entry not found/);
    const broken = await write("dyrected.components.ts", `import x from "./missing"; export default { x };`);
    await expect(buildComponents(broken)).rejects.toThrow(/missing/);
  });
});

describe("componentFindings", () => {
  it("rejects bundles that include Vue", () => {
    const findings = componentFindings(["node_modules/.pnpm/vue@3.5.0/node_modules/vue/dist/vue.esm.js"], "x");
    expect(findings).toEqual([expect.objectContaining({ severity: "error", code: "vue-components" })]);
  });

  it("rejects oversized bundles", () => {
    expect(componentFindings([], "x".repeat(5 * 1024 * 1024 + 1))).toEqual([expect.objectContaining({ code: "components-size" })]);
    expect(componentFindings([], "x".repeat(1000))).toEqual([]);
  });
});

describe("resolveComponentsEntry", () => {
  it("prefers an explicit path, then the config, then a conventional file, and may find none", async () => {
    await write("dyrected.components.ts", "export default {}");
    const base = { configDir: dir, cwd: dir };

    expect(await resolveComponentsEntry({ ...base, explicit: "./a.tsx", fromConfig: "./b.tsx" })).toBe(path.join(dir, "a.tsx"));
    expect(await resolveComponentsEntry({ ...base, fromConfig: "./b.tsx" })).toBe(path.join(dir, "b.tsx"));
    expect(await resolveComponentsEntry(base)).toBe(path.join(dir, "dyrected.components.ts"));

    await fs.remove(path.join(dir, "dyrected.components.ts"));
    expect(await resolveComponentsEntry(base)).toBeNull();
  });
});

describe("buildBundle with components", () => {
  const config = `export default { collections: [{ slug: "a", fields: [] }], globals: [] };`;

  it("adds the components bundle to the output, the manifest and the version", async () => {
    await write("dyrected.config.ts", config);
    const without = await buildBundle({ configPath: path.join(dir, "dyrected.config.ts"), outDir: path.join(dir, "o1") });
    expect(without.manifest.components).toBeUndefined();

    await write("dyrected.components.tsx", entrySource);
    const withComponents = await buildBundle({ configPath: path.join(dir, "dyrected.config.ts"), outDir: path.join(dir, "o2") });

    expect(withComponents.manifest.components).toMatchObject({ file: "components.js", integrity: expect.stringMatching(/^sha384-/) });
    expect(withComponents.manifest.version).not.toBe(without.manifest.version);
    expect(await fs.pathExists(path.join(withComponents.directory!, "components.js"))).toBe(true);
    expect(await fs.pathExists(path.join(withComponents.directory!, "components.js.map"))).toBe(true);
  });

  it("changes version when only a component changes", async () => {
    await write("dyrected.config.ts", config);
    await write("dyrected.components.tsx", entrySource);
    const a = await buildBundle({ configPath: path.join(dir, "dyrected.config.ts"), outDir: path.join(dir, "a"), checkOnly: true });
    await write("dyrected.components.tsx", entrySource.replace("scanned", "changed"));
    const b = await buildBundle({ configPath: path.join(dir, "dyrected.config.ts"), outDir: path.join(dir, "b"), checkOnly: true });
    expect(b.manifest.version).not.toBe(a.manifest.version);
  });

  it("reads the entry from admin.componentsEntry and surfaces its findings in the report", async () => {
    await write("dyrected.config.ts", `export default { collections: [], globals: [], admin: { componentsEntry: "./ui/registry.tsx" } };`);
    await write("ui/registry.tsx", entrySource);
    const { manifest } = await buildBundle({ configPath: path.join(dir, "dyrected.config.ts"), outDir: path.join(dir, "o"), checkOnly: true });
    expect(manifest.components).toBeDefined();
    expect(manifest.compatibility.ok).toBe(true);
  });
});
