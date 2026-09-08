import React, { useState } from "react";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { useDyrected } from "../../providers/dyrected-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
}

export function WorkspaceSwitcher({ collapsed }: WorkspaceSwitcherProps) {
  const { config, setSiteId, user, schemas } = useDyrected();
  const currentSiteId = config.siteId || "default";
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

  // Configured sites from admin schemas or default list
  const configuredSites: string[] = (() => {
    const fromAdmin = (schemas?.admin as Record<string, unknown> | undefined)?.sites;
    if (Array.isArray(fromAdmin)) {
      return fromAdmin.filter((s): s is string => typeof s === "string");
    }
    return [];
  })();

  // Combine known sites without duplicates
  const allKnownSites = Array.from(
    new Set([
      "default",
      ...(userAllowedSites ?? []),
      ...configuredSites,
      ...(config.siteId ? [config.siteId] : []),
    ]),
  );

  const isRestricted = Boolean(userAllowedSites && userAllowedSites.length > 0);
  const selectableSites = isRestricted ? userAllowedSites! : allKnownSites;

  const getSiteLabel = (site: string) => {
    if (site === "default") return "Default Workspace";
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

        {selectableSites.map((site) => {
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
            {isCustomInputOpen ? (
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
  );
}
