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
} from "lucide-react"
import { useDyrected } from "../../providers/dyrected-provider"
import { cn } from "../../lib/utils"
import { BrandingProvider } from "./branding-provider"

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
        "group flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-all duration-150",
        collapsed ? "justify-center px-2" : "",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "shrink-0 transition-colors",
          collapsed ? "h-[17px] w-[17px]" : "h-[15px] w-[15px]",
          active ? "text-background" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && active && (
        <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-50 shrink-0" />
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
      <div className="space-y-1">
        <div className="my-2 mx-3 h-px bg-border" />
        {children}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 mt-4 mb-1 group"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors">
          {label}
        </span>
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/50" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/50" />
        )}
      </button>
      <div className={cn("space-y-0.5 overflow-hidden transition-all duration-200", expanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0")}>
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
  const collections = schemas?.collections?.filter((c: any) => !c?.admin?.hidden && !c?.slug.startsWith('platform_')) ?? []
  const globals = schemas?.globals?.filter((g: any) => !g?.admin?.hidden && !g?.slug.startsWith('platform_')) ?? []
  const uploadCollections = collections.filter((c: any) => c.upload)

  const groupLabel = (text: string) =>
    !collapsed ? (
      <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
        {text}
      </p>
    ) : (
      <div className="my-2 mx-3 h-px bg-border" />
    )

  const branding = schemas?.admin?.branding;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Logo */}
      {!isEmbedded && (
        <div
          className={cn(
            "flex items-center h-14 border-b border-border shrink-0 transition-all",
            collapsed ? "justify-center px-2" : "gap-2.5 px-4"
          )}
        >
          {branding?.logo || branding?.logoMark ? (
            <div className="h-7 w-7 flex items-center justify-center shrink-0">
              <img
                src={collapsed ? (branding.logoMark || branding.logo) : (branding.logo || branding.logoMark)}
                alt="Logo"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="h-7 w-7 bg-foreground rounded flex items-center justify-center text-background shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" />
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          {!collapsed && (
            <span className="font-semibold text-sm tracking-tight text-foreground flex-1 truncate">
              {branding?.titleSuffix?.replace(/^- /, '') || 'Dyrected'}
            </span>
          )}

          {/* Desktop Toggle in Sidebar */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-all ml-auto"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
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
              <div className="space-y-1 px-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={cn("h-8 rounded-md bg-muted/60 animate-pulse", collapsed ? "mx-1" : "mx-2")} />
                ))}
              </div>
            ) : (() => {
              const nonUpload = collections.filter((col: any) => !col.upload)
              const groups = new Map<string, any[]>()
              const ungrouped: any[] = []

              nonUpload.forEach((col: any) => {
                const g = col.admin?.group
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
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate">{col.labels?.plural ?? col.label ?? col.slug}</span>
                    {!collapsed && (
                      <div className="flex gap-1 shrink-0">
                        {col.auth && <Shield className="h-2.5 w-2.5 text-primary/70" />}
                        {col.shared && <Share2 className="h-2.5 w-2.5 text-purple-500/70" />}
                        {isReadOnly && <Lock className="h-2.5 w-2.5 text-muted-foreground/40" />}
                      </div>
                    )}
                  </div>
                )

                return (
                  <NavItem
                    key={col.slug}
                    to={`/collections/${col.slug}`}
                    icon={Database}
                    label={navLabel}
                    active={location.pathname.startsWith(`/collections/${col.slug}`)}
                    collapsed={collapsed}
                    onClick={onNavigate}
                  />
                )
              }

              return (
                <div className="space-y-1">
                  {/* Grouped sections */}
                  {Array.from(groups.entries()).map(([groupName, cols]) => (
                    <NavGroup key={groupName} label={groupName} collapsed={collapsed}>
                      {cols.map(col => renderCollectionItem(col))}
                    </NavGroup>
                  ))}

                  {/* Ungrouped */}
                  {ungrouped.length > 0 && (
                    <NavGroup label="Collections" collapsed={collapsed}>
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
            <div className="space-y-0.5">
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
      <div className="border-t border-border px-2 py-3 shrink-0 space-y-0.5">
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
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
              collapsed ? "justify-center px-2" : ""
            )}
          >
            <LogOut className="h-[15px] w-[15px] shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        )}
      </div>
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
      <div className={cn("flex w-full relative", isEmbedded ? "h-full min-h-[600px]" : "min-h-screen")}>
        {/* ... existing sidebar and main content ... */}
        <aside
          className={cn(
            "hidden md:flex flex-col shrink-0 h-full border-r border-border bg-background transition-all duration-300 overflow-hidden",
            collapsed ? "w-[56px]" : "w-[220px]"
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
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <aside
          className={cn(
            "fixed top-0 left-0 z-40 h-full w-[220px] flex flex-col border-r border-border bg-background transition-transform duration-300 ease-in-out md:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-3.5 right-3 p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
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

        <main className="flex-1 min-w-0 overflow-auto flex flex-col relative">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden fixed top-3 right-3 z-20 p-2.5 rounded-full bg-background border border-border shadow-lg text-foreground hover:bg-muted transition-all active:scale-95"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1 p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </BrandingProvider>
  )
}
