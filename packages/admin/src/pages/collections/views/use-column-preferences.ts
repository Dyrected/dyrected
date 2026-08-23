import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDyrected } from "../../../providers/dyrected-context";

/**
 * Persisted column preferences for an operational table/spreadsheet view.
 * `order` lists every managed column id in display order; `hidden` lists ids
 * currently not rendered.
 */
export interface ColumnPreferences {
  order: string[];
  hidden: string[];
}

interface UseColumnPreferencesOptions {
  slug: string;
  viewSlug: string;
  /** All manageable column ids, in schema-declared default order. */
  columnIds: string[];
  /** Columns whose visibility/order is fixed by layout (excluded from prefs). */
  fixedIds?: string[];
  /**
   * Layout variant sharing this view (e.g. "cards", "kanban"). Scoped into the
   * storage keys so each layout keeps independent preferences.
   */
  variant?: string;
}

function samePreferences(a: ColumnPreferences, b: ColumnPreferences): boolean {
  return (
    a.order.length === b.order.length &&
    a.order.every((id, index) => id === b.order[index]) &&
    a.hidden.length === b.hidden.length &&
    a.hidden.every((id) => b.hidden.includes(id))
  );
}

/** Drops unknown ids, appends newly-added ids, keeps declared order otherwise. */
function reconcile(raw: unknown, columnIds: string[]): ColumnPreferences {
  const valid = new Set(columnIds);
  const rawObj = (raw && typeof raw === "object" ? raw : {}) as Partial<ColumnPreferences>;
  const rawOrder = Array.isArray(rawObj.order) ? rawObj.order.filter((id): id is string => typeof id === "string") : [];
  const rawHidden = Array.isArray(rawObj.hidden)
    ? rawObj.hidden.filter((id): id is string => typeof id === "string")
    : [];

  const knownOrder = rawOrder.filter((id) => valid.has(id));
  const missing = columnIds.filter((id) => !knownOrder.includes(id));
  const seen = new Set<string>();
  const order = [...knownOrder, ...missing].filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const hiddenSet = new Set(rawHidden.filter((id) => valid.has(id)));
  return { order, hidden: order.filter((id) => hiddenSet.has(id)) };
}

/**
 * Column ordering/visibility with three storage tiers:
 * explicit local edits → saved server preference (personal/global scope) →
 * schema defaults. Unsaved edits also persist to sessionStorage so they
 * survive route changes within the session.
 */
export function useColumnPreferences({
  slug,
  viewSlug,
  columnIds,
  fixedIds = [],
  variant,
}: UseColumnPreferencesOptions) {
  const { client, user } = useDyrected();
  const queryClient = useQueryClient();

  const keyScope = variant ? `${viewSlug}:${variant}` : viewSlug;
  const prefKey = `view-pref:${slug}:${keyScope}`;
  const sessionKey = `view-columns:${slug}:${keyScope}`;
  const manageKey = [...fixedIds, ...columnIds].join("\u0000");

  const defaultPreferences = useMemo<ColumnPreferences>(
    () => ({ order: [...columnIds], hidden: [] }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [manageKey],
  );

  // The route mounts this hook per `slug:viewSlug` (keyed upstream), so the
  // session snapshot is intentionally read exactly once.
  const [sessionInitial] = useState(() => reconcile(readSession(sessionKey), columnIds));

  const { data: rawServerPreference } = useQuery({
    queryKey: ["view-preferences", prefKey],
    queryFn: async () => {
      if (!client?.getPreference) return null;
      const response = await client.getPreference(prefKey);
      return response.value;
    },
    enabled: !!client?.getPreference,
    staleTime: 5_000,
  });

  const serverPreference = useMemo(
    () => (rawServerPreference ? reconcile(rawServerPreference, columnIds) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawServerPreference, manageKey],
  );

  /** Explicit unsaved edits win over everything. */
  const [edits, setEdits] = useState<ColumnPreferences | null>(null);

  const effective = edits ?? serverPreference ?? sessionInitial ?? defaultPreferences;

  const applyEdit = useCallback(
    (next: ColumnPreferences) => {
      setEdits((prev) => (prev && samePreferences(prev, next) ? prev : next));
      writeSession(sessionKey, next);
    },
    [sessionKey],
  );

  const setOrder = useCallback(
    (order: string[]) => applyEdit(reconcile({ order, hidden: effective.hidden }, columnIds)),
    [applyEdit, columnIds, effective.hidden],
  );

  const setHidden = useCallback(
    (hidden: string[]) => applyEdit(reconcile({ order: effective.order, hidden }, columnIds)),
    [applyEdit, columnIds, effective.order],
  );

  const toggleVisibility = useCallback(
    (id: string, visible: boolean) => {
      const nextHidden = visible
        ? effective.hidden.filter((hiddenId) => hiddenId !== id)
        : effective.hidden.includes(id)
          ? effective.hidden
          : [...effective.hidden, id];
      setHidden(nextHidden);
    },
    [effective.hidden, setHidden],
  );

  const showAll = useCallback(() => setHidden([]), [setHidden]);
  const hideAllExcept = useCallback(
    (keepId?: string) => setHidden(effective.order.filter((id) => id !== keepId)),
    [effective.order, setHidden],
  );

  const saveMutation = useMutation({
    mutationFn: async ({ scope, value }: { scope: "personal" | "global"; value: ColumnPreferences }) => {
      if (!client?.setPreference) throw new Error("Preferences are unavailable");
      await client.setPreference(prefKey, value, { scope });
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["view-preferences", prefKey] });
      toast.success(variables.scope === "global" ? "Saved view preferences for everyone" : "Saved view preferences");
    },
    onError: (error: Error) => toast.error("Could not save preferences", { description: error.message }),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!client?.deletePreference) throw new Error("Preferences are unavailable");
      await client.deletePreference(prefKey, { scope: "personal" });
    },
    onSuccess: () => {
      setEdits(null);
      clearSession(sessionKey);
      void queryClient.invalidateQueries({ queryKey: ["view-preferences", prefKey] });
      toast.success("View preferences reset to default");
    },
    onError: (error: Error) => toast.error("Could not reset preferences", { description: error.message }),
  });

  const isAdmin = user?.role === "admin";

  return useMemo(
    () => ({
      preferences: effective,
      isDirty: !!edits,
      setOrder,
      toggleVisibility,
      showAll,
      hideAllExcept,
      saveForMe: () => saveMutation.mutateAsync({ scope: "personal", value: effective }).then(() => setEdits(null)),
      saveForEveryone: () => saveMutation.mutateAsync({ scope: "global", value: effective }).then(() => setEdits(null)),
      reset: () => resetMutation.mutateAsync(),
      isSaving: saveMutation.isPending || resetMutation.isPending,
      isAdmin: !!isAdmin,
    }),
    [effective, edits, setOrder, toggleVisibility, showAll, hideAllExcept, saveMutation, resetMutation, isAdmin],
  );
}

function readSession(key: string): unknown {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(key: string, value: ColumnPreferences): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable — persistence stays best-effort.
  }
}

function clearSession(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}
