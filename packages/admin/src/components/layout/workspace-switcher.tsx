import React, { useState, lazy, Suspense } from "react";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDyrected } from "../../providers/dyrected-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { cn } from "../../lib/utils";

const FormEngine = lazy(async () => {
  const module = await import("../forms/form-engine");
  return { default: module.FormEngine };
});

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
}

export function WorkspaceSwitcher({ collapsed }: WorkspaceSwitcherProps) {
  const { config, setSiteId, user, schemas, client } = useDyrected();
  const queryClient = useQueryClient();
  const currentSiteId = config.siteId || "default";

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCustomInputOpen, setIsCustomInputOpen] = useState(false);
  const [customSiteInput, setCustomSiteInput] = useState("");

  // Extract allowed sites from user object
  const userAllowedSites: string[] | undefined = (() => {
    const raw =
      (user as Record<string, unknown> | null)?.allowedSites ??
      (user as Record<string, unknown> | null)?.siteIds ??
      (user as Record<string, unknown> | null)?.siteAccess ??
      ((user as Record<string, unknown> | null)?.siteId ? [(user as Record<string, unknown>).siteId] : undefined);

    if (Array.isArray(raw)) {
      return raw.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
    }
    return undefined;
  })();

  // Configured sites from admin schemas
  const configuredSites: string[] = (() => {
    const fromAdmin = (schemas?.admin as Record<string, unknown> | undefined)?.sites;
    if (Array.isArray(fromAdmin)) {
      return fromAdmin.filter((s): s is string => typeof s === "string");
    }
    return [];
  })();

  // Detect dedicated workspace collection (e.g. 'workspaces', 'sites', 'tenants', or admin.workspaceCollection)
  const configuredWorkspaceSlug =
    (schemas?.admin as Record<string, unknown> | undefined)?.workspaceCollection as string | undefined;
  const workspaceCollection = schemas?.collections?.find(
    (col) =>
      col.slug === configuredWorkspaceSlug ||
      col.slug === "workspaces" ||
      col.slug === "sites" ||
      col.slug === "tenants"
  );

  // Determine if multi-tenancy is active
  const isExplicitMultitenant = Boolean(
    (schemas?.admin as Record<string, unknown> | undefined)?.multitenant ||
    configuredWorkspaceSlug ||
    workspaceCollection ||
    (userAllowedSites && userAllowedSites.length > 0) ||
    configuredSites.length > 0 ||
    schemas?.collections?.some((c) => c.siteId !== undefined || c.shared === true)
  );

  // Fetch real workspace records if a workspace collection is defined
  const { data: workspaceDocs } = useQuery({
    queryKey: ["admin-workspaces-collection", workspaceCollection?.slug],
    queryFn: async () => {
      if (!client || !workspaceCollection) return [];
      try {
        const res = await client.collection(workspaceCollection.slug).find({ limit: 100 });
        return res?.docs || [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(client && workspaceCollection && isExplicitMultitenant),
  });

  // If the app is single-tenant and has no multi-tenant indicators, hide the switcher entirely!
  if (!isExplicitMultitenant) {
    return null;
  }

  // Combine database workspace records and static sites
  const dbSites: Array<{ id: string; label: string }> = (workspaceDocs || []).map(
    (doc: Record<string, unknown>) => {
      const id = String(doc.slug || doc.siteId || doc.id || "");
      const label = String(doc.name || doc.title || doc.label || doc.slug || doc.id || id);
      return { id, label };
    }
  );

  const allKnownSiteIds = Array.from(
    new Set([
      "default",
      ...(userAllowedSites ?? []),
      ...configuredSites,
      ...dbSites.map((s) => s.id),
      ...(config.siteId ? [config.siteId] : []),
    ])
  );

  const isRestricted = Boolean(userAllowedSites && userAllowedSites.length > 0);
  const selectableSiteIds = isRestricted ? userAllowedSites! : allKnownSiteIds;

  const getSiteLabel = (site: string) => {
    if (site === "default") return "Default Workspace";
    const found = dbSites.find((s) => s.id === site);
    if (found) return found.label;
    return site.charAt(0).toUpperCase() + site.slice(1);
  };

  const currentLabel = getSiteLabel(currentSiteId);

  const handleSelect = (site: string) => {
    setSiteId(site === "default" ? undefined : site);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSiteInput.trim()) {
      setSiteId(customSiteInput.trim());
      setCustomSiteInput("");
      setIsCustomInputOpen(false);
    }
  };

  const handleCreateWorkspace = async (data: Record<string, unknown>) => {
    if (!client || !workspaceCollection) return;
    try {
      setCreateError(null);
      const res = await client.collection(workspaceCollection.slug).create(data);
      const newDoc = ((res as Record<string, unknown>)?.doc ?? res) as Record<string, unknown>;
      const newSiteId = String(newDoc?.slug ?? newDoc?.siteId ?? newDoc?.id ?? "");

      await queryClient.invalidateQueries({
        queryKey: ["admin-workspaces-collection", workspaceCollection.slug],
      });

      if (newSiteId) {
        setSiteId(newSiteId);
      }
      setCreateDialogOpen(false);
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create workspace");
    }
  };

  const triggerButton = (
    <button
      type="button"
      className={
        collapsed
          ? "dy-flex dy-h-8 dy-w-8 dy-items-center dy-justify-center dy-rounded-md dy-border dy-border-border/60 dy-bg-muted/30 hover:dy-bg-accent hover:dy-text-accent-foreground dy-transition-colors"
          : "dy-flex dy-h-8 dy-w-full dy-items-center dy-justify-between dy-gap-2 dy-rounded-md dy-border dy-border-border/60 dy-bg-muted/30 dy-px-2.5 dy-py-1 dy-text-xs dy-font-medium hover:dy-bg-accent/60 dy-transition-colors"
      }
      aria-label={`Workspace: ${currentLabel}`}
    >
      {collapsed ? (
        <Building2 className="dy-h-4 dy-w-4 dy-text-muted-foreground" />
      ) : (
        <>
          <div className="dy-flex dy-items-center dy-gap-2 dy-min-w-0">
            <Building2 className="dy-h-3.5 dy-w-3.5 dy-text-primary/70 dy-shrink-0" />
            <span className="dy-truncate dy-text-foreground">{currentLabel}</span>
          </div>
          <ChevronsUpDown className="dy-h-3.5 dy-w-3.5 dy-text-muted-foreground/60 dy-shrink-0" />
        </>
      )}
    </button>
  );

  return (
    <div className={cn("dy-shrink-0", collapsed ? "dy-px-2 dy-pb-2" : "dy-px-3 dy-pb-2")}>
      <DropdownMenu>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" className="dy-text-xs">
              Workspace: {currentLabel}
            </TooltipContent>
          </Tooltip>
        ) : (
          <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
        )}

        <DropdownMenuContent align="start" className="dy-w-56 dy-text-xs">
          <DropdownMenuLabel className="dy-text-[10px] dy-font-semibold dy-uppercase dy-tracking-wider dy-text-muted-foreground/70">
            Workspaces
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {selectableSiteIds.map((site) => {
            const isSelected = (site === "default" && !config.siteId) || site === config.siteId;
            return (
              <DropdownMenuItem
                key={site}
                onClick={() => handleSelect(site)}
                className="dy-flex dy-items-center dy-justify-between dy-cursor-pointer dy-py-1.5"
              >
                <div className="dy-flex dy-items-center dy-gap-2 dy-min-w-0">
                  <Building2 className="dy-h-3.5 dy-w-3.5 dy-text-muted-foreground dy-shrink-0" />
                  <span className="dy-truncate">{getSiteLabel(site)}</span>
                </div>
                {isSelected && <Check className="dy-h-3.5 dy-w-3.5 dy-text-primary dy-shrink-0" />}
              </DropdownMenuItem>
            );
          })}

          {!isRestricted && (
            <>
              <DropdownMenuSeparator />
              {workspaceCollection ? (
                <DropdownMenuItem
                  onClick={() => {
                    setCreateError(null);
                    setCreateDialogOpen(true);
                  }}
                  className="dy-flex dy-items-center dy-gap-2 dy-cursor-pointer dy-text-primary hover:dy-bg-primary/10"
                >
                  <Plus className="dy-h-3.5 dy-w-3.5" />
                  <span>
                    Add {workspaceCollection.labels?.singular || workspaceCollection.slug || "Workspace"}...
                  </span>
                </DropdownMenuItem>
              ) : isCustomInputOpen ? (
                <form onSubmit={handleCustomSubmit} className="dy-p-1.5 dy-flex dy-items-center dy-gap-1">
                  <input
                    type="text"
                    placeholder="site-id"
                    value={customSiteInput}
                    onChange={(e) => setCustomSiteInput(e.target.value)}
                    className="dy-h-7 dy-w-full dy-rounded dy-border dy-border-input dy-bg-background dy-px-2 dy-text-xs dy-outline-none focus:dy-ring-1 focus:dy-ring-primary"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="dy-h-7 dy-px-2 dy-rounded dy-bg-primary dy-text-primary-foreground dy-text-xs dy-font-medium hover:dy-bg-primary/90"
                  >
                    Go
                  </button>
                </form>
              ) : (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    setIsCustomInputOpen(true);
                  }}
                  className="dy-flex dy-items-center dy-gap-2 dy-cursor-pointer dy-text-muted-foreground hover:dy-text-foreground"
                >
                  <Plus className="dy-h-3.5 dy-w-3.5" />
                  <span>Switch site ID...</span>
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Customizable Workspace Creation Dialog using FormEngine */}
      {workspaceCollection && (
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="dy-max-w-xl dy-overflow-y-auto dy-max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                Create New {workspaceCollection.labels?.singular || workspaceCollection.slug || "Workspace"}
              </DialogTitle>
            </DialogHeader>
            {createError && (
              <div className="dy-rounded-md dy-bg-destructive/10 dy-p-3 dy-text-xs dy-text-destructive">
                {createError}
              </div>
            )}
            <div className="dy-pt-2">
              <Suspense
                fallback={
                  <div className="dy-h-40 dy-rounded-md dy-border dy-border-dashed dy-border-border/70 dy-bg-muted/20" />
                }
              >
                <FormEngine
                  collection={workspaceCollection.slug}
                  fields={workspaceCollection.fields}
                  onSubmit={handleCreateWorkspace}
                  submitLabel={`Create ${workspaceCollection.labels?.singular || "Workspace"}`}
                />
              </Suspense>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
