import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useDyrected } from "../../providers/dyrected-provider"
import { DataTable } from "../../components/ui/data-table"
import { type ColumnDef } from "@tanstack/react-table"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
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
    queryFn: () => client!.collection(slug).find({ page, limit: 20 }).exec(),
    enabled: !!client,
  })

  const totalPages = response?.totalPages ?? 1
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client!.collection(slug).delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collection", slug] }),
  })

  function handleDelete(id: string) {
    if (window.confirm("Delete this entry? This cannot be undone.")) {
      deleteMutation.mutate(id)
    }
  }

  const columns: ColumnDef<any>[] = React.useMemo(() => {
    if (!schema) return []

    const cols: ColumnDef<any>[] = [
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

    // Determine which fields to show in columns
    let displayFields = schema.fields.filter((f: any) => f.name !== "status" && !f.admin?.hidden)

    if (schema.admin?.defaultColumns && Array.isArray(schema.admin.defaultColumns)) {
      displayFields = displayFields.filter((f: any) => schema.admin.defaultColumns.includes(f.name))
    } else {
      displayFields = displayFields.slice(0, 3)
    }

    displayFields.forEach((field: any) => {
      cols.push({
        accessorKey: field.name,
        header: field.label || field.name,
        cell: ({ row }) => {
          const value = row.getValue(field.name)
          if (typeof value === "boolean") {
            return <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>
          }
          if (field.type === "image" && value) {
            return <img src={client?.getBaseUrl() + "/media/" + value} className="h-8 w-8 rounded object-cover" alt="" />
          }
          return <span>{String(value ?? "-")}</span>
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
  }, [schema, client])

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
      <div className="flex items-end justify-between border-b border-border/50 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{schema.label || schema.slug}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your {schema.slug} entries, search, and update content.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to={`/collections/${slug}/new`}>
            <Button className="h-10 px-4 rounded-lg bg-primary hover:bg-primary/90 shadow-md transition-all active:scale-95">
              <Plus className="mr-2 h-4 w-4" />
              Create {schema.label || schema.slug}
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-white overflow-hidden">
        <DataTable
          columns={columns}
          data={response?.docs || []}
          searchKey={schema.admin?.useAsTitle || schema.fields.find((f: any) => !f.admin?.hidden)?.name || "id"}
        />
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20">
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
