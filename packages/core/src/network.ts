import type { Context } from "hono";
import type { DyrectedContext } from "./app.js";
import type { HookRequestContext, TrustProxyConfig } from "./types/index.js";

const DIRECT_IP_HEADERS = [
  "cf-connecting-ip",
  "fly-client-ip",
  "true-client-ip",
  "x-real-ip",
  "x-client-ip",
  "fastly-client-ip",
] as const;

export function toHookRequestContext(
  c: Context<DyrectedContext>,
): HookRequestContext {
  const headers = Object.fromEntries(
    Object.entries(c.req.header()).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    query: c.req.query(),
    headers,
    raw: c.req.raw,
  };
}

export function resolveClientIp(
  req: HookRequestContext,
  trustProxy: TrustProxyConfig = false,
): string {
  for (const header of DIRECT_IP_HEADERS) {
    const value = normalizeIp(req.headers[header]);
    if (value) return value;
  }

  if (trustProxy) {
    const forwardedFor = pickForwardedFor(req.headers, trustProxy);
    if (forwardedFor) return forwardedFor;
  }

  return "127.0.0.1";
}

function pickForwardedFor(
  headers: Record<string, string>,
  trustProxy: TrustProxyConfig,
): string | null {
  const forwardedHeader = headers["x-forwarded-for"];
  if (forwardedHeader) {
    const chain = forwardedHeader
      .split(",")
      .map((entry) => normalizeIp(entry))
      .filter((entry): entry is string => !!entry);

    if (chain.length > 0) {
      if (trustProxy === true) return chain[0];
      const trustedHops = Math.max(1, Math.floor(trustProxy));
      const candidateIndex = Math.max(0, chain.length - trustedHops);
      return chain[candidateIndex] ?? chain[0];
    }
  }

  const forwarded = headers.forwarded;
  if (!forwarded) return null;

  const matches = [...forwarded.matchAll(/for=(?:"?\[?([^;\],"]+)\]?"?)/gi)];
  if (matches.length === 0) return null;
  const chain = matches
    .map((match) => normalizeIp(match[1]))
    .filter((entry): entry is string => !!entry);

  if (chain.length === 0) return null;
  if (trustProxy === true) return chain[0];

  const trustedHops = Math.max(1, Math.floor(trustProxy));
  const candidateIndex = Math.max(0, chain.length - trustedHops);
  return chain[candidateIndex] ?? chain[0];
}

function normalizeIp(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "unknown") return null;
  return trimmed.replace(/^\[(.*)\]$/, "$1");
}
