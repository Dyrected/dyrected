import * as React from "react"
import { useQuery } from "@tanstack/react-query"
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

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { client, logout } = useDyrected()

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
                    <SidebarMenuButton tooltip="Dashboard">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Media Library">
                      <ImageIcon className="h-4 w-4" />
                      <span>Media Library</span>
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
                      <SidebarMenuButton tooltip={col.label}>
                        <Database className="h-4 w-4" />
                        <span>{col.label}</span>
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
                      <SidebarMenuButton tooltip={glob.label}>
                        <Settings className="h-4 w-4" />
                        <span>{glob.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <button 
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </SidebarFooter>
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
