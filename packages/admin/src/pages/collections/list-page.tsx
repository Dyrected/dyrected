
import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Link } from "react-router-dom"
import { useDyrected } from "../../providers/dyrected-provider"
import { DataTable } from "../../components/ui/data-table"
import { type ColumnDef } from "@tanstack/react-table"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Checkbox } from "../../components/ui/checkbox"
import {
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Database,
  Image as ImageIcon,
  Lock,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../../components/ui/dropdown-menu"
import { RenderCell } from "../../components/ui/render-cell"
import { PageHeader } from "../../components/ui/page-header"
import { Pagination } from "../../components/ui/pagination"
import { MediaGrid } from "../../components/media/media-grid"
import jexl from 'jexl'

interface CollectionListPageProps {
  slug: string
}

export function CollectionListPage({ slug }: CollectionListPageProps) {
  const { client, user } = useDyrected()
  const queryClient = useQueryClient()
  const [page, setPage] = React.useState(1)
  const [prevSlug, setPrevSlug] = React.useState(slug)

  if (slug !== prevSlug) {
    setPrevSlug(slug)
    setPage(1)
  }

  // Fetch schema to know fields
  const { data: schemas } = useQuery({
    queryKey: ["schemas"],
    queryFn: () => client!.getSchemas(),
    enabled: !!client,
  })

  const schema = schemas?.collections.find((c: any) => c.slug === slug)

  // Fetch collection data
  const { data: response, isLoading } = useQuery({
    queryKey: ["collection", slug, page],
    queryFn: () => client!.collection(slug).find({ page, limit: 20, depth: 1 }).exec(),
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
    onError: (error: any) => {
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
    onError: (error: any) => {
      toast.error("Failed to delete entries", {
        description: error.message
      })
    }
  })

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

  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({})

  const columns: ColumnDef<any>[] = React.useMemo(() => {
    if (!schema) return []

    const cols: ColumnDef<any>[] = [
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
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => <span className="dy-font-mono dy-text-xs">{row.getValue("id")}</span>,
      },
    ]

    const hasStatus = schema.fields.some((f: any) => f.name === "status")

    if (hasStatus) {
      cols.push({
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status")
          return (
            <Badge variant={status === "published" ? "default" : "secondary"}>
              {status === "published" ? "Published" : "Draft"}
            </Badge>
          )
        }
      })
    }

    // Include all non-hidden, non-layout fields as columns
    const allDisplayFields = schema.fields.filter((f: any) =>
      f.name !== "status" && f.name !== "password" && !f.admin?.hidden && f.type !== "row" && f.type !== "join"
    )
    const titleFieldName = schema.admin?.useAsTitle || allDisplayFields[0]?.name

    allDisplayFields.forEach((field: any) => {
      const isTitleField = field.name === titleFieldName
      cols.push({
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
          if (!isTitleField) return cell
          return (
            <Link
              to={`/collections/${slug}/edit/${(row.original as any).id}`}
              className="dy-font-medium dy-text-foreground hover:dy-text-primary hover:dy-underline dy-underline-offset-2 dy-transition-colors dy-duration-150"
            >
              {cell}
            </Link>
          )
        },
      })
    })

    // Add metadata columns
    cols.push({
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ row }) => {
        const date = new Date(row.getValue("updatedAt"))
        return (
          <div className="dy-flex dy-items-center dy-gap-2 dy-text-muted-foreground">
            <Calendar className="dy-h-3 dy-w-3" />
            <span className="dy-text-xs">{date.toLocaleDateString()}</span>
          </div>
        )
      }
    })

    // Actions
    cols.push({
      id: "actions",
      cell: ({ row }) => {
        const item = row.original
        const deleteAccess = (schema.access as any)?.delete
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

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="dy-h-8 dy-w-8 dy-p-0">
                <span className="dy-sr-only">Open menu</span>
                <MoreHorizontal className="dy-h-4 dy-w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(item.id)}>
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <Link to={`/collections/${slug}/edit/${item.id}`}>
                <DropdownMenuItem className="dy-flex dy-gap-2">
                  <Pencil className="dy-h-4 dy-w-4" />
                  Edit
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem
                className="dy-flex dy-gap-2 dy-text-destructive focus:dy-text-destructive"
                onClick={() => handleDelete(item.id)}
                disabled={deleteMutation.isPending || !canDelete || (schema.auth && item.id === user?.id)}
                title={!canDelete ? "You do not have permission to delete this entry" : (schema.auth && item.id === user?.id ? "You cannot delete your own account" : undefined)}
              >
                <Trash2 className="dy-h-4 dy-w-4" />
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    })

    return cols
  }, [schema, client, deleteMutation.isPending, user, handleDelete, slug, schemas])

  const initialColumnVisibility = React.useMemo(() => {
    if (!schema) return {}

    const visibility: Record<string, boolean> = {}
    const displayFields = schema.fields.filter((f: any) => f.name !== "status" && !f.admin?.hidden)

    let visibleFieldNames: string[] = []
    if (schema.admin?.defaultColumns && Array.isArray(schema.admin.defaultColumns)) {
      visibleFieldNames = schema.admin.defaultColumns
    } else {
      visibleFieldNames = displayFields.slice(0, 3).map((f: any) => f.name)
    }

    // Set visibility for all fields
    displayFields.forEach((f: any) => {
      visibility[f.name] = visibleFieldNames.includes(f.name)
    })

    return visibility
  }, [schema])

  if (isLoading) {
    return (
      <div className="dy-flex dy-h-[400px] dy-items-center dy-justify-center">
        <div className="dy-animate-spin dy-rounded-full dy-border-4 dy-border-primary dy-border-t-transparent dy-h-8 dy-w-8"></div>
      </div>
    )
  }

  if (!schema) {
    return <div>Collection not found: {slug}</div>
  }

  // Evaluate collection-level read access
  const readAccess = (schema.access as any)?.read
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
  const createAccess = (schema.access as any)?.create
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

  if (slug === "media") {
    return (
      <div className="dy-space-y-8 dy-animate-in">
        <PageHeader
          title="Media Library"
          description="Manage your media assets and uploads."
          icon={ImageIcon}
        >
          {canCreate && (
            <Link to={`/collections/${slug}/new`}>
              <Button className="dy-h-8 dy-px-4 dy-text-[11px] dy-rounded-md dy-bg-primary hover:dy-bg-primary/90 dy-shadow-sm dy-transition-all active:dy-scale-95">
                <Plus className="dy-mr-1.5 dy-h-3 dy-w-3" />
                Upload New
              </Button>
            </Link>
          )}
        </PageHeader>

        <MediaGrid
          items={response?.docs || []}
          baseUrl={client?.getBaseUrl() || ""}
          onDelete={handleDelete}
          slug={slug}
        />

        <Pagination
          page={page}
          totalPages={totalPages}
          hasPrevPage={hasPrevPage}
          hasNextPage={hasNextPage}
          onPageChange={setPage}
          className="dy-mt-8"
        />
      </div>
    )
  }

  return (
    <div className="dy-space-y-8 dy-animate-in">
      <PageHeader
        title={schema.labels?.plural || schema.label || schema.slug}
        description={`Manage your ${schema.slug} entries and update content.`}
        icon={Database}
      >
        {canCreate && (
          <Link to={`/collections/${slug}/new`}>
            <Button className="dy-h-8 dy-px-4 dy-text-[11px] dy-rounded-md dy-bg-primary hover:dy-bg-primary/90 dy-shadow-sm dy-transition-all active:dy-scale-95">
              <Plus className="dy-mr-1.5 dy-h-3 dy-w-3" />
              Add {schema.labels?.singular || schema.label || schema.slug}
            </Button>
          </Link>
        )}
      </PageHeader>

      <div className="dy-overflow-hidden">
        <DataTable
          key={slug}
          columns={columns}
          data={response?.docs || []}
          searchKey={schema.admin?.useAsTitle || schema.fields.find((f: any) => !f.admin?.hidden)?.name || "id"}
          onRowSelectionChange={setRowSelection}
          rowSelection={rowSelection}
          persistenceKey={slug}
          initialColumnVisibility={initialColumnVisibility}
          bulkActions={(selectedIds) => {
            const deletableIds = selectedIds.filter(id => {
              const item = response?.docs?.find((d: any) => d.id === id)
              if (!item) return false
              if (schema.auth && id === user?.id) return false
              
              const deleteAccess = (schema.access as any)?.delete
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
        />
        <Pagination
          page={page}
          totalPages={totalPages}
          total={response?.total}
          hasPrevPage={hasPrevPage}
          hasNextPage={hasNextPage}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
