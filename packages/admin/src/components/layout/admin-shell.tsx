import * as React from "react"
import { useState, useEffect, useRef } from "react"
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
  icons,
} from "lucide-react"
import { useDyrected } from "../../providers/dyrected-context"
import { isNewerVersion, useLatestRelease } from "../../hooks/use-latest-release"
import { cn, getMediaUrl } from "../../lib/utils"
import { isAdminIconName, resolveAdminIcon } from "../../lib/admin-icons"
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"
import { Button } from "../ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet"
import { type AdminThemePreference, useAdminTheme } from "../../hooks/use-admin-theme"
import logo from "@/assets/dyrected.svg"
import logoDark from "@/assets/dyrected-dark.svg"
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

function NavItem({
  to,
  icon: Icon,
  label,
  tooltipLabel,
  active,
  isAncestorActive = false,
  hasChildren = false,
  collapsed,
  onClick,
}: {
  to: string
  icon: React.ElementType
  label: React.ReactNode
  tooltipLabel?: string
  active: boolean
  isAncestorActive?: boolean
  hasChildren?: boolean
  collapsed: boolean
  onClick?: () => void
}) {
  // Derive a plain-text tooltip when caller doesn't provide one — handles string labels
  const tooltipText =
    tooltipLabel ??
    (typeof label === "string" ? label : undefined)

  const link = (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "dy-group dy-flex dy-items-center dy-gap-3 dy-rounded-md dy-px-3 dy-py-2 dy-text-[13px] dy-font-medium dy-transition-all dy-duration-150",
        collapsed ? "dy-justify-center dy-px-2" : "",
        active
          ? "dy-bg-primary dy-text-primary-foreground dy-shadow-xs"
          : isAncestorActive
            ? "dy-bg-accent/60 dy-text-foreground dy-font-semibold"
            : "dy-text-muted-foreground hover:dy-bg-accent hover:dy-text-foreground"
      )}
    >
      <Icon
        className={cn(
          "dy-shrink-0 dy-transition-colors",
          collapsed ? "dy-h-[17px] dy-w-[17px]" : "dy-h-[15px] dy-w-[15px]",
          active
            ? "dy-text-primary-foreground"
            : isAncestorActive
              ? "dy-text-foreground"
              : "dy-text-muted-foreground dy-group-hover:dy-text-foreground"
        )}
      />
      {!collapsed && <span className="dy-truncate">{label}</span>}
      {!collapsed && (
        <>
          {hasChildren && isAncestorActive && (
            <ChevronDown className="dy-ml-auto dy-h-3.5 dy-w-3.5 dy-text-muted-foreground/70 dy-shrink-0" />
          )}
          {hasChildren && !isAncestorActive && !active && (
            <ChevronRight className="dy-ml-auto dy-h-3.5 dy-w-3.5 dy-text-muted-foreground/30 dy-group-hover:dy-text-muted-foreground/60 dy-shrink-0" />
          )}
          {hasChildren && active && (
            <ChevronDown className="dy-ml-auto dy-h-3.5 dy-w-3.5 dy-text-primary-foreground/70 dy-shrink-0" />
          )}
        </>
      )}
    </Link>
  )

  if (!collapsed || !tooltipText) return link

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="dy-text-xs dy-font-medium">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// Nav Group (Collapsible)
// ---------------------------------------------------------------------------
function NavSubItem({
  to,
  icon,
  label,
  active,
  onClick,
}: {
  to: string
  icon?: string
  label: string
  active: boolean
  onClick?: () => void
}) {
  const Icon = icon && isAdminIconName(icon) ? icons[icon] : null
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "dy-group dy-relative dy-flex dy-items-center dy-gap-2.5 dy-rounded-md dy-px-2.5 dy-py-1.5 dy-text-xs dy-transition-all dy-duration-150",
        active
          ? "dy-bg-primary dy-text-primary-foreground dy-font-semibold dy-shadow-xs"
          : "dy-text-muted-foreground hover:dy-bg-accent hover:dy-text-foreground"
      )}
    >
      {Icon ? (
        <Icon
          className={cn(
            "dy-h-3.5 dy-w-3.5 dy-shrink-0 dy-transition-colors",
            active
              ? "dy-text-primary-foreground"
              : "dy-text-muted-foreground/70 dy-group-hover:dy-text-foreground"
          )}
        />
      ) : (
        <span
          className={cn(
            "dy-h-1.5 dy-w-1.5 dy-shrink-0 dy-rounded-full dy-transition-colors",
            active
              ? "dy-bg-primary-foreground"
              : "dy-bg-muted-foreground/40 dy-group-hover:dy-bg-foreground"
          )}
        />
      )}
      <span className="dy-truncate">{label}</span>
    </Link>
  )
}

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

