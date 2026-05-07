import { useForm, useFieldArray } from "react-hook-form"
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
import { X } from "lucide-react"
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

export interface BlockSchema {
  slug: string
  labels?: { singular: string; plural: string }
  fields: FieldSchema[]
}

export interface FieldSchema {
  name: string
  label: string
  type: "text" | "number" | "boolean" | "select" | "textarea" | "image" | "richText" | "relationship" | "email" | "url" | "date" | "multiSelect" | "json" | "object" | "array" | "blocks"
  relationTo?: string
  required?: boolean
  options?: { label: string; value: string }[]
  defaultValue?: any
  fields?: FieldSchema[]
  blocks?: BlockSchema[]
}

function buildSchemaShape(fields: FieldSchema[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  fields.forEach((field) => {
    let validator: any = z.any()

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

    if (field.type === "text" || field.type === "textarea" || field.type === "select" || field.type === "image" || field.type === "richText" || field.type === "relationship" || field.type === "date") {
      validator = z.string()
      if (field.required) validator = validator.min(1, `${field.label} is required`)
    } else if (field.type === "email") {
      validator = z.string().email(`${field.label} must be a valid email`)
      if (field.required) validator = validator.min(1, `${field.label} is required`)
    } else if (field.type === "url") {
      validator = z.string().url(`${field.label} must be a valid URL`)
      if (field.required) validator = validator.min(1, `${field.label} is required`)
    } else if (field.type === "number") {
      validator = z.coerce.number()
    } else if (field.type === "boolean") {
      validator = z.boolean()
    } else if (field.type === "json") {
      validator = z.any()
    } else if (field.type === "multiSelect") {
      validator = z.array(z.string())
      if (field.required) validator = validator.min(1, `${field.label} requires at least one selection`)
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
    <div className="border border-border p-4 rounded-md space-y-4 bg-muted/10">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-sm">{schema.label}</h4>
        <Button type="button" variant="outline" size="sm" onClick={() => append(buildDefaultValues(schema.fields || [], {}))}>
          Add Item
        </Button>
      </div>
      {fields.map((item, index) => (
         <div key={item.id} className="relative border border-border p-4 rounded-md bg-background shadow-sm">
           <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" onClick={() => remove(index)}>
             <X className="w-4 h-4" />
           </Button>
           <div className="space-y-6 pt-4">
             {schema.fields?.map(subField => (
               <FormFieldRenderer key={subField.name} schema={subField} basePath={`${basePath}.${index}`} control={control} />
             ))}
           </div>
         </div>
      ))}
    </div>
  )
}

export function FormFieldRenderer({ schema, basePath, control }: { schema: FieldSchema, basePath: string, control: any }) {
  const fullPath = basePath ? `${basePath}.${schema.name}` : schema.name

  if (schema.type === "object") {
    return (
      <div className="border border-border p-4 rounded-md space-y-4 bg-muted/5">
        <h4 className="font-semibold text-sm">{schema.label}</h4>
        <div className="space-y-6 pl-4 border-l-2 border-border/50">
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
          <FormLabel>{schema.label}</FormLabel>
          <FormControl>
            {renderField(schema, formField)}
          </FormControl>
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
  isLoading?: boolean
  submitLabel?: string
}

export function FormEngine({ fields, defaultValues = {}, onSubmit, isLoading, submitLabel = "Save" }: FormEngineProps) {
  const schemaShape = buildSchemaShape(fields)
  const formSchema = z.object(schemaShape)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaultValues(fields, defaultValues),
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid gap-6">
          {fields.map((field) => (
            <FormFieldRenderer key={field.name} schema={field} basePath="" control={form.control} />
          ))}
        </div>
        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}

function renderField(schema: FieldSchema, field: any) {
  switch (schema.type) {
    case "textarea":
      return <Textarea {...field} placeholder={`Enter ${schema.label.toLowerCase()}...`} />
    case "boolean":
      return (
        <div className="flex items-center space-x-2">
          <Switch
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        </div>
      )
    case "select":
      return (
        <Select onValueChange={field.onChange} defaultValue={field.value}>
          <SelectTrigger>
            <SelectValue placeholder={`Select ${schema.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {schema.options?.map((opt) => (
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
          options={schema.options || []} 
          value={field.value || []} 
          onChange={field.onChange} 
        />
      )
    case "image":
      return <MediaPicker value={field.value} onChange={field.onChange} />
    case "richText":
      return <RichTextEditor value={field.value} onChange={field.onChange} />
    case "json":
      return <JsonEditor value={field.value} onChange={field.onChange} />
    case "date":
      return <DatePicker value={field.value} onChange={field.onChange} />
    case "relationship":
      return <RelationshipPicker value={field.value} onChange={field.onChange} relationTo={schema.relationTo!} />
    case "number":
      return <Input type="number" {...field} placeholder="0" />
    case "email":
      return <Input type="email" {...field} placeholder={`Enter ${schema.label.toLowerCase()}...`} />
    case "url":
      return <Input type="url" {...field} placeholder="https://" />
    default:
      return <Input {...field} placeholder={`Enter ${schema.label.toLowerCase()}...`} />
  }
}
