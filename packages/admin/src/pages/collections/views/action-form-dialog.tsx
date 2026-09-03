import * as React from "react"
import { Loader2 } from "lucide-react"
import { evaluateJexlSync } from "@dyrected/core"
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
import { evaluateDefaultValue, normalizeOptions } from "../../../components/forms/utils"
import {
  isSerializedFunctionHook,
  runDeclarativeHookExpression,
  runHookSandboxed,
  stripSerializedFunctionHookPrefix,
} from "../../../components/forms/hooks-sandbox"

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
 * Supports dynamic `defaultValue`, `admin.hooks.onChange`, `admin.hooks.options`,
 * and `admin.condition`.
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

function buildDefaults(
  fields?: any[],
  doc?: Record<string, any>,
  user?: unknown,
  docs?: Record<string, any>[],
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}
  for (const field of fields ?? []) {
    if (doc && doc[field.name] !== undefined && doc[field.name] !== null) {
      defaults[field.name] = doc[field.name]
    } else {
      const evaluated = evaluateDefaultValue(field.defaultValue, {
        doc,
        docs,
        user,
        siblingData: defaults,
        data: { ...(doc ?? {}), ...defaults },
      })
      defaults[field.name] =
        evaluated !== undefined ? evaluated : field.type === "boolean" ? false : ""
    }
  }
  return defaults
}

