import { createClient } from "@dyrected/sdk";

function getBaseUrl(): string {
  const url = process.env.DYRECTED_URL;
  if (!url) {
    throw new Error("DYRECTED_URL is required for server-side Dyrected requests.");
  }
  if (typeof window === "undefined" && url.startsWith("/")) {
    const port = process.env.PORT || "3007";
    const host = process.env.HOST || "127.0.0.1";
    return `http://${host}:${port}${url}`;
  }
  return url;
}

const baseUrl = getBaseUrl();

if (!apiKey) {
  throw new Error("DYRECTED_API_KEY is required for server-side Dyrected requests.");
}

if (!siteId) {
  throw new Error("DYRECTED_SITE_ID is required for server-side Dyrected requests.");
}

export const dyrected = createClient({
  baseUrl,
  apiKey,
  siteId,
});
