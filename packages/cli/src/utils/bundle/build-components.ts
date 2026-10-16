import { createHash } from "node:crypto";
import path from "node:path";
import { build, type Plugin } from "esbuild";
import fs from "fs-extra";
import type { CompatFinding } from "./compat-check.js";

/**
 * Builds the browser half of a deployment: the custom admin components (fields, forms, pages, view layouts,
 * slots) as one ES module that exports the same registry `<AdminUI components={...}>` takes.
 *
 * Cloud has no host app to import your components, so the admin loads this file at run time (`componentsUrl`).
 * React and the admin's own API are not bundled: the bundle must share the admin's copy of React or hooks break,
 * so they are read from `globalThis.__DYRECTED_SHARED__`, which the admin fills in before running the module.
 */

export const SHARED_MODULES_GLOBAL = "__DYRECTED_SHARED__";

/** Modules the admin provides. `@dyrected/react` is the same public API under its other name. */
export const SHARED_SPECIFIERS = [
  "react",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-dom",
  "react-dom/client",
  "@dyrected/admin",
  "@dyrected/react",
] as const;

const sharedPlugin: Plugin = {
  name: "dyrected-shared-modules",
  setup(b) {
    const filter = new RegExp(`^(${SHARED_SPECIFIERS.map((s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")).join("|")})$`);
    b.onResolve({ filter }, (args) => ({ path: args.path, namespace: "dyrected-shared" }));
    b.onLoad({ filter: /.*/, namespace: "dyrected-shared" }, (args) => {
      const key = args.path === "@dyrected/react" ? "@dyrected/admin" : args.path;
      return {
        contents: `
          const shared = globalThis[${JSON.stringify(SHARED_MODULES_GLOBAL)}] && globalThis[${JSON.stringify(SHARED_MODULES_GLOBAL)}][${JSON.stringify(key)}];
          if (!shared) throw new Error("Dyrected components were loaded outside the admin: ${args.path} is not available.");
          module.exports = shared;
        `,
        loader: "js",
      };
    });
  },
};

export interface ComponentsBuild {
  js: string;
  map: string;
  sha256: string;
  /** Subresource Integrity string for `componentsIntegrity` / `<script integrity>`. */
  integrity: string;
  bytes: number;
  findings: CompatFinding[];
}

/** Conventional entry files, in order, next to the config. */
const CONVENTIONAL_ENTRIES = ["dyrected.components.tsx", "dyrected.components.ts", "dyrected.components.jsx", "dyrected.components.js"];

/** The components entry: an explicit path, then the config's `admin.componentsEntry`, then a conventional file. */
export async function resolveComponentsEntry(args: {
  explicit?: string;
  fromConfig?: string;
  configDir: string;
  cwd: string;
}): Promise<string | null> {
  if (args.explicit) return path.resolve(args.cwd, args.explicit);
  if (args.fromConfig) return path.resolve(args.configDir, args.fromConfig);
  for (const name of CONVENTIONAL_ENTRIES) {
    const candidate = path.join(args.configDir, name);
    if (await fs.pathExists(candidate)) return candidate;
  }
  return null;
}

export async function buildComponents(entry: string): Promise<ComponentsBuild> {
  if (!(await fs.pathExists(entry))) {
    throw new Error(`Components entry not found: ${path.relative(process.cwd(), entry)}`);
  }

  let result;
  try {
    result = await build({
      entryPoints: [entry],
      bundle: true,
      write: false,
      format: "esm",
      platform: "browser",
      target: "es2020",
      jsx: "automatic",
      minify: true,
      sourcemap: "external",
      metafile: true,
      outfile: "components.js",
      logLevel: "silent",
      define: { "process.env.NODE_ENV": '"production"' },
      plugins: [sharedPlugin],
    });
  } catch (error: any) {
    const lines = (error?.errors as Array<{ text: string; location?: { file: string; line: number } }> | undefined)
      ?.map((e) => `  ${e.location ? `${e.location.file}:${e.location.line} ` : ""}${e.text}`)
      .join("\n");
    throw new Error(`Could not bundle components from ${path.relative(process.cwd(), entry)}:\n${lines ?? error?.message ?? error}`);
  }

  const js = result.outputFiles!.find((file) => file.path.endsWith("components.js"))!.text;
  const map = result.outputFiles!.find((file) => file.path.endsWith("components.js.map"))!.text;
  const digest = createHash("sha256").update(js).digest();

  return {
    js,
    map,
    sha256: digest.toString("hex"),
    integrity: `sha384-${createHash("sha384").update(js).digest("base64")}`,
    bytes: Buffer.byteLength(js),
    findings: componentFindings(Object.keys(result.metafile!.inputs), js),
  };
}

const MAX_COMPONENTS_BYTES = 5 * 1024 * 1024;

/** What would stop a components bundle working in the Cloud-hosted admin. */
export function componentFindings(inputs: string[], js: string): CompatFinding[] {
  const findings: CompatFinding[] = [];

  if (inputs.some((input) => /(^|[\\/])node_modules[\\/](\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/])?vue[\\/]/.test(input))) {
    findings.push({
      severity: "error",
      code: "vue-components",
      message: "The components bundle includes Vue, which the Cloud-hosted admin cannot run yet.",
      suggestion: "Cloud-hosted components must be React. Vue components work in your own Nuxt app, where the admin is embedded with the Vue bridge.",
    });
  }

  if (Buffer.byteLength(js) > MAX_COMPONENTS_BYTES) {
    findings.push({
      severity: "error",
      code: "components-size",
      message: `The components bundle is ${(Buffer.byteLength(js) / 1024 / 1024).toFixed(1)} MB; the limit is ${MAX_COMPONENTS_BYTES / 1024 / 1024} MB.`,
      suggestion: "Drop unused dependencies, or load heavy libraries lazily with dynamic import.",
    });
  }

  return findings;
}
