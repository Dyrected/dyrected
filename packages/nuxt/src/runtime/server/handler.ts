import { eventHandler, getRequestURL, readRawBody } from "h3";
import { createDyrectedApp } from "@dyrected/core";
// @ts-ignore
import { useRuntimeConfig } from "#imports";

let app: any;

export default eventHandler(async (event) => {
  if (!app) {
    const config = useRuntimeConfig().dyrected;
    app = createDyrectedApp(config);
  }

  const method = (event as any).req?.method || 'GET';
  const headers = (event as any).req?.headers || {};
  
  // Manually construct the full URL to avoid 'Invalid URL' errors in some H3/Nitro environments
  const protocol = (event as any).req?.headers?.['x-forwarded-proto'] || 'http';
  const host = (event as any).req?.headers?.host || 'localhost:3000';
  const fullUrl = new URL((event as any).req?.url || '/', `${protocol}://${host}`);

  const request = new Request(fullUrl, {
    method,
    headers,
    body: ['GET', 'HEAD'].includes(method) ? undefined : await (event as any).req?.arrayBuffer?.() || await readRawBody(event),
    // @ts-ignore
    duplex: 'half'
  });

  return app.fetch(request);
});
