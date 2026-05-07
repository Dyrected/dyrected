import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MediaPicker } from "./media-picker"

interface FieldSchema {
  name: string
  label: string
  type: "text" | "number" | "boolean" | "select" | "textarea" | "image" | "richText"
  required?: boolean
  options?: { label: string; value: string }[]
  defaultValue?: any
}

interface FormEngineProps {
  fields: FieldSchema[]
  defaultValues?: any
  onSubmit: (data: any) => void
  isLoading?: boolean
  submitLabel?: string
}

export function FormEngine({ 
  fields, 
  defaultValues = {}, 
  onSubmit, 
  isLoading, 
  submitLabel = "Save Entry" 
}: FormEngineProps) {
  // Build Zod schema dynamically
  const schemaShape: any = {}
  fields.forEach((field) => {
    let validator: any = z.any()

    if (field.type === "text" || field.type === "textarea" || field.type === "select" || field.type === "image") {
      validator = z.string()
      if (field.required) validator = validator.min(1, `${field.label} is required`)
    } else if (field.type === "number") {
      validator = z.coerce.number()
    } else if (field.type === "boolean") {
      validator = z.boolean()
    }

    if (!field.required) {
      validator = validator.optional().or(z.literal(""))
    }

    schemaShape[field.name] = validator
  })

  const formSchema = z.object(schemaShape)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: fields.reduce((acc, field) => {
      acc[field.name] = defaultValues[field.name] ?? field.defaultValue ?? (field.type === "boolean" ? false : "")
      return acc
    }, {} as any),
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid gap-6">
          {fields.map((field) => (
            <FormField
              key={field.name}
              control={form.control}
              name={field.name}
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>{field.label}</FormLabel>
                  <FormControl>
                    {renderField(field, formField)}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
    case "image":
      return <MediaPicker value={field.value} onChange={field.onChange} />
    case "number":
      return <Input type="number" {...field} placeholder="0" />
    default:
      return <Input {...field} placeholder={`Enter ${schema.label.toLowerCase()}...`} />
  }
}
