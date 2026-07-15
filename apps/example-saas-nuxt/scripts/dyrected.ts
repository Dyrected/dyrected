import { createClient } from "@dyrected/sdk";

const baseUrl = process.env.DYRECTED_URL;
const apiKey = process.env.DYRECTED_API_KEY;
const siteId = process.env.DYRECTED_SITE_ID;

if (!baseUrl) {
  throw new Error("DYRECTED_URL is required for server-side Dyrected requests.");
}

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
