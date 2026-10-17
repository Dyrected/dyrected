import { createHash, randomUUID } from "node:crypto";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "fs-extra";
import { resolveAppSrcDir } from "../detect.js";
import { build, type Plugin } from "esbuild";
import { buildComponents, resolveComponentsEntry, type ComponentsBuild } from "./build-components.js";
import { checkCloudCompatibility, type CompatFinding } from "./compat-check.js";

const require = createRequire(import.meta.url);

/**
 * Config keys the hosting platform supplies itself. They are left out of the schema, and the packages that
 * implement them are replaced by an inert stub so importing a config never drags a database driver or a
 * storage SDK into the bundle.
 */
export const PLATFORM_PROVIDED_KEYS = ["db", "storage", "email", "image", "logger", "cache"] as const;
const PLATFORM_PACKAGES = /^@dyrected\/(db|storage)-[^/]+$/;

const STUB_PRELUDE = `
const stub = new Proxy(function dyrectedPlatformStub() {}, {
  get: (_target, key) => (key === "then" ? undefined : stub),
  apply: () => ({}),
  construct: () => ({}),
});
export default stub;
`;

/** Names an importer pulls from `specifier`, so the stub can export each one (ESM needs them declared). */
export function namedImportsFrom(source: string, specifier: string): string[] {
  const names = new Set<string>();
  const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const statements = new RegExp(`(?:import|export)\\s+([^;'"]*?)\\s+from\\s+['"]${escaped}['"]`, "g");
  for (const [, clause] of source.matchAll(statements)) {
    const braces = clause.match(/\{([^}]*)\}/);
    if (!braces) continue;
    for (const part of braces[1].split(",")) {
      const name = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name) && name !== "default") names.add(name);
    }
  }
  return [...names];
}

const platformStubPlugin: Plugin = {
  name: "dyrected-platform-stub",
  setup(b) {
    b.onResolve({ filter: PLATFORM_PACKAGES }, async (args) => {
      const source = args.importer ? await fs.readFile(args.importer, "utf8").catch(() => "") : "";
      const names = namedImportsFrom(source, args.path);
      return { path: `${args.path}?names=${names.join(",")}`, namespace: "dyrected-stub" };
    });
    b.onLoad({ filter: /.*/, namespace: "dyrected-stub" }, (args) => {
      const names = (args.path.split("?names=")[1] ?? "").split(",").filter(Boolean);
      return { contents: STUB_PRELUDE + names.map((name) => `export const ${name} = stub;`).join("\n"), loader: "js" };
    });
  },
};

export interface BundleManifest {
  /** Content hash of the schema and server bundle. Identical inputs give an identical version. */
  version: string;
  createdAt: string;
  schema: { file: string; sha256: string; bytes: number };
  server: { file: string; map: string; sha256: string; bytes: number };
  /** The browser bundle of custom admin components, when the project has any. */
  components?: { file: string; map: string; sha256: string; integrity: string; bytes: number; framework: "react" | "vue" };
  /** Every function in the config, by the id used in `schema.json`. */
  functions: string[];
  compatibility: { ok: boolean; findings: CompatFinding[] };
}

export interface BuildBundleOptions {
  /** Absolute path to `dyrected.config.ts`. */
  configPath: string;
  /** Directory the versioned bundle folder is written into. */
  outDir: string;
  /** Skip writing files; only report compatibility. */
  checkOnly?: boolean;
  /**
   * Entry file whose default export is the admin component registry. Defaults to the config's
   * `admin.componentsEntry`, then to `dyrected.components.{tsx,ts,jsx,js}` next to the config. Omit all of them
   * and no components bundle is built.
   */
  componentsEntry?: string;
}

export interface BuildBundleResult {
  manifest: BundleManifest;
  /** Where the bundle was written, or `null` for a check-only run. */
  directory: string | null;
}

const sha256 = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");

/**
 * Builds the deployable artifact for a config (parity spec §3.1):
 * - `schema.json`: the config with every function replaced by a `FunctionRef`.
 * - `server.js` (+ source map): one self-contained ESM bundle exporting `functions`, a map of those ids to functions.
 * - `manifest.json`: content hash, function ids and the compatibility report.
 */
