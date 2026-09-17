import { createSearchAPI } from "fumadocs-core/search/server";
import { buildRuntimeIndexes } from "@/lib/search-index";
import { isDocsSiteRuntime } from "@/lib/docs-runtime";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ runtime: string }>;
}

/**
 * Static search index export, one per docs runtime. The client downloads
 * this once and then searches locally with zero per-keystroke requests —
 * noticeably faster than the dynamic `/api/search` route, which scans the
 * full index server-side on every keystroke.
 *
 * Content only changes on redeploy, so the export is cacheable for a long
 * time.
 */
export async function GET(_request: Request, { params }: Props) {
  const { runtime } = await params;
  if (!isDocsSiteRuntime(runtime)) notFound();

  const api = createSearchAPI("advanced", {
    indexes: buildRuntimeIndexes(runtime),
  });
  const exported = await api.staticGET();
  return Response.json(exported, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
