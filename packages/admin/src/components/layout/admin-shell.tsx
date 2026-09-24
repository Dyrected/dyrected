import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
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
  Sun,
  Lock,
  Shield,
  Share2,
  LayoutDashboard,
  Users,
  Briefcase,
  ExternalLink,
  icons,
} from "lucide-react"
import type { CompiledNavItem } from "@dyrected/sdk"
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
const DyrectedAILipTrigger = React.lazy(() =>
  import("../ai/DyrectedAILipTrigger").then((m) => ({ default: m.DyrectedAILipTrigger }))
)
import { WorkspaceSwitcher } from "./workspace-switcher"
import logo from "../../assets/dyrected.svg"
import logoDark from "../../assets/dyrected-dark.svg"
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
  badge,
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
  badge?: React.ReactNode
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
      <div className="dy-relative dy-flex dy-items-center dy-justify-center dy-shrink-0">
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
        {collapsed && badge}
      </div>
      {!collapsed && <span className="dy-truncate dy-flex-1 dy-text-left">{label}</span>}
      {!collapsed && badge}
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
  icon,
  children,
  collapsed,
  defaultExpanded = true,
}: {
  label: string
  icon?: string
  children: React.ReactNode
  collapsed: boolean
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const GroupIcon = icon && isAdminIconName(icon) ? icons[icon] : null

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
        <div className="dy-flex dy-items-center dy-gap-1.5 dy-min-w-0">
          {GroupIcon && <GroupIcon className="dy-h-3 dy-w-3 dy-text-muted-foreground/40 dy-shrink-0" />}
          <span className="dy-text-[10px] dy-font-semibold dy-uppercase dy-tracking-widest dy-text-muted-foreground/40 dy-group-hover:dy-text-muted-foreground/60 dy-transition-colors dy-truncate">
            {label}
          </span>
        </div>
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

function AdminIconRenderer({
  icon,
  fallback: Fallback,
  className,
}: {
  icon?: string
  fallback: React.ElementType
  className?: string
}) {
  if (icon && isAdminIconName(icon)) {
    const Icon = icons[icon]
    return <Icon className={className} />
  }
  return <Fallback className={className} />
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
      <AdminIconRenderer
        icon={col.admin?.icon}
        fallback={col.auth ? Users : Database}
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

function CollapsedNavMenu({
  item,
  views,
  icon: Icon,
  label,
  isExactActive,
  isChildActive,
  onNavigate,
  location,
}: {
  item: CompiledNavItem
  views: any[]
  icon: React.ElementType
  label: string
  isExactActive: boolean
  isChildActive: boolean
  onNavigate?: () => void
  location: ReturnType<typeof useLocation>
}) {
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  const handleEnter = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    setOpen(true)
  }
  const handleLeave = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => setOpen(false), 140) as unknown as number
  }

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
            : "dy-text-muted-foreground hover:dy-bg-accent hover:dy-text-foreground"
      )}
    >
      <Icon
        className={cn(
          "dy-h-[17px] dy-w-[17px] dy-shrink-0 dy-transition-colors",
          isExactActive
            ? "dy-text-primary-foreground"
            : isChildActive
              ? "dy-text-foreground"
              : "dy-text-muted-foreground dy-group-hover:dy-text-foreground"
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
              {label}
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
        <DropdownMenuLabel className="dy-text-xs dy-font-semibold">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator className="dy-bg-border/40" />
        {views.map((view: any) => {
          const viewPath = item.type === "collection"
            ? `/collections/${item.slug}/views/${view.slug}`
            : `/${item.slug}/${view.slug}`
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
                {view.label || view.slug}
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
    return views.find((v) => v.slug === configuredSlug)
  }
  return undefined
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
  const { client, user, navigation, badges } = useDyrected()
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
              active={isExactActive && !hasMeaningfulViews}
              isAncestorActive={isCollectionActive && hasMeaningfulViews}
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

  const renderCompiledNavItem = (item: CompiledNavItem) => {
    const views = item.views ?? []
    const hasMeaningfulViews = views.length > 1

    let defaultPath = "/"
    if (item.type === "dashboard") {
      defaultPath = "/"
    } else if (item.type === "link") {
      defaultPath = item.href || "#"
    } else if (item.type === "global") {
      const glob = schemas?.globals?.find((g: any) => g.slug === item.slug)
      defaultPath = (glob as any)?.detail === false ? `/globals/${item.slug}/edit` : `/globals/${item.slug}`
    } else if (item.type === "collection") {
      const defaultView = views[0]
      defaultPath = defaultView && defaultView.slug !== "list"
        ? `/collections/${item.slug}/views/${defaultView.slug}`
        : `/collections/${item.slug}`
    } else if (item.type === "workspace") {
      const defaultView = views[0]
      defaultPath = defaultView ? `/${item.slug}/${defaultView.slug}` : `/${item.slug}`
    }

    let isChildActive = false
    let isExactActive = false

    if (item.type === "dashboard") {
      isExactActive = location.pathname === "/" || location.pathname === ""
    } else if (item.type === "global") {
      isExactActive = location.pathname === `/globals/${item.slug}` || location.pathname === `/globals/${item.slug}/edit`
    } else if (item.type === "collection") {
      isChildActive = location.pathname.startsWith(`/collections/${item.slug}/views/`)
      isExactActive = !isChildActive && location.pathname.startsWith(`/collections/${item.slug}`)
    } else if (item.type === "workspace") {
      isChildActive = views.some((v) => location.pathname === `/${item.slug}/${v.slug}`)
      isExactActive = !isChildActive && location.pathname.startsWith(`/${item.slug}`)
    }

    const isItemActive = isChildActive || isExactActive
    const isExpanded = isItemActive
      ? !userToggledClosed.has(item.slug)
      : userToggledOpen.has(item.slug)

    const col = item.type === "collection" ? schemas?.collections?.find((c: any) => c.slug === item.slug) : undefined
    const FallbackIcon = item.type === "dashboard" ? LayoutDashboard :
      item.type === "global" ? Settings :
      item.type === "link" ? ExternalLink :
      item.type === "collection" ? (col?.auth ? Users : col?.upload ? ImageIcon : Database) :
      Briefcase

    const Icon = resolveAdminIcon(item.icon, FallbackIcon)

    const badgeInfo = badges?.[item.id] ?? badges?.[item.slug]
    const badgeCount = badgeInfo?.count
    const badgeText = badgeInfo?.text ?? (typeof item.badge === "string" ? item.badge : (badgeCount !== undefined ? String(badgeCount) : null))
    const badgeVariant = badgeInfo?.variant ?? (typeof item.badge === "object" ? item.badge.variant : "default")

    const badgeNode = badgeText ? (
      collapsed ? (
        <span
          className={cn(
            "dy-absolute -dy-top-1 -dy-right-1 dy-h-2 dy-w-2 dy-rounded-full",
            badgeVariant === "warning" ? "dy-bg-amber-500" :
            badgeVariant === "destructive" ? "dy-bg-destructive" :
            badgeVariant === "info" ? "dy-bg-blue-500" : "dy-bg-primary"
          )}
        />
      ) : (
        <span
          className={cn(
            "dy-rounded-full dy-px-1.5 dy-py-0.5 dy-text-[10px] dy-font-semibold dy-tabular-nums dy-leading-none dy-shrink-0",
            badgeVariant === "warning" && "dy-bg-amber-500/15 dy-text-amber-600 dark:dy-text-amber-400",
            badgeVariant === "destructive" && "dy-bg-destructive/15 dy-text-destructive",
            badgeVariant === "info" && "dy-bg-blue-500/15 dy-text-blue-600 dark:dy-text-blue-400",
            (!badgeVariant || badgeVariant === "default") && "dy-bg-muted dy-text-muted-foreground"
          )}
        >
          {badgeText}
        </span>
      )
    ) : null

    if (collapsed && hasMeaningfulViews) {
      return (
        <div key={item.id || item.slug} className="dy-space-y-0.5">
          <CollapsedNavMenu
            item={item}
            views={views}
            icon={Icon}
            label={item.label}
            isExactActive={isExactActive}
            isChildActive={isChildActive}
            onNavigate={onNavigate}
            location={location}
          />
        </div>
      )
    }

    return (
      <div key={item.id || item.slug} className="dy-space-y-0.5">
        <div className="dy-flex dy-items-center dy-gap-1">
          <div className="dy-flex-1 dy-min-w-0">
            <NavItem
              to={defaultPath}
              icon={Icon}
              label={item.label}
              tooltipLabel={item.label}
              active={isExactActive && !hasMeaningfulViews}
              isAncestorActive={isItemActive && hasMeaningfulViews}
              hasChildren={false}
              collapsed={collapsed}
              badge={badgeNode}
              onClick={onNavigate}
            />
          </div>
          {!collapsed && hasMeaningfulViews && (
            <button
              type="button"
              onClick={() => toggleCollection(item.slug, isItemActive)}
              aria-label={isExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
              className="dy-flex dy-h-6 dy-w-6 dy-shrink-0 dy-items-center dy-justify-center dy-rounded dy-text-muted-foreground/50 hover:dy-bg-accent hover:dy-text-foreground dy-transition-colors"
            >
              {isExpanded ? <ChevronDown className="dy-h-3.5 dy-w-3.5" /> : <ChevronRight className="dy-h-3.5 dy-w-3.5" />}
            </button>
          )}
        </div>
        {!collapsed && hasMeaningfulViews && isExpanded && (
          <div className="dy-relative dy-ml-4 dy-border-l dy-border-border/60 dy-pl-2 dy-space-y-0.5 dy-my-1">
            {views.map((view) => {
              const viewPath = item.type === "collection"
                ? `/collections/${item.slug}/views/${view.slug}`
                : `/${item.slug}/${view.slug}`
              const isSubActive = location.pathname === viewPath
              return (
                <NavSubItem
                  key={viewPath}
                  to={viewPath}
                  icon={view.icon}
                  label={view.label || view.slug}
                  active={isSubActive}
                  onClick={onNavigate}
                />
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const hasCompiledDashboard = navigation?.groups?.some((g) => g.items?.some((i) => i.type === "dashboard"))
  const branding = schemas?.admin?.branding;
  const meta = schemas?.admin?.meta;

  return (
    <div className="dy-flex dy-h-full dy-min-h-0 dy-flex-col">
      {/* Logo and Collapse Toggle */}
      {!isEmbedded && (
        <div
          className={cn(
            "dy-flex dy-items-center dy-h-14 dy-shrink-0 dy-transition-all",
            collapsed ? "dy-justify-center dy-px-2" : "dy-justify-between dy-px-3.5"
          )}
        >
          <div className="dy-flex dy-items-center dy-gap-2.5 dy-min-w-0 dy-flex-1">
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
          </div>

          {/* Top Collapse Button */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={cn(
                "dy-flex dy-h-7 dy-w-7 dy-items-center dy-justify-center dy-rounded-md dy-text-muted-foreground/50 hover:dy-bg-accent/60 hover:dy-text-foreground dy-transition-colors",
                collapsed && "dy-hidden"
              )}
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="dy-h-4 dy-w-4" />
            </button>
          )}
        </div>
      )}

      {/* Workspace Switcher (renders only in multi-tenant mode) */}
      {!isEmbedded && <WorkspaceSwitcher collapsed={collapsed} />}

      {/* Nav */}
      <nav className="dy-flex-1 dy-overflow-y-auto dy-py-2 dy-px-2 dy-space-y-4">
        {isLoading && !navigation ? (
          <div className="dy-space-y-1 dy-px-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={cn("dy-h-8 dy-rounded-md dy-bg-muted/60 dy-animate-pulse", collapsed ? "dy-mx-1" : "dy-mx-2")} />
            ))}
          </div>
        ) : navigation?.groups && navigation.groups.length > 0 ? (
          <>
            {!hasCompiledDashboard && (
              <div className="dy-space-y-0.5">
                <NavItem
                  to="/"
                  icon={LayoutDashboard}
                  label="Dashboard"
                  active={location.pathname === "/" || location.pathname === ""}
                  collapsed={collapsed}
                  onClick={onNavigate}
                />
              </div>
            )}
            {navigation.groups.map((group) => {
              if (!group.items || group.items.length === 0) return null
              return (
                <NavGroup
                  key={group.id || group.slug || group.name}
                  label={(group as any).label || group.name}
                  icon={group.icon}
                  collapsed={collapsed}
                  defaultExpanded={group.defaultExpanded ?? true}
                >
                  {group.items.map((item) => renderCompiledNavItem(item))}
                </NavGroup>
              )
            })}
            {navigation.ungrouped && navigation.ungrouped.length > 0 && (
              <div className="dy-space-y-0.5">
                {navigation.ungrouped.map((item) => renderCompiledNavItem(item))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="dy-space-y-0.5">
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
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="dy-border-t dy-border-border dy-px-2 dy-py-2.5 dy-shrink-0 dy-space-y-1.5">
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
          "dy-flex dy-items-center dy-w-full",
          collapsed ? "dy-flex-col dy-gap-1.5 dy-items-center" : "dy-justify-between dy-gap-1"
        )}>
          <div className={collapsed ? "dy-w-full" : "dy-flex-1 dy-min-w-0"}>
            <NavItem
              to="/setup"
              icon={Settings}
              label={
                <div className="dy-flex dy-items-center dy-justify-between dy-w-full dy-min-w-0">
                  <span className="dy-truncate">Setup</span>
                  {updateInfo?.hasUpdate && (
                    <span className="dy-h-1.5 dy-w-1.5 dy-rounded-full dy-bg-primary dy-shrink-0 dy-ml-1.5" />
                  )}
                </div>
              }
              tooltipLabel="Setup"
              active={location.pathname === "/setup"}
              collapsed={collapsed}
              onClick={onNavigate}
            />
          </div>

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

const DEFAULT_SIDEBAR_WIDTH = 220
const MIN_SIDEBAR_WIDTH = 180
const MAX_SIDEBAR_WIDTH = 420
const SIDEBAR_WIDTH_STORAGE_KEY = "dyrected_sidebar_width"
const SIDEBAR_WIDTH_PREF_KEY = "layout:admin:sidebar-width"
const COLLAPSED_SIDEBAR_WIDTH = 56

function clampSidebarWidth(value: number) {
  if (Number.isNaN(value)) return DEFAULT_SIDEBAR_WIDTH
  return Math.max(MIN_SIDEBAR_WIDTH, Math.min(value, MAX_SIDEBAR_WIDTH))
}

function readStoredSidebarWidth() {
  if (typeof window === "undefined") return DEFAULT_SIDEBAR_WIDTH
  const saved = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY)
  if (!saved) return DEFAULT_SIDEBAR_WIDTH
  return clampSidebarWidth(parseInt(saved, 10))
}

export function AdminShell({
  children,
  isEmbedded = false,
}: {
  children: React.ReactNode
  isEmbedded?: boolean
}) {
  const { logout, client } = useDyrected()
  const location = useLocation()
  const updateInfo = useUpdateCheck()

  // Desktop: collapsed state (sidebar still sits in the layout)
  const [collapsed, setCollapsed] = useState(false)
  const sidebarControl = React.useMemo(() => ({ collapsed, setCollapsed }), [collapsed])
  // Mobile: open/close overlay
  const [mobileOpen, setMobileOpen] = useState(false)

  // Resizable desktop sidebar width (mirrors the AI panel resize behaviour).
  // Source of truth is the server-backed global preference so the width
  // follows the workspace; localStorage is only the instant cache for first
  // paint and offline fallback.
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => readStoredSidebarWidth())
  const [isResizingSidebar, setIsResizingSidebar] = useState(false)
  const sidebarWidthRef = useRef(sidebarWidth)

  // Keep the ref mirror in sync for use inside mouse handlers.
  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth
  }, [sidebarWidth])

  // Hydrate from the global preference once the client is available.
  useEffect(() => {
    if (!client?.getPreference) return
    let cancelled = false
    client
      .getPreference<number>(SIDEBAR_WIDTH_PREF_KEY, { scope: "global" })
      .then((result) => {
        if (cancelled || result.value == null) return
        const next = clampSidebarWidth(Math.round(Number(result.value)))
        setSidebarWidth((prev) => (prev === next ? prev : next))
        try {
          window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(next))
        } catch {
          // Ignore cache write failures (e.g. private mode); server value wins.
        }
      })
      .catch(() => {
        // Offline or unauthorized: keep the local cache.
      })
    return () => {
      cancelled = true
    }
  }, [client])

  const persistSidebarWidth = useCallback(
    (width: number) => {
      const rounded = Math.round(width)
      try {
        window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(rounded))
      } catch {
        // Ignore cache write failures; the server preference is the source of truth.
      }
      if (client?.setPreference) {
        client.setPreference(SIDEBAR_WIDTH_PREF_KEY, rounded, { scope: "global" }).catch(() => {
          // Ignore persistence failures; the local cache already updated.
        })
      }
    },
    [client]
  )

  const startSidebarResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizingSidebar(true)
      const startX = e.clientX
      const startWidth = sidebarWidthRef.current

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX
        const next = clampSidebarWidth(startWidth + deltaX)
        sidebarWidthRef.current = next
        setSidebarWidth((prev) => (prev === next ? prev : next))
      }

      const onMouseUp = () => {
        setIsResizingSidebar(false)
        document.removeEventListener("mousemove", onMouseMove)
        document.removeEventListener("mouseup", onMouseUp)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
        persistSidebarWidth(sidebarWidthRef.current)
      }

      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
      document.addEventListener("mousemove", onMouseMove)
      document.addEventListener("mouseup", onMouseUp)
    },
    [persistSidebarWidth]
  )

  const handleResetSidebarWidth = useCallback(() => {
    sidebarWidthRef.current = DEFAULT_SIDEBAR_WIDTH
    setSidebarWidth((prev) => (prev === DEFAULT_SIDEBAR_WIDTH ? prev : DEFAULT_SIDEBAR_WIDTH))
    persistSidebarWidth(DEFAULT_SIDEBAR_WIDTH)
  }, [persistSidebarWidth])

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

  const { schemas: contextSchemas } = useDyrected()
  const schemas = contextSchemas
  const isLoading = !schemas

  return (
    <BrandingProvider>
      <SidebarControlProvider value={sidebarControl}>
        <TooltipProvider delayDuration={250}>
          <div
            className={cn(
              "dy-relative dy-flex dy-w-full dy-min-h-0 dy-overflow-hidden",
              isEmbedded ? "dy-h-full dy-min-h-[600px]" : "dy-h-[100dvh]"
            )}
          >
            {/* Desktop Sidebar with Expand Lip Trigger */}
            <div className="dy-relative dy-hidden md:dy-flex dy-h-full dy-shrink-0">
              <aside
                style={{ width: collapsed ? COLLAPSED_SIDEBAR_WIDTH : sidebarWidth }}
                className={cn(
                  "dy-flex dy-h-full dy-min-h-0 dy-flex-col dy-shrink-0 dy-self-stretch dy-border-r dy-border-border dy-bg-card dy-overflow-hidden",
                  isResizingSidebar ? "dy-transition-none" : "dy-transition-all dy-duration-300"
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

              {/* VS Code-style resize handle on the right border (mirrors AI panel) */}
              {!collapsed && (
                <div
                  onMouseDown={startSidebarResizing}
                  onDoubleClick={handleResetSidebarWidth}
                  title={`Drag to resize menu width, double-click to reset (${DEFAULT_SIDEBAR_WIDTH}px)`}
                  aria-label="Resize sidebar width"
                  className={cn(
                    "dy-absolute dy-top-0 dy-bottom-0 -dy-right-1.5 dy-w-3 dy-cursor-col-resize dy-z-30 dy-group dy-flex dy-items-center dy-justify-center hover:dy-bg-primary/10 dy-transition-colors",
                    isResizingSidebar && "dy-bg-primary/20"
                  )}
                >
                  <div
                    className={cn(
                      "dy-w-[2px] dy-h-12 dy-rounded-full dy-bg-border/60 group-hover:dy-bg-primary/80 group-hover:dy-w-[3px] dy-transition-all",
                      isResizingSidebar && "dy-bg-primary dy-w-[3px] dy-h-20"
                    )}
                  />
                </div>
              )}

              {/* Sidebar Expand Lip Trigger */}
              {collapsed && !isEmbedded && (
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setCollapsed(false)}
                      className="dy-absolute -dy-right-4 dy-top-3.5 dy-z-30 dy-flex dy-items-center dy-justify-center dy-h-6 dy-w-6 dy-rounded-none dy-border-l dy-border-border dy-bg-card dy-text-muted-foreground hover:dy-text-foreground hover:dy-bg-accent/40 dy-transition-all dy-duration-150 dy-cursor-pointer group"
                      aria-label="Expand sidebar"
                    >
                      <PanelLeftOpen className="dy-h-3 dy-w-3 dy-transition-transform group-hover:dy-scale-105" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} className="dy-text-xs dy-font-medium">
                    Expand sidebar
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

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
                  className="dy-fixed md:dy-hidden dy-z-10 dy-top-2 dy-right-2 dy-flex dy-h-9 dy-w-9 dy-items-center dy-justify-center dy-rounded-md dy-text-accent-foreground dy-bg-accent hover:dy-bg-accent hover:dy-text-foreground dy-transition-colors"
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
            {schemas?.ai?.enabled ? (
              <React.Suspense fallback={null}>
                <DyrectedAILipTrigger />
              </React.Suspense>
            ) : null}
          </div>
        </TooltipProvider>
      </SidebarControlProvider>
    </BrandingProvider>
  )
}
