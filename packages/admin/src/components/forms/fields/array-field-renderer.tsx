import * as React from "react"
import { useFieldArray, useWatch } from "react-hook-form"
import type { Control, FieldValues } from "react-hook-form"
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  GripVertical,
  Layers,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent } from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { FieldSchema } from "../form-engine"
import { buildDefaultValues } from "../utils"
import { useDyrected } from "../../../providers/dyrected-context"
import { cn } from "../../../lib/utils"
import { Button } from "../../ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu"
import { MediaLibraryDialog } from "../../media/media-library-dialog"
import { useNestedEditor } from "../nested-editor-context"

interface ArrayFieldRendererProps {
  schema: FieldSchema
  basePath: string
  control: Control<FieldValues>
  renderField: (field: FieldSchema, basePath: string) => React.ReactNode
}

function FieldColumn({
  field,
  children,
}: {
  field: FieldSchema
  children: React.ReactNode
}) {
  return (
    <div
      className="dy-min-w-0 dy-px-3"
      style={{ width: field.admin?.width || "100%" }}
    >
      {children}
    </div>
  )
}

function ArrayItemHeader({
  basePath,
  index,
  control,
  schema,
  onClick,
}: {
  basePath: string
  index: number
  control: Control<FieldValues>
  schema: FieldSchema
  onClick: () => void
}) {
  const itemValues = useWatch({
    control,
    name: `${basePath}.${index}` as never,
  }) || {}

  const getPreviewText = () => {
    if (typeof itemValues === "string") return itemValues
    if (itemValues && typeof itemValues === "object") {
      const candidates = ["title", "label", "name", "heading", "filename", "header", "slug", "text"]
      for (const key of candidates) {
        if (itemValues[key] && typeof itemValues[key] === "string" && itemValues[key].trim()) {
          return itemValues[key].trim()
        }
      }
      for (const key of Object.keys(itemValues)) {
        if (Array.isArray(itemValues[key]) && itemValues[key].length > 0) {
          return `${itemValues[key].length} ${key}`
        }
      }
    }
    return ""
  }

  const previewText = getPreviewText()
  const label = schema.label || schema.name.charAt(0).toUpperCase() + schema.name.slice(1)

  return (
    <div onClick={onClick} className="dy-flex dy-min-w-0 dy-flex-1 dy-items-center dy-gap-2">
      <div className="dy-inline-flex dy-flex-shrink-0 dy-items-center dy-gap-1.5 dy-rounded-lg dy-border dy-border-muted/20 dy-bg-background/60 dy-px-2 dy-py-1">
        <span className="dy-hidden dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground sm:dy-inline">
          {label}
        </span>
        <span className="dy-text-[10px] dy-font-bold dy-text-primary">
          #{index + 1}
        </span>
      </div>
      {previewText && (
        <>
          <span className="dy-text-muted-foreground/30 dy-text-xs dy-font-light dy-flex-shrink-0">·</span>
          <span className="dy-min-w-0 dy-truncate dy-text-xs dy-font-semibold dy-text-foreground/70 sm:dy-max-w-[360px]">
            {previewText}
          </span>
        </>
      )}
    </div>
  )
}

