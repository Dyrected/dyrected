import {
  type DocsRuntime,
  docsRuntimeEntries,
  docsRuntimeEntriesByGroup,
  getDocsRuntimeEntryByRelativePath,
  getDocsRuntimeEntryBySlug,
  normalizeDocsSlug,
  relativePathToRuntimeUrl,
} from "@/lib/docs-manifest";

export const DOCS_SITE_RUNTIMES = ["cloud", "self-hosted"] as const;
export const DOCS_DEFAULT_RUNTIME: DocsSiteRuntime = "cloud";
export const DOCS_OVERVIEW_RELATIVE_PATH = "basics/getting-started/what-is-dyrected";

export type DocsSiteRuntime = (typeof DOCS_SITE_RUNTIMES)[number];

function runtimeSupportsSite(runtime: DocsRuntime, siteRuntime: DocsSiteRuntime): boolean {
  switch (runtime) {
    case "shared":
    case "variant":
      return true;
    case "cloud":
      return siteRuntime === "cloud";
    case "self-hosted":
      return siteRuntime === "self-hosted";
  }
}

export function isRuntimeAvailable(relativePath: string, siteRuntime: DocsSiteRuntime): boolean {
  const entry = getDocsRuntimeEntryByRelativePath(relativePath);
  if (!entry) return false;

  return runtimeSupportsSite(entry.runtime, siteRuntime);
}

export function isRuntimeSlugAvailable(slug: string[] | undefined, siteRuntime: DocsSiteRuntime): boolean {
  const relativePath = normalizeDocsSlug(slug);
  if (!relativePath) return false;

  return isRuntimeAvailable(relativePath, siteRuntime);
}

export function isDocsSiteRuntime(value: string): value is DocsSiteRuntime {
  return DOCS_SITE_RUNTIMES.includes(value as DocsSiteRuntime);
}

export function getRuntimePageUrl(relativePath: string, siteRuntime: DocsSiteRuntime): string {
  return relativePathToRuntimeUrl(siteRuntime, relativePath);
}

export function getRuntimeFromPathname(pathname: string): DocsSiteRuntime | undefined {
  const segments = pathname.split("/").filter(Boolean);
  const runtime = segments[1];

  if (!runtime) return undefined;
  if (!isDocsSiteRuntime(runtime)) return undefined;

  return runtime;
}

export function getRelativePathFromRuntimePathname(pathname: string): string | undefined {
  const runtime = getRuntimeFromPathname(pathname);
  if (!runtime) return undefined;

  const segments = pathname.split("/").filter(Boolean).slice(2);
  const relativePath = segments.join("/");

  return relativePath || DOCS_OVERVIEW_RELATIVE_PATH;
}

export function getEquivalentRuntimeEntry(relativePath: string, siteRuntime: DocsSiteRuntime) {
  const entry = getDocsRuntimeEntryByRelativePath(relativePath);
  if (!entry) return undefined;

  if (!entry.runtimeGroup) {
    return runtimeSupportsSite(entry.runtime, siteRuntime) ? entry : undefined;
  }

  const matches = docsRuntimeEntriesByGroup.get(entry.runtimeGroup) ?? [];

  return (
    matches.find(
      (candidate) => runtimeSupportsSite(candidate.runtime, siteRuntime) && candidate.runtime === siteRuntime,
    ) ??
    matches.find((candidate) => runtimeSupportsSite(candidate.runtime, siteRuntime)) ??
    (runtimeSupportsSite(entry.runtime, siteRuntime) ? entry : undefined)
  );
}

export function getEquivalentRuntimeUrl(relativePath: string, siteRuntime: DocsSiteRuntime): string | undefined {
  const entry = getEquivalentRuntimeEntry(relativePath, siteRuntime);
  if (!entry) return undefined;

  return getRuntimePageUrl(entry.relativePath, siteRuntime);
}

export function getRuntimeOverviewUrl(siteRuntime: DocsSiteRuntime): string {
  return getRuntimePageUrl(DOCS_OVERVIEW_RELATIVE_PATH, siteRuntime);
}

export function getRuntimeSwitchUrl(pathname: string, targetRuntime: DocsSiteRuntime): string {
  const relativePath = getRelativePathFromRuntimePathname(pathname);
  if (!relativePath) return getRuntimeOverviewUrl(targetRuntime);

  return getEquivalentRuntimeUrl(relativePath, targetRuntime) ?? getRuntimeOverviewUrl(targetRuntime);
}

function isAbsoluteUrl(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

function isProtectedHref(href: string) {
  return (
    href.startsWith("#") ||
    href.startsWith("?") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("javascript:")
  );
}

function splitHrefSuffix(href: string) {
  const markerIndex = href.search(/[?#]/);
  if (markerIndex === -1) {
    return { pathname: href, suffix: "" };
  }

  return {
    pathname: href.slice(0, markerIndex),
    suffix: href.slice(markerIndex),
  };
}

function toInternalDocsTarget(href: string) {
  if (isProtectedHref(href)) return undefined;

  if (isAbsoluteUrl(href)) {
    const url = new URL(href);
    if (url.hostname !== "docs.dyrected.com") return undefined;
    if (!url.pathname.startsWith("/docs")) return undefined;

    return {
      pathname: url.pathname,
      suffix: `${url.search}${url.hash}`,
    };
  }

  const { pathname, suffix } = splitHrefSuffix(href);
  if (!pathname.startsWith("/docs")) return undefined;

  return { pathname, suffix };
}

export function getRuntimeAwareDocsHref(href: string, siteRuntime: DocsSiteRuntime): string {
  const target = toInternalDocsTarget(href);
  if (!target) return href;

  const { pathname, suffix } = target;
  if (pathname.startsWith("/docs/cloud/") || pathname.startsWith("/docs/self-hosted/")) {
    return href;
  }

  if (pathname === "/docs" || pathname === "/docs/") {
    return getRuntimeOverviewUrl(siteRuntime);
  }

  const relativePath = decodeURIComponent(pathname.replace(/^\/docs\/?/, ""));
  if (!relativePath) return getRuntimeOverviewUrl(siteRuntime);

  const entry = getDocsRuntimeEntryByRelativePath(relativePath);
  if (!entry) return href;

  const runtimeUrl = getEquivalentRuntimeUrl(relativePath, siteRuntime);
  if (runtimeUrl) return `${runtimeUrl}${suffix}`;

  return getRuntimeOverviewUrl(siteRuntime);
}

export function getRuntimeCurrentUrls(siteRuntime: DocsSiteRuntime): Set<string> {
  return new Set(
    docsRuntimeEntries
      .filter((entry) => runtimeSupportsSite(entry.runtime, siteRuntime))
      .map((entry) => entry.currentPathname),
  );
}

export function getRuntimeEntryForSlug(slug: string[] | undefined, siteRuntime: DocsSiteRuntime) {
  const entry = getDocsRuntimeEntryBySlug(slug);
  if (!entry) return undefined;
  if (!runtimeSupportsSite(entry.runtime, siteRuntime)) return undefined;

  return entry;
}

export function resolveLegacyDocsRedirect(
  slug: string[] | undefined,
  defaultRuntime: DocsSiteRuntime = DOCS_DEFAULT_RUNTIME,
): string | undefined {
  const relativePath = normalizeDocsSlug(slug);
  if (!relativePath) return getRuntimeOverviewUrl(defaultRuntime);

  const entry = getDocsRuntimeEntryByRelativePath(relativePath);
  if (!entry) return undefined;

  return getEquivalentRuntimeUrl(relativePath, defaultRuntime) ?? getEquivalentRuntimeUrl(relativePath, "cloud");
}
