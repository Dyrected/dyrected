import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDyrected } from "@/providers/dyrected-provider"
import { FormEngine } from "@/components/forms/form-engine"
import { useNavigate, useParams } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(`/collections/${slug}`)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? `Edit ${schema.label || schema.slug} Entry` : `New ${schema.label || schema.slug} Entry`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? "Update existing content." : "Create a new entry in this collection."}
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-8 shadow-sm">
        <FormEngine 
          fields={schema.fields} 
          defaultValues={entry}
          onSubmit={(data) => saveMutation.mutate(data)}
          isLoading={saveMutation.isPending}
          submitLabel={isEdit ? "Update Entry" : "Create Entry"}
        />
      </div>
    </div>
  )
}
