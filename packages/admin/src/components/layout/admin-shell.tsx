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
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Lock,
  Shield,
  Share2,
  LayoutDashboard,
  Users,
} from "lucide-react"
import { useDyrected } from "../../providers/dyrected-provider"
import { cn } from "../../lib/utils"
import { BrandingProvider } from "./branding-provider"
import logo from "@/assets/dyrected.svg"

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
          active ? "dy-text-background" : "dy-text-muted-foreground dy-group-hover:dy-text-foreground"
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

// ---------------------------------------------------------------------------
// Sidebar inner content (shared)
// ---------------------------------------------------------------------------
function SidebarInner({
  schemas,
  isLoading,
  location,
  logout,
  isEmbedded,
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  schemas: any
  isLoading: boolean
  location: ReturnType<typeof useLocation>
  logout: () => void
  isEmbedded: boolean
  collapsed: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
}) {
  const { client } = useDyrected()
  const collections = schemas?.collections?.filter((c: any) => !c?.admin?.hidden && !c?.slug.startsWith('platform_')) ?? []
  const globals = schemas?.globals?.filter((g: any) => !g?.admin?.hidden && !g?.slug.startsWith('platform_')) ?? []
  const uploadCollections = collections.filter((c: any) => c.upload)

  const groupLabel = (text: string) =>
    !collapsed ? (
      <p className="dy-px-3 dy-mb-1.5 dy-text-[10px] dy-font-semibold dy-uppercase dy-tracking-widest dy-text-muted-foreground/50">
        {text}
      </p>
    ) : (
      <div className="dy-my-2 dy-mx-3 dy-h-px dy-bg-border" />
    )

  const branding = schemas?.admin?.branding;

  return (
    <div className="dy-flex dy-flex-col dy-min-h-screen dy-admin-ui">
      {/* Logo */}
      <div
        className={cn(
          "dy-flex dy-items-center dy-h-14 dy-shrink-0 dy-transition-all",
          collapsed ? "dy-justify-center dy-px-2" : "dy-gap-2.5 dy-px-4"
        )}
      >
        <div>
          {!isEmbedded && (
            <>
              {branding?.logo || branding?.logoMark ? (
                <div className="dy-h-7 dy-w-7 dy-flex dy-items-center dy-justify-center dy-shrink-0">
                  <img
                    src={(collapsed ? (branding.logoMark || branding.logo) : (branding.logo || branding.logoMark), client?.getBaseUrl() || "")}
                    alt="Logo"
                    className="dy-max-h-full dy-max-w-full dy-object-contain"
                  />
                </div>
              ) : (
                <div className="dy-h-7 dy-w-auto dy-flex dy-items-center dy-justify-center dy-shrink-0">
                  <img src={logo} alt="Dyrected" className="dy-h-8 dy-w-auto" />
                </div>
              )}
              {!collapsed && (
                <span className="dy-font-serif dy-text-lg dy-tracking-tight dy-text-foreground dy-flex-1 dy-truncate">
                  {branding?.titleSuffix?.replace(/^- /, '') || ''}
                </span>
              )}
            </>
          )}
        </div>
        {/* Desktop Toggle - Only visible on desktop since mobile uses overlay */}

      </div>


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
            {uploadCollections.map((col: any) => (
              <NavItem
                key={col.slug}
                to={`/collections/${col.slug}`}
                icon={ImageIcon}
                label={col.labels?.plural ?? col.label ?? col.slug}
                active={location.pathname.startsWith(`/collections/${col.slug}`)}
                collapsed={collapsed}
                onClick={onNavigate}
              />
            ))}
          </div>
        )}

        {(isLoading || collections.filter((c: any) => !c.upload).length > 0) && (
          <div>
            {isLoading ? (
              <div className="dy-space-y-1 dy-px-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={cn("dy-h-8 dy-rounded-md dy-bg-muted/60 dy-animate-pulse", collapsed ? "dy-mx-1" : "dy-mx-2")} />
                ))}
              </div>
            ) : (() => {
              const nonUpload = collections.filter((col: any) => !col.upload)
              const groups = new Map<string, any[]>()
              const ungrouped: any[] = []

              nonUpload.forEach((col: any) => {
                let g = col.admin?.group
                if (!g && col.auth) g = "System"

                if (g) {
                  if (!groups.has(g)) groups.set(g, [])
                  groups.get(g)!.push(col)
                } else {
                  ungrouped.push(col)
                }
              })

              const renderCollectionItem = (col: any) => {
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
                    icon={col.auth ? Users : Database}
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
              {globals.map((glob: any) => (
                <NavItem
                  key={glob.slug}
                  to={`/globals/${glob.slug}`}
                  icon={Settings}
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
        {/* Integration guide — always visible so embedded users can access the prompt */}
        <NavItem
          to="/setup"
          icon={Sparkles}
          label="Integration Guide"
          active={location.pathname === "/setup"}
          collapsed={collapsed}
          onClick={onNavigate}
        />

        {!isEmbedded && (
          <button
            onClick={logout}
            title={collapsed ? "Logout" : undefined}
            className={cn(
              "dy-flex dy-w-full dy-items-center dy-gap-3 dy-rounded-md dy-px-3 dy-py-2 dy-text-[13px] dy-font-medium dy-text-muted-foreground dy-transition-colors hover:dy-bg-destructive/10 hover:dy-text-destructive",
              collapsed ? "dy-justify-center dy-px-2" : ""
            )}
          >
            <LogOut className="dy-h-[15px] dy-w-[15px] dy-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        )}
      </div>

      {/* Desktop Collapse Toggle at Bottom */}
      {onToggleCollapse && !isEmbedded && (
        <div className="dy-mt-auto dy-p-4 dy-border-t dy-border-border/40">
          <button
            onClick={onToggleCollapse}
            className={cn(
              "dy-w-full dy-flex dy-items-center dy-gap-3 dy-p-2.5 dy-rounded-xl dy-text-muted-foreground/60 hover:dy-text-foreground hover:dy-bg-accent/50 dy-transition-all dy-group/btn",
              collapsed ? "dy-justify-center" : "dy-px-3"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="dy-h-5 dy-w-5" />
            ) : (
              <>
                <PanelLeftClose className="dy-h-5 dy-w-5 dy-group-hover/btn:dy--translate-x-0.5 dy-transition-transform" />
                <span className="dy-text-sm dy-font-medium dy-text-[13px]">Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AdminShell
// ---------------------------------------------------------------------------
export function AdminShell({
  children,
  isEmbedded = false,
}: {
  children: React.ReactNode
  isEmbedded?: boolean
}) {
  const { client, logout } = useDyrected()
  const location = useLocation()

  // Desktop: collapsed state (sidebar still sits in the layout)
  const [collapsed, setCollapsed] = useState(false)
  // Mobile: open/close overlay
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

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

  return (
    <BrandingProvider>
      <div className={cn("dy-flex dy-w-full dy-relative", isEmbedded ? "dy-h-full dy-min-h-[600px]" : "dy-min-h-screen")}>
        {/* ... existing sidebar and main content ... */}
        <aside
          className={cn(
            "dy-hidden md:dy-flex dy-flex-col dy-shrink-0 dy-h-full dy-border-r dy-border-border dy-bg-background dy-transition-all dy-duration-300 dy-overflow-hidden",
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
          />
        </aside>

        {mobileOpen && (
          <div
            className="dy-fixed dy-inset-0 dy-z-30 dy-bg-black/30 md:dy-hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <aside
          className={cn(
            "dy-fixed dy-top-0 dy-left-0 dy-z-40 dy-h-full dy-w-[220px] dy-flex dy-flex-col dy-border-r dy-border-border dy-bg-background dy-transition-transform dy-duration-300 dy-ease-in-out md:dy-hidden",
            mobileOpen ? "dy-translate-x-0" : "dy--translate-x-full"
          )}
        >
          <button
            onClick={() => setMobileOpen(false)}
            className="dy-absolute dy-top-3.5 dy-right-3 dy-p-1.5 dy-rounded-md dy-text-muted-foreground hover:dy-bg-muted dy-transition-colors"
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
          />
        </aside>

        <main className="dy-flex-1 dy-min-w-0 dy-overflow-auto dy-flex dy-flex-col dy-relative dy-bg-background/50">
          {/* Mobile Floating Toggle */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:dy-hidden dy-fixed dy-bottom-8 dy-right-8 dy-z-50 dy-h-14 dy-w-14 dy-rounded-full dy-bg-gradient-to-br dy-from-primary dy-to-primary/80 dy-text-primary-foreground dy-shadow-[0_8px_30px_rgb(0,0,0,0.3)] dy-flex dy-items-center dy-justify-center dy-transition-all active:dy-scale-90 hover:dy-scale-105 dy-border dy-border-white/20"
            aria-label="Open menu"
          >
            <Menu className="dy-h-6 dy-w-6" />
          </button>

          <div className="dy-flex-1 dy-py-6 dy-px-4 lg:dy-py-10 lg:dy-px-6">
            {children}
          </div>
        </main>
      </div>
    </BrandingProvider>
  )
}
