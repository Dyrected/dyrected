import fs from "fs-extra";
import path from "path";

export function detectPackageManager(cwd: string): string {
  if (fs.existsSync(path.join(cwd, "bun.lockb")) || fs.existsSync(path.join(cwd, "bun.lock"))) return "bun";
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  return "npm";
}

export type SupportedFramework = "next" | "nuxt" | "react" | "vue";

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
