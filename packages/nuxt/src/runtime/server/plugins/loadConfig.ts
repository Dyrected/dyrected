// loadConfig.ts
import path from "path";
import { promises as fs } from "fs";

export class ConfigLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigLoadError";
  }
}

/**
 * Load a Dyrected configuration file.
 * Supports .ts, .mjs, .cjs directly via jiti.
 * For .js files it validates that no TypeScript‑only syntax is present.
 */
export async function loadDyrectedConfig(configPath: string): Promise<any> {
  const ext = path.extname(configPath);
  const raw = await fs.readFile(configPath, "utf-8");

  // Simple heuristic: if a .js file contains a non‑null‑assertion or TypeScript token,
  // reject it with a helpful error.
  if (ext === ".js" && /[!?:]/.test(raw)) {
    throw new ConfigLoadError(
      `The file "${configPath}" is a .js file but contains TypeScript‑specific syntax. ` +
        "Rename it to .ts (or .mjs/.cjs) or remove the TypeScript tokens."
    );
  }

  const jitiMod = await import("jiti");
  const resolvedPath = path.resolve(configPath);
  
  if (typeof (jitiMod as any).createJiti === "function") {
    // jiti v2 API
    const jitiInstance = (jitiMod as any).createJiti(import.meta.url, {
      esmResolve: true,
      interopDefault: true,
    });
    if ((jitiInstance as any).cache) {
      delete (jitiInstance as any).cache[resolvedPath];
      for (const k of Object.keys((jitiInstance as any).cache)) {
        if (path.resolve(k) === resolvedPath) {
          delete (jitiInstance as any).cache[k];
        }
      }
    }
    return await jitiInstance.import(configPath);
  } else {
    // jiti v1 API (default export is a function that returns the loader)
    const jitiDefault = (jitiMod as any).default || jitiMod;
    const loader = jitiDefault(import.meta.url, { esmResolve: true, interopDefault: true });
    if (loader.cache) {
      delete loader.cache[resolvedPath];
      for (const k of Object.keys(loader.cache)) {
        if (path.resolve(k) === resolvedPath) {
          delete loader.cache[k];
        }
      }
    }
    return loader(configPath);
  }
}
