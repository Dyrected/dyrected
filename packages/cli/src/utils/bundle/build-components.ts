import { createHash } from "node:crypto";
import path from "node:path";
import { build, type Plugin } from "esbuild";
import fs from "fs-extra";
import type { CompatFinding } from "./compat-check.js";
import { VUE_AUTO_IMPORTS, vueSfcPlugin } from "./vue-sfc-plugin.js";

/**
 * Builds the browser half of a deployment: the custom admin components (fields, forms, pages, view layouts,
 * slots) as one ES module that exports the same registry `<AdminUI components={...}>` takes.
 *
 * Cloud has no host app to import your components, so the admin loads this file at run time (`componentsUrl`).
 * React and the admin's own API are not bundled: the bundle must share the admin's copy of React or hooks break,
 * so they are read from `globalThis.__DYRECTED_SHARED__`, which the admin fills in before running the module.
 */

export const SHARED_MODULES_GLOBAL = "__DYRECTED_SHARED__";

/** Modules the admin provides to the bundle, so the bundle shares its React and its admin context. */
export const SHARED_SPECIFIERS = [
  "react",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-dom",
  "react-dom/client",
  "@dyrected/admin",
  "@dyrected/admin/public",
] as const;

/** Modules that only exist inside a Nuxt app. They cannot work in the Cloud-hosted admin, so using one is an error. */
const NUXT_ONLY = /^(#imports|#app|#components|#build|#head|nuxt\/app|nuxt\/schema|@nuxt\/.*)$/;

const sharedPlugin: Plugin = {
  name: "dyrected-shared-modules",
  setup(b) {
    const filter = new RegExp(`^(${SHARED_SPECIFIERS.map((s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")).join("|")})$`);
    b.onResolve({ filter }, (args) => ({ path: args.path, namespace: "dyrected-shared" }));
    b.onLoad({ filter: /.*/, namespace: "dyrected-shared" }, (args) => {
      // The admin's `/public` entry is the same API the admin passes in as `@dyrected/admin`. `@dyrected/react` and
      // `@dyrected/vue` are bundled normally: their own code comes along, and what they re-export from the admin
      // resolves back to the shared copy through this plugin.
      const key = args.path === "@dyrected/admin/public" ? "@dyrected/admin" : args.path;
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

/** Records Nuxt-only imports as findings and resolves them to a module that throws a clear error if it is ever run. */
function nuxtOnlyPlugin(found: Set<string>): Plugin {
  return {
    name: "dyrected-nuxt-only",
    setup(b) {
      b.onResolve({ filter: NUXT_ONLY }, (args) => {
        found.add(args.path);
        return { path: args.path, namespace: "dyrected-nuxt-only" };
      });
      b.onLoad({ filter: /.*/, namespace: "dyrected-nuxt-only" }, (args) => ({
        contents: `const fail = () => { throw new Error(${JSON.stringify(`"${args.path}" is only available inside a Nuxt app and cannot run in the Cloud-hosted admin.`)}); };
          module.exports = new Proxy(function () {}, { get: (_t, key) => (key === "__esModule" ? false : fail), apply: fail });`,
        loader: "js",
      }));
    },
  };
}

/**
 * Resolves the path conventions Nuxt and Vite projects use: `~~/x` is the project root, `~/x` and `@/x` are the
 * source directory (`app/` in Nuxt 4, `src/` in Vite, otherwise the root). Without this, a component that imports
 * `~/utils/format` would only build where the framework's own tooling has generated its path map.
 */
function projectAliasPlugin(roots: ProjectRoots): Plugin {
  return {
    name: "dyrected-project-aliases",
    setup(b) {
      b.onResolve({ filter: /^(~~|~|@)\// }, (args) => {
        const [prefix, ...rest] = args.path.split("/");
        return b.resolve(`./${rest.join("/")}`, {
          resolveDir: prefix === "~~" ? roots.rootDir : roots.srcDir,
          kind: args.kind,
          importer: args.importer,
          namespace: args.namespace,
        });
      });
    },
  };
}

/** Gives free uses of Vue's core APIs (`ref`, `computed`, ...) the same automatic import Nuxt provides. */
const VUE_AUTO_IMPORT_ID = "dyrected:vue-auto-imports";
function vueAutoImportPlugin(resolveDir: string): Plugin {
  return {
    name: "dyrected-vue-auto-imports",
    setup(b) {
      b.onResolve({ filter: /^dyrected:vue-auto-imports$/ }, () => ({ path: VUE_AUTO_IMPORT_ID, namespace: "dyrected-vue-auto" }));
      b.onLoad({ filter: /.*/, namespace: "dyrected-vue-auto" }, () => ({
        contents: `export { ${VUE_AUTO_IMPORTS.join(", ")} } from "vue";`,
        loader: "js",
        resolveDir,
      }));
    },
  };
}

export interface ProjectRoots {
  /** The project root (where the config lives). `~~/` resolves here. */
  rootDir: string;
  /** The source directory. `~/` and `@/` resolve here. */
  srcDir: string;
}

export interface ComponentsBuild {
  /** Which UI framework the registry was written in. Vue registries are wrapped for the React admin. */
  framework: "react" | "vue";
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

export async function buildComponents(entry: string, roots?: ProjectRoots): Promise<ComponentsBuild> {
  if (!(await fs.pathExists(entry))) {
    throw new Error(`Components entry not found: ${path.relative(process.cwd(), entry)}`);
  }

  const entryDir = path.dirname(entry);
  const projectRoots = roots ?? { rootDir: entryDir, srcDir: entryDir };
  const nuxtOnly = new Set<string>();

  const run = async (options: { vue: boolean }) => {
    const common = {
      bundle: true,
      write: false,
      format: "esm" as const,
      platform: "browser" as const,
      target: "es2020",
      jsx: "automatic" as const,
      minify: true,
      sourcemap: "external" as const,
      metafile: true,
      outfile: "components.js",
      logLevel: "silent" as const,
      define: {
        "process.env.NODE_ENV": '"production"',
        // Vue's feature flags: keep the options API, drop devtools and hydration diagnostics.
        __VUE_OPTIONS_API__: "true",
        __VUE_PROD_DEVTOOLS__: "false",
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false",
      },
      plugins: [sharedPlugin, nuxtOnlyPlugin(nuxtOnly), projectAliasPlugin(projectRoots), vueSfcPlugin, vueAutoImportPlugin(entryDir)],
      inject: [VUE_AUTO_IMPORT_ID],
    };

    if (!options.vue) return build({ ...common, entryPoints: [entry], inject: [] });

    // A Vue registry holds Vue components, which the React admin cannot render directly. The bridge turns each one
    // into a React component that mounts it as an island; only its entry point is bundled, not the Nuxt-facing parts.
    return build({
      ...common,
      stdin: {
        contents: `import registry from ${JSON.stringify(entry)};
          import { wrapComponents } from "@dyrected/vue/bridge";
          export default wrapComponents(registry, null);`,
        resolveDir: entryDir,
        sourcefile: "dyrected-vue-entry.js",
        loader: "js",
      },
    });
  };

  const fail = (error: any): never => {
    const lines = (error?.errors as Array<{ text: string; location?: { file: string; line: number } }> | undefined)
      ?.map((e) => `  ${e.location ? `${path.relative(process.cwd(), e.location.file)}:${e.location.line} ` : ""}${e.text}`)
      .join("\n");
    const hint = /@dyrected\/vue\/bridge/.test(lines ?? "")
      ? "\n  Update @dyrected/vue to a version that includes the ./bridge entry point."
      : "";
    throw new Error(`Could not bundle components from ${path.relative(process.cwd(), entry)}:\n${lines ?? error?.message ?? error}${hint}`);
  };

  type BuildOutput = Awaited<ReturnType<typeof run>>;
  const usesVue = (output: BuildOutput) =>
    Object.keys(output.metafile!.inputs).some(
      (input) =>
        /\.vue$/.test(input) || /(^|[\\/])node_modules[\\/](\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/])?@dyrected[\\/]vue[\\/]/.test(input),
    );

  // The first pass decides the framework: any Vue component, or the Vue package, in the graph makes this a Vue registry.
  let output: BuildOutput;
  let framework: "react" | "vue" = "react";
  let wrapped = false;
  try {
    output = await run({ vue: false });
    if (usesVue(output)) framework = "vue";
  } catch (firstError) {
    // A Vue registry can fail the plain pass only because the Vue wrapper was not applied; confirm by trying as Vue.
    try {
      output = await run({ vue: true });
      framework = "vue";
      wrapped = true;
    } catch {
      return fail(firstError);
    }
  }

  if (framework === "vue" && !wrapped) {
    try {
      output = await run({ vue: true });
    } catch (error) {
      return fail(error);
    }
  }
  return finish(output, framework);

  function finish(output: BuildOutput, framework: "react" | "vue"): ComponentsBuild {
    const js = output.outputFiles!.find((file) => file.path.endsWith("components.js"))!.text;
    const map = output.outputFiles!.find((file) => file.path.endsWith("components.js.map"))!.text;
    return {
      framework,
      js,
      map,
      sha256: createHash("sha256").update(js).digest("hex"),
      integrity: `sha384-${createHash("sha384").update(js).digest("base64")}`,
      bytes: Buffer.byteLength(js),
      findings: componentFindings(js, [...nuxtOnly]),
    };
  }
}

const MAX_COMPONENTS_BYTES = 5 * 1024 * 1024;

/** What would stop a components bundle working in the Cloud-hosted admin. */
export function componentFindings(js: string, nuxtOnlyImports: string[] = []): CompatFinding[] {
  const findings: CompatFinding[] = [];

  for (const specifier of nuxtOnlyImports) {
    findings.push({
      severity: "error",
      code: "nuxt-only-import",
      message: `A component imports "${specifier}", which only exists inside a Nuxt app.`,
      suggestion:
        "The Cloud-hosted admin is not a Nuxt app. Pass what the component needs as props, use the Dyrected composables (useDyrectedForm, useAdminNavigate, ...), or call the API with the Dyrected client.",
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
