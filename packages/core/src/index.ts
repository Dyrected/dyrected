import type { CollectionConfig, DyrectedConfig, GlobalConfig } from './types/index.js';

/**
 * Define a collection configuration with full type safety.
 */
export function defineCollection(config: CollectionConfig): CollectionConfig {
  return config;
}

/**
 * Define a global configuration with full type safety.
 */
export function defineGlobal(config: GlobalConfig): GlobalConfig {
  return config;
}

/**
 * Define the main Dyrected configuration.
 */
export function defineConfig(config: DyrectedConfig): DyrectedConfig {
  return config;
}

export * from './types/index.js';
export * from './utils/setup-prompt.js';
export * from './utils/config.js';
export * from './utils/parse-where.js';
export * from './utils/hooks.js';
export * from './app.js';
