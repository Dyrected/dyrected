import { createContext } from "react";
import type { URLSearchParamsInit } from "react-router-dom";
import type { PageAction, PageBreadcrumbItem, PageConfig } from "@dyrected/core";

export interface PageMeta {
  title?: string;
  description?: string;
  breadcrumbs?: PageBreadcrumbItem[];
  actions?: PageAction[];
}

export interface PageMetaContextValue {
  meta: PageMeta;
  setMeta: (next: Partial<PageMeta> | ((prev: PageMeta) => PageMeta)) => void;
  options?: Record<string, unknown>;
  page?: PageConfig;
}

export interface PageRouteContextValue {
  params: Record<string, string>;
  splat: string;
  searchParams: URLSearchParams;
  setSearchParams: (
    next: URLSearchParamsInit | ((prev: URLSearchParams) => URLSearchParamsInit),
    opts?: { replace?: boolean }
  ) => void;
  navigate: (subPath: string, opts?: { replace?: boolean }) => void;
}

export const DYRECTED_PAGE_KEY = Symbol.for("dyrected.page");
export const DYRECTED_PAGE_ROUTE_KEY = Symbol.for("dyrected.page_route");

export const PageMetaContext = createContext<PageMetaContextValue | null>(null);
export const PageRouteContext = createContext<PageRouteContextValue | null>(null);
