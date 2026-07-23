import { Suspense, lazy, useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDyrected } from "../../providers/dyrected-context"
import type { FormEngineHandle } from "../../components/forms/form-engine"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ChevronLeft, Plus, ChevronDown } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { cn, getMediaUrl, getDisplayFilename, getSiteUrl } from "../../lib/utils"
import { getWorkflowBadgePresentation, /*WORKFLOW_BADGE_COLORS */ } from "../../lib/workflow-badge"
import { resolvePreviewUrl } from "../../lib/preview-url"
import { Archive, Save, Volume2, FileIcon, Mail, GripVertical, Settings2, Workflow, Info, Eye, EyeOff, Pencil, History, Loader2, AlertCircle } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "../../components/ui/popover"
import { LivePreviewPane } from "../../components/live-preview/LivePreviewPane"
import { NestedEditorProvider, useNestedEditor } from "../../components/forms/nested-editor-context"
import { resolveContainerPath } from "../../components/forms/utils"
import { useSidebarControl } from "../../components/layout/sidebar-control"
import type { Field as FieldSchema, PaginatedResult } from "@dyrected/sdk"
import { WorkflowPanel } from "../../components/workflow/WorkflowPanel"
import { WorkflowTransitionSplitButton } from "../../components/workflow/workflow-transition-controls"
import { resolveDocumentTitle } from "../../lib/document-title"
import { DraftLiveCompareSheet } from "../../components/workflow/draft-live-compare-sheet"
import {
  resolveWorkflowAutosaveSettings,
  type WorkflowAutosaveState,
} from "../../lib/workflow-autosave"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../components/ui/command"
import jexl from 'jexl'
import { useLayoutPreference, type LayoutItem } from "../../hooks/useLayoutPreference"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useCallback, useMemo } from "react"
import { resolvePublishingStatus, resolveWorkflowState } from "../../lib/workflow-ui"
import { buildDraftLiveComparison } from "../../lib/draft-live-compare"
import type { WorkflowTransition } from "@dyrected/core"
import {
  AdminCommandListSkeleton,
  AdminEditorSkeleton,
  AdminSectionSkeleton,
} from "../../components/layout/admin-loading"
import { AdminNotFound } from "../../components/layout/admin-not-found"

const FormEngine = lazy(async () => {
  const module = await import("../../components/forms/form-engine")
  return { default: module.FormEngine }
})

function SortableFieldItem({
  id,
  label,
  type,
  width,
  onChangeWidth
}: {
  id: string
  label: string
  type: string
  width: string
  onChangeWidth: (newWidth: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "dy-flex dy-items-center dy-gap-3 dy-p-3 dy-bg-card dy-border dy-border-border/60 dy-rounded-xl dy-shadow-sm dy-transition-all",
        isDragging && "dy-opacity-50 dy-border-primary"
      )}
    >
      <div {...attributes} {...listeners} className="dy-cursor-grab active:dy-cursor-grabbing dy-text-muted-foreground/60 hover:dy-text-foreground dy-p-1">
        <GripVertical className="dy-h-4 dy-w-4" />
      </div>
      <div className="dy-flex-1 dy-min-w-0">
        <div className="dy-text-sm dy-font-semibold dy-text-foreground dy-truncate">{label}</div>
        <div className="dy-text-xs dy-text-muted-foreground">{id} • <span className="dy-uppercase">{type}</span></div>
      </div>
      <div className="dy-shrink-0">
        <select
          value={width || "100%"}
          onChange={(e) => onChangeWidth(e.target.value)}
          className="dy-text-[11px] dy-font-semibold dy-bg-muted/50 hover:dy-bg-muted dy-border dy-border-border/40 dy-rounded-lg dy-px-2 dy-py-1 dy-outline-none dy-cursor-pointer dy-transition-all"
        >
          <option value="25%">25%</option>
          <option value="33.33%">33%</option>
          <option value="50%">50%</option>
          <option value="66.66%">66%</option>
          <option value="75%">75%</option>
          <option value="100%">100%</option>
        </select>
      </div>
    </div>
  )
}

/**
 * A single top-bar action. It stays icon-only on smaller screens and expands to
 * an icon + label button on desktop so action meaning is visible without relying
 * on tooltips.
 */
function HeaderAction({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
  busy,
  title,
  className,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  busy?: boolean
  title?: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      aria-label={title || label}
      className={cn(
        "dy-inline-flex dy-h-9 dy-w-9 lg:dy-w-auto dy-items-center dy-justify-center lg:dy-justify-start lg:dy-gap-2 dy-rounded-lg lg:dy-px-3 dy-transition-all",
        active
          ? "dy-bg-muted dy-text-primary"
          : "dy-text-muted-foreground hover:dy-bg-muted/60 hover:dy-text-foreground",
        disabled && "dy-opacity-50 dy-pointer-events-none",
        className,
      )}
    >
      {busy ? (
        <span className="dy-h-4 dy-w-4 dy-animate-spin dy-rounded-full dy-border-2 dy-border-current dy-border-t-transparent" />
      ) : (
        <Icon className="dy-h-4 dy-w-4" />
      )}
      <span className="dy-hidden lg:dy-inline dy-text-xs dy-font-medium">
        {label}
      </span>
    </button>
  )
}

function DraftSaveStatusBadge({
  state,
}: {
  state: WorkflowAutosaveState
}) {
  const presentation = (() => {
    switch (state) {
      case "dirty":
        return {
          icon: Save,
          label: "Unsaved changes",
          className: "dy-text-amber-700 dy-bg-amber-50 dy-border-amber-200",
        }
      case "saving":
        return {
          icon: Loader2,
          label: "Saving...",
          className: "dy-text-sky-700 dy-bg-sky-50 dy-border-sky-200",
        }
      case "saved":
      case "idle":
        return {
          icon: Save,
          label: "Changes saved",
          className: "dy-text-emerald-700 dy-bg-emerald-50 dy-border-emerald-200",
        }
      case "conflict":
        return {
          icon: AlertCircle,
          label: "Refresh required",
          className: "dy-text-rose-700 dy-bg-rose-50 dy-border-rose-200",
        }
      case "error":
      default:
        return {
          icon: AlertCircle,
          label: "Save failed",
          className: "dy-text-rose-700 dy-bg-rose-50 dy-border-rose-200",
        }
    }
  })()

  const Icon = presentation.icon

  return (
    <div className={cn(
      "dy-inline-flex dy-items-center dy-gap-1.5 dy-rounded-full dy-border dy-px-2.5 dy-py-1 dy-text-[11px] dy-font-semibold",
      presentation.className,
    )}>
      <Icon className={cn("dy-h-3.5 dy-w-3.5", state === "saving" && "dy-animate-spin")} />
      <span>{presentation.label}</span>
    </div>
  )
}

/**
 * Live preview pane wired to the nested editor. On a preview iframe click,
 * resolves the clicked value path to its drillable container trail, navigates
 * the editor into that block, then (one tick later, once the sub-form mounts)
 * scrolls to and focuses the specific input.
 */
