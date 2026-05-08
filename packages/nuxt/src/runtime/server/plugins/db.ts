// @ts-ignore
import { defineNitroPlugin } from "nitro/runtime";
// @ts-ignore
import { useRuntimeConfig } from "#imports";

export default defineNitroPlugin(async (nitroApp: any) => {
  const runtimeConfig = useRuntimeConfig().dyrected;

  // If db is missing from runtimeConfig (due to serialization),
  // try to re-import it from the config file if path is provided.
  if (runtimeConfig?.configPath) {
    try {
      const configPath = (runtimeConfig as any).configPath;
      const { default: userConfig } = await import(configPath);
      if (userConfig && userConfig.db) {
        // Use globalThis to share the instance with the handler, 
        // bypassing the frozen runtimeConfig object.
        (globalThis as any).__dyrected_db = userConfig.db;
        console.log("[dyrected/nuxt] Database re-attached to global context");
      }
    } catch (err) {
      console.error("[dyrected/nuxt] Failed to re-attach database:", err);
    }
  }
});
