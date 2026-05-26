import React, { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "../ui/form"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs"
import type { Field as FieldSchema, Block as BlockSchema } from "@dyrected/sdk"
import { buildSchemaShape, buildDefaultValues } from "./utils"
import { FormFieldRenderer } from "./form-field-renderer"
import { AlertCircle, Lock } from "lucide-react"
import { toast } from "sonner"

function getFlatErrors(
  errors: Record<string, unknown>,
  path: string = "",
): { path: string; message: string }[] {
  const result: { path: string; message: string }[] = []
  if (!errors) return result

  if (typeof errors === "object") {
    const asMsg = errors as { message?: string }
    if (typeof asMsg.message === "string") {
      result.push({ path, message: asMsg.message })
      return result
    }
    for (const key in errors) {
      if (Object.prototype.hasOwnProperty.call(errors, key)) {
        if (key === "ref" || key === "type") continue
        const nextPath = path ? `${path}.${key}` : key
        result.push(...getFlatErrors(errors[key] as Record<string, unknown>, nextPath))
      }
    }
  }
  return result
}

function formatPath(path: string): string {
  return path
    .split(".")
    .map((part) => {
      if (/^\d+$/.test(part)) {
        return `Item ${parseInt(part, 10) + 1}`
      }
      return part.charAt(0).toUpperCase() + part.slice(1).replace(/([A-Z])/g, " $1")
    })
    .join(" > ")
}

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

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    const draftKey = `dyrected_draft:${collection}:${defaultValues?.id || "global"}`
    localStorage.removeItem(draftKey)
    await onSubmit(data)
  }

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
  }, [form, onSubmit, readOnly, isLoading, collection, defaultValues])

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

  // ── Field layout ─────────────────────────────────────────────────────────────
  // In edit mode the password field is handled by the dedicated Change Password
  // section below, so we exclude it from the normal field list to avoid
  // rendering the old "Password Configuration" card inside a tab.
  const visibleFields = fields
    .filter((f) => !f.admin?.hidden)
    .filter((f) => {
      if (isEdit && (f.name === "password" || (f.type as string) === "password")) return false
      return true
    })
  const topFields = visibleFields.filter((f) => !f.admin?.tab)
  const tabbedFields = visibleFields.filter((f) => !!f.admin?.tab)

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
          <div className="dy-grid dy-gap-6">
            {topFields.map((field) => (
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
              <div className="dy-grid dy-gap-6 dy-pt-4">
                {tabGroups.get(tab)!.map((field) => (
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
        {visibleFields.map((field) => (
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
      <form
        id="dyrected-edit-form"
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="dy-space-y-8"
      >
        {/* Hidden fields */}
        {fields
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
