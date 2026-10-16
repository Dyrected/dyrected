import { inject, type InjectionKey } from 'vue';

export interface PageRouteBridgeValue {
  params: Record<string, string>;
  splat: string;
  searchParams: URLSearchParams;
  setSearchParams: (
    next: any,
    opts?: { replace?: boolean }
  ) => void;
  navigate: (subPath: string, opts?: { replace?: boolean }) => void;
}

export const DYRECTED_PAGE_ROUTE_KEY: InjectionKey<PageRouteBridgeValue> = Symbol.for('dyrected.page_route');

export type PageRoute = PageRouteBridgeValue;

export function usePageRoute(): PageRoute {
  const bridge = inject(DYRECTED_PAGE_ROUTE_KEY, null);

  if (!bridge) {
    return {
      params: {},
      splat: '',
      searchParams: new URLSearchParams(),
      setSearchParams: () => {},
      navigate: () => {},
    };
  }

  return bridge;
}
