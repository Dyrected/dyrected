import { useContext, useEffect, useRef } from "react";
import { PageMetaContext, type PageMeta } from "../providers/page-context";
import type { PageConfig } from "@dyrected/core";

function isMetaShallowEqual(a: PageMeta, b: Partial<PageMeta>): boolean {
  if (b.title !== undefined && a.title !== b.title) return false;
  if (b.description !== undefined && a.description !== b.description) return false;
  if (b.breadcrumbs !== undefined) {
    if (!a.breadcrumbs || a.breadcrumbs.length !== b.breadcrumbs.length) return false;
    for (let i = 0; i < b.breadcrumbs.length; i++) {
      if (a.breadcrumbs[i].label !== b.breadcrumbs[i].label || a.breadcrumbs[i].to !== b.breadcrumbs[i].to) {
        return false;
      }
    }
  }
  if (b.actions !== undefined) {
    if (!a.actions || a.actions.length !== b.actions.length) return false;
    for (let i = 0; i < b.actions.length; i++) {
      const actA = a.actions[i];
      const actB = b.actions[i];
      if (
        actA.label !== actB.label ||
        actA.icon !== actB.icon ||
        actA.disabled !== actB.disabled ||
        actA.variant !== actB.variant ||
        actA.onClick !== actB.onClick
      ) {
        return false;
      }
    }
  }
  return true;
}

export interface UsePageMetaResult {
  options?: Record<string, unknown>;
  page?: PageConfig;
  meta: PageMeta;
  setMeta: (next: Partial<PageMeta> | ((prev: PageMeta) => PageMeta)) => void;
}

export function usePageMeta(meta?: Partial<PageMeta>): UsePageMetaResult {
  const context = useContext(PageMetaContext);
  const prevInputRef = useRef<Partial<PageMeta> | undefined>(undefined);

  useEffect(() => {
    if (!context || !meta) return;

    if (prevInputRef.current && isMetaShallowEqual(context.meta, meta)) {
      return;
    }

    prevInputRef.current = meta;
    context.setMeta((prev) => {
      if (isMetaShallowEqual(prev, meta)) return prev;
      return {
        ...prev,
        ...meta,
      };
    });
  }, [context, meta?.title, meta?.description, meta?.breadcrumbs, meta?.actions]);

  if (!context) {
    return {
      options: undefined,
      page: undefined,
      meta: {},
      setMeta: () => {},
    };
  }

  return {
    options: context.options,
    page: context.page,
    meta: context.meta,
    setMeta: context.setMeta,
  };
}
