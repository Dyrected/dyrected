import { CollectionConfig, DyrectedConfig, GlobalConfig } from './types/index.js';

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

export * from './app.js';
export * from './types/index.js';
export * from './services/population.service.js';
export * from './services/media.service.js';
export * from './utils/setup-prompt.js';
