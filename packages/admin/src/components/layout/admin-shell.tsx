import * as React from "react"
import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useLocation } from "react-router-dom"
import {
  Database,
  Image as ImageIcon,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Sun,
  Lock,
  Shield,
  Share2,
  LayoutDashboard,
  Users,
} from "lucide-react"
import { useDyrected } from "../../providers/dyrected-context"
import { cn, getMediaUrl } from "../../lib/utils"
import { resolveAdminIcon } from "../../lib/admin-icons"
import { BrandingProvider } from "./branding-provider"
import { SidebarControlProvider } from "./sidebar-control"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { Button } from "../ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet"
import { type AdminThemePreference, useAdminTheme } from "../../hooks/use-admin-theme"
import logo from "@/assets/dyrected.svg"
import type { AdminSchemas } from "../../types/admin-components"

function getUserString(user: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = user?.[key]
  return typeof value === "string" && value.length > 0 ? value : null
}

function getUserLabel(user: Record<string, unknown> | null | undefined) {
  return getUserString(user, "name") ?? getUserString(user, "email") ?? "?"
}

function getUserInitial(user: Record<string, unknown> | null | undefined) {
  return getUserLabel(user).charAt(0).toUpperCase()
}

// ---------------------------------------------------------------------------
// Single nav item
// ---------------------------------------------------------------------------
function NavItem({
  to,
  icon: Icon,
  label,
  active,
  collapsed,
  onClick,
}: {
  to: string
  icon: React.ElementType
  label: React.ReactNode
  active: boolean
  collapsed: boolean
  onClick?: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "dy-group dy-flex dy-items-center dy-gap-3 dy-rounded-md dy-px-3 dy-py-2 dy-text-[13px] dy-font-medium dy-transition-all dy-duration-150",
        collapsed ? "dy-justify-center dy-px-2" : "",
        active
          ? "dy-bg-primary dy-text-primary-foreground"
          : "dy-text-muted-foreground hover:dy-bg-accent hover:dy-text-foreground"
      )}
    >
      <Icon
        className={cn(
          "dy-shrink-0 dy-transition-colors",
          collapsed ? "dy-h-[17px] dy-w-[17px]" : "dy-h-[15px] dy-w-[15px]",
          active ? "dy-text-background" : "dy-text-foreground dy-group-hover:dy-text-foreground"
        )}
      />
      {!collapsed && <span className="dy-truncate">{label}</span>}
      {!collapsed && active && (
        <ChevronRight className="dy-ml-auto dy-h-3.5 dy-w-3.5 dy-opacity-50 dy-shrink-0" />
      )}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Nav Group (Collapsible)
