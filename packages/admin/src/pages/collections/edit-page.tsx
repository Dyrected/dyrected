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

  // Effect to default preview if available
  useEffect(() => {
    if (schema?.admin?.previewUrl) {
      setShowPreview(true)
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

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden -mt-6 -mx-4 lg:-mt-10 lg:-mx-6">
      {/* Left Column: Header + Form */}
      <div className={cn(
        "flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-10 transition-all duration-500",
        showPreview ? "max-w-2xl xl:max-w-3xl" : "max-w-5xl mx-auto w-full"
      )}>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-muted shrink-0"
                onClick={() => navigate(`/collections/${slug}`)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-lg font-serif font-bold tracking-tight text-foreground truncate">
                    {isEdit ? `Edit ${schema.label || schema.slug}` : `New ${schema.label || schema.slug}`}
                  </h1>
                  {hasStatus && (
                    <Badge className={cn(
                      "px-2 py-0 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      currentStatus === "published" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"
                    )} variant="outline">
                      {currentStatus === "published" ? "Live" : "Draft"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {previewUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-lg transition-colors",
                    showPreview ? "bg-primary/10 text-primary hover:bg-primary/20" : "hover:bg-muted"
                  )}
                  onClick={() => setShowPreview(!showPreview)}
                  title={showPreview ? "Hide Preview" : "Live Preview"}
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              )}
              <Button
                size="icon"
                className="h-9 w-9 rounded-lg shadow-sm"
                onClick={() => document.getElementById('dyrected-form-submit')?.click()}
                disabled={saveMutation.isPending || (isEdit ? !canUpdate : !canCreate)}
                title={isEdit ? "Save Changes (⌘S)" : "Create Entry (⌘S)"}
              >
                {saveMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Form */}
          <div className="animate-in space-y-8 pb-20">
            {!canUpdate && isEdit && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-3">
                <Archive className="h-4 w-4" />
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
            <button id="dyrected-form-submit" type="submit" className="hidden" />

            {/* Document Meta */}
            <div className="pt-8 border-t border-border/40">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 text-nowrap">Document ID</p>
                  <code className="text-xs font-mono text-muted-foreground/80 select-all">
                    {isEdit ? id : "Pending..."}
                  </code>
                </div>

                {isEdit && (
                  <>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 text-nowrap">Created At</p>
                      <p className="text-xs font-medium text-muted-foreground/80">
                        {entry?.createdAt ? new Date(entry.createdAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 text-nowrap">Last Updated</p>
                      <p className="text-xs font-medium text-muted-foreground/80">
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
          "hidden lg:block border-l border-border/50 bg-muted/5 transition-all duration-500 overflow-hidden",
          showPreview ? "flex-1 opacity-100" : "w-0 opacity-0 border-l-0"
        )}>
          {/* We use negative margins to pull the preview up and out to the shell's padding edges if possible, 
              but since we're inside a parent with padding, we'll just make it height-full.
          */}
          <div className="h-full">
            <LivePreviewPane
              previewUrl={previewUrl}
              data={previewData || entry}
              mode={schema.admin?.previewMode}
            />
          </div>
        </div>
      )}
    </div>
  )
}
