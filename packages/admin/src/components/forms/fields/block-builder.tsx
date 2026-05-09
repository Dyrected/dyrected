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
    <div ref={setNodeRef} style={style} className="relative group left-accent mb-4 animate-in">
      {/* Header / Drag Handle */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center justify-between gap-2">
          <div {...attributes} {...listeners} className="cursor-grab opacity-20 group-hover:opacity-100 hover:bg-muted p-1 rounded-md transition-all">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <span className="font-bold text-xs text-foreground/70 tracking-tight">
            {blockConfig.labels?.singular || blockConfig.slug}
          </span>
          <span className="text-[10px] text-muted-foreground/40 ml-2 uppercase tracking-widest font-semibold">
            Item {index + 1}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10" onClick={() => remove(index)}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="space-y-6">
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
    <div className="space-y-4">
      <div className="flex justify-between items-center pb-2">
        <div>
          <h4 className="font-bold text-sm text-foreground tracking-tight">{schema.label}</h4>
          {schema.admin?.description && (
            <p className="text-[11px] text-muted-foreground/60 italic">{schema.admin.description}</p>
          )}
        </div>

        {schema.blocks && schema.blocks.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] rounded-md border-primary/20 hover:bg-primary/5 hover:text-primary">
                Add Block
                <ChevronDown className="w-3 h-3 ml-1.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-lg border-border/40 shadow-xl">
              {schema.blocks.map((block) => (
                <DropdownMenuItem key={block.slug} onClick={() => handleAddBlock(block)} className="text-[13px] rounded-md focus:bg-primary/5 focus:text-primary transition-colors">
                  {block.labels?.singular || block.slug}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {fields.length === 0 ? (
        <div className="text-center p-8 border border-dashed border-border/40 rounded-md">
          <p className="text-[11px] text-muted-foreground/50">No blocks added yet.</p>
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
            <div className="pt-2">
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