export async function buildBundle(options: BuildBundleOptions): Promise<BuildBundleResult> {
  const { configPath, outDir } = options;
  const projectDir = path.dirname(configPath);

  // The config is bundled once and evaluated from the bundle, so the schema and the functions come from the
  // same module instance and always agree on ids. Platform adapters are stubbed in the bundle, so loading
  // a config here never opens a database connection.
  const runtimeEntry = require.resolve("@dyrected/core/runtime");
  const entry = `
    import * as mod from ${JSON.stringify(configPath)};
    import { extractFunctionRefs } from ${JSON.stringify(runtimeEntry)};
    const config = mod.default ?? mod.config ?? mod;
    const extracted = extractFunctionRefs(config, { omit: ${JSON.stringify(PLATFORM_PROVIDED_KEYS)} });
    export const schema = extracted.schema;
    export const functions = Object.fromEntries(extracted.functions);
  `;

  let result;
  try {
    result = await build({
      stdin: { contents: entry, resolveDir: projectDir, sourcefile: "dyrected-bundle-entry.js", loader: "js" },
      bundle: true,
      write: false,
      format: "esm",
      platform: "node",
      target: "es2022",
      sourcemap: "external",
      metafile: true,
      outfile: "server.js",
      logLevel: "silent",
      define: { "process.env.NODE_ENV": '"production"' },
      plugins: [platformStubPlugin],
      loader: { ".node": "file" },
    });
  } catch (error: any) {
    throw new Error(`Could not bundle ${path.relative(process.cwd(), configPath)}:\n${formatBuildError(error)}`);
  }

  const serverFile = result.outputFiles!.find((file) => file.path.endsWith("server.js"))!;
  const mapFile = result.outputFiles!.find((file) => file.path.endsWith("server.js.map"))!;
  const serverJs = serverFile.text;

  const modules = await Promise.all(
    Object.keys(result.metafile!.inputs)
      .filter((file) => !file.startsWith("<") && !file.startsWith("dyrected-stub:") && !file.includes("dyrected-bundle-entry"))
      .map(async (file) => {
        const absolute = path.resolve(process.cwd(), file);
        const source = await fs.readFile(absolute, "utf8").catch(() => "");
        return { path: path.relative(projectDir, absolute), source };
      }),
  );

  const externalImports = Object.entries(result.metafile!.inputs).flatMap(([from, input]) =>
    input.imports
      .filter((imp) => imp.external)
      .map((imp) => ({ from: path.relative(projectDir, path.resolve(process.cwd(), from)), specifier: imp.path })),
  );

  const findings = checkCloudCompatibility({
    modules,
    externalImports,
    bundleBytes: Buffer.byteLength(serverJs),
  });

  const { schema, functionIds } = await evaluateBundle(serverJs);
  const schemaJson = JSON.stringify(schema, null, 2);

  const componentsEntry = await resolveComponentsEntry({
    explicit: options.componentsEntry,
    fromConfig: (schema as { admin?: { componentsEntry?: string } } | undefined)?.admin?.componentsEntry,
    configDir: projectDir,
    cwd: process.cwd(),
  });
  const components: ComponentsBuild | null = componentsEntry
    ? await buildComponents(componentsEntry, { rootDir: projectDir, srcDir: path.resolve(projectDir, resolveAppSrcDir(projectDir)) })
    : null;
  if (components) findings.push(...components.findings);

  // The components hash is part of the version, so changing only a component still produces a new deployment.
  const version = sha256(`${schemaJson}\0${serverJs}${components ? `\0${components.sha256}` : ""}`).slice(0, 12);
  const manifest: BundleManifest = {
    version,
    createdAt: new Date().toISOString(),
    schema: { file: "schema.json", sha256: sha256(schemaJson), bytes: Buffer.byteLength(schemaJson) },
    server: {
      file: "server.js",
      map: "server.js.map",
      sha256: sha256(serverJs),
      bytes: Buffer.byteLength(serverJs),
    },
    ...(components
      ? {
          components: {
            file: "components.js",
            map: "components.js.map",
            sha256: components.sha256,
            integrity: components.integrity,
            bytes: components.bytes,
            framework: components.framework,
          },
        }
      : {}),
    functions: functionIds,
    compatibility: { ok: !findings.some((f) => f.severity === "error"), findings },
  };

  if (options.checkOnly) return { manifest, directory: null };

  const directory = path.join(outDir, version);
  await fs.ensureDir(directory);
  await Promise.all([
    fs.writeFile(path.join(directory, "schema.json"), schemaJson),
    fs.writeFile(path.join(directory, "server.js"), serverJs),
    fs.writeFile(path.join(directory, "server.js.map"), mapFile.text),
    ...(components
      ? [fs.writeFile(path.join(directory, "components.js"), components.js), fs.writeFile(path.join(directory, "components.js.map"), components.map)]
      : []),
    fs.writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2)),
  ]);

  return { manifest, directory };
}

function formatBuildError(error: any): string {
  const errors = error?.errors as Array<{ text: string; location?: { file: string; line: number } }> | undefined;
  if (!errors?.length) return String(error?.message ?? error);
  return errors
    .map((e) => `  ${e.location ? `${e.location.file}:${e.location.line} ` : ""}${e.text}`)
    .join("\n");
}

/** Runs the freshly built bundle once to read back its schema and the ids of its functions. */
async function evaluateBundle(serverJs: string): Promise<{ schema: unknown; functionIds: string[] }> {
  const file = path.join(os.tmpdir(), `dyrected-bundle-${randomUUID()}.mjs`);
  await fs.writeFile(file, serverJs);
  try {
    const mod = await import(pathToFileURL(file).href);
    return { schema: mod.schema, functionIds: Object.keys(mod.functions).sort() };
  } finally {
    await fs.remove(file);
  }
}
