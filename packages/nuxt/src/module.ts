import {
  defineNuxtModule,
  addPlugin,
  createResolver,
  addServerHandler,
  addComponent,
  addImports,
  addServerPlugin,
} from "@nuxt/kit";
import { join } from "path";
import { existsSync } from "fs";
import { DyrectedConfig } from "@dyrected/core";

export interface ModuleOptions extends DyrectedConfig {
  /**
   * Mount the Dyrected API on this path.
   * @default '/dyrected'
   */
  apiBase?: string;
  /** API key passed to the SDK client for request authentication. */
  apiKey?: string;
  /** Site ID used to scope content to a specific tenant site. */
  siteId?: string;
  /** Optional manual path to the dyrected config file (absolute or relative to root). */
  configPath?: string;
}

import { NuxtModule } from "@nuxt/schema";

const module: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@dyrected/nuxt",
    configKey: "dyrected",
  },
  defaults: {
    apiBase: "/dyrected",
  } as any,
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    // 1. Add Server Handler (Nitro) - only if apiBase is a relative path
    if (options.apiBase?.startsWith("/")) {
      addServerHandler({
        route: `${options.apiBase}/**`,
        handler: resolver.resolve("./runtime/server/handler"),
      });
    }

    // 2. Add Components
    addComponent({
      name: "DyrectedMedia",
      filePath: resolver.resolve("./runtime/components/DyrectedMedia.vue"),
    });

    addComponent({
      name: "DyrectedAdmin",
      filePath: resolver.resolve("./runtime/components/DyrectedAdmin.vue"),
    });

    // 3. Add Composables
    addImports([
      { name: "useDyrected", from: resolver.resolve("./runtime/composables/useDyrected") },
      { name: "useDyrectedDoc", from: resolver.resolve("./runtime/composables/useDyrected") },
      { name: "useDyrectedCollection", from: resolver.resolve("./runtime/composables/useDyrected") },
      { name: "useDyrectedGlobal", from: resolver.resolve("./runtime/composables/useDyrected") },
      { name: "useDyrectedAuth", from: resolver.resolve("./runtime/composables/useDyrectedAuth") },
      { name: "useLivePreview", from: resolver.resolve("./runtime/composables/useLivePreview") },
    ]);

    // 4. Pass options to runtime
    // Private config for server-side (contains full engine config)
    const runtimeConfig = {
      ...options,
      baseUrl: options.apiBase,
    };

    // Try to find the config file path to allow the Nitro plugin to re-import the DB instance
    const configFiles = ["dyrected.config.ts", "dyrected.config.js", "dyrected.config.mjs"];
    let configPath = options.configPath ? join(nuxt.options.rootDir, options.configPath) : "";

    if (!configPath) {
      for (const file of configFiles) {
        const fullPath = join(nuxt.options.rootDir, file);
        if (existsSync(fullPath)) {
          configPath = fullPath;
          break;
        }
      }
    }

    if (configPath) {
      console.log("[dyrected/nuxt] Auto-detected config at:", configPath);
      (runtimeConfig as any).configPath = configPath;
      addServerPlugin(resolver.resolve("./runtime/server/plugins/db"));
    } else {
      console.warn("[dyrected/nuxt] Could not find dyrected.config.ts. Self-hosted database re-hydration might fail.");
    }

    // Ensure 'db' is attached but non-enumerable to avoid serialization crashes in DevTools.
    // The Nitro plugin will re-attach it on the server if it's lost.
    if ((options as any).db) {
      Object.defineProperty(runtimeConfig, "db", {
        value: (options as any).db,
        enumerable: false,
        configurable: true,
        writable: true,
      });
    }

    nuxt.options.runtimeConfig.dyrected = runtimeConfig as any;

    // Public config for client-side
    nuxt.options.runtimeConfig.public.dyrected = {
      baseUrl: options.apiBase,
      apiKey: options.apiKey,
      siteId: options.siteId,
    };
  },
});

export default module;
