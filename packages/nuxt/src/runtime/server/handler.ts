import { defineEventHandler, getRequestURL } from "h3";
import { createDyrectedApp } from "@dyrected/core/server";
// @ts-ignore
import { useRuntimeConfig } from "#imports";

let app: any;
let lastVersion = 0;

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig().dyrected;
  const currentVersion = (globalThis as any).__dyrected_config_version || 0;

  if (!app || currentVersion !== lastVersion) {
    lastVersion = currentVersion;
    let dyrectedConfig = { ...config };

    // Merge from global config if available
    if ((globalThis as any).__dyrected_config) {
      const gConfig = (globalThis as any).__dyrected_config;
      // console.log("[dyrected/nuxt] raw __dyrected_config:", gConfig);
      // console.log("[dyrected/nuxt] raw __dyrected_config keys:", Object.keys(gConfig || {}));
      // console.log("[dyrected/nuxt] raw __dyrected_config default keys:", Object.keys(gConfig?.default || {}));
      const configObj =
        gConfig.default && (gConfig.default.collections || gConfig.default.globals || gConfig.default.db)
          ? gConfig.default
          : gConfig;
      console.log("[dyrected/nuxt] chosen configObj keys:", Object.keys(configObj || {}));
      dyrectedConfig = { ...dyrectedConfig, ...configObj };
    }

    // Re-hydrate DB from global context if missing (populated by the Nitro plugin)
    if (!dyrectedConfig.db || typeof (dyrectedConfig.db as any).find !== "function") {
      dyrectedConfig.db = (globalThis as any).__dyrected_db;
    }
    if (!dyrectedConfig.storage || typeof (dyrectedConfig.storage as any).upload !== "function") {
      dyrectedConfig.storage = (globalThis as any).__dyrected_storage;
    }
    console.log("[dyrected/nuxt] Final dyrectedConfig keys:", Object.keys(dyrectedConfig));
    console.log("[dyrected/nuxt] Initializing app. DB:", !!dyrectedConfig.db, "Storage:", !!dyrectedConfig.storage);
    app = await createDyrectedApp(dyrectedConfig);
  }

  // Use raw properties to avoid library version conflicts (H3 v1 vs v2)
  const req = (event as any).node?.req || (event as any).req;
  const method = req?.method || "GET";

  // 1. Manually extract headers to avoid event.req.headers.entries() error in H3 v2
  const headers: Record<string, string> = {};
  const rawHeaders = req?.headers || {};
  for (const key in rawHeaders) {
    const val = rawHeaders[key];
    if (Array.isArray(val)) {
      headers[key] = val.join(", ");
    } else if (val) {
      headers[key] = String(val);
    }
  }

  // 2. Determine the path Hono expects
  const originalUrl = req?.url || "/";
  const apiBase = config.apiBase || "/dyrected";
  const path = originalUrl.startsWith(apiBase) ? originalUrl.slice(apiBase.length) || "/" : originalUrl;

  // 3. Construct the full URL for the Request object using the incoming request origin
  const url = getRequestURL(event);
  const fullUrl = new URL(path, url.origin);

  // 4. Robustly read the request body from stream or web-req
  let body: any = undefined;
  if (!["GET", "HEAD"].includes(method)) {
    if (req && typeof req.on === "function") {
      // Node.js stream reading
      body = await new Promise((resolve, reject) => {
        const chunks: any[] = [];
        req.on("data", (chunk: any) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
      });
    } else if (req && typeof req.arrayBuffer === "function") {
      // Web Request fallback
      body = await req.arrayBuffer();
    }
  }

  const request = new Request(fullUrl, {
    method,
    headers,
    body,
    // @ts-ignore
    duplex: "half",
  });

  const response = await app.fetch(request);
  const responseData = await response
    .clone()
    .json()
    .catch(() => null);

  if (process.env.DEBUG_DYRECTED) {
    console.log(`[dyrected/api] ${method} ${path} ${response.status}`);
    if (responseData) {
      console.log(`[dyrected/api] Response Docs Count:`, responseData.docs?.length);
    }
  }

  if (response.status === 404) {
    console.warn(`[dyrected/nuxt] 404 Not Found: ${path}`);
    // Log the available routes on 404
    console.log("[dyrected/nuxt] Available routes:");
    console.table(app.routes.map((r: any) => ({ method: r.method, path: r.path })));
  }

  return response;
});
