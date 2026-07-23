
import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Link, useSearchParams } from "react-router-dom"
import { useDyrected } from "../../providers/dyrected-context"
import { FilterBuilder } from "../../components/ui/filter-builder"
import type { CollectionConfig, Field, WorkflowConfig, WorkflowMetadata } from "@dyrected/core"
import { type FilterRule, rulesToWhere, whereToRules } from "../../lib/filter-rules"
import { DataTable } from "../../components/ui/data-table"
import { type ColumnDef } from "@tanstack/react-table"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Checkbox } from "../../components/ui/checkbox"
import { getWorkflowBadgePresentation, WORKFLOW_BADGE_COLORS } from "../../lib/workflow-badge"
import {
  Plus,
  Trash2,
  Calendar,
  Database,
  Image as ImageIcon,
  Lock,
  FileDown,
  Settings2,
  GripVertical,
  FileUp,
  ArrowLeft,
  Users,
} from "lucide-react"
import { resolveAdminIcon } from "../../lib/admin-icons"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import type { DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover"
import { CsvImporter } from "../../components/ui/csv-importer"
import { RenderCell } from "../../components/ui/render-cell"
import { PageHeader } from "../../components/ui/page-header"
import { Pagination } from "../../components/ui/pagination"
import { AdminComponentSlot } from "../../components/admin-component-slot"
import type { CollectionListSlotProps } from "../../types/admin-components"
import { MediaGrid } from "../../components/media/media-grid"
import { resolvePreviewUrl } from "../../lib/preview-url"
import { getMediaUrl, cn, getSiteUrl } from "../../lib/utils"
import jexl from 'jexl'
import { useDebouncedValue } from "../../hooks/use-debounced-value"
import { WorkflowTransitionMenu } from "../../components/workflow/workflow-transition-controls"
import {
  getAvailableWorkflowTransitions,
  getCommonWorkflowTransitions,
  resolvePublishingStatus,
  resolveWorkflowStateFromDocument,
} from "../../lib/workflow-ui"
import { resolveDocumentTitle } from "../../lib/document-title"
import { AdminMediaSkeleton, AdminPageSkeleton } from "../../components/layout/admin-loading"
import { AdminNotFound } from "../../components/layout/admin-not-found"

const SpreadsheetEditor = React.lazy(async () => {
  const module = await import("../../components/ui/spreadsheet-editor")
  return { default: module.SpreadsheetEditor }
})


function SortableColumnItem({
  id,
  label,
  visible,
  onToggleVisible
}: {
  id: string
  label: string
  visible: boolean
  onToggleVisible: (val: boolean) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "dy-flex dy-items-center dy-gap-2.5 dy-p-2 dy-bg-background dy-border dy-border-border/60 dy-rounded-lg dy-shadow-sm dy-transition-all",
        isDragging && "dy-opacity-50 dy-border-primary"
      )}
    >
      <div {...attributes} {...listeners} className="dy-cursor-grab active:dy-cursor-grabbing dy-text-muted-foreground/60 hover:dy-text-foreground dy-p-0.5">
        <GripVertical className="dy-h-3.5 dy-w-3.5" />
      </div>
      <Checkbox
        checked={visible}
        onCheckedChange={(val) => onToggleVisible(!!val)}
      />
      <div className="dy-flex-1 dy-text-xs dy-font-medium dy-text-foreground">
        {label}
      </div>
    </div>
  )
}

interface CollectionListPageProps {
  slug: string
}

function WorkflowStatusCell({
  schema,
  slug,
  item,
}: {
  schema: CollectionConfig
  slug: string
  item: Record<string, unknown>
}) {
  const workflowConfig = (schema.workflow as WorkflowConfig | undefined) ?? null
  const workflowMeta = (item._workflow as WorkflowMetadata | undefined) ?? null
  const publishingStatus = resolvePublishingStatus(schema, item)
  const documentLabel = resolveDocumentTitle({
    entry: item,
    collection: schema,
    collections: [schema],
  })

  if (!publishingStatus) {
    return <span className="dy-text-xs dy-text-muted-foreground">-</span>
  }

  const workflowState = resolveWorkflowStateFromDocument(workflowConfig, item)
  const badgePresentation = {
    className: WORKFLOW_BADGE_COLORS[publishingStatus.color],
    style: undefined,
  }
  const workflowStagePresentation = workflowState && publishingStatus.workflowStateLabel
    ? getWorkflowBadgePresentation(workflowState.color)
    : null

  const transitions = getAvailableWorkflowTransitions(workflowConfig, workflowMeta)
  const badge = (
    <div className="dy-inline-flex dy-items-center dy-gap-1.5">
      <Badge
        variant="outline"
        className={cn(
          "dy-px-2 dy-py-0 dy-rounded-full dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider dy-shrink-0",
          transitions.length > 0 && "hover:dy-opacity-85",
          badgePresentation.className,
        )}
        style={badgePresentation.style}
      >
        {publishingStatus.label}
      </Badge>
      {publishingStatus.workflowStateLabel && workflowStagePresentation && (
        <Badge
          variant="outline"
          className={cn(
            "dy-px-2 dy-py-0 dy-rounded-full dy-text-[10px] dy-font-semibold dy-tracking-wide dy-shrink-0",
            transitions.length > 0 && "hover:dy-opacity-85",
            workflowStagePresentation.className,
          )}
          style={workflowStagePresentation.style}
        >
          {publishingStatus.workflowStateLabel}
        </Badge>
      )}
    </div>
  )

  if (!workflowConfig || !workflowMeta || transitions.length === 0 || typeof item.id !== "string") {
    return badge
  }

  return (
    <WorkflowTransitionMenu
      collection={slug}
      documentIds={[item.id]}
      documentLabels={{ [item.id]: documentLabel }}
      workflowConfig={workflowConfig}
      transitions={transitions}
      expectedRevisions={{ [item.id]: workflowMeta.revision }}
      invalidateQueryKeys={[
        ["collection", slug],
        ["entry", slug, item.id],
        ["workflow-history", slug, item.id],
      ]}
      trigger={
        <button
          type="button"
          className="dy-inline-flex"
          title="Change workflow state"
          aria-label="Change workflow state"
        >
          {badge}
        </button>
      }
    />
  )
}

