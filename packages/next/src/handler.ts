import { createTaskRunner, type DyrectedConfig } from "@dyrected/core";
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
 * import { dyrectedNextHandler } from "@dyrected/next/server";
 *
 * export const { GET, POST, PATCH, DELETE } = dyrectedNextHandler(config);
 */
export function dyrectedNextHandler(
  config: DyrectedConfig | any,
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

export interface DyrectedNextCronHandlerOptions {
  /**
   * Secret required to authorize cron requests.
   * Defaults to `process.env.CRON_SECRET` or `process.env.DYRECTED_CRON_SECRET`.
   */
  secret?: string;
}

/**
 * Creates a secret-protected Next.js App Router handler for platform crons (e.g. Vercel Cron, Netlify, Cloudflare).
 *
 * @example
 * // app/api/cron/route.ts
 * import { dyrectedNextCronHandler } from "@dyrected/next/server";
 * import config from "@/dyrected.config";
 *
 * export const { GET, POST } = dyrectedNextCronHandler(config);
 */
export function dyrectedNextCronHandler(
  config: DyrectedConfig | any,
  options: DyrectedNextCronHandlerOptions = {},
) {
  const handler = async (request: Request) => {
    const expectedSecret =
      options.secret ||
      process.env.CRON_SECRET ||
      process.env.DYRECTED_CRON_SECRET;

    if (expectedSecret) {
      const authHeader = request.headers.get("authorization");
      const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      const url = new URL(request.url);
      const secretQuery = url.searchParams.get("secret");

      if (bearer !== expectedSecret && secretQuery !== expectedSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const runner = createTaskRunner(config);
    const results = await runner.runDue();

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  return {
    GET: handler,
    POST: handler,
  };
}

function normalizeBasePath(basePath: string): string {
  const normalized = basePath.trim().replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}` : "";
}
