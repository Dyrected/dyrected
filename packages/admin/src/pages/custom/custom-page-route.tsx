import * as React from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { ChevronRight, FileText } from "lucide-react";
import { useDyrected } from "../../providers/dyrected-context";
import { usePreference } from "../../hooks/use-preferences";
import { reconcileNavigation } from "../../utils/navigation-reconciler";
import { DEFAULT_USER_NAV_PREFERENCES } from "../../types/preferences";
import { AdminNotFound, AdminNotFoundSkeleton } from "../../components/layout/admin-not-found";
import { AdminComponentSlot } from "../../components/admin-component-slot";
import { PageHeader } from "../../components/ui/page-header";
import { Button } from "../../components/ui/button";
import { resolveAdminIcon } from "../../lib/admin-icons";
import {
  PageMetaContext,
  PageRouteContext,
  type PageMeta,
  type PageMetaContextValue,
  type PageRouteContextValue,
} from "../../providers/page-context";
import type { CompiledNavItem } from "@dyrected/sdk";

function findPageItem(navigation: any, slug: string): CompiledNavItem | undefined {
  if (!navigation) return undefined;
  if (navigation.groups) {
    for (const group of navigation.groups) {
      if (group.items) {
        const match = group.items.find(
          (item: CompiledNavItem) =>
            item.type === "page" && (item.slug === slug || item.id === `page:${slug}`)
        );
        if (match) return match;
      }
    }
  }
  if (navigation.ungrouped) {
    const match = navigation.ungrouped.find(
      (item: CompiledNavItem) =>
        item.type === "page" && (item.slug === slug || item.id === `page:${slug}`)
    );
    if (match) return match;
  }
  if (navigation.pinnedItems) {
    const match = navigation.pinnedItems.find(
      (item: CompiledNavItem) =>
        item.type === "page" && (item.slug === slug || item.id === `page:${slug}`)
    );
    if (match) return match;
  }
  return undefined;
}

