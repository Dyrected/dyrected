import React, { useEffect, useState, useMemo, useCallback } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "../ui/form"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Tabs, TabsContent } from "../ui/tabs"
import type { Field as FieldSchema, Block as BlockSchema } from "@dyrected/sdk"
import { buildSchemaShape, buildDefaultValues, getFlatErrors, formatPath, resolveContainerPath } from "./utils"
import { runHookSandboxed } from "./hooks-sandbox"
import { FormFieldRenderer } from "./form-field-renderer"
import { AlertCircle, ChevronRight, Lock, Home } from "lucide-react"
import { toast } from "sonner"
import { useSearchParams } from "react-router-dom"
import { cn } from "../../lib/utils"
import { NestedEditorProvider, NestedEditorContext, useNestedEditor } from "./nested-editor-context"

export type { FieldSchema, BlockSchema }

/** Query-string key holding the active form tab (replace-navigated). */
const TAB_PARAM = "tab"

interface FormEngineProps {
  collection: string
  fields: FieldSchema[]
  defaultValues?: Record<string, unknown>
  onSubmit: (data: Record<string, unknown>) => void
  onChange?: (isDirty: boolean) => void
  isLoading?: boolean
  submitLabel?: string
  /**
   * Hide the inline submit button rendered at the end of the form. Use when the
   * host page provides its own save affordance (e.g. a docked bottom save bar).
   */
  hideSubmit?: boolean
  readOnly?: boolean
  onDataChange?: (data: Record<string, unknown>) => void
  /**
   * Controls the Change Password section visibility in edit mode.
   * - 'self'  → user editing their own account; requires oldPassword
   * - 'admin' → admin editing another user; no oldPassword needed
   * - null    → hide the section (non-admin editing someone else)
   */
  passwordChangeMode?: 'self' | 'admin' | null
  documentId?: string
  /**
   * Label for the implicit tab that collects fields without an `admin.tab`
   * when the form uses tabs. Typically the collection's singular label
   * (e.g. "Page"). Falls back to a capitalised collection slug.
   */
  defaultTabLabel?: string
}

