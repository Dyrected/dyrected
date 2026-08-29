import * as React from "react"
import { ChevronDown, ChevronRight, Layers, Loader2 } from "lucide-react"

import { CardGridItem } from "./card-grid-item"
import type { TableGroupState } from "../table/use-table-groups"
import { Badge } from "../../../../components/ui/badge"
import { Button } from "../../../../components/ui/button"
import type { SerializedAction, SerializedView } from "../types"

interface GroupedCardsViewProps {
  slug: string
  schema: any
  view: SerializedView
  client: unknown
  schemas: unknown
  actions: SerializedAction[]
  onRunAction: (action: SerializedAction, ids: string[]) => void
  groupStates: TableGroupState[]
  visibleFieldIds?: string[]
  showLabels?: string[]
}

export function GroupedCardsView({
  slug,
  schema,
  view,
  client,
  schemas,
  actions,
  onRunAction,
  groupStates,
  visibleFieldIds,
  showLabels,
}: GroupedCardsViewProps) {
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({})

  const toggleGroup = React.useCallback((value: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [value]: !prev[value] }))
  }, [])

  return (
    <div className="dy-flex dy-flex-col dy-gap-6">
      {groupStates.map((group) => {
        const isCollapsed = Boolean(collapsedGroups[group.value])

        return (
          <GroupCardSection
            key={group.value}
            slug={slug}
            schema={schema}
            view={view}
            client={client}
            schemas={schemas}
            actions={actions}
            onRunAction={onRunAction}
            group={group}
            isCollapsed={isCollapsed}
            onToggle={() => toggleGroup(group.value)}
            visibleFieldIds={visibleFieldIds}
            showLabels={showLabels}
          />
        )
      })}
    </div>
  )
}

interface GroupCardSectionProps {
  slug: string
  schema: any
  view: SerializedView
  client: unknown
  schemas: unknown
  actions: SerializedAction[]
  onRunAction: (action: SerializedAction, ids: string[]) => void
  group: TableGroupState
  isCollapsed: boolean
  onToggle: () => void
  visibleFieldIds?: string[]
  showLabels?: string[]
}

function GroupCardSection({
  slug,
  schema,
  view,
  client,
  schemas,
  actions,
  onRunAction,
  group,
  isCollapsed,
  onToggle,
  visibleFieldIds,
  showLabels,
}: GroupCardSectionProps) {
  return (
    <div className="dy-flex dy-flex-col dy-gap-3">
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
        <>
          {group.docs.length > 0 ? (
            <div className="dy-grid dy-grid-cols-[repeat(auto-fill,minmax(280px,1fr))] dy-gap-4">
              {group.docs.map((doc) => (
                <CardGridItem
                  key={String(doc.id)}
                  slug={slug}
                  doc={doc}
                  schema={schema}
                  client={client}
                  schemas={schemas}
                  view={view}
                  actions={actions}
                  onRunAction={onRunAction}
                  fields={visibleFieldIds}
                  showLabels={showLabels}
                />
              ))}
            </div>
          ) : (
            <p className="dy-rounded-md dy-border dy-border-dashed dy-p-4 dy-text-center dy-text-xs dy-text-muted-foreground">
              No items in this group.
            </p>
          )}
        </>
      )}
    </div>
  )
}
