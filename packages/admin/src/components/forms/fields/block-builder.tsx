import { useState } from "react"
import { useFieldArray } from "react-hook-form"
import { FormFieldRenderer } from "../form-field-renderer"
import { buildDefaultValues } from "../utils"
import type { FieldSchema, BlockSchema } from "../form-engine"
import { Button } from "../../ui/button"
import { X, GripVertical, ChevronDown, ChevronUp } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu"
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
  remove
}: {
  id: string;
  index: number;
  item: any;
  schema: FieldSchema;
  basePath: string;
  control: any;
  collection: string;
  remove: (index: number) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const [isExpanded, setIsExpanded] = useState(true)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  }

  const blockConfig = schema.blocks?.find(b => b.slug === item.blockType)

  if (!blockConfig) return null

  return (
    <div ref={setNodeRef} style={style} className="dy-relative dy-group dy-left-accent dy-mb-4 dy-py-4 dy-animate-in">
      {/* Header / Drag Handle */}
      <div className="dy-flex dy-items-center dy-justify-between dy-pb-3">
        <div className="dy-flex dy-items-center dy-justify-between dy-gap-2">
          <div {...attributes} {...listeners} className="dy-cursor-grab dy-opacity-20 dy-group-hover:dy-opacity-100 hover:dy-bg-muted dy-p-1 dy-rounded-md dy-transition-all">
            <GripVertical className="dy-w-3.5 dy-h-3.5 dy-text-muted-foreground" />
          </div>
          <span className="dy-font-bold dy-text-xs dy-text-foreground/70 dy-tracking-tight">
            {blockConfig.labels?.singular || blockConfig.slug}
          </span>
          <span className="dy-text-[10px] dy-text-muted-foreground/40 dy-ml-2 dy-uppercase dy-tracking-widest dy-font-semibold">
            Item {index + 1}
          </span>
        </div>
        <div className="dy-flex dy-items-center dy-gap-1 dy-opacity-0 dy-group-hover:dy-opacity-100 dy-transition-opacity">
          <Button type="button" variant="ghost" size="icon" className="dy-h-7 dy-w-7 dy-text-muted-foreground/40" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronUp className="dy-w-3.5 dy-h-3.5" /> : <ChevronDown className="dy-w-3.5 dy-h-3.5" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="dy-h-7 dy-w-7 dy-text-muted-foreground/30 hover:dy-text-destructive hover:dy-bg-destructive/10" onClick={() => remove(index)}>
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

  const handleAddBlock = (block: BlockSchema) => {
    const defaultVals = buildDefaultValues(block.fields, {})
    append({
      blockType: block.slug,
      ...defaultVals
    })
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

        {schema.blocks && schema.blocks.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="dy-h-7 dy-text-[11px] dy-rounded-md dy-border-primary/20 hover:dy-bg-primary/5 hover:dy-text-primary">
                Add Block
                <ChevronDown className="dy-w-3 dy-h-3 dy-ml-1.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dy-rounded-lg dy-border-border/40 dy-shadow-xl">
              {schema.blocks.map((block) => (
                <DropdownMenuItem key={block.slug} onClick={() => handleAddBlock(block)} className="dy-text-[13px] dy-rounded-md focus:dy-bg-primary/5 focus:dy-text-primary dy-transition-colors">
                  {block.labels?.singular || block.slug}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {fields.length === 0 ? (
        <div className="dy-text-center dy-p-8 dy-border dy-border-dashed dy-border-border/40 dy-rounded-md">
          <p className="dy-text-[11px] dy-text-muted-foreground/50">No blocks added yet.</p>
        </div>
      ) : (
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
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
