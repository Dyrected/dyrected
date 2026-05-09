import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDyrected } from "../../providers/dyrected-provider"
import { FormEngine } from "../../components/forms/form-engine"
import { useNavigate, useParams } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Globe, Archive, Eye, EyeOff } from "lucide-react"
import { LivePreviewPane } from "../../components/live-preview/LivePreviewPane"

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

  const previewUrl = typeof schema.admin?.previewUrl === 'function' 
    ? schema.admin.previewUrl(entry, { locale: 'en' }) 
    : schema.admin?.previewUrl

  const canCreate = (schema.access as any)?.create !== false
  const canUpdate = (schema.access as any)?.update !== false

  return (
    <div className="space-y-8 animate-in max-w-6xl mx-auto">
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
          <div className="animate-in">
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
          </div>
        </div>

        {showPreview && previewUrl ? (
          <div className="h-[calc(100vh-200px)] sticky top-8">
            <LivePreviewPane 
              previewUrl={previewUrl} 
              data={entry} 
              mode={schema.admin?.previewMode} 
            />
          </div>
        ) : (
          <div className="lg:col-span-4 space-y-8">
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">Document Meta</h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-muted-foreground/60">ID</span>
                  <code className="font-mono text-muted-foreground/80 select-all">
                    {isEdit ? id : "Pending..."}
                  </code>
                </div>
                
                {isEdit && (
                  <>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-muted-foreground/60">Created</span>
                      <span className="font-medium text-muted-foreground/80">
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-muted-foreground/60">Updated</span>
                      <span className="font-medium text-muted-foreground/80">
                        {entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {hasStatus && (
               <div className="p-5 rounded-lg bg-primary/[0.02] border border-primary/10 space-y-3">
                 <h3 className="font-bold text-xs flex items-center gap-2 text-primary/70">
                   {currentStatus === "published" ? <Globe className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                   Publishing Mode
                 </h3>
                 <p className="text-[11px] leading-relaxed text-muted-foreground/60">
                   This collection supports workflow states. Set the status to <strong>Published</strong> to make this entry visible.
                 </p>
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
