import * as React from "react"
import type { FormShell } from "@dyrected/core"
import { useDyrected } from "../../providers/dyrected-context"
import {
  AdminComponentErrorBoundary,
  AdminComponentFallback,
  warnMissingComponent,
} from "../admin-component-slot"
import {
  DocumentContext,
  type DocumentContextValue,
  type SubmitOptions,
  type SubmitResult,
} from "../../providers/document-context"
import { evaluateAccess } from "../../pages/collections/views/system-actions"
import { resolveFormComponent } from "../../pages/collections/forms/resolve-form-component"
import { collectSubmitErrors } from "../../pages/collections/forms/submit-errors"
import type { FormEngineHandle } from "./form-engine"

const FormEngine = React.lazy(async () => {
  const module = await import("./form-engine")
  return { default: module.FormEngine }
})

export interface DrawerDocumentFormProps {
  /** Slug of the collection being created or edited. */
  collection: string
  /** Serialized schema of that collection. */
  schema: { fields: any[]; admin?: any; access?: any; labels?: any }
  /** The saved document's ID when editing, `undefined` when creating. */
  documentId?: string
  defaultValues: Record<string, unknown>
  submitLabel: string
  /**
   * Saves the form. Throw to report a failure: the drawer swallows it for the
   * default form (the pipeline already showed a toast), and a custom form's
   * `submit()` returns it as `{ ok: false }`. Resolve with the saved document.
   */
  onSubmit: (data: Record<string, unknown>) => Promise<Record<string, unknown> | void>
}

/**
 * The form shown in a drawer or dialog (inline relationship creation): the
 * built-in form, or the collection's `createForm` / `editForm` with
 * `presentation: "drawer"`. `submit()` resolves to the caller's `onSubmit`
 * and never redirects; the drawer decides what happens next.
 */
export function DrawerDocumentForm({
  collection,
  schema,
  documentId,
  defaultValues,
  submitLabel,
  onSubmit,
}: DrawerDocumentFormProps) {
  const { components, user } = useDyrected()
  const mode = documentId ? "edit" : "create"
  const formEngineRef = React.useRef<FormEngineHandle | null>(null)
  const viaSubmitRef = React.useRef(false)
  const [useDefaultForm, setUseDefaultForm] = React.useState(false)

  const resolved = React.useMemo(
    () => resolveFormComponent(schema.admin?.components, mode, "drawer"),
    [mode, schema.admin?.components],
  )
  const FormComponent = resolved.key ? components?.forms?.[resolved.key] : undefined
  if (resolved.key && !FormComponent) warnMissingComponent("forms", resolved.key)
  const hasCustomForm = !!FormComponent && !useDefaultForm
  const shell: FormShell = hasCustomForm ? resolved.shell : "full"

  const permissions = React.useMemo(
    () => ({
      canCreate: evaluateAccess(schema.access?.create, user),
      canUpdate: evaluateAccess(schema.access?.update, user, defaultValues),
      canDelete: evaluateAccess(schema.access?.delete, user, defaultValues),
    }),
    [schema.access, user, defaultValues],
  )
  const canSave = mode === "edit" ? permissions.canUpdate : permissions.canCreate

  const submitDocument = React.useCallback(async (options: SubmitOptions = {}): Promise<SubmitResult> => {
    if (!canSave) {
      return { ok: false, errors: {}, error: new Error("You do not have permission to save this entry.") }
    }
    if (!formEngineRef.current) {
      return { ok: false, errors: {}, error: new Error("The editor is not ready yet.") }
    }
    viaSubmitRef.current = true
    try {
      const result = await formEngineRef.current.submitCurrentDraft({ overrides: options.overrides })
      return { ok: true, doc: (result ?? {}) as Record<string, any> }
    } catch (error) {
      return {
        ok: false,
        errors: collectSubmitErrors(error),
        error: error instanceof Error ? error : undefined,
      }
    } finally {
      viaSubmitRef.current = false
    }
  }, [canSave])

  // The drawer is closed by the caller, which owns what happens after a save.
  const handleSubmit = React.useCallback(async (data: Record<string, unknown>) => {
    try {
      return await onSubmit(data)
    } catch (error) {
      if (viaSubmitRef.current) throw error
      return undefined
    }
  }, [onSubmit])

  const documentContext = React.useMemo<DocumentContextValue>(() => ({
    mode,
    collection: schema,
    document: documentId ? (defaultValues as Record<string, any>) : undefined,
    isLoadingDocument: false,
    presentation: "drawer",
    permissions,
    urls: {
      list: `/collections/${collection}`,
      edit: documentId ? `/collections/${collection}/${documentId}/edit` : undefined,
    },
    submit: submitDocument,
    // The drawer owns its own close button.
    cancel: () => undefined,
  }), [mode, schema, documentId, defaultValues, permissions, collection, submitDocument])

  const body = hasCustomForm && FormComponent && resolved.key ? (
    <DocumentContext.Provider value={documentContext}>
      <AdminComponentErrorBoundary
        componentKey={resolved.key}
        slot="forms"
        onUseDefault={() => setUseDefaultForm(true)}
        useDefaultLabel="Use default form"
      >
        <React.Suspense fallback={<AdminComponentFallback />}>
          <FormComponent collection={collection} mode={mode} documentId={documentId} presentation="drawer" />
        </React.Suspense>
      </AdminComponentErrorBoundary>
    </DocumentContext.Provider>
  ) : undefined

  return (
    <React.Suspense fallback={<div className="dy-h-40 dy-rounded-md dy-border dy-border-dashed dy-border-border/70 dy-bg-muted/20" />}>
      <FormEngine
        ref={formEngineRef}
        collection={collection}
        fields={schema.fields}
        defaultValues={defaultValues}
        documentId={documentId}
        onSubmit={handleSubmit}
        submitLabel={submitLabel}
        hideSubmit={shell !== "full"}
        readOnly={!canSave}
        body={body}
      />
    </React.Suspense>
  )
}
