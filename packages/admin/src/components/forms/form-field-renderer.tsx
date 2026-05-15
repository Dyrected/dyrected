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
import { JoinField } from "./fields/join-field"
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

  const fullPath = basePath ? `${basePath}.${schema.name!}` : schema.name!

  if ((schema.type as string) === "row") {
    return (
      <div className="dy-flex dy-flex-wrap dy-gap-6 dy-items-start">
        {schema.fields?.map((subField, i) => (
          <div
            key={subField.name ?? i}
            style={{
              width: subField.admin?.width,
              flexGrow: subField.admin?.width ? 0 : 1,
              minWidth: '180px',
            }}
          >
            <FormFieldRenderer
              schema={subField}
              basePath={basePath}
              control={control}
              collection={collection}
            />
          </div>
        ))}
      </div>
    )
  }

  if ((schema.type as string) === "join") {
    return (
      <div className="dy-space-y-3">
        <div className="dy-flex dy-items-center dy-gap-2 dy-mb-1">
          <label className="dy-text-sm dy-font-semibold dy-text-foreground/80">
            {schema.label || schema.name?.charAt(0).toUpperCase() + (schema.name?.slice(1) ?? '')}
          </label>
          {schema.admin?.description && (
            <p className="dy-text-[11px] dy-text-muted-foreground/60 dy-italic">{schema.admin.description}</p>
          )}
        </div>
        <JoinField schema={schema} />
      </div>
    )
  }

  if (schema.type === "object") {
    return (
      <div className="dy-left-accent dy-space-y-6">
        <div className="dy-flex dy-items-center dy-gap-2 dy-mb-2">
          <h4 className="dy-font-bold dy-text-sm dy-text-foreground/80 dy-tracking-tight">{schema.label || schema.name!.charAt(0).toUpperCase() + schema.name!.slice(1)}</h4>
          {schema.admin?.description && (
            <p className="dy-text-[10px] dy-text-muted-foreground/50 dy-italic">{schema.admin.description}</p>
          )}
        </div>
        <div className="dy-space-y-6">
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
            ? "dy-flex dy-flex-row dy-items-center dy-justify-between dy-rounded-xl dy-border dy-border-border/40 dy-p-4 dy-bg-white/50 dy-shadow-sm dy-space-y-0"
            : "dy-space-y-3"
        )}>
          <div className={cn(isBoolean ? "dy-space-y-1" : "dy-flex dy-items-center dy-gap-2 dy-mb-1")}>
            <FormLabel className="dy-text-sm dy-font-semibold dy-text-foreground/80 dy-cursor-pointer">
              {schema.label || schema.name!.charAt(0).toUpperCase() + schema.name!.slice(1)}
              {schema.required && <span className="dy-text-destructive dy-ml-1">*</span>}
            </FormLabel>
            {schema.admin?.description && (
              <p className={cn(
                "dy-text-muted-foreground/60 dy-italic",
                isBoolean ? "dy-text-[11px] dy-leading-tight" : "dy-text-[11px] dy-leading-relaxed"
              )}>
                {schema.admin.description}
              </p>
            )}
            {!isBoolean && schema.unique && (
              <span className="dy-inline-flex dy-items-center dy-rounded-full dy-bg-primary/10 dy-px-1.5 dy-py-0.5 dy-text-[10px] dy-font-medium dy-text-primary dy-ring-1 dy-ring-inset dy-ring-primary/10">
                Unique
              </span>
            )}
          </div>
          <FormControl>
            <FieldRenderer schema={schema} field={formField} collection={collection} context={{ user, schemas, siblingData: conditionData }} />
          </FormControl>
          {!isBoolean && schema.admin?.description && (
            <p className="dy-text-[11px] dy-text-muted-foreground/70 dy-leading-relaxed dy-italic">{schema.admin.description}</p>
          )}
          <FormMessage className="dy-text-xs dy-font-medium" />
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
    <div className="dy-space-y-6 dy-transition-all dy-py-6">
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="dy-h-9 dy-text-[11px] dy-font-bold dy-rounded-xl dy-border-primary/20 hover:dy-bg-primary/5 hover:dy-text-primary dy-transition-all dy-shadow-sm"
            onClick={() => append(buildDefaultValues(schema.fields || [], {}))}
          >
            <Plus className="dy-w-3.5 dy-h-3.5 dy-mr-1.5" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="dy-space-y-8 dy-pl-0 dy-border-l dy-border-muted/30">
        {fields.map((item, index) => (
          <div key={item.id} className="dy-relative dy-group dy-animate-in dy-slide-in-from-left-2 dy-duration-300">
            <div className="dy-bg-muted/5 dy-left-accent dy-transition-all dy-relative">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="dy-absolute dy-top-4 dy-right-4 dy-h-8 dy-w-8 dy-text-muted-foreground/20 hover:dy-text-destructive hover:dy-bg-destructive/10 dy-rounded-xl dy-opacity-0 dy-group-hover:dy-opacity-100 dy-transition-all"
                onClick={() => remove(index)}
              >
                <Trash2 className="dy-w-4 dy-h-4" />
              </Button>
              <div className="dy-space-y-6">
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
          <div className="dy-flex dy-flex-col dy-items-center dy-justify-center dy-py-12 dy-border-2 dy-border-dashed dy-border-muted dy-rounded-3xl dy-bg-muted/5 dy-space-y-3">
            <div className="dy-p-3 dy-bg-muted dy-rounded-full">
              <Layers className="dy-h-6 dy-w-6 dy-text-muted-foreground/40" />
            </div>
            <p className="dy-text-xs dy-font-medium dy-text-muted-foreground/50">No items added yet</p>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="dy-w-full dy-h-10 dy-text-xs dy-font-bold dy-rounded-2xl dy-border-dashed dy-border-primary/20 hover:dy-bg-primary/5 hover:dy-text-primary dy-transition-all dy-shadow-sm"
          onClick={() => append(buildDefaultValues(schema.fields || [], {}))}
        >
          <Plus className="dy-w-4 dy-h-4 dy-mr-2" />
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
