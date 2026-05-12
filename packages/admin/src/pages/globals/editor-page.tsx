import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useDyrected } from "../../providers/dyrected-provider"
import { FormEngine } from "../../components/forms/form-engine"
import { useParams } from "react-router-dom"
import { Globe, Save } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "../../components/ui/button"

export function GlobalEditorPage() {
  const { slug } = useParams()
  const { client } = useDyrected()
  const queryClient = useQueryClient()
  const [isDirty, setIsDirty] = useState(false)

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

  const schema = schemas?.globals.find((g: any) => g.slug === slug)

  // Fetch global data
  const { data: globalData, isLoading: isGlobalLoading } = useQuery({
    queryKey: ["global", slug],
    queryFn: () => client!.getGlobal(slug!),
    enabled: !!client && !!slug,
  })

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

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      return client!.updateGlobal(slug!, data)
    },
    onSuccess: () => {
      setIsDirty(false)
      queryClient.invalidateQueries({ queryKey: ["global", slug] })
      toast.success(`${schema.label || schema.slug} updated successfully`)
    },
    onError: (error: any) => {
      toast.error("Failed to update settings", {
        description: error.message
      })
    }
  })

  if (!schema) return <div>Global schema not found for: {slug}</div>
  if (isGlobalLoading) return <div>Loading global settings...</div>

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-serif font-bold tracking-tight text-foreground truncate">
              {schema.label || schema.slug}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 leading-none mt-1">
              Global Configuration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            className="h-9 w-9 rounded-lg shadow-sm"
            onClick={() => document.getElementById('dyrected-form-submit')?.click()}
            disabled={saveMutation.isPending}
            title="Save Changes (⌘S)"
          >
            {saveMutation.isPending ? (
              <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="animate-in space-y-8 pb-20">
        <FormEngine
          collection={slug!}
          fields={schema.fields}
          defaultValues={globalData || {}}
          onSubmit={(data) => saveMutation.mutate(data)}
          isLoading={saveMutation.isPending}
          onChange={(dirty) => setIsDirty(dirty)}
          submitLabel="Save Changes"
        />
        <button id="dyrected-form-submit" type="submit" className="hidden" />
      </div>
    </div>
  )
}
