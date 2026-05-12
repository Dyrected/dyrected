import * as React from "react"
import { useWatch, useFieldArray } from "react-hook-form"
import { useDyrected } from "../../providers/dyrected-provider"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form"
import { Button } from "../ui/button"
import { Plus, Trash2, Layers } from "lucide-react"
import { MediaLibraryDialog } from "../media/media-library-dialog"
import { cn } from "../../lib/utils"
import jexl from 'jexl'
import type { Field as FieldSchema } from "@dyrected/sdk"
import { FieldRenderer } from "./field-renderer"
import { BlockBuilder } from "./fields/block-builder"
import { buildDefaultValues } from "./utils"

interface FormFieldRendererProps {
  schema: FieldSchema
  basePath: string
  control: any
  collection: string
}

/**
 * FormFieldRenderer (Field Orchestrator)
 * 
 * This component handles the high-level logic for a single form field, including:
 * - Field Lifecycle: Manages registration and state via react-hook-form Controller.
 * - Conditional Visibility: Evaluates 'admin.condition' to show/hide fields dynamically.
 * - Layout & Presentation: Renders labels, descriptions, and error states.
 * - Validation: Displays Zod validation errors.
 * 
 * It delegates the actual rendering of the input UI to the FieldRenderer.
 */
export function FormFieldRenderer({ schema, basePath, control, collection }: FormFieldRendererProps) {
  const { user, schemas } = useDyrected()

  if (schema.admin?.hidden) return null

  const formValues = useWatch({ control })
  const siblingData = useWatch({ control, name: (basePath || undefined) as any }) || {}
  const conditionData = basePath ? { ...formValues, ...siblingData } : formValues

  let isVisible = true
  const condition = schema.admin?.condition

  if (typeof condition === 'function') {
    isVisible = condition(conditionData, siblingData)
  } else if (typeof condition === 'string') {
    try {
      const sanitizedCondition = condition.replace(/===/g, '==').replace(/!==/g, '!=')
      isVisible = jexl.evalSync(sanitizedCondition, conditionData)
    } catch (e) {
      console.warn("Jexl eval failed:", e)
      isVisible = true
    }
  }

  if (!isVisible) return null

  const readAccess = (schema.access as any)?.read
  let canRead = true
  if (readAccess === false) {
    canRead = false
  } else if (typeof readAccess === 'string') {
    try {
      canRead = jexl.evalSync(readAccess, { user, ...conditionData })
    } catch (e) {
      console.warn("Read access eval failed:", e)
    }
  }

  if (!canRead) return null

  const fullPath = basePath ? `${basePath}.${schema.name}` : schema.name

  if (schema.type === "object") {
    return (
      <div className="left-accent space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="font-bold text-sm text-foreground/80 tracking-tight">{schema.label || schema.name.charAt(0).toUpperCase() + schema.name.slice(1)}</h4>
          {schema.admin?.description && (
            <p className="text-[10px] text-muted-foreground/50 italic">{schema.admin.description}</p>
          )}
        </div>
        <div className="space-y-6">
          {schema.fields?.map(subField => (
            <FormFieldRenderer key={subField.name} schema={subField} basePath={fullPath} control={control} collection={collection} />
          ))}
        </div>
      </div>
    )
  }

  if (schema.type === "array") {
    return <ArrayFieldRenderer schema={schema} basePath={fullPath} control={control} collection={collection} />
  }

  if (schema.type === "blocks" && schema.blocks) {
    return <BlockBuilder schema={schema} basePath={fullPath} control={control} collection={collection} />
  }

  const isBoolean = schema.type === "boolean"

  return (
    <FormField
      control={control}
      name={fullPath}
      render={({ field: formField }: { field: any }) => (
        <FormItem className={cn(
          isBoolean
            ? "flex flex-row items-center justify-between rounded-xl border border-border/40 p-4 bg-white/50 shadow-sm space-y-0"
            : "space-y-3"
        )}>
          <div className={cn(isBoolean ? "space-y-1" : "flex items-center gap-2 mb-1")}>
            <FormLabel className="text-sm font-semibold text-foreground/80 cursor-pointer">
              {schema.label || schema.name.charAt(0).toUpperCase() + schema.name.slice(1)}
              {schema.required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
            {schema.admin?.description && (
              <p className={cn(
                "text-muted-foreground/60 italic",
                isBoolean ? "text-[11px] leading-tight" : "text-[11px] leading-relaxed"
              )}>
                {schema.admin.description}
              </p>
            )}
            {!isBoolean && schema.unique && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary ring-1 ring-inset ring-primary/10">
                Unique
              </span>
            )}
          </div>
          <FormControl>
            <FieldRenderer schema={schema} field={formField} collection={collection} context={{ user, schemas, siblingData: conditionData }} />
          </FormControl>
          {!isBoolean && schema.admin?.description && (
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed italic">{schema.admin.description}</p>
          )}
          <FormMessage className="text-xs font-medium" />
        </FormItem>
      )}
    />
  )
}

