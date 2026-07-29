import docsRuntimeManifestJson from "@dyrected/knowledge/docs-runtime-manifest.json";

export type DocsRuntime = "shared" | "cloud" | "self-hosted" | "variant";

export type DocsManifestEntry = (typeof docsRuntimeManifestJson)[number];
export type NormalizedDocsManifestEntry = Omit<DocsManifestEntry, "runtime"> & {
  runtime: DocsRuntime;
};

function toPathname(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return new URL(url).pathname;
  }

  return url;
}

export function relativePathToCurrentUrl(relativePath: string): string {
  return `/docs/${relativePath}`;
}

export function relativePathToRuntimeUrl(
  runtime: "cloud" | "self-hosted",
  relativePath: string,
): string {
  return `/docs/${runtime}/${relativePath}`;
}

export function normalizeDocsSlug(slug: string[] | undefined): string {
  return (slug ?? []).map((segment) => decodeURIComponent(segment)).join("/");
}

export function relativePathFromCurrentUrl(url: string): string | undefined {
  const pathname = toPathname(url);
  if (!pathname.startsWith("/docs/")) return undefined;

  return pathname.slice("/docs/".length) || undefined;
}

export const docsRuntimeEntries: (NormalizedDocsManifestEntry & {
  currentPathname: string;
  cloudPathname: string;
  selfHostedPathname: string;
})[] = docsRuntimeManifestJson.map((entry) => ({
  ...entry,
  runtime: entry.runtime as DocsRuntime,
  currentPathname: toPathname(entry.urlCurrent),
  cloudPathname: toPathname(entry.urlCloud),
  selfHostedPathname: toPathname(entry.urlSelfHosted),
}));

export const docsRuntimeEntryByRelativePath = new Map(
  docsRuntimeEntries.map((entry) => [entry.relativePath, entry]),
);

export const docsRuntimeEntriesByGroup = new Map<
  string,
  (typeof docsRuntimeEntries)[number][]
>();

for (const entry of docsRuntimeEntries) {
  if (!entry.runtimeGroup) continue;

  const existing = docsRuntimeEntriesByGroup.get(entry.runtimeGroup);
  if (existing) existing.push(entry);
  else docsRuntimeEntriesByGroup.set(entry.runtimeGroup, [entry]);
}

export function getDocsRuntimeEntryByRelativePath(relativePath: string) {
  return docsRuntimeEntryByRelativePath.get(relativePath);
}

export function getDocsRuntimeEntryBySlug(slug: string[] | undefined) {
  const relativePath = normalizeDocsSlug(slug);
  if (!relativePath) return undefined;

  return getDocsRuntimeEntryByRelativePath(relativePath);
}
