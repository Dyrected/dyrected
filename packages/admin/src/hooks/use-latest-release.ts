import { useQuery } from "@tanstack/react-query";

const RELEASE_QUERY_KEY = ["dyrected-latest-release"] as const;
const RELEASE_URL = "https://registry.npmjs.org/@dyrected/core/latest";
const CACHE_KEY = "dyrected_latest_release";
const CACHE_TIME_KEY = "dyrected_latest_release_timestamp";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function readCachedLatestRelease() {
  if (typeof window === "undefined") return null;

  const version = localStorage.getItem(CACHE_KEY);
  const timestamp = localStorage.getItem(CACHE_TIME_KEY);
  if (!version || !timestamp) return null;

  const cachedAt = Number(timestamp);
  if (!Number.isFinite(cachedAt)) return null;
  if (Date.now() - cachedAt >= ONE_DAY_MS) return null;

  return { version, cachedAt };
}

async function fetchLatestRelease() {
  const response = await fetch(RELEASE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch latest release: ${response.status}`);
  }

  const data = (await response.json()) as { version?: unknown };
  if (typeof data.version !== "string" || !data.version) {
    throw new Error("Latest release response did not include a version");
  }

  const cachedAt = Date.now();
  if (typeof window !== "undefined") {
    localStorage.setItem(CACHE_KEY, data.version);
    localStorage.setItem(CACHE_TIME_KEY, String(cachedAt));
  }

  return { version: data.version, cachedAt };
}

export function isNewerVersion(candidate: string, current: string) {
  const candidateParts = candidate.split(".").map(Number);
  const currentParts = current.split(".").map(Number);

  for (let index = 0; index < 3; index += 1) {
    const left = candidateParts[index] || 0;
    const right = currentParts[index] || 0;
    if (left > right) return true;
    if (left < right) return false;
  }

  return false;
}

export function useLatestRelease() {
  return useQuery({
    queryKey: RELEASE_QUERY_KEY,
    queryFn: fetchLatestRelease,
    staleTime: ONE_DAY_MS,
    gcTime: ONE_DAY_MS,
    retry: 1,
    initialData: readCachedLatestRelease,
  });
}
