// @ts-ignore
import { defineNitroPlugin } from "nitropack/runtime";
// @ts-ignore
import { useRuntimeConfig } from "#imports";

export default defineNitroPlugin(async (nitroApp: any) => {
  const runtimeConfig = useRuntimeConfig().dyrected;

  // If db is missing from runtimeConfig (due to serialization),
  // try to re-import it from the config file if path is provided.
  if (runtimeConfig?.configPath) {
    try {
      const configPath = (runtimeConfig as any).configPath;
      let userConfig: any = null;
      try {
        // @ts-ignore
        const { default: jiti } = await import("jiti");
        // @ts-ignore
        const loader = jiti(import.meta.url, { esmResolve: true, interopDefault: true });
        userConfig = loader(configPath);
      } catch (err) {
        // Fallback to standard dynamic import
        const { pathToFileURL } = await import("url");
        const imported = await import(pathToFileURL(configPath).href);
        userConfig = imported.default || imported;
      }
      if (userConfig) {
        (globalThis as any).__dyrected_config = userConfig;
        
        if (userConfig.db) {
          (globalThis as any).__dyrected_db = userConfig.db;
          console.log("[dyrected/nuxt] Database re-attached to global context");
        }
        if (userConfig.storage) {
          (globalThis as any).__dyrected_storage = userConfig.storage;
          console.log("[dyrected/nuxt] Storage adapter re-attached to global context");
        }
      }
    } catch (err) {
      console.error("[dyrected/nuxt] Failed to re-attach database:", err);
    }
  }
});
