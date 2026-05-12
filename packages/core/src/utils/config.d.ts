import type { DyrectedConfig } from "../types/index.js";
/**
 * Normalizes the Dyrected configuration by injecting system fields
 * (createdAt, updatedAt, createdBy, updatedBy) into every collection and
 * registering the __audit collection if any collection has audit: true.
 */
export declare function normalizeConfig(config: DyrectedConfig): DyrectedConfig;
