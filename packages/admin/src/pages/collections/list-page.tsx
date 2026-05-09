import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { RenderCell } from "../../components/ui/render-cell"

interface CollectionListPageProps {
  slug: string
}

export function CollectionListPage({ slug }: CollectionListPageProps) {
  const { client } = useDyrected()
  const queryClient = useQueryClient()
  const [page, setPage] = React.useState(1)

  // Reset to page 1 when collection slug changes
  React.useEffect(() => { setPage(1) }, [slug])

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
    },
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
    },
  })

  function handleDelete(id: string) {
    if (window.confirm("Delete this entry? This cannot be undone.")) {
      deleteMutation.mutate(id)
    }
  }

  function handleBulkDelete(ids: string[]) {
    if (window.confirm(`Delete ${ids.length} entries? This cannot be undone.`)) {
      bulkDeleteMutation.mutate(ids)
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
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("id")}</span>,
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

    // Include all non-hidden fields as columns
    const allDisplayFields = schema.fields.filter((f: any) => f.name !== "status" && !f.admin?.hidden)

    allDisplayFields.forEach((field: any) => {
      cols.push({
        accessorKey: field.name,
        header: field.label || field.name,
        cell: ({ row }) => (
          <RenderCell
            value={row.getValue(field.name)}
            field={field}
            client={client}
            schemas={schemas}
          />
        ),
      })
    })

    // Add metadata columns
    cols.push({
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ row }) => {
        const date = new Date(row.getValue("updatedAt"))
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span className="text-xs">{date.toLocaleDateString()}</span>
          </div>
        )
      }
    })

    // Actions
    cols.push({
      id: "actions",
      cell: ({ row }) => {
        const item = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(item.id)}>
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <Link to={`/collections/${slug}/edit/${item.id}`}>
                <DropdownMenuItem className="flex gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem
                className="flex gap-2 text-destructive focus:text-destructive"
                onClick={() => handleDelete(item.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    })

    return cols
  }, [schema, client, deleteMutation.isPending])

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
      <div className="flex h-[400px] items-center justify-center">
        <div className="animate-spin rounded-full border-4 border-primary border-t-transparent h-8 w-8"></div>
      </div>
    )
  }

  if (!schema) {
    return <div>Collection not found: {slug}</div>
  }

  return (
    <div className="space-y-8 animate-in">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Database className="h-4 w-4 text-primary/60" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{schema.labels?.plural || schema.label || schema.slug}</h1>
          </div>
          <p className="text-[11px] text-muted-foreground/60 font-medium">
            Manage your {schema.slug} entries and update content.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to={`/collections/${slug}/new`}>
            <Button className="h-8 px-4 text-[11px] rounded-md bg-primary hover:bg-primary/90 shadow-sm transition-all active:scale-95">
              <Plus className="mr-1.5 h-3 w-3" />
              Create New
            </Button>
          </Link>
        </div>
      </div>

      <div className="overflow-hidden">
        <DataTable
          columns={columns}
          data={response?.docs || []}
          searchKey={schema.admin?.useAsTitle || schema.fields.find((f: any) => !f.admin?.hidden)?.name || "id"}
          onRowSelectionChange={setRowSelection}
          rowSelection={rowSelection}
          persistenceKey={slug}
          initialColumnVisibility={initialColumnVisibility}
          bulkActions={(selectedIds) => (
            <Button
              variant="destructive"
              size="sm"
              className="h-8"
              onClick={() => handleBulkDelete(selectedIds)}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedIds.length})
            </Button>
          )}
        />
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-border/40">
            <p className="text-xs text-muted-foreground">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              {response?.total != null && (
                <> &mdash; {response.total} total entries</>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={!hasPrevPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={!hasNextPage}
                onClick={() => setPage((p) => p + 1)}
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
