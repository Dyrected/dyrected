import { eventHandler, getRequestURL, readRawBody } from "h3";
import { createDyrectedApp } from "@dyrected/core";
// @ts-ignore
import { useRuntimeConfig } from "#imports";

let app: any;

export default eventHandler(async (event) => {
  const config = useRuntimeConfig().dyrected;
  if (!app) {
    app = createDyrectedApp(config);
  }

  const method = (event as any).req?.method || 'GET';
  const headers = (event as any).req?.headers || {};
  
  // 1. Get the original URL
  const originalUrl = (event as any).req?.url || '/';
  
  // 2. Strip the apiBase prefix to get the path Hono expects
  // e.g. /dyrected/api/schemas -> /api/schemas
  const apiBase = config.apiBase || '/api/dyrected';
  const path = originalUrl.startsWith(apiBase) 
    ? originalUrl.slice(apiBase.length) || '/' 
    : originalUrl;

  const debugInfo = `[dyrected/nuxt] ${method} ${originalUrl} -> ${path} (apiBase: ${apiBase})\n`;
  // Use a simple file write if possible, but Nitro environment is restricted.
  // We'll stick to console.log for now but ensure it's visible.
  console.log(debugInfo);

  // 3. Construct the full URL for the Request object
  const protocol = (event as any).req?.headers?.['x-forwarded-proto'] || 'http';
  const host = (event as any).req?.headers?.host || 'localhost:3000';
  const fullUrl = new URL(path, `${protocol}://${host}`);

  const request = new Request(fullUrl, {
    method,
    headers,
    body: ['GET', 'HEAD'].includes(method) ? undefined : await (event as any).req?.arrayBuffer?.() || await readRawBody(event),
    // @ts-ignore
    duplex: 'half'
  });

  const response = await app.fetch(request);
  
  if (response.status === 404) {
    console.warn(`[dyrected/nuxt] 404 Not Found: ${path}`);
    // Log the available routes on 404
    console.log('[dyrected/nuxt] Available routes:', app.routes.map((r: any) => r.path));
  }

  return response;
});