function PreviewPaneWithNav({
  previewUrl,
  data,
  mode,
  collectionSlug,
  documentId,
  fields,
  active,
  onFieldNavigate,
}: {
  previewUrl: string
  data: Record<string, unknown> | null
  mode?: 'postMessage' | 'token'
  collectionSlug?: string
  documentId?: string
  fields: FieldSchema[]
  /** True when the live preview pane is actually visible (not width-0). */
  active: boolean
  /**
   * Called just before the editor drills into a clicked field. On mobile the
   * form and preview share one column, so this lets the page swap back to the
   * form pane so the drilled-in field is actually visible.
   */
  onFieldNavigate?: () => void
}) {
  const { navigateToPath, getStableId } = useNestedEditor()

  // Auto-collapse the admin nav sidebar while the live preview is visible, and
  // restore the user's previous state when it's hidden or the page unmounts.
  const sidebar = useSidebarControl()
  const setCollapsed = sidebar?.setCollapsed
  const collapsedRef = useRef(sidebar?.collapsed ?? false)
  const savedCollapsedRef = useRef<boolean | null>(null)

  useEffect(() => {
    collapsedRef.current = sidebar?.collapsed ?? false
  }, [sidebar?.collapsed])

  useEffect(() => {
    if (!setCollapsed) return
    if (active) {
      if (savedCollapsedRef.current === null) {
        savedCollapsedRef.current = collapsedRef.current
        setCollapsed(true)
      }
    } else if (savedCollapsedRef.current !== null) {
      setCollapsed(savedCollapsedRef.current)
      savedCollapsedRef.current = null
    }
  }, [active, setCollapsed])

  useEffect(() => {
    return () => {
      if (setCollapsed && savedCollapsedRef.current !== null) {
        setCollapsed(savedCollapsedRef.current)
        savedCollapsedRef.current = null
      }
    }
  }, [setCollapsed])

  const handleFieldFocus = (path: string) => {
    onFieldNavigate?.()
    const trail = resolveContainerPath(fields, path, getStableId)
    if (trail && trail.length > 0) {
      navigateToPath(trail)
    }
    // One-tick wait so the drilled-in sub-form mounts before we scroll/focus.
    setTimeout(() => {
      const el = document.querySelector(`[data-dy-field="${path}"]`)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const input = el.querySelector<HTMLElement>('input, textarea, [contenteditable], button[role="combobox"]')
      input?.focus()
    }, 0)
  }

  return (
    <LivePreviewPane
      previewUrl={previewUrl}
      data={data}
      mode={mode}
      collectionSlug={collectionSlug}
      documentId={documentId}
      onFieldFocus={handleFieldFocus}
    />
  )
}