function ArrayFieldRenderer({ schema, basePath, control, collection }: { schema: FieldSchema, basePath: string, control: any, collection: string }) {
  const { fields, append, remove } = useFieldArray({ control, name: basePath })
  const { schemas } = useDyrected()
  const [isBulkOpen, setIsBulkOpen] = React.useState(false)

  // Find if there is an image field or a relationship to an upload collection
  const imageField = React.useMemo(() => {
    return schema.fields?.find(f => {
      if (f.type === 'image') return true
      if (f.type === 'relationship' && f.relationTo) {
        const relatedSchema = schemas?.collections?.find(s => s.slug === f.relationTo)
        return relatedSchema?.upload === true
      }
      return false
    })
  }, [schema.fields, schemas])

  const bulkCollection = (imageField?.type === 'relationship' ? imageField.relationTo : 'media') || 'media'

  const handleBulkAdd = (ids: string[]) => {
    ids.forEach(id => {
      const newItem = buildDefaultValues(schema.fields || [], {})
      if (imageField) {
        newItem[imageField.name] = id
      }
      append(newItem)
    })
    setIsBulkOpen(false)
  }

  return (
    <div className="space-y-6 transition-all py-6">
      <div className="flex justify-between items-end pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h4 className="font-serif font-bold text-base text-foreground tracking-tight">{schema.label || schema.name.charAt(0).toUpperCase() + schema.name.slice(1)}</h4>
          </div>
          {schema.admin?.description && (
            <p className="text-[11px] text-muted-foreground/60 italic leading-relaxed">{schema.admin.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 text-[11px] font-bold rounded-xl border-primary/20 hover:bg-primary/5 hover:text-primary transition-all shadow-sm"
            onClick={() => append(buildDefaultValues(schema.fields || [], {}))}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="space-y-8 pl-0 border-l border-muted/30">
        {fields.map((item, index) => (
          <div key={item.id} className="relative group animate-in slide-in-from-left-2 duration-300">
            <div className="bg-muted/5 left-accent transition-all relative">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 h-8 w-8 text-muted-foreground/20 hover:text-destructive hover:bg-destructive/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                onClick={() => remove(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <div className="space-y-6">
                {schema.fields?.map(subField => (
                  <FormFieldRenderer
                    key={subField.name}
                    schema={subField}
                    basePath={`${basePath}.${index}`}
                    control={control}
                    collection={collection}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}

        {fields.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-muted rounded-3xl bg-muted/5 space-y-3">
            <div className="p-3 bg-muted rounded-full">
              <Layers className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-xs font-medium text-muted-foreground/50">No items added yet</p>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-10 text-xs font-bold rounded-2xl border-dashed border-primary/20 hover:bg-primary/5 hover:text-primary transition-all shadow-sm"
          onClick={() => append(buildDefaultValues(schema.fields || [], {}))}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
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
