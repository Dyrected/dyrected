import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  installSharedModules,
  loadRemoteComponents,
  mergeComponents,
  RemoteComponentsError,
  SHARED_MODULES_GLOBAL,
  verifyIntegrity,
} from "./remote-components";

const encode = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer;
const sri = (algorithm: "sha256" | "sha384" | "sha512", text: string) =>
  `${algorithm}-${createHash(algorithm).update(text).digest("base64")}`;

beforeEach(() => {
  // jsdom has no object URLs; the loader imports verified bytes through one.
  (URL as any).createObjectURL = vi.fn(() => "blob:test");
  (URL as any).revokeObjectURL = vi.fn();
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>)[SHARED_MODULES_GLOBAL];
});

describe("verifyIntegrity", () => {
  it.each(["sha256", "sha384", "sha512"] as const)("accepts a matching %s hash", async (algorithm) => {
    expect(await verifyIntegrity(encode("bundle"), sri(algorithm, "bundle"))).toBe(true);
  });

  it("rejects a hash for different bytes", async () => {
    expect(await verifyIntegrity(encode("tampered"), sri("sha384", "bundle"))).toBe(false);
  });

  it("accepts any one of several hashes of the strongest algorithm", async () => {
    const integrity = `${sri("sha384", "old")} ${sri("sha384", "bundle")}`;
    expect(await verifyIntegrity(encode("bundle"), integrity)).toBe(true);
  });

  it("does not let a weaker matching hash rescue a failing stronger one", async () => {
    const integrity = `${sri("sha256", "bundle")} ${sri("sha512", "something else")}`;
    expect(await verifyIntegrity(encode("bundle"), integrity)).toBe(false);
  });

  it("rejects values it cannot understand instead of passing them", async () => {
    await expect(verifyIntegrity(encode("x"), "md5-abc")).rejects.toMatchObject({ code: "INVALID_INTEGRITY" });
    await expect(verifyIntegrity(encode("x"), "")).rejects.toMatchObject({ code: "INVALID_INTEGRITY" });
  });
});

describe("loadRemoteComponents", () => {
  const source = "export default { fields: { x: 1 } }";
  const respond = (body: string, status = 200) => vi.fn(async () => new Response(body, { status }));
  const importer = (registry: unknown) => vi.fn(async () => ({ default: registry }));

  it("verifies, installs the shared modules, and returns the exported registry", async () => {
    const fetchImpl = respond(source);
    const importModule = importer({ fields: { x: 1 } });
    const react = { name: "react" };

    const result = await loadRemoteComponents({
      url: "https://acme.dyrected.app/_bundles/abc/components.js",
      integrity: sri("sha384", source),
      shared: { react },
      fetchImpl: fetchImpl as any,
      importModule,
    });

    expect(result).toEqual({ fields: { x: 1 } });
    expect((globalThis as any)[SHARED_MODULES_GLOBAL].react).toBe(react);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://acme.dyrected.app/_bundles/abc/components.js",
      expect.objectContaining({ credentials: "omit" }),
    );
  });

  it("does not run a bundle that fails its integrity check", async () => {
    const importModule = importer({});
    await expect(
      loadRemoteComponents({
        url: "https://x.test/c.js",
        integrity: sri("sha384", "what was promised"),
        shared: {},
        fetchImpl: respond(source) as any,
        importModule,
      }),
    ).rejects.toMatchObject({ code: "INTEGRITY_FAILED" });
    expect(importModule).not.toHaveBeenCalled();
  });

  it("runs the bytes it verified, never a second download", async () => {
    const fetchImpl = respond(source);
    let blob: Blob | undefined;
    (URL as any).createObjectURL = vi.fn((value: Blob) => ((blob = value), "blob:test"));

    await loadRemoteComponents({
      url: "https://x.test/c.js",
      integrity: sri("sha384", source),
      shared: {},
      fetchImpl: fetchImpl as any,
      importModule: importer({}),
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob!);
    });
    expect(text).toBe(source);
  });

  it("refuses plain http unless explicitly allowed", async () => {
    const base = { url: "http://localhost:3000/c.js", shared: {}, fetchImpl: respond(source) as any, importModule: importer({}) };
    await expect(loadRemoteComponents(base)).rejects.toMatchObject({ code: "INSECURE_URL" });
    await expect(loadRemoteComponents({ ...base, allowInsecure: true })).resolves.toEqual({});
  });

  it("reports download failures and HTTP errors distinctly", async () => {
    await expect(
      loadRemoteComponents({ url: "https://x.test/c.js", shared: {}, fetchImpl: respond("nope", 404) as any, importModule: importer({}) }),
    ).rejects.toMatchObject({ code: "FETCH_FAILED", message: expect.stringContaining("404") });

    const offline = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(
      loadRemoteComponents({ url: "https://x.test/c.js", shared: {}, fetchImpl: offline as any, importModule: importer({}) }),
    ).rejects.toMatchObject({ code: "FETCH_FAILED" });
  });

  it("lets an aborted load propagate as an abort, not as a failure", async () => {
    const aborted = vi.fn(async () => {
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    });
    await expect(
      loadRemoteComponents({ url: "https://x.test/c.js", shared: {}, fetchImpl: aborted as any, importModule: importer({}) }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects a module that exports no registry", async () => {
    await expect(
      loadRemoteComponents({ url: "https://x.test/c.js", shared: {}, fetchImpl: respond(source) as any, importModule: vi.fn(async () => ({})) }),
    ).rejects.toBeInstanceOf(RemoteComponentsError);
  });

  it("accepts a named `components` export", async () => {
    const result = await loadRemoteComponents({
      url: "https://x.test/c.js",
      shared: {},
      fetchImpl: respond(source) as any,
      importModule: vi.fn(async () => ({ components: { pages: {} } })),
    });
    expect(result).toEqual({ pages: {} });
  });
});

describe("installSharedModules", () => {
  it("adds to what is already shared instead of replacing it", () => {
    installSharedModules({ react: 1 });
    installSharedModules({ "react-dom": 2 });
    expect((globalThis as any)[SHARED_MODULES_GLOBAL]).toEqual({ react: 1, "react-dom": 2 });
  });
});

describe("mergeComponents", () => {
  const A = () => null;
  const B = () => null;
  const C = () => null;

  it("keeps keys from both and lets the override win per key", () => {
    const merged = mergeComponents({ fields: { a: A, shared: A }, pages: { p: A } }, { fields: { shared: B, b: B } });
    expect(merged).toEqual({ fields: { a: A, shared: B, b: B }, pages: { p: A } });
  });

  it("returns the other side unchanged when one is missing", () => {
    const only = { forms: { f: C } };
    expect(mergeComponents(undefined, only)).toBe(only);
    expect(mergeComponents(only, undefined)).toBe(only);
    expect(mergeComponents(undefined, undefined)).toBeUndefined();
  });
});
