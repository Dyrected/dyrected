import { CollectionConfig, DyrectedConfig, GlobalConfig } from './types';

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

export * from './app';
export * from './types';
export * from './services/population.service';
export * from './services/media.service';
