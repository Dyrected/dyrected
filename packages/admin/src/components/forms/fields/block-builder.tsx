import { useState, useEffect, useRef } from "react"
import { useFieldArray, useWatch } from "react-hook-form"
import type { Control, FieldValues } from "react-hook-form"
import { FormFieldRenderer } from "../form-field-renderer"
import { cn } from "../../../lib/utils"
import { buildDefaultValues } from "../utils"
import type { FieldSchema, BlockSchema } from "../form-engine"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { X, GripVertical, ChevronDown, ChevronUp, Layers, Plus, Copy, Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../../ui/dialog"
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
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface BlockBuilderProps {
  schema: FieldSchema
  basePath: string
  control: Control<FieldValues>
  collection: string
  documentId?: string
}

function SortableBlockItem({
  id,
  index,
  item,
  schema,
  basePath,
  control,
  collection,
  remove,
  isExpanded,
  onToggleExpand,
  onDuplicate,
  documentId
}: {
  id: string;
  index: number;
  item: Record<string, unknown>;
  schema: FieldSchema;
  basePath: string;
  control: Control<FieldValues>;
  collection: string;
  remove: (index: number) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDuplicate: () => void;
  documentId?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const transformString = CSS.Transform.toString(transform)
  const style = {
    transform: isDragging ? `${transformString} scale(1.02)` : transformString,
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.9 : 1,
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const blockConfig = schema.blocks?.find(b => b.slug === item.blockType)

  const itemValues = useWatch({
    control,
    name: `${basePath}.${index}` as never
  }) || {}

  if (!blockConfig) return null

  const getPreviewText = () => {
    if (!itemValues || typeof itemValues !== "object") return ""

    // Try to find common text fields
    const candidates = ["heading", "title", "label", "name", "filename", "header", "slug", "text"]
    for (const key of candidates) {
      if (itemValues[key] && typeof itemValues[key] === "string" && itemValues[key].trim()) {
        return itemValues[key].trim()
      }
    }

    // Try to find array lengths (e.g. features or items list inside the block)
    for (const key of Object.keys(itemValues)) {
      if (Array.isArray(itemValues[key]) && itemValues[key].length > 0) {
        return `${itemValues[key].length} ${key}`
      }
    }

    return ""
  }

  const previewText = getPreviewText()

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "dy-bg-card dy-border dy-border-border/30 dy-rounded-xl dy-shadow-sm dy-overflow-hidden dy-transition-all",
        isDragging ? "dy-shadow-xl dy-ring-2 dy-ring-primary/40 dy-bg-muted/10 dy-border-primary/50" : "hover:dy-shadow-md"
      )}
    >
      {/* Header */}
      <div
        className="dy-flex dy-items-center dy-justify-between dy-px-4 dy-py-3 dy-bg-muted/30 dy-border-b dy-border-border/10 dy-cursor-pointer select-none"
        onClick={onToggleExpand}
      >
        <div className="dy-flex dy-items-center dy-gap-2.5 dy-min-w-0">
          <div
            {...attributes}
            {...listeners}
            className="dy-cursor-grab dy-opacity-35 hover:dy-opacity-100 hover:dy-bg-muted dy-p-1 dy-rounded-md dy-transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="dy-w-3.5 dy-h-3.5 dy-text-muted-foreground" />
          </div>
          <div className="dy-flex dy-items-center dy-justify-center dy-h-7 dy-w-7 dy-rounded-lg dy-bg-primary/5 dy-border dy-border-primary/10 dy-text-primary dy-flex-shrink-0">
            <Layers className="dy-h-3.5 dy-w-3.5" />
          </div>
          <span className="dy-text-xs dy-font-bold dy-text-foreground dy-tracking-tight dy-flex-shrink-0">
            {blockConfig.labels?.singular || blockConfig.slug}
          </span>
          {!isExpanded && previewText && (
            <>
              <span className="dy-text-muted-foreground/30 dy-text-xs dy-font-light dy-flex-shrink-0">·</span>
              <span className="dy-hidden md:dy-inline-block dy-text-[11px] dy-font-medium dy-text-muted-foreground/60 dy-italic dy-flex-shrink-0">
                {previewText.length > 50 ? previewText.slice(0, 50) + "…" : previewText}
              </span>
            </>
          )}
        </div>
        <div className="dy-flex dy-items-center dy-gap-1 dy-flex-shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="dy-h-7 dy-w-7 dy-text-muted-foreground/50 hover:dy-text-foreground hover:dy-bg-muted"
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
          >
            {isExpanded ? <ChevronUp className="dy-w-3.5 dy-h-3.5" /> : <ChevronDown className="dy-w-3.5 dy-h-3.5" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="dy-h-7 dy-w-7 dy-text-muted-foreground/30 hover:dy-text-primary hover:dy-bg-primary/10"
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            title="Duplicate Block"
          >
            <Copy className="dy-w-3.5 dy-h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="dy-h-7 dy-w-7 dy-text-muted-foreground/30 hover:dy-text-destructive hover:dy-bg-destructive/10"
            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
          >
            <X className="dy-w-3.5 dy-h-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="dy-space-y-6 px-4 py-4">
          {blockConfig.fields.map(subField => (
            <FormFieldRenderer
              key={subField.name}
              schema={subField}
              basePath={`${basePath}.${index}`}
              control={control}
              collection={collection}
              documentId={documentId}
            />
          ))}
        </div>
      )}

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:dy-max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this block? This action cannot be undone and you will lose any content within it.
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

export function BlockBuilder({ schema, basePath, control, collection, documentId }: BlockBuilderProps) {
  const { fields, append, remove, move, insert } = useFieldArray({ control, name: basePath })
  const watchedBlocks = useWatch({ control, name: basePath }) || []

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  const duplicate = (index: number) => {
    const blockToCopy = watchedBlocks[index]
    if (!blockToCopy) return
    const copy = JSON.parse(JSON.stringify(blockToCopy))
    delete copy.id
    insert(index + 1, copy)
  }

  // Auto-expand newly appended blocks
  const prevFieldsRef = useRef(fields)
  useEffect(() => {
    const prevIds = new Set(prevFieldsRef.current.map(f => f.id))
    const newFields = fields.filter(f => !prevIds.has(f.id))
    if (newFields.length > 0) {
      setExpandedIds(prev => {
        const next = { ...prev }
        newFields.forEach(f => {
          next[f.id] = true
        })
        return next
      })
    }
    prevFieldsRef.current = fields
  }, [fields])

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({
      ...prev,
      [id]: !(prev[id] ?? false)
    }))
  }

  const allCollapsed = fields.length > 0 && fields.every(f => !(expandedIds[f.id] ?? false))

  const handleToggleAll = () => {
    if (allCollapsed) {
      // Expand all
      const next: Record<string, boolean> = {}
      fields.forEach(f => {
        next[f.id] = true
      })
      setExpandedIds(next)
    } else {
      // Collapse all
      const next: Record<string, boolean> = {}
      fields.forEach(f => {
        next[f.id] = false
      })
      setExpandedIds(next)
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id)
      const newIndex = fields.findIndex((f) => f.id === over.id)
      move(oldIndex, newIndex)
    }
  }

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredBlocks = schema.blocks?.filter((block) => {
    const search = searchQuery.toLowerCase()
    const name = (block.labels?.singular || block.slug).toLowerCase()
    const desc = (block.labels?.plural || "").toLowerCase()
    return name.includes(search) || desc.includes(search)
  }) || []

  const handleAddBlock = (block: BlockSchema) => {
    const defaultVals = buildDefaultValues(block.fields, {})
    append({
      blockType: block.slug,
      ...defaultVals
    })
    setIsModalOpen(false)
  }

  return (
    <div className="dy-space-y-4">
      <div className="dy-flex dy-justify-between dy-items-center dy-pb-2">
        <div>
          <h4 className="dy-font-bold dy-text-sm dy-text-foreground dy-tracking-tight">{schema.label}</h4>
          {schema.admin?.description && (
            <p className="dy-text-[11px] dy-text-muted-foreground/60 dy-italic">{schema.admin.description}</p>
          )}
        </div>

        <div className="dy-flex dy-items-center dy-gap-2">
          {fields.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="dy-h-7 dy-text-[11px] dy-text-muted-foreground hover:dy-text-foreground hover:dy-bg-muted dy-rounded-md dy-px-2"
              onClick={handleToggleAll}
            >
              {allCollapsed ? "Expand All" : "Collapse All"}
            </Button>
          )}

          {schema.blocks && schema.blocks.length > 0 && (
            <Dialog open={isModalOpen} onOpenChange={(open) => {
              setIsModalOpen(open)
              if (!open) setSearchQuery("")
            }}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="dy-h-7 dy-text-[11px] dy-rounded-md dy-border-primary/20 hover:dy-bg-primary/5 hover:dy-text-primary">
                  Add Block
                  <ChevronDown className="dy-w-3 dy-h-3 dy-ml-1.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="dy-max-w-2xl dy-p-6 dy-rounded-xl dy-border-border/40 dy-shadow-2xl">
                <DialogHeader className="dy-pb-2">
                  <DialogTitle className="dy-text-lg dy-font-bold dy-text-foreground">Block Library</DialogTitle>
                  <DialogDescription className="dy-text-xs dy-text-muted-foreground">
                    Select a block template to insert into your page layout.
                  </DialogDescription>
                </DialogHeader>

                <div className="dy-relative dy-my-3">
                  <Search className="dy-absolute dy-left-3 dy-top-1/2 dy--translate-y-1/2 dy-h-4 dy-w-4 dy-text-muted-foreground/60" />
                  <Input
                    placeholder="Search blocks by name..."
                    className="dy-pl-10 dy-h-9 dy-bg-card dy-border-border/60 dy-rounded-lg dy-shadow-sm focus-visible:dy-ring-primary/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="dy-grid dy-grid-cols-1 sm:dy-grid-cols-2 dy-gap-4 dy-pr-1 dy-pt-2">
                  {filteredBlocks.length === 0 ? (
                    <div className="dy-col-span-full dy-text-center dy-py-8 dy-text-xs dy-text-muted-foreground/50">
                      No blocks match your search query.
                    </div>
                  ) : (
                    filteredBlocks.map((block) => (
                      <div
                        key={block.slug}
                        onClick={() => handleAddBlock(block)}
                        className="dy-group dy-border dy-border-muted/30 dy-rounded-xl dy-p-4 dy-flex dy-items-start dy-gap-3 hover:dy-border-primary/40 hover:dy-bg-primary/[0.02] dy-transition-all dy-cursor-pointer dy-select-none"
                      >
                        <div className="dy-p-2.5 dy-bg-muted/50 dy-rounded-lg dy-text-muted-foreground/60 group-hover:dy-text-primary group-hover:dy-bg-primary/10 dy-transition-colors">
                          <Layers className="dy-w-4 dy-h-4" />
                        </div>
                        <div className="dy-min-w-0 dy-flex-1">
                          <h5 className="dy-font-semibold dy-text-sm dy-text-foreground dy-tracking-tight group-hover:dy-text-primary dy-transition-colors">
                            {block.labels?.singular || block.slug}
                          </h5>
                          <p className="dy-text-[11px] dy-text-muted-foreground/60 dy-mt-0.5 dy-line-clamp-2">
                            {block.labels?.plural ? `Create and manage ${block.labels.plural.toLowerCase()}` : "Custom layout block for this page."}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="dy-text-center dy-p-8 dy-border dy-border-dashed dy-border-border/40 dy-rounded-xl dy-bg-muted/10 dy-flex dy-flex-col dy-items-center dy-gap-3">
          <p className="dy-text-[11px] dy-text-muted-foreground/50">No blocks added yet.</p>
          {schema.blocks && schema.blocks.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="dy-text-[11px] dy-rounded-md dy-border-primary/20 hover:dy-bg-primary/5 hover:dy-text-primary"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="dy-w-3 dy-h-3 dy-mr-1.5" />
              Add First Block
            </Button>
          )}
        </div>
      ) : (
        <div className="dy-space-y-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={fields.map(f => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="dy-pt-2 dy-space-y-4">
                {fields.map((item, index) => (
                  <SortableBlockItem
                    key={item.id}
                    id={item.id}
                    index={index}
                    item={item}
                    schema={schema}
                    basePath={basePath}
                    control={control}
                    collection={collection}
                    remove={remove}
                    isExpanded={expandedIds[item.id] ?? false}
                    onToggleExpand={() => toggleExpand(item.id)}
                    onDuplicate={() => duplicate(index)}
                    documentId={documentId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {schema.blocks && schema.blocks.length > 0 && (
            <div className="dy-flex dy-justify-center dy-pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="dy-w-full sm:dy-w-auto dy-text-[11px] dy-rounded-md dy-border-dashed dy-border-primary/20 hover:dy-bg-primary/5 hover:dy-text-primary dy-py-4 dy-px-6"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="dy-w-3 dy-h-3 dy-mr-1.5" />
                Add Block
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
