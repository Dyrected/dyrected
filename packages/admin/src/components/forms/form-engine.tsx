import React, { useEffect, useState, useMemo, useCallback } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "../ui/form"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs"
import type { Field as FieldSchema, Block as BlockSchema } from "@dyrected/sdk"
import { buildSchemaShape, buildDefaultValues, getFlatErrors, formatPath } from "./utils"
import { runHookSandboxed } from "./hooks-sandbox"
import { FormFieldRenderer } from "./form-field-renderer"
import { AlertCircle, Lock } from "lucide-react"
import { toast } from "sonner"

export type { FieldSchema, BlockSchema }

interface FormEngineProps {
  collection: string
  fields: FieldSchema[]
  defaultValues?: Record<string, unknown>
  onSubmit: (data: Record<string, unknown>) => void
  onChange?: (isDirty: boolean) => void
  isLoading?: boolean
  submitLabel?: string
  readOnly?: boolean
  onDataChange?: (data: Record<string, unknown>) => void
  /**
   * Controls the Change Password section visibility in edit mode.
   * - 'self'  → user editing their own account; requires oldPassword
   * - 'admin' → admin editing another user; no oldPassword needed
   * - null    → hide the section (non-admin editing someone else)
   */
  passwordChangeMode?: 'self' | 'admin' | null
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
  onDataChange,
  passwordChangeMode = null,
}: FormEngineProps) {
  const isEdit = !!defaultValues?.id
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, Array<{ label: string, value: any }>>>({})

  const resolvedFields = useMemo(() => {
    return fields.map((field) => {
      if (field.name && dynamicOptions[field.name]) {
        return {
          ...field,
          options: dynamicOptions[field.name],
        }
      }
      return field
    })
  }, [fields, dynamicOptions])

  const schemaShape = buildSchemaShape(fields, isEdit)

  const hasPassword = fields.some(
    (f) => f.name === "password" || (f.type as string) === "password",
  )

  // Password-change fields are tracked in the form state but submitted via the
  // dedicated /change-password endpoint (handled in edit-page). They are NOT
  // mixed into the normal PATCH payload.
  if (hasPassword && passwordChangeMode !== null) {
    schemaShape.oldPassword = z.string().optional()
    schemaShape.newPassword = z.string().optional()
    schemaShape.confirmPassword = z.string().optional()
  }

  let formSchema: z.ZodTypeAny = z.object(schemaShape)

  if (hasPassword && passwordChangeMode !== null) {
    formSchema = formSchema
      .refine(
        (data: Record<string, string | undefined>) => {
          if (data.newPassword && data.newPassword !== data.confirmPassword) return false
          return true
        },
        { message: "Passwords do not match", path: ["confirmPassword"] },
      )
      .refine(
        (data: Record<string, string | undefined>) => {
          // oldPassword only required when self (not admin bypass)
          if (passwordChangeMode === 'self' && data.newPassword && !data.oldPassword) return false
          return true
        },
        { message: "Current password is required to change password", path: ["oldPassword"] },
      )
      .refine(
        (data: Record<string, string | undefined>) => {
          if (data.newPassword && data.newPassword.length < 8) return false
          return true
        },
        { message: "Password must be at least 8 characters", path: ["newPassword"] },
      )
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaultValues(fields, defaultValues),
  })

  const { isDirty } = form.formState
  const flatErrors = getFlatErrors(form.formState.errors as Record<string, unknown>)

  useEffect(() => {
    if (flatErrors.length > 0 && form.formState.submitCount > 0) {
      console.warn("[Validation] Submission failed with errors:", form.formState.errors)
    }
  }, [form.formState.submitCount, flatErrors, form.formState.errors])

  useEffect(() => {
    onChange?.(isDirty)
  }, [isDirty, onChange])

  const watchedValues = useWatch({ control: form.control })

  const handleFormSubmit = useCallback(async (data: Record<string, unknown>) => {
    const draftKey = `dyrected_draft:${collection}:${defaultValues?.id || "global"}`
    localStorage.removeItem(draftKey)
    await onSubmit(data)
  }, [collection, defaultValues, onSubmit])

  // Cmd+S / Ctrl+S shortcut
  useEffect(() => {
    if (readOnly || isLoading) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        form.handleSubmit(handleFormSubmit)()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [form, onSubmit, readOnly, isLoading, collection, defaultValues, handleFormSubmit])

  const hasCheckedRef = React.useRef<string | null>(null)

  // Draft recovery
  useEffect(() => {
    const draftKey = `dyrected_draft:${collection}:${defaultValues?.id || "global"}`
    if (hasCheckedRef.current === draftKey) return
    hasCheckedRef.current = draftKey

    const savedDraft = localStorage.getItem(draftKey)
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)
        const cleanDefaultValues = buildDefaultValues(fields, defaultValues)
        const hasDiff = JSON.stringify(parsed) !== JSON.stringify(cleanDefaultValues)
        if (hasDiff) {
          toast("Unsaved draft found", {
            description: "Would you like to restore your unsaved changes?",
            action: {
              label: "Restore",
              onClick: () => {
                form.reset(parsed)
                toast.success("Draft restored!")
              },
            },
            cancel: {
              label: "Discard",
              onClick: () => {
                localStorage.removeItem(draftKey)
                toast.success("Draft discarded")
              },
            },
            duration: 10000,
          })
        }
      } catch (e) {
        console.error("Failed to parse draft", e)
      }
    }
  }, [collection, defaultValues, fields])

  // Autosave on dirty
  useEffect(() => {
    if (!isDirty) return
    const draftKey = `dyrected_draft:${collection}:${defaultValues?.id || "global"}`
    const handler = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(watchedValues))
    }, 1000)
    return () => clearTimeout(handler)
  }, [watchedValues, isDirty, collection, defaultValues])

  useEffect(() => {
    if (onDataChange) {
      const handler = setTimeout(() => {
        onDataChange(watchedValues as Record<string, unknown>)
      }, 100)
      return () => clearTimeout(handler)
    }
  }, [watchedValues, onDataChange])

  // ── Hook 1: onChange — computes derived field VALUES from sibling data ────────
  // e.g. auto-generate slug from title. Never touches options lists.
  useEffect(() => {
    let active = true
    async function runOnChangeHooks() {
      const updatedValues: Record<string, unknown> = {}
      let hasChanged = false

      for (const field of fields) {
        if (!field.name) continue
        const hook = field.admin?.hooks?.onChange
        if (!hook) continue

        const currentValue = watchedValues[field.name]
        let calculatedValue: unknown

        if (typeof hook === "function") {
          try {
            calculatedValue = hook({
              value: currentValue,
              siblingData: watchedValues,
              data: watchedValues,
              setValue: (val: unknown) => form.setValue(field.name as never, val as never, { shouldDirty: true }),
            })
          } catch (err) {
            console.error(`[dyrected/admin] Error running onChange hook for field "${field.name}":`, err)
          }
        } else if (typeof hook === "string") {
          calculatedValue = await runHookSandboxed(hook, currentValue, watchedValues, watchedValues)
        }

        if (active && calculatedValue !== undefined && calculatedValue !== currentValue) {
          updatedValues[field.name] = calculatedValue
          hasChanged = true
        }
      }

      if (active && hasChanged) {
        Object.entries(updatedValues).forEach(([name, val]) => {
          form.setValue(name as never, val as never, { shouldDirty: true })
        })
      }
    }

    runOnChangeHooks()
    return () => { active = false }
  }, [watchedValues, fields, form])

  // ── Hook 2: admin.hooks.options — computes dynamic OPTIONS for select fields ─
  // e.g. country → state cascading dropdown.
  // Completely separate from onChange: options never set a value, onChange never
  // sets available choices.
  useEffect(() => {
    let active = true

    async function runOptionsHooks() {
      for (const field of fields) {
        if (!field.name) continue
        if (field.type !== "select" && field.type !== "multiSelect" && field.type !== "radio") continue
        const hook = field.admin?.hooks?.options
        if (!hook) continue

        let newOptions: Array<string | { label: string; value: unknown }> = []
        try {
          if (typeof hook === "function") {
            newOptions = await hook({ siblingData: watchedValues, data: watchedValues })
          } else if (typeof hook === "string") {
            // Serialized hook received from /api/schemas — run inside the sandbox
            newOptions = await runHookSandboxed(hook, undefined, watchedValues, watchedValues) ?? []
          }
        } catch (err) {
          console.error(`[dyrected/admin] Error running options hook for field "${field.name}":`, err)
          continue
        }

        // Only update state when the options have actually changed (avoid re-render loops)
        const nextStr = JSON.stringify(newOptions)
        const prevStr = JSON.stringify(dynamicOptions[field.name])
        if (nextStr === prevStr) continue

        if (active) {
          // Normalize to { label, value } before storing to satisfy the state type
          const normalizedForState: Array<{ label: string; value: any }> = newOptions.map((o) =>
            typeof o === "string" ? { label: o, value: o } : { label: o.label, value: o.value }
          )
          setDynamicOptions((prev) => ({ ...prev, [field.name!]: normalizedForState }))
        }

        // Reset the field value if it is no longer a valid option in the new list
        const currentValue = watchedValues[field.name]
        const normalizedOpts = newOptions.map((o) => (typeof o === "string" ? o : o.value))
        const isValid = Array.isArray(currentValue)
          ? (currentValue as unknown[]).every((v) => normalizedOpts.includes(v))
          : normalizedOpts.includes(currentValue)

        if (!isValid && currentValue !== "" && currentValue !== undefined && currentValue !== null) {
          if (active) {
            form.setValue(
              field.name as never,
              (field.type === "multiSelect" ? [] : "") as never,
              { shouldDirty: true },
            )
          }
        }
      }
    }

    runOptionsHooks()
    return () => { active = false }
  }, [watchedValues, fields, form, dynamicOptions])

  // ── Field layout ─────────────────────────────────────────────────────────────
  // In edit mode the password field is handled by the dedicated Change Password
  // section below, so we exclude it from the normal field list to avoid
  // rendering the old "Password Configuration" card inside a tab.
  const visibleFields = resolvedFields
    .filter((f) => !f.admin?.hidden)
    .filter((f) => {
      if (isEdit && (f.name === "password" || (f.type as string) === "password")) return false
      return true
    })
  const topFields = visibleFields.filter((f) => !f.admin?.tab)
  const tabbedFields = visibleFields.filter((f) => !!f.admin?.tab)

  let fieldsContent: React.ReactNode

  const renderFieldColumn = (field: FieldSchema) => (
    <div
      key={field.name}
      className="dy-min-w-0 dy-px-3"
      style={{ width: field.admin?.width || "100%" }}
    >
      <FormFieldRenderer
        schema={field}
        basePath=""
        control={form.control}
        collection={collection}
      />
    </div>
  )

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

    const tabErrorsCount = new Map<string, number>()
    for (const tab of tabOrder) {
      const tabFields = tabGroups.get(tab) || []
      let errorCount = 0
      for (const field of tabFields) {
        errorCount += flatErrors.filter(
          (err) => err.path === field.name || err.path.startsWith(field.name + "."),
        ).length
      }
      tabErrorsCount.set(tab, errorCount)
    }

    fieldsContent = (
      <div className="dy-space-y-6">
        {topFields.length > 0 && (
          <div className="dy--mx-3 dy-flex dy-flex-wrap dy-gap-y-6">
            {topFields.map(renderFieldColumn)}
          </div>
        )}
        <Tabs defaultValue={tabOrder[0]}>
          <TabsList className="dy-mb-2">
            {tabOrder.map((tab) => {
              const errCount = tabErrorsCount.get(tab) || 0
              return (
                <TabsTrigger key={tab} value={tab} className="dy-relative dy-flex dy-items-center">
                  {tab}
                  {errCount > 0 && (
                    <span className="dy-ml-2 dy-flex dy-h-5 dy-w-5 dy-items-center dy-justify-center dy-rounded-full dy-bg-destructive dy-text-[10px] dy-font-semibold dy-text-destructive-foreground">
                      {errCount}
                    </span>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>
          {tabOrder.map((tab) => (
            <TabsContent key={tab} value={tab}>
              <div className="dy--mx-3 dy-flex dy-flex-wrap dy-gap-y-6 dy-pt-4">
                {tabGroups.get(tab)!.map(renderFieldColumn)}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    )
  } else {
    fieldsContent = (
      <div className="dy--mx-3 dy-flex dy-flex-wrap dy-gap-y-6">
        {visibleFields.map(renderFieldColumn)}
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        id="dyrected-edit-form"
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="dy-space-y-8"
      >
        {/* Hidden fields */}
        {resolvedFields
          .filter((f) => f.admin?.hidden)
          .map((field) => (
            <input
              key={field.name}
              type="hidden"
              {...form.register(field.name as Parameters<typeof form.register>[0])}
            />
          ))}

        {/* Global validation error summary */}
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
                    const el = (
                      document.querySelector(`[data-dy-field="${err.path}"]`) ||
                      document.querySelector(`[name="${err.path}"]`)
                    ) as HTMLElement | null
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center" })
                      const input =
                        el.querySelector<HTMLElement>(
                          'input, textarea, [contenteditable], button[role="combobox"]',
                        ) || el
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

        {/* ── Change Password Section (edit mode + auth collections only) ── */}
        {hasPassword && passwordChangeMode !== null && (
          <div className="dy-rounded-xl dy-border dy-border-border dy-p-5 dy-space-y-4">
            <div className="dy-flex dy-items-center dy-gap-2 dy-text-sm dy-font-semibold dy-text-muted-foreground dy-uppercase dy-tracking-wide">
              <Lock className="dy-h-4 dy-w-4" />
              Change Password
            </div>
            <p className="dy-text-xs dy-text-muted-foreground">
              {passwordChangeMode === 'admin'
                ? 'As an admin, you can reset this user\'s password without their current password.'
                : 'Leave these fields blank to keep the current password unchanged.'}
            </p>
            <div className="dy-grid dy-gap-4">
              {passwordChangeMode === 'self' && (
                <FormField
                  control={form.control}
                  name={"oldPassword" as Parameters<typeof form.control.register>[0]}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter current password"
                          autoComplete="current-password"
                          {...field}
                          value={(field.value as string) ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name={"newPassword" as Parameters<typeof form.control.register>[0]}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                        {...field}
                        value={(field.value as string) ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={"confirmPassword" as Parameters<typeof form.control.register>[0]}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Repeat new password"
                        autoComplete="new-password"
                        {...field}
                        value={(field.value as string) ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

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
