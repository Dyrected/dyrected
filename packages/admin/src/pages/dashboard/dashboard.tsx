import { AlertCircle, ArrowRight, ChevronDown, Clock3, FileText, Globe, Plus, Settings, Upload } from "lucide-react"
import { Link } from "react-router-dom"
import { useQueries, useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../providers/dyrected-provider"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { AdminComponentSlot } from "../../components/admin-component-slot"
import type { AdminSchemas, DashboardSlotProps } from "../../types/admin-components"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"

type SchemaCollection = {
  slug: string
  label?: string
  labels?: { singular?: string; plural?: string }
  upload?: boolean
  auth?: boolean
  admin?: {
    hidden?: boolean
    useAsTitle?: string
  }
  fields?: Array<{
    name: string
    label?: string
    type?: string
    required?: boolean
    admin?: { hidden?: boolean }
  }>
}

type SchemaGlobal = {
  slug: string
  label?: string
  admin?: { hidden?: boolean }
}

type RecentEdit = {
  id: string
  title: string
  collectionSlug: string
  collectionLabel: string
  updatedAt?: string
  status?: string
}

function isVisibleCollection(collection: SchemaCollection) {
  return !collection.admin?.hidden && !collection.slug.startsWith("platform_") && collection.slug !== "__admins"
}

function isVisibleGlobal(global: SchemaGlobal) {
  return !global.admin?.hidden && !global.slug.startsWith("platform_")
}

function getCollectionLabel(collection: SchemaCollection) {
  return collection.labels?.plural || collection.label || collection.slug
}

function getCollectionSingular(collection: SchemaCollection) {
  return collection.labels?.singular || collection.label || collection.slug
}

function getDocumentTitle(collection: SchemaCollection, doc: Record<string, unknown>) {
  const titleField = collection.admin?.useAsTitle
  const fallbackField = collection.fields?.find((field) => !field.admin?.hidden && field.type !== "relationship")?.name
  const value = (titleField && doc[titleField]) || (fallbackField && doc[fallbackField]) || doc.title || doc.name || doc.slug || doc.id
  return value ? String(value) : "Untitled"
}

function formatRelativeDate(value?: string) {
  if (!value) return "Recently"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Recently"

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))

  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

function getStatusLabel(doc: Record<string, unknown>) {
  const status = doc.status || doc._status
  return typeof status === "string" && status.trim() ? status : "Updated"
}

