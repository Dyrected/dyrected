import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useDyrected } from "../../providers/dyrected-context"
import { useParams, useNavigate } from "react-router-dom"
import { Globe, Save, ArrowLeft } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "../../components/ui/button"
import { AdminEditorSkeleton } from "../../components/layout/admin-loading"
import { resolveAdminIcon } from "../../lib/admin-icons"
import { AdminNotFound } from "../../components/layout/admin-not-found"

const FormEngine = React.lazy(async () => {
  const module = await import("../../components/forms/form-engine")
  return { default: module.FormEngine }
})

export function GlobalEditorPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
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
  const { data: schemas, isLoading: isLoadingSchemas } = useQuery({
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
      queryClient.invalidateQueries({ queryKey: ["global", slug, "detail"] })
      toast.success(`${schema?.label || schema?.slug || "Global"} updated successfully`)
      navigate(`/globals/${slug}`)
    },
    onError: (error: any) => {
      toast.error("Failed to update settings", {
        description: error.message
      })
    }
  })

  if (isLoadingSchemas || !schemas) return <AdminEditorSkeleton className="dy-max-w-5xl dy-mx-auto" />
  if (!schema) {
    return (
      <AdminNotFound
        title="Global configuration not found"
        description={`We could not find a visible global called "${slug}". It may have been renamed, hidden, or removed from this admin.`}
        backTo="/"
      />
    )
  }
  if (isGlobalLoading) return <AdminEditorSkeleton className="dy-max-w-5xl dy-mx-auto" />

  return (
    <div className="dy-space-y-8 dy-max-w-5xl dy-mx-auto">
      <div className="dy-flex dy-items-center dy-justify-between dy-gap-4 dy-border-b dy-border-border/50 dy-pb-6">
        <div className="dy-flex dy-items-center dy-gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1)
              } else {
                navigate(`/globals/${slug}`)
              }
            }}
            className="dy-h-9 dy-w-9 dy-p-0 dy-text-muted-foreground hover:dy-text-foreground"
            title="Back"
          >
            <ArrowLeft className="dy-h-4 dy-w-4" />
          </Button>
          <div className="dy-p-2 dy-bg-primary/10 dy-text-primary dy-rounded-lg dy-shrink-0">
            {React.createElement(resolveAdminIcon(schema?.admin?.icon, Globe), { className: "dy-h-5 dy-w-5" })}
          </div>
          <div>
            <h1 className="dy-text-lg dy-font-serif dy-font-bold dy-tracking-tight dy-text-foreground dy-truncate">
              Edit {schema.label || schema.slug}
            </h1>
            <p className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-widest dy-text-muted-foreground/40 dy-leading-none dy-mt-1">
              Global Configuration
            </p>
          </div>
        </div>

        <div className="dy-flex dy-items-center dy-gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1)
              } else {
                navigate(`/globals/${slug}`)
              }
            }}
            className="dy-h-8 dy-gap-1.5 text-xs"
          >
            Cancel
          </Button>
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

      <div className="dy-animate-in dy-space-y-8 dy-pb-32">
        <React.Suspense fallback={<AdminEditorSkeleton />}>
          <FormEngine
            collection={slug!}
            fields={schema.fields}
            defaultValues={globalData || {}}
            onSubmit={(data) => saveMutation.mutate(data)}
            isLoading={saveMutation.isPending}
            onChange={(dirty) => setIsDirty(dirty)}
            submitLabel="Save Changes"
          />
        </React.Suspense>
        <button id="dyrected-form-submit" type="submit" form="dyrected-edit-form" className="dy-hidden" />

        {/* Sticky Save Bar */}
        {isDirty && (
          <div className="dy-sticky dy-bottom-0 dy-left-0 dy-right-0 dy-z-20 dy-pointer-events-none">
            <div className="dy-pointer-events-auto dy-mx-auto dy-max-w-2xl dy-px-4 dy-pb-6">
              <div className="dy-flex dy-items-center dy-justify-between dy-gap-3 dy-rounded-2xl dy-border dy-border-border/50 dy-bg-background/80 dy-backdrop-blur-xl dy-px-4 dy-py-3 dy-shadow-xl dy-shadow-black/10 dy-animate-in dy-slide-in-from-bottom-2 dy-fade-in dy-duration-200">
                <p className="dy-text-sm dy-font-medium dy-text-muted-foreground">
                  You have unsaved changes
                </p>
                <Button
                  size="sm"
                  className="dy-h-9 dy-px-5 dy-rounded-xl dy-font-bold dy-bg-primary dy-text-primary-foreground hover:dy-bg-primary/90 dy-shadow-sm dy-shrink-0"
                  onClick={() => document.getElementById('dyrected-form-submit')?.click()}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <div className="dy-flex dy-items-center dy-gap-2">
                      <div className="dy-h-3.5 dy-w-3.5 dy-animate-spin dy-border-2 dy-border-current dy-border-t-transparent dy-rounded-full" />
                      Saving...
                    </div>
                  ) : (
                    <div className="dy-flex dy-items-center dy-gap-2">
                      <Save className="dy-h-4 dy-w-4" />
                      Save Changes
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
