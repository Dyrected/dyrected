import { describe, expect, it } from "vitest";
import { checkCloudCompatibility, hasBlockingFindings, MAX_BUNDLE_BYTES, originOf, type BundleInput } from "../compat-check.js";

const base = (overrides: Partial<BundleInput> = {}): BundleInput => ({
  modules: [],
  externalImports: [],
  bundleBytes: 1000,
  ...overrides,
});

const codes = (input: BundleInput) => checkCloudCompatibility(input).map((f) => `${f.severity}:${f.code}`);

describe("checkCloudCompatibility", () => {
  it("passes a plain config", () => {
    const findings = checkCloudCompatibility(
      base({ modules: [{ path: "src/hooks.ts", source: "export const h = ({ data }) => ({ ...data, n: 1 });" }] }),
    );
    expect(findings).toEqual([]);
  });

  it.each(["fs", "node:fs", "fs/promises", "child_process", "node:net", "http", "https", "os", "worker_threads", "cluster"])(
    "rejects the Node core module %s",
    (specifier) => {
      expect(codes(base({ externalImports: [{ from: "src/a.ts", specifier }] }))).toContain("error:node-builtin");
    },
  );

  it("allows Node modules that have a Cloud equivalent", () => {
    const findings = checkCloudCompatibility(
      base({ externalImports: ["crypto", "node:crypto", "url", "util", "events", "buffer"].map((specifier) => ({ from: "a", specifier })) }),
    );
    expect(findings).toEqual([]);
  });

  it("rejects native addons", () => {
    expect(codes(base({ externalImports: [{ from: "src/a.ts", specifier: "./binding.node" }] }))).toContain("error:native-addon");
  });

  it("allows process.env.<KEY> but rejects other process APIs", () => {
    const ok = checkCloudCompatibility(base({ modules: [{ path: "src/a.ts", source: "const k = process.env.STRIPE_KEY;" }] }));
    expect(ok).toEqual([]);

    const bad = checkCloudCompatibility(
      base({ modules: [{ path: "src/a.ts", source: "process.exit(1); const c = process.cwd(); process.nextTick(f);" }] }),
    );
    expect(bad.map((f) => f.message)).toEqual([
      "Uses process.exit, which is not available in Cloud.",
      "Uses process.cwd, which is not available in Cloud.",
      "Uses process.nextTick, which is not available in Cloud.",
    ]);
    expect(bad.every((f) => f.severity === "error" && f.file === "src/a.ts")).toBe(true);
  });

  it("downgrades problems inside dependencies to warnings, since they are usually feature-detected", () => {
    const findings = checkCloudCompatibility(
      base({ modules: [{ path: "node_modules/lib/index.js", source: "if (typeof process !== 'undefined') process.platform;" }] }),
    );
    expect(findings.map((f) => f.severity)).toEqual(["warning"]);
    expect(hasBlockingFindings(findings)).toBe(false);
  });

  it("rejects eval and new Function in your code", () => {
    expect(codes(base({ modules: [{ path: "src/a.ts", source: "const f = new Function('a', 'return a');" }] }))).toContain(
      "error:dynamic-code",
    );
    expect(codes(base({ modules: [{ path: "src/a.ts", source: "eval('1+1')" }] }))).toContain("error:dynamic-code");
  });

  it("does not mistake method names, comments or strings for the real thing", () => {
    const source = `
      // process.exit(1) and eval('x') are fine in a comment
      const note = "call process.exit() or new Function() in a string";
      obj.eval(1); thing.Buffer.from;
    `;
    expect(checkCloudCompatibility(base({ modules: [{ path: "src/a.ts", source }] }))).toEqual([]);
  });

  it("warns about Buffer in your code only", () => {
    expect(codes(base({ modules: [{ path: "src/a.ts", source: "Buffer.from('x')" }] }))).toEqual(["warning:buffer"]);
    expect(codes(base({ modules: [{ path: "node_modules/x/i.js", source: "Buffer.from('x')" }] }))).toEqual([]);
  });

  it("rejects an oversized bundle", () => {
    expect(codes(base({ bundleBytes: MAX_BUNDLE_BYTES + 1 }))).toContain("error:bundle-size");
    expect(codes(base({ bundleBytes: MAX_BUNDLE_BYTES }))).toEqual([]);
  });

  it("reports each problem once per file", () => {
    const findings = checkCloudCompatibility(
      base({ externalImports: [{ from: "a.ts", specifier: "fs" }, { from: "a.ts", specifier: "fs" }] }),
    );
    expect(findings).toHaveLength(1);
  });

  it("gives every finding a suggestion", () => {
    const findings = checkCloudCompatibility(
      base({
        externalImports: [{ from: "a", specifier: "fs" }],
        modules: [{ path: "a", source: "process.exit(); eval(1); Buffer.from(1)" }],
        bundleBytes: MAX_BUNDLE_BYTES + 1,
      }),
    );
    expect(findings.length).toBeGreaterThanOrEqual(5);
    expect(findings.every((f) => f.suggestion.length > 10)).toBe(true);
  });
});

describe("grouping and naming", () => {
  it("reports one finding per origin, listing every forbidden module", () => {
    const findings = checkCloudCompatibility(
      base({
        externalImports: ["net", "tls", "fs", "crypto"].map((specifier) => ({
          from: "../node_modules/.pnpm/nodemailer@8.0.11/node_modules/nodemailer/lib/shared/index.js",
          specifier,
        })),
      }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ file: "nodemailer (dependency)", message: "Imports fs, net, tls, which are not available in Cloud." });
  });

  it("explains a whole-object process.env read", () => {
    const [finding] = checkCloudCompatibility(base({ modules: [{ path: "src/a.ts", source: "const all = process.env;" }] }));
    expect(finding.message).toContain("literal key");
  });

  it.each([
    ["node_modules/.pnpm/nodemailer@8.0.11/node_modules/nodemailer/lib/a.js", "nodemailer (dependency)"],
    ["../x/node_modules/.pnpm/@scope+pkg@1.0.0/node_modules/@scope/pkg/index.js", "@scope/pkg (dependency)"],
    ["node_modules/left-pad/index.js", "left-pad (dependency)"],
    ["src/hooks/check-in.ts", "src/hooks/check-in.ts"],
  ])("originOf(%s) -> %s", (file: string, expected: string) => {
    expect(originOf(file)).toBe(expected);
  });
});
