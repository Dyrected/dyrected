// loadConfig.ts
import path from "path";

export class ConfigLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigLoadError";
  }
}

/**
 * Load a Dyrected configuration file.
 * Supports .ts, .mjs, .cjs directly via jiti.
 */
export async function loadDyrectedConfig(configPath: string): Promise<any> {

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