function CollapsedCollectionMenu({
  col,
  views,
  hasDefaultView = false,
  isExactActive,
  isChildActive,
  onNavigate,
  location,
}: {
  col: AdminSidebarCollection
  views: NonNullable<AdminSidebarCollection["views"]>
  hasDefaultView?: boolean
  isExactActive: boolean
  isChildActive: boolean
  onNavigate?: () => void
  location: ReturnType<typeof useLocation>
}) {
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const ParentIcon = resolveAdminIcon(col.admin?.icon, col.auth ? Users : Database)

  const handleEnter = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    setOpen(true)
  }
  const handleLeave = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => setOpen(false), 140) as unknown as number
  }

  const tooltipLabel = col.labels?.plural ?? col.label ?? col.slug

  const triggerButton = (
    <button
      type="button"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={() => setOpen((v) => !v)}
      className={cn(
        "dy-group dy-flex dy-w-full dy-items-center dy-justify-center dy-rounded-md dy-px-2 dy-py-2 dy-text-[13px] dy-font-medium dy-transition-all dy-duration-150",
        isExactActive
          ? "dy-bg-primary dy-text-primary-foreground dy-shadow-xs"
          : isChildActive
            ? "dy-bg-accent/60 dy-text-foreground dy-font-semibold"
            : "dy-text-muted-foreground hover:dy-bg-accent hover:dy-text-foreground",
      )}
      aria-label={`Open ${tooltipLabel} views`}
    >
      <ParentIcon
        className={cn(
          "dy-h-[17px] dy-w-[17px] dy-shrink-0 dy-transition-colors",
          isExactActive
            ? "dy-text-primary-foreground"
            : isChildActive
              ? "dy-text-foreground"
              : "dy-text-muted-foreground dy-group-hover:dy-text-foreground",
        )}
      />
    </button>
  )

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {open ? (
          triggerButton
        ) : (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="dy-text-xs dy-font-medium">
              {tooltipLabel}
            </TooltipContent>
          </Tooltip>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={10}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className="dy-w-56 dy-p-1.5 dy-border-border/40 dy-bg-popover/95 dy-backdrop-blur-sm dy-shadow-xl dy-rounded-xl"
      >
        <DropdownMenuLabel className="dy-text-xs dy-font-semibold">{col.labels?.plural ?? col.slug}</DropdownMenuLabel>
        <DropdownMenuSeparator className="dy-bg-border/40" />
        {!hasDefaultView && (
          <DropdownMenuItem asChild>
            <Link to={`/collections/${col.slug}`} onClick={onNavigate} className="dy-flex dy-items-center dy-gap-2 dy-text-xs dy-rounded-md">
              <LayoutDashboard className="dy-h-3.5 dy-w-3.5 dy-text-muted-foreground" />
              All {col.labels?.plural ?? col.slug}
            </Link>
          </DropdownMenuItem>
        )}
        {views.map((view) => {
          const viewPath = `/collections/${col.slug}/views/${view.slug}`
          const active = location.pathname === viewPath
          const ViewIcon = view.icon && isAdminIconName(view.icon) ? icons[view.icon] : null
          return (
            <DropdownMenuItem
              key={viewPath}
              asChild
              className={cn("dy-rounded-md", active && "dy-bg-accent dy-text-accent-foreground")}
            >
              <Link to={viewPath} onClick={onNavigate} className="dy-flex dy-items-center dy-gap-2 dy-text-xs">
                {ViewIcon ? <ViewIcon className="dy-h-3.5 dy-w-3.5 dy-text-muted-foreground" /> : <span className="dy-h-1.5 dy-w-1.5 dy-rounded-full dy-bg-muted-foreground/40" />}
                {view.label}
              </Link>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
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

  const showTooltip = collapsed || mobile || iconOnly
  const triggerButton = (
    <Button
      type="button"
      variant="ghost"
      size={mobile || collapsed || iconOnly ? "icon" : "sm"}
      className={cn(
        "dy-text-muted-foreground hover:dy-bg-accent hover:dy-text-foreground",
        collapsed || mobile || iconOnly ? "dy-h-7 dy-w-7 dy-px-0 dy-justify-center" : "dy-h-7 dy-w-full dy-justify-start dy-px-2.5 dy-text-[11px]"
      )}
      aria-label="Change admin theme"
    >
      <Icon className="dy-h-3.5 dy-w-3.5" />
      {!collapsed && !mobile && !iconOnly && <span>Theme</span>}
    </Button>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {showTooltip ? (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="dy-text-xs dy-font-medium">
              Theme — {theme}
            </TooltipContent>
          </Tooltip>
        ) : (
          triggerButton
        )}
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
    defaultView?: string;
  };
  defaultView?: string;
  access?: {
    read?: boolean;
    create?: boolean;
    update?: boolean;
    delete?: boolean;
  };
  views?: Array<{
    slug: string;
    label: string;
    icon?: string;
    default?: boolean;
  }>;
  shared?: boolean;
}

function getDefaultView(col: AdminSidebarCollection) {
  const views = col.views ?? []
  const configuredSlug = col.admin?.defaultView ?? col.defaultView
  if (configuredSlug) {
    const matched = views.find((v) => v.slug === configuredSlug)
    if (matched) return matched
  }
  return views.find((v) => v.default === true)
}

interface AdminSidebarGlobal {
  slug: string;
  label?: string;
  admin?: {
    icon?: string;
    hidden?: boolean;
  };
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
  const [userToggledOpen, setUserToggledOpen] = useState<Set<string>>(() => new Set())
  const [userToggledClosed, setUserToggledClosed] = useState<Set<string>>(() => new Set())

  const toggleCollection = (slug: string, isCollectionActive: boolean) => {
    if (isCollectionActive) {
      setUserToggledClosed((prev) => {
        const next = new Set(prev)
        if (next.has(slug)) next.delete(slug)
        else next.add(slug)
        return next
      })
    } else {
      setUserToggledOpen((prev) => {
        const next = new Set(prev)
        if (next.has(slug)) next.delete(slug)
        else next.add(slug)
        return next
      })
    }
  }

  const collections = (schemas?.collections as unknown as AdminSidebarCollection[] | undefined)?.filter((c) => !c?.admin?.hidden && !c?.slug.startsWith('platform_')) ?? []
  const globals = (schemas?.globals as unknown as AdminSidebarGlobal[] | undefined)?.filter((g) => !g?.admin?.hidden && !g?.slug.startsWith('platform_')) ?? []
  const uploadCollections = collections.filter((c) => c.upload)
  const standardCollections = collections.filter((c) => !c.upload && !c.auth)
  const authCollections = collections.filter((c) => !c.upload && c.auth)

  const groupLabel = (text: string) =>
    !collapsed ? (
      <p className="dy-px-3 dy-mb-1.5 dy-text-[10px] dy-font-semibold dy-uppercase dy-tracking-widest dy-text-muted-foreground/50">
        {text}
      </p>
    ) : (
      <div className="dy-my-2 dy-mx-3 dy-h-px dy-bg-border" />
    )

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

    const views = col.views ?? []
    const defaultView = getDefaultView(col)
    const hasDefaultView = Boolean(defaultView)
    const defaultViewPath = defaultView
      ? `/collections/${col.slug}/views/${defaultView.slug}`
      : `/collections/${col.slug}`

    const hasMeaningfulViews = views.length > 1 || (views.length === 1 && views[0].slug !== "list")
    const isChildActive = location.pathname.startsWith(`/collections/${col.slug}/views/`)
    const isExactActive =
      !isChildActive && location.pathname.startsWith(`/collections/${col.slug}`)
    const isCollectionActive = isChildActive || isExactActive
    const isExpanded = isCollectionActive
      ? !userToggledClosed.has(col.slug)
      : userToggledOpen.has(col.slug)

    if (collapsed && hasMeaningfulViews) {
      return (
        <div key={col.slug} className="dy-space-y-0.5">
          <CollapsedCollectionMenu
            col={col}
            views={views}
            hasDefaultView={hasDefaultView}
            isExactActive={isExactActive}
            isChildActive={isChildActive}
            onNavigate={onNavigate}
            location={location}
          />
        </div>
      )
    }

    return (
      <div key={col.slug} className="dy-space-y-0.5">
        <div className="dy-flex dy-items-center dy-gap-1">
          <div className="dy-flex-1 dy-min-w-0">
            <NavItem
              to={defaultViewPath}
              icon={resolveAdminIcon(col.admin?.icon, col.auth ? Users : Database)}
              label={navLabel}
              tooltipLabel={col.labels?.plural ?? col.label ?? col.slug}
              active={isExactActive}
              isAncestorActive={isChildActive}
              hasChildren={false}
              collapsed={collapsed}
              onClick={onNavigate}
            />
          </div>
          {!collapsed && hasMeaningfulViews && (
            <button
              type="button"
              onClick={() => toggleCollection(col.slug, isCollectionActive)}
              aria-label={isExpanded ? `Collapse ${col.slug}` : `Expand ${col.slug}`}
              className="dy-flex dy-h-6 dy-w-6 dy-shrink-0 dy-items-center dy-justify-center dy-rounded dy-text-muted-foreground/50 hover:dy-bg-accent hover:dy-text-foreground dy-transition-colors"
            >
              {isExpanded ? <ChevronDown className="dy-h-3.5 dy-w-3.5" /> : <ChevronRight className="dy-h-3.5 dy-w-3.5" />}
            </button>
          )}
        </div>
        {!collapsed && hasMeaningfulViews && isExpanded && (
          <div className="dy-relative dy-ml-4 dy-border-l dy-border-border/60 dy-pl-2 dy-space-y-0.5 dy-my-1">
            {!hasDefaultView && (
              <NavSubItem
                key={`/collections/${col.slug}`}
                to={`/collections/${col.slug}`}
                icon="LayoutDashboard"
                label={`All ${col.labels?.plural ?? col.slug}`}
                active={isExactActive}
                onClick={onNavigate}
              />
            )}
            {views.map((view) => {
              const viewPath = `/collections/${col.slug}/views/${view.slug}`
              return (
                <NavSubItem
                  key={viewPath}
                  to={viewPath}
                  icon={view.icon}
                  label={view.label}
                  active={location.pathname === viewPath}
                  onClick={onNavigate}
                />
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const renderCollectionSection = (
    sectionCollections: Array<AdminSidebarCollection>,
    ungroupedLabel: string,
  ) => {
    if (sectionCollections.length === 0) return null

    const groups = new Map<string, Array<AdminSidebarCollection>>()
    const ungrouped: Array<AdminSidebarCollection> = []

    sectionCollections.forEach((col) => {
      const groupName = col.admin?.group
      if (groupName) {
        if (!groups.has(groupName)) groups.set(groupName, [])
        groups.get(groupName)!.push(col)
        return
      }
      ungrouped.push(col)
    })

    return (
      <div className="dy-space-y-1">
        {Array.from(groups.entries()).map(([groupName, cols]) => (
          <NavGroup key={groupName} label={groupName} collapsed={collapsed} defaultExpanded={true}>
            {cols.map((col) => renderCollectionItem(col))}
          </NavGroup>
        ))}

        {ungrouped.length > 0 && (
          <NavGroup label={ungroupedLabel} collapsed={collapsed} defaultExpanded={true}>
            {ungrouped.map((col) => renderCollectionItem(col))}
          </NavGroup>
        )}
      </div>
    )
  }

  const branding = schemas?.admin?.branding;
  const meta = schemas?.admin?.meta;

  return (
    <div className="dy-flex dy-h-full dy-min-h-0 dy-flex-col">
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
                  <img src={logo} alt="Dyrected" className="dy-h-8 dy-w-auto dark:dy-hidden" />
                  <img src={logoDark} alt="Dyrected" className="dy-h-8 dy-w-auto dy-hidden dark:dy-block" />
                </div>
              )}
              {!collapsed && !branding?.logoText && (
                <span className="dy-font-serif dy-text-lg dy-tracking-tight dy-text-foreground dy-flex-1 dy-truncate">
                  {meta?.titleSuffix?.replace(/^- /, '') || ''}
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

        {(isLoading || standardCollections.length > 0 || authCollections.length > 0) && (
          <div>
            {isLoading ? (
              <div className="dy-space-y-1 dy-px-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={cn("dy-h-8 dy-rounded-md dy-bg-muted/60 dy-animate-pulse", collapsed ? "dy-mx-1" : "dy-mx-2")} />
                ))}
              </div>
            ) : (
              <div className="dy-space-y-1">
                {renderCollectionSection(standardCollections, "Collections")}
                {renderCollectionSection(authCollections, "Auth")}
              </div>
            )}
          </div>
        )}


        {globals.length > 0 && (
          <div>
            {groupLabel("Configuration")}
            <div className="dy-space-y-0.5">
              {globals.map((glob) => {
                const hasGlobalDetail = (glob as any).detail !== false
                return (
                  <NavItem
                    key={glob.slug}
                    to={hasGlobalDetail ? `/globals/${glob.slug}` : `/globals/${glob.slug}/edit`}
                    icon={resolveAdminIcon(glob.admin?.icon, Settings)}
                    label={glob.label ?? glob.slug}
                    active={
                      location.pathname === `/globals/${glob.slug}` ||
                      location.pathname === `/globals/${glob.slug}/edit`
                    }
                    collapsed={collapsed}
                    onClick={onNavigate}
                  />
                )
              })}
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
          tooltipLabel="Setup & Help"
          active={location.pathname === "/setup"}
          collapsed={collapsed}
          onClick={onNavigate}
        />
        {!isEmbedded && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {(() => {
                const userButton = (
                  <button
                    type="button"
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
                )
                if (!collapsed) return userButton
                return (
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>{userButton}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8} className="dy-text-xs dy-font-medium">
                      {getUserLabel(user)}
                    </TooltipContent>
                  </Tooltip>
                )
              })()}
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
            (() => {
              const label = collapsed ? "Expand sidebar" : "Collapse sidebar"
              const btn = (
                <button
                  onClick={onToggleCollapse}
                  className={cn(
                    "dy-group/btn dy-flex dy-h-7 dy-items-center dy-gap-2 dy-rounded-md dy-px-2.5 dy-text-[11px] dy-font-medium dy-text-muted-foreground/45 dy-transition-colors hover:dy-bg-accent/40 hover:dy-text-muted-foreground focus-visible:dy-outline-none focus-visible:dy-ring-2 focus-visible:dy-ring-ring",
                    collapsed ? "dy-justify-center dy-px-2 dy-w-full" : "dy-flex-1"
                  )}
                  aria-label={label}
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
              )
              if (!collapsed) return btn
              return (
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} className="dy-text-xs dy-font-medium">
                    {label}
                  </TooltipContent>
                </Tooltip>
              )
            })()
          )}

          <ThemeSelector collapsed={collapsed} iconOnly={!collapsed} />
        </div>
      </div>
    </div >
  )
}

function useUpdateCheck() {
  const currentVersion = (import.meta.env as Record<string, string | undefined>).DYRECTED_VERSION || "0.0.0";
  const { data } = useLatestRelease();

  if (!data?.version) return null;

  return {
    latestVersion: data.version,
    hasUpdate: isNewerVersion(data.version, currentVersion),
  };
}

export function AdminShell({
  children,
  isEmbedded = false,
}: {
  children: React.ReactNode
  isEmbedded?: boolean
}) {
  const { client, logout } = useDyrected()
  const location = useLocation()
  const updateInfo = useUpdateCheck()

  // Desktop: collapsed state (sidebar still sits in the layout)
  const [collapsed, setCollapsed] = useState(false)
  const sidebarControl = React.useMemo(() => ({ collapsed, setCollapsed }), [collapsed])
  // Mobile: open/close overlay
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close the mobile sidebar whenever the route changes. Depends only on the
  // path (not mobileOpen) so opening the drawer never re-triggers this; the
  // setter is a no-op when it is already closed.
  useEffect(() => {
    queueMicrotask(() => {
      setMobileOpen(false)
    })
  }, [location.pathname])

  // Lock scroll on mobile when open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  // When embedded, the host (cloud dashboard) hides the admin's own mobile
  // header and drives the nav drawer via a window event so there is a single
  // top bar on mobile. Toggle the drawer when the host dispatches it.
  useEffect(() => {
    if (!isEmbedded) return
    const handleToggle = () => setMobileOpen((prev) => !prev)
    window.addEventListener("dyrected:toggle-menu", handleToggle)
    return () => window.removeEventListener("dyrected:toggle-menu", handleToggle)
  }, [isEmbedded])

  const { data: schemas, isLoading } = useQuery({
    queryKey: ["schemas"],
    queryFn: async () => {
      if (!client) return null
      return client.getSchemas()
    },
    enabled: !!client,
  })

  return (
    <BrandingProvider>
      <SidebarControlProvider value={sidebarControl}>
        <TooltipProvider delayDuration={300}>
          <div
            className={cn(
              "dy-relative dy-flex dy-w-full dy-min-h-0 dy-overflow-hidden",
              isEmbedded ? "dy-h-full dy-min-h-[600px]" : "dy-h-[100dvh]"
            )}
          >
          {/* ... existing sidebar and main content ... */}
          <aside
            className={cn(
              "dy-hidden md:dy-flex dy-h-full dy-min-h-0 dy-flex-col dy-shrink-0 dy-self-stretch dy-border-r dy-border-border dy-bg-card dy-transition-all dy-duration-300 dy-overflow-hidden",
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

          <main className="dy-relative dy-flex dy-min-h-0 dy-min-w-0 dy-flex-1 dy-flex-col dy-overflow-auto dy-bg-background/95">
            {/* Mobile top header — hidden on desktop, and hidden entirely when
                embedded (the host dashboard renders the single mobile bar). */}
            {!isEmbedded && (
              /* Mobile header is intentionally minimal: a single hamburger at
                 the top-right. Brand, theme, and account all live inside the
                 nav drawer it opens, so nothing is lost. */
              // <header className="md:dy-hidden dy-sticky dy-top-0 dy-z-20 dy-flex dy-h-14 dy-items-center dy-justify-end dy-border-b dy-border-border dy-bg-background/95 dy-backdrop-blur-sm dy-px-3 dy-shrink-0">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="dy-fixed md:dy-hidden dy-z-10 dy-top-2 dy-right-2 dy-flex dy-h-9 dy-w-9 dy-items-center dy-justify-center dy-rounded-md dy-text-muted-foreground dy-bg-background hover:dy-bg-accent hover:dy-text-foreground dy-transition-colors"
                aria-label="Open menu"
              >
                <Menu className="dy-h-5 dy-w-5" />
              </button>
              // </header>
            )}

            <div className="dy-flex-1 dy-py-6 dy-px-4 lg:dy-py-10 lg:dy-px-6">
              {children}
            </div>
          </main>
          </div>
        </TooltipProvider>
      </SidebarControlProvider>
    </BrandingProvider>
  )
}
