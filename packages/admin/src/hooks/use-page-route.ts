import { useContext } from "react";
import { PageRouteContext, type PageRouteContextValue } from "../providers/page-context";

export type PageRoute = PageRouteContextValue;

export function usePageRoute(): PageRoute {
  const context = useContext(PageRouteContext);
  if (!context) {
    return {
      params: {},
      splat: "",
      searchParams: new URLSearchParams(),
      setSearchParams: () => {},
      navigate: () => {},
    };
  }
  return context;
}
