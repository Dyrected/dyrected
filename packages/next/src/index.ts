import { createClient, DyrectedClient } from "@dyrected/sdk";
export { dyrectedNextHandler } from "./handler.js";
export type { DyrectedNextHandlerOptions } from "./handler.js";

/**
 * Returns a pre-configured Dyrected SDK client for server-side use.
 * Reads environment variables DYRECTED_URL and DYRECTED_API_KEY.
 */
export function getDyrectedClient(): DyrectedClient {
  const baseUrl = process.env.NEXT_PUBLIC_DYRECTED_URL || process.env.DYRECTED_URL || "http://localhost:3000";
  const apiKey = process.env.NEXT_PUBLIC_DYRECTED_API_KEY || process.env.DYRECTED_API_KEY;

  return createClient({
    baseUrl,
    apiKey,
  });
}

export * from "./components/DyrectedMedia.js";
export * from "./components/DyrectedImage.js";

// Re-export React integration layer so Next.js users have one package to import from
export { DyrectedProvider, useDyrected, useLivePreview } from "@dyrected/react";
// Live-preview click-to-edit helpers
export { Blocks, DyPathProvider, useDyPath } from "@dyrected/react";
export type { BlocksProps, BlocksItem } from "@dyrected/react";
export type { DyrectedImageProps, DyrectedMediaProps } from "@dyrected/react";
export type {
  DyrectedAdminProps,
  AdminComponents,
  AdminSchemas,
  CollectionListSlotProps,
  DashboardSlotProps,
} from "@dyrected/react/admin";

export * from "@dyrected/sdk";
