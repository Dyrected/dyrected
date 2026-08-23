import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDyrected } from "../../../providers/dyrected-context";
import { resolveViewFilter } from "./resolve-view-filter";

interface UseViewDataOptions {
  slug: string;
  viewSlug: string;
  filter?: Record<string, any> | string;
  sort?: { field: string; direction: "asc" | "desc" };
  limit?: number;
}

/**
 * Fetches the documents an operational view operates on.
 *
 * The view's base `filter` and `sort` are applied server-side; layout-level
 * refinements (search, faceted filters, pagination) run client-side on the
 * result set, matching the tablecn data model.
 */
export function useViewData({ slug, viewSlug, filter, sort, limit = 100 }: UseViewDataOptions) {
  const { client } = useDyrected();
  const filterHash = JSON.stringify(filter ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const where = useMemo(() => resolveViewFilter(filter), [filterHash]);
  const sortString = sort ? `${sort.direction === "desc" ? "-" : ""}${sort.field}` : undefined;

  return useQuery({
    queryKey: ["operational-view", slug, viewSlug, filterHash, sortString ?? null],
    queryFn: async () => {
      if (!client) throw new Error("Dyrected client unavailable");
      const result = await (client as any).collection(slug).find({
        where,
        sort: sortString,
        limit,
      });
      return (result?.docs ?? []) as Record<string, any>[];
    },
    enabled: !!client,
    staleTime: 15_000,
  });
}
