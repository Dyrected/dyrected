import { useState, useEffect, useRef } from "react"
import { useFieldArray, useWatch } from "react-hook-form"
import { FormFieldRenderer } from "../form-field-renderer"
import { buildDefaultValues } from "../utils"
import type { FieldSchema, BlockSchema } from "../form-engine"
import { Button } from "../../ui/button"
import { X, GripVertical, ChevronDown, ChevronUp, Layers, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  control: any
  collection: string
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
  onToggleExpand
}: {
  id: string;
  index: number;
  item: any;
  schema: FieldSchema;
  basePath: string;
  control: any;
  collection: string;
  remove: (index: number) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  }

  const blockConfig = schema.blocks?.find(b => b.slug === item.blockType)

  const itemValues = useWatch({
    control,
    name: `${basePath}.${index}` as any
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

    // Fallback: build a list of key-value pairs of non-empty fields
    const summaries: string[] = []
    blockConfig.fields.forEach(field => {
      const val = itemValues[field.name]
      if (val !== undefined && val !== null && val !== "") {
        if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
          summaries.push(`${field.label || field.name}: ${val}`)
        }
      }
    })

    if (summaries.length > 0) {
      return summaries.slice(0, 3).join(", ")
    }

    return ""
  }

  const previewText = getPreviewText()

  return (
    <div ref={setNodeRef} style={style} className="dy-relative dy-group dy-left-accent dy-mb-4 dy-py-4 dy-animate-in">
      {/* Header / Drag Handle */}
      <div 
        onClick={onToggleExpand}
        className="dy-flex dy-items-center dy-justify-between dy-pb-3 dy-cursor-pointer dy-select-none"
      >
        <div className="dy-flex dy-items-center dy-gap-2 dy-min-w-0 dy-flex-1">
          <div 
            {...attributes} 
            {...listeners} 
            onClick={(e) => e.stopPropagation()} 
            className="dy-cursor-grab dy-opacity-30 hover:dy-opacity-100 hover:dy-bg-muted dy-p-1 dy-rounded-md dy-transition-all"
          >
            <GripVertical className="dy-w-3.5 dy-h-3.5 dy-text-muted-foreground" />
          </div>
          <span className="dy-font-semibold dy-text-[13px] dy-text-foreground/80 dy-tracking-tight dy-truncate">
            {blockConfig.labels?.singular || blockConfig.slug}
          </span>
          <span className="dy-text-[10px] dy-text-muted-foreground/40 dy-uppercase dy-tracking-widest dy-font-semibold dy-flex-shrink-0">
            Item {index + 1}
          </span>
          {!isExpanded && previewText && (
            <>
              <span className="dy-text-muted-foreground/30 dy-text-xs dy-font-light dy-flex-shrink-0">·</span>
              <span className="dy-text-[11px] dy-font-medium dy-text-muted-foreground/60 dy-truncate max-w-[200px] sm:max-w-[320px] dy-italic">
                {previewText}
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
            className="dy-h-7 dy-w-7 dy-text-muted-foreground/30 hover:dy-text-destructive hover:dy-bg-destructive/10" 
            onClick={(e) => { e.stopPropagation(); remove(index); }}
          >
            <X className="dy-w-3.5 dy-h-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="dy-space-y-6">
          {blockConfig.fields.map(subField => (
            <FormFieldRenderer
              key={subField.name}
              schema={subField}
              basePath={`${basePath}.${index}`}
              control={control}
              collection={collection}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function BlockBuilder({ schema, basePath, control, collection }: BlockBuilderProps) {
  const { fields, append, remove, move } = useFieldArray({ control, name: basePath })

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

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
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
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
                <div className="dy-grid dy-grid-cols-1 sm:dy-grid-cols-2 dy-gap-4 dy-max-h-[60vh] dy-overflow-y-auto dy-pr-1 dy-pt-2">
                  {schema.blocks.map((block) => (
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
                  ))}
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
              <div className="dy-pt-2">
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
