import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDyrected } from "@/providers/dyrected-provider"
import { FormEngine } from "@/components/forms/form-engine"
import { useNavigate, useParams } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(`/collections/${slug}`)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {isEdit ? `Edit ${schema.label || schema.slug} Entry` : `New ${schema.label || schema.slug} Entry`}
              </h1>
              {hasStatus && (
                <Badge variant={currentStatus === "published" ? "default" : "secondary"}>
                  {currentStatus === "published" ? "Published" : "Draft"}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isEdit ? "Update existing content." : "Create a new entry in this collection."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 rounded-lg border bg-card p-8 shadow-sm">
          <FormEngine 
            fields={schema.fields} 
            defaultValues={entry}
            onSubmit={(data) => saveMutation.mutate(data)}
            isLoading={saveMutation.isPending}
            submitLabel={isEdit ? "Update Entry" : "Create Entry"}
          />
        </div>

        {/* Publishing Sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
            <h3 className="font-semibold">Document Meta</h3>
            
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Entry ID</p>
                <code className="bg-muted px-2 py-1 rounded text-xs select-all">
                  {isEdit ? entry.id : "Unassigned"}
                </code>
              </div>
              
              {isEdit && entry.createdAt && (
                <div>
                  <p className="text-muted-foreground mb-1">Created</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
              
              {isEdit && entry.updatedAt && (
                <div>
                  <p className="text-muted-foreground mb-1">Last Updated</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(entry.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {hasStatus && (
             <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
               <h3 className="font-semibold flex items-center gap-2">
                 {currentStatus === "published" ? <Globe className="h-4 w-4 text-primary" /> : <Archive className="h-4 w-4 text-muted-foreground" />}
                 Status
               </h3>
               <p className="text-sm text-muted-foreground">
                 This schema supports publishing states. Change the status in the main form to publish or unpublish this entry.
               </p>
             </div>
          )}
        </div>
      </div>
    </div>
  )
}
