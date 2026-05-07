import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Settings,
  Database,
  Image as ImageIcon,
  LogOut
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "../../components/ui/sidebar"

import { useDyrected } from "../../providers/dyrected-provider"

export function AdminShell({ children, isEmbedded = false }: { children: React.ReactNode, isEmbedded?: boolean }) {
  const { client, logout } = useDyrected()
  const location = useLocation()

  const { data: schemas, isLoading } = useQuery({
    queryKey: ["schemas"],
    queryFn: async () => {
      if (!client) return null
      return client.getSchemas()
    },
    enabled: !!client
  })

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          {!isEmbedded && <SidebarHeader className="border-b px-4 py-3 bg-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                <LayoutDashboard className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">Dyrected</h1>
            </div>
          </SidebarHeader>}
          <SidebarContent className="px-2 py-4">
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">Content</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Dashboard" isActive={location.pathname === "/"} className="rounded-lg">
                      <Link to="/">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Media Library" isActive={location.pathname === "/media"} className="rounded-lg">
                      <Link to="/media">
                        <ImageIcon className="h-4 w-4" />
                        <span>Media Library</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="px-4 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">Collections</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {isLoading ? (
                    <div className="px-4 py-2 text-xs text-muted-foreground italic">Loading...</div>
                  ) : schemas?.collections?.filter(col => col?.admin?.hidden)?.map((col: any) => (
                    <SidebarMenuItem key={col.slug}>
                      <SidebarMenuButton asChild tooltip={col.label} isActive={location.pathname === `/collections/${col.slug}`} className="rounded-lg">
                        <Link to={`/collections/${col.slug}`}>
                          <Database className="h-4 w-4" />
                          <span>{col.labels?.plural}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="px-4 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">Configuration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {schemas?.globals?.map((glob: any) => (
                    <SidebarMenuItem key={glob.slug}>
                      <SidebarMenuButton asChild tooltip={glob.label} isActive={location.pathname === `/globals/${glob.slug}`} className="rounded-lg">
                        <Link to={`/globals/${glob.slug}`}>
                          <Settings className="h-4 w-4" />
                          <span>{glob.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          {!isEmbedded && (
            <SidebarFooter className="border-t p-4 bg-muted/30">
              <button
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </SidebarFooter>
          )}
        </Sidebar>
        <main className="flex-1 overflow-auto bg-background/50 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl p-8">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="h-9 w-9 rounded-lg border border-border bg-white shadow-sm" />
                {/* <div className="h-4 w-px bg-border/60" /> */}
                {/* <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    {location.pathname === '/' ? 'Dashboard' :
                      location.pathname.startsWith('/collections/') ? 'Collection' :
                        location.pathname.startsWith('/globals/') ? 'Global Setting' :
                          location.pathname === '/media' ? 'Media Library' : 'Admin'}
                  </h2>
                  <p className="text-xs text-muted-foreground">Manage your site content and settings.</p>
                </div> */}
              </div>
            </div>
            <div className="animate-in">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
