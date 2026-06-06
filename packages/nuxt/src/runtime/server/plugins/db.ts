// @ts-ignore
import { useRuntimeConfig } from "#imports";

const defineNitroPlugin = (def: any) => def;

export default defineNitroPlugin(async (nitroApp: any) => {
  const runtimeConfig = useRuntimeConfig().dyrected;

  // If db is missing from runtimeConfig (due to serialization),
  // try to re-import it from the config file if path is provided.
  if (runtimeConfig?.configPath) {
    try {
      const configPath = (runtimeConfig as any).configPath;
      // @ts-ignore
      const { loadDyrectedConfig, ConfigLoadError } = await import("./dyrected-load-config.ts");
      let userConfig: any = null;
      // Load the Dyrected configuration using the shared utility.
      // It validates .js files and works with both jiti v1 and v2.
      try {
        userConfig = await loadDyrectedConfig(configPath);
      } catch (err) {
        if (err instanceof ConfigLoadError) {
          // Abort startup with a clear message – user must fix the config file.
          console.error("[dyrected/nuxt] Config load error:", (err as any).message);
          throw err;
        }
        // Fallback for unexpected errors (e.g., missing file). Keep original warning.
        console.warn("[dyrected/nuxt] Failed to load config via loadDyrectedConfig, falling back to native import.");
        const { pathToFileURL } = await import("url");
        const imported = await import(pathToFileURL(configPath).href);
        userConfig = imported.default || imported;
      }
      if (userConfig) {
       const configObj = (userConfig.default && (userConfig.default.collections || userConfig.default.globals || userConfig.default.db)) ? userConfig.default : userConfig;
        // Attach config and start hot‑reload watcher in dev mode.
        (globalThis as any).__dyrected_config = configObj;
        // If we are in Nuxt dev mode, watch the config file for changes and reload it on the fly.
        if (process.env.NODE_ENV !== 'production') {
          const { watch } = await import('fs');
          let debounceTimer: NodeJS.Timeout | null = null;
          const reload = async () => {
            try {
              const newConfig = await loadDyrectedConfig(configPath);
              const newObj = (newConfig.default && (newConfig.default.collections || newConfig.default.globals || newConfig.default.db)) ? newConfig.default : newConfig;
              (globalThis as any).__dyrected_config = newObj;
              (globalThis as any).__dyrected_config_version = ((globalThis as any).__dyrected_config_version || 0) + 1;
              if (newObj.db) {
                (globalThis as any).__dyrected_db = newObj.db;
                console.log('[dyrected/nuxt] Database hot‑reloaded');
              }
              if (newObj.storage) {
                (globalThis as any).__dyrected_storage = newObj.storage;
                console.log('[dyrected/nuxt] Storage hot‑reloaded');
              }
              console.log('[dyrected/nuxt] Configuration hot-reloaded (version ' + (globalThis as any).__dyrected_config_version + ')');
            } catch (e) {
              console.error('[dyrected/nuxt] Hot‑reload failed:', e);
            }
          };
          watch(configPath, (eventType: string) => {
            if (eventType === 'change') {
              if (debounceTimer) clearTimeout(debounceTimer);
              debounceTimer = setTimeout(reload, 200);
            }
          });
        }
        
        if (configObj.db) {
          (globalThis as any).__dyrected_db = configObj.db;
          console.log("[dyrected/nuxt] Database re-attached to global context");
        }
        if (configObj.storage) {
          (globalThis as any).__dyrected_storage = configObj.storage;
          console.log("[dyrected/nuxt] Storage adapter re-attached to global context");
        }
      }
    } catch (err) {
      console.error("[dyrected/nuxt] Failed to re-attach database:", err);
    }
  }
});
