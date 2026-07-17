import { createClient, DyrectedClient } from "@dyrected/sdk";

export { dyrectedNextHandler } from "./handler.js";
export type { DyrectedNextHandlerOptions } from "./handler.js";

/**
 * Returns a pre-configured Dyrected SDK client for server-side use.
 * Reads environment variables DYRECTED_URL and DYRECTED_API_KEY.
 */
export function getDyrectedClient(): DyrectedClient {
  const baseUrl =
    process.env.NEXT_PUBLIC_DYRECTED_URL ||
    process.env.DYRECTED_URL ||
    "http://localhost:3000";
  const apiKey =
    process.env.NEXT_PUBLIC_DYRECTED_API_KEY || process.env.DYRECTED_API_KEY;

  return createClient({
    baseUrl,
    apiKey,
  });
}

export * from "@dyrected/sdk";
