import { runtimeSource } from "@/app/source";
import { createSearchAPI } from "fumadocs-core/search/server";
import {
  DOCS_DEFAULT_RUNTIME,
  getRuntimeFromPathname,
  getRuntimePageUrl,
  isDocsSiteRuntime,
  type DocsSiteRuntime,
} from "@/lib/docs-runtime";

function buildRuntimeIndexes(runtime: DocsSiteRuntime) {
  return runtimeSource.getPages(runtime).map((page) => ({
    title: page.data.title,
    description: page.data.description,
    url: getRuntimePageUrl(page.slugs.join("/"), runtime),
    id: getRuntimePageUrl(page.slugs.join("/"), runtime),
    structuredData: page.data.structuredData,
  }));
}

const runtimeSearchApis = {
  cloud: createSearchAPI("advanced", {
    indexes: buildRuntimeIndexes("cloud"),
  }),
  "self-hosted": createSearchAPI("advanced", {
    indexes: buildRuntimeIndexes("self-hosted"),
  }),
} as const;

function resolveRuntimeFromReferer(referer: string | null) {
  if (!referer) return undefined;

  try {
    const pathname = new URL(referer).pathname;
    return getRuntimeFromPathname(pathname);
  } catch {
    return undefined;
  }
}

function resolveSearchRuntime(request: Request): DocsSiteRuntime {
  const runtimeParam = new URL(request.url).searchParams.get("runtime");
  if (runtimeParam && isDocsSiteRuntime(runtimeParam)) {
    return runtimeParam;
  }

  return (
    resolveRuntimeFromReferer(request.headers.get("referer")) ??
    DOCS_DEFAULT_RUNTIME
  );
}

export async function GET(request: Request) {
  const runtime = resolveSearchRuntime(request);
  return runtimeSearchApis[runtime].GET(request);
}
