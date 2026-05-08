import { defineNuxtModule, addPlugin, createResolver, addServerHandler, addComponent, addImports } from '@nuxt/kit';
import { DyrectedConfig } from '@dyrected/core';
import { appendFileSync } from 'fs';

export interface ModuleOptions extends DyrectedConfig {
  /**
   * Mount the Dyrected API on this path.
   * @default '/api/dyrected'
   */
  apiBase?: string;
  /** API key passed to the SDK client for request authentication. */
  apiKey?: string;
  /** Site ID used to scope content to a specific tenant site. */
  siteId?: string;
}

import { NuxtModule } from '@nuxt/schema';

const module: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@dyrected/nuxt',
    configKey: 'dyrected',
  },
  defaults: {
    apiBase: '/api/dyrected',
  } as any,
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);
    const logMsg = `[@dyrected/nuxt] Module setup with ${options.collections?.length || 0} collections and ${options.globals?.length || 0} globals\n`;
    console.log(logMsg);
    try {
      appendFileSync('dyrected_build.log', logMsg);
    } catch(e) {}

    // 1. Add Server Handler (Nitro) - only if apiBase is a relative path
    if (options.apiBase?.startsWith('/')) {
      addServerHandler({
        route: `${options.apiBase}/**`,
        handler: resolver.resolve('./runtime/server/handler'),
      });
    }

    // 2. Add Components
    addComponent({
      name: 'DyrectedMedia',
      filePath: resolver.resolve('./runtime/components/DyrectedMedia.vue'),
    });

    addComponent({
      name: 'DyrectedAdmin',
      filePath: resolver.resolve('./runtime/components/DyrectedAdmin.vue'),
    });

    // 3. Add Composables
    addImports([
      { name: 'useDyrected',       from: resolver.resolve('./runtime/composables/useDyrected') },
      { name: 'useDyrectedDoc',    from: resolver.resolve('./runtime/composables/useDyrected') },
      { name: 'useDyrectedGlobal', from: resolver.resolve('./runtime/composables/useDyrected') },
      { name: 'useDyrectedAuth',   from: resolver.resolve('./runtime/composables/useDyrectedAuth') },
      { name: 'useLivePreview',    from: resolver.resolve('./runtime/composables/useLivePreview') },
    ]);


    // 4. Pass options to runtime
    // Private config for server-side (contains full engine config)
    const runtimeConfig = {
      ...options,
      baseUrl: options.apiBase,
    };

    // Ensure 'db' is attached but non-enumerable to avoid serialization crashes in DevTools
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
