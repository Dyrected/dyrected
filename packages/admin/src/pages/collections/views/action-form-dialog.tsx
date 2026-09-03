import * as React from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog"
import { Button } from "../../../components/ui/button"
import { Label } from "../../../components/ui/label"
import { FieldRenderer } from "../../../components/forms/field-renderer"

import { useDyrected } from "../../../providers/dyrected-context"

interface ActionFormDialogProps {
  open: boolean
  label: string
  confirm?: string
  submitLabel?: string
  fields?: any[]
  collection?: string
  schemas?: unknown
  doc?: Record<string, any>
  docs?: Record<string, any>[]
  isRunning: boolean
  onSubmit: (input: Record<string, unknown>) => void
  onCancel: () => void
}

/**
 * Input form dialog for actions that declare `fields`.
 * Reuses Dyrected's central `FieldRenderer` to support all standard field types,
 * media/relationship pickers, date pickers, and custom field components.
 */
export function ActionFormDialog({
  open,
  label,
  confirm,
  submitLabel,
  fields,
  collection = "",
  schemas,
  doc,
  docs,
  isRunning,
  onSubmit,
  onCancel,
}: ActionFormDialogProps) {
  if (!open) return null
  return (
    <Dialog open onOpenChange={(next) => (!next ? onCancel() : undefined)}>
      <DialogContent className="dy-flex dy-flex-col dy-max-h-[92dvh] dy-p-0 dy-overflow-hidden sm:dy-max-h-[85vh] sm:dy-max-w-lg md:dy-max-w-xl">
        <div className="sm:dy-hidden dy-pt-3 dy-pb-1 dy-flex dy-justify-center dy-shrink-0">
          <div className="dy-h-1.5 dy-w-12 dy-rounded-full dy-bg-muted-foreground/30" />
        </div>
        <DialogHeader className="dy-px-5 dy-pt-4 sm:dy-px-6 sm:dy-pt-6 dy-pb-3 dy-border-b dy-border-border/40 dy-shrink-0 dy-text-left">
          <DialogTitle className="dy-text-base sm:dy-text-lg">{label}</DialogTitle>
          {confirm && <DialogDescription className="dy-mt-1 dy-text-xs sm:dy-text-sm">{confirm}</DialogDescription>}
        </DialogHeader>
        {/* Keyed by the field set and doc id so each staged action starts with the targeted doc's current values. */}
        <ActionForm
          key={`${formKey(fields)}::${doc?.id ?? "new"}`}
          fields={fields}
          collection={collection}
          schemas={schemas}
          doc={doc}
          docs={docs}
          submitLabel={submitLabel}
          isRunning={isRunning}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      </DialogContent>
    </Dialog>
  )
}

function formKey(fields?: any[]): string {
  return (fields ?? []).map((field) => field.name).join(",")
}

function buildDefaults(fields?: any[], doc?: Record<string, any>): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}
  for (const field of fields ?? []) {
    if (doc && doc[field.name] !== undefined && doc[field.name] !== null) {
      defaults[field.name] = doc[field.name]
    } else {
      defaults[field.name] = field.defaultValue ?? (field.type === "boolean" ? false : "")
    }
  }
  return defaults
}

function ActionForm({
  fields,
  collection,
  schemas,
  doc,
  docs,
  submitLabel,
  isRunning,
  onSubmit,
  onCancel,
}: Pick<ActionFormDialogProps, "fields" | "collection" | "schemas" | "doc" | "docs" | "submitLabel" | "isRunning" | "onSubmit" | "onCancel">) {
  const [values, setValues] = React.useState<Record<string, unknown>>(() => buildDefaults(fields, doc))

  const setValue = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="dy-flex dy-flex-col dy-flex-1 dy-min-h-0 dy-overflow-hidden">
      <div className="dy-flex-1 dy-min-h-0 dy-overflow-y-auto dy-overflow-x-hidden dy-px-5 sm:dy-px-6 dy-py-4 dy-space-y-4">
        {(fields ?? []).map((field) => (
          <ActionField
            key={field.name}
            field={field}
            value={values[field.name]}
            onChange={(value) => setValue(field.name, value)}
            collection={collection ?? ""}
            siblingValues={values}
            schemas={schemas}
            doc={doc}
            docs={docs}
          />
        ))}
      </div>
      <DialogFooter className="dy-px-5 dy-py-3.5 sm:dy-px-6 sm:dy-py-4 dy-border-t dy-border-border/40 dy-bg-muted/20 dy-gap-2 dy-shrink-0">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isRunning}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isRunning}>
          {isRunning && <Loader2 className="dy-mr-1 dy-h-3.5 dy-w-3.5 dy-animate-spin" />}
          {submitLabel || "Run"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function ActionField({
  field,
  value,
  onChange,
  collection,
  siblingValues,
  schemas,
  doc,
  docs,
}: {
  field: any
  value: unknown
  onChange: (value: unknown) => void
  collection: string
  siblingValues: Record<string, unknown>
  schemas?: unknown
  doc?: Record<string, any>
  docs?: Record<string, any>[]
}) {
  const { user } = useDyrected()
  const id = `action-field-${field.name}`
  const label = (
    <Label htmlFor={id} className="dy-text-xs dy-font-medium">
      {field.label || field.name}
      {field.required && <span className="dy-ml-0.5 dy-text-destructive">*</span>}
    </Label>
  )

  const fieldBinding = {
    name: field.name,
    value,
    onChange: (eventOrVal: any) => {
      if (eventOrVal && typeof eventOrVal === "object" && "target" in eventOrVal) {
        onChange(eventOrVal.target.type === "checkbox" ? eventOrVal.target.checked : eventOrVal.target.value)
      } else {
        onChange(eventOrVal)
      }
    },
    onBlur: () => {},
    ref: null,
    id,
  }

  const siblingData = {
    ...(doc ?? {}),
    ...siblingValues,
  }

  const context = {
    user,
    siblingData,
    value,
    path: field.name,
    schemas,
    doc,
    docs,
    document: doc,
    documents: docs,
    row: doc,
    record: doc,
    data: doc,
    formData: siblingValues,
  }

  return (
    <div className="dy-space-y-1.5 dy-w-full dy-min-w-0">
      {label}
      <div className="dy-w-full dy-min-w-0 dy-overflow-x-hidden">
        <FieldRenderer
          schema={field}
          field={fieldBinding}
          id={id}
          collection={collection}
          context={context as any}
        />
      </div>
    </div>
  )
}
