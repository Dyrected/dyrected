import type { CollectionConfig, DyrectedConfig, GlobalConfig } from './types/index.js';
/**
 * Define a collection configuration with full type safety.
 */
export declare function defineCollection(config: CollectionConfig): CollectionConfig;
/**
 * Define a global configuration with full type safety.
 */
export declare function defineGlobal(config: GlobalConfig): GlobalConfig;
/**
 * Define the main Dyrected configuration.
 */
export declare function defineConfig(config: DyrectedConfig): DyrectedConfig;
export * from './types/index.js';
export * from './utils/setup-prompt.js';
export * from './utils/config.js';
