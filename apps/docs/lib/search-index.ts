import { runtimeSource } from "@/app/source";
import {
  getRuntimePageUrl,
  type DocsSiteRuntime,
} from "@/lib/docs-runtime";

/**
 * Search index entries for one docs runtime. Shared by the dynamic
 * `/api/search` route and the static per-runtime export routes so both
 * search the same documents.
 */
export function buildRuntimeIndexes(runtime: DocsSiteRuntime) {
  return runtimeSource.getPages(runtime).map((page) => ({
    title: page.data.title,
    description: page.data.description,
    url: getRuntimePageUrl(page.slugs.join("/"), runtime),
    id: getRuntimePageUrl(page.slugs.join("/"), runtime),
    structuredData: page.data.structuredData,
  }));
}
