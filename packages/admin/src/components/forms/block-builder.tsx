import { useState } from "react"
import { useFieldArray } from "react-hook-form"
import { FormFieldRenderer, buildDefaultValues } from "./form-engine"
import type { FieldSchema, BlockSchema } from "./form-engine"
import { Button } from "../../components/ui/button"
import { X, GripVertical, ChevronDown, ChevronUp } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
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
}

function SortableBlockItem({ 
  id, 
  index, 
  item, 
  schema, 
  basePath, 
  control, 
  remove 
}: { 
  id: string; 
  index: number; 
  item: any; 
  schema: FieldSchema; 
  basePath: string; 
  control: any; 
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
    <div ref={setNodeRef} style={style} className="relative border border-border rounded-md bg-background shadow-sm mb-4">
      {/* Header / Drag Handle */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div {...attributes} {...listeners} className="cursor-grab hover:bg-muted p-1 rounded-md">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="font-semibold text-sm">
            {blockConfig.labels?.singular || blockConfig.slug}
          </span>
          <span className="text-xs text-muted-foreground ml-2">
            Block {index + 1}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => remove(index)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {blockConfig.fields.map(subField => (
            <FormFieldRenderer 
              key={subField.name} 
              schema={subField} 
              basePath={`${basePath}.${index}`} 
              control={control} 
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function BlockBuilder({ schema, basePath, control }: BlockBuilderProps) {
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
    <div className="border border-border p-4 rounded-md space-y-4 bg-muted/10">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-semibold text-sm">{schema.label}</h4>
          <p className="text-xs text-muted-foreground mt-1">Manage blocks for this section.</p>
        </div>
        
        {schema.blocks && schema.blocks.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                Add Block
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {schema.blocks.map((block) => (
                <DropdownMenuItem key={block.slug} onClick={() => handleAddBlock(block)}>
                  {block.labels?.singular || block.slug}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {fields.length === 0 ? (
        <div className="text-center p-8 border border-dashed border-border rounded-md">
          <p className="text-sm text-muted-foreground mb-4">No blocks added yet.</p>
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
            <div className="pt-4">
              {fields.map((item, index) => (
                <SortableBlockItem
                  key={item.id}
                  id={item.id}
                  index={index}
                  item={item}
                  schema={schema}
                  basePath={basePath}
                  control={control}
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
