import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form } from "../ui/form"
import { Button } from "../ui/button"
import type { Field as FieldSchema, Block as BlockSchema } from "@dyrected/sdk"
import { buildSchemaShape, buildDefaultValues } from "./utils"
import { FormFieldRenderer } from "./form-field-renderer"

export type { FieldSchema, BlockSchema }

interface FormEngineProps {
  collection: string
  fields: FieldSchema[]
  defaultValues?: Record<string, any>
  onSubmit: (data: any) => void
  onChange?: (isDirty: boolean) => void
  isLoading?: boolean
  submitLabel?: string
  readOnly?: boolean
  onDataChange?: (data: any) => void
}

export function FormEngine({
  collection,
  fields,
  defaultValues = {},
  onSubmit,
  onChange,
  isLoading,
  submitLabel = "Save",
  readOnly,
  onDataChange
}: FormEngineProps) {
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

  const watchedValues = useWatch({
    control: form.control,
  })

  useEffect(() => {
    if (onDataChange) {
      const handler = setTimeout(() => {
        onDataChange(watchedValues)
      }, 100)
      return () => clearTimeout(handler)
    }
  }, [watchedValues, onDataChange])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="dy-space-y-8">
        <div className="dy-grid dy-gap-6">
          {fields.filter(f => !f.admin?.hidden).map((field) => (
            <FormFieldRenderer
              key={field.name}
              schema={field}
              basePath=""
              control={form.control}
              collection={collection}
            />
          ))}
        </div>
        <div className="dy-flex dy-justify-end dy-gap-4">
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
