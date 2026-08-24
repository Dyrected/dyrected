import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useDyrected } from "../../../providers/dyrected-context";
import {
  getLegacyViewModePrefKey,
  getViewModePrefKey,
} from "./view-preference-keys";

export type ViewMode = "table" | "spreadsheet";

const prefKeyOf = (slug: string, viewSlug: string) => getViewModePrefKey(slug, viewSlug);
const legacyPrefKeyOf = (slug: string, viewSlug: string) => getLegacyViewModePrefKey(slug, viewSlug);

function isViewMode(value: unknown): value is ViewMode {
  return value === "table" || value === "spreadsheet";
}

interface UseViewModeOptions {
  slug: string;
  viewSlug: string;
  /** The layout authored on the view — the default until the user switches. */
  layout?: string;
}

/**
 * Table ⇄ spreadsheet switcher state for tabular views. The user's choice is
 * persisted per-view as a personal preference and applied optimistically;
 * server data only seeds the initial value.
 */
export function useViewMode({ slug, viewSlug, layout }: UseViewModeOptions): {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
} {
  const { client } = useDyrected();
  const queryClient = useQueryClient();
  const prefKey = prefKeyOf(slug, viewSlug);

  const legacyPrefKey = legacyPrefKeyOf(slug, viewSlug);

  const { data: rawPreference } = useQuery({
    queryKey: ["view-mode", prefKey],
    queryFn: async () => {
      if (!client?.getPreference) return null;
      const response = await client.getPreference<ViewMode>(prefKey);
      if (response.value != null) return response.value;
      const legacy = await client.getPreference<ViewMode>(legacyPrefKey);
      return legacy.value;
    },
    enabled: !!client?.getPreference,
    staleTime: 60_000,
  });

  /** Explicit local switch — wins over the stored preference until reload. */
  const [override, setOverride] = useState<ViewMode | null>(null);

  const defaultMode: ViewMode = layout === "spreadsheet" ? "spreadsheet" : "table";
  const mode = override ?? (isViewMode(rawPreference) ? rawPreference : defaultMode);

  const setMode = useCallback(
    (next: ViewMode) => {
      setOverride((prev) => (prev === next ? prev : next));
      if (!client?.setPreference) return;
      void client
        .setPreference(prefKey, next, { scope: "personal" })
        .then(() => queryClient.setQueryData(["view-mode", prefKey], next))
        .catch(() => {
          // Preference persistence is best-effort; the switch already applied.
        });
    },
    [client, prefKey, queryClient],
  );

  return useMemo(() => ({ mode, setMode }), [mode, setMode]);
}
