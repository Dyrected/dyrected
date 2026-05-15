import fs from "fs-extra";
import path from "path";

export function detectPackageManager(cwd: string): string {
  if (fs.existsSync(path.join(cwd, "bun.lockb")) || fs.existsSync(path.join(cwd, "bun.lock"))) return "bun";
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  return "npm";
}

export async function detectFramework(cwd: string): Promise<"next" | "nuxt" | null> {
  const pkgPath = path.join(cwd, "package.json");
  if (!(await fs.pathExists(pkgPath))) return null;
  try {
    const pkg = await fs.readJson(pkgPath);
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    if (all["next"]) return "next";
    if (all["nuxt"]) return "nuxt";
  } catch {}
  return null;
}
