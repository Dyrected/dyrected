import { useState, useEffect } from "react"
import { AlertCircle, ArrowRight, ChevronDown, Clock3, FileText, Globe, Plus, Settings, Upload } from "lucide-react"
import { Link } from "react-router-dom"
import { useQueries, useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../providers/dyrected-context"
import { isStorageNotConfiguredError } from "../../lib/media-utils"
import { Button } from "../../components/ui/button"

import { Badge } from "../../components/ui/badge"
import { AdminComponentSlot } from "../../components/admin-component-slot"
import type { AdminSchemas, DashboardSlotProps } from "../../types/admin-components"
import { AdminPageSkeleton } from "../../components/layout/admin-loading"
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
  workflow?: unknown
  admin?: {
    hidden?: boolean
    useAsTitle?: string
  }
  fields?: Array<{
    name: string
    label?: string
    type?: string
    required?: boolean
    options?: Array<string | { label?: string; value: string }>
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

type AttentionItem = {
  key: string
  title: string
  description: string
  to: string
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

function findField(collection: SchemaCollection, fieldName: string) {
  return collection.fields?.find((field) => field.name === fieldName)
}

function hasField(collection: SchemaCollection, fieldName: string) {
  return !!findField(collection, fieldName)
}

function getFieldOptionValues(collection: SchemaCollection, fieldName: string) {
  const field = findField(collection, fieldName)
  const rawOptions = Array.isArray(field?.options) ? field.options : []
  return rawOptions.flatMap((option) => {
    if (typeof option === "string") return [option]
    if (option && typeof option === "object" && typeof option.value === "string") {
      return [option.value]
    }
    return []
  })
}

export function Dashboard() {
  const { client, components, user } = useDyrected()

  const currentVersion = (import.meta.env as Record<string, string | undefined>).DYRECTED_VERSION || "0.0.0";
  const [latestVersion, setLatestVersion] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("dyrected_latest_release");
  });

  useEffect(() => {
    // Refresh the cached release at most once every 6h so the banner reflects
    // newly published versions instead of freezing on the first value seen.
    const STALE_MS = 6 * 60 * 60 * 1000;
    const lastChecked = Number(localStorage.getItem("dyrected_latest_release_timestamp") || 0);
    if (latestVersion && Date.now() - lastChecked < STALE_MS) return;

    let cancelled = false;
    fetch("https://registry.npmjs.org/@dyrected/core/latest")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.version) return;
        setLatestVersion((prev) => (prev === data.version ? prev : data.version));
        localStorage.setItem("dyrected_latest_release", data.version);
        localStorage.setItem("dyrected_latest_release_timestamp", String(Date.now()));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [latestVersion]);

  const hasUpdate = latestVersion && latestVersion !== currentVersion && (() => {
    const lParts = latestVersion.split(".").map(Number);
    const cParts = currentVersion.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      const l = lParts[i] || 0;
      const c = cParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
    }
    return false;
  })();

  const { data: schemas, isLoading: isLoadingSchemas } = useQuery({
    queryKey: ["schemas"],
    queryFn: async () => (await client!.getSchemas()) as AdminSchemas,
    enabled: !!client,
  })

  const allCollections = (schemas?.collections || []) as SchemaCollection[]
  const collections = allCollections.filter(isVisibleCollection)
  const globals = ((schemas?.globals || []) as SchemaGlobal[]).filter(isVisibleGlobal)
  const authCollections = allCollections.filter((collection) => collection.auth)
  const uploadCollections = allCollections.filter((collection) => collection.upload)
  const editableCollections = collections.filter((collection) => !collection.auth)
  const uploadCollection = collections.find((collection) => collection.upload)
  const creatableCollections = editableCollections.filter((collection) => !collection.upload)
  const primaryGlobal = globals[0]
  const recentCollections = creatableCollections.slice(0, 6)
  const authCollectionsMissingRoles = authCollections.filter((collection) => {
    const rolesField = findField(collection, "roles")
    const roleField = findField(collection, "role")

    // Core auth collections inject a usable default `roles` field. Do not warn
    // unless the schema exposes an explicit role field that is modeled badly.
    if (!rolesField && !roleField) return false

    if (rolesField) {
      const hasRoleOptions = getFieldOptionValues(collection, "roles").length > 0
      const isSupportedType =
        rolesField.type === "select" ||
        rolesField.type === "multiSelect" ||
        rolesField.type === "radio"

      return !isSupportedType || !hasRoleOptions
    }

    if (roleField) {
      const hasRoleOptions = getFieldOptionValues(collection, "role").length > 0
      const isSupportedType =
        roleField.type === "select" ||
        roleField.type === "multiSelect" ||
        roleField.type === "radio"

      return !isSupportedType || !hasRoleOptions
    }

    return false
  })
  const uploadCollectionsMissingAltField = uploadCollections.filter(
    (collection) => !hasField(collection, "alt"),
  )
  const workflowAttentionCollections = collections.filter((collection) => {
    const reviewStatuses = getFieldOptionValues(collection, "status").filter((value) =>
      ["in_review", "review", "pending_review", "submitted", "needs_review"].includes(value),
    )
    return reviewStatuses.length > 0 || !!collection.workflow
  })

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

  const { error: storageQueryError } = useQuery({
    queryKey: ["dashboard-storage-check", uploadCollection?.slug],
    queryFn: () => client!.listMedia({ limit: 1 }, uploadCollection?.slug || "media"),
    enabled: !!client && !!uploadCollection,
    retry: false,
  })

  const pendingInviteQueries = useQueries({
    queries: authCollections
      .filter((collection) => hasField(collection, "status"))
      .map((collection) => ({
        queryKey: ["dashboard-pending-invites", collection.slug],
        queryFn: () =>
          client!.find(collection.slug, {
            limit: 1,
            depth: 0,
            where: { status: { equals: "pending" } },
          }),
        enabled: !!client,
        retry: false,
      })),
  })

  const missingAltQueries = useQueries({
    queries: uploadCollections
      .filter((collection) => hasField(collection, "alt"))
      .map((collection) => ({
        queryKey: ["dashboard-missing-alt", collection.slug],
        queryFn: () =>
          client!.find(collection.slug, {
            limit: 1,
            depth: 0,
            where: { alt: { exists: false } },
          }),
        enabled: !!client,
        retry: false,
      })),
  })

  const workflowAttentionQueries = useQueries({
    queries: workflowAttentionCollections
      .map((collection) => {
        const reviewStatuses = getFieldOptionValues(collection, "status").filter((value) =>
          ["in_review", "review", "pending_review", "submitted", "needs_review"].includes(value),
        )
        if (reviewStatuses.length === 0) return null
        return {
          queryKey: ["dashboard-review-backlog", collection.slug, reviewStatuses.join(",")],
          queryFn: () =>
            client!.find(collection.slug, {
              limit: 1,
              depth: 0,
              where: { status: { in: reviewStatuses } },
            }),
          enabled: !!client,
          retry: false,
        }
      })
      .filter((query): query is NonNullable<typeof query> => query !== null),
  })

  const isStorageNotConfigured = schemas?.hasStorage === false || isStorageNotConfiguredError(storageQueryError)
  const pendingInvitesTotal = pendingInviteQueries.reduce(
    (sum, query) => sum + (typeof query.data?.total === "number" ? query.data.total : 0),
    0,
  )
  const missingAltTotal = missingAltQueries.reduce(
    (sum, query) => sum + (typeof query.data?.total === "number" ? query.data.total : 0),
    0,
  )
  const workflowAttentionTotal = workflowAttentionQueries.reduce(
    (sum, query) => sum + (typeof query.data?.total === "number" ? query.data.total : 0),
    0,
  )

  const attentionItems: AttentionItem[] = [
    ...(schemas?.adminHealth?.emailConfigured === false
      ? [{
          key: "email-not-configured",
          title: "Email delivery is not configured",
          description: "Invites, password resets, and account security emails will not be delivered reliably until a backend email provider is configured.",
          to: "/setup",
        }]
      : []),
    ...(schemas?.adminHealth?.secureAuthSecretConfigured === false
      ? [{
          key: "auth-secret-not-configured",
          title: "Authentication secret is using the insecure fallback",
          description: "Set DYRECTED_JWT_SECRET in the backend environment so auth and preview tokens are signed with a real secret.",
          to: "/setup",
        }]
      : []),
    ...(schemas?.adminHealth?.authCollectionConfigured === false
      ? [{
          key: "auth-collection-missing",
          title: "No auth collection is configured",
          description: "User accounts, invites, password resets, and admin-managed onboarding are unavailable until you enable auth on a collection.",
          to: "/setup",
        }]
      : []),
    ...(schemas?.adminHealth?.uploadCollectionConfigured === false
      ? [{
          key: "upload-collection-missing",
          title: "No upload collection is configured",
          description: "Editors cannot manage media until you add an upload-enabled collection.",
          to: "/setup",
        }]
      : []),
    ...(isStorageNotConfigured
      ? [{
          key: "storage-not-configured",
          title: "Media storage is not set up",
          description: "File uploads are disabled. Ask your developer to configure a media storage provider in Dyrected.",
          to: "/setup",
        }]
      : []),

    ...(hasUpdate
      ? [{
          key: "dyrected-update",
          title: `A system update is available (v${latestVersion})`,
          description: "Please notify your developer or site administrator to apply this update.",
          to: "/setup",
        }]
      : []),
    ...(pendingInvitesTotal > 0
      ? [{
          key: "pending-invites",
          title: `${pendingInvitesTotal} invited user${pendingInvitesTotal === 1 ? "" : "s"} still need to accept`,
          description: "Pending invites are already visible in the admin user list. Review who still needs access and resend or revoke old invitations if needed.",
          to: authCollections[0] ? `/collections/${authCollections[0].slug}` : "/setup",
        }]
      : []),
    ...(workflowAttentionTotal > 0
      ? [{
          key: "workflow-backlog",
          title: `${workflowAttentionTotal} item${workflowAttentionTotal === 1 ? "" : "s"} are waiting for review`,
          description: "Some content is sitting in review-related workflow states and may be blocking publishing.",
          to: workflowAttentionCollections[0] ? `/collections/${workflowAttentionCollections[0].slug}` : "/",
        }]
      : []),
    ...(missingAltTotal > 0
      ? [{
          key: "media-missing-alt-content",
          title: `${missingAltTotal} media item${missingAltTotal === 1 ? "" : "s"} are missing alt text`,
          description: "Add alt text to uploaded media so images stay accessible and easier to manage later.",
          to: uploadCollections[0] ? `/collections/${uploadCollections[0].slug}` : "/setup",
        }]
      : []),
    ...authCollectionsMissingRoles.map((collection) => ({
      key: `roles-${collection.slug}`,
      title: `${getCollectionLabel(collection)} cannot assign invite roles cleanly`,
      description: "Add a selectable roles field with defined options so invited users can be assigned the right access level before they accept.",
      to: `/collections/${collection.slug}`,
    })),
    ...collections
      .filter((collection) => !collection.upload && !collection.admin?.useAsTitle)
      .map((collection) => ({
        key: `title-${collection.slug}`,
        title: `${getCollectionLabel(collection)} needs a title field`,
        description: "Set admin.useAsTitle for clearer lists and relationships.",
        to: `/collections/${collection.slug}`,
      })),
    ...uploadCollectionsMissingAltField
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
  ]


  if (isLoadingSchemas) {
    return <AdminPageSkeleton showSidebar={true} />
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
