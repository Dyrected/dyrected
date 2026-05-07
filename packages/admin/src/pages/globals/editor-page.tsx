import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDyrected } from "@/providers/dyrected-provider"
import { FormEngine } from "@/components/forms/form-engine"
import { useParams } from "react-router-dom"
import { Globe } from "lucide-react"

export function GlobalEditorPage() {
  const { slug } = useParams()
  const { client } = useDyrected()
  const queryClient = useQueryClient()

  // Fetch schema
  const { data: schemas } = useQuery({
    queryKey: ["schemas"],
    queryFn: () => client!.getSchemas(),
    enabled: !!client,
  })

  const schema = schemas?.globals.find((g: any) => g.slug === slug)

  // Fetch global data
  const { data: globalData, isLoading: isGlobalLoading } = useQuery({
    queryKey: ["global", slug],
    queryFn: () => client!.getGlobal(slug!),
    enabled: !!client && !!slug,
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      return client!.updateGlobal(slug!, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global", slug] })
    },
  })

  if (!schema) return <div>Global schema not found for: {slug}</div>
  if (isGlobalLoading) return <div>Loading global settings...</div>

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 text-primary rounded-md">
          <Globe className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {schema.label || schema.slug}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage global settings across the site.
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-8 shadow-sm">
        <FormEngine 
          fields={schema.fields} 
          defaultValues={globalData || {}}
          onSubmit={(data) => saveMutation.mutate(data)}
          isLoading={saveMutation.isPending}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  )
}