export function CollectionListPage({ slug }: CollectionListPageProps) {
  return <CollectionListPageContent key={slug} slug={slug} />
}

function CollectionListPageContent({ slug }: CollectionListPageProps) {
  const { client, components, user } = useDyrected()
  const queryClient = useQueryClient()
  const [page, setPage] = React.useState(1)
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({})
  const [isImportOpen, setIsImportOpen] = React.useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const whereParam = searchParams.get('where')
  const searchParam = searchParams.get("search") || ""
  const debouncedSearch = useDebouncedValue(searchParam.trim(), 250)

  const rules = React.useMemo(() => {
    if (!whereParam) return [];
    try {
      const parsed = JSON.parse(whereParam);
      return whereToRules(parsed);
    } catch {
      return [];
    }
  }, [whereParam]);

  const handleRulesChange = React.useCallback((newRules: FilterRule[]) => {
    setSearchParams(prev => {
      if (newRules.length === 0) {
        prev.delete('where');
      } else {
        prev.set('where', JSON.stringify(rulesToWhere(newRules)));
      }
      return prev;
    }, { replace: true })
    setPage(1)
  }, [setSearchParams]);

  // Fetch schema to know fields
  const { data: schemas, isLoading: isLoadingSchemas } = useQuery({
    queryKey: ["schemas"],
    queryFn: () => client!.getSchemas(),
    enabled: !!client,
  })

  const schema = schemas?.collections.find((c: CollectionConfig) => c.slug === slug)

  interface ColumnPreference {
    name: string
    visible: boolean
  }

  interface ListLayoutPreference {
    viewMode: "list" | "spreadsheet"
    columns: ColumnPreference[]
  }

  const allAvailableColumns = React.useMemo((): string[] => {
    if (!schema) return []
    const allDisplayFields = schema.fields.filter((f: Field) =>
      f.name && f.name !== "password" && !f.admin?.hidden && f.type !== "row" && f.type !== "join"
    )
    return [
      ...allDisplayFields.map((field: Field) => field.name!),
      "id",
      "createdAt",
      "updatedAt",
    ].filter((name, index, self) => self.indexOf(name) === index)
  }, [schema])

  const defaultListColumns = React.useMemo((): string[] => {
    if (!schema) return []
    const allDisplayFields = schema.fields.filter((f: Field) =>
      f.name && f.name !== "password" && !f.admin?.hidden && f.type !== "row" && f.type !== "join"
    )
    const configuredColumns = Array.isArray(schema.admin?.defaultColumns)
      ? schema.admin.defaultColumns
      : []
    return configuredColumns.length > 0
      ? configuredColumns
      : allDisplayFields.slice(0, 3).map((field: Field) => field.name!)
  }, [schema])

  const defaultListPreference = React.useMemo((): ListLayoutPreference => {
    const visibleSet = new Set(defaultListColumns)
    const cols = allAvailableColumns.map(name => ({
      name,
      visible: visibleSet.has(name)
    }))
    return {
      viewMode: "list",
      columns: cols
    }
  }, [allAvailableColumns, defaultListColumns])

  const prefKey = `layout:collections:${slug}:list`

  const { data: rawPreference } = useQuery({
    queryKey: ["preferences", prefKey],
    queryFn: async () => {
      if (!client) return null
      const res = await client.getPreference<unknown>(prefKey)
      return res.value
    },
    enabled: !!client,
    staleTime: 5000,
    refetchOnWindowFocus: true,
  })

  const reconciledPreference = React.useMemo((): ListLayoutPreference => {
    if (!rawPreference) {
      return defaultListPreference
    }

    let parsedViewMode: "list" | "spreadsheet" = "list"
    let parsedColumns: ColumnPreference[] = []

    if (Array.isArray(rawPreference)) {
      parsedViewMode = "list"
      parsedColumns = rawPreference.map(item => {
        if (typeof item === "string") {
          return { name: item, visible: true }
        }
        if (item && typeof item === "object" && "name" in item) {
          const obj = item as { name: string; visible?: boolean }
          return { name: obj.name, visible: obj.visible !== false }
        }
        return null
      }).filter((x): x is ColumnPreference => x !== null)
    } else if (rawPreference && typeof rawPreference === "object") {
      const rawPrefObj = rawPreference as { viewMode?: string; columns?: unknown[] }
      parsedViewMode = rawPrefObj.viewMode === "spreadsheet" ? "spreadsheet" : "list"
      if (Array.isArray(rawPrefObj.columns)) {
        parsedColumns = rawPrefObj.columns.map((item: unknown) => {
          if (typeof item === "string") {
            return { name: item, visible: true }
          }
          if (item && typeof item === "object" && "name" in item) {
            const obj = item as { name: string; visible?: boolean }
            return { name: obj.name, visible: obj.visible !== false }
          }
          return null
        }).filter((x: ColumnPreference | null): x is ColumnPreference => x !== null)
      }
    }

    const validColumns = parsedColumns.filter(col => allAvailableColumns.includes(col.name))
    const validNames = validColumns.map(col => col.name)
    const missingColumns = allAvailableColumns
      .filter(name => !validNames.includes(name))
      .map(name => ({ name, visible: false }))

    return {
      viewMode: parsedViewMode,
      columns: [...validColumns, ...missingColumns]
    }
  }, [rawPreference, defaultListPreference, allAvailableColumns])

  const [localPreference, setLocalPreference] = React.useState<ListLayoutPreference>(reconciledPreference)

  const syncPreference = React.useState(() => {
    return (next: ListLayoutPreference) => {
      setLocalPreference((prev) => {
        const isViewModeSame = prev.viewMode === next.viewMode
        const isColsSame = prev.columns.length === next.columns.length &&
          prev.columns.every((col, i) => col.name === next.columns[i].name && col.visible === next.columns[i].visible)
        return isViewModeSame && isColsSame ? prev : next
      })
    }
  })[0]

  React.useEffect(() => {
    syncPreference(reconciledPreference)
  }, [reconciledPreference, syncPreference])

  const savePreferenceMutation = useMutation({
    mutationFn: async ({ scope, value }: { scope: 'personal' | 'global'; value: ListLayoutPreference }) => {
      if (!client) throw new Error("Client not available")
      const clientWithPrefs = client as unknown as {
        setPreference: (key: string, value: unknown, options?: { scope?: string }) => Promise<{ key: string; value: unknown }>
        deletePreference: (key: string, options?: { scope?: string }) => Promise<{ success: boolean }>
      }
      await clientWithPrefs.setPreference(prefKey, value, { scope })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences", prefKey] })
    },
  })

  const resetPreferenceMutation = useMutation({
    mutationFn: async ({ scope }: { scope: 'personal' | 'global' }) => {
      if (!client) throw new Error("Client not available")
      const clientWithPrefs = client as unknown as {
        setPreference: (key: string, value: unknown, options?: { scope?: string }) => Promise<{ key: string; value: unknown }>
        deletePreference: (key: string, options?: { scope?: string }) => Promise<{ success: boolean }>
      }
      await clientWithPrefs.deletePreference(prefKey, { scope })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences", prefKey] })
    },
  })

  const saveColumns = (scope: 'personal' | 'global') => savePreferenceMutation.mutateAsync({ scope, value: localPreference })
  const resetColumns = () => resetPreferenceMutation.mutateAsync({ scope: 'personal' })

  const dndSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDndDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setLocalPreference((prev) => {
      const oldIndex = prev.columns.findIndex(c => c.name === active.id)
      const newIndex = prev.columns.findIndex(c => c.name === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev
      return {
        ...prev,
        columns: arrayMove(prev.columns, oldIndex, newIndex)
      }
    })
  }

  // Fetch collection data
  const { data: response, isLoading } = useQuery({
    queryKey: ["collection", slug, page, whereParam, debouncedSearch],
    queryFn: () => {
      const queryParams: Record<string, unknown> = { page, limit: 20, depth: 1 };
      if (whereParam) {
        try {
          queryParams.where = JSON.parse(whereParam);
        } catch {
          // invalid json
        }
      }
      if (debouncedSearch) {
        queryParams.search = debouncedSearch
      }
      return client!.collection(slug).find(queryParams).exec()
    },
    enabled: !!client,
  })

  const totalPages = response?.totalPages ?? 1
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client!.collection(slug).delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection", slug] })
      setRowSelection({})
      toast.success("Entry deleted successfully")
    },
    onError: (error: Error) => {
      toast.error("Failed to delete entry", {
        description: error.message
      })
    }
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await client!.collection(slug).delete(id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection", slug] })
      setRowSelection({})
      toast.success("Selected entries deleted")
    },
    onError: (error: Error) => {
      toast.error("Failed to delete entries", {
        description: error.message
      })
    }
  })

  const bulkSaveMutation = useMutation({
    mutationFn: async ({ updates, creates }: { updates: Record<string, Record<string, unknown>>; creates: Record<string, unknown>[] }) => {
      const updatePromises = Object.entries(updates).map(([id, changes]) =>
        client!.collection(slug).update(id, changes)
      )
      const createPromises = creates.map((row) =>
        client!.collection(slug).create(row)
      )
      await Promise.all([...updatePromises, ...createPromises])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection", slug] })
      toast.success("Spreadsheet changes saved successfully")
    },
    onError: (error: Error) => {
      toast.error("Failed to save changes", {
        description: error.message
      })
    }
  })

  const [exporting, setExporting] = React.useState(false)

  // Build a CSV from a set of docs and trigger a download. Shared by the
  // full-collection export and the "export selected rows" bulk action so both
  // produce identical column layout and value flattening.
  const exportDocsToCsv = React.useCallback((docs: Record<string, unknown>[], filenameSuffix = "") => {
    if (!schema || !client) return
    const displayFields = schema.fields.filter((f: Field) =>
      f.name !== "password" && !f.admin?.hidden && f.type !== "row" && f.type !== "join"
    )
    const csvColumns = [
      { key: "id", label: "ID" },
      ...displayFields.filter((f: Field) => !!f.name).map((f: Field) => ({ key: f.name!, label: (f as { label?: string }).label || f.name! })),
      { key: "updatedAt", label: "Last Updated" },
    ]

    const flattenForCsv = (val: unknown): string => {
      if (val === null || val === undefined) return ""
      if (typeof val === "boolean") return val ? "true" : "false"
      if (typeof val === "number" || typeof val === "string") return String(val)

      // Array — join with "; " (industry standard for multi-value CSV cells)
      if (Array.isArray(val)) {
        return val.map((item) => flattenForCsv(item)).filter(Boolean).join("; ")
      }

      // Object — extract meaningful value
      if (typeof val === "object" && val !== null) {
        const obj = val as Record<string, unknown>;
        // Image/media — return URL only
        if (obj.url || obj.filename) {
          return getMediaUrl(obj as Record<string, unknown>, client?.getBaseUrl() || "")
        }
        // Relationship — return title/name/label or id
        if (obj.id) {
          return String(obj.title || obj.name || obj.label || obj.id)
        }
        // Generic object — stringify
        return JSON.stringify(val)
      }

      return String(val)
    }

    // Quote any field containing a comma, quote, or newline, and double internal
    // quotes — per RFC 4180 — so values like "Smith, John" don't break columns.
    const escapeCsv = (val: string): string =>
      /[",\n\r]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val

    const header = csvColumns.map((c) => escapeCsv(flattenForCsv(c.label))).join(",")
    const rows = docs.map((doc) =>
      csvColumns.map((c) => escapeCsv(flattenForCsv(doc[c.key]))).join(",")
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${slug}-export${filenameSuffix}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [schema, client, slug])

  const handleExportCsv = React.useCallback(async () => {
    if (!schema || !client) return
    setExporting(true)
    try {
      const allDocs: Record<string, unknown>[] = []
      let pg = 1
      let totalPages = 1
      while (pg <= totalPages) {
        const res = await client.collection(slug).find({ page: pg, limit: 20, depth: 1 }).exec()
        allDocs.push(...(res.docs || []))
        totalPages = res.totalPages ?? 1
        pg++
      }

      exportDocsToCsv(allDocs)
      toast.success(`Exported ${allDocs.length} entries`)
    } catch (err: unknown) {
      toast.error("Export failed", { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setExporting(false)
    }
  }, [schema, client, slug, exportDocsToCsv])

  // Export only the currently selected rows. Resolves the selection against the
  // loaded page data — the same source the bulk-delete action uses.
  const handleExportSelected = React.useCallback((ids: string[]) => {
    const selectedDocs = ids
      .map((id) => response?.docs?.find((d: Record<string, unknown>) => d.id === id))
      .filter((d): d is Record<string, unknown> => !!d)
    if (selectedDocs.length === 0) return
    exportDocsToCsv(selectedDocs, "-selected")
    toast.success(`Exported ${selectedDocs.length} selected ${selectedDocs.length === 1 ? "entry" : "entries"}`)
  }, [response, exportDocsToCsv])

  const handleDelete = React.useCallback((id: string) => {
    if (schema?.auth && id === user?.id) {
      toast.error("Action not allowed", {
        description: "You cannot delete your own account."
      })
      return
    }
    if (window.confirm("Delete this entry? This cannot be undone.")) {
      deleteMutation.mutate(id)
    }
  }, [schema, user, deleteMutation])

  function handleBulkDelete(ids: string[]) {
    const cleanIds = schema?.auth ? ids.filter(id => id !== user?.id) : ids
    if (cleanIds.length === 0) {
      toast.error("Action not allowed", {
        description: "You cannot delete your own account."
      })
      return
    }
    if (window.confirm(`Delete ${cleanIds.length} entries? This cannot be undone.`)) {
      bulkDeleteMutation.mutate(cleanIds)
    }
  }

  const workflowConfig = (schema?.workflow as WorkflowConfig | undefined) ?? null
  const selectedWorkflowDocs = React.useMemo(() => (
    Object.keys(rowSelection)
      .filter((id) => rowSelection[id])
      .map((id) => response?.docs?.find((doc: Record<string, unknown>) => String(doc.id) === id))
      .filter((doc): doc is Record<string, unknown> & { id: string; _workflow: WorkflowMetadata } =>
        !!doc && typeof doc.id === "string" && !!doc._workflow,
      )
  ), [rowSelection, response])
  const sharedWorkflowTransitions = React.useMemo(
    () => getCommonWorkflowTransitions(workflowConfig, selectedWorkflowDocs),
    [workflowConfig, selectedWorkflowDocs],
  )
  const selectedWorkflowRevisions = React.useMemo(
    () => Object.fromEntries(
      selectedWorkflowDocs.map((doc) => [doc.id, (doc._workflow as WorkflowMetadata | undefined)?.revision]),
    ),
    [selectedWorkflowDocs],
  )

  const columns: ColumnDef<Record<string, unknown>>[] = React.useMemo(() => {
    if (!schema) return []

    const allDisplayFields = schema.fields.filter((f: Field) =>
      f.name && f.name !== "password" && !f.admin?.hidden && f.type !== "row" && f.type !== "join"
    )
    const fieldByName = new Map<string, Field>(allDisplayFields.map((field: Field) => [field.name!, field]))
    const configuredColumns = localPreference.columns.filter(col => col.visible).map(col => col.name)
    const visibleColumnNames = configuredColumns.length > 0
      ? configuredColumns
      : allDisplayFields.slice(0, 3).map((field: Field) => field.name!)
    const allColumnNames = visibleColumnNames
    const firstVisibleFieldName = visibleColumnNames.find((name) => fieldByName.has(name))
    const titleFieldName = visibleColumnNames.includes(schema.admin?.useAsTitle || "")
      ? schema.admin?.useAsTitle
      : firstVisibleFieldName
    const showPublishingStatus = !!(schema.workflow || schema.drafts)

    const deleteAccess = (schema.access as { delete?: unknown })?.delete

    const canDeleteRow = (item: Record<string, unknown>) => {
      if (deleteAccess === false) return false
      if (typeof deleteAccess === 'string') {
        try {
          return jexl.evalSync(deleteAccess, { user, ...item })
        } catch (e) {
          console.warn("Delete access eval failed:", e)
          return true
        }
      }
      return true
    }

    const getPreviewUrl = (item: Record<string, unknown>) => {
      const siteUrl = getSiteUrl(schemas?.admin?.siteUrl)
      return resolvePreviewUrl(schema?.admin?.previewUrl, item, siteUrl)
    }

    const renderLinkedCell = (item: Record<string, unknown>, cell: React.ReactNode) => {
      const canDelete = canDeleteRow(item)
      const previewUrl = getPreviewUrl(item)

      return (
        <div className="dy-flex dy-flex-col dy-gap-1 dy-min-w-[240px] dy-flex-shrink-0">
          <Link
            to={`/collections/${slug}/edit/${String(item.id)}`}
            className="dy-font-medium dy-text-foreground hover:dy-text-primary hover:dy-underline dy-underline-offset-2 dy-transition-colors dy-duration-150"
          >
            {cell}
          </Link>
          <div className="dy-flex dy-items-center dy-gap-2.5">
            {previewUrl && (
              <>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dy-text-xs dy-text-muted-foreground hover:dy-text-foreground dy-underline-offset-2 hover:dy-underline dy-transition-colors dy-duration-150"
                >
                  View
                </a>
                <span className="dy-text-muted-foreground/40 dy-text-xs">|</span>
              </>
            )}
            <Link
              to={`/collections/${slug}/edit/${String(item.id)}`}
              className="dy-text-xs dy-text-muted-foreground hover:dy-text-foreground dy-underline-offset-2 hover:dy-underline dy-transition-colors dy-duration-150"
            >
              Edit
            </Link>
            <span className="dy-text-muted-foreground/40 dy-text-xs">|</span>
            <button
              className="dy-text-xs dy-text-muted-foreground hover:dy-text-destructive dy-underline-offset-2 hover:dy-underline dy-transition-colors dy-duration-150 disabled:dy-opacity-40 disabled:dy-pointer-events-none"
              onClick={() => handleDelete(String(item.id))}
              disabled={deleteMutation.isPending || !canDelete || (schema.auth && item.id === user?.id)}
              title={!canDelete ? "You do not have permission to delete this entry" : (schema.auth && item.id === user?.id ? "You cannot delete your own account" : undefined)}
            >
              Delete
            </button>
          </div>
        </div>
      )
    }

    const makeFieldColumn = (field: Field): ColumnDef<Record<string, unknown>> => ({
      accessorKey: field.name!,
      header: field.label || field.name!,
      cell: ({ row }) => {
        if (field.name === 'url') {
          if (schema?.admin?.previewUrl) {
            const resolved = getPreviewUrl(row.original)
            if (resolved) {
              return (
                <a
                  href={resolved}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dy-text-xs dy-text-primary hover:dy-underline dy-underline-offset-2 dy-font-medium"
                >
                  {resolved}
                </a>
              )
            }
          }
          return <span className="dy-text-muted-foreground">-</span>
        }

        const cell = (
          <RenderCell
            value={row.getValue(field.name!)}
            field={field}
            client={client}
            schemas={schemas}
          />
        )
        return field.name === titleFieldName ? renderLinkedCell(row.original, cell) : cell
      },
    })

    const makeSystemColumn = (name: string): ColumnDef<Record<string, unknown>> | null => {
      if (name === "id") {
        return {
          accessorKey: "id",
          header: "ID",
          cell: ({ row }) => {
            const cell = <span className="dy-font-mono dy-text-xs">{row.getValue("id")}</span>
            return titleFieldName ? cell : renderLinkedCell(row.original, cell)
          },
        }
      }

      if (name === "createdAt" || name === "updatedAt") {
        return {
          accessorKey: name,
          header: name === "createdAt" ? "Created" : "Last Updated",
          cell: ({ row }) => {
            const value = row.getValue(name)
            const date = value ? new Date(value as string) : null
            return (
              <div className="dy-flex dy-items-center dy-gap-2 dy-text-muted-foreground">
                <Calendar className="dy-h-3 dy-w-3" />
                <span className="dy-text-xs">{date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : "N/A"}</span>
              </div>
            )
          }
        }
      }

      return null
    }

    const cols: ColumnDef<Record<string, unknown>>[] = [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ]

    allColumnNames.forEach((name) => {
      const field = fieldByName.get(name)
      if (field) {
        cols.push(makeFieldColumn(field))
        return
      }
      const systemColumn = makeSystemColumn(name)
      if (systemColumn) cols.push(systemColumn)
    })

    if (showPublishingStatus) {
      cols.push({
        id: "publishingStatus",
        header: "Status",
        enableHiding: false,
        cell: ({ row }) => {
          return <WorkflowStatusCell schema={schema} slug={slug} item={row.original} />
        },
      })
    }

    return cols
  }, [schema, client, deleteMutation.isPending, user, handleDelete, slug, schemas, localPreference.columns])



  if (isLoadingSchemas || !schemas) {
    return <AdminPageSkeleton />
  }

  if (!schema) {
    return (
      <AdminNotFound
        title="Collection not found"
        description={`We could not find a visible collection called "${slug}". It may have been renamed, hidden, or removed from this admin.`}
      />
    )
  }

  // Evaluate collection-level read access
  const readAccess = (schema.access as { read?: unknown })?.read
  let canRead = true
  if (readAccess === false) {
    canRead = false
  } else if (typeof readAccess === 'string') {
    try {
      canRead = jexl.evalSync(readAccess, { user })
    } catch (e) {
      console.warn("Read access eval failed:", e)
    }
  }

  if (!canRead) {
    return (
      <div className="dy-flex dy-items-center dy-justify-center dy-h-[calc(100vh-200px)]">
        <div className="dy-text-center dy-space-y-3">
          <div className="dy-p-3 dy-bg-destructive/10 dy-text-destructive dy-rounded-full dy-w-12 dy-h-12 dy-mx-auto dy-flex dy-items-center dy-justify-center">
            <Lock className="dy-h-6 dy-w-6" />
          </div>
          <h3 className="dy-text-lg dy-font-bold">Access Denied</h3>
          <p className="dy-text-sm dy-text-muted-foreground">You do not have permission to view this collection.</p>
        </div>
      </div>
    )
  }

  // Evaluate collection-level create access
  const createAccess = (schema.access as { create?: unknown })?.create
  let canCreate = true
  if (createAccess === false) {
    canCreate = false
  } else if (typeof createAccess === 'string') {
    try {
      canCreate = jexl.evalSync(createAccess, { user })
    } catch (e) {
      console.warn("Create access eval failed:", e)
    }
  }

  const collectionComponentProps: CollectionListSlotProps = {
    client: client!,
    user,
    collection: schema,
    collectionSlug: slug,
    response,
    documents: response?.docs || [],
    isLoading,
    pagination: {
      page,
      totalPages,
      total: response?.total ?? 0,
      hasNextPage,
      hasPrevPage,
    },
    permissions: {
      canRead,
      canCreate,
    },
    urls: {
      collection: `/collections/${slug}`,
      create: `/collections/${slug}/new`,
    },
  }
  const collectionSlots = schema.admin?.components

  if (slug === "media") {
    return (
      <div className="dy-space-y-6 dy-animate-in lg:dy-space-y-8">
        <AdminComponentSlot
          slot="beforeList"
          componentKeys={collectionSlots?.beforeList}
          registry={components?.collectionList}
          componentProps={collectionComponentProps}
        />
        <PageHeader
          title="Media Library"
          description="Manage your media assets and uploads."
          icon={ImageIcon}
        >
          {canCreate && (
            <Link to={`/collections/${slug}/new`} className="dy-w-full sm:dy-w-auto">
              <Button className="dy-h-9 dy-w-full dy-justify-center dy-rounded-md dy-bg-primary dy-px-4 dy-text-[11px] dy-shadow-sm dy-transition-all hover:dy-bg-primary/90 active:dy-scale-95 sm:dy-h-8 sm:dy-w-auto">
                <Plus className="dy-mr-1.5 dy-h-3 dy-w-3" />
                Upload New
              </Button>
            </Link>
          )}
        </PageHeader>

        <AdminComponentSlot
          slot="beforeListTable"
          componentKeys={collectionSlots?.beforeListTable}
          registry={components?.collectionList}
          componentProps={collectionComponentProps}
        />

        {isLoading ? (
          <AdminMediaSkeleton />
        ) : (
          <MediaGrid
            items={response?.docs || []}
            baseUrl={client?.getBaseUrl() || ""}
            onDelete={handleDelete}
            slug={slug}
          />
        )}

        <AdminComponentSlot
          slot="afterListTable"
          componentKeys={collectionSlots?.afterListTable}
          registry={components?.collectionList}
          componentProps={collectionComponentProps}
        />

        <Pagination
          page={page}
          totalPages={totalPages}
          hasPrevPage={hasPrevPage}
          hasNextPage={hasNextPage}
          onPageChange={setPage}
          className="dy-mt-8"
        />
        <AdminComponentSlot
          slot="afterList"
          componentKeys={collectionSlots?.afterList}
          registry={components?.collectionList}
          componentProps={collectionComponentProps}
        />
      </div>
    )
  }

  if (isImportOpen && schema) {
    const collectionTitle = schema.labels?.plural || schema.slug
    return (
      <div className="dy-space-y-6 dy-animate-in lg:dy-space-y-8">
        <div className="dy-flex dy-items-center dy-gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="dy-h-8 dy-px-2 dy-gap-1.5 dy-text-xs dy-text-muted-foreground hover:dy-text-foreground"
            onClick={() => setIsImportOpen(false)}
          >
            <ArrowLeft className="dy-h-3.5 dy-w-3.5" />
            Back to {collectionTitle}
          </Button>
        </div>
        <PageHeader
          title={`Import CSV — ${collectionTitle}`}
          description={`Upload a CSV file to bulk-import records into the ${collectionTitle} collection.`}
          icon={FileUp}
        />
        <CsvImporter
          slug={slug}
          schema={schema}
          onClose={() => setIsImportOpen(false)}
        />
      </div>
    )
  }

  return (
    <div className="dy-space-y-6 dy-animate-in lg:dy-space-y-8">
      <AdminComponentSlot
        slot="beforeList"
        componentKeys={collectionSlots?.beforeList}
        registry={components?.collectionList}
        componentProps={collectionComponentProps}
      />
      <PageHeader
        title={schema.labels?.plural || schema.slug}
        description={schema.admin?.description || `Manage your ${schema.labels?.plural || schema.slug} entries and update content.`}
        icon={resolveAdminIcon(schema.admin?.icon, schema.auth ? Users : Database)}
      >
        <div className="dy-flex dy-items-center dy-gap-2 dy-w-full sm:dy-w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="dy-h-8 dy-px-3 dy-gap-1.5 dy-text-xs">
                <Settings2 className="dy-h-3.5 dy-w-3.5" />
                <span>View Settings</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="dy-w-80 dy-p-4 dy-space-y-4">
              <div className="dy-space-y-1.5">
                <h4 className="dy-text-xs dy-font-semibold dy-text-foreground dy-text-left">Layout Mode</h4>
                <div className="dy-grid dy-grid-cols-2 dy-gap-2">
                  <Button
                    size="sm"
                    variant={localPreference.viewMode === "list" ? "default" : "outline"}
                    className="dy-h-8 dy-text-xs"
                    onClick={() => setLocalPreference(prev => ({ ...prev, viewMode: "list" }))}
                  >
                    List View
                  </Button>
                  <Button
                    size="sm"
                    variant={localPreference.viewMode === "spreadsheet" ? "default" : "outline"}
                    className="dy-h-8 dy-text-xs"
                    onClick={() => setLocalPreference(prev => ({ ...prev, viewMode: "spreadsheet" }))}
                  >
                    Spreadsheet
                  </Button>
                </div>
              </div>

              <div className="dy-space-y-1.5">
                <h4 className="dy-text-xs dy-font-semibold dy-text-foreground dy-text-left">Columns</h4>
                <p className="dy-text-[10px] dy-text-muted-foreground dy-text-left">Reorder and toggle column visibility.</p>
                <div className="dy-max-h-[200px] dy-overflow-y-auto dy-space-y-1 dy-pr-1 dy-outline-none">
                  <DndContext
                    sensors={dndSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDndDragEnd}
                  >
                    <SortableContext
                      items={localPreference.columns.map(c => c.name)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="dy-space-y-1">
                        {localPreference.columns.map((col) => {
                          let label = col.name
                          if (col.name === "id") label = "ID"
                          else if (col.name === "createdAt") label = "Created"
                          else if (col.name === "updatedAt") label = "Last Updated"
                          else {
                            const field = schema.fields.find((f: Field) => f.name === col.name)
                            if (field) label = field.label || field.name!
                          }
                          return (
                            <SortableColumnItem
                              key={col.name}
                              id={col.name}
                              label={label}
                              visible={col.visible}
                              onToggleVisible={(visible) => {
                                setLocalPreference(prev => ({
                                  ...prev,
                                  columns: prev.columns.map(c => c.name === col.name ? { ...c, visible } : c)
                                }))
                              }}
                            />
                          )
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </div>

              <div className="dy-pt-2 dy-border-t dy-border-border/60 dy-flex dy-flex-col dy-gap-2">
                <div className="dy-grid dy-grid-cols-2 dy-gap-2">
                  <Button
                    size="sm"
                    className="dy-h-7 dy-text-[10px]"
                    onClick={() => {
                      saveColumns("personal")
                      toast.success("Saved personal view preferences")
                    }}
                  >
                    Save for Me
                  </Button>
                  {user?.role === "admin" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="dy-h-7 dy-text-[10px]"
                      onClick={() => {
                        saveColumns("global")
                        toast.success("Saved global view preferences")
                      }}
                    >
                      Save for Everyone
                    </Button>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="dy-h-7 dy-text-[10px] dy-w-full"
                  onClick={() => {
                    resetColumns()
                    toast.success("Reset view preferences to default")
                  }}
                >
                  Reset to Default
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {canCreate && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="dy-h-8 dy-px-3 dy-gap-1.5 dy-text-xs dy-w-full sm:dy-w-auto"
                onClick={() => setIsImportOpen(true)}
              >
                <FileUp className="dy-h-3.5 dy-w-3.5" />
                <span>Import CSV</span>
              </Button>
              <Link to={`/collections/${slug}/new`} className="dy-w-full sm:dy-w-auto">
                <Button className="dy-h-9 dy-w-full dy-justify-center dy-rounded-md dy-bg-primary dy-px-4 dy-text-[11px] dy-shadow-sm dy-transition-all hover:dy-bg-primary/90 active:dy-scale-95 sm:dy-h-8 sm:dy-w-auto">
                  <Plus className="dy-mr-1.5 dy-h-3 dy-w-3" />
                  <span className="sm:dy-hidden">Add</span>
                  <span className="dy-hidden sm:dy-inline">Add {schema.labels?.singular || schema.slug}</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </PageHeader>

      <AdminComponentSlot
        slot="beforeListTable"
        componentKeys={collectionSlots?.beforeListTable}
        registry={components?.collectionList}
        componentProps={collectionComponentProps}
      />
      <div className="dy-min-w-0">
        {isLoading ? (
          <AdminPageSkeleton />
        ) : localPreference.viewMode === "spreadsheet" ? (
          <React.Suspense
            fallback={<AdminPageSkeleton />}
          >
            <SpreadsheetEditor
              slug={slug}
              schema={schema}
              data={response?.docs || []}
              onSave={async (updates, creates) => {
                await bulkSaveMutation.mutateAsync({ updates, creates: creates || [] })
              }}
              isSaving={bulkSaveMutation.isPending}
            />
          </React.Suspense>
        ) : (
          <DataTable
            key={slug}
            columns={columns}
            data={response?.docs || []}
            searchPlaceholder={`Search ${schema.labels?.plural || schema.slug}...`}
            searchValue={searchParam}
            onSearchChange={(value) => {
              setSearchParams(prev => {
                if (value.trim()) {
                  prev.set("search", value)
                } else {
                  prev.delete("search")
                }
                return prev
              }, { replace: true })
              setPage(1)
            }}
            onRowSelectionChange={setRowSelection}
            rowSelection={rowSelection}
            hideViewButton={true}
            toolbarActions={(
              <>
                <FilterBuilder schema={schema} rules={rules} onChange={handleRulesChange} />
                <Button
                  variant="outline"
                  size="sm"
                  className="dy-h-9 dy-w-full dy-justify-center dy-gap-2 dy-rounded-md dy-px-3 dy-text-[11px] dy-shadow-sm dy-transition-all active:dy-scale-95 sm:dy-h-8 sm:dy-w-auto"
                  onClick={handleExportCsv}
                  disabled={exporting}
                >
                  {exporting ? (
                    <div className="dy-h-3 dy-w-3 dy-animate-spin dy-rounded-full dy-border-2 dy-border-current dy-border-t-transparent" />
                  ) : (
                    <FileDown className="dy-h-3.5 dy-w-3.5" />
                  )}
                  <span className="dy-hidden sm:dy-inline">{exporting ? "Exporting..." : "Export CSV"}</span>
                  <span className="sm:dy-hidden">{exporting ? "Exporting" : "Export"}</span>
                </Button>
              </>
            )}
            bulkActions={(selectedIds) => {
              const deletableIds = selectedIds.filter(id => {
                const item = response?.docs?.find((d: Record<string, unknown>) => d.id === id)
                if (!item) return false
                if (schema.auth && id === user?.id) return false

                const deleteAccess = (schema.access as { delete?: unknown })?.delete
                let canDelete = true
                if (deleteAccess === false) {
                  canDelete = false
                } else if (typeof deleteAccess === 'string') {
                  try {
                    canDelete = jexl.evalSync(deleteAccess, { user, ...item })
                  } catch (e) {
                    console.warn("Delete access eval failed:", e)
                  }
                }
                return canDelete
              })

              return (
                <>
                  {workflowConfig && selectedWorkflowDocs.length > 0 && sharedWorkflowTransitions.length > 0 && (
                    <WorkflowTransitionMenu
                      collection={slug}
                      documentIds={selectedWorkflowDocs.map((doc) => doc.id)}
                      documentLabels={Object.fromEntries(
                        selectedWorkflowDocs.map((doc) => [
                          doc.id,
                          resolveDocumentTitle({
                            entry: doc,
                            collection: schema,
                            collections: [schema],
                          }),
                        ]),
                      )}
                      workflowConfig={workflowConfig}
                      transitions={sharedWorkflowTransitions}
                      expectedRevisions={selectedWorkflowRevisions}
                      invalidateQueryKeys={[["collection", slug]]}
                      onComplete={() => setRowSelection({})}
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          className="dy-h-8"
                          disabled={selectedWorkflowDocs.length === 0}
                        >
                          Change state ({selectedWorkflowDocs.length})
                        </Button>
                      }
                    />
                  )}
                  {workflowConfig && selectedWorkflowDocs.length > 0 && sharedWorkflowTransitions.length === 0 && (
                    <span className="dy-text-xs dy-text-muted-foreground">
                      No shared workflow action for this selection.
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="dy-h-8"
                    onClick={() => handleExportSelected(selectedIds)}
                    disabled={selectedIds.length === 0}
                  >
                    <FileDown className="dy-h-4 dy-w-4 dy-mr-2" />
                    Export Selected ({selectedIds.length})
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="dy-h-8"
                    onClick={() => handleBulkDelete(deletableIds)}
                    disabled={bulkDeleteMutation.isPending || deletableIds.length === 0}
                  >
                    <Trash2 className="dy-h-4 dy-w-4 dy-mr-2" />
                    Delete Selected ({deletableIds.length})
                  </Button>
                </>
              )
            }}
          />
        )}
        <AdminComponentSlot
          slot="afterListTable"
          componentKeys={collectionSlots?.afterListTable}
          registry={components?.collectionList}
          componentProps={collectionComponentProps}
        />
        <Pagination
          page={page}
          totalPages={totalPages}
          total={response?.total}
          hasPrevPage={hasPrevPage}
          hasNextPage={hasNextPage}
          onPageChange={setPage}
        />
        <AdminComponentSlot
          slot="afterList"
          componentKeys={collectionSlots?.afterList}
          registry={components?.collectionList}
          componentProps={collectionComponentProps}
        />
      </div>

    </div>
  )
}
