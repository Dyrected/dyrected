import React, { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form } from "../ui/form"
import { Button } from "../ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs"
import type { Field as FieldSchema, Block as BlockSchema } from "@dyrected/sdk"
import { buildSchemaShape, buildDefaultValues } from "./utils"
import { FormFieldRenderer } from "./form-field-renderer"
import { AlertCircle } from "lucide-react"

function getFlatErrors(errors: any, path: string = ""): { path: string; message: string }[] {
  const result: { path: string; message: string }[] = []
  if (!errors) return result

  if (typeof errors === "object") {
    if (typeof errors.message === "string") {
      result.push({ path, message: errors.message })
      return result
    }
    for (const key in errors) {
      if (Object.prototype.hasOwnProperty.call(errors, key)) {
        if (key === "ref" || key === "type") continue
        const nextPath = path ? `${path}.${key}` : key
        result.push(...getFlatErrors(errors[key], nextPath))
      }
    }
  }
  return result
}

function formatPath(path: string): string {
  return path
    .split('.')
    .map(part => {
      if (/^\d+$/.test(part)) {
        return `Item ${parseInt(part, 10) + 1}`
      }
      return part
        .charAt(0).toUpperCase() + part.slice(1)
        .replace(/([A-Z])/g, ' $1')
    })
    .join(' > ')
}

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

  const flatErrors = getFlatErrors(form.formState.errors)

  useEffect(() => {
    if (flatErrors.length > 0 && form.formState.submitCount > 0) {
      console.warn("[Validation] Submission failed with errors:", form.formState.errors)
    }
  }, [form.formState.submitCount, flatErrors, form.formState.errors])

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

  const visibleFields = fields.filter(f => !f.admin?.hidden)
  const topFields = visibleFields.filter(f => !f.admin?.tab)
  const tabbedFields = visibleFields.filter(f => !!f.admin?.tab)

  let fieldsContent: React.ReactNode

  if (tabbedFields.length > 0) {
    const tabOrder: string[] = []
    const tabGroups = new Map<string, FieldSchema[]>()

    for (const field of tabbedFields) {
      const tab = field.admin!.tab!
      if (!tabGroups.has(tab)) {
        tabGroups.set(tab, [])
        tabOrder.push(tab)
      }
      tabGroups.get(tab)!.push(field)
    }

    fieldsContent = (
      <div className="dy-space-y-6">
        {topFields.length > 0 && (
          <div className="dy-grid dy-gap-6">
            {topFields.map(field => (
              <FormFieldRenderer
                key={field.name}
                schema={field}
                basePath=""
                control={form.control}
                collection={collection}
              />
            ))}
          </div>
        )}

        <Tabs defaultValue={tabOrder[0]}>
          <TabsList className="dy-mb-2">
            {tabOrder.map(tab => (
              <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>
            ))}
          </TabsList>
          {tabOrder.map(tab => (
            <TabsContent key={tab} value={tab}>
              <div className="dy-grid dy-gap-6 dy-pt-4">
                {tabGroups.get(tab)!.map(field => (
                  <FormFieldRenderer
                    key={field.name}
                    schema={field}
                    basePath=""
                    control={form.control}
                    collection={collection}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    )
  } else {
    fieldsContent = (
      <div className="dy-grid dy-gap-6">
        {visibleFields.map(field => (
          <FormFieldRenderer
            key={field.name}
            schema={field}
            basePath=""
            control={form.control}
            collection={collection}
          />
        ))}
      </div>
    )
  }

  return (
    <Form {...form}>
      <form id="dyrected-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="dy-space-y-8">
        {flatErrors.length > 0 && (
          <div className="dy-p-4 dy-rounded-xl dy-bg-destructive/10 dy-border dy-border-destructive/20 dy-text-destructive dy-space-y-2">
            <div className="dy-flex dy-items-center dy-gap-2 dy-font-semibold">
              <AlertCircle className="dy-h-4 dy-w-4 dy-shrink-0" />
              <span>Please resolve the following validation errors:</span>
            </div>
            <ul className="dy-list-disc dy-list-inside dy-text-sm dy-space-y-1">
              {flatErrors.map((err, idx) => (
                <li
                  key={idx}
                  className="dy-cursor-pointer hover:dy-underline"
                  onClick={() => {
                    const el = (document.querySelector(`[data-dy-field="${err.path}"]`) || document.querySelector(`[name="${err.path}"]`)) as HTMLElement | null
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      const input = el.querySelector<HTMLElement>('input, textarea, [contenteditable], button[role="combobox"]') || el
                      input?.focus()
                    }
                  }}
                >
                  <span className="dy-font-medium">{formatPath(err.path)}:</span> {err.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        {fieldsContent}
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
