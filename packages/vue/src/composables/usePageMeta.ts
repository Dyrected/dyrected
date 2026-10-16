import { inject, watch, isRef, toValue, type InjectionKey, type MaybeRefOrGetter } from 'vue';
import type { PageAction, PageBreadcrumbItem, PageConfig } from '@dyrected/core';

export interface PageMeta {
  title?: string;
  description?: string;
  breadcrumbs?: PageBreadcrumbItem[];
  actions?: PageAction[];
}

export interface PageMetaBridgeValue {
  meta: PageMeta;
  setMeta: (next: Partial<PageMeta> | ((prev: PageMeta) => PageMeta)) => void;
  options?: Record<string, unknown>;
  page?: PageConfig;
}

export const DYRECTED_PAGE_KEY: InjectionKey<PageMetaBridgeValue> = Symbol.for('dyrected.page');

export interface UsePageMetaResult {
  options?: Record<string, unknown>;
  page?: PageConfig;
  meta: PageMeta;
  setMeta: (next: Partial<PageMeta> | ((prev: PageMeta) => PageMeta)) => void;
}

export function usePageMeta(meta?: MaybeRefOrGetter<Partial<PageMeta> | undefined>): UsePageMetaResult {
  const bridge = inject(DYRECTED_PAGE_KEY, null);

  if (meta && bridge) {
    watch(
      () => toValue(meta),
      (newMeta) => {
        if (!newMeta) return;
        bridge.setMeta(newMeta);
      },
      { immediate: true, deep: true }
    );
  }

  if (!bridge) {
    return {
      options: undefined,
      page: undefined,
      meta: {},
      setMeta: () => {},
    };
  }

  return {
    options: bridge.options,
    page: bridge.page,
    meta: bridge.meta,
    setMeta: bridge.setMeta,
  };
}
