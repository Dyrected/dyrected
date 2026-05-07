import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useDyrected } from "@/providers/dyrected-provider"
import { DataTable } from "@/components/ui/data-table"
import { type ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  MoreHorizontal, 
  Plus,
  Pencil,
  Trash2,
  Calendar
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface CollectionListPageProps {
  slug: string
}

export function CollectionListPage({ slug }: CollectionListPageProps) {
  const { client } = useDyrected()

  // Fetch schema to know fields
  const { data: schemas } = useQuery({
    queryKey: ["schemas"],
    queryFn: () => client!.getSchemas(),
    enabled: !!client,
  })

  const schema = schemas?.collections.find((c: any) => c.slug === slug)

  // Fetch collection data
  const { data: response, isLoading } = useQuery({
    queryKey: ["collection", slug],
    queryFn: () => client!.collection(slug).find().exec(),
    enabled: !!client,
  })

  const columns: ColumnDef<any>[] = React.useMemo(() => {
    if (!schema) return []

    const cols: ColumnDef<any>[] = [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("id")}</span>,
      },
    ]

    // Add fields from schema (up to 3 main ones for preview)
    schema.fields.slice(0, 4).forEach((field: any) => {
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
              <DropdownMenuItem className="flex gap-2">
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="flex gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{schema.label || schema.slug}</h1>
          <p className="text-muted-foreground">
            Manage your {schema.slug} entries and content.
          </p>
        </div>
        <Button className="flex gap-2">
          <Plus className="h-4 w-4" />
          Create Entry
        </Button>
      </div>

      <DataTable 
        columns={columns} 
        data={response?.docs || []} 
        searchKey={schema.fields[0]?.name}
      />
    </div>
  )
}
