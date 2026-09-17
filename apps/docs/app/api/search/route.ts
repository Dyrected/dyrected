import { createSearchAPI } from "fumadocs-core/search/server";
import { buildRuntimeIndexes } from "@/lib/search-index";
import {
  DOCS_DEFAULT_RUNTIME,
  getRuntimeFromPathname,
  isDocsSiteRuntime,
  type DocsSiteRuntime,
} from "@/lib/docs-runtime";

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
