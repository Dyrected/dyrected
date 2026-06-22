import type { DyrectedConfig } from "@dyrected/core";
import { createDyrectedApp } from "@dyrected/core/server";
import { Hono } from "hono";
import { handle } from "hono/vercel";

export interface DyrectedNextHandlerOptions {
  /** Path where the catch-all route is mounted. Defaults to `/dyrected`. */
  basePath?: string;
}

/**
 * Creates a lazily initialized Next.js App Router handler for Dyrected CMS.
 *
 * @example
 * export const { GET, POST, PATCH, DELETE } = dyrectedNextHandler(config);
 */
export function dyrectedNextHandler(
  config: DyrectedConfig,
  options: DyrectedNextHandlerOptions = {},
) {
  const basePath = normalizeBasePath(options.basePath ?? "/dyrected");
  let handlerPromise: Promise<ReturnType<typeof handle>> | undefined;

  const getHandler = async () => {
    if (!handlerPromise) {
      handlerPromise = createDyrectedApp(config).then((app) => {
        const mountedApp = basePath ? new Hono().route(basePath, app) : app;
        return handle(mountedApp);
      });
    }

    try {
      return await handlerPromise;
    } catch (error) {
      // Allow a later request to retry initialization after a transient failure.
      handlerPromise = undefined;
      throw error;
    }
  };

  const handler = async (request: Request) => {
    const resolvedHandler = await getHandler();
    return resolvedHandler(request);
  };

  return {
    GET: handler,
    POST: handler,
    PATCH: handler,
    DELETE: handler,
    PUT: handler,
    OPTIONS: handler,
  };
}

function normalizeBasePath(basePath: string): string {
  const normalized = basePath.trim().replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}` : "";
}
