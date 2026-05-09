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
import { Plus, Trash2 } from "lucide-react"
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
  return (
    <div className="space-y-4 transition-all">
      <div className="flex justify-between items-center pb-2">
        <div>
          <h4 className="font-bold text-sm text-foreground tracking-tight">{schema.label || schema.name.charAt(0).toUpperCase() + schema.name.slice(1)}</h4>
          {schema.admin?.description && (
            <p className="text-[11px] text-muted-foreground/60 italic">{schema.admin.description}</p>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] rounded-md border-primary/20 hover:bg-primary/5 hover:text-primary" onClick={() => append(buildDefaultValues(schema.fields || [], {}))}>
          <Plus className="w-3 h-3 mr-1" />
          Add Item
        </Button>
      </div>
      <div className="space-y-6">
        {fields.map((item, index) => (
          <div key={item.id} className="relative group left-accent animate-in">
            <Button type="button" variant="ghost" size="icon" className="absolute -top-1 -right-2 h-6 w-6 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => remove(index)}>
              <Trash2 className="w-3 h-3" />
            </Button>
            <div className="space-y-6">
              {schema.fields?.map(subField => (
                <FormFieldRenderer key={subField.name} schema={subField} basePath={`${basePath}.${index}`} control={control} collection={collection} />
              ))}
            </div>
          </div>
        ))}
        {fields.length === 0 && (
          <div className="text-center py-6 border border-dashed border-border/40 rounded-md">
            <p className="text-[11px] text-muted-foreground/50">No items added yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
