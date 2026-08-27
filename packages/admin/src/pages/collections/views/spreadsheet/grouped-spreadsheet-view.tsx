import * as React from "react"
import type { ColumnDef, SortingState, VisibilityState } from "@tanstack/react-table"
import {
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, ChevronRight, Layers, Loader2, Plus } from "lucide-react"

import type { TableGroupState } from "../table/use-table-groups"
import { Badge } from "../../../../components/ui/badge"
import { Button } from "../../../../components/ui/button"
import { DataGrid } from "./data-grid"
import type { DataGridTableMeta } from "./data-grid-types"

interface GroupedSpreadsheetViewProps {
  columns: ColumnDef<any, any>[]
  orderedColumnIds: string[]
  groupStates: TableGroupState[]
  columnOrder: string[]
  columnVisibility: VisibilityState
  sorting: SortingState
  onSortingChange: (updater: any) => void
  tableMeta: DataGridTableMeta<any>
  readOnly?: boolean
  updates: Record<string, Record<string, unknown>>
  newRows: Array<{ __tempId: string; values: Record<string, unknown> }>
  onRowAddForGroup?: (groupValue: string) => void
}

export function GroupedSpreadsheetView({
  columns,
  orderedColumnIds,
  groupStates,
  columnOrder,
  columnVisibility,
  sorting,
  onSortingChange,
  tableMeta,
  readOnly = false,
  updates,
  newRows,
  onRowAddForGroup,
}: GroupedSpreadsheetViewProps) {
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({})

  const toggleGroup = React.useCallback((value: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [value]: !prev[value] }))
  }, [])

  return (
    <div className="dy-flex dy-flex-col dy-gap-6">
      {groupStates.map((group) => {
        const isCollapsed = Boolean(collapsedGroups[group.value])

        return (
          <SpreadsheetGroupSection
            key={group.value}
            group={group}
            isCollapsed={isCollapsed}
            onToggle={() => toggleGroup(group.value)}
            columns={columns}
            orderedColumnIds={orderedColumnIds}
            columnOrder={columnOrder}
            columnVisibility={columnVisibility}
            sorting={sorting}
            onSortingChange={onSortingChange}
            tableMeta={tableMeta}
            readOnly={readOnly}
            updates={updates}
            newRows={newRows}
            onRowAdd={onRowAddForGroup ? () => onRowAddForGroup(group.value) : undefined}
          />
        )
      })}
    </div>
  )
}

interface SpreadsheetGroupSectionProps {
  group: TableGroupState
  isCollapsed: boolean
  onToggle: () => void
  columns: ColumnDef<any, any>[]
  orderedColumnIds: string[]
  columnOrder: string[]
  columnVisibility: VisibilityState
  sorting: SortingState
  onSortingChange: (updater: any) => void
  tableMeta: DataGridTableMeta<any>
  readOnly?: boolean
  updates: Record<string, Record<string, unknown>>
  newRows: Array<{ __tempId: string; values: Record<string, unknown> }>
  onRowAdd?: () => void
}

function SpreadsheetGroupSection({
  group,
  isCollapsed,
  onToggle,
  columns,
  orderedColumnIds,
  columnOrder,
  columnVisibility,
  sorting,
  onSortingChange,
  tableMeta,
  readOnly,
  updates,
  newRows,
  onRowAdd,
}: SpreadsheetGroupSectionProps) {
  // Merge this group's server docs with pending local updates and new rows created for this group
  const gridData = React.useMemo(() => {
    const editedDocs = group.docs.map((doc) => {
      const docUpdates = updates[String(doc.id)]
      return docUpdates ? { ...doc, ...docUpdates } : doc
    })

    const groupNewRows = newRows
      .filter((nr) => (nr as any).__groupValue === group.value)
      .map(({ __tempId, values }) => ({ ...values, id: __tempId }))

    return [...editedDocs, ...groupNewRows]
  }, [group.docs, group.value, updates, newRows])

  const table = useReactTable({
    data: gridData,
    columns,
    state: {
      sorting,
      columnOrder,
      columnVisibility,
    },
    onSortingChange,
    getRowId: (row) => String(row.id),
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
        {!readOnly && onRowAdd && (
          <Button
            variant="ghost"
            size="sm"
            className="dy-h-7 dy-px-2 dy-text-xs dy-text-muted-foreground hover:dy-text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              onRowAdd()
            }}
          >
            <Plus className="dy-mr-1 dy-h-3.5 dy-w-3.5" />
            Add to {group.label}
          </Button>
        )}
      </div>

      {!isCollapsed && (
        <DataGrid
          table={table}
          columnIds={orderedColumnIds}
          tableMeta={tableMeta}
          readOnly={readOnly}
          onRowAdd={!readOnly ? onRowAdd : undefined}
          height={Math.min(Math.max(gridData.length * 36 + 45, 120), 480)}
        />
      )}
    </div>
  )
}
