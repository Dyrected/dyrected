import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import * as React from "react";
import {
  PageMetaContext,
  PageRouteContext,
  type PageMeta,
  type PageMetaContextValue,
  type PageRouteContextValue,
} from "../../providers/page-context";
import { usePageMeta } from "../use-page-meta";
import { usePageRoute } from "../use-page-route";

describe("usePageMeta and usePageRoute hooks", () => {
  it("provides options, page, and allows setting page meta without loops", () => {
    let currentMeta: PageMeta = { title: "Initial Title" };
    const setMetaSpy = vi.fn((next: any) => {
      currentMeta = typeof next === "function" ? next(currentMeta) : { ...currentMeta, ...next };
    });

    const contextValue: PageMetaContextValue = {
      meta: currentMeta,
      setMeta: setMetaSpy,
      options: { theme: "dark" },
      page: { slug: "arrivals", component: "arrivals", label: "Arrivals" },
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PageMetaContext.Provider value={{ ...contextValue, meta: currentMeta }}>
        {children}
      </PageMetaContext.Provider>
    );

    const { result, rerender } = renderHook(
      ({ title }: { title?: string }) => usePageMeta({ title }),
      {
        wrapper,
        initialProps: { title: "Updated Title" },
      }
    );

    expect(result.current.options).toEqual({ theme: "dark" });
    expect(result.current.page?.slug).toBe("arrivals");
    expect(setMetaSpy).toHaveBeenCalled();

    const callCount = setMetaSpy.mock.calls.length;

    // Rerender with the identical title: should not trigger extra state update
    rerender({ title: "Updated Title" });
    expect(setMetaSpy.mock.calls.length).toBe(callCount);
  });

  it("usePageRoute returns route context values and navigates relatively", () => {
    const navigateSpy = vi.fn();
    const routeContextValue: PageRouteContextValue = {
      params: { slug: "reports", month: "2026-10" },
      splat: "2026-10/summary",
      searchParams: new URLSearchParams("tab=overview"),
      setSearchParams: vi.fn(),
      navigate: navigateSpy,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PageRouteContext.Provider value={routeContextValue}>
        {children}
      </PageRouteContext.Provider>
    );

    const { result } = renderHook(() => usePageRoute(), { wrapper });

    expect(result.current.params.slug).toBe("reports");
    expect(result.current.splat).toBe("2026-10/summary");
    expect(result.current.searchParams.get("tab")).toBe("overview");

    act(() => {
      result.current.navigate("2026-11");
    });
    expect(navigateSpy).toHaveBeenCalledWith("2026-11");
  });
});
