import { builtinModules } from "node:module";

/**
 * Cloud compatibility check (parity spec §6.1).
 *
 * Cloud runs your config functions in a sandbox with no filesystem, sockets or native code. This finds
 * what would not run there, at deploy time, with a suggestion, instead of in production.
 */

export type FindingSeverity = "error" | "warning";

export interface CompatFinding {
  severity: FindingSeverity;
  code: string;
  message: string;
  /** The source file the problem comes from, when known. */
  file?: string;
  suggestion: string;
}

/** What the check needs to know about a bundle, independent of the bundler that produced it. */
export interface BundleInput {
  /** Every module that went into the bundle: its path and its source text. */
  modules: Array<{ path: string; source: string }>;
  /** Imports the bundler left unresolved (externals), with the module that asked for them. */
  externalImports: Array<{ from: string; specifier: string }>;
  /** Size of the final server bundle in bytes. */
  bundleBytes: number;
}

export const MAX_BUNDLE_BYTES = 5 * 1024 * 1024;

const FORBIDDEN_BUILTINS = new Set([
  "fs",
  "fs/promises",
  "child_process",
  "net",
  "tls",
  "dgram",
  "http",
  "https",
  "http2",
  "os",
  "worker_threads",
  "cluster",
  "vm",
  "v8",
  "dns",
  "readline",
  "repl",
  "inspector",
]);

const BUILTIN_NAMES = new Set(builtinModules.flatMap((name) => [name, name.replace(/^node:/, "")]));

const normalizeBuiltin = (specifier: string): string | null => {
  const name = specifier.replace(/^node:/, "");
  return BUILTIN_NAMES.has(name) ? name : null;
};

/**
 * Names where a problem comes from: your own files by project-relative path, dependencies by package
 * (`nodemailer`, not a path through `.pnpm`).
 */
export function originOf(file: string): string {
  const marker = /node_modules[\\/](?:\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/])?((?:@[^\\/]+[\\/])?[^\\/]+)(?![\\/]node_modules)/g;
  let pkg: string | undefined;
  for (const match of file.matchAll(marker)) pkg = match[1];
  return pkg ? `${pkg.replace(/\\/g, "/")} (dependency)` : file.replace(/\\/g, "/");
}

const isDependency = (file: string) => /(^|[\\/])node_modules[\\/]/.test(file);

/** Removes comments and string contents so scans match code, not prose. */
function stripNoise(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:\\])\/\/.*$/gm, "$1")
    .replace(/(["'`])(?:\\.|(?!\1)[^\\\n])*\1/g, '""');
}

const SUGGESTIONS = {
  builtin: "Use `fetch` for HTTP or a platform service. Node core modules are not available in Cloud.",
  native: "Use a pure JavaScript or WebAssembly alternative. Native addons cannot be loaded in Cloud.",
  process: "Declare the value as a secret and read it with `process.env.KEY`. Other `process` APIs are not available.",
  dynamic: "Dynamic code evaluation is not supported. Write the logic as a normal function.",
  buffer: "Use `Uint8Array` and `TextEncoder`/`TextDecoder`. `Buffer` is not provided in Cloud.",
  size: "Remove unused dependencies, or move heavy logic into a platform service.",
} as const;

export function checkCloudCompatibility(input: BundleInput): CompatFinding[] {
  const findings: CompatFinding[] = [];

  // One finding per origin listing every forbidden module, so a dependency that pulls in six of them
  // reads as one problem with one cause.
  const forbiddenByOrigin = new Map<string, Set<string>>();
  for (const { from, specifier } of input.externalImports) {
    const builtin = normalizeBuiltin(specifier);
    if (builtin && FORBIDDEN_BUILTINS.has(builtin)) {
      const origin = originOf(from);
      forbiddenByOrigin.set(origin, (forbiddenByOrigin.get(origin) ?? new Set()).add(builtin));
    } else if (!builtin && /\.node$/.test(specifier)) {
      findings.push({
        severity: "error",
        code: "native-addon",
        message: `Loads the native addon "${specifier}".`,
        file: originOf(from),
        suggestion: SUGGESTIONS.native,
      });
    }
  }
  for (const [origin, modules] of forbiddenByOrigin) {
    const list = [...modules].sort().join(", ");
    findings.push({
      severity: "error",
      code: "node-builtin",
      message: `Imports ${list}, which ${modules.size === 1 ? "is" : "are"} not available in Cloud.`,
      file: origin,
      suggestion: SUGGESTIONS.builtin,
    });
  }

  for (const { path, source } of input.modules) {
    const code = stripNoise(source);
    // Problems in your own code stop the deploy; the same patterns inside a dependency are usually
    // feature-detected (`typeof process !== "undefined"`), so they are surfaced but do not block.
    const severity: FindingSeverity = isDependency(path) ? "warning" : "error";

    // `process.env.KEY` is the declared-secrets shim. Everything else on `process` is unavailable.
    const processUses = new Set<string>();
    for (const match of code.matchAll(/\bprocess\s*\.\s*([A-Za-z_$][\w$]*)(?:\s*\.\s*([A-Za-z_$][\w$]*))?/g)) {
      const [, first, second] = match;
      if (first === "env" && second && second !== "NODE_ENV") continue;
      if (first === "env" && second === "NODE_ENV") continue;
      processUses.add(first === "env" ? "process.env" : `process.${first}`);
    }
    for (const use of processUses) {
      findings.push({
        severity,
        code: "process-api",
        message:
          use === "process.env"
            ? "Reads `process.env` as a whole; only `process.env.KEY` with a literal key is supported."
            : `Uses ${use}, which is not available in Cloud.`,
        file: originOf(path),
        suggestion: SUGGESTIONS.process,
      });
    }

    if (/(^|[^.\w$])eval\s*\(/.test(code) || /\bnew\s+Function\s*\(/.test(code)) {
      findings.push({
        severity,
        code: "dynamic-code",
        message: "Evaluates code at runtime with `eval` or `new Function`.",
        file: originOf(path),
        suggestion: SUGGESTIONS.dynamic,
      });
    }

    if (!isDependency(path) && /(^|[^.\w$])Buffer\s*[.(]/.test(code)) {
      findings.push({
        severity: "warning",
        code: "buffer",
        message: "Uses `Buffer`.",
        file: originOf(path),
        suggestion: SUGGESTIONS.buffer,
      });
    }
  }

  if (input.bundleBytes > MAX_BUNDLE_BYTES) {
    findings.push({
      severity: "error",
      code: "bundle-size",
      message: `The server bundle is ${(input.bundleBytes / 1024 / 1024).toFixed(1)} MB; the limit is ${MAX_BUNDLE_BYTES / 1024 / 1024} MB.`,
      suggestion: SUGGESTIONS.size,
    });
  }

  return dedupe(findings);
}

function dedupe(findings: CompatFinding[]): CompatFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.code}|${finding.file ?? ""}|${finding.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const hasBlockingFindings = (findings: CompatFinding[]) => findings.some((f) => f.severity === "error");
