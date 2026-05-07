import { defineNuxtModule, addPlugin, createResolver, addServerHandler, addComponent, addImports } from '@nuxt/kit';
import { DyrectedConfig } from '@dyrected/core';

export interface ModuleOptions extends DyrectedConfig {
  /**
   * Mount the Dyrected API on this path.
   * @default '/api/dyrected'
   */
  apiBase?: string;
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

    // 1. Add Server Handler (Nitro)
    addServerHandler({
      route: `${options.apiBase}/**`,
      handler: resolver.resolve('./runtime/server/handler'),
    });

    // 2. Add Components
    addComponent({
      name: 'DyrectedMedia',
      filePath: resolver.resolve('./runtime/components/DyrectedMedia.vue'),
    });

    // 3. Add Composables
    addImports({
      name: 'useDyrected',
      as: 'useDyrected',
      from: resolver.resolve('./runtime/composables/useDyrected'),
    });

    // 4. Pass options to runtime
    nuxt.options.runtimeConfig.public.dyrected = {
      baseUrl: options.apiBase,
    };
  },
});

export default module;
