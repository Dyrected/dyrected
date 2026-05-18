import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDyrected } from "../../providers/dyrected-provider"
import { FormEngine } from "../../components/forms/form-engine"
import { useNavigate, useParams } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { cn } from "../../lib/utils"
import { Archive, Eye, EyeOff, Save } from "lucide-react"
import { LivePreviewPane } from "../../components/live-preview/LivePreviewPane"
import jexl from 'jexl'

export function EditEntryPage() {
  const { slug, id } = useParams()
  const { client } = useDyrected()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showPreview, setShowPreview] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
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

  const schema = schemas?.collections.find((c: any) => c.slug === slug)

  // Effect to default preview off if previewUrl is available
  useEffect(() => {
    if (schema?.admin?.previewUrl) {
      setShowPreview(false)
    }
  }, [schema])

  // Fetch entry data if in edit mode
  const { data: entry, isLoading: isEntryLoading } = useQuery({
    queryKey: ["entry", slug, id],
    queryFn: () => client!.collection(slug!).findOne(id!),
    enabled: !!client && isEdit,
  })

  useEffect(() => {
    if (entry) {
      setPreviewData(entry)
    }
  }, [entry])

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (isEdit) {
        return client!.collection(slug!).update(id!, data)
      } else {
        return client!.collection(slug!).create(data)
      }
    },
    onSuccess: (data: any) => {
      setIsDirty(false)
      queryClient.invalidateQueries({ queryKey: ["collection", slug] })
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ["entry", slug, id] })
      }

      toast.success(isEdit ? "Entry updated successfully" : "Entry created successfully", {
        description: `${schema.label || schema.slug} has been saved.`
      })

      if (!isEdit && data?.id) {
        navigate(`/collections/${slug}/edit/${data.id}`, { replace: true })
      }
    },
    onError: (error: any) => {
      toast.error("Failed to save entry", {
        description: error.message || "An unexpected error occurred."
      })
    }
  })

  if (!schema) return <div>Collection not found</div>
  if (isEdit && isEntryLoading) return <div>Loading entry...</div>

  const hasStatus = schema?.fields.some((f: any) => f.name === "status")
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

  const canCreate = (schema.access as any)?.create !== false
  const canUpdate = (schema.access as any)?.update !== false

  const handleFieldFocus = (path: string) => {
    const el = document.querySelector(`[data-dy-field="${path}"]`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const input = el.querySelector<HTMLElement>('input, textarea, [contenteditable], button[role="combobox"]')
    input?.focus()
  }

  return (
    <div className="dy-flex dy-h-[calc(100vh-0px)] dy-overflow-hidden dy--mt-6 dy--mx-4 lg:dy--mt-10 lg:dy--mx-6">
      {/* Left Column: Header + Form */}
      <div className={cn(
        "dy-flex-1 dy-overflow-y-auto dy-px-4 dy-py-6 md:dy-px-6 lg:dy-px-8 lg:dy-py-8 dy-transition-all dy-duration-500",
        showPreview ? "dy-max-w-2xl xl:dy-max-w-3xl" : "dy-max-w-4xl xl:dy-max-w-5xl dy-mx-auto dy-w-full"
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
                  {hasStatus && (
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
              {previewUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "dy-h-8 dy-w-8 dy-rounded-lg dy-transition-all",
                    showPreview
                      ? "dy-bg-white dy-text-primary dy-shadow-sm hover:dy-bg-white"
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
          <div className="dy-animate-in dy-space-y-8 dy-pb-20">
            {!canUpdate && isEdit && (
              <div className="dy-p-4 dy-rounded-lg dy-bg-amber-50 dy-border dy-border-amber-200 dy-text-amber-800 dy-text-sm dy-flex dy-items-center dy-gap-3">
                <Archive className="dy-h-4 dy-w-4" />
                You have read-only access to this collection.
              </div>
            )}
            <FormEngine
              collection={slug!}
              fields={schema.fields}
              defaultValues={entry}
              onSubmit={(data) => saveMutation.mutate(data)}
              onDataChange={(newData) => setPreviewData({ ...entry, ...newData })}
              onChange={(dirty) => setIsDirty(dirty)}
              isLoading={saveMutation.isPending}
              submitLabel={isEdit ? "Save Changes" : "Create Entry"}
              readOnly={isEdit ? !canUpdate : !canCreate}
            />
            <button id="dyrected-form-submit" type="submit" form="dyrected-edit-form" className="dy-hidden" />

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

      {/* Right Column: Preview (starts from top) */}
      {previewUrl && (
        <div className={cn(
          "dy-hidden lg:dy-block dy-border-l dy-border-border/50 dy-bg-muted/5 dy-transition-all dy-duration-500 dy-overflow-hidden",
          showPreview ? "dy-flex-1 dy-opacity-100" : "dy-w-0 dy-opacity-0 dy-border-l-0"
        )}>
          {/* We use negative margins to pull the preview up and out to the shell's padding edges if possible, 
              but since we're inside a parent with padding, we'll just make it height-full.
          */}
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
