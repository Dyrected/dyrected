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
    <div className="dy-space-y-8 dy-max-w-5xl dy-mx-auto">
      <div className="dy-flex dy-items-center dy-justify-between dy-gap-4 dy-border-b dy-border-border/50 dy-pb-6">
        <div className="dy-flex dy-items-center dy-gap-4">
          <div className="dy-p-2 dy-bg-primary/10 dy-text-primary dy-rounded-lg dy-shrink-0">
            <Globe className="dy-h-5 dy-w-5" />
          </div>
          <div>
            <h1 className="dy-text-lg dy-font-serif dy-font-bold dy-tracking-tight dy-text-foreground dy-truncate">
              {schema.label || schema.slug}
            </h1>
            <p className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-widest dy-text-muted-foreground/40 dy-leading-none dy-mt-1">
              Global Configuration
            </p>
          </div>
        </div>

        <div className="dy-flex dy-items-center dy-gap-2">
          <Button
            size="icon"
            className="dy-h-9 dy-w-9 dy-rounded-lg dy-shadow-sm"
            onClick={() => document.getElementById('dyrected-form-submit')?.click()}
            disabled={saveMutation.isPending}
            title="Save Changes (⌘S)"
          >
            {saveMutation.isPending ? (
              <div className="dy-h-4 dy-w-4 dy-animate-spin dy-border-2 dy-border-current dy-border-t-transparent dy-rounded-full" />
            ) : (
              <Save className="dy-h-4 dy-w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="dy-animate-in dy-space-y-8 dy-pb-20">
        <FormEngine
          collection={slug!}
          fields={schema.fields}
          defaultValues={globalData || {}}
          onSubmit={(data) => saveMutation.mutate(data)}
          isLoading={saveMutation.isPending}
          onChange={(dirty) => setIsDirty(dirty)}
          submitLabel="Save Changes"
        />
        <button id="dyrected-form-submit" type="submit" form="dyrected-edit-form" className="dy-hidden" />
      </div>
    </div>
  )
}
