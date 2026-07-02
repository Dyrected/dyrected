import { useState, useEffect } from "react"
import { useFieldArray, useWatch, useController } from "react-hook-form"
import type { Control, FieldValues } from "react-hook-form"
import { FormFieldRenderer } from "../form-field-renderer"
import { cn } from "../../../lib/utils"
import { buildDefaultValues } from "../utils"
import type { FieldSchema, BlockSchema } from "../form-engine"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { X, GripVertical, Layers, Plus, Copy, Search, ChevronRight, ChevronDown } from "lucide-react"
import { resolveAdminIcon } from "../../../lib/admin-icons"
import { useNestedEditor, isActiveOrChild } from "../nested-editor-context"
import type { PathSegment } from "../nested-editor-context"
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

/**
 * Variant switcher — a compact pill row shown at the top of a block's editor
 * when the block defines `variants`. Changing the variant writes the reserved
 * `variant` key on the block row; the author's field content is preserved, and
 * the live preview updates immediately.
 */
function VariantSwitcher({
  control,
  name,
  variants,
}: {
  control: Control<FieldValues>
  name: string
  variants: NonNullable<BlockSchema["variants"]>
}) {
  const { field } = useController({ control, name })
  const current = (field.value as string) || variants[0]?.slug

  return (
    <div className="dy-space-y-2 dy-pb-2">
      <div className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground/60">
        Variant
      </div>
      <div className="dy-flex dy-flex-wrap dy-gap-1.5">
        {variants.map((v) => {
          const isActive = current === v.slug
          const Icon = v.icon ? resolveAdminIcon(v.icon, Layers) : null
          return (
            <button
              key={v.slug}
              type="button"
              onClick={() => field.onChange(v.slug)}
              title={v.description || v.label || v.slug}
              aria-pressed={isActive}
              className={cn(
                "dy-flex dy-items-center dy-gap-1.5 dy-rounded-lg dy-border dy-px-2.5 dy-py-1.5 dy-text-xs dy-font-medium dy-transition-all",
                isActive
                  ? "dy-border-primary dy-bg-primary/10 dy-text-primary"
                  : "dy-border-border/60 dy-text-muted-foreground hover:dy-border-border hover:dy-text-foreground"
              )}
            >
              {Icon && <Icon className="dy-h-3.5 dy-w-3.5" />}
              {v.label || v.slug}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SortableBlockItem({
  id,
  index,
  item,
  schema,
  basePath,
  control,
  remove,
  onDuplicate,
  onDrillInto,
  inline = false,
  active = false,
  collection,
  documentId,
}: {
  id: string;
  index: number;
  item: Record<string, unknown>;
  schema: FieldSchema;
  basePath: string;
  control: Control<FieldValues>;
  remove: (index: number) => void;
  onDuplicate: () => void;
  onDrillInto: (segment: PathSegment) => void;
  /** When true, render the block's fields inline (flat form) instead of drilling in. */
  inline?: boolean;
  /** Highlighted state — the block is currently selected/active in the preview. */
  active?: boolean;
  collection: string;
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
  const [expanded, setExpanded] = useState(true)

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
  const BlockIcon = resolveAdminIcon(blockConfig.icon, Layers)
  const activeVariant = blockConfig.variants?.find(
    (v) => v.slug === (itemValues as Record<string, unknown>)?.variant
  ) ?? blockConfig.variants?.[0]
  // Prefer the active variant label as the card subtitle (most relevant when a
  // block has variants), then the block description, then derived preview text.
  const subtitle = activeVariant
    ? `${activeVariant.label || activeVariant.slug}${previewText ? " · " + previewText : ""}`
    : blockConfig.description || previewText

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "dy-group dy-bg-card dy-border dy-rounded-xl dy-overflow-hidden dy-transition-all",
        active
          ? "dy-border-primary dy-ring-1 dy-ring-primary/40 dy-shadow-sm"
          : "dy-border-border/50 hover:dy-border-border hover:dy-shadow-sm",
        isDragging && "dy-shadow-xl dy-ring-2 dy-ring-primary/40 dy-border-primary/50"
      )}
    >
      {/* Card row — inline mode toggles the fields; drill-in mode opens the sub-form */}
      <div
        className="dy-flex dy-items-center dy-gap-3 dy-px-3 dy-py-3 dy-cursor-pointer dy-select-none"
        onClick={() => {
          if (inline) {
            setExpanded((v) => !v)
            return
          }
          const itemPath = `${basePath}.${index}`
          const blockConfig = schema.blocks?.find(b => b.slug === item.blockType)
          onDrillInto({
            fieldName: basePath.split('.').pop() ?? basePath,
            basePath: itemPath,
            stableId: id,
            breadcrumbLabel: blockConfig?.labels?.singular || String(item.blockType || 'Block'),
          })
        }}
      >
        <div
          {...attributes}
          {...listeners}
          className="dy-cursor-grab active:dy-cursor-grabbing dy-text-muted-foreground/40 hover:dy-text-muted-foreground dy-shrink-0 dy-transition-colors"
          onClick={(e) => e.stopPropagation()}
          title="Drag to reorder"
        >
          <GripVertical className="dy-h-4 dy-w-4" />
        </div>

        <div className={cn(
          "dy-flex dy-h-9 dy-w-9 dy-items-center dy-justify-center dy-rounded-lg dy-shrink-0 dy-transition-colors",
          active ? "dy-bg-primary/10 dy-text-primary" : "dy-bg-muted dy-text-muted-foreground group-hover:dy-text-foreground"
        )}>
          <BlockIcon className="dy-h-4 dy-w-4" />
        </div>

        <div className="dy-min-w-0 dy-flex-1">
          <div className={cn(
            "dy-text-sm dy-font-semibold dy-truncate",
            active ? "dy-text-primary" : "dy-text-foreground"
          )}>
            {blockConfig?.labels?.singular || blockConfig?.slug}
          </div>
          {subtitle && (
            <div className="dy-text-xs dy-text-muted-foreground dy-truncate">
              {subtitle.length > 60 ? subtitle.slice(0, 60) + "…" : subtitle}
            </div>
          )}
        </div>

        <div className="dy-flex dy-items-center dy-gap-0.5 dy-shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="dy-h-7 dy-w-7 dy-text-muted-foreground/50 hover:dy-text-primary hover:dy-bg-primary/10 dy-opacity-0 group-hover:dy-opacity-100 focus-visible:dy-opacity-100 dy-transition-opacity"
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            title="Duplicate block"
          >
            <Copy className="dy-w-3.5 dy-h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="dy-h-7 dy-w-7 dy-text-muted-foreground/50 hover:dy-text-destructive hover:dy-bg-destructive/10 dy-opacity-0 group-hover:dy-opacity-100 focus-visible:dy-opacity-100 dy-transition-opacity"
            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
            title="Delete block"
          >
            <X className="dy-w-3.5 dy-h-3.5" />
          </Button>
          {inline ? (
            <ChevronDown className={cn("dy-w-4 dy-h-4 dy-text-muted-foreground/40 dy-transition-transform", expanded && "dy-rotate-180")} />
          ) : (
            <ChevronRight className="dy-w-4 dy-h-4 dy-text-muted-foreground/40" />
          )}
        </div>
      </div>

      {/* Inline fields (flat-form mode, when drill-in is disabled) */}
      {inline && expanded && (
        <div className="dy-space-y-6 dy-px-4 dy-py-4 dy-border-t dy-border-border/40">
          {blockConfig.variants && blockConfig.variants.length > 0 && (
            <VariantSwitcher
              control={control}
              name={`${basePath}.${index}.variant`}
              variants={blockConfig.variants}
            />
          )}
          {blockConfig.fields.map((subField) => (
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
  const { drillInEnabled, activePath, drillInto, reconcileAfterMutation, registerFieldArray, unregisterFieldArray } = useNestedEditor()

  // Check if this builder has a drilled-in item
  const drivenPath = activePath.find(s => isActiveOrChild([s], basePath) || s.basePath.startsWith(basePath + '.'))
  const focusedSegment = activePath.find(s => s.basePath.startsWith(basePath + '.') && s.stableId)
  const focusedStableId = focusedSegment?.stableId
  let focusedIndex = focusedStableId ? fields.findIndex(f => f.id === focusedStableId) : -1
  // On deep-link/refresh the trail comes from the URL, where the stored
  // stableId no longer matches the freshly-generated useFieldArray ids. Fall
  // back to the item index encoded in the segment's basePath ("<base>.<index>").
  if (focusedIndex === -1 && focusedSegment) {
    const rest = focusedSegment.basePath.slice(basePath.length + 1)
    const parsed = Number.parseInt(rest.split('.')[0], 10)
    if (Number.isInteger(parsed) && parsed >= 0 && parsed < fields.length) {
      focusedIndex = parsed
    }
  }
  const isDrilledIntoThisBuilder = focusedIndex !== -1

  // Publish live ids so top-level nav (error/preview click) can resolve
  // stable ids by (basePath, index), and reconcile the active path after
  // every mutation.
  useEffect(() => {
    const ids = fields.map(f => f.id)
    registerFieldArray(basePath, ids)
    reconcileAfterMutation(basePath, ids)
  }, [fields, basePath, reconcileAfterMutation, registerFieldArray])

  useEffect(() => {
    return () => unregisterFieldArray(basePath)
  }, [basePath, unregisterFieldArray])

  const duplicate = (index: number) => {
    const blockToCopy = watchedBlocks[index]
    if (!blockToCopy) return
    const copy = JSON.parse(JSON.stringify(blockToCopy))
    delete copy.id
    insert(index + 1, copy)
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
    const defaultVariant = block.variants?.[0]?.slug
    append({
      blockType: block.slug,
      ...(defaultVariant ? { variant: defaultVariant } : {}),
      ...defaultVals
    })
    setIsModalOpen(false)
  }

  // When drilled into a specific block, render only that block's sub-form
  if (drillInEnabled && isDrilledIntoThisBuilder && focusedSegment) {
    const blockItem = watchedBlocks[focusedIndex] as Record<string, unknown> | undefined
    const blockConfig = schema.blocks?.find(b => b.slug === blockItem?.blockType)
    if (!blockConfig) return null
    return (
      <div className="dy-space-y-6 dy-py-2">
        {blockConfig.variants && blockConfig.variants.length > 0 && (
          <VariantSwitcher
            control={control}
            name={`${focusedSegment.basePath}.variant`}
            variants={blockConfig.variants}
          />
        )}
        {blockConfig.fields.map(subField => (
          <FormFieldRenderer
            key={subField.name}
            schema={subField}
            basePath={focusedSegment.basePath}
            control={control}
            collection={collection}
            documentId={documentId}
          />
        ))}
      </div>
    )
  }

  // Prevent mutations while drilled into a descendant of this builder
  const isChildDrilled = drivenPath !== undefined && !isDrilledIntoThisBuilder

  return (
    <div className="dy-space-y-4">
      <div className="dy-flex dy-justify-between dy-items-center dy-pb-2">
        <div>
          <h4 className="dy-font-bold dy-text-sm dy-text-foreground dy-tracking-tight">{schema.label}</h4>
          {schema.admin?.description && (
            <p className="dy-text-[11px] dy-text-muted-foreground/60 dy-italic">{schema.admin.description}</p>
          )}
        </div>

        {!isChildDrilled && (
          <div className="dy-flex dy-items-center dy-gap-2">
            {schema.blocks && schema.blocks.length > 0 && (
              <Dialog open={isModalOpen} onOpenChange={(open) => {
                setIsModalOpen(open)
                if (!open) setSearchQuery("")
              }}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="dy-h-7 dy-text-[11px] dy-rounded-md dy-border-primary/20 hover:dy-bg-primary/5 hover:dy-text-primary">
                    Add Block
                    <Plus className="dy-w-3 dy-h-3 dy-ml-1.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="dy-max-w-md md:dy-max-w-4xl dy-p-6 dy-rounded-xl dy-border-border/40 dy-shadow-2xl !dy-flex dy-flex-col dy-max-h-[85vh] dy-overflow-hidden">
                  <DialogHeader className="dy-pb-2 dy-flex-shrink-0">
                    <DialogTitle className="dy-text-lg dy-font-bold dy-text-foreground">Block Library</DialogTitle>
                    <DialogDescription className="dy-text-xs dy-text-muted-foreground">
                      Select a block template to insert into your page layout.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="dy-relative dy-my-3 dy-flex-shrink-0">
                    <Search className="dy-absolute dy-left-3 dy-top-1/2 dy--translate-y-1/2 dy-h-4 dy-w-4 dy-text-muted-foreground/60" />
                    <Input
                      placeholder="Search blocks by name..."
                      className="dy-pl-10 dy-h-9 dy-bg-card dy-border-border/60 dy-rounded-lg dy-shadow-sm focus-visible:dy-ring-primary/20"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="dy-flex-1 dy-overflow-y-auto dy-pr-1 dy-pt-2">
                    <div className="dy-grid dy-grid-cols-1 sm:dy-grid-cols-2 md:dy-grid-cols-3 dy-gap-4">
                      {filteredBlocks.length === 0 ? (
                        <div className="dy-col-span-full dy-text-center dy-py-8 dy-text-xs dy-text-muted-foreground/50">
                          No blocks match your search query.
                        </div>
                      ) : (
                        filteredBlocks.map((block) => {
                          const LibIcon = resolveAdminIcon(block.icon, Layers)
                          return (
                            <div
                              key={block.slug}
                              onClick={() => handleAddBlock(block)}
                              className="dy-group dy-border dy-border-muted/30 dy-rounded-xl dy-p-4 dy-flex dy-items-start dy-gap-3 hover:dy-border-primary/40 hover:dy-bg-primary/[0.02] dy-transition-all dy-cursor-pointer dy-select-none"
                            >
                              <div className="dy-p-2.5 dy-bg-muted/50 dy-rounded-lg dy-text-muted-foreground/60 group-hover:dy-text-primary group-hover:dy-bg-primary/10 dy-transition-colors">
                                <LibIcon className="dy-w-4 dy-h-4" />
                              </div>
                              <div className="dy-min-w-0 dy-flex-1">
                                <h5 className="dy-font-semibold dy-text-sm dy-text-foreground dy-tracking-tight group-hover:dy-text-primary dy-transition-colors">
                                  {block.labels?.singular || block.slug}
                                </h5>
                                <p className="dy-text-[11px] dy-text-muted-foreground/60 dy-mt-0.5 dy-line-clamp-2">
                                  {block.description || (block.labels?.plural ? `Create and manage ${block.labels.plural.toLowerCase()}` : "Custom layout block for this page.")}
                                </p>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
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
                {fields.map((item, index) => {
                  const itemPath = `${basePath}.${index}`
                  const isItemActive = activePath.some(
                    (s) => s.basePath === itemPath || s.basePath.startsWith(itemPath + ".")
                  )
                  return (
                    <SortableBlockItem
                      key={item.id}
                      id={item.id}
                      index={index}
                      item={item}
                      schema={schema}
                      basePath={basePath}
                      control={control}
                      remove={remove}
                      onDuplicate={() => duplicate(index)}
                      onDrillInto={drillInto}
                      inline={!drillInEnabled}
                      active={isItemActive}
                      collection={collection}
                      documentId={documentId}
                    />
                  )
                })}
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