function FormEngineInner({
  collection,
  fields,
  defaultValues = {},
  onSubmit,
  onChange,
  isLoading,
  submitLabel = "Save",
  hideSubmit = false,
  readOnly,
  onDataChange,
  passwordChangeMode = null,
  documentId,
  defaultTabLabel,
}: FormEngineProps) {
  const { activePath, navigateToPath, getStableId } = useNestedEditor()
  const [searchParams, setSearchParams] = useSearchParams()
  const isDrilledIn = activePath.length > 0
  const isEdit = !!defaultValues?.id
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, Array<{ label: string, value: unknown }>>>({})

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
  }, [collection, defaultValues, fields, form])

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
            calculatedValue = (hook as (args: {
              value: unknown
              siblingData: Record<string, unknown>
              data: Record<string, unknown>
              setValue: (value: unknown) => void
            }) => unknown)({
              value: currentValue,
              siblingData: watchedValues,
              data: watchedValues,
              setValue: (val: unknown) => {
                const setValueFn = form.setValue as unknown as (name: string, value: unknown, options?: { shouldDirty?: boolean }) => void
                setValueFn(field.name, val, { shouldDirty: true })
              },
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
          const normalizedForState: Array<{ label: string; value: unknown }> = newOptions.map((o) =>
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
  const showPasswordSection = hasPassword && passwordChangeMode !== null

  let fieldsContent: React.ReactNode

  const renderFieldColumn = (field: FieldSchema) => (
    <div
      key={field.name}
      className="dy-min-w-0 dy-px-3 dy-w-full sm:dy-w-[var(--field-w)]"
      style={{ '--field-w': field.admin?.width || "100%" } as React.CSSProperties}
    >
      <FormFieldRenderer
        schema={field}
        basePath=""
        control={form.control}
        collection={collection}
        documentId={documentId}
      />
    </div>
  )

  const renderChangePasswordSection = () => (
    <div className="dy-rounded-lg dy-border dy-border-border dy-p-5 dy-space-y-4">
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
  )

  const tabOrder: string[] = []
  const tabGroups = new Map<string, FieldSchema[]>()

  // When the form uses tabs, fields without an `admin.tab` are collected into a
  // leading tab named after the collection's singular label (e.g. "Page")
  // instead of floating above the tab bar.
  const defaultTab = defaultTabLabel || (collection.charAt(0).toUpperCase() + collection.slice(1))
  if (tabbedFields.length > 0 && (topFields.length > 0 || showPasswordSection)) {
    tabGroups.set(defaultTab, [...topFields])
    tabOrder.push(defaultTab)
  }

  for (const field of tabbedFields) {
    const tab = field.admin!.tab!
    if (!tabGroups.has(tab)) {
      tabGroups.set(tab, [])
      tabOrder.push(tab)
    }
    tabGroups.get(tab)!.push(field)
  }

  // When the editor drills into a nested container (via a preview click or the
  // error summary), resolve the tab that owns the drill-in root field. The
  // drilled-in sub-form lives inside that tab's <TabsContent>, which Radix only
  // mounts while the tab is active — so if the user is on another tab we must
  // switch to the owning one, otherwise only the breadcrumb shows.
  const drilledRootField = activePath[0]?.fieldName
  let drilledTab: string | undefined
  if (drilledRootField) {
    for (const [tab, tabFields] of tabGroups) {
      if (tabFields.some((f) => f.name === drilledRootField)) {
        drilledTab = tab
        break
      }
    }
  }

  // The active tab lives in the URL (?tab=…) so it survives drill-in/out and
  // reloads. Switching tabs replaces (no history spam) — only block drill-in
  // pushes history. Falls back to the first tab when the param is missing or
  // stale (e.g. a different collection, or a renamed tab).
  const urlTab = searchParams.get(TAB_PARAM)
  const activeTab = urlTab && tabOrder.includes(urlTab) ? urlTab : (tabOrder[0] || "")

  const setActiveTab = useCallback((tab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set(TAB_PARAM, tab)
      return next
    }, { replace: true })
  }, [setSearchParams])

  // Follow a drill-in into whichever tab owns the block so its <TabsContent>
  // (which Radix only mounts while active) is actually rendered.
  useEffect(() => {
    if (!drilledTab || activeTab === drilledTab) return
    setActiveTab(drilledTab)
  }, [drilledTab, activeTab, setActiveTab])

  const tabHidden = isDrilledIn

  if (tabbedFields.length > 0) {
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Compact underline tab bar, pinned at the top and horizontally
              scrollable on narrow screens. Hidden (but kept mounted) while
              drilled into a block so the active tab is preserved. */}
          <div className={cn("dy-mb-5 dy-overflow-x-auto dy-border-b dy-border-border", tabHidden && "dy-hidden")}>
            <div className="dy-flex dy-items-center dy-gap-5 dy-min-w-max">
              {tabOrder.map((tab) => {
                const errCount = tabErrorsCount.get(tab) || 0
                const isActive = tab === activeTab
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "dy-relative dy-flex dy-items-center dy-gap-1.5 dy-whitespace-nowrap dy-border-b-2 dy--mb-px dy-px-0.5 dy-py-2.5 dy-text-[13px] dy-font-medium dy-transition-colors",
                      isActive
                        ? "dy-border-primary dy-text-foreground"
                        : "dy-border-transparent dy-text-muted-foreground hover:dy-text-foreground",
                    )}
                  >
                    {tab}
                    {errCount > 0 && (
                      <span className="dy-flex dy-h-4 dy-min-w-4 dy-items-center dy-justify-center dy-rounded-full dy-bg-destructive dy-px-1 dy-text-[10px] dy-font-semibold dy-text-destructive-foreground">
                        {errCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          {tabOrder.map((tab) => (
            <TabsContent key={tab} value={tab}>
              <div className="dy--mx-3 dy-flex dy-flex-wrap dy-gap-y-6 dy-pt-2">
                {tabGroups.get(tab)!.map(renderFieldColumn)}
              </div>
              {tab === defaultTab && showPasswordSection && (
                <div className="dy-pt-6">
                  {renderChangePasswordSection()}
                </div>
              )}
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
    <>
      {/* Breadcrumb navigation — visible when drilled into a nested container */}
      {isDrilledIn && (
        <nav className="dy-flex dy-items-center dy-gap-1 dy-text-xs dy-text-muted-foreground dy-mb-4 dy-flex-wrap">
          <button
            type="button"
            className="dy-flex dy-items-center dy-gap-1 hover:dy-text-foreground dy-transition-colors"
            onClick={() => navigateToPath([])}
          >
            <Home className="dy-w-3 dy-h-3" />
            <span>Content</span>
          </button>
          {activePath.map((segment, idx) => (
            <React.Fragment key={segment.stableId ?? segment.basePath}>
              <ChevronRight className="dy-w-3 dy-h-3 dy-flex-shrink-0" />
              {idx === activePath.length - 1 ? (
                <span className="dy-font-semibold dy-text-foreground">{segment.breadcrumbLabel}</span>
              ) : (
                <button
                  type="button"
                  className="hover:dy-text-foreground dy-transition-colors"
                  onClick={() => navigateToPath(activePath.slice(0, idx + 1))}
                >
                  {segment.breadcrumbLabel}
                </button>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
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
            <div className="dy-p-4 dy-rounded-lg dy-bg-destructive/10 dy-border dy-border-destructive/20 dy-text-destructive dy-space-y-2">
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
                      // Navigate the nested editor to the field's container path first
                      const trail = resolveContainerPath(
                        resolvedFields,
                        err.path,
                        getStableId
                      )
                      if (trail && trail.length > 0) {
                        navigateToPath(trail)
                      }
                      // One-tick wait so the drilled-in sub-form mounts before scroll
                      setTimeout(() => {
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
                      }, 0)
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
          {showPasswordSection && tabbedFields.length === 0 && renderChangePasswordSection()}

          {!hideSubmit && (
            <div className="dy-flex dy-justify-end dy-gap-4">
              {!readOnly && (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : submitLabel}
                </Button>
              )}
            </div>
          )}
        </form>
      </Form>
    </>
  )
}

export function FormEngine(props: FormEngineProps) {
  // Reuse an ancestor provider (e.g. the edit page wraps both the form and the
  // live-preview pane in one provider so they share activePath + the field-array
  // registry). Only self-provide when rendered standalone.
  const existing = React.useContext(NestedEditorContext)
  if (existing) return <FormEngineInner {...props} />
  return (
    <NestedEditorProvider>
      <FormEngineInner {...props} />
    </NestedEditorProvider>
  )
}
