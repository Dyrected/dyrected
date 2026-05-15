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
  /** Base URL for the Dyrected API. Defaults to the host + apiBase. */
  baseUrl?: string;
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

    // 2. Add Plugin
    addPlugin(resolver.resolve("./runtime/plugin"));

    // 3. Add Components
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
      { name: "useDyrectedClient", from: resolver.resolve("./runtime/composables/useDyrected") },
      { name: "useDyrectedData", from: resolver.resolve("./runtime/composables/useDyrected") },
      { name: "useDyrectedCollectionData", from: resolver.resolve("./runtime/composables/useDyrected") },
      { name: "useDyrectedGlobalData", from: resolver.resolve("./runtime/composables/useDyrected") },
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

    // Combine baseUrl and apiBase if necessary
    const apiBase = options.apiBase || "/dyrected";
    let baseUrl = process.env.NUXT_PUBLIC_DYRECTED_URL || options.baseUrl || apiBase;

    // If baseUrl is an absolute URL and doesn't already include apiBase, append it
    if (baseUrl.startsWith("http") && apiBase.startsWith("/") && !baseUrl.endsWith(apiBase)) {
      baseUrl = baseUrl.replace(/\/$/, "") + apiBase;
    }

    // 5. Public config for client-side
    nuxt.options.runtimeConfig.public.dyrected = {
      baseUrl,
      apiKey: process.env.NUXT_PUBLIC_DYRECTED_API_KEY || options.apiKey || "local-dev",
      siteId: process.env.NUXT_PUBLIC_DYRECTED_SITE_ID || options.siteId || "default",
    };

    // 6. Ensure @dyrected/admin is resolved by Vite/Nuxt
    // (Removed build.transpile to prevent unctx and auto-import conflicts on the large React bundle)

    // 7. Vite-specific optimization — exclude @dyrected/admin from dep optimization.
    // It's a pre-built ESM library; Vite should serve it as-is without re-bundling.
    if (nuxt.options.vite) {
      nuxt.options.vite = nuxt.options.vite || {};
      nuxt.options.vite.optimizeDeps = nuxt.options.vite.optimizeDeps || {};
      nuxt.options.vite.optimizeDeps.exclude = nuxt.options.vite.optimizeDeps.exclude || [];
      if (!nuxt.options.vite.optimizeDeps.exclude.includes("@dyrected/admin")) {
        nuxt.options.vite.optimizeDeps.exclude.push("@dyrected/admin");
      }
      if (!nuxt.options.vite.optimizeDeps.exclude.includes("@dyrected/vue")) {
        nuxt.options.vite.optimizeDeps.exclude.push("@dyrected/vue");
      }
    }

    // 8. Patch the unctx:transform plugin to skip @dyrected/admin's dist bundle.
    // unctx injects Vue composable identifiers (toValue, h, ref, …) at the top of
    // every file it processes. The admin bundle is a pre-built React library whose
    // internal variable names can collide with those injections, causing a
    // "Identifier has already been declared" parse error. We intercept the plugin
    // *after* Nuxt has registered it and wrap its transform to bail out early for
    // any file that comes from the admin package.
    nuxt.hook("vite:extendConfig", (config) => {
      const plugins = (config.plugins ?? []) as any[];
      const unctxPlugin = plugins.find((p: any) => p && typeof p === "object" && p.name === "unctx:transform") as any;
      if (!unctxPlugin) return;

      const isAdminFile = (id: string) => id.includes("@dyrected/admin") || id.includes("/packages/admin/dist/");

      // The transform field can be either a plain function or a {order, handler} object (Vite 5+).
      if (typeof unctxPlugin.transform === "function") {
        const original = unctxPlugin.transform;
        unctxPlugin.transform = function (code: string, id: string, ...rest: any[]) {
          if (isAdminFile(id)) return null;
          return original.call(this, code, id, ...rest);
        };
      } else if (unctxPlugin.transform && typeof unctxPlugin.transform.handler === "function") {
        const originalHandler = unctxPlugin.transform.handler;
        unctxPlugin.transform.handler = function (code: string, id: string, ...rest: any[]) {
          if (isAdminFile(id)) return null;
          return originalHandler.call(this, code, id, ...rest);
        };
      }
    });
  },
});

export default module;
