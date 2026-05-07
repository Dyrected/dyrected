import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDyrected } from "../../providers/dyrected-provider"
import { FormEngine } from "../../components/forms/form-engine"
import { useNavigate, useParams } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Calendar, Globe, Archive } from "lucide-react"

export function EditEntryPage() {
  const { slug, id } = useParams()
  const { client } = useDyrected()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = !!id

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
      queryClient.invalidateQueries({ queryKey: ["collection", slug] })
      navigate(`/collections/${slug}`)
    },
  })

  if (!schema) return <div>Collection not found</div>
  if (isEdit && isEntryLoading) return <div>Loading entry...</div>

  const hasStatus = schema?.fields.some((f: any) => f.name === "status")
  const currentStatus = entry?.status || "draft"

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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-xl border border-border/60 bg-white p-8 shadow-sm">
            <FormEngine 
              fields={schema.fields} 
              defaultValues={entry}
              onSubmit={(data) => saveMutation.mutate(data)}
              isLoading={saveMutation.isPending}
              submitLabel={isEdit ? "Save Changes" : "Create Entry"}
            />
          </div>
        </div>

        {/* Publishing Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-border/60 bg-white p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">Document Status</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                <span className="text-sm font-medium text-muted-foreground">ID</span>
                <code className="text-[10px] font-mono bg-white px-2 py-1 rounded border border-border/60 shadow-xs select-all">
                  {isEdit ? id : "Pending..."}
                </code>
              </div>
              
              {isEdit && (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                    <span className="text-sm font-medium text-muted-foreground">Created</span>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-semibold">{new Date(entry.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
                    <span className="text-sm font-medium text-muted-foreground">Updated</span>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-semibold">{new Date(entry.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {hasStatus && (
             <div className="rounded-xl border border-border/60 bg-primary/5 p-6 shadow-sm space-y-4 border-l-4 border-l-primary">
               <h3 className="font-bold flex items-center gap-2 text-primary">
                 {currentStatus === "published" ? <Globe className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                 Publishing Mode
               </h3>
               <p className="text-xs leading-relaxed text-muted-foreground">
                 This collection supports workflow states. Set the status to <strong>Published</strong> to make this entry visible on your public site.
               </p>
             </div>
          )}
        </div>
      </div>
    </div>
  )
}
