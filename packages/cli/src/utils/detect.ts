import fs from "fs-extra";
import path from "path";

export function detectPackageManager(cwd: string): string {
  let dir = cwd;
  while (true) {
    if (fs.existsSync(path.join(dir, "bun.lockb")) || fs.existsSync(path.join(dir, "bun.lock"))) return "bun";
    if (fs.existsSync(path.join(dir, "pnpm-lock.yaml"))) return "pnpm";
    if (fs.existsSync(path.join(dir, "yarn.lock"))) return "yarn";

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return "npm";
}

export type SupportedFramework = "next" | "nuxt" | "react" | "vue";

/**
 * Resolve the directory (relative to `cwd`) where `dyrected.config.ts` and the
 * generated `dyrected-types.ts` should live so the framework's TypeScript
 * program actually includes them. This is what makes the generated schema
 * augmentation load — a file outside the program's `include` globs (e.g. a
 * `.ts` at a Nuxt project root) is silently ignored by the type checker.
 *
 * - **Nuxt** keeps its source under `app/` (Nuxt 4 srcDir), which the generated
 *   tsconfig includes as `app/**`. Falls back to the project root otherwise.
 * - **Vite (React/Vue) and Next** conventionally keep source in `src/`.
 * - Falls back to the project root when no source dir convention is detected.
 */
export function resolveAppSrcDir(cwd: string): string {
  const hasNuxt =
    fs.existsSync(path.join(cwd, "nuxt.config.ts")) ||
    fs.existsSync(path.join(cwd, "nuxt.config.js")) ||
    fs.existsSync(path.join(cwd, "nuxt.config.mjs"));
  if (hasNuxt) {
    return fs.existsSync(path.join(cwd, "app")) ? "app" : ".";
  }
  if (fs.existsSync(path.join(cwd, "src"))) return "src";
  return ".";
}

export type FrameworkDetection =
  | { supported: true; framework: SupportedFramework }
  | { supported: false; name: string }
  | null;

const UNSUPPORTED: Record<string, string> = {
  "@angular/core": "Angular",
  astro: "Astro",
  "@sveltejs/kit": "SvelteKit",
  svelte: "Svelte",
  gatsby: "Gatsby",
  "@remix-run/react": "Remix",
};

export async function detectFramework(cwd: string): Promise<FrameworkDetection> {
  const pkgPath = path.join(cwd, "package.json");
  if (!(await fs.pathExists(pkgPath))) return null;
  try {
    const pkg = await fs.readJson(pkgPath);
    const all = { ...pkg.dependencies, ...pkg.devDependencies };

    // Supported — check full-stack frameworks before their underlying libraries
    if (all["next"]) return { supported: true, framework: "next" };
    if (all["nuxt"]) return { supported: true, framework: "nuxt" };

    // Unsupported — check before react/vue since some (Remix, Gatsby) also list react
    for (const [dep, name] of Object.entries(UNSUPPORTED)) {
      if (all[dep]) return { supported: false, name };
    }

    if (all["vue"]) return { supported: true, framework: "vue" };
    if (all["react"]) return { supported: true, framework: "react" };
  } catch {}
  return null;
}