function SortableArrayItem({
  id,
  index,
  schema,
  basePath,
  control,
  remove,
  move,
  onDuplicate,
  totalCount,
  isExpanded,
  onToggleExpand,
  onDrillInto,
  renderField,
}: {
  id: string
  index: number
  schema: FieldSchema
  basePath: string
  control: Control<FieldValues>
  remove: (index: number) => void
  move: (from: number, to: number) => void
  onDuplicate: (index: number) => void
  totalCount: number
  isExpanded: boolean
  onToggleExpand: () => void
  onDrillInto?: (id: string, index: number) => void
  renderField: (field: FieldSchema, basePath: string) => React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)

  const transformString = CSS.Transform.toString(transform)
  const style = {
    transform: isDragging ? `${transformString} scale(1.02)` : transformString,
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.9 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "dy-relative dy-group dy-overflow-hidden dy-rounded-2xl dy-border dy-border-border/50 dy-bg-background/70 dy-shadow-sm dy-transition-all",
        isExpanded && "dy-border-primary/20 dy-bg-card",
        isDragging ? "dy-shadow-xl dy-ring-2 dy-ring-primary/40 dy-bg-muted/20 dy-border-primary/50" : "hover:dy-border-border hover:dy-shadow-md",
      )}
    >
      <div
        className={cn(
          "dy-flex dy-items-center dy-justify-between dy-gap-3 dy-bg-muted/20 dy-px-3 dy-py-3 dy-transition-colors sm:dy-px-4",
          isExpanded && "dy-border-b dy-border-border/30 dy-bg-muted/30",
        )}
        onClick={onToggleExpand}
      >
        <div className="dy-flex dy-min-w-0 dy-flex-1 dy-items-center dy-gap-2">
          <div
            {...attributes}
            {...listeners}
            className="dy-flex dy-h-9 dy-w-9 dy-flex-shrink-0 dy-cursor-grab dy-items-center dy-justify-center dy-rounded-lg dy-text-muted-foreground/60 dy-transition-all hover:dy-bg-muted hover:dy-text-foreground sm:dy-h-8 sm:dy-w-8"
            onClick={(event) => event.stopPropagation()}
            title="Drag to reorder"
          >
            <GripVertical className="dy-w-4 dy-h-4" />
          </div>

          <ArrayItemHeader onClick={onDrillInto ? () => onDrillInto(id, index) : onToggleExpand} basePath={basePath} index={index} control={control} schema={schema} />
        </div>

        <div className="dy-flex dy-flex-shrink-0 dy-items-center dy-gap-1">
          {onDrillInto ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="dy-h-10 dy-w-10 dy-rounded-lg dy-text-muted-foreground/30 hover:dy-text-destructive hover:dy-bg-destructive/10 sm:dy-h-8 sm:dy-w-8"
                onClick={(event) => { event.stopPropagation(); setShowDeleteConfirm(true) }}
                title="Delete item"
              >
                <Trash2 className="dy-w-4 dy-h-4" />
              </Button>
              <ChevronRight className="dy-w-4 dy-h-4 dy-text-muted-foreground/40" />
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="dy-h-10 dy-w-10 dy-rounded-lg dy-text-muted-foreground hover:dy-bg-muted hover:dy-text-foreground sm:dy-h-8 sm:dy-w-8"
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleExpand()
                }}
                title={isExpanded ? "Collapse item" : "Expand item"}
              >
                {isExpanded ? <ChevronUp className="dy-w-4 dy-h-4" /> : <ChevronDown className="dy-w-4 dy-h-4" />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="dy-h-10 dy-w-10 dy-rounded-lg dy-text-muted-foreground hover:dy-bg-muted hover:dy-text-foreground sm:dy-h-8 sm:dy-w-8"
                    onClick={(event) => event.stopPropagation()}
                    title="Item actions"
                  >
                    <MoreHorizontal className="dy-w-4 dy-h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dy-min-w-44">
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.stopPropagation()
                      onDuplicate(index)
                    }}
                  >
                    <Copy className="dy-mr-2 dy-h-4 dy-w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={index === 0}
                    onClick={(event) => {
                      event.stopPropagation()
                      move(index, index - 1)
                    }}
                  >
                    <ArrowUp className="dy-mr-2 dy-h-4 dy-w-4" />
                    Move up
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={index === totalCount - 1}
                    onClick={(event) => {
                      event.stopPropagation()
                      move(index, index + 1)
                    }}
                  >
                    <ArrowDown className="dy-mr-2 dy-h-4 dy-w-4" />
                    Move down
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="dy-text-destructive focus:dy-text-destructive"
                    onClick={(event) => {
                      event.stopPropagation()
                      setShowDeleteConfirm(true)
                    }}
                  >
                    <Trash2 className="dy-mr-2 dy-h-4 dy-w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="dy-flex dy-flex-wrap dy-gap-y-5 dy-p-3 sm:dy-p-4">
          {schema.fields?.map((subField) => (
            <FieldColumn key={subField.name} field={subField}>
              {renderField(subField, `${basePath}.${index}`)}
            </FieldColumn>
          ))}
        </div>
      )}

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:dy-max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone and you will lose any unsaved content in this block.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="dy-flex dy-justify-end dy-gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => { remove(index); setShowDeleteConfirm(false); }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SimpleArrayItem({
  id,
  index,
  field,
  basePath,
  remove,
  move,
  onDuplicate,
  totalCount,
  renderField,
}: {
  id: string
  index: number
  field: FieldSchema
  basePath: string
  remove: (index: number) => void
  move: (from: number, to: number) => void
  onDuplicate: (index: number) => void
  totalCount: number
  renderField: (field: FieldSchema, basePath: string) => React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)

  // The array header already labels the collection, so suppress the per-item
  // field label to avoid repeating it on every row.
  const unlabeledField = React.useMemo(
    () => ({ ...field, admin: { ...field.admin, hideLabel: true } }) as FieldSchema,
    [field],
  )

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.9 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "dy-group dy-flex dy-items-center dy-gap-1.5 dy-rounded-lg dy-px-1 dy-py-1 dy-transition-colors",
        isDragging ? "dy-bg-muted/40 dy-shadow-lg dy-ring-1 dy-ring-primary/30" : "hover:dy-bg-muted/30",
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="dy-flex dy-h-9 dy-w-7 dy-flex-shrink-0 dy-cursor-grab dy-items-center dy-justify-center dy-rounded-lg dy-text-muted-foreground/40 dy-transition-all hover:dy-text-foreground sm:dy-h-8"
        title="Drag to reorder"
      >
        <GripVertical className="dy-w-4 dy-h-4" />
      </div>

      <div className="dy-min-w-0 dy-flex-1">
        {renderField(unlabeledField, `${basePath}.${index}`)}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="dy-h-9 dy-w-9 dy-flex-shrink-0 dy-rounded-lg dy-text-muted-foreground/50 dy-opacity-0 dy-transition-opacity group-hover:dy-opacity-100 focus:dy-opacity-100 data-[state=open]:dy-opacity-100 hover:dy-bg-muted hover:dy-text-foreground sm:dy-h-8 sm:dy-w-8"
            title="Item actions"
          >
            <MoreHorizontal className="dy-w-4 dy-h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="dy-min-w-44">
          <DropdownMenuItem onClick={() => onDuplicate(index)}>
            <Copy className="dy-mr-2 dy-h-4 dy-w-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem disabled={index === 0} onClick={() => move(index, index - 1)}>
            <ArrowUp className="dy-mr-2 dy-h-4 dy-w-4" />
            Move up
          </DropdownMenuItem>
          <DropdownMenuItem disabled={index === totalCount - 1} onClick={() => move(index, index + 1)}>
            <ArrowDown className="dy-mr-2 dy-h-4 dy-w-4" />
            Move down
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="dy-text-destructive focus:dy-text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="dy-mr-2 dy-h-4 dy-w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:dy-max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone and you will lose any unsaved content in this block.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="dy-flex dy-justify-end dy-gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => { remove(index); setShowDeleteConfirm(false); }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function singularize(str: string) {
  if (str.endsWith("ies")) return str.slice(0, -3) + "y"
  if (str.endsWith("s") && !str.endsWith("ss")) return str.slice(0, -1)
  return str
}