// ---------------------------------------------------------------------------
function NavGroup({
  label,
  children,
  collapsed,
  defaultExpanded = true,
}: {
  label: string
  children: React.ReactNode
  collapsed: boolean
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (collapsed) {
    return (
      <div className="dy-space-y-1">
        <div className="dy-my-2 dy-mx-3 dy-h-px dy-bg-border" />
        {children}
      </div>
    )
  }

  return (
    <div className="dy-space-y-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="dy-flex dy-w-full dy-items-center dy-justify-between dy-px-3 dy-mt-4 dy-mb-1 dy-group"
      >
        <span className="dy-text-[10px] dy-font-semibold dy-uppercase dy-tracking-widest dy-text-muted-foreground/40 dy-group-hover:dy-text-muted-foreground/60 dy-transition-colors">
          {label}
        </span>
        {expanded ? (
          <ChevronDown className="dy-h-3 dy-w-3 dy-text-muted-foreground/30 dy-group-hover:dy-text-muted-foreground/50" />
        ) : (
          <ChevronRight className="dy-h-3 dy-w-3 dy-text-muted-foreground/30 dy-group-hover:dy-text-muted-foreground/50" />
        )}
      </button>
      <div className={cn("dy-space-y-0.5 dy-overflow-hidden dy-transition-all dy-duration-200", expanded ? "dy-max-h-[1000px] dy-opacity-100" : "dy-max-h-0 dy-opacity-0")}>
        {children}
      </div>
    </div>
  )
}

function ThemeSelector({
  collapsed = false,
  mobile = false,
  iconOnly = false,
}: {
  collapsed?: boolean
  mobile?: boolean
  iconOnly?: boolean
}) {
  const { resolvedTheme, setTheme, theme } = useAdminTheme()
  const Icon = resolvedTheme === "dark" ? Moon : Sun

  const options: Array<{ value: AdminThemePreference; label: string; icon: React.ElementType }> = [
    { value: "system", label: "System", icon: Monitor },
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={mobile || collapsed || iconOnly ? "icon" : "sm"}
          className={cn(
            "dy-text-muted-foreground hover:dy-bg-accent hover:dy-text-foreground",
            collapsed || mobile || iconOnly ? "dy-h-7 dy-w-7 dy-px-0 dy-justify-center" : "dy-h-7 dy-w-full dy-justify-start dy-px-2.5 dy-text-[11px]"
          )}
          title="Theme"
          aria-label="Change admin theme"
        >
          <Icon className="dy-h-3.5 dy-w-3.5" />
          {!collapsed && !mobile && !iconOnly && <span>Theme</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={collapsed || mobile ? "bottom" : "top"} align="end" sideOffset={8} className="dy-w-40">
        <DropdownMenuLabel className="dy-px-2 dy-py-1.5 dy-text-xs dy-text-muted-foreground">
          Theme
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as AdminThemePreference)}
        >
          {options.map((option) => {
            const OptionIcon = option.icon
            return (
              <DropdownMenuRadioItem key={option.value} value={option.value} className="dy-cursor-pointer">
                <OptionIcon className="dy-h-4 dy-w-4 mr-2" />
                {option.label}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------------------------------------------------------------------------
// Sidebar inner content (shared)
// ---------------------------------------------------------------------------
interface UpdateInfo {
  latestVersion: string;
  hasUpdate: boolean;
}

interface AdminSidebarCollection {
  slug: string;
  upload?: boolean;
  auth?: boolean;
  label?: string;
  labels?: {
    singular?: string;
    plural?: string;
  };
  admin?: {
    icon?: string;
    group?: string;
    hidden?: boolean;
  };
  access?: {
    read?: boolean;
    create?: boolean;
    update?: boolean;
    delete?: boolean;
  };
  shared?: boolean;
}

interface AdminSidebarGlobal {
  slug: string;
  label?: string;
  admin?: {
    icon?: string;
    hidden?: boolean;
  };
}

interface AdminBranding {
  logoText?: string;
  logo?: string;
  logoMark?: string;
  titleSuffix?: string;
}

function SidebarInner({
  schemas,
  isLoading,
  location,
  logout,
  isEmbedded,
  collapsed,
  onToggleCollapse,
  onNavigate,
  updateInfo,
}: {
  schemas: AdminSchemas | null | undefined
  isLoading: boolean
  location: ReturnType<typeof useLocation>
  logout: () => void
  isEmbedded: boolean
  collapsed: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
  updateInfo: UpdateInfo | null
}) {
  const { client, user } = useDyrected()
  const collections = (schemas?.collections as unknown as AdminSidebarCollection[] | undefined)?.filter((c) => !c?.admin?.hidden && !c?.slug.startsWith('platform_')) ?? []
  const globals = (schemas?.globals as unknown as AdminSidebarGlobal[] | undefined)?.filter((g) => !g?.admin?.hidden && !g?.slug.startsWith('platform_')) ?? []
  const uploadCollections = collections.filter((c) => c.upload)

  const groupLabel = (text: string) =>
    !collapsed ? (
      <p className="dy-px-3 dy-mb-1.5 dy-text-[10px] dy-font-semibold dy-uppercase dy-tracking-widest dy-text-muted-foreground/50">
        {text}
      </p>
    ) : (
      <div className="dy-my-2 dy-mx-3 dy-h-px dy-bg-border" />
    )

  const branding = (schemas?.admin as Record<string, unknown> | undefined)?.branding as AdminBranding | undefined;

  return (
    <div className="dy-flex dy-flex-col dy-min-h-screen">
      {/* Logo */}
      {!isEmbedded && (

        < div
          className={cn(
            "dy-flex dy-items-center dy-h-14 dy-shrink-0 dy-transition-all",
            collapsed ? "dy-justify-center dy-px-2" : "dy-gap-2.5 dy-px-4"
          )}
        >
          <div>
            <>
              {branding?.logoText ? (
                collapsed ? (
                  // Collapsed: show initials in a styled pill
                  <div className="dy-h-7 dy-w-7 dy-flex dy-items-center dy-justify-center dy-rounded-md dy-bg-primary/10 dy-shrink-0">
                    <span className="dy-text-[11px] dy-font-bold dy-text-primary dy-uppercase dy-tracking-tight dy-leading-none">
                      {branding.logoText
                        .split(" ")
                        .slice(0, 2)
                        .map((w: string) => w[0])
                        .join("")}
                    </span>
                  </div>
                ) : (
                  // Expanded: full text wordmark
                  <span className="dy-font-serif dy-text-lg dy-font-bold dy-tracking-tight dy-text-foreground dy-truncate dy-leading-none">
                    {branding.logoText}
                  </span>
                )
              ) : branding?.logo || branding?.logoMark ? (
                <div className="dy-h-7 dy-w-7 dy-flex dy-items-center dy-justify-center dy-shrink-0">
                  <img
                    src={getMediaUrl(
                      collapsed
                        ? (branding.logoMark || branding.logo)
                        : (branding.logo || branding.logoMark),
                      client?.getBaseUrl() || ""
                    )}
                    alt="Logo"
                    className="dy-max-h-full dy-max-w-full dy-object-contain"
                  />
                </div>
              ) : (
                <div className="dy-h-7 dy-w-auto dy-flex dy-items-center dy-justify-center dy-shrink-0">
                  <img src={logo} alt="Dyrected" className="dy-h-8 dy-w-auto" />
                </div>
              )}
              {!collapsed && !branding?.logoText && (
                <span className="dy-font-serif dy-text-lg dy-tracking-tight dy-text-foreground dy-flex-1 dy-truncate">
                  {branding?.titleSuffix?.replace(/^- /, '') || ''}
                </span>
              )}
            </>
          </div>
          {/* Desktop Toggle - Only visible on desktop since mobile uses overlay */}

        </div>
      )}


      {/* Nav */}
      <nav className="dy-flex-1 dy-overflow-y-auto dy-py-4 dy-px-2 dy-space-y-4">
        <div>
          <NavItem
            to="/"
            icon={LayoutDashboard}
            label="Dashboard"
            active={location.pathname === "/" || location.pathname === ""}
            collapsed={collapsed}
            onClick={onNavigate}
          />
        </div>

        {uploadCollections.length > 0 && (
          <div>
            {groupLabel("Media")}
            {uploadCollections.map((col) => (
              <NavItem
                key={col.slug}
                to={`/collections/${col.slug}`}
                icon={resolveAdminIcon(col.admin?.icon, ImageIcon)}
                label={col.labels?.plural ?? col.label ?? col.slug}
                active={location.pathname.startsWith(`/collections/${col.slug}`)}
                collapsed={collapsed}
                onClick={onNavigate}
              />
            ))}
          </div>
        )}

        {(isLoading || collections.filter((c) => !c.upload).length > 0) && (
          <div>
            {isLoading ? (
              <div className="dy-space-y-1 dy-px-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={cn("dy-h-8 dy-rounded-md dy-bg-muted/60 dy-animate-pulse", collapsed ? "dy-mx-1" : "dy-mx-2")} />
                ))}
              </div>
            ) : (() => {
              const nonUpload = collections.filter((col) => !col.upload)
              const groups = new Map<string, Array<AdminSidebarCollection>>()
              const ungrouped: Array<AdminSidebarCollection> = []

              nonUpload.forEach((col) => {
                let g = col.admin?.group
                if (!g && col.auth) g = "System"

                if (g) {
                  if (!groups.has(g)) groups.set(g, [])
                  groups.get(g)!.push(col)
                } else {
                  ungrouped.push(col)
                }
              })

              const renderCollectionItem = (col: AdminSidebarCollection) => {
                const isReadOnly = col.access?.read && !col.access?.create && !col.access?.update && !col.access?.delete
                const navLabel = (
                  <div className="dy-flex dy-items-center dy-gap-1.5 dy-min-w-0">
                    <span className="dy-truncate">{col.labels?.plural ?? col.label ?? col.slug}</span>
                    {!collapsed && (
                      <div className="dy-flex dy-gap-1 dy-shrink-0">
                        {col.auth && <Shield className="dy-h-4 dy-w-4 dy-text-primary/70" />}
                        {col.shared && <Share2 className="dy-h-4 dy-w-4 dy-text-purple-500/70" />}
                        {isReadOnly && <Lock className="dy-h-4 dy-w-4 dy-text-muted-foreground/40" />}
                      </div>
                    )}
                  </div>
                )

                return (
                  <NavItem
                    key={col.slug}
                    to={`/collections/${col.slug}`}
                    icon={resolveAdminIcon(col.admin?.icon, col.auth ? Users : Database)}
                    label={navLabel}
                    active={location.pathname.startsWith(`/collections/${col.slug}`)}
                    collapsed={collapsed}
                    onClick={onNavigate}
                  />
                )
              }

              return (
                <div className="dy-space-y-1">
                  {/* Grouped sections */}
                  {Array.from(groups.entries()).map(([groupName, cols]) => (
                    <NavGroup key={groupName} label={groupName} collapsed={collapsed} defaultExpanded={true}>
                      {cols.map(col => renderCollectionItem(col))}
                    </NavGroup>
                  ))}

                  {/* Ungrouped */}
                  {ungrouped.length > 0 && (
                    <NavGroup label="Collections" collapsed={collapsed} defaultExpanded={true}>
                      {ungrouped.map(col => renderCollectionItem(col))}
                    </NavGroup>
                  )}
                </div>
              )
            })()}
          </div>
        )}


        {globals.length > 0 && (
          <div>
            {groupLabel("Configuration")}
            <div className="dy-space-y-0.5">
              {globals.map((glob) => (
                <NavItem
                  key={glob.slug}
                  to={`/globals/${glob.slug}`}
                  icon={resolveAdminIcon(glob.admin?.icon, Settings)}
                  label={glob.label ?? glob.slug}
                  active={location.pathname === `/globals/${glob.slug}`}
                  collapsed={collapsed}
                  onClick={onNavigate}
                />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="dy-border-t dy-border-border dy-px-2 dy-py-3 dy-shrink-0 dy-space-y-0.5">
        {/* Setup guidance — always visible to embedded and standalone users. */}
        <NavItem
          to="/setup"
          icon={Sparkles}
          label={
            <div className="dy-flex dy-items-center dy-justify-between dy-w-full dy-min-w-0">
              <span className="dy-truncate">Setup & Help</span>
              {updateInfo?.hasUpdate && (
                <span className="dy-h-1.5 dy-w-1.5 dy-rounded-full dy-bg-primary dy-shrink-0 dy-ml-2" />
              )}
            </div>
          }
          active={location.pathname === "/setup"}
          collapsed={collapsed}
          onClick={onNavigate}
        />
        {!isEmbedded && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={collapsed ? getUserLabel(user) : undefined}
                aria-label={`Open account menu for ${getUserLabel(user)}`}
                className={cn(
                  "dy-group dy-flex dy-w-full dy-items-center dy-gap-2.5 dy-rounded-md dy-px-2.5 dy-py-2 dy-text-left dy-transition-colors hover:dy-bg-accent/70 focus-visible:dy-outline-none focus-visible:dy-ring-2 focus-visible:dy-ring-ring",
                  collapsed ? "dy-justify-center dy-px-2" : ""
                )}
              >
                <div className="dy-flex dy-h-7 dy-w-7 dy-items-center dy-justify-center dy-rounded-full dy-bg-primary/15 dy-text-primary dy-font-semibold dy-text-xs dy-shrink-0">
                  {getUserInitial(user)}
                </div>
                {!collapsed && (
                  <>
                    <div className="dy-flex dy-min-w-0 dy-flex-1 dy-flex-col">
                      <span className="dy-truncate dy-text-[12px] dy-font-medium dy-text-foreground">
                        {getUserLabel(user)}
                      </span>
                      {getUserString(user, "name") && getUserString(user, "email") && (
                        <span className="dy-truncate dy-text-[10px] dy-text-muted-foreground">
                          {getUserString(user, "email")}
                        </span>
                      )}
                    </div>
                    <ChevronDown className="dy-h-3.5 dy-w-3.5 dy-shrink-0 dy-text-muted-foreground/60 dy-transition-transform group-data-[state=open]:dy-rotate-180" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={collapsed ? "right" : "top"}
              align="end"
              sideOffset={8}
              className="dy-w-56 dy-rounded-lg dy-p-1.5 dy-shadow-xl"
            >
              <DropdownMenuLabel className="dy-px-2 dy-py-2 dy-font-normal">
                <span className="dy-block dy-truncate dy-text-xs dy-font-medium dy-text-foreground">
                  {getUserLabel(user)}
                </span>
                {getUserString(user, "name") && getUserString(user, "email") && (
                  <span className="dy-mt-0.5 dy-block dy-truncate dy-text-[11px] dy-text-muted-foreground">
                    {getUserString(user, "email")}
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={logout}
                className="dy-cursor-pointer dy-py-2 dy-text-destructive focus:dy-bg-destructive/10 focus:dy-text-destructive"
              >
                <LogOut className="dy-h-4 dy-w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className={cn(
          "dy-flex dy-items-center dy-gap-1.5 dy-w-full dy-mt-1",
          collapsed ? "dy-flex-col dy-items-center" : "dy-flex-row dy-justify-between"
        )}>
          {onToggleCollapse && !isEmbedded && (
            <button
              onClick={onToggleCollapse}
              className={cn(
                "dy-group/btn dy-flex dy-h-7 dy-items-center dy-gap-2 dy-rounded-md dy-px-2.5 dy-text-[11px] dy-font-medium dy-text-muted-foreground/45 dy-transition-colors hover:dy-bg-accent/40 hover:dy-text-muted-foreground focus-visible:dy-outline-none focus-visible:dy-ring-2 focus-visible:dy-ring-ring",
                collapsed ? "dy-justify-center dy-px-2 dy-w-full" : "dy-flex-1"
              )}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="dy-h-3.5 dy-w-3.5" />
              ) : (
                <>
                  <PanelLeftClose className="dy-h-3.5 dy-w-3.5 dy-transition-transform dy-group-hover/btn:dy--translate-x-0.5" />
                  <span className="dy-truncate">Collapse</span>
                </>
              )}
            </button>
          )}

          <ThemeSelector collapsed={collapsed} iconOnly={!collapsed} />
        </div>
      </div>
    </div >
  )
}

// ---------------------------------------------------------------------------
// AdminShell
// ---------------------------------------------------------------------------
function isNewerVersion(latest: string, current: string): boolean {
  if (latest === current) return false;
  const lParts = latest.split(".").map(Number);
  const cParts = current.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const l = lParts[i] || 0;
    const c = cParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

function useUpdateCheck() {
  const currentVersion = (import.meta.env as Record<string, string | undefined>).DYRECTED_VERSION || "0.0.0";
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(() => {
    if (typeof window === "undefined") return null;
    const cacheKey = "dyrected_latest_release";
    const cacheTimeKey = "dyrected_latest_release_timestamp";
    const cachedVersion = localStorage.getItem(cacheKey);
    const cachedTimestamp = localStorage.getItem(cacheTimeKey);
    const oneDay = 24 * 60 * 60 * 1000;

    if (cachedVersion && cachedTimestamp && Date.now() - Number(cachedTimestamp) < oneDay) {
      return {
        latestVersion: cachedVersion,
        hasUpdate: isNewerVersion(cachedVersion, currentVersion),
      };
    }
    return null;
  });

  useEffect(() => {
    let cancelled = false;
    const cacheKey = "dyrected_latest_release";
    const cacheTimeKey = "dyrected_latest_release_timestamp";
    const oneDay = 24 * 60 * 60 * 1000;

    const cachedVersion = localStorage.getItem(cacheKey);
    const cachedTimestamp = localStorage.getItem(cacheTimeKey);

    if (cachedVersion && cachedTimestamp && Date.now() - Number(cachedTimestamp) < oneDay) {
      return;
    }

    async function fetchLatest() {
      try {
        const res = await fetch("https://registry.npmjs.org/@dyrected/core/latest");
        if (!res.ok) return;
        const data = await res.json();
        const latest = data?.version;

        if (latest) {
          localStorage.setItem(cacheKey, latest);
          localStorage.setItem(cacheTimeKey, String(Date.now()));

          if (!cancelled) {
            setUpdateInfo({
              latestVersion: latest,
              hasUpdate: isNewerVersion(latest, currentVersion),
            });
          }
        }
      } catch (err) {
        console.error("Failed to check for updates:", err);
      }
    }

    fetchLatest();

    return () => {
      cancelled = true;
    };
  }, [currentVersion]);

  return updateInfo;
}

export function AdminShell({
  children,
  isEmbedded = false,
}: {
  children: React.ReactNode
  isEmbedded?: boolean
}) {
  const { client, logout, user } = useDyrected()
  const location = useLocation()
  const updateInfo = useUpdateCheck()

  // Desktop: collapsed state (sidebar still sits in the layout)
  const [collapsed, setCollapsed] = useState(false)
  const sidebarControl = React.useMemo(() => ({ collapsed, setCollapsed }), [collapsed])
  // Mobile: open/close overlay
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (mobileOpen) {
      const timer = setTimeout(() => {
        setMobileOpen(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, mobileOpen])

  // Lock scroll on mobile when open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  const { data: schemas, isLoading } = useQuery({
    queryKey: ["schemas"],
    queryFn: async () => {
      if (!client) return null
      return client.getSchemas()
    },
    enabled: !!client,
  })

  // Extract branding from schemas — schemas type doesn't include admin in its TS signature
  // but it is present at runtime, so we cast once here.
  const mobileBranding = (schemas?.admin as Record<string, unknown> | undefined)?.branding as {
    logoText?: string
    logo?: string
    logoMark?: string
  } | undefined

  return (
    <BrandingProvider>
      <SidebarControlProvider value={sidebarControl}>
        <div className={cn("dy-flex dy-w-full dy-relative", isEmbedded ? "dy-h-full dy-min-h-[600px]" : "dy-min-h-screen")}>
          {/* ... existing sidebar and main content ... */}
          <aside
            className={cn(
              "dy-hidden md:dy-flex dy-flex-col dy-shrink-0 dy-h-full dy-border-r dy-border-border dy-bg-card dy-transition-all dy-duration-300 dy-overflow-hidden",
              collapsed ? "dy-w-[56px]" : "dy-w-[220px]"
            )}
          >
            <SidebarInner
              schemas={schemas}
              isLoading={isLoading}
              location={location}
              logout={logout}
              isEmbedded={isEmbedded}
              collapsed={collapsed}
              onToggleCollapse={() => setCollapsed((v) => !v)}
              updateInfo={updateInfo}
            />
          </aside>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="dy-w-[220px] dy-border-r dy-border-border dy-bg-card dy-p-0 md:dy-hidden [&>button]:dy-hidden">
              <SheetHeader className="dy-sr-only">
                <SheetTitle>Navigation menu</SheetTitle>
                <SheetDescription>Displays the mobile admin navigation.</SheetDescription>
              </SheetHeader>
              <div className="dy-relative dy-flex dy-h-full dy-flex-col">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="dy-absolute dy-right-3 dy-top-3.5 dy-z-10 dy-rounded-md dy-p-1.5 dy-text-muted-foreground dy-transition-colors hover:dy-bg-muted"
                  aria-label="Close menu"
                >
                  <X className="dy-h-4 dy-w-4" />
                </button>
                <SidebarInner
                  schemas={schemas}
                  isLoading={isLoading}
                  location={location}
                  logout={logout}
                  isEmbedded={isEmbedded}
                  collapsed={false}
                  onNavigate={() => setMobileOpen(false)}
                  updateInfo={updateInfo}
                />
              </div>
            </SheetContent>
          </Sheet>

          <main className="dy-flex-1 dy-min-w-0 dy-overflow-auto dy-flex dy-flex-col dy-relative dy-bg-background/95">
            {/* Mobile top header — hidden on desktop */}
            <header className="md:dy-hidden dy-sticky dy-top-0 dy-z-20 dy-flex dy-h-14 dy-items-center dy-border-b dy-border-border dy-bg-background/95 dy-backdrop-blur-sm dy-px-3 dy-shrink-0">
              {/* Hamburger */}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="dy-flex dy-h-9 dy-w-9 dy-items-center dy-justify-center dy-rounded-md dy-text-muted-foreground hover:dy-bg-accent hover:dy-text-foreground dy-transition-colors"
                aria-label="Open menu"
              >
                <Menu className="dy-h-5 dy-w-5" />
              </button>

              {/* Brand — centered */}
              {!isEmbedded && (
                <div className="dy-absolute dy-left-1/2 dy--translate-x-1/2 dy-flex dy-items-center dy-gap-2">
                  {mobileBranding?.logoText ? (
                    <span className="dy-font-serif dy-text-base dy-font-bold dy-tracking-tight dy-text-foreground dy-leading-none">
                      {mobileBranding.logoText}
                    </span>
                  ) : mobileBranding?.logo ? (
                    <img
                      src={getMediaUrl(mobileBranding.logo, client?.getBaseUrl() || "")}
                      alt="Logo"
                      className="dy-h-7 dy-w-auto dy-object-contain"
                    />
                  ) : (
                    <img src={logo} alt="Dyrected" className="dy-h-7 dy-w-auto" />
                  )}
                </div>
              )}
              <div className="dy-ml-auto dy-flex dy-items-center dy-gap-1.5">
                <ThemeSelector mobile />
                {user && (
                  <div className="dy-flex dy-h-8 dy-w-8 dy-items-center dy-justify-center dy-rounded-full dy-bg-primary/10 dy-text-primary dy-font-semibold dy-text-xs dy-shrink-0">
                    {((user.name || user.email || "?") as string).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </header>

            <div className="dy-flex-1 dy-py-6 dy-px-4 lg:dy-py-10 lg:dy-px-6">
              {children}
            </div>
          </main>
        </div>
      </SidebarControlProvider>
    </BrandingProvider>
  )
}