export function EditEntryPage() {
  const { slug, id } = useParams()
  const [searchParams] = useSearchParams()
  const { client, user } = useDyrected()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showPreview, setShowPreview] = useState(false)
  const [activeTab, setActiveTab] = useState<'edit' | 'workflow' | 'audit'>('edit')
  // Mobile only: the form and preview cannot sit side-by-side on a narrow
  // screen, so one pane is shown at a time. false = form, true = preview.
  const [mobilePreview, setMobilePreview] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [previewData, setPreviewData] = useState<Record<string, unknown> | null>(null)
  const [workflowAutosaveState, setWorkflowAutosaveState] = useState<WorkflowAutosaveState>("idle")
  const [workflowTransitionPending, setWorkflowTransitionPending] = useState(false)
  const [compareSheetOpen, setCompareSheetOpen] = useState(false)
  const [previewPaneWidth, setPreviewPaneWidth] = useState(62)
  const [isResizingPreview, setIsResizingPreview] = useState(false)
  const formEngineRef = useRef<FormEngineHandle | null>(null)
  const draftSavePromiseRef = useRef<Promise<{ doc?: unknown; passwordChanged?: boolean }> | null>(null)
  const splitPaneRef = useRef<HTMLDivElement | null>(null)
  const isEdit = !!id

  const [isConfiguringView, setIsConfiguringView] = useState(false)

  // Fetch schema
  const { data: schemas, isLoading: isLoadingSchemas } = useQuery({
    queryKey: ["schemas"],
    queryFn: () => client!.getSchemas(),
    enabled: !!client,
  })

  const schema = schemas?.collections.find((c: { slug: string }) => c.slug === slug)

  const fieldsList = useMemo(() => {
    if (!schema) return []
    let fields = [...schema.fields]
    if (schema.upload) {
      const hasAlt = fields.some((f: { name?: string }) => f.name === "alt")
      const hasCaption = fields.some((f: { name?: string }) => f.name === "caption")
      const mediaFields = []
      if (!hasAlt) {
        mediaFields.push({
          name: "alt",
          type: "text",
          label: "Alt Text",
          admin: {
            description: "Describe the image for accessibility/screen readers."
          }
        })
      }
      if (!hasCaption) {
        mediaFields.push({
          name: "caption",
          type: "textarea",
          label: "Caption",
          admin: {
            description: "Add a caption/description for this media file."
          }
        })
      }
      fields = [...mediaFields, ...fields]
    }
    return fields
  }, [schema])

  const defaultKeys = useMemo((): LayoutItem[] => {
    return fieldsList
      .filter((f: { name?: string }) => !!f.name)
      .map((f: { name?: string; admin?: { width?: string } }) => ({
        name: f.name!,
        width: f.admin?.width || "100%"
      }))
  }, [fieldsList])

  const {
    layout,
    setLayout,
    saveLayout,
    resetLayout,
    reconciledLayout,
    isLoading: isPreferenceLoading
  } = useLayoutPreference<LayoutItem>({ key: `layout:collections:${slug}:edit`, defaultKeys })

  const orderedFields = useMemo(() => {
    const fieldMap = new Map(fieldsList.map(f => [f.name, f]))
    const ordered: any[] = []
    for (const item of layout) {
      const field = fieldMap.get(item.name)
      if (field) {
        const overriddenField = {
          ...field,
          admin: {
            ...field.admin,
            width: item.width || field.admin?.width || "100%"
          }
        }
        ordered.push(overriddenField)
        fieldMap.delete(item.name)
      }
    }
    for (const field of fieldMap.values()) {
      ordered.push(field)
    }
    return ordered
  }, [fieldsList, layout])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setLayout((items) => {
      const oldIndex = items.findIndex(item => item.name === active.id)
      const newIndex = items.findIndex(item => item.name === over.id)
      if (oldIndex === -1 || newIndex === -1) return items
      return arrayMove(items, oldIndex, newIndex)
    })
  }

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

  const schemaSlug = schema?.slug
  const schemaPreviewUrl = schema?.admin?.previewUrl
  const syncShowPreview = useState(() => (next: boolean) => {
    setShowPreview((prev) => prev === next ? prev : next)
  })[0]

  useEffect(() => {
    if (!schemaSlug || !schemaPreviewUrl) return
    syncShowPreview(true) // Preview ON by default for pages with preview url
  }, [schemaSlug, schemaPreviewUrl, syncShowPreview])

  // Fetch entry data if in edit mode
  const { data: entry, isLoading: isEntryLoading } = useQuery({
    queryKey: ["entry", slug, id],
    queryFn: () => client!.collection(slug!).findOne(id!) as Promise<Record<string, any> | null>,
    enabled: !!client && isEdit,
  })
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch collection entries for the dropdown switcher
  const { data: siblingEntries, isLoading: isSiblingsLoading } = useQuery({
    queryKey: ["collection-siblings", slug, debouncedSearchQuery],
    queryFn: () =>
      client!.collection(slug!).find({
        limit: 50,
        search: debouncedSearchQuery || undefined,
      }).exec() as Promise<{ docs: Record<string, unknown>[] }>,
    enabled: !!client && !!slug && isEdit && switcherOpen,
  })
  const syncPreviewData = useState(() => (next: Record<string, unknown> | null) => {
    setPreviewData((prev) => prev === next ? prev : next)
  })[0]

  useEffect(() => {
    if (!entry) return
    syncPreviewData(entry)
  }, [entry, syncPreviewData])

  // Password-change permissions
  // isSelf: the logged-in user is editing their own account
  // isAdminUser: the logged-in user has the admin role
  const isAdminUser = Array.isArray(user?.roles) && user.roles.includes('admin')
  const isSelf = !!user && !!id && (user.id === id || user.sub === id)
  // 'self'  → show oldPassword + newPassword + confirmPassword
  // 'admin' → show newPassword + confirmPassword only (admin bypass)
  // null    → hide the section entirely
  const passwordChangeMode: 'self' | 'admin' | null =
    schema?.auth
      ? isSelf
        ? 'self'
        : isAdminUser
          ? 'admin'
          : null
      : null

  const saveMutation = useMutation({
    mutationFn: async ({
      data,
    }: {
      data: Record<string, unknown>
      mode: "manual" | "autosave" | "transition"
    }) => {
      const { oldPassword, newPassword, confirmPassword, ...rest } = data as {
        oldPassword?: string
        newPassword?: string
        confirmPassword?: string
        [key: string]: unknown
      }

      const results: { doc?: unknown; passwordChanged?: boolean } = {}

      if (isEdit) {
        // 1. Normal field update (password fields stripped out)
        results.doc = await client!.collection(slug!).update(id!, rest)

        // 2. Dedicated password change — only if newPassword was supplied
        if (newPassword) {
          await client!.collection(slug!).changePassword(id!, {
            oldPassword,
            newPassword,
            confirmPassword: confirmPassword ?? "",
          })
          results.passwordChanged = true
        }
      } else {
        results.doc = await client!.collection(slug!).create(rest)
      }

      return results
    },
    onSuccess: (results, variables) => {
      setIsDirty(false)
      queryClient.invalidateQueries({ queryKey: ["collection", slug] })
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ["entry", slug, id] })
      }

      if (variables.mode === "manual") {
        toast.success(isEdit ? "Entry updated successfully" : "Entry created successfully", {
          description: `${schema?.labels?.singular || schema?.slug} has been saved.`,
        })
      }

      if (results.passwordChanged && variables.mode === "manual") {
        toast.success("Password changed successfully")
      }

      const doc = results.doc as { id?: string } | undefined
      if (!isEdit && doc?.id) {
        navigate(`/collections/${slug}/edit/${doc.id}`, { replace: true })
      }
    },
    onError: (error: Error, variables) => {
      if (variables.mode === "autosave") return
      toast.error("Failed to save entry", {
        description: error.message || "An unexpected error occurred.",
      })
    },
  })

  // Workflow — available when the schema declares a workflow config and we
  // have an existing entry with a _workflow metadata object.
  const workflowConfig = (schema as any)?.workflow ?? null
  const workflowMeta = isEdit && entry ? (entry as any)._workflow ?? null : null

  const hasStatus = schema?.fields.some((f: { name?: string }) => f.name === "status")
  // const currentStatus = entry?.status || "draft"

  // Publishing badge. When the collection has a workflow (including one
  // synthesized from `drafts: true`), the source of truth is the workflow
  // state — a state flagged `published` renders "Live", anything else "Draft".
  // Collections without a workflow fall back to a plain `status` field.
  const workflowState = resolveWorkflowState(workflowConfig, workflowMeta)
  const publishingStatus = resolvePublishingStatus(schema, entry ?? {})
  /*const workflowBadgePresentation = publishingStatus
    ? {
      className: WORKFLOW_BADGE_COLORS[publishingStatus.color],
      style: undefined,
    }
    : workflowState
      ? getWorkflowBadgePresentation((workflowState as { color?: string }).color)
      : {
        className: currentStatus === "published"
          ? WORKFLOW_BADGE_COLORS.success
          : WORKFLOW_BADGE_COLORS.warning,
        style: undefined,
      }*/
  const workflowStagePresentation = workflowState && publishingStatus?.workflowStateLabel
    ? getWorkflowBadgePresentation((workflowState as { color?: string }).color)
    : null
  const showStatusBadge = workflowConfig ? !!workflowMeta : hasStatus

  const siteUrl = getSiteUrl(schemas?.admin?.siteUrl)
  const previewUrl = resolvePreviewUrl(schema?.admin?.previewUrl, previewData || entry, siteUrl)

  // Evaluate collection-level read access
  const readAccess = (schema?.access as Record<string, unknown> | undefined)?.read
  let canRead = true
  if (readAccess === false) {
    canRead = false
  } else if (typeof readAccess === 'string') {
    try {
      canRead = jexl.evalSync(readAccess, { user, ...(previewData || entry || {}) })
    } catch (e) {
      console.warn("Read access eval failed:", e)
    }
  }

  const createAccess = (schema?.access as Record<string, unknown> | undefined)?.create
  let canCreate = true
  if (createAccess === false) {
    canCreate = false
  } else if (typeof createAccess === 'string') {
    try {
      canCreate = jexl.evalSync(createAccess, { user })
    } catch (e) {
      console.warn("Create access eval failed:", e)
    }
  }

  const updateAccess = (schema?.access as Record<string, unknown> | undefined)?.update
  let canUpdate = true
  if (updateAccess === false) {
    canUpdate = false
  } else if (typeof updateAccess === 'string') {
    try {
      canUpdate = jexl.evalSync(updateAccess, { user, ...(previewData || entry || {}) })
    } catch (e) {
      console.warn("Update access eval failed:", e)
    }
  }

  // Evaluate collection-level audit log access
  const auditAccess = (schema?.access as any)?.readAudit ?? readAccess
  let canReadAudit = true
  if (auditAccess === false) {
    canReadAudit = false
  } else if (typeof auditAccess === 'string') {
    try {
      canReadAudit = jexl.evalSync(auditAccess, { user, ...(previewData || entry || {}) })
    } catch {
      canReadAudit = false
    }
  }

  const workflowAvailable = !!(workflowConfig && isEdit && workflowMeta)
  const liveSnapshot = (entry?.__published && typeof entry.__published === "object"
    ? entry.__published
    : null) as Record<string, unknown> | null
  const compareToLiveEnabled = workflowAvailable && !!liveSnapshot
  const compareToLiveReason = !workflowAvailable
    ? "Workflow is not enabled for this entry."
    : liveSnapshot
      ? null
      : "No live snapshot exists yet. Publish this entry once to compare future draft changes."
  const draftLiveComparison = useMemo(() => buildDraftLiveComparison({
    fields: orderedFields as FieldSchema[],
    draft: (previewData || entry || null) as Record<string, unknown> | null,
    live: liveSnapshot,
  }), [entry, liveSnapshot, orderedFields, previewData])
  const workflowAutosaveConfig = resolveWorkflowAutosaveSettings(schema)
  const workflowAutosaveEnabled = Boolean(
    isEdit
    && workflowAutosaveConfig.enabled
    && (schema?.workflow || schema?.drafts)
    && canUpdate,
  )
  const documentLabel = useMemo(() => (
    entry ? resolveDocumentTitle({
      entry,
      collection: schema,
      collections: schemas?.collections,
    }) : undefined
  ), [entry, schema, schemas?.collections])

  const persistDraft = useCallback((
    data: Record<string, unknown>,
    mode: "manual" | "autosave" | "transition",
  ) => {
    const promise = saveMutation.mutateAsync({ data, mode })
    draftSavePromiseRef.current = promise.finally(() => {
      if (draftSavePromiseRef.current === promise) {
        draftSavePromiseRef.current = null
      }
    })
    return promise
  }, [saveMutation])

  const handleManualSave = useCallback((data: Record<string, unknown>) => {
    return persistDraft(data, "manual")
  }, [persistDraft])

  const handleWorkflowAutosave = useCallback(async (data: Record<string, unknown>) => {
    await persistDraft(data, "autosave")
  }, [persistDraft])

  const autosaveConfig = useMemo(() => {
    if (!workflowAutosaveEnabled) return undefined

    return {
      enabled: true,
      delayMs: workflowAutosaveConfig.delayMs,
      onSave: handleWorkflowAutosave,
      onStatusChange: setWorkflowAutosaveState,
    }
  }, [handleWorkflowAutosave, workflowAutosaveConfig.delayMs, workflowAutosaveEnabled])

  const showWorkflowAutosaveStatus = workflowAutosaveEnabled && activeTab === "edit"
  const showManualSaveChrome = !workflowAutosaveEnabled
  const showLivePreview = activeTab === 'edit' && showPreview && !!previewUrl
  const showWorkflowSidebar = false
  const formPaneWidth = 100 - previewPaneWidth

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem("dyrected:edit-preview-width")
    if (!stored) return
    const parsed = Number(stored)
    if (Number.isFinite(parsed)) {
      setPreviewPaneWidth(Math.min(75, Math.max(35, parsed)))
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem("dyrected:edit-preview-width", String(previewPaneWidth))
  }, [previewPaneWidth])

  useEffect(() => {
    if (!isResizingPreview) return

    const handlePointerMove = (event: PointerEvent) => {
      const container = splitPaneRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      if (!rect.width) return
      const nextWidth = ((event.clientX - rect.left) / rect.width) * 100
      setPreviewPaneWidth(Math.min(75, Math.max(35, nextWidth)))
    }

    const stopResize = () => {
      setIsResizingPreview(false)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", stopResize)
    window.addEventListener("pointercancel", stopResize)

    return () => {
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", stopResize)
      window.removeEventListener("pointercancel", stopResize)
    }
  }, [isResizingPreview])

  const resolveTransitionContextFromDoc = useCallback((doc?: Record<string, unknown> | null) => {
    const resolvedDocumentId = String(doc?.id ?? id ?? "")
    const resolvedWorkflowMeta = (doc?._workflow ?? workflowMeta ?? null) as { revision?: number } | null
    const resolvedDocumentLabel = doc ? resolveDocumentTitle({
      entry: doc,
      collection: schema,
      collections: schemas?.collections,
    }) : documentLabel

    return {
      documentIds: resolvedDocumentId ? [resolvedDocumentId] : [],
      documentLabels: resolvedDocumentId
        ? { [resolvedDocumentId]: resolvedDocumentLabel }
        : undefined,
      expectedRevisions: resolvedDocumentId && typeof resolvedWorkflowMeta?.revision === "number"
        ? { [resolvedDocumentId]: resolvedWorkflowMeta.revision }
        : undefined,
      invalidateQueryKeys: resolvedDocumentId
        ? [
          ["entry", slug!, resolvedDocumentId],
          ["collection", slug!],
          ["workflow-history", slug!, resolvedDocumentId],
        ]
        : [["collection", slug!]],
    }
  }, [documentLabel, id, schema, schemas?.collections, slug, workflowMeta])

  const saveCurrentDraftNow = useCallback(async (
    mode: "manual" | "transition" = "manual",
  ) => {
    if (draftSavePromiseRef.current) {
      await draftSavePromiseRef.current
    }

    if (!formEngineRef.current) {
      throw new Error("The editor is not ready yet.")
    }

    const result = await formEngineRef.current.submitCurrentDraft()
    const savedDoc = ((result as { doc?: Record<string, unknown> } | undefined)?.doc ?? null) as Record<string, unknown> | null

    return {
      result,
      context: resolveTransitionContextFromDoc(savedDoc),
      mode,
    }
  }, [resolveTransitionContextFromDoc])

  const prepareWorkflowTransition = useCallback(async (_transition: WorkflowTransition) => {
    if (draftSavePromiseRef.current) {
      await draftSavePromiseRef.current
    }

    if (formEngineRef.current?.isDirty()) {
      const { context } = await saveCurrentDraftNow("transition")
      return context
    }

    return resolveTransitionContextFromDoc((entry ?? null) as Record<string, unknown> | null)
  }, [entry, resolveTransitionContextFromDoc, saveCurrentDraftNow])

  // Admin-initiated password reset — sends an email to the target user
  const [sendingReset, setSendingReset] = useState(false)
  const handleSendResetLink = async () => {
    if (!entry?.email) return
    setSendingReset(true)
    try {
      await client!.collection(slug!).sendResetLink(entry.email as string)
      toast.success("Reset link sent", {
        description: `A password reset email has been sent to ${entry.email}.`,
      })
    } catch (err: unknown) {
      toast.error("Failed to send reset link", {
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      })
    } finally {
      setSendingReset(false)
    }
  }

  if (isLoadingSchemas || !schemas) return <AdminEditorSkeleton />
  if (!schema) {
    return (
      <AdminNotFound
        title="Collection not found"
        description={`We could not find a visible collection called "${slug}". It may have been renamed, hidden, or removed from this admin.`}
        backTo="/"
      />
    )
  }
  if (isEdit && isEntryLoading) return <AdminEditorSkeleton />
  if (isEdit && !entry) {
    return (
      <AdminNotFound
        title="Entry not found"
        description={`We could not find this ${schema.labels?.singular || schema.slug} entry. It may have been deleted or the link may be out of date.`}
        backTo={`/collections/${slug}`}
        backLabel={`Back to ${schema.labels?.plural || schema.slug}`}
      />
    )
  }
  if (!canRead) {
    return (
      <div className="dy-flex dy-items-center dy-justify-center dy-h-[calc(100vh-200px)]">
        <div className="dy-text-center dy-space-y-3">
          <div className="dy-p-3 dy-bg-destructive/10 dy-text-destructive dy-rounded-full dy-w-12 dy-h-12 dy-mx-auto dy-flex dy-items-center dy-justify-center">
            <Archive className="dy-h-6 dy-w-6" />
          </div>
          <h3 className="dy-text-lg dy-font-bold">Access Denied</h3>
          <p className="dy-text-sm dy-text-muted-foreground">You do not have permission to view this entry.</p>
        </div>
      </div>
    )
  }


  const docsToDisplay = debouncedSearchQuery
    ? (siblingEntries?.docs || [])
    : (siblingEntries?.docs?.filter((d) => String(d.id) !== id).slice(0, 4) || [])

  return (
    <NestedEditorProvider drillInEnabled={!!showLivePreview}>
      <div key={id || "new"} className={cn("dy-flex dy-flex-col dy--mt-6 dy--mb-6 dy--mx-4 lg:dy--mt-10 lg:dy--mb-10 lg:dy--mx-6", showLivePreview ? "dy-h-screen" : "")}>
        {/* Top action bar — title/status on the left, actions on the right.
            Replaces the former far-right vertical rail. */}
        <div className="dy-flex dy-flex-wrap dy-shrink-0 dy-items-center dy-gap-2 dy-border-b dy-border-border/50 dy-bg-background dy-px-3 dy-py-2">
          <Button
            variant="ghost"
            size="icon"
            className="dy-h-9 dy-w-9 dy-rounded-lg hover:dy-bg-muted dy-shrink-0"
            onClick={() => navigate(`/collections/${slug}`)}
            title="Back to list"
          >
            <ChevronLeft className="dy-h-4 dy-w-4" />
          </Button>
          <div className="dy-flex dy-items-center dy-gap-2 dy-min-w-0">
            {isEdit ? (
              <>
                <span className="dy-text-base dy-font-serif dy-font-bold dy-tracking-tight dy-text-foreground dy-mr-0.5">
                  Edit
                </span>
                <Popover open={switcherOpen} onOpenChange={setSwitcherOpen}>
                  <PopoverTrigger className="dy-flex dy-items-center dy-gap-1 dy-text-base dy-font-serif dy-font-bold dy-tracking-tight dy-text-foreground hover:dy-bg-muted/80 dy-px-2 dy-py-1 dy-rounded-lg dy-transition-all dy-outline-none dy-min-w-0">
                    <span className="dy-truncate dy-max-w-[150px] sm:dy-max-w-none dy-inline-block">
                      {isEdit && entry ? resolveDocumentTitle({
                        entry,
                        collection: schema,
                        collections: schemas?.collections,
                      }) : "..."}
                    </span>
                    <ChevronDown className="dy-h-4 dy-w-4 dy-text-muted-foreground/80 dy-shrink-0" />
                  </PopoverTrigger>
                  <PopoverContent align="start" className="dy-w-64 dy-p-0 dy-z-[101]">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search entries..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      <CommandList>
                        {isSiblingsLoading ? (
                          <AdminCommandListSkeleton />
                        ) : docsToDisplay.length === 0 ? (
                          <CommandEmpty>No entries found.</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {docsToDisplay.map((sibling: Record<string, unknown>) => (
                              <CommandItem
                                key={sibling.id as string}
                                value={sibling.id as string}
                                onSelect={(val) => {
                                  navigate(`/collections/${slug}/edit/${val}`)
                                  setSwitcherOpen(false)
                                  setSearchQuery("")
                                }}
                                className="dy-cursor-pointer dy-py-2 dy-px-3 dy-rounded-lg"
                              >
                                <span className="dy-text-sm dy-text-foreground">{resolveDocumentTitle({
                                  entry: sibling,
                                  collection: schema,
                                  collections: schemas?.collections,
                                })}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </>
            ) : (
              <h1 className="dy-text-base dy-font-serif dy-font-bold dy-tracking-tight dy-text-foreground dy-truncate">
                New {schema?.labels?.singular || schema?.slug}
              </h1>
            )}
            {showStatusBadge && (
              <>
                {/* <Badge className={cn(
                  "dy-px-2 dy-py-0 dy-rounded-full dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider dy-shrink-0",
                  workflowBadgePresentation.className,
                )} style={workflowBadgePresentation.style} variant="outline">
                  {publishingStatus?.label ?? (currentStatus === "published" ? "Published" : "Draft")}
                </Badge> */}
                {publishingStatus?.workflowStateLabel && workflowStagePresentation && (
                  <Badge
                    className={cn(
                      "dy-px-2 dy-py-0 dy-rounded-full dy-text-[10px] dy-font-semibold dy-tracking-wide dy-shrink-0",
                      workflowStagePresentation.className,
                    )}
                    style={workflowStagePresentation.style}
                    variant="outline"
                  >
                    {publishingStatus.workflowStateLabel}
                  </Badge>
                )}
                {showWorkflowAutosaveStatus && (
                  <DraftSaveStatusBadge state={workflowAutosaveState} />
                )}
              </>
            )}
          </div>

          <div className="dy-ml-auto dy-flex dy-items-center dy-gap-1">
            {/* Mobile-only Edit/Preview switch — the two panes can't sit
                side-by-side on a phone, so this swaps between them. */}
            {showLivePreview && (
              <HeaderAction
                icon={mobilePreview ? Pencil : Eye}
                label={mobilePreview ? "Edit" : "Preview"}
                active={mobilePreview}
                title={mobilePreview ? "Back to the form" : "Show live preview"}
                onClick={() => setMobilePreview((v) => !v)}
                className="lg:dy-hidden"
              />
            )}
            {isEdit && canCreate && (
              <HeaderAction
                icon={Plus}
                label="New"
                title="Add new entry"
                onClick={() => navigate(`/collections/${slug}/new`)}
              />
            )}
            <HeaderAction
              icon={Settings2}
              label="View"
              active={isConfiguringView}
              title="Configure form layout"
              onClick={() => setIsConfiguringView(!isConfiguringView)}
            />
            {workflowAvailable && (
              <HeaderAction
                icon={Workflow}
                label="Workflow details"
                active={activeTab === "workflow"}
                title={activeTab === "workflow" ? "Hide workflow details" : "Show workflow details"}
                onClick={() => setActiveTab((tab) => tab === "workflow" ? "edit" : "workflow")}
              />
            )}
            {schema?.audit && isEdit && canReadAudit && (
              <HeaderAction
                icon={History}
                label="Audit Log"
                active={activeTab === "audit"}
                title={activeTab === "audit" ? "Hide Audit Log" : "Show Audit Log"}
                onClick={() => setActiveTab((tab) => tab === "audit" ? "edit" : "audit")}
              />
            )}
            {/* Desktop preview show/hide. On mobile the Edit/Preview switch above
                handles pane visibility, so this is hidden there. */}
            {previewUrl && activeTab === "edit" && (
              <HeaderAction
                icon={showPreview ? Eye : EyeOff}
                label="Preview"
                active={showPreview}
                title={showPreview ? "Hide preview" : "Show live preview"}
                onClick={() => setShowPreview((v) => !v)}
                className="dy-hidden lg:dy-flex"
              />
            )}
            {schema?.auth && isEdit && isAdminUser && !isSelf && entry?.email && (
              <HeaderAction
                icon={Mail}
                label="Reset password"
                busy={sendingReset}
                disabled={sendingReset}
                title={`Send password reset link to ${entry.email}`}
                onClick={handleSendResetLink}
              />
            )}
            {/* Document metadata popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="Document info"
                  aria-label="Document info"
                  className="dy-flex dy-h-9 dy-w-9 dy-items-center dy-justify-center dy-rounded-lg dy-transition-all dy-text-muted-foreground hover:dy-bg-muted/60 hover:dy-text-foreground"
                >
                  <Info className="dy-h-4 dy-w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="dy-w-64 dy-space-y-3">
                <div className="dy-space-y-1">
                  <p className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground/50">Document ID</p>
                  <code className="dy-text-xs dy-font-mono dy-text-muted-foreground/80 dy-select-all dy-break-all">
                    {isEdit ? id : "Pending…"}
                  </code>
                </div>
                {isEdit && (
                  <>
                    <div className="dy-space-y-1">
                      <p className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground/50">Created At</p>
                      <p className="dy-text-xs dy-font-medium dy-text-muted-foreground/80">
                        {entry?.createdAt ? new Date(entry.createdAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div className="dy-space-y-1">
                      <p className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider dy-text-muted-foreground/50">Last Updated</p>
                      <p className="dy-text-xs dy-font-medium dy-text-muted-foreground/80">
                        {entry?.updatedAt ? new Date(entry.updatedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </>
                )}
              </PopoverContent>
            </Popover>

            {(isEdit ? canUpdate : canCreate) && activeTab === "edit" && (
              /* Desktop save lives in the header. On mobile it moves to the
                 docked bottom save bar, so this is hidden below md. */
              <>
                {workflowAvailable && (
                  <WorkflowTransitionSplitButton
                    collection={slug!}
                    documentId={id!}
                    documentLabel={documentLabel}
                    workflowConfig={workflowConfig}
                    workflowMeta={workflowMeta}
                    onPendingChange={setWorkflowTransitionPending}
                    onSaveDraft={() => saveCurrentDraftNow("manual").then(() => undefined)}
                    saveDraftPending={saveMutation.isPending}
                    prepareTransition={prepareWorkflowTransition}
                    invalidateQueryKeys={[
                      ["entry", slug!, id!],
                      ["collection", slug!],
                      ["workflow-history", slug!, id!],
                    ]}
                  />
                )}
                {showManualSaveChrome && (
                  <div className="dy-hidden md:dy-flex dy-items-center">
                    <div className="dy-mx-1 dy-h-6 dy-w-px dy-bg-border/60" />
                    <Button
                      size="sm"
                      className="dy-h-9 dy-rounded-lg dy-px-4 dy-font-bold dy-bg-primary dy-text-primary-foreground hover:dy-bg-primary/90 dy-shadow-sm dy-shrink-0"
                      onClick={() => void saveCurrentDraftNow("manual")}
                      disabled={saveMutation.isPending}
                      title={isEdit ? "Save Changes (⌘S)" : "Create Entry (⌘S)"}
                    >
                      {saveMutation.isPending ? (
                        <span className="dy-flex dy-items-center dy-gap-2">
                          <span className="dy-h-3.5 dy-w-3.5 dy-animate-spin dy-rounded-full dy-border-2 dy-border-current dy-border-t-transparent" />
                          Saving…
                        </span>
                      ) : (
                        <span className="dy-flex dy-items-center dy-gap-2">
                          <Save className="dy-h-3.5 dy-w-3.5" />
                          {isEdit ? "Save" : "Create"}
                        </span>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content row: preview (left) + form + optional workflow sidebar */}
        <div
          ref={splitPaneRef}
          className={cn(
            "dy-flex dy-flex-1 dy-min-h-0",
            isResizingPreview && "dy-cursor-col-resize"
          )}
        >
          {/* Left Column: Preview (if active) */}
          {previewUrl && showLivePreview && (
            <div
              className={cn(
                "dy-border-r dy-border-border/50 dy-bg-muted/5 dy-transition-all dy-duration-500 dy-overflow-hidden lg:dy-block",
              // Desktop: side-by-side, width driven by the preview toggle.
                showLivePreview ? "lg:dy-flex-none lg:dy-opacity-100" : "lg:dy-w-0 lg:dy-opacity-0 lg:dy-border-r-0",
              // Mobile: single-pane. Full width only when the mobile Preview tab
              // is selected; otherwise fully hidden so the form gets the screen.
                mobilePreview && showLivePreview ? "dy-flex-1 dy-opacity-100" : "dy-hidden"
              )}
              style={showLivePreview ? { width: `${previewPaneWidth}%` } : undefined}
            >
              <div className="dy-h-full">
                <PreviewPaneWithNav
                  previewUrl={previewUrl}
                  data={previewData || entry}
                  mode={schema.admin?.previewMode}
                  collectionSlug={slug}
                  documentId={id && id !== "new" ? id : undefined}
                  fields={orderedFields}
                  active={!!showLivePreview}
                  onFieldNavigate={() => setMobilePreview(false)}
                />
              </div>
            </div>
          )}

          {showLivePreview && (
            <div
              className="dy-relative dy-hidden lg:dy-flex dy-w-3 dy-flex-none dy-items-center dy-justify-center dy-bg-background/70"
              aria-hidden="true"
            >
              <button
                type="button"
                className={cn(
                  "dy-flex dy-h-full dy-w-full dy-items-center dy-justify-center dy-cursor-col-resize dy-transition-colors hover:dy-bg-muted/50 focus-visible:dy-outline-none focus-visible:dy-ring-2 focus-visible:dy-ring-ring",
                  isResizingPreview && "dy-bg-muted/60"
                )}
                onPointerDown={(event) => {
                  event.preventDefault()
                  setIsResizingPreview(true)
                }}
                title="Resize preview"
                aria-label="Resize live preview"
              >
                <span className="dy-h-16 dy-w-1 dy-rounded-full dy-bg-border/80" />
              </button>
            </div>
          )}

          {/* Right Column: Header + Form */}
          <div className={cn(
            "dy-px-4 dy-py-6 md:dy-px-4 lg:dy-px-4 lg:dy-py-6 dy-transition-all dy-duration-500",
            showLivePreview ? "dy-flex-none dy-w-full dy-min-w-0 dy-overflow-y-auto" : showWorkflowSidebar ? "dy-flex-1 dy-max-w-3xl xl:dy-max-w-4xl dy-mx-auto dy-w-full dy-overflow-y-auto" : "dy-flex-1 dy-max-w-4xl xl:dy-max-w-5xl dy-mx-auto dy-w-full",
            // Mobile single-pane: yield the screen to the preview when selected.
            mobilePreview && showLivePreview ? "dy-hidden lg:dy-block" : ""
          )}
          style={showLivePreview ? { width: `calc(${formPaneWidth}% - 0.75rem)` } : undefined}
          >
            <div className="dy-space-y-4">
              {activeTab === "workflow" && workflowAvailable && (
                <div className="dy-animate-in dy-fade-in dy-duration-200 dy-max-w-3xl dy-mx-auto dy-py-6">
                  <WorkflowPanel
                    collection={slug!}
                    documentId={id!}
                    workflowMeta={workflowMeta}
                    workflowConfig={workflowConfig}
                    compareToLiveEnabled={compareToLiveEnabled}
                    compareToLiveReason={compareToLiveReason}
                    onCompareToLive={() => setCompareSheetOpen(true)}
                    onSaveDraft={() => saveCurrentDraftNow("manual").then(() => undefined)}
                    saveDraftPending={saveMutation.isPending}
                    prepareTransition={prepareWorkflowTransition}
                  />
                </div>
              )}

              {activeTab === "audit" && (
                <div className="dy-animate-in dy-fade-in dy-duration-200 dy-max-w-3xl dy-mx-auto dy-py-6">
                  <AuditPanel
                    collection={slug!}
                    documentId={id!}
                  />
                </div>
              )}

              {activeTab === "edit" && (
                <div className="dy-animate-in dy-space-y-8 dy-pb-32">
                  {!canUpdate && isEdit && (
                    <div className="dy-p-4 dy-rounded-lg dy-bg-amber-50 dy-border dy-border-amber-200 dy-text-amber-800 dy-text-sm dy-flex dy-items-center dy-gap-3">
                      <Archive className="dy-h-4 dy-w-4" />
                      You have read-only access to this collection.
                    </div>
                  )}
                  {schema.upload && (previewData || entry) && ((previewData || entry).filename || (previewData || entry).url) && (
                    <div className="dy-p-5 dy-rounded-2xl dy-border dy-border-border/60 dy-bg-muted/10 dy-space-y-4">
                      <div className="dy-flex dy-items-start dy-gap-4">
                        <div className="dy-flex-1 dy-space-y-1">
                          <p className="dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-widest dy-text-muted-foreground/80">Uploaded File</p>
                          <h3 className="dy-text-sm dy-font-bold dy-text-foreground dy-break-all">{getDisplayFilename((previewData || entry).filename)}</h3>
                          <p className="dy-text-xs dy-text-muted-foreground">
                            {(previewData || entry).filesize ? `${(((previewData || entry).filesize || 0) / 1024).toFixed(1)} KB` : 'N/A Size'} • {(previewData || entry).mimeType || 'Unknown Type'}
                          </p>
                        </div>
                      </div>

                      <div className="dy-rounded-xl dy-overflow-hidden dy-border dy-border-border/40 dy-bg-checkered dy-flex dy-items-center dy-justify-center dy-p-4 dy-min-h-[160px] dy-max-h-[320px] dy-relative">
                        {(previewData || entry).mimeType?.startsWith("image/") ? (
                          <img
                            src={getMediaUrl(previewData || entry, client!.getBaseUrl())}
                            alt={(previewData || entry).alt || (previewData || entry).filename}
                            className="dy-object-contain dy-max-h-[280px] dy-rounded-lg dy-shadow-sm"
                          />
                        ) : (previewData || entry).mimeType?.startsWith("audio/") ? (
                          <div className="dy-w-full dy-max-w-md dy-bg-card dy-p-4 dy-rounded-xl dy-border dy-border-border/60 dy-shadow-sm dy-flex dy-flex-col dy-gap-3 dy-items-center">
                            <div className="dy-h-12 dy-w-12 dy-rounded-full dy-bg-primary/10 dy-flex dy-items-center dy-justify-center dy-text-primary">
                              <Volume2 className="dy-h-5 dy-w-5" />
                            </div>
                            <audio
                              src={getMediaUrl(previewData || entry, client!.getBaseUrl())}
                              controls
                              className="dy-w-full"
                            />
                          </div>
                        ) : (previewData || entry).mimeType?.startsWith("video/") ? (
                          <video
                            src={getMediaUrl(previewData || entry, client!.getBaseUrl())}
                            controls
                            className="dy-max-h-[280px] dy-w-full dy-rounded-lg dy-shadow-sm"
                          />
                        ) : (
                          <div className="dy-flex dy-flex-col dy-items-center dy-gap-2 dy-p-6">
                            <div className="dy-h-16 dy-w-16 dy-rounded-2xl dy-bg-primary/10 dy-flex dy-items-center dy-justify-center">
                              <FileIcon className="dy-h-8 dy-w-8 dy-text-primary" />
                            </div>
                            <span className="dy-text-xs dy-font-medium dy-text-muted-foreground">Preview not available</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {isConfiguringView ? (
                    <div className="dy-space-y-6 ">
                      <div className="dy-p-4 dy-rounded-xl">
                        <p className="mb-2 dy-text-sm dy-text-muted-foreground">Drag and drop fields to reorder the form layout. Changes will be saved as your personal preference or global default.</p>
                        <div className="dy-space-y-2 dy-pr-1 dy-outline-none">
                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={layout.map(item => item.name)} strategy={verticalListSortingStrategy}>
                              <div className="dy-space-y-1.5">
                                {layout.map((item) => {
                                  const field = fieldsList.find(f => f.name === item.name)
                                  if (!field) return null
                                  return (
                                    <SortableFieldItem
                                      key={item.name}
                                      id={item.name}
                                      label={field.label || field.name}
                                      type={field.type}
                                      width={item.width || "100%"}
                                      onChangeWidth={(newWidth) => {
                                        setLayout((prev) =>
                                          prev.map((x) =>
                                            x.name === item.name ? { ...x, width: newWidth } : x
                                          )
                                        )
                                      }}
                                    />
                                  )
                                })}
                              </div>
                            </SortableContext>
                          </DndContext>
                        </div>
                      </div>

                      {/* Sticky Save Preferences Bar */}
                      <div className="dy-sticky dy-bottom-0 dy-left-0 dy-right-0 dy-z-20 dy-pointer-events-none">
                        <div className="dy-pointer-events-auto dy-mx-auto dy-max-w-2xl dy-px-4 dy-pb-6">
                          <div className="dy-flex dy-items-center dy-justify-between dy-gap-3 dy-rounded-2xl dy-border dy-border-border/50 dy-bg-background/80 dy-backdrop-blur-xl dy-px-4 dy-py-3 dy-shadow-xl dy-shadow-black/10 dy-animate-in dy-slide-in-from-bottom-2 dy-fade-in dy-duration-200">
                            <p className="dy-text-sm dy-font-medium dy-text-muted-foreground">
                              View
                            </p>
                            <div className="dy-flex dy-items-center dy-gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="dy-rounded-xl"
                                onClick={async () => {
                                  await resetLayout("personal")
                                  setIsConfiguringView(false)
                                  toast.success("Personal layout reset to default")
                                }}
                              >
                                Reset
                              </Button>
                              {isAdminUser && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="dy-rounded-xl"
                                  onClick={async () => {
                                    await saveLayout("global")
                                    setIsConfiguringView(false)
                                    toast.success("Saved for everyone successfully")
                                  }}
                                >
                                  Save for Everyone
                                </Button>
                              )}
                              <Button
                                size="sm"
                                className="dy-rounded-xl dy-bg-primary dy-text-primary-foreground"
                                onClick={async () => {
                                  await saveLayout("personal")
                                  setIsConfiguringView(false)
                                  toast.success("Saved for me successfully")
                                }}
                              >
                                Save for Me
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="dy-rounded-xl"
                                onClick={() => {
                                  setLayout(reconciledLayout)
                                  setIsConfiguringView(false)
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (() => {
                    // Merge query params as default values for new entries
                    const queryParamsDefaults: Record<string, unknown> = {}
                    if (!isEdit) {
                      searchParams.forEach((value, key) => {
                        queryParamsDefaults[key] = value
                      })
                    }

                    return (
                      <Suspense fallback={<div className="dy-h-64 dy-rounded-xl dy-border dy-border-dashed dy-border-border/70 dy-bg-muted/20" />}>
                        <FormEngine
                          ref={formEngineRef}
                          collection={slug!}
                          fields={orderedFields}
                          defaultValues={isEdit ? entry : { ...queryParamsDefaults, ...entry }}
                          onSubmit={handleManualSave}
                          autosave={autosaveConfig}
                          onDataChange={(newData) => setPreviewData({ ...entry, ...newData })}
                          onChange={(dirty) => setIsDirty(dirty)}
                          isLoading={saveMutation.isPending || workflowTransitionPending || isPreferenceLoading}
                          submitLabel={isEdit ? "Save Changes" : "Create Entry"}
                          hideSubmit
                          readOnly={isEdit ? !canUpdate : !canCreate}
                          passwordChangeMode={isEdit ? passwordChangeMode : null}
                          documentId={id}
                          defaultTabLabel={schema?.labels?.singular || 'General'}
                        />
                      </Suspense>
                    );
                  })()}
                  <button id="dyrected-form-submit" type="submit" form="dyrected-edit-form" className="dy-hidden" />

                  {/* Desktop save bar — floating pill, only surfaces when there
                      are changes to save. Hidden on mobile (see docked bar below). */}
                  {showManualSaveChrome && (isDirty || !isEdit) && (isEdit ? canUpdate : canCreate) && (
                    <div className="dy-hidden md:dy-block dy-sticky dy-bottom-0 dy-left-0 dy-right-0 dy-z-20 dy-pointer-events-none">
                      <div className="dy-pointer-events-auto dy-mx-auto dy-max-w-2xl dy-px-4 dy-pb-4">
                        <div className="dy-flex dy-items-center dy-justify-between dy-gap-3 dy-rounded-2xl dy-border dy-border-border/50 dy-bg-background/80 dy-backdrop-blur-xl dy-px-4 dy-py-3 dy-shadow-xl dy-shadow-black/10 dy-animate-in dy-slide-in-from-bottom-2 dy-fade-in dy-duration-200">
                          <p className="dy-text-sm dy-font-medium dy-text-muted-foreground">
                            {isEdit ? "You have unsaved changes" : `Create a new ${schema?.labels?.singular || schema?.slug}`}
                          </p>
                          <Button
                            size="sm"
                            className="dy-h-9 dy-px-5 dy-rounded-xl dy-font-bold dy-bg-primary dy-text-primary-foreground hover:dy-bg-primary/90 dy-shadow-sm dy-shrink-0"
                            onClick={() => void saveCurrentDraftNow("manual")}
                            disabled={saveMutation.isPending}
                          >
                            {saveMutation.isPending ? (
                              <div className="dy-flex dy-items-center dy-gap-2">
                                <div className="dy-h-3.5 dy-w-3.5 dy-animate-spin dy-border-2 dy-border-current dy-border-t-transparent dy-rounded-full" />
                                Saving...
                              </div>
                            ) : (
                              <div className="dy-flex dy-items-center dy-gap-2">
                                <Save className="dy-h-3.5 dy-w-3.5" />
                                {isEdit ? "Save Changes" : "Create Entry"}
                              </div>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mobile save bar — docked to the bottom edge like a native
                      app action bar. Always present while the entry is editable,
                      but the button stays disabled until there is something to
                      save. This is the only save affordance on mobile. */}
                  {showManualSaveChrome && (isEdit ? canUpdate : canCreate) && (
                    <div className="md:dy-hidden dy-sticky dy-bottom-0 dy-left-0 dy-right-0 dy-z-20 dy-border-t dy-border-border dy-bg-background/95 dy-backdrop-blur-sm dy-px-4 dy-py-3">
                      <Button
                        className="dy-w-full dy-h-11 dy-rounded-xl dy-font-bold dy-bg-primary dy-text-primary-foreground hover:dy-bg-primary/90 dy-shadow-sm"
                        onClick={() => void saveCurrentDraftNow("manual")}
                        disabled={saveMutation.isPending || !(isDirty || !isEdit)}
                      >
                        {saveMutation.isPending ? (
                          <span className="dy-flex dy-items-center dy-gap-2">
                            <span className="dy-h-4 dy-w-4 dy-animate-spin dy-border-2 dy-border-current dy-border-t-transparent dy-rounded-full" />
                            Saving...
                          </span>
                        ) : (
                          <span className="dy-flex dy-items-center dy-gap-2">
                            <Save className="dy-h-4 dy-w-4" />
                            {isEdit ? "Save Changes" : "Create Entry"}
                          </span>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      {workflowAvailable && compareToLiveEnabled && (
        <DraftLiveCompareSheet
          open={compareSheetOpen}
          onOpenChange={setCompareSheetOpen}
          comparison={draftLiveComparison}
        />
      )}
    </NestedEditorProvider>
  )
}

interface AuditEntry {
  id: string
  operation: string
  user: string | null
  timestamp: string
  changes: string
}

function AuditPanel({ collection, documentId }: { collection: string; documentId: string }) {
  const { client } = useDyrected()

  const { data: auditData, isLoading } = useQuery({
    queryKey: ["audit-log", collection, documentId],
    queryFn: async () => {
      const result = await client!.collectionAudit(collection, {
        where: { documentId }
      })
      return result as PaginatedResult<AuditEntry>
    },
  })

  if (isLoading) {
    return (
      <AdminSectionSkeleton className="dy-py-2" rows={3} />
    )
  }

  const logs = auditData?.docs || []

  if (logs.length === 0) {
    return (
      <div className="dy-text-center dy-py-12 dy-text-muted-foreground dy-text-sm">
        No audit logs found for this document.
      </div>
    )
  }

  return (
    <div className="dy-space-y-6">
      <div className="dy-flex dy-items-center dy-justify-between">
        <h2 className="dy-text-lg dy-font-bold">Audit History</h2>
      </div>
      <div className="dy-space-y-4">
        {logs.map((log) => {
          let changeDetails = null
          try {
            const parsed = JSON.parse(log.changes)
            const before = parsed.before || {}
            const after = parsed.after || {}
            const diffs: { field: string; from: unknown; to: unknown }[] = []

            const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
            for (const key of allKeys) {
              if (["updatedAt", "updatedBy", "createdAt", "createdBy", "id"].includes(key)) continue
              if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
                diffs.push({ field: key, from: before[key], to: after[key] })
              }
            }

            if (diffs.length > 0) {
              changeDetails = (
                <div className="dy-mt-3 dy-overflow-x-auto dy-rounded-lg dy-border dy-border-border/40">
                  <table className="dy-w-full dy-text-left dy-text-xs">
                    <thead>
                      <tr className="dy-bg-muted/40 dy-border-b dy-border-border/40">
                        <th className="dy-px-3 dy-py-2 dy-font-semibold dy-text-muted-foreground">Field</th>
                        <th className="dy-px-3 dy-py-2 dy-font-semibold dy-text-muted-foreground">Before</th>
                        <th className="dy-px-3 dy-py-2 dy-font-semibold dy-text-muted-foreground">After</th>
                      </tr>
                    </thead>
                    <tbody className="dy-divide-y dy-divide-border/30">
                      {diffs.map((diff) => (
                        <tr key={diff.field}>
                          <td className="dy-px-3 dy-py-2 dy-font-mono dy-font-semibold dy-text-foreground">{diff.field}</td>
                          <td className="dy-px-3 dy-py-2 dy-text-muted-foreground dy-max-w-[200px] dy-truncate" title={JSON.stringify(diff.from)}>
                            {diff.from === null || diff.from === undefined ? (
                              <span className="dy-italic dy-text-muted-foreground/40">empty</span>
                            ) : typeof diff.from === "object" ? (
                              JSON.stringify(diff.from)
                            ) : (
                              String(diff.from)
                            )}
                          </td>
                          <td className="dy-px-3 dy-py-2 dy-text-foreground dy-max-w-[200px] dy-truncate" title={JSON.stringify(diff.to)}>
                            {diff.to === null || diff.to === undefined ? (
                              <span className="dy-italic dy-text-muted-foreground/40">empty</span>
                            ) : typeof diff.to === "object" ? (
                              JSON.stringify(diff.to)
                            ) : (
                              String(diff.to)
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          } catch {
            // Ignore parse errors
          }

          return (
            <div key={log.id} className="dy-p-5 dy-rounded-2xl dy-border dy-border-border/60 dy-bg-card dy-shadow-sm dy-space-y-2">
              <div className="dy-flex dy-items-center dy-justify-between">
                <div className="dy-flex dy-items-center dy-gap-2">
                  <span className={cn(
                    "dy-px-2 dy-py-0.5 dy-rounded-full dy-text-[10px] dy-font-bold dy-uppercase dy-tracking-wider",
                    log.operation === "create" ? "dy-bg-emerald-50 dy-text-emerald-700 dy-border dy-border-emerald-200" :
                      log.operation === "delete" ? "dy-bg-red-50 dy-text-red-700 dy-border dy-border-red-200" :
                        "dy-bg-blue-50 dy-text-blue-700 dy-border dy-border-blue-200"
                  )}>
                    {log.operation}
                  </span>
                  <span className="dy-text-xs dy-text-muted-foreground">
                    by <span className="dy-font-mono dy-text-foreground">{log.user || "System"}</span>
                  </span>
                </div>
                <span className="dy-text-xs dy-text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              {changeDetails}
            </div>
          )
        })}
      </div>
    </div>
  )
}
