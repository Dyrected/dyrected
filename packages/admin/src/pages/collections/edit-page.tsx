import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDyrected } from "../../providers/dyrected-provider"
import { FormEngine } from "../../components/forms/form-engine"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { cn, getMediaUrl } from "../../lib/utils"
import { Archive, Eye, EyeOff, Save, Volume2, FileIcon, Mail } from "lucide-react"
import { LivePreviewPane } from "../../components/live-preview/LivePreviewPane"
import { WorkflowPanel } from "../../components/workflow/WorkflowPanel"
import jexl from 'jexl'

export function EditEntryPage() {
  const { slug, id } = useParams()
  const [searchParams] = useSearchParams()
  const { client, user } = useDyrected()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showPreview, setShowPreview] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [previewData, setPreviewData] = useState<Record<string, unknown> | null>(null)
  const isEdit = !!id

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  // Cmd+S to save
  useEffect(() => {
    const handleSave = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        document.getElementById('dyrected-form-submit')?.click()
      }
    }
    window.addEventListener("keydown", handleSave)
    return () => window.removeEventListener("keydown", handleSave)
  }, [])

  // Fetch schema
  const { data: schemas } = useQuery({
    queryKey: ["schemas"],
    queryFn: () => client!.getSchemas(),
    enabled: !!client,
  })

  const schema = schemas?.collections.find((c: { slug: string }) => c.slug === slug)

  const [prevSchemaSlug, setPrevSchemaSlug] = useState<string | null>(null)
  if (schema && schema.slug !== prevSchemaSlug) {
    setPrevSchemaSlug(schema.slug)
    if (schema.admin?.previewUrl) {
      setShowPreview(false)
    }
  }

  // Fetch entry data if in edit mode
  const { data: entry, isLoading: isEntryLoading } = useQuery({
    queryKey: ["entry", slug, id],
    queryFn: () => client!.collection(slug!).findOne(id!),
    enabled: !!client && isEdit,
  })

  const [prevEntry, setPrevEntry] = useState<Record<string, unknown> | null>(null)
  if (entry && entry !== prevEntry) {
    setPrevEntry(entry)
    setPreviewData(entry)
  }

  // Password-change permissions
  // isSelf: the logged-in user is editing their own account
  // isAdminUser: the logged-in user has the admin role
  const isAdminUser = Array.isArray(user?.roles) && user.roles.includes('admin')
  const isSelf = !!user && !!id && (user.id === id || user.sub === id)
  // 'self'  → show oldPassword + newPassword + confirmPassword
  // 'admin' → show newPassword + confirmPassword only (admin bypass)
  // null    → hide the section entirely
  const passwordChangeMode: 'self' | 'admin' | null =
    schema?.auth
      ? isSelf
        ? 'self'
        : isAdminUser
          ? 'admin'
          : null
      : null

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { oldPassword, newPassword, confirmPassword, ...rest } = data as {
        oldPassword?: string
        newPassword?: string
        confirmPassword?: string
        [key: string]: unknown
      }

      const results: { doc?: unknown; passwordChanged?: boolean } = {}

      if (isEdit) {
        // 1. Normal field update (password fields stripped out)
        results.doc = await client!.collection(slug!).update(id!, rest)

        // 2. Dedicated password change — only if newPassword was supplied
        if (newPassword) {
          await client!.collection(slug!).changePassword(id!, {
            oldPassword,
            newPassword,
            confirmPassword: confirmPassword ?? "",
          })
          results.passwordChanged = true
        }
      } else {
        results.doc = await client!.collection(slug!).create(rest)
      }

      return results
    },
    onSuccess: (results) => {
      setIsDirty(false)
      queryClient.invalidateQueries({ queryKey: ["collection", slug] })
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ["entry", slug, id] })
      }

      toast.success(isEdit ? "Entry updated successfully" : "Entry created successfully", {
        description: `${schema.label || schema.slug} has been saved.`,
      })

      if (results.passwordChanged) {
        toast.success("Password changed successfully")
      }

      const doc = results.doc as { id?: string } | undefined
      if (!isEdit && doc?.id) {
        navigate(`/collections/${slug}/edit/${doc.id}`, { replace: true })
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to save entry", {
        description: error.message || "An unexpected error occurred.",
      })
    },
  })

  // Admin-initiated password reset — sends an email to the target user
  const [sendingReset, setSendingReset] = useState(false)
  const handleSendResetLink = async () => {
    if (!entry?.email) return
    setSendingReset(true)
    try {
      await client!.collection(slug!).sendResetLink(entry.email as string)
      toast.success("Reset link sent", {
        description: `A password reset email has been sent to ${entry.email}.`,
      })
    } catch (err: unknown) {
      toast.error("Failed to send reset link", {
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      })
    } finally {
      setSendingReset(false)
    }
  }

  if (!schema) return <div>Collection not found</div>
  if (isEdit && isEntryLoading) return <div>Loading entry...</div>

  // Workflow — available when the schema declares a workflow config and we
  // have an existing entry with a _workflow metadata object.
  const workflowConfig = (schema as any).workflow ?? null
  const workflowMeta = isEdit && entry ? (entry as any)._workflow ?? null : null

  const hasStatus = schema?.fields.some((f: { name: string }) => f.name === "status")
  const currentStatus = entry?.status || "draft"

  let previewUrl = typeof schema.admin?.previewUrl === 'function'
    ? schema.admin.previewUrl(previewData || entry, { locale: 'en' })
    : schema.admin?.previewUrl

  if (typeof previewUrl === 'string' && previewUrl.includes('{{')) {
    previewUrl = previewUrl.replace(/{{(.*?)}}/g, (_, key) => entry?.[key.trim()] || "")
  } else if (typeof previewUrl === 'string' && (previewData || entry)) {
    try {
      // Provide current window origin to Jexl context so users can use it in expressions
      const context = { ...(previewData || entry), siteUrl: window.location.origin };

      if (previewUrl.includes('+') || previewUrl.includes('?') || previewUrl.includes('==') || previewUrl.includes('siteUrl')) {
        previewUrl = jexl.evalSync(previewUrl, context)
      }
    } catch (e) {
      console.error("[PreviewDebug] Jexl Evaluation Failed:", e)
    }
  }

  // If the resolved URL is relative, prepend the current origin
  if (typeof previewUrl === 'string' && previewUrl.startsWith('/')) {
    previewUrl = `${window.location.origin}${previewUrl}`
  }

  // Evaluate collection-level read access
  const readAccess = (schema.access as Record<string, unknown> | undefined)?.read
  let canRead = true
  if (readAccess === false) {
    canRead = false
  } else if (typeof readAccess === 'string') {
    try {
      canRead = jexl.evalSync(readAccess, { user, ...(previewData || entry || {}) })
    } catch (e) {
      console.warn("Read access eval failed:", e)
    }
  }

  if (!canRead) {
    return (
      <div className="dy-flex dy-items-center dy-justify-center dy-h-[calc(100vh-200px)]">
        <div className="dy-text-center dy-space-y-3">
          <div className="dy-p-3 dy-bg-destructive/10 dy-text-destructive dy-rounded-full dy-w-12 dy-h-12 dy-mx-auto dy-flex dy-items-center dy-justify-center">
            <Archive className="dy-h-6 dy-w-6" />
          </div>
          <h3 className="dy-text-lg dy-font-bold">Access Denied</h3>
          <p className="dy-text-sm dy-text-muted-foreground">You do not have permission to view this entry.</p>
        </div>
      </div>
    )
  }

  const createAccess = (schema.access as Record<string, unknown> | undefined)?.create
  let canCreate = true
  if (createAccess === false) {
    canCreate = false
  } else if (typeof createAccess === 'string') {
    try {
      canCreate = jexl.evalSync(createAccess, { user })
    } catch (e) {
      console.warn("Create access eval failed:", e)
    }
  }

  const updateAccess = (schema.access as Record<string, unknown> | undefined)?.update
  let canUpdate = true
  if (updateAccess === false) {
    canUpdate = false
  } else if (typeof updateAccess === 'string') {
    try {
      canUpdate = jexl.evalSync(updateAccess, { user, ...(previewData || entry || {}) })
    } catch (e) {
      console.warn("Update access eval failed:", e)
    }
  }

  const handleFieldFocus = (path: string) => {
    const el = document.querySelector(`[data-dy-field="${path}"]`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const input = el.querySelector<HTMLElement>('input, textarea, [contenteditable], button[role="combobox"]')
    input?.focus()
  }

  return (
    <div className={cn("dy-flex dy--mt-6 dy--mb-6 dy--mx-4 lg:dy--mt-10 lg:dy--mb-10 lg:dy--mx-6", showPreview ? "dy-h-screen" : "")}>
      {/* Left Column: Header + Form */}
      <div className={cn(
        "dy-flex-1 dy-px-4 dy-py-6 md:dy-px-6 lg:dy-px-8 lg:dy-py-8 dy-transition-all dy-duration-500",
        showPreview ? "dy-max-w-2xl xl:dy-max-w-3xl dy-overflow-y-auto" : workflowConfig ? "dy-max-w-3xl xl:dy-max-w-4xl dy-mx-auto dy-w-full dy-overflow-y-auto" : "dy-max-w-4xl xl:dy-max-w-5xl dy-mx-auto dy-w-full dy-overflow-y-auto"
      )}>
        <div className="dy-space-y-6">
          {/* Header */}
          <div className="dy-flex dy-items-center dy-justify-between dy-gap-4 dy-border-b dy-border-muted/20 dy-pb-4">
            <div className="dy-flex dy-items-center dy-gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="dy-h-8 dy-w-8 dy-rounded-lg hover:dy-bg-muted dy-shrink-0"
                onClick={() => navigate(`/collections/${slug}`)}
              >
                <ChevronLeft className="dy-h-4 dy-w-4" />
              </Button>
              <div>
                <div className="dy-flex dy-items-center dy-gap-3">
                  <h1 className="dy-text-lg dy-font-serif dy-font-bold dy-tracking-tight dy-text-foreground dy-truncate">
                    {isEdit ? `Edit ${schema.label || schema.slug}` : `New ${schema.label || schema.slug}`}
                  </h1>
                  {/* Legacy status field badge (non-workflow) */}
                  {hasStatus && !workflowConfig && (
                    <Badge className={cn(
                      "dy-px-2 dy-py-0 dy-rounded-full dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider",
                      currentStatus === "published" ? "dy-bg-emerald-100 dy-text-emerald-700 dy-border-emerald-200" : "dy-bg-amber-100 dy-text-amber-700 dy-border-amber-200"
                    )} variant="outline">
                      {currentStatus === "published" ? "Live" : "Draft"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="dy-flex dy-items-center dy-gap-1.5 dy-bg-muted/20 dy-p-1 dy-rounded-xl dy-border dy-border-muted/30 dy-shadow-sm">
              {/* Send Reset Link — admin only, not when editing self */}
              {schema?.auth && isEdit && isAdminUser && !isSelf && entry?.email && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="dy-h-8 dy-w-8 dy-rounded-lg dy-text-muted-foreground hover:dy-bg-muted hover:dy-text-foreground dy-transition-all"
                  onClick={handleSendResetLink}
                  disabled={sendingReset}
                  title={`Send password reset link to ${entry.email}`}
                >
                  {sendingReset ? (
                    <div className="dy-h-3.5 dy-w-3.5 dy-animate-spin dy-border-2 dy-border-current dy-border-t-transparent dy-rounded-full" />
                  ) : (
                    <Mail className="dy-h-3.5 dy-w-3.5" />
                  )}
                </Button>
              )}
              {previewUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "dy-h-8 dy-w-8 dy-rounded-lg dy-transition-all",
                    showPreview
                      ? "dy-bg-background dy-text-primary dy-shadow-sm hover:dy-bg-background"
                      : "dy-text-muted-foreground hover:dy-bg-muted hover:dy-text-foreground"
                  )}
                  onClick={() => setShowPreview(!showPreview)}
                  title={showPreview ? "Hide Preview" : "Live Preview"}
                >
                  {showPreview ? <EyeOff className="dy-h-3.5 dy-w-3.5" /> : <Eye className="dy-h-3.5 dy-w-3.5" />}
                </Button>
              )}
              <Button
                size="icon"
                className="dy-h-8 dy-w-8 dy-rounded-lg dy-bg-primary dy-text-primary-foreground hover:dy-bg-primary/90 dy-transition-all dy-shadow-sm"
                onClick={() => document.getElementById('dyrected-form-submit')?.click()}
                disabled={saveMutation.isPending || (isEdit ? !canUpdate : !canCreate)}
                title={isEdit ? "Save Changes (⌘S)" : "Create Entry (⌘S)"}
              >
                {saveMutation.isPending ? (
                  <div className="dy-h-3.5 dy-w-3.5 dy-animate-spin dy-border-2 dy-border-current dy-border-t-transparent dy-rounded-full" />
                ) : (
                  <Save className="dy-h-3.5 dy-w-3.5" />
                )}
              </Button>
            </div>
          </div>

          {/* Form */}
          <div className="dy-animate-in dy-space-y-8 dy-pb-32">
            {!canUpdate && isEdit && (
              <div className="dy-p-4 dy-rounded-lg dy-bg-amber-50 dy-border dy-border-amber-200 dy-text-amber-800 dy-text-sm dy-flex dy-items-center dy-gap-3">
                <Archive className="dy-h-4 dy-w-4" />
                You have read-only access to this collection.
              </div>
            )}
            {schema.upload && (previewData || entry) && ((previewData || entry).filename || (previewData || entry).url) && (
              <div className="dy-p-5 dy-rounded-2xl dy-border dy-border-border/60 dy-bg-muted/10 dy-space-y-4">
                <div className="dy-flex dy-items-start dy-gap-4">
                  <div className="dy-flex-1 dy-space-y-1">
                    <p className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-widest dy-text-muted-foreground/80">Uploaded File</p>
                    <h3 className="dy-text-sm dy-font-bold dy-text-foreground dy-break-all">{(previewData || entry).filename}</h3>
                    <p className="dy-text-xs dy-text-muted-foreground">
                      {(previewData || entry).filesize ? `${(((previewData || entry).filesize || 0) / 1024).toFixed(1)} KB` : 'N/A Size'} • {(previewData || entry).mimeType || 'Unknown Type'}
                    </p>
                  </div>
                </div>

                <div className="dy-rounded-xl dy-overflow-hidden dy-border dy-border-border/40 dy-bg-checkered dy-flex dy-items-center dy-justify-center dy-p-4 dy-min-h-[160px] dy-max-h-[320px] dy-relative">
                  {(previewData || entry).mimeType?.startsWith("image/") ? (
                    <img
                      src={getMediaUrl(previewData || entry, client!.getBaseUrl())}
                      alt={(previewData || entry).alt || (previewData || entry).filename}
                      className="dy-object-contain dy-max-h-[280px] dy-rounded-lg dy-shadow-sm"
                    />
                  ) : (previewData || entry).mimeType?.startsWith("audio/") ? (
                    <div className="dy-w-full dy-max-w-md dy-bg-card dy-p-4 dy-rounded-xl dy-border dy-border-border/60 dy-shadow-sm dy-flex dy-flex-col dy-gap-3 dy-items-center">
                      <div className="dy-h-12 dy-w-12 dy-rounded-full dy-bg-primary/10 dy-flex dy-items-center dy-justify-center dy-text-primary">
                        <Volume2 className="dy-h-5 dy-w-5" />
                      </div>
                      <audio
                        src={getMediaUrl(previewData || entry, client!.getBaseUrl())}
                        controls
                        className="dy-w-full"
                      />
                    </div>
                  ) : (previewData || entry).mimeType?.startsWith("video/") ? (
                    <video
                      src={getMediaUrl(previewData || entry, client!.getBaseUrl())}
                      controls
                      className="dy-max-h-[280px] dy-w-full dy-rounded-lg dy-shadow-sm"
                    />
                  ) : (
                    <div className="dy-flex dy-flex-col dy-items-center dy-gap-2 dy-p-6">
                      <div className="dy-h-16 dy-w-16 dy-rounded-2xl dy-bg-primary/10 dy-flex dy-items-center dy-justify-center">
                        <FileIcon className="dy-h-8 dy-w-8 dy-text-primary" />
                      </div>
                      <span className="dy-text-xs dy-font-medium dy-text-muted-foreground">Preview not available</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {(() => {
              let fields = [...schema.fields];
              if (schema.upload) {
                const hasAlt = fields.some((f: { name: string }) => f.name === "alt");
                const hasCaption = fields.some((f: { name: string }) => f.name === "caption");
                const mediaFields = [];
                if (!hasAlt) {
                  mediaFields.push({
                    name: "alt",
                    type: "text",
                    label: "Alt Text",
                    admin: {
                      description: "Describe the image for accessibility/screen readers."
                    }
                  });
                }
                if (!hasCaption) {
                  mediaFields.push({
                    name: "caption",
                    type: "textarea",
                    label: "Caption",
                    admin: {
                      description: "Add a caption/description for this media file."
                    }
                  });
                }
                fields = [...mediaFields, ...fields];
              }
              // Merge query params as default values for new entries (e.g., from join field "Create new" button)
              const queryParamsDefaults: Record<string, unknown> = {}
              if (!isEdit) {
                searchParams.forEach((value, key) => {
                  queryParamsDefaults[key] = value
                })
              }

              return (
                <FormEngine
                  collection={slug!}
                  fields={fields}
                  defaultValues={isEdit ? entry : { ...queryParamsDefaults, ...entry }}
                  onSubmit={(data) => saveMutation.mutate(data)}
                  onDataChange={(newData) => setPreviewData({ ...entry, ...newData })}
                  onChange={(dirty) => setIsDirty(dirty)}
                  isLoading={saveMutation.isPending}
                  submitLabel={isEdit ? "Save Changes" : "Create Entry"}
                  readOnly={isEdit ? !canUpdate : !canCreate}
                  passwordChangeMode={isEdit ? passwordChangeMode : null}
                  documentId={id}
                />
              );
            })()}
            <button id="dyrected-form-submit" type="submit" form="dyrected-edit-form" className="dy-hidden" />

            {/* Sticky Save Bar */}
            {(isDirty || !isEdit) && (isEdit ? canUpdate : canCreate) && (
              <div className="dy-sticky dy-bottom-0 dy-left-0 dy-right-0 dy-z-20 dy-pointer-events-none">
                <div className="dy-pointer-events-auto dy-mx-auto dy-max-w-2xl dy-px-4 dy-pb-6">
                  <div className="dy-flex dy-items-center dy-justify-between dy-gap-3 dy-rounded-2xl dy-border dy-border-border/50 dy-bg-background/80 dy-backdrop-blur-xl dy-px-4 dy-py-3 dy-shadow-xl dy-shadow-black/10 dy-animate-in dy-slide-in-from-bottom-2 dy-fade-in dy-duration-200">
                    <p className="dy-text-sm dy-font-medium dy-text-muted-foreground">
                      {isEdit ? "You have unsaved changes" : `Create a new ${schema.label || schema.slug}`}
                    </p>
                    <Button
                      size="sm"
                      className="dy-h-9 dy-px-5 dy-rounded-xl dy-font-bold dy-bg-primary dy-text-primary-foreground hover:dy-bg-primary/90 dy-shadow-sm dy-shrink-0"
                      onClick={() => document.getElementById('dyrected-form-submit')?.click()}
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? (
                        <div className="dy-flex dy-items-center dy-gap-2">
                          <div className="dy-h-3.5 dy-w-3.5 dy-animate-spin dy-border-2 dy-border-current dy-border-t-transparent dy-rounded-full" />
                          Saving...
                        </div>
                      ) : (
                        <div className="dy-flex dy-items-center dy-gap-2">
                          <Save className="dy-h-3.5 dy-w-3.5" />
                          {isEdit ? "Save Changes" : "Create Entry"}
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Document Meta */}
            <div className="dy-pt-8 dy-border-t dy-border-border/40">
              <div className="dy-flex dy-flex-wrap dy-items-center dy-gap-x-8 dy-gap-y-4">
                <div className="dy-space-y-1">
                  <p className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground/40 dy-text-nowrap">Document ID</p>
                  <code className="dy-text-xs dy-font-mono dy-text-muted-foreground/80 dy-select-all">
                    {isEdit ? id : "Pending..."}
                  </code>
                </div>

                {isEdit && (
                  <>
                    <div className="dy-space-y-1">
                      <p className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground/40 dy-text-nowrap">Created At</p>
                      <p className="dy-text-xs dy-font-medium dy-text-muted-foreground/80">
                        {entry?.createdAt ? new Date(entry.createdAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div className="dy-space-y-1">
                      <p className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground/40 dy-text-nowrap">Last Updated</p>
                      <p className="dy-text-xs dy-font-medium dy-text-muted-foreground/80">
                        {entry?.updatedAt ? new Date(entry.updatedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Sidebar — shown instead of preview when workflow is active */}
      {workflowConfig && isEdit && workflowMeta && !showPreview && (
        <div className="dy-hidden lg:dy-block dy-w-72 dy-shrink-0 dy-border-l dy-border-border/50 dy-bg-muted/5 dy-px-4 dy-py-8 dy-overflow-y-auto">
          <WorkflowPanel
            collection={slug!}
            documentId={id!}
            workflowMeta={workflowMeta}
            workflowConfig={workflowConfig}
          />
        </div>
      )}

      {/* Right Column: Preview */}
      {previewUrl && (
        <div className={cn(
          "dy-hidden lg:dy-block dy-border-l dy-border-border/50 dy-bg-muted/5 dy-transition-all dy-duration-500 dy-overflow-hidden",
          showPreview ? "dy-flex-1 dy-opacity-100" : "dy-w-0 dy-opacity-0 dy-border-l-0"
        )}>
          <div className="dy-h-full">
            <LivePreviewPane
              previewUrl={previewUrl}
              data={previewData || entry}
              mode={schema.admin?.previewMode}
              onFieldFocus={handleFieldFocus}
            />
          </div>
        </div>
      )}
    </div>
  )
}