export function CustomPageRoute() {
  const { slug, "*": splatParam } = useParams<{ slug: string; "*": string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { navigation: baseTree, schemas, components } = useDyrected();
  const [userNavPrefs] = usePreference("admin:navigation", DEFAULT_USER_NAV_PREFERENCES);

  const activeNavigation = React.useMemo(() => {
    return reconcileNavigation(baseTree, userNavPrefs, schemas as any, { includeHidden: true });
  }, [baseTree, userNavPrefs, schemas]);

  const navItem = React.useMemo(() => {
    return slug ? findPageItem(activeNavigation, slug) : undefined;
  }, [activeNavigation, slug]);

  const pageConfig = navItem?.page;

  const [pageMeta, setPageMeta] = React.useState<PageMeta>(() => ({
    title: pageConfig?.label || navItem?.label || slug,
    description: undefined,
    breadcrumbs: undefined,
    actions: undefined,
  }));

  // Reset pageMeta when switching pages
  React.useEffect(() => {
    if (pageConfig || navItem) {
      setPageMeta({
        title: pageConfig?.label || navItem?.label || slug,
        description: undefined,
        breadcrumbs: undefined,
        actions: undefined,
      });
    }
  }, [slug, pageConfig?.label, navItem?.label]);

  React.useEffect(() => {
    if (pageMeta.title && typeof document !== "undefined") {
      const suffix = schemas?.admin?.meta?.titleSuffix ?? "- Dyrected";
      const next = [pageMeta.title, suffix].filter(Boolean).join(" ");
      if (document.title !== next) {
        document.title = next;
      }
    }
  }, [pageMeta.title, schemas?.admin?.meta?.titleSuffix]);

  const pageNavigate = React.useCallback(
    (subPath: string, opts?: { replace?: boolean }) => {
      const clean = subPath.startsWith("/") ? subPath : `/${subPath}`;
      navigate(`/pages/${encodeURIComponent(slug || "")}${clean}`, opts);
    },
    [navigate, slug]
  );

  const metaContextValue = React.useMemo<PageMetaContextValue>(
    () => ({
      meta: pageMeta,
      setMeta: (next) => {
        setPageMeta((prev) => (typeof next === "function" ? next(prev) : { ...prev, ...next }));
      },
      options: pageConfig?.options,
      page: pageConfig,
    }),
    [pageMeta, pageConfig]
  );

  const splat = splatParam || "";
  const routeContextValue = React.useMemo<PageRouteContextValue>(
    () => ({
      params: { ...(slug ? { slug } : {}), ...(splat ? { splat } : {}) },
      splat,
      searchParams,
      setSearchParams,
      navigate: pageNavigate,
    }),
    [slug, splat, searchParams, setSearchParams, pageNavigate]
  );

  if (!baseTree || !schemas) {
    return <AdminNotFoundSkeleton />;
  }

  if (!navItem || !pageConfig) {
    return (
      <AdminNotFound
        title="Page not found"
        description={`We could not find a custom admin page with slug "${slug}". It may have been renamed or removed.`}
      />
    );
  }

  const showChrome = pageConfig.chrome !== false;
  const isFullLayout = pageConfig.layout === "full";

  const breadcrumbs =
    pageMeta.breadcrumbs || [
      { label: "Admin", to: "/" },
      ...(navItem.group ? [{ label: navItem.group }] : []),
      { label: pageMeta.title || pageConfig.label || navItem.label || slug },
    ];

  const PageIcon = resolveAdminIcon(pageConfig.icon || navItem.icon, FileText);

  return (
    <PageMetaContext.Provider value={metaContextValue}>
      <PageRouteContext.Provider value={routeContextValue}>
        <div className={isFullLayout ? "dy-w-full" : "dy-max-w-7xl dy-mx-auto dy-p-6"}>
          {showChrome && (
            <div className="dy-mb-6">
              {breadcrumbs.length > 1 && (
                <nav
                  aria-label="Breadcrumb"
                  className="dy-mb-2 dy-flex dy-items-center dy-gap-1.5 dy-text-xs dy-text-muted-foreground"
                >
                  {breadcrumbs.map((crumb, idx) => {
                    const isLast = idx === breadcrumbs.length - 1;
                    return (
                      <React.Fragment key={crumb.label + idx}>
                        {idx > 0 && <ChevronRight className="dy-h-3.5 dy-w-3.5 dy-shrink-0 dy-text-muted-foreground/50" />}
                        {crumb.to && !isLast ? (
                          <Link
                            to={crumb.to}
                            className="dy-transition-colors hover:dy-text-foreground"
                          >
                            {crumb.label}
                          </Link>
                        ) : (
                          <span className={isLast ? "dy-font-medium dy-text-foreground" : ""}>
                            {crumb.label}
                          </span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </nav>
              )}

              <PageHeader
                title={pageMeta.title || pageConfig.label || navItem.label || slug || "Page"}
                description={pageMeta.description}
                icon={PageIcon}
              >
                {pageMeta.actions && pageMeta.actions.length > 0 && (
                  <div className="dy-flex dy-flex-wrap dy-items-center dy-gap-2">
                    {pageMeta.actions.map((act, index) => {
                      const ActionIcon = act.icon ? resolveAdminIcon(act.icon, FileText) : undefined;
                      return (
                        <Button
                          key={act.label + index}
                          variant={act.variant || "default"}
                          size="sm"
                          disabled={act.disabled}
                          onClick={act.onClick}
                          className="dy-gap-1.5"
                        >
                          {ActionIcon && <ActionIcon className="dy-h-4 dy-w-4" />}
                          {act.label}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </PageHeader>
            </div>
          )}

          <main className="dy-min-h-[200px]">
            <AdminComponentSlot
              slot="pages"
              registry={components?.pages as any}
              componentKeys={[pageConfig.component]}
              componentProps={{ slug: pageConfig.slug || slug || "" }}
            />
          </main>
        </div>
      </PageRouteContext.Provider>
    </PageMetaContext.Provider>
  );
}
