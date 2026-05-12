import { type DyrectedConfig } from "@dyrected/core";
import { createDyrectedApp } from "@dyrected/core/server";
import { createClient, DyrectedClient } from "@dyrected/sdk";
import { handle } from "hono/vercel";

/**
 * Creates a standard Next.js Route Handler for Dyrected CMS.
 * Usage in app/dyrected/[...dyrected]/route.ts:
 *
 * export const { GET, POST, PATCH, DELETE } = dyrectedNextHandler(config);
 */
export function dyrectedNextHandler(config: DyrectedConfig) {
  const handler = handle(createDyrectedApp(config) as any);

  return {
    GET: handler,
    POST: handler,
    PATCH: handler,
    DELETE: handler,
    PUT: handler,
    OPTIONS: handler,
  };
}

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

export * from "./components/DyrectedMedia";
export * from "./components/DyrectedImage";
export * from "@dyrected/sdk";