function ActionForm({
  fields = [],
  collection,
  schemas,
  doc,
  docs,
  submitLabel,
  isRunning,
  onSubmit,
  onCancel,
}: Pick<
  ActionFormDialogProps,
  | "fields"
  | "collection"
  | "schemas"
  | "doc"
  | "docs"
  | "submitLabel"
  | "isRunning"
  | "onSubmit"
  | "onCancel"
>) {
  const { user } = useDyrected()
  const [values, setValues] = React.useState<Record<string, unknown>>(() =>
    buildDefaults(fields, doc, user, docs),
  )
  const [dynamicOptions, setDynamicOptions] = React.useState<
    Record<string, Array<{ label: string; value: string }>>
  >({})

  const setValue = React.useCallback((name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  // ── Hook 1: admin.hooks.onChange — computes derived field values ─────────────
  React.useEffect(() => {
    let active = true

    async function runOnChangeHooks() {
      const updatedValues: Record<string, unknown> = {}
      let hasChanged = false

      for (const field of fields) {
        if (!field.name) continue
        const hook = field.admin?.hooks?.onChange
        if (!hook) continue

        const currentValue = values[field.name]
        let calculatedValue: unknown

        if (typeof hook === "function") {
          try {
            calculatedValue = hook({
              value: currentValue,
              siblingData: values,
              data: { ...(doc ?? {}), ...values },
              doc,
              docs,
              user,
              setValue: (val: unknown) => {
                setValue(field.name, val)
              },
            })
          } catch (err) {
            console.error(
              `[dyrected/admin] Error running onChange hook for action field "${field.name}":`,
              err,
            )
          }
        } else if (typeof hook === "string") {
          try {
            calculatedValue = isSerializedFunctionHook(hook)
              ? await runHookSandboxed(
                  stripSerializedFunctionHookPrefix(hook),
                  currentValue,
                  values,
                  { ...(doc ?? {}), ...values },
                )
              : runDeclarativeHookExpression(
                  hook,
                  currentValue,
                  values,
                  { ...(doc ?? {}), ...values },
                )
          } catch (err) {
            console.error(
              `[dyrected/admin] Error evaluating onChange JEXL expression for action field "${field.name}":`,
              err,
            )
          }
        }

        if (active && calculatedValue !== undefined && calculatedValue !== currentValue) {
          updatedValues[field.name] = calculatedValue
          hasChanged = true
        }
      }

      if (active && hasChanged) {
        setValues((prev) => ({ ...prev, ...updatedValues }))
      }
    }

    void runOnChangeHooks()
    return () => {
      active = false
    }
  }, [values, fields, doc, docs, user, setValue])

  // ── Hook 2: admin.hooks.options — computes dynamic choices for select fields ─
  React.useEffect(() => {
    let active = true

    async function runOptionsHooks() {
      for (const field of fields) {
        if (!field.name) continue
        if (field.type !== "select" && field.type !== "multiSelect" && field.type !== "radio") {
          continue
        }
        const hook = field.admin?.hooks?.options
        if (!hook) continue

        let newOptions: Array<string | { label: string; value: unknown }> = []
        try {
          if (typeof hook === "function") {
            newOptions =
              (await hook({
                value: values[field.name],
                siblingData: values,
                data: { ...(doc ?? {}), ...values },
                doc,
                docs,
                user,
              })) ?? []
          } else if (typeof hook === "string") {
            newOptions =
              (isSerializedFunctionHook(hook)
                ? await runHookSandboxed(
                    stripSerializedFunctionHookPrefix(hook),
                    values[field.name],
                    values,
                    { ...(doc ?? {}), ...values },
                  )
                : runDeclarativeHookExpression(
                    hook,
                    values[field.name],
                    values,
                    { ...(doc ?? {}), ...values },
                  )) ?? []
          }

          if (active && Array.isArray(newOptions)) {
            const normalized = normalizeOptions(newOptions as any)
            setDynamicOptions((prev) => {
              const current = prev[field.name]
              if (JSON.stringify(current) === JSON.stringify(normalized)) return prev
              return { ...prev, [field.name]: normalized }
            })
          }
        } catch (err) {
          console.error(
            `[dyrected/admin] Error running options hook for action field "${field.name}":`,
            err,
          )
        }
      }
    }

    void runOptionsHooks()
    return () => {
      active = false
    }
  }, [values, fields, doc, docs, user])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="dy-flex dy-flex-col dy-flex-1 dy-min-h-0 dy-overflow-hidden"
    >
      <div className="dy-flex-1 dy-min-h-0 dy-overflow-y-auto dy-overflow-x-hidden dy-px-5 sm:dy-px-6 dy-py-4 dy-space-y-4">
        {(fields ?? []).map((field) => (
          <ActionField
            key={field.name}
            field={field}
            value={values[field.name]}
            onChange={(value) => setValue(field.name, value)}
            collection={collection ?? ""}
            siblingValues={values}
            dynamicOptions={dynamicOptions[field.name]}
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
  dynamicOptions,
  schemas,
  doc,
  docs,
}: {
  field: any
  value: unknown
  onChange: (value: unknown) => void
  collection: string
  siblingValues: Record<string, unknown>
  dynamicOptions?: Array<{ label: string; value: string }>
  schemas?: unknown
  doc?: Record<string, any>
  docs?: Record<string, any>[]
}) {
  const { user } = useDyrected()
  const condition = field.admin?.condition

  const isVisible = React.useMemo(() => {
    if (!condition) return true
    const conditionContext = {
      siblingData: siblingValues,
      data: { ...(doc ?? {}), ...siblingValues },
      doc,
      docs,
      user,
      ...siblingValues,
    }

    if (typeof condition === "function") {
      try {
        return Boolean(condition(conditionContext))
      } catch {
        return false
      }
    }

    if (typeof condition === "string") {
      try {
        return Boolean(evaluateJexlSync(condition, conditionContext))
      } catch {
        return false
      }
    }

    return true
  }, [condition, siblingValues, doc, docs, user])

  if (!isVisible || field.admin?.hidden) return null

  const effectiveField = dynamicOptions
    ? { ...field, options: dynamicOptions }
    : field

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
        onChange(
          eventOrVal.target.type === "checkbox"
            ? eventOrVal.target.checked
            : eventOrVal.target.value,
        )
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
          schema={effectiveField}
          field={fieldBinding}
          id={id}
          collection={collection}
          context={context as any}
        />
      </div>
    </div>
  )
}

