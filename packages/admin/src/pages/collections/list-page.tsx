
import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Link, useSearchParams } from "react-router-dom"
import { useDyrected } from "../../providers/dyrected-provider"
import { FilterBuilder } from "../../components/ui/filter-builder"
import type { CollectionConfig, Field } from "@dyrected/core"
import { type FilterRule, rulesToWhere, whereToRules } from "../../lib/filter-rules"
import { DataTable } from "../../components/ui/data-table"
import { type ColumnDef } from "@tanstack/react-table"
import { Button } from "../../components/ui/button"
import { Checkbox } from "../../components/ui/checkbox"
import {
  Plus,
  Trash2,
  Calendar,
  Database,
  Image as ImageIcon,
  Lock,
  FileDown,
} from "lucide-react"

import { RenderCell } from "../../components/ui/render-cell"
import { PageHeader } from "../../components/ui/page-header"
import { Pagination } from "../../components/ui/pagination"
import { AdminComponentSlot } from "../../components/admin-component-slot"
import type { CollectionListSlotProps } from "../../types/admin-components"
import { MediaGrid } from "../../components/media/media-grid"
import { getMediaUrl } from "../../lib/utils"
import jexl from 'jexl'

interface CollectionListPageProps {
  slug: string
}

export function CollectionListPage({ slug }: CollectionListPageProps) {
  const { client, components, user } = useDyrected()
  const queryClient = useQueryClient()
  const [page, setPage] = React.useState(1)
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({})
  const [searchParams, setSearchParams] = useSearchParams()
  const whereParam = searchParams.get('where')

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

  React.useEffect(() => {
    setPage((prev) => prev === 1 ? prev : 1)
    setRowSelection((prev) => Object.keys(prev).length === 0 ? prev : {})
  }, [slug])

  // Fetch schema to know fields
  const { data: schemas } = useQuery({
    queryKey: ["schemas"],
    queryFn: () => client!.getSchemas(),
    enabled: !!client,
  })

  const schema = schemas?.collections.find((c: CollectionConfig) => c.slug === slug)

  // Fetch collection data
  const { data: response, isLoading } = useQuery({
    queryKey: ["collection", slug, page, whereParam],
    queryFn: () => {
      const queryParams: Record<string, unknown> = { page, limit: 20, depth: 1 };
      if (whereParam) {
        try {
          queryParams.where = JSON.parse(whereParam);
        } catch {
          // invalid json
        }
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

  const [exporting, setExporting] = React.useState(false)

  const handleExportCsv = React.useCallback(async () => {
    if (!schema || !client) return
    setExporting(true)
    try {
      const displayFields = schema.fields.filter((f: Field) =>
        f.name !== "password" && !f.admin?.hidden && f.type !== "row" && f.type !== "join"
      )
      const csvColumns = [
        { key: "id", label: "ID" },
        ...displayFields.map((f: Field) => ({ key: f.name, label: (f as {label?: string}).label || f.name })),
        { key: "updatedAt", label: "Last Updated" },
      ]

      const allDocs: Record<string, unknown>[] = []
      let pg = 1
      let totalPages = 1
      while (pg <= totalPages) {
        const res = await client.collection(slug).find({ page: pg, limit: 20, depth: 1 }).exec()
        allDocs.push(...(res.docs || []))
        totalPages = res.totalPages ?? 1
        pg++
      }

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

      const header = csvColumns.map((c) => flattenForCsv(c.label)).join(",")
      const rows = allDocs.map((doc) =>
        csvColumns.map((c) => flattenForCsv(doc[c.key])).join(",")
      )
      const csv = [header, ...rows].join("\n")
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${slug}-export.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${allDocs.length} entries`)
    } catch (err: unknown) {
      toast.error("Export failed", { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setExporting(false)
    }
  }, [schema, client, slug])

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

  const columns: ColumnDef<Record<string, unknown>>[] = React.useMemo(() => {
    if (!schema) return []

    const allDisplayFields = schema.fields.filter((f: Field) =>
      f.name !== "password" && !f.admin?.hidden && f.type !== "row" && f.type !== "join"
    )
    const fieldByName = new Map<string, Field>(allDisplayFields.map((field: Field) => [field.name, field]))
    const configuredColumns = Array.isArray(schema.admin?.defaultColumns)
      ? schema.admin.defaultColumns
      : []
    const visibleColumnNames = configuredColumns.length > 0
      ? configuredColumns
      : allDisplayFields.slice(0, 3).map((field: Field) => field.name)
    const systemColumnNames = ["id", "createdAt", "updatedAt"]
    const allColumnNames = [
      ...visibleColumnNames,
      ...allDisplayFields.map((field: Field) => field.name),
      ...systemColumnNames,
    ].filter((name, index, names) => names.indexOf(name) === index)
    const firstVisibleFieldName = visibleColumnNames.find((name) => fieldByName.has(name))
    const titleFieldName = visibleColumnNames.includes(schema.admin?.useAsTitle || "")
      ? schema.admin?.useAsTitle
      : firstVisibleFieldName

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

    const renderLinkedCell = (item: Record<string, unknown>, cell: React.ReactNode) => {
      const canDelete = canDeleteRow(item)

      return (
        <div className="dy-flex dy-flex-col dy-gap-1">
          <Link
            to={`/collections/${slug}/edit/${String(item.id)}`}
            className="dy-font-medium dy-text-foreground hover:dy-text-primary hover:dy-underline dy-underline-offset-2 dy-transition-colors dy-duration-150"
          >
            {cell}
          </Link>
          <div className="dy-flex dy-items-center dy-gap-2">
            <Link
              to={`/collections/${slug}/edit/${String(item.id)}`}
              className="dy-text-[11px] dy-text-muted-foreground hover:dy-text-foreground dy-underline-offset-2 hover:dy-underline dy-transition-colors dy-duration-150"
            >
              Edit
            </Link>
            <span className="dy-text-muted-foreground/40 dy-text-[11px]">|</span>
            <button
              className="dy-text-[11px] dy-text-muted-foreground hover:dy-text-destructive dy-underline-offset-2 hover:dy-underline dy-transition-colors dy-duration-150 disabled:dy-opacity-40 disabled:dy-pointer-events-none"
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
      accessorKey: field.name,
      header: field.label || field.name,
      cell: ({ row }) => {
        const cell = (
          <RenderCell
            value={row.getValue(field.name)}
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

    return cols
  }, [schema, client, deleteMutation.isPending, user, handleDelete, slug, schemas])

  const initialColumnVisibility = React.useMemo(() => {
    if (!schema) return {}

    const allDisplayFields = schema.fields.filter((f: Field) =>
      f.name !== "password" && !f.admin?.hidden && f.type !== "row" && f.type !== "join"
    )
    const validColumnNames = new Set([
      ...allDisplayFields.map((field: Field) => field.name),
      "id",
      "createdAt",
      "updatedAt",
    ])
    const configuredColumns = Array.isArray(schema.admin?.defaultColumns)
      ? schema.admin.defaultColumns
      : []
    const visibleColumnNames = new Set(
      (configuredColumns.length > 0
        ? configuredColumns
        : allDisplayFields.slice(0, 3).map((field: Field) => field.name)
      ).filter((name) => validColumnNames.has(name))
    )

    const visibility: Record<string, boolean> = {}
    validColumnNames.forEach((name) => {
      visibility[name] = visibleColumnNames.has(name)
    })
    return visibility
  }, [schema])

  const columnPreferenceKey = React.useMemo(() => {
    if (!schema) return slug
    const configuredColumns = Array.isArray(schema.admin?.defaultColumns)
      ? schema.admin.defaultColumns
      : []
    return `${slug}:${configuredColumns.join(",") || "default"}`
  }, [schema, slug])

  if (!schema) {
    return <div>Collection not found: {slug}</div>
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
          <div className="dy-flex dy-h-[400px] dy-items-center dy-justify-center">
            <div className="dy-h-8 dy-w-8 dy-animate-spin dy-rounded-full dy-border-4 dy-border-primary dy-border-t-transparent" />
          </div>
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

  return (
    <div className="dy-space-y-6 dy-animate-in lg:dy-space-y-8">
      <AdminComponentSlot
        slot="beforeList"
        componentKeys={collectionSlots?.beforeList}
        registry={components?.collectionList}
        componentProps={collectionComponentProps}
      />
      <PageHeader
        title={schema.labels?.plural || schema.label || schema.slug}
        description={`Manage your ${schema.labels?.plural || schema.label || schema.slug} entries and update content.`}
        icon={Database}
      >
        {canCreate && (
          <Link to={`/collections/${slug}/new`} className="dy-w-full sm:dy-w-auto">
            <Button className="dy-h-9 dy-w-full dy-justify-center dy-rounded-md dy-bg-primary dy-px-4 dy-text-[11px] dy-shadow-sm dy-transition-all hover:dy-bg-primary/90 active:dy-scale-95 sm:dy-h-8 sm:dy-w-auto">
              <Plus className="dy-mr-1.5 dy-h-3 dy-w-3" />
              <span className="sm:dy-hidden">Add</span>
              <span className="dy-hidden sm:dy-inline">Add {schema.labels?.singular || schema.label || schema.slug}</span>
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

      <div className="dy-min-w-0">
        {isLoading ? (
          <div className="dy-flex dy-h-[400px] dy-items-center dy-justify-center">
            <div className="dy-h-8 dy-w-8 dy-animate-spin dy-rounded-full dy-border-4 dy-border-primary dy-border-t-transparent" />
          </div>
        ) : <DataTable
          key={slug}
          columns={columns}
          data={response?.docs || []}
          searchKey={schema.admin?.useAsTitle || schema.fields.find((f: Field) => !f.admin?.hidden)?.name || "id"}
          onRowSelectionChange={setRowSelection}
          rowSelection={rowSelection}
          persistenceKey={columnPreferenceKey}
          initialColumnVisibility={initialColumnVisibility}
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
            )
          }}
        />}
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