export function ArrayFieldRenderer({ schema, basePath, control, renderField }: ArrayFieldRendererProps) {
  const { fields, append, remove, move, insert } = useFieldArray({ control, name: basePath })
  const { schemas } = useDyrected()
  const { drillInEnabled, drillInto, reconcileAfterMutation, activePath, registerFieldArray, unregisterFieldArray } = useNestedEditor()
  const [isBulkOpen, setIsBulkOpen] = React.useState(false)
  const [expandedIds, setExpandedIds] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(fields.map((field) => [field.id, true])),
  )
  const watchedItems = useWatch({ control, name: basePath as never }) || []

  // Drill-in opt-in: only when admin.drillIn === true AND drill-in is enabled
  // (i.e. the edit page's live-preview mode is on). Otherwise render inline.
  const isDrillIn = drillInEnabled && (schema.admin as Record<string, unknown>)?.drillIn === true

  // When each item has a single sub-field, the accordion (header preview,
  // collapse, actions menu) is pure overhead. Render a flat, reorderable list
  // of the field instead. Drill-in never applies to a single-field array.
  const singleField = schema.fields?.length === 1 ? schema.fields[0] : undefined
  const isSimpleList = !!singleField && !isDrillIn

  // If drilled in, find the focused item for this array
  const focusedSegment = isDrillIn
    ? activePath.find(s => s.basePath.startsWith(basePath + '.') && s.stableId)
    : undefined
  const focusedIndex = focusedSegment?.stableId
    ? fields.findIndex(f => f.id === focusedSegment.stableId)
    : -1
  const isDrilledInto = focusedIndex !== -1

  // Publish live ids + reconcile after mutations (only when drill-in is active)
  React.useEffect(() => {
    if (!isDrillIn) return
    const ids = fields.map(f => f.id)
    registerFieldArray(basePath, ids)
    reconcileAfterMutation(basePath, ids)
  }, [fields, basePath, isDrillIn, reconcileAfterMutation, registerFieldArray])

  React.useEffect(() => {
    if (!isDrillIn) return
    return () => unregisterFieldArray(basePath)
  }, [basePath, isDrillIn, unregisterFieldArray])

  const handleDrillInto = isDrillIn ? (id: string, index: number) => {
    const label = schema.label || schema.name.charAt(0).toUpperCase() + schema.name.slice(1)
    drillInto({
      fieldName: basePath.split('.').pop() ?? basePath,
      basePath: `${basePath}.${index}`,
      stableId: id,
      breadcrumbLabel: `${label} #${index + 1}`,
    })
  } : undefined

  const imageField = React.useMemo(() => {
    return schema.fields?.find((field) => {
      if (field.type === "image") return true
      if (field.type === "relationship" && field.relationTo) {
        const relatedSchema = schemas?.collections?.find((collection) => collection.slug === field.relationTo)
        return relatedSchema?.upload === true
      }
      return false
    })
  }, [schema.fields, schemas])

  const bulkCollection = (imageField?.type === "relationship" ? imageField.relationTo : "media") || "media"

  const handleBulkAdd = (ids: string[]) => {
    ids.forEach((id) => {
      const newItem = buildDefaultValues(schema.fields || [], {})
      if (imageField) {
        newItem[imageField.name] = id
      }
      append(newItem)
    })
    setIsBulkOpen(false)
  }

  const addItem = () => {
    append(buildDefaultValues(schema.fields || [], {}))
  }

  const duplicateItem = (index: number) => {
    const itemToCopy = watchedItems[index]
    if (!itemToCopy) return
    const copy = JSON.parse(JSON.stringify(itemToCopy))
    delete copy.id
    insert(index + 1, copy)
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const prevFieldIdsRef = React.useRef<string[]>(fields.map((field) => field.id))
  React.useEffect(() => {
    const previousIds = new Set(prevFieldIdsRef.current)
    const nextIds = fields.map((field) => field.id)
    const newIds = nextIds.filter((id) => !previousIds.has(id))

    setExpandedIds((prev) => {
      let changed = false
      const next = { ...prev }

      newIds.forEach((id) => {
        if (!next[id]) {
          next[id] = true
          changed = true
        }
      })

      nextIds.forEach((id) => {
        if (next[id] === undefined) {
          next[id] = true
          changed = true
        }
      })

      Object.keys(next).forEach((id) => {
        if (!nextIds.includes(id)) {
          delete next[id]
          changed = true
        }
      })

      return changed ? next : prev
    })

    prevFieldIdsRef.current = nextIds
  }, [fields])

  const itemLabel = React.useMemo(() => {
    const base = schema.label || (schema.name ? (schema.name.charAt(0).toUpperCase() + schema.name.slice(1)) : "Item")
    return singularize(base)
  }, [schema.label, schema.name])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((field) => field.id === active.id)
      const newIndex = fields.findIndex((field) => field.id === over.id)
      move(oldIndex, newIndex)
    }
  }

  // When drilled into a specific item, render only that item's sub-form
  if (isDrillIn && isDrilledInto && focusedSegment) {
    return (
      <div className="dy-flex dy-flex-wrap dy-gap-y-5 dy-py-2">
        {schema.fields?.map((subField) => (
          <div
            key={subField.name}
            className="dy-min-w-0 dy-px-3"
            style={{ width: subField.admin?.width || "100%" }}
          >
            {renderField(subField, focusedSegment.basePath)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="dy-space-y-4 dy-transition-all">
      <div className="dy-flex dy-justify-between dy-items-end dy-pb-2">
        <div className="dy-space-y-1">
          <div className="dy-flex dy-items-center dy-gap-2">
            <Layers className="dy-h-4 dy-w-4 dy-text-primary" />
            <h4 className="dy-font-serif dy-font-bold dy-text-base dy-text-foreground dy-tracking-tight">{schema.label || schema.name.charAt(0).toUpperCase() + schema.name.slice(1)}</h4>
          </div>
          {schema.admin?.description && (
            <p className="dy-text-[11px] dy-text-muted-foreground/60 dy-italic dy-leading-relaxed">{schema.admin.description}</p>
          )}
        </div>
        <div className="dy-flex dy-items-center dy-gap-2">
          {imageField && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="dy-h-9 dy-text-[11px] dy-font-bold dy-rounded-lg dy-border-primary/20 hover:dy-bg-primary/5 hover:dy-text-primary dy-transition-all dy-shadow-sm"
              onClick={() => setIsBulkOpen(true)}
            >
              Bulk Add Images
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="dy-h-9 dy-text-[11px] dy-font-bold dy-rounded-lg dy-border-primary/20 hover:dy-bg-primary/5 hover:dy-text-primary dy-transition-all dy-shadow-sm"
            onClick={addItem}
          >
            <Plus className="dy-w-3.5 dy-h-3.5 dy-mr-1.5" />
            Add {itemLabel}
          </Button>
        </div>
      </div>

      <div className="dy-space-y-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
            <div className={cn(fields.length > 0 && (isSimpleList ? "dy-space-y-2" : "dy-space-y-3"))}>
              {fields.map((item, index) =>
                isSimpleList && singleField ? (
                  <SimpleArrayItem
                    key={item.id}
                    id={item.id}
                    index={index}
                    field={singleField}
                    basePath={basePath}
                    remove={remove}
                    move={move}
                    onDuplicate={duplicateItem}
                    totalCount={fields.length}
                    renderField={renderField}
                  />
                ) : (
                  <SortableArrayItem
                    key={item.id}
                    id={item.id}
                    index={index}
                    schema={schema}
                    basePath={basePath}
                    control={control}
                    remove={remove}
                    move={move}
                    onDuplicate={duplicateItem}
                    totalCount={fields.length}
                    isExpanded={!!expandedIds[item.id]}
                    onToggleExpand={() => toggleExpanded(item.id)}
                    onDrillInto={handleDrillInto}
                    renderField={renderField}
                  />
                ),
              )}
            </div>
          </SortableContext>
        </DndContext>

        {fields.length === 0 && (
          <div className="dy-flex dy-flex-col dy-items-center dy-justify-center dy-py-12 dy-border-2 dy-border-dashed dy-border-muted/30 dy-rounded-3xl dy-bg-muted/5 dy-space-y-3">
            <div className="dy-p-3 dy-bg-muted dy-rounded-full">
              <Layers className="dy-h-6 dy-w-6 dy-text-muted-foreground/40" />
            </div>
            <p className="dy-text-xs dy-font-medium dy-text-muted-foreground/50">No items added yet</p>
          </div>
        )}

        {fields.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="dy-w-full dy-h-10 dy-text-xs dy-font-bold dy-rounded-2xl dy-border-dashed dy-border-primary/20 hover:dy-bg-primary/5 hover:dy-text-primary dy-transition-all dy-shadow-sm"
            onClick={addItem}
          >
            <Plus className="dy-w-4 dy-h-4 dy-mr-2" />
            Add {itemLabel}
          </Button>
        )}
      </div>

      {imageField && (
        <MediaLibraryDialog
          collection={bulkCollection}
          isOpen={isBulkOpen}
          onOpenChange={setIsBulkOpen}
          selectedValues={[]}
          multiple={true}
          onSelect={() => { }}
          onConfirm={(ids: string[]) => handleBulkAdd(ids)}
        />
      )}
    </div>
  )
}
