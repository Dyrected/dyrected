import type {
  Field as FieldSchema,
  Block as BlockSchema
} from "@dyrected/sdk";
export type { FieldSchema, BlockSchema }

function normalizeOptions(options: string[] | { label: string; value: string }[] | undefined): { label: string; value: string }[] {
  if (!options) return []
  return options.map(opt => typeof opt === "string" ? { label: opt, value: opt } : opt)
}
import { useEffect } from "react"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import { Textarea } from "../../components/ui/textarea"
import { Switch } from "../../components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"
import { MediaPicker } from "./media-picker"
import { RichTextEditor } from "./rich-text-editor"
import { RelationshipPicker } from "./relationship-picker"
import { DatePicker } from "./date-picker"
import { MultiSelect } from "./multi-select"
import { JsonEditor } from "./json-editor"
import { BlockBuilder } from "./block-builder"


function buildSchemaShape(fields: FieldSchema[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  fields.forEach((field) => {
    let validator: any = z.any()
    const label = field.label || field.name.charAt(0).toUpperCase() + field.name.slice(1)

    if (field.type === "object" && field.fields) {
      validator = z.object(buildSchemaShape(field.fields))
      if (!field.required) validator = validator.optional()
      shape[field.name] = validator
      return
    }

    if (field.type === "blocks") {
      // In a real scenario, this would discriminate based on blockType, 
      // but for dynamic forms we can loosely validate it as an array of objects
      validator = z.array(z.any())
      if (!field.required) validator = validator.optional()
      shape[field.name] = validator
      return
    }

    if (field.type === "array" && field.fields) {
      validator = z.array(z.object(buildSchemaShape(field.fields)))
      if (!field.required) validator = validator.optional()
      shape[field.name] = validator
      return
    }

    const fieldType = field.type as string
    if (fieldType === "text" || fieldType === "textarea" || fieldType === "select" || fieldType === "image" || fieldType === "richText" || fieldType === "relationship" || fieldType === "date") {
      validator = z.string()
      if (field.required) validator = validator.min(1, `${label} is required`)
    } else if (field.type === "email") {
      validator = z.string().email(`${label} must be a valid email`)
      if (field.required) validator = validator.min(1, `${label} is required`)
    } else if (field.type === "url") {
      validator = z.string().url(`${label} must be a valid URL`)
      if (field.required) validator = validator.min(1, `${label} is required`)
    } else if (field.type === "number") {
      validator = z.coerce.number()
    } else if (field.type === "boolean") {
      validator = z.boolean()
    } else if (field.type === "json") {
      validator = z.any()
    } else if (field.type === "multiSelect") {
      validator = z.array(z.string())
      if (field.required) validator = validator.min(1, `${label} requires at least one selection`)
    }

    if (!field.required && field.type !== "multiSelect") {
      validator = validator.optional().or(z.literal(""))
    } else if (!field.required && field.type === "multiSelect") {
      validator = validator.optional()
    }

    shape[field.name] = validator
  })
  return shape
}

export function buildDefaultValues(fields: FieldSchema[], defaults: any) {
  return fields.reduce((acc, field) => {
    let defaultVal = defaults[field.name] ?? field.defaultValue

    if (field.type === "object" && field.fields) {
      acc[field.name] = buildDefaultValues(field.fields, defaultVal || {})
      return acc
    }

    if (field.type === "array") {
      acc[field.name] = Array.isArray(defaultVal) ? defaultVal : []
      return acc
    }

    if (field.type === "blocks") {
      acc[field.name] = Array.isArray(defaultVal) ? defaultVal : []
      return acc
    }

    if (defaultVal === undefined) {
      if (field.type === "boolean") defaultVal = false
      else if (field.type === "multiSelect") defaultVal = []
      else if (field.type === "json") defaultVal = {}
      else defaultVal = ""
    }

    acc[field.name] = defaultVal
    return acc
  }, {} as any)
}

function ArrayFieldRenderer({ schema, basePath, control }: { schema: FieldSchema, basePath: string, control: any }) {
  const { fields, append, remove } = useFieldArray({ control, name: basePath })
  return (
    <div className="border border-border p-5 rounded-xl space-y-5 bg-muted/5 shadow-sm transition-all">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-bold text-sm text-foreground">{schema.label || schema.name.charAt(0).toUpperCase() + schema.name.slice(1)}</h4>
          <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Array Collection</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg border-primary/20 hover:bg-primary/5 hover:text-primary" onClick={() => append(buildDefaultValues(schema.fields || [], {}))}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Item
        </Button>
      </div>
      <div className="space-y-4">
        {fields.map((item, index) => (
          <div key={item.id} className="relative border border-border/60 p-5 rounded-lg bg-white shadow-sm transition-all hover:shadow-md animate-in">
            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md" onClick={() => remove(index)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <div className="space-y-6 pt-2">
              {schema.fields?.map(subField => (
                <FormFieldRenderer key={subField.name} schema={subField} basePath={`${basePath}.${index}`} control={control} />
              ))}
            </div>
          </div>
        ))}
        {fields.length === 0 && (
          <div className="text-center py-8 border border-dashed border-border rounded-lg bg-muted/10">
            <p className="text-xs text-muted-foreground">No items added yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function FormFieldRenderer({ schema, basePath, control }: { schema: FieldSchema, basePath: string, control: any }) {
  // Statically hidden field
  if (schema.admin?.hidden) return null

  // Reactively evaluate admin.condition against current form values
  const formValues = useWatch({ control })
  if (schema.admin?.condition && !schema.admin.condition(formValues)) return null

  if ((schema.access as any)?.read === false) return null

  const fullPath = basePath ? `${basePath}.${schema.name}` : schema.name

  if (schema.type === "object") {
    return (
      <div className="border border-border/80 p-5 rounded-xl space-y-5 bg-white/40 shadow-sm transition-all">
        <div className="flex items-center gap-2 border-b border-border/40 pb-3 mb-2">
          <div className="h-2 w-2 rounded-full bg-primary/40" />
          <h4 className="font-bold text-sm text-foreground">{schema.label || schema.name.charAt(0).toUpperCase() + schema.name.slice(1)}</h4>
        </div>
        <div className="space-y-6">
          {schema.fields?.map(subField => (
            <FormFieldRenderer key={subField.name} schema={subField} basePath={fullPath} control={control} />
          ))}
        </div>
      </div>
    )
  }

  if (schema.type === "array") {
    return <ArrayFieldRenderer schema={schema} basePath={fullPath} control={control} />
  }

  if (schema.type === "blocks" && schema.blocks) {
    return <BlockBuilder schema={schema} basePath={fullPath} control={control} />
  }

  return (
    <FormField
      control={control}
      name={fullPath}
      render={({ field: formField }) => (
        <FormItem>
          <div className="flex items-center gap-2 mb-1.5">
            <FormLabel className="mb-0">
              {schema.label || schema.name.charAt(0).toUpperCase() + schema.name.slice(1)}
              {schema.required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
            {schema.unique && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                Unique
              </span>
            )}
          </div>
          <FormControl>
            {renderField(schema, formField)}
          </FormControl>
          {schema.admin?.description && (
            <p className="text-[10px] text-muted-foreground mt-1.5">{schema.admin.description}</p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

interface FormEngineProps {
  fields: FieldSchema[]
   defaultValues?: Record<string, any>
   onSubmit: (data: any) => void
   onChange?: (isDirty: boolean) => void
   isLoading?: boolean
  submitLabel?: string
  readOnly?: boolean
}

 export function FormEngine({ fields, defaultValues = {}, onSubmit, onChange, isLoading, submitLabel = "Save", readOnly }: FormEngineProps) {
   const schemaShape = buildSchemaShape(fields)
   const formSchema = z.object(schemaShape)
 
   const form = useForm<z.infer<typeof formSchema>>({
     resolver: zodResolver(formSchema),
     defaultValues: buildDefaultValues(fields, defaultValues),
   })

   const { isDirty } = form.formState

   useEffect(() => {
     onChange?.(isDirty)
   }, [isDirty, onChange])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid gap-6">
          {fields.filter(f => !f.admin?.hidden).map((field) => (
            <FormFieldRenderer key={field.name} schema={field} basePath="" control={form.control} />
          ))}
        </div>
        <div className="flex justify-end gap-4">
          {!readOnly && (
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : submitLabel}
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}

function renderField(schema: FieldSchema, field: any) {
  const label = schema.label || schema.name.charAt(0).toUpperCase() + schema.name.slice(1)
  const placeholder = schema.admin?.placeholder || `Enter ${label.toLowerCase()}...`
  const disabled = schema.admin?.readOnly || (schema.access as any)?.update === false
  const relationTo = (schema as any).relationTo || (schema as any).collection

  switch (schema.type) {
    case "textarea":
      return <Textarea {...field} placeholder={placeholder} disabled={disabled} />
    case "boolean":
      return (
        <div className="flex items-center space-x-2">
          <Switch
            checked={field.value}
            onCheckedChange={field.onChange}
            disabled={disabled}
          />
        </div>
      )
    case "select":
      return (
        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder={schema.admin?.placeholder || `Select ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {normalizeOptions(schema.options).map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case "multiSelect":
      return (
        <MultiSelect 
          options={normalizeOptions(schema.options)} 
          value={field.value || []} 
          onChange={field.onChange} 
        />
      )
    case "image" as any:
      return <MediaPicker value={field.value} onChange={field.onChange} />
    case "richText":
      return <RichTextEditor value={field.value} onChange={field.onChange} />
    case "json":
      return <JsonEditor value={field.value} onChange={field.onChange} />
    case "date":
      return <DatePicker value={field.value} onChange={field.onChange} />
    case "relationship":
      return <RelationshipPicker
        value={field.value}
        onChange={field.onChange}
        relationTo={(schema as any).relationTo || (schema as any).collection}
        multiple={(schema as any).hasMany}
      />
    case "number":
      return <Input type="number" {...field} placeholder={schema.admin?.placeholder || "0"} disabled={disabled} />
    case "email":
      return <Input type="email" {...field} placeholder={placeholder} disabled={disabled} />
    case "url":
      return <Input type="url" {...field} placeholder={schema.admin?.placeholder || "https://"} disabled={disabled} />
    default:
      return <Input {...field} placeholder={placeholder} disabled={disabled} />
  }
}
