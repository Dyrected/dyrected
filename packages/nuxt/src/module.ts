import {
  defineNuxtModule,
  addPlugin,
  createResolver,
  addServerHandler,
  addComponent,
  addImports,
  addServerPlugin,
  addTemplate,
} from "@nuxt/kit";
import { join } from "path";
import { existsSync } from "fs";
import { createRequire } from "module";
import type { DyrectedConfig } from "@dyrected/core";

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
  /**
   * Path where the Dyrected admin page is mounted.
   * Used only for the dev-server console log.
   * @default 'cms'
   */
  adminPath?: string;
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

    // Inject admin UI CSS globally. We use createRequire so the path resolves
    // from this module's location (packages/nuxt), where @dyrected/admin is a
    // workspace symlink with a built dist/. The app-level node_modules may not
    // have the dist built yet, so we must not rely on Vite resolving it at the
    // app level.
    const _require = createRequire(import.meta.url);
    try {
      const adminCssPath = _require.resolve("@dyrected/admin/styles");
      if (!nuxt.options.css.includes(adminCssPath)) {
        nuxt.options.css.push(adminCssPath);
      }
    } catch {
      console.warn("[dyrected/nuxt] Could not resolve @dyrected/admin/styles — admin UI may be unstyled.");
    }

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

    // <DyrectedBlocks> renders an array of blocks by blockType and scopes each
    // item's data-dy-path base, powering click-to-edit in the live preview.
    addComponent({
      name: "DyrectedBlocks",
      filePath: "@dyrected/vue",
      export: "Blocks",
    });

    // 3. Add Composables
    addImports([
      { name: "useDyrected", from: resolver.resolve("./runtime/composables/useDyrected") },
      { name: "useDyrectedClient", from: resolver.resolve("./runtime/composables/useDyrected") },
      { name: "useDyrected", from: "@dyrected/vue", as: "useDyrectedData" },
      { name: "useDyrectedCollection", from: "@dyrected/vue", as: "useDyrectedCollectionData" },
      { name: "useDyrectedGlobal", from: "@dyrected/vue", as: "useDyrectedGlobalData" },
      { name: "useDyrectedDoc", from: resolver.resolve("./runtime/composables/useDyrected") },
      { name: "useDyrectedCollection", from: resolver.resolve("./runtime/composables/useDyrected") },
      { name: "useDyrectedGlobal", from: resolver.resolve("./runtime/composables/useDyrected") },
      { name: "useDyrectedAuth", from: resolver.resolve("./runtime/composables/useDyrectedAuth") },
      { name: "useLivePreview", from: "@dyrected/vue" },
      { name: "useDyPath", from: "@dyrected/vue" },
      { name: "provideDyPath", from: "@dyrected/vue" },
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

      let loadConfigSrc = resolver.resolve("./runtime/server/plugins/loadConfig.ts");
      if (!existsSync(loadConfigSrc)) {
        loadConfigSrc = resolver.resolve("./runtime/server/plugins/loadConfig.mjs");
      }
      addTemplate({
        src: loadConfigSrc,
        filename: "dyrected-load-config.ts",
        write: true,
      });

      const dbPluginTemplate = addTemplate({
        filename: "dyrected-db-plugin.ts",
        write: true,
        getContents: () => {
          const escapedConfigPath = configPath.replace(/\\/g, "/");
          return `// @ts-ignore
import { useRuntimeConfig } from "#imports";
// @ts-ignore
import userConfigRaw from "${escapedConfigPath}";

const defineNitroPlugin = (def) => def;

export default defineNitroPlugin(async (nitroApp) => {
  const runtimeConfig = useRuntimeConfig().dyrected;

  try {
    const userConfig = userConfigRaw.default || userConfigRaw;
    const configObj = (userConfig.default && (userConfig.default.collections || userConfig.default.globals || userConfig.default.db)) ? userConfig.default : userConfig;

    if (configObj) {
      globalThis.__dyrected_config = configObj;
      if (configObj.db) {
        globalThis.__dyrected_db = configObj.db;
        console.log("[dyrected/nuxt] Database re-attached to global context");
      }
      if (configObj.storage) {
        globalThis.__dyrected_storage = configObj.storage;
        console.log("[dyrected/nuxt] Storage adapter re-attached to global context");
      }
    }

    if (process.env.NODE_ENV !== 'production' && runtimeConfig?.configPath) {
      const { watch } = await import('fs');
      // @ts-ignore
      const { loadDyrectedConfig } = await import("./dyrected-load-config.ts");
      let debounceTimer = null;
      const reload = async () => {
        try {
          const newConfig = await loadDyrectedConfig(runtimeConfig.configPath);
          const newObj = (newConfig.default && (newConfig.default.collections || newConfig.default.globals || newConfig.default.db)) ? newConfig.default : newConfig;
          globalThis.__dyrected_config = newObj;
          globalThis.__dyrected_config_version = (globalThis.__dyrected_config_version || 0) + 1;
          if (newObj.db) {
            globalThis.__dyrected_db = newObj.db;
            console.log('[dyrected/nuxt] Database hot-reloaded');
          }
          if (newObj.storage) {
            globalThis.__dyrected_storage = newObj.storage;
            console.log('[dyrected/nuxt] Storage hot-reloaded');
          }
        } catch (e) {
          console.error('[dyrected/nuxt] Hot-reload failed:', e);
        }
      };
      watch(runtimeConfig.configPath, (eventType) => {
        if (eventType === 'change') {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(reload, 200);
        }
      });
    }
  } catch (err) {
    console.error("[dyrected/nuxt] Failed to re-attach database:", err);
  }
});
`;
        }
      });
      addServerPlugin(dbPluginTemplate.dst);
    } else {
      console.warn("[dyrected/nuxt] Could not find dyrected.config.ts. Self-hosted database re-hydration might fail.");
    }

    // Log admin + API URLs when the dev server starts listening
    nuxt.hook("listen", (_server, listener) => {
      const base = listener.url.replace(/\/$/, "");
      const adminSlug = options.adminPath || "cms";
      const apiSlug = options.apiBase || "/dyrected";
      console.log(`\n  ➜  Dyrected admin:  ${base}/${adminSlug}`);
      console.log(`  ➜  Dyrected API:    ${base}${apiSlug}\n`);
    });

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
    if (nuxt.options.vite) {
      const adminRequire = createRequire(_require.resolve("@dyrected/admin"));
      nuxt.options.vite.optimizeDeps = nuxt.options.vite.optimizeDeps || {};
      nuxt.options.vite.optimizeDeps.include = nuxt.options.vite.optimizeDeps.include || [];
      const toInclude = ["react", "react-dom", "react-router-dom", "@tanstack/react-query"];
      for (const dep of toInclude) {
        try {
          const resolved = dep === "react" || dep === "react-dom" ? _require.resolve(dep) : adminRequire.resolve(dep);
          if (!nuxt.options.vite.optimizeDeps.include.includes(dep)) {
            nuxt.options.vite.optimizeDeps.include.push(dep);
          }
        } catch {
          // Skip if the dependency cannot be resolved in the target environment
        }
      }

      nuxt.options.vite.optimizeDeps.exclude = nuxt.options.vite.optimizeDeps.exclude || [];
      if (!nuxt.options.vite.optimizeDeps.exclude.includes("@dyrected/admin")) {
        nuxt.options.vite.optimizeDeps.exclude.push("@dyrected/admin");
      }
      if (!nuxt.options.vite.optimizeDeps.exclude.includes("@dyrected/vue")) {
        nuxt.options.vite.optimizeDeps.exclude.push("@dyrected/vue");
      }

      // Deduplicate React & React-DOM to avoid multiple instances causing hook failures
      nuxt.options.vite.resolve = nuxt.options.vite.resolve || {};
      nuxt.options.vite.resolve.dedupe = nuxt.options.vite.resolve.dedupe || [];
      for (const dep of ["react", "react-dom"]) {
        if (!nuxt.options.vite.resolve.dedupe.includes(dep)) {
          nuxt.options.vite.resolve.dedupe.push(dep);
        }
      }

      nuxt.options.vite.resolve.alias = nuxt.options.vite.resolve.alias || {};
      try {
        const reactMain = _require.resolve("react");
        const reactDomMain = _require.resolve("react-dom");
        (nuxt.options.vite.resolve.alias as any).react = join(reactMain, "..");
        (nuxt.options.vite.resolve.alias as any)["react-dom"] = join(reactDomMain, "..");

        const reactRouterDomMain = adminRequire.resolve("react-router-dom");
        const reactQueryMain = adminRequire.resolve("@tanstack/react-query");
        (nuxt.options.vite.resolve.alias as any)["react-router-dom"] = join(reactRouterDomMain, "..");
        (nuxt.options.vite.resolve.alias as any)["@tanstack/react-query"] = join(reactQueryMain, "..");
      } catch {
        // Ignore
      }
    }

    // 8. Transpile Dyrected packages
    nuxt.options.build.transpile.push("@dyrected/sdk", "@dyrected/vue", "@dyrected/admin");

    // Inline `@dyrected/nuxt` in Nitro so its server plugin resolves `#imports` correctly
    const optionsAny = nuxt.options as any;
    optionsAny.nitro = optionsAny.nitro || {};
    optionsAny.nitro.externals = optionsAny.nitro.externals || {};
    optionsAny.nitro.externals.inline = optionsAny.nitro.externals.inline || [];
    if (!optionsAny.nitro.externals.inline.includes("@dyrected/nuxt")) {
      optionsAny.nitro.externals.inline.push("@dyrected/nuxt");
    }

    // 9. Patch the unctx:transform plugin to skip @dyrected/admin's dist bundle.
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
