import * as React from "react"
import type { ColumnDef, SortingState, VisibilityState } from "@tanstack/react-table"
import {
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, ChevronRight, Layers, Loader2 } from "lucide-react"

import { DataTable } from "./data-table"
import type { TableGroupState } from "./use-table-groups"
import { Badge } from "../../../../components/ui/badge"
import { Button } from "../../../../components/ui/button"

interface GroupedTableViewProps {
  columns: ColumnDef<any, any>[]
  groupStates: TableGroupState[]
  columnOrder: string[]
  columnVisibility: VisibilityState
  sorting: SortingState
  onSortingChange: (updater: any) => void
  rowSelection: Record<string, boolean>
  onRowSelectionChange: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  onRowClick?: (row: any) => void
  actionBar?: React.ReactNode
}

export function GroupedTableView({
  columns,
  groupStates,
  columnOrder,
  columnVisibility,
  sorting,
  onSortingChange,
  rowSelection,
  onRowSelectionChange,
  onRowClick,
  actionBar,
}: GroupedTableViewProps) {
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({})

  const toggleGroup = React.useCallback((value: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [value]: !prev[value] }))
  }, [])

  const selectedCount = React.useMemo(
    () => Object.values(rowSelection).filter(Boolean).length,
    [rowSelection],
  )

  return (
    <div className="dy-flex dy-flex-col dy-gap-6">
      {groupStates.map((group) => {
        const isCollapsed = Boolean(collapsedGroups[group.value])

        return (
          <GroupSection
            key={group.value}
            group={group}
            isCollapsed={isCollapsed}
            onToggle={() => toggleGroup(group.value)}
            columns={columns}
            columnOrder={columnOrder}
            columnVisibility={columnVisibility}
            sorting={sorting}
            onSortingChange={onSortingChange}
            rowSelection={rowSelection}
            onRowSelectionChange={onRowSelectionChange}
            onRowClick={onRowClick}
          />
        )
      })}
      {selectedCount > 0 && actionBar}
    </div>
  )
}

interface GroupSectionProps {
  group: TableGroupState
  isCollapsed: boolean
  onToggle: () => void
  columns: ColumnDef<any, any>[]
  columnOrder: string[]
  columnVisibility: VisibilityState
  sorting: SortingState
  onSortingChange: (updater: any) => void
  rowSelection: Record<string, boolean>
  onRowSelectionChange: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  onRowClick?: (row: any) => void
}

function GroupSection({
  group,
  isCollapsed,
  onToggle,
  columns,
  columnOrder,
  columnVisibility,
  sorting,
  onSortingChange,
  rowSelection,
  onRowSelectionChange,
  onRowClick,
}: GroupSectionProps) {
  const table = useReactTable({
    data: group.docs,
    columns,
    state: {
      sorting,
      rowSelection,
      columnOrder,
      columnVisibility,
    },
    onSortingChange,
    onRowSelectionChange,
    getRowId: (row) => String(row.id),
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="dy-flex dy-flex-col dy-gap-2.5">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onToggle()
          }
        }}
        className="dy-flex dy-items-center dy-justify-between dy-py-1 dy-cursor-pointer dy-select-none group"
      >
        <div className="dy-flex dy-items-center dy-gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="dy-h-6 dy-w-6 dy-p-0 dy-text-muted-foreground group-hover:dy-text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
          >
            {isCollapsed ? (
              <ChevronRight className="dy-h-4 dy-w-4" />
            ) : (
              <ChevronDown className="dy-h-4 dy-w-4" />
            )}
          </Button>
          <div className="dy-flex dy-items-center dy-gap-2">
            <Layers className="dy-h-4 dy-w-4 dy-text-muted-foreground" />
            <span className="dy-text-sm dy-font-semibold dy-text-foreground group-hover:dy-text-primary dy-transition-colors">
              {group.label}
            </span>
          </div>
          <Badge variant="secondary" className="dy-h-5 dy-px-2 dy-text-[11px] dy-font-medium">
            {group.total}
          </Badge>
          {group.isFetching && (
            <Loader2 className="dy-h-3.5 dy-w-3.5 dy-animate-spin dy-text-primary" />
          )}
        </div>
      </div>

      {!isCollapsed && (
        <DataTable
          table={table}
          isFetching={group.isFetching}
          onRowClick={onRowClick}
        />
      )}
    </div>
  )
}
