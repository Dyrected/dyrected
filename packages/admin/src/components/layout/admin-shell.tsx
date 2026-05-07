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
} from "@/components/ui/sidebar"

import { useDyrected } from "@/providers/dyrected-provider"

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
          <SidebarHeader className="border-b px-6 py-4">
            <h1 className="text-xl font-bold tracking-tight">Dyrected</h1>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Core</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Dashboard" isActive={location.pathname === "/"}>
                      <Link to="/">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Media Library" isActive={location.pathname === "/media"}>
                      <Link to="/media">
                        <ImageIcon className="h-4 w-4" />
                        <span>Media Library</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Collections</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {isLoading ? (
                    <div className="px-4 py-2 text-xs text-muted-foreground italic">Loading...</div>
                  ) : schemas?.collections?.map((col: any) => (
                    <SidebarMenuItem key={col.slug}>
                      <SidebarMenuButton asChild tooltip={col.label} isActive={location.pathname === `/collections/${col.slug}`}>
                        <Link to={`/collections/${col.slug}`}>
                          <Database className="h-4 w-4" />
                          <span>{col.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Globals</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {schemas?.globals?.map((glob: any) => (
                    <SidebarMenuItem key={glob.slug}>
                      <SidebarMenuButton asChild tooltip={glob.label} isActive={location.pathname === `/globals/${glob.slug}`}>
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
            <SidebarFooter className="border-t p-4">
              <button 
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </SidebarFooter>
          )}
        </Sidebar>
        <main className="flex-1 overflow-auto bg-muted/20">
          <div className="container mx-auto p-8">
            <div className="mb-8 flex items-center gap-4">
              <SidebarTrigger />
              <div className="h-4 w-px bg-border" />
              <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
            </div>
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