export function Dashboard() {
  const { client, components, user } = useDyrected()

  const { data: schemas, isLoading: isLoadingSchemas } = useQuery({
    queryKey: ["schemas"],
    queryFn: () => client!.getSchemas(),
    enabled: !!client,
  })

  const collections = ((schemas?.collections || []) as SchemaCollection[]).filter(isVisibleCollection)
  const globals = ((schemas?.globals || []) as SchemaGlobal[]).filter(isVisibleGlobal)
  const editableCollections = collections.filter((collection) => !collection.auth)
  const uploadCollection = collections.find((collection) => collection.upload)
  const creatableCollections = editableCollections.filter((collection) => !collection.upload)
  const primaryGlobal = globals[0]
  const recentCollections = creatableCollections.slice(0, 6)

  const recentQueries = useQueries({
    queries: recentCollections.map((collection) => ({
      queryKey: ["dashboard-recent-edits", collection.slug],
      queryFn: () => client!.find(collection.slug, { limit: 3, sort: "-updatedAt", depth: 0 }),
      enabled: !!client && !!collection.slug,
      retry: false,
    })),
  })

  const recentEdits = recentQueries
    .flatMap((query, index) => {
      const collection = recentCollections[index]
      return (query.data?.docs || []).map((doc: Record<string, unknown>) => ({
        id: String(doc.id || ""),
        title: getDocumentTitle(collection, doc),
        collectionSlug: collection.slug,
        collectionLabel: getCollectionLabel(collection),
        updatedAt: typeof doc.updatedAt === "string" ? doc.updatedAt : undefined,
        status: getStatusLabel(doc),
      }))
    })
    .sort((a: RecentEdit, b: RecentEdit) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return bTime - aTime
    })
    .slice(0, 6)

  const attentionItems = [
    ...collections
      .filter((collection) => !collection.upload && !collection.admin?.useAsTitle)
      // .slice(0, 2)
      .map((collection) => ({
        key: `title-${collection.slug}`,
        title: `${getCollectionLabel(collection)} needs a title field`,
        description: "Set admin.useAsTitle for clearer lists and relationships.",
        to: `/collections/${collection.slug}`,
      })),
    ...collections
      .filter((collection) => collection.upload && !collection.fields?.some((field) => field.name === "alt"))
      .slice(0, 1)
      .map((collection) => ({
        key: `alt-${collection.slug}`,
        title: `${getCollectionLabel(collection)} has no alt text field`,
        description: "Add alt text metadata to improve accessible media.",
        to: `/collections/${collection.slug}`,
      })),
    ...(globals.length === 0
      ? [{
        key: "globals-empty",
        title: "No global settings configured",
        description: "Globals are useful for site settings, navigation, and footer content.",
        to: "/setup",
      }]
      : []),
  ].slice(0, 4)

  if (isLoadingSchemas) {
    return (
      <div className="dy-flex dy-h-64 dy-items-center dy-justify-center">
        <div className="dy-h-8 dy-w-8 dy-animate-spin dy-rounded-full dy-border-b-2 dy-border-primary" />
      </div>
    )
  }

  const resolvedSchemas = schemas as AdminSchemas
  const dashboardComponentProps: DashboardSlotProps = {
    client: client!,
    user,
    schemas: resolvedSchemas,
  }
  const dashboardSlots = resolvedSchemas?.admin?.components

  if (collections.length === 0 && globals.length === 0) {
    return (
      <div className="dy-space-y-6">
        <AdminComponentSlot
          slot="beforeDashboard"
          componentKeys={dashboardSlots?.beforeDashboard}
          registry={components?.dashboard}
          componentProps={dashboardComponentProps}
        />
        <div className="dy-flex dy-h-64 dy-items-center dy-justify-center">
          <div className="dy-space-y-4 dy-text-center">
            <p className="dy-text-muted-foreground">No collections configured yet.</p>
            <Button asChild>
              <Link to="/setup">Open Setup Guide</Link>
            </Button>
          </div>
        </div>
        <AdminComponentSlot
          slot="afterDashboard"
          componentKeys={dashboardSlots?.afterDashboard}
          registry={components?.dashboard}
          componentProps={dashboardComponentProps}
        />
      </div>
    )
  }

  return (
    <div className="dy-space-y-6 dy-animate-in dy-fade-in dy-duration-500 lg:dy-space-y-8">
      <AdminComponentSlot
        slot="beforeDashboard"
        componentKeys={dashboardSlots?.beforeDashboard}
        registry={components?.dashboard}
        componentProps={dashboardComponentProps}
      />
      <div className="dy-flex dy-flex-col dy-gap-4 lg:dy-flex-row lg:dy-items-end lg:dy-justify-between">
        <div className="dy-space-y-1">
          <h2 className="dy-font-serif dy-text-3xl dy-font-bold dy-tracking-tight">Dashboard</h2>
          <p className="dy-max-w-2xl dy-text-sm dy-leading-6 dy-text-muted-foreground">
            Recent work and items that need attention.
          </p>
        </div>
      </div>

      <div className="dy-grid dy-gap-3 sm:dy-grid-cols-3">
        {creatableCollections.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="dy-h-11 dy-justify-between dy-gap-2 dy-rounded-md dy-text-sm">
                <span className="dy-flex dy-min-w-0 dy-items-center dy-gap-2">
                  <Plus className="dy-h-4 dy-w-4 dy-flex-shrink-0" />
                  <span className="dy-truncate">New</span>
                </span>
                <ChevronDown className="dy-h-4 dy-w-4 dy-flex-shrink-0 dy-opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="dy-w-[--radix-dropdown-menu-trigger-width] dy-min-w-56">
              {creatableCollections.map((collection) => (
                <DropdownMenuItem key={collection.slug} asChild>
                  <Link to={`/collections/${collection.slug}/new`} className="dy-flex dy-items-center dy-gap-2">
                    <Plus className="dy-h-4 dy-w-4" />
                    New {getCollectionSingular(collection)}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {uploadCollection && (
          <Button asChild variant="outline" className="dy-h-11 dy-justify-start dy-gap-2 dy-rounded-md dy-text-sm">
            <Link to={`/collections/${uploadCollection.slug}`}>
              <Upload className="dy-h-4 dy-w-4" />
              Upload media
            </Link>
          </Button>
        )}
        {primaryGlobal && (
          <Button asChild variant="outline" className="dy-h-11 dy-justify-start dy-gap-2 dy-rounded-md dy-text-sm">
            <Link to={`/globals/${primaryGlobal.slug}`}>
              <Settings className="dy-h-4 dy-w-4" />
              Edit {primaryGlobal.label || primaryGlobal.slug}
            </Link>
          </Button>
        )}
      </div>

      <div className="dy-grid dy-gap-6 xl:dy-grid-cols-[minmax(0,1fr)_360px]">
        <section className="dy-min-w-0 dy-rounded-lg dy-border dy-border-border/60 dy-bg-card/50">
          <div className="dy-flex dy-items-center dy-justify-between dy-border-b dy-border-border/50 dy-px-4 dy-py-3">
            <div className="dy-flex dy-items-center dy-gap-2">
              <Clock3 className="dy-h-4 dy-w-4 dy-text-primary" />
              <h3 className="dy-text-sm dy-font-semibold">Recent edits</h3>
            </div>
            {recentCollections[0] && (
              <Button variant="ghost" size="sm" asChild className="dy-h-8 dy-gap-1.5 dy-text-xs">
                <Link to={`/collections/${recentCollections[0].slug}`}>
                  View All {getCollectionLabel(recentCollections[0])}
                  <ArrowRight className="dy-h-3.5 dy-w-3.5" />
                </Link>
              </Button>
            )}
          </div>

          {recentEdits.length > 0 ? (
            <div className="dy-divide-y dy-divide-border/40">
              {recentEdits.map((edit) => (
                <Link
                  key={`${edit.collectionSlug}-${edit.id}`}
                  to={`/collections/${edit.collectionSlug}/edit/${edit.id}`}
                  className="dy-group dy-grid dy-gap-3 dy-px-4 dy-py-3 dy-transition-colors hover:dy-bg-primary/[0.03] sm:dy-grid-cols-[minmax(0,1fr)_auto_auto] sm:dy-items-center"
                >
                  <div className="dy-min-w-0">
                    <p className="dy-truncate dy-text-sm dy-font-semibold dy-text-foreground dy-transition-colors group-hover:dy-text-primary">
                      {edit.title}
                    </p>
                    <p className="dy-text-xs dy-text-muted-foreground">{edit.collectionLabel}</p>
                  </div>
                  <Badge variant="outline" className="dy-w-fit dy-border-primary/20 dy-bg-primary/5 dy-text-[10px] dy-text-primary">
                    {edit.status}
                  </Badge>
                  <span className="dy-text-xs dy-text-muted-foreground sm:dy-text-right">
                    {formatRelativeDate(edit.updatedAt)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="dy-flex dy-min-h-56 dy-flex-col dy-items-center dy-justify-center dy-gap-3 dy-p-8 dy-text-center">
              <FileText className="dy-h-8 dy-w-8 dy-text-muted-foreground/40" />
              <div className="dy-space-y-1">
                <p className="dy-text-sm dy-font-semibold">No recent edits yet</p>
                <p className="dy-text-xs dy-text-muted-foreground">Create or update content and it will appear here.</p>
              </div>
            </div>
          )}
        </section>

        <section className="dy-rounded-lg dy-border dy-border-border/60 dy-bg-card/50">
          <div className="dy-flex dy-items-center dy-gap-2 dy-border-b dy-border-border/50 dy-px-4 dy-py-3">
            <AlertCircle className="dy-h-4 dy-w-4 dy-text-primary" />
            <h3 className="dy-text-sm dy-font-semibold">Needs attention</h3>
          </div>

          {attentionItems.length > 0 ? (
            <div className="dy-divide-y dy-divide-border/40">
              {attentionItems.map((item) => (
                <Link
                  key={item.key}
                  to={item.to}
                  className="dy-group dy-block dy-px-4 dy-py-4 dy-transition-colors hover:dy-bg-primary/[0.03]"
                >
                  <div className="dy-flex dy-gap-3">
                    <span className="dy-mt-1 dy-h-2 dy-w-2 dy-flex-shrink-0 dy-rounded-full dy-bg-primary" />
                    <div className="dy-min-w-0 dy-space-y-1">
                      <p className="dy-text-sm dy-font-semibold dy-transition-colors group-hover:dy-text-primary">
                        {item.title}
                      </p>
                      <p className="dy-text-xs dy-leading-5 dy-text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="dy-flex dy-min-h-56 dy-flex-col dy-items-center dy-justify-center dy-gap-3 dy-p-8 dy-text-center">
              <Globe className="dy-h-8 dy-w-8 dy-text-muted-foreground/40" />
              <div className="dy-space-y-1">
                <p className="dy-text-sm dy-font-semibold">Nothing urgent</p>
                <p className="dy-text-xs dy-text-muted-foreground">Your content model looks ready for editing.</p>
              </div>
            </div>
          )}
        </section>
      </div>
      <AdminComponentSlot
        slot="afterDashboard"
        componentKeys={dashboardSlots?.afterDashboard}
        registry={components?.dashboard}
        componentProps={dashboardComponentProps}
      />
    </div>
  )
}
