import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDyrected } from "../../providers/dyrected-provider"
import { FormEngine } from "../../components/forms/form-engine"
import { useNavigate, useParams } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Archive, Eye, EyeOff } from "lucide-react"
import { LivePreviewPane } from "../../components/live-preview/LivePreviewPane"
import jexl from 'jexl'

export function EditEntryPage() {
  const { slug, id } = useParams()
  const { client } = useDyrected()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showPreview, setShowPreview] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
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

  // Fetch schema
  const { data: schemas } = useQuery({
    queryKey: ["schemas"],
    queryFn: () => client!.getSchemas(),
    enabled: !!client,
  })

  const schema = schemas?.collections.find((c: any) => c.slug === slug)

  // Fetch entry data if in edit mode
  const { data: entry, isLoading: isEntryLoading } = useQuery({
    queryKey: ["entry", slug, id],
    queryFn: () => client!.collection(slug!).findOne(id!),
    enabled: !!client && isEdit,
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (isEdit) {
        return client!.collection(slug!).update(id!, data)
      } else {
        return client!.collection(slug!).create(data)
      }
    },
    onSuccess: () => {
      setIsDirty(false)
      queryClient.invalidateQueries({ queryKey: ["collection", slug] })
      navigate(`/collections/${slug}`)
    },
  })

  if (!schema) return <div>Collection not found</div>
  if (isEdit && isEntryLoading) return <div>Loading entry...</div>

  const hasStatus = schema?.fields.some((f: any) => f.name === "status")
  const currentStatus = entry?.status || "draft"

  let previewUrl = typeof schema.admin?.previewUrl === 'function' 
    ? schema.admin.previewUrl(entry, { locale: 'en' }) 
    : schema.admin?.previewUrl

  if (typeof previewUrl === 'string' && previewUrl.includes('{{')) {
     previewUrl = previewUrl.replace(/{{(.*?)}}/g, (_, key) => entry?.[key.trim()] || "")
  } else if (typeof previewUrl === 'string' && entry) {
    try {
      // Provide current window origin to Jexl context so users can use it in expressions
      const context = { ...entry, siteUrl: window.location.origin };
      
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
    <div className={`space-y-8 animate-in ${previewUrl ? "max-w-[1600px]" : "max-w-6xl"} mx-auto px-6`}>
      <div className="flex items-center justify-between border-b border-border/50 pb-6">
        <div className="flex items-center gap-5">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-10 w-10 rounded-lg shadow-sm bg-white hover:bg-muted"
            onClick={() => navigate(`/collections/${slug}`)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {isEdit ? `Edit ${schema.label || schema.slug}` : `New ${schema.label || schema.slug}`}
              </h1>
              {hasStatus && (
                <Badge className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${currentStatus === "published" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200"}`} variant="outline">
                  {currentStatus === "published" ? "Live" : "Draft"}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEdit ? "Modify and update your content entry." : "Fill in the details to create a new entry."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {previewUrl && (
            <Button 
              variant="outline" 
              size="sm" 
              className={`gap-2 ${showPreview ? "bg-primary/10 text-primary border-primary/20" : ""}`}
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? "Hide Preview" : "Live Preview"}
            </Button>
          )}
          <Button 
            onClick={() => document.getElementById('dyrected-form-submit')?.click()}
            disabled={saveMutation.isPending || (isEdit ? !canUpdate : !canCreate)}
          >
            {saveMutation.isPending ? "Saving..." : (isEdit ? "Save Changes" : "Create Entry")}
          </Button>
        </div>
      </div>

      <div className={`grid gap-12 ${showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-12"}`}>
        <div className={`${showPreview ? "" : "lg:col-span-8"} space-y-6`}>
          <div className="animate-in space-y-8">
            {!canUpdate && isEdit && (
              <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-3">
                <Archive className="h-4 w-4" />
                You have read-only access to this collection.
              </div>
            )}
            <FormEngine 
              collection={slug!}
              fields={schema.fields} 
              defaultValues={entry}
              onSubmit={(data) => saveMutation.mutate(data)}
              onChange={(dirty) => setIsDirty(dirty)}
              isLoading={saveMutation.isPending}
              submitLabel={isEdit ? "Save Changes" : "Create Entry"}
              readOnly={isEdit ? !canUpdate : !canCreate}
            />
            <button id="dyrected-form-submit" type="submit" className="hidden" />

            {/* Document Meta moved here */}
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
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 text-nowrap">Last Updated</p>
                      <p className="text-xs font-medium text-muted-foreground/80">
                        {entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </>
                )}

                {hasStatus && (
                  <div className="space-y-1 max-w-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 text-nowrap">Publishing</p>
                    <p className="text-[10px] leading-tight text-muted-foreground/60 italic">
                      Workflow enabled. Set status to <strong>Published</strong> to go live.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {previewUrl && (
          <div className={`${showPreview ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none hidden"} transition-all duration-500 h-[calc(100vh-180px)] sticky top-8 rounded-2xl overflow-hidden border border-border/40 shadow-2xl`}>
            <LivePreviewPane 
              previewUrl={previewUrl} 
              data={entry} 
              mode={schema.admin?.previewMode} 
            />
          </div>
        )}
      </div>
    </div>
  )
}
