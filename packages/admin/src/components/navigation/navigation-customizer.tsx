"use client"

import * as React from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Folder,
  FolderPlus,
  LayoutGrid,
  MoreVertical,
  Pin,
  PinOff,
  Plus,
  Pencil,
  RotateCcw,
  Search,
  Share2,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react"

import type { CompiledNavGroup, CompiledNavItem, DefineWorkspaceOptions, NavGroup, ViewConfig, ViewLayout, ViewMetric } from "@dyrected/core"
import { ViewFilterBuilder } from "./view-filter-builder"
import { ViewMetricsBuilder } from "./view-metrics-builder"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Switch } from "../ui/switch"
import { IconPicker } from "../forms/fields/icon-picker"
import { useDyrected } from "../../providers/dyrected-context"
import { usePreference } from "../../hooks/use-preferences"
import { resolveAdminIcon } from "../../lib/admin-icons"
import { reconcileNavigation } from "../../utils/navigation-reconciler"
import {
  DEFAULT_USER_NAV_PREFERENCES,
} from "../../types/preferences"

interface NavigationCustomizerProps {
  onClose: () => void
  className?: string
}

function generateSlug(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  )
}

function generateUniqueSlug(text: string, existingSlugs: string[]): string {
  const base = generateSlug(text)
  let candidate = base
  let counter = 1
  while (existingSlugs.includes(candidate)) {
    candidate = `${base}-${counter}`
    counter++
  }
  return candidate
}

export function NavigationCustomizer({ onClose, className }: NavigationCustomizerProps) {
  const { navigation: baseTree, schemas, client, user } = useDyrected()
  const [prefs, setPrefs] = usePreference("admin:navigation", DEFAULT_USER_NAV_PREFERENCES)

  const [searchQuery, setSearchQuery] = React.useState("")
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({})

  // Inline forms toggle states
  const [newGroupOpen, setNewGroupOpen] = React.useState(false)
  const [newItemOpen, setNewItemOpen] = React.useState(false)
  const [activeItemForNewView, setActiveItemForNewView] = React.useState<string | null>(null)
  const [publishRoleOpen, setPublishRoleOpen] = React.useState(false)
  const [selectedRoleToPublish, setSelectedRoleToPublish] = React.useState<string>("editor")
  const [publishStatus, setPublishStatus] = React.useState<string | null>(null)

  // Form states for New Group
  const [groupName, setGroupName] = React.useState("")
  const [groupIcon, setGroupIcon] = React.useState("Folder")
  const [groupExpanded, setGroupExpanded] = React.useState(true)

  // Form states for New Item
  const [itemLabel, setItemLabel] = React.useState("")
  const [itemIcon, setItemIcon] = React.useState("Briefcase")
  const [itemParentGroup, setItemParentGroup] = React.useState("")
  const [itemCollection, setItemCollection] = React.useState("")

  // Form states for New Subview
  const [viewLabel, setViewLabel] = React.useState("")
  const [viewLayout, setViewLayout] = React.useState<ViewLayout>("table")
  const [viewCollection, setViewCollection] = React.useState("")
  const [viewIcon, setViewIcon] = React.useState("LayoutGrid")
  const [viewBadgeType, setViewBadgeType] = React.useState<"none" | "count" | "text">("none")
  const [viewBadgeText, setViewBadgeText] = React.useState("")
  const [viewBadgeVariant, setViewBadgeVariant] = React.useState<"default" | "info" | "warning" | "destructive" | "success">("default")
  const [viewMetrics, setViewMetrics] = React.useState<ViewMetric[]>([])
  const [viewFilter, setViewFilter] = React.useState<Record<string, any> | undefined>(undefined)

  // Form states for Editing Subview
  const [editingView, setEditingView] = React.useState<{ itemSlug: string; viewSlug: string } | null>(null)
  const [editViewLabel, setEditViewLabel] = React.useState("")
  const [editViewLayout, setEditViewLayout] = React.useState<ViewLayout>("table")
  const [editViewCollection, setEditViewCollection] = React.useState("")
  const [editViewIcon, setEditViewIcon] = React.useState("LayoutGrid")
  const [editViewBadgeType, setEditViewBadgeType] = React.useState<"none" | "count" | "text">("none")
  const [editViewBadgeText, setEditViewBadgeText] = React.useState("")
  const [editViewBadgeVariant, setEditViewBadgeVariant] = React.useState<"default" | "info" | "warning" | "destructive" | "success">("default")
  const [editViewMetrics, setEditViewMetrics] = React.useState<ViewMetric[]>([])
  const [editViewFilter, setEditViewFilter] = React.useState<Record<string, any> | undefined>(undefined)

  // Reconciled tree for interactive editing
  const tree = React.useMemo(() => {
    return reconcileNavigation(baseTree, prefs, schemas as any, { includeHidden: true })
  }, [baseTree, prefs, schemas])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  // --- Reordering & Step Buttons ---

  const moveGroup = (index: number, direction: "up" | "down") => {
    const groups = [...tree.groups]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= groups.length) return

    const reordered = arrayMove(groups, index, targetIndex)
    setPrefs((prev) => ({
      ...prev,
      groupOrder: reordered.map((g) => g.id || g.slug || g.name),
    }))
  }

  const moveItem = (groupId: string, index: number, direction: "up" | "down") => {
    const group = tree.groups.find((g) => g.id === groupId || g.slug === groupId || g.name === groupId)
    if (!group) return

    const items = [...group.items]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= items.length) return

    const reordered = arrayMove(items, index, targetIndex)
    setPrefs((prev) => ({
      ...prev,
      itemOrder: {
        ...(prev.itemOrder || {}),
        [groupId]: reordered.map((i) => i.id || i.slug),
      },
    }))
  }

  const handleGroupDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tree.groups.findIndex((g) => g.id === active.id)
    const newIndex = tree.groups.findIndex((g) => g.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const reordered = arrayMove(tree.groups, oldIndex, newIndex)
    setPrefs((prev) => ({
      ...prev,
      groupOrder: reordered.map((g) => g.id || g.slug || g.name),
    }))
  }

  // --- Visibility & Pinning ---

  const isHidden = (id: string, slug?: string) => {
    const set = new Set(prefs.hidden || [])
    return set.has(id) || (!!slug && set.has(slug))
  }

  const toggleHide = (id: string, slug?: string) => {
    setPrefs((prev) => {
      const currentHidden = new Set(prev.hidden || [])
      const isCurrentlyHidden = currentHidden.has(id) || (!!slug && currentHidden.has(slug))
      if (isCurrentlyHidden) {
        currentHidden.delete(id)
        if (slug) currentHidden.delete(slug)
      } else {
        currentHidden.add(id)
        if (slug) currentHidden.add(slug)
      }
      return { ...prev, hidden: Array.from(currentHidden) }
    })
  }

  const isPinned = (slug: string) => {
    return (prefs.pinned || []).some((p) => p.slug === slug)
  }

  const togglePin = (item: CompiledNavItem) => {
    setPrefs((prev) => {
      const pinned = [...(prev.pinned || [])]
      const existingIdx = pinned.findIndex((p) => p.slug === item.slug)
      if (existingIdx >= 0) {
        pinned.splice(existingIdx, 1)
      } else {
        pinned.push({
          type: item.type,
          slug: item.slug,
          label: item.label,
          icon: item.icon,
        })
      }
      return { ...prev, pinned }
    })
  }

  // --- Creation Handlers ---

  const handleCreateGroup = () => {
    if (!groupName.trim()) return

    const existingSlugs = (prefs.groups || []).map((g) => g.slug || "").filter(Boolean)
    const slug = generateUniqueSlug(groupName, existingSlugs)

    const newGroup: NavGroup = {
      name: groupName.trim(),
      slug,
      icon: groupIcon,
      defaultExpanded: groupExpanded,
      order: (prefs.groups?.length || 0) + 1,
    }

    setPrefs((prev) => ({
      ...prev,
      groups: [...(prev.groups || []), newGroup],
      groupOrder: [...(prev.groupOrder || []), newGroup.slug!],
    }))

    setGroupName("")
    setGroupIcon("Folder")
    setGroupExpanded(true)
    setNewGroupOpen(false)
  }

  const handleCreateItem = () => {
    if (!itemLabel.trim()) return

    const existingSlugs = (prefs.items || [])
      .map((i) => i.slug)
      .concat(tree.groups.flatMap((g) => g.items.map((i) => i.slug)))
      .filter((s): s is string => typeof s === "string" && Boolean(s))
    const slug = generateUniqueSlug(itemLabel, existingSlugs)

    const newItem: DefineWorkspaceOptions = {
      slug,
      label: itemLabel.trim(),
      icon: itemIcon,
      group: itemParentGroup || undefined,
      collection: itemCollection || undefined,
      views: [],
    }

    setPrefs((prev) => ({
      ...prev,
      items: [...(prev.items || []), newItem],
    }))

    setItemLabel("")
    setItemIcon("Briefcase")
    setItemParentGroup("")
    setItemCollection("")
    setNewItemOpen(false)
  }

  const handleCreateSubview = () => {
    if (!viewLabel.trim() || !activeItemForNewView) return

    setPrefs((prev) => {
      const customItems = [...(prev.items || [])]
      const allItems = tree.groups.flatMap((g) => g.items)
      const targetItem =
        customItems.find((i) => i.slug === activeItemForNewView) ||
        allItems.find((i) => i.slug === activeItemForNewView)
      const existingViewSlugs = (targetItem?.views || []).map((v) => v.slug)
      const slug = generateUniqueSlug(viewLabel, existingViewSlugs)

      let badge: any = undefined
      if (viewBadgeType === "count") {
        badge = { count: true, variant: viewBadgeVariant }
      } else if (viewBadgeType === "text" && viewBadgeText.trim()) {
        badge = { text: viewBadgeText.trim(), variant: viewBadgeVariant }
      }

      const newView: ViewConfig = {
        slug,
        label: viewLabel.trim(),
        layout: viewLayout,
        icon: viewIcon,
        collection: viewCollection || undefined,
        badge,
        metrics: viewMetrics.length > 0 ? viewMetrics : undefined,
        filter: viewFilter,
      } as any

      const targetItemIdx = customItems.findIndex((i) => i.slug === activeItemForNewView)
      if (targetItemIdx >= 0) {
        const updated = { ...customItems[targetItemIdx] }
        updated.views = [...(updated.views || []), newView]
        customItems[targetItemIdx] = updated
        return { ...prev, items: customItems }
      }

      // If the target item is codebase-defined, add a personal item override with the new view
      const baseItem = allItems.find((i) => i.slug === activeItemForNewView)
      if (baseItem) {
        const itemOverride: DefineWorkspaceOptions = {
          slug: baseItem.slug,
          label: baseItem.label,
          icon: baseItem.icon,
          group: baseItem.group,
          collection: baseItem.collection,
          views: [...(baseItem.views || []), newView],
        }
        return { ...prev, items: [...customItems, itemOverride] }
      }

      return prev
    })

    setViewLabel("")
    setViewCollection("")
    setViewIcon("LayoutGrid")
    setViewLayout("table")
    setViewBadgeType("none")
    setViewBadgeText("")
    setViewBadgeVariant("default")
    setViewMetrics([])
    setViewFilter(undefined)
    setActiveItemForNewView(null)
  }

  const startEditView = (itemSlug: string, view: ViewConfig) => {
    setEditingView({ itemSlug, viewSlug: view.slug })
    setEditViewLabel(view.label || "")
    setEditViewLayout((view.layout as ViewLayout) || "table")
    setEditViewCollection(view.collection || "")
    setEditViewIcon(view.icon || "LayoutGrid")

    if (typeof view.badge === "string") {
      setEditViewBadgeType("text")
      setEditViewBadgeText(view.badge)
      setEditViewBadgeVariant("default")
    } else if (typeof view.badge === "object" && view.badge) {
      if ((view.badge as any).text) {
        setEditViewBadgeType("text")
        setEditViewBadgeText((view.badge as any).text)
      } else {
        setEditViewBadgeType("count")
        setEditViewBadgeText("")
      }
      setEditViewBadgeVariant((view.badge as any).variant || "default")
    } else {
      setEditViewBadgeType("none")
      setEditViewBadgeText("")
      setEditViewBadgeVariant("default")
    }

    setEditViewMetrics(view.metrics ? [...view.metrics] : [])
    setEditViewFilter(view.filter && typeof view.filter === "object" ? { ...view.filter } : undefined)
    if (activeItemForNewView) setActiveItemForNewView(null)
  }

  const cancelEditView = () => {
    setEditingView(null)
    setEditViewLabel("")
    setEditViewCollection("")
    setEditViewIcon("LayoutGrid")
    setEditViewLayout("table")
    setEditViewBadgeType("none")
    setEditViewBadgeText("")
    setEditViewBadgeVariant("default")
    setEditViewMetrics([])
    setEditViewFilter(undefined)
  }

  const handleUpdateView = () => {
    if (!editingView || !editViewLabel.trim()) return

    let badge: any = undefined
    if (editViewBadgeType === "count") {
      badge = { count: true, variant: editViewBadgeVariant }
    } else if (editViewBadgeType === "text" && editViewBadgeText.trim()) {
      badge = { text: editViewBadgeText.trim(), variant: editViewBadgeVariant }
    }

    setPrefs((prev) => {
      const items = [...(prev.items || [])]
      const targetItemIdx = items.findIndex((i) => i.slug === editingView.itemSlug)

      if (targetItemIdx >= 0) {
        const dest = { ...items[targetItemIdx] }
        const views = [...(dest.views || [])]
        const viewIdx = views.findIndex((v) => v.slug === editingView.viewSlug)

        if (viewIdx >= 0) {
          views[viewIdx] = {
            ...views[viewIdx],
            label: editViewLabel.trim(),
            layout: editViewLayout,
            icon: editViewIcon,
            collection: editViewCollection || undefined,
            badge,
            metrics: editViewMetrics.length > 0 ? editViewMetrics : undefined,
            filter: editViewFilter,
          } as any
        } else {
          const allItems = tree.groups.flatMap((g) => g.items)
          const baseItem = allItems.find((i) => i.slug === editingView.itemSlug)
          const originalView = baseItem?.views?.find((v) => v.slug === editingView.viewSlug)
          views.push({
            ...(originalView || { slug: editingView.viewSlug }),
            label: editViewLabel.trim(),
            layout: editViewLayout,
            icon: editViewIcon,
            collection: editViewCollection || undefined,
            badge,
            metrics: editViewMetrics.length > 0 ? editViewMetrics : undefined,
            filter: editViewFilter,
          } as any)
        }

        dest.views = views
        items[targetItemIdx] = dest
        return { ...prev, items }
      }

      // If the parent item is codebase-defined and not yet in prefs.items
      const allItems = tree.groups.flatMap((g) => g.items)
      const baseItem = allItems.find((i) => i.slug === editingView.itemSlug)
      if (baseItem) {
        const baseViews = baseItem.views || []
        const updatedViews = baseViews.map((v) => {
          if (v.slug === editingView.viewSlug) {
            return {
              ...v,
              label: editViewLabel.trim(),
              layout: editViewLayout,
              icon: editViewIcon,
              collection: editViewCollection || undefined,
              badge,
              metrics: editViewMetrics.length > 0 ? editViewMetrics : undefined,
              filter: editViewFilter,
            } as any
          }
          return v
        })
        items.push({
          slug: baseItem.slug,
          label: baseItem.label,
          icon: baseItem.icon,
          group: baseItem.group,
          collection: baseItem.collection,
          views: updatedViews,
        })
        return { ...prev, items }
      }

      return prev
    })

    cancelEditView()
  }

  // --- Relocation & Delete ---

  const handleRelocateSubview = (
    fromItemSlug: string,
    viewSlugToMove: string,
    targetItemSlug: string,
    keepShortcut = false
  ) => {
    setPrefs((prev) => {
      const items = [...(prev.items || [])]

      // Find the view object
      const allItems = tree.groups.flatMap((g) => g.items)
      const sourceItem = allItems.find((i) => i.slug === fromItemSlug)
      const viewToMove = sourceItem?.views?.find((v) => v.slug === viewSlugToMove)
      if (!viewToMove) return prev

      // 1. Update destination item
      const destIndex = items.findIndex((i) => i.slug === targetItemSlug)
      if (destIndex >= 0) {
        const dest = { ...items[destIndex] }
        dest.views = [...(dest.views || []), viewToMove]
        items[destIndex] = dest
      } else {
        const baseDest = allItems.find((i) => i.slug === targetItemSlug)
        if (baseDest) {
          items.push({
            slug: baseDest.slug,
            label: baseDest.label,
            icon: baseDest.icon,
            group: baseDest.group,
            collection: baseDest.collection,
            views: [...(baseDest.views || []), viewToMove],
          })
        }
      }

      // 2. Remove from source item if not keeping shortcut
      if (!keepShortcut) {
        const sourceIndex = items.findIndex((i) => i.slug === fromItemSlug)
        if (sourceIndex >= 0) {
          const src = { ...items[sourceIndex] }
          src.views = (src.views || []).filter((v) => v.slug !== viewSlugToMove)
          items[sourceIndex] = src
        } else if (sourceItem) {
          items.push({
            slug: sourceItem.slug,
            label: sourceItem.label,
            icon: sourceItem.icon,
            group: sourceItem.group,
            collection: sourceItem.collection,
            views: (sourceItem.views || []).filter((v) => v.slug !== viewSlugToMove),
          })
        }
      }

      return { ...prev, items }
    })
  }

  const deleteCustomItem = (slug: string) => {
    setPrefs((prev) => ({
      ...prev,
      items: (prev.items || []).filter((i) => i.slug !== slug),
    }))
  }

  const deleteView = (itemSlug: string, viewSlug: string) => {
    setPrefs((prev) => {
      const items = [...(prev.items || [])]
      const targetItemIdx = items.findIndex((i) => i.slug === itemSlug)

      if (targetItemIdx >= 0) {
        const dest = { ...items[targetItemIdx] }
        dest.views = (dest.views || []).filter((v) => v.slug !== viewSlug)
        items[targetItemIdx] = dest
        return { ...prev, items }
      }

      // If the item is codebase-defined, add an override without that view
      const allItems = tree.groups.flatMap((g) => g.items)
      const baseItem = allItems.find((i) => i.slug === itemSlug)
      if (baseItem) {
        items.push({
          slug: baseItem.slug,
          label: baseItem.label,
          icon: baseItem.icon,
          group: baseItem.group,
          collection: baseItem.collection,
          views: (baseItem.views || []).filter((v) => v.slug !== viewSlug),
        })
        return { ...prev, items }
      }

      return prev
    })
  }

  const deleteCustomGroup = (groupName: string) => {
    setPrefs((prev) => ({
      ...prev,
      groups: (prev.groups || []).filter((g) => g.name !== groupName && g.slug !== groupName),
      groupOrder: (prev.groupOrder || []).filter((s) => s !== groupName),
    }))
  }

  const handleResetToDefaults = () => {
    if (confirm("Reset all personal navigation customizations back to system defaults?")) {
      setPrefs(DEFAULT_USER_NAV_PREFERENCES)
    }
  }

  const handlePublishForRole = async () => {
    if (!client || !selectedRoleToPublish) return
    try {
      await client.setPreference("admin:navigation", prefs, {
        scope: "role",
        role: selectedRoleToPublish,
      })
      setPublishStatus(`Successfully published layout as default for role [${selectedRoleToPublish}]!`)
      setTimeout(() => setPublishStatus(null), 3500)
      setPublishRoleOpen(false)
    } catch (e: any) {
      alert(`Error publishing role default: ${e.message || "Forbidden"}`)
    }
  }

  const userRoles = Array.isArray(user?.roles) ? user.roles : []
  const isUserAdmin = userRoles.includes("admin") || (user as any)?.role === "admin"

  // Filter groups according to search input
  const filteredGroups = React.useMemo(() => {
    if (!searchQuery.trim()) return tree.groups
    const q = searchQuery.toLowerCase()
    return tree.groups
      .map((g) => {
        const matchesGroup = g.name.toLowerCase().includes(q)
        const matchingItems = g.items.filter(
          (i) =>
            i.label.toLowerCase().includes(q) ||
            i.slug.toLowerCase().includes(q) ||
            (i.views || []).some((v) => v.label.toLowerCase().includes(q))
        )
        if (matchesGroup || matchingItems.length > 0) {
          return { ...g, items: matchingItems.length > 0 ? matchingItems : g.items }
        }
        return null
      })
      .filter((g): g is CompiledNavGroup => g !== null)
  }, [tree.groups, searchQuery])

  return (
    <div className={cn("dy-flex dy-h-full dy-min-h-0 dy-flex-col dy-bg-card dy-text-card-foreground", className)}>
      {/* Header */}
      <div className="dy-flex dy-h-14 dy-items-center dy-justify-between dy-border-b dy-border-border dy-px-3 dy-shrink-0">
        <div className="dy-flex dy-items-center dy-gap-2 dy-min-w-0">
          <div className="dy-flex dy-h-7 dy-w-7 dy-items-center dy-justify-center dy-rounded-md dy-bg-primary/10 dy-text-primary dy-shrink-0">
            <SlidersHorizontal className="dy-h-4 dy-w-4" />
          </div>
          <div className="dy-flex dy-flex-col dy-min-w-0">
            <span className="dy-text-xs dy-font-semibold dy-text-foreground dy-truncate">
              Customize Nav
            </span>
            <span className="dy-text-[10px] dy-text-muted-foreground dy-truncate">
              Reorder, hide or pin
            </span>
          </div>
        </div>

        <Button
          size="sm"
          variant="secondary"
          className="dy-h-7 dy-px-2.5 dy-text-xs dy-gap-1 dy-shrink-0"
          onClick={onClose}
        >
          <Check className="dy-h-3.5 dy-w-3.5" />
          <span>Done</span>
        </Button>
      </div>

      {/* Quick Creation & Search */}
      <div className="dy-p-2 dy-border-b dy-border-border/40 dy-space-y-1.5 dy-shrink-0 dy-bg-muted/15">
        <div className="dy-flex dy-items-center dy-gap-1.5">
          <Button
            variant={newGroupOpen ? "secondary" : "outline"}
            size="sm"
            className="dy-h-7 dy-flex-1 dy-text-[11px] dy-gap-1 dy-px-2"
            onClick={() => {
              setNewGroupOpen((prev) => !prev)
              setNewItemOpen(false)
            }}
          >
            <FolderPlus className="dy-h-3.5 dy-w-3.5" />
            <span>Group</span>
          </Button>
          <Button
            variant={newItemOpen ? "secondary" : "outline"}
            size="sm"
            className="dy-h-7 dy-flex-1 dy-text-[11px] dy-gap-1 dy-px-2"
            onClick={() => {
              setNewItemOpen((prev) => !prev)
              setNewGroupOpen(false)
            }}
          >
            <Plus className="dy-h-3.5 dy-w-3.5" />
            <span>Workspace</span>
          </Button>
        </div>
        <div className="dy-relative">
          <Search className="dy-absolute dy-left-2 dy-top-2 dy-h-3.5 dy-w-3.5 dy-text-muted-foreground/60" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="dy-h-7 dy-pl-7 dy-text-xs dy-bg-background"
          />
        </div>
      </div>

      {/* Tree Content */}
      <div className="dy-flex-1 dy-overflow-y-auto dy-p-2 dy-space-y-3">
        {publishStatus && (
          <div className="dy-p-2.5 dy-rounded-md dy-bg-emerald-500/10 dy-border dy-border-emerald-500/30 dy-text-xs dy-text-emerald-600 dark:dy-text-emerald-400 dy-flex dy-items-center dy-gap-2">
            <Check className="dy-h-4 dy-w-4" />
            {publishStatus}
          </div>
        )}

        {/* --- Inline Form 1: New Group --- */}
        {newGroupOpen && (
          <div className="dy-p-2 dy-rounded-lg dy-border dy-border-border dy-bg-muted/30 dy-space-y-1.5 dy-mb-2">
            <div className="dy-flex dy-items-center dy-justify-between">
              <span className="dy-text-[11px] dy-font-semibold dy-text-foreground">New Group</span>
              <Button
                variant="ghost"
                size="icon"
                className="dy-h-4 dy-w-4 dy-text-muted-foreground hover:dy-text-foreground"
                onClick={() => setNewGroupOpen(false)}
              >
                <X className="dy-h-3 dy-w-3" />
              </Button>
            </div>

            <Input
              size="sm"
              placeholder="Group name (e.g. Operations)..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="dy-h-7 dy-px-2 dy-text-xs dy-bg-background"
              autoFocus
            />

            <div className="dy-flex dy-items-center dy-gap-2">
              <div className="dy-flex-1">
                <IconPicker
                  field={{ value: groupIcon, onChange: setGroupIcon }}
                  hidePreview
                  placeholder="Select icon..."
                  className="dy-h-7 dy-px-2 dy-text-xs dy-bg-background"
                />
              </div>
              <div className="dy-flex dy-items-center dy-gap-1.5 dy-shrink-0">
                <span className="dy-text-[10px] dy-text-muted-foreground">Open</span>
                <Switch checked={groupExpanded} onCheckedChange={setGroupExpanded} />
              </div>
            </div>

            <div className="dy-flex dy-items-center dy-justify-end dy-gap-1 dy-pt-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="dy-h-6 dy-px-2 dy-text-xs"
                onClick={() => {
                  setGroupName("")
                  setNewGroupOpen(false)
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="dy-h-6 dy-px-2.5 dy-text-xs"
                onClick={handleCreateGroup}
                disabled={!groupName.trim()}
              >
                Add Group
              </Button>
            </div>
          </div>
        )}

        {/* --- Inline Form 2: New Workspace --- */}
        {newItemOpen && (
          <div className="dy-p-2 dy-rounded-lg dy-border dy-border-border dy-bg-muted/30 dy-space-y-1.5 dy-mb-2">
            <div className="dy-flex dy-items-center dy-justify-between">
              <span className="dy-text-[11px] dy-font-semibold dy-text-foreground">New Workspace</span>
              <Button
                variant="ghost"
                size="icon"
                className="dy-h-4 dy-w-4 dy-text-muted-foreground hover:dy-text-foreground"
                onClick={() => setNewItemOpen(false)}
              >
                <X className="dy-h-3 dy-w-3" />
              </Button>
            </div>

            <Input
              size="sm"
              placeholder="Workspace title (e.g. VIP Concierge)..."
              value={itemLabel}
              onChange={(e) => setItemLabel(e.target.value)}
              className="dy-h-7 dy-px-2 dy-text-xs dy-bg-background"
              autoFocus
            />

            <Select value={itemParentGroup} onValueChange={setItemParentGroup}>
              <SelectTrigger className="dy-h-7 dy-px-2 dy-text-xs dy-bg-background">
                <SelectValue placeholder="Parent group (or standalone)..." />
              </SelectTrigger>
              <SelectContent>
                {tree.groups.map((g) => (
                  <SelectItem key={g.id || g.name} value={g.name} className="dy-text-xs">
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="dy-grid dy-grid-cols-2 dy-gap-1.5">
              <Select value={itemCollection} onValueChange={setItemCollection}>
                <SelectTrigger className="dy-h-7 dy-px-2 dy-text-xs dy-bg-background">
                  <SelectValue placeholder="Collection (optional)..." />
                </SelectTrigger>
                <SelectContent>
                  {(schemas?.collections || []).map((col) => (
                    <SelectItem key={col.slug} value={col.slug} className="dy-text-xs">
                      {col.labels?.plural || col.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <IconPicker
                field={{ value: itemIcon, onChange: setItemIcon }}
                hidePreview
                placeholder="Icon..."
                className="dy-h-7 dy-px-2 dy-text-xs dy-bg-background"
              />
            </div>

            <div className="dy-flex dy-items-center dy-justify-end dy-gap-1 dy-pt-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="dy-h-6 dy-px-2 dy-text-xs"
                onClick={() => {
                  setItemLabel("")
                  setNewItemOpen(false)
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="dy-h-6 dy-px-2.5 dy-text-xs"
                onClick={handleCreateItem}
                disabled={!itemLabel.trim()}
              >
                Add Workspace
              </Button>
            </div>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd}>
          <SortableContext items={filteredGroups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            {filteredGroups.map((group, groupIndex) => {
              const groupHidden = isHidden(group.id, group.slug)
              const isCustomGroup = (prefs.groups || []).some((g) => g.name === group.name || g.slug === group.slug)
              const isExpanded = expandedGroups[group.id] ?? group.defaultExpanded ?? true
              const GroupIcon = resolveAdminIcon(group.icon, Folder)

              return (
                <div
                  key={group.id}
                  className={`dy-group/group dy-space-y-1 ${groupHidden ? "dy-opacity-60" : ""}`}
                >
                  {/* Group Header */}
                  <div className="dy-flex dy-items-center dy-justify-between dy-py-1.5 dy-px-2 dy-rounded-md hover:dy-bg-muted/40 dy-transition-colors">
                    <div className="dy-flex dy-items-center dy-gap-2 dy-min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleGroupExpand(group.id)}
                        className="dy-text-muted-foreground hover:dy-text-foreground dy-p-0.5 dy-rounded hover:dy-bg-muted/60 dy-transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="dy-h-3.5 dy-w-3.5" /> : <ChevronRight className="dy-h-3.5 dy-w-3.5" />}
                      </button>
                      <GroupIcon className="dy-h-4 dy-w-4 dy-text-muted-foreground/80 dy-shrink-0" />
                      <span className="dy-text-xs dy-font-semibold dy-uppercase dy-tracking-wider dy-text-foreground/80 dy-truncate">
                        {group.name}
                      </span>
                      {isCustomGroup && (
                        <span className="dy-text-[9px] dy-font-medium dy-text-muted-foreground/70 dy-bg-muted/60 dy-px-1.5 dy-py-0.2 dy-rounded">
                          Custom
                        </span>
                      )}
                      {groupHidden && (
                        <span className="dy-text-[9px] dy-font-medium dy-text-amber-600 dark:dy-text-amber-400 dy-bg-amber-500/10 dy-px-1.5 dy-py-0.2 dy-rounded">
                          Hidden
                        </span>
                      )}
                    </div>

                    <div className="dy-flex dy-items-center dy-gap-0.5 sm:dy-opacity-0 sm:group-hover/group:dy-opacity-100 sm:focus-within:dy-opacity-100 dy-transition-opacity">
                      {/* Move Up/Down Steppers */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="dy-h-6 dy-w-6 dy-text-muted-foreground hover:dy-text-foreground"
                        disabled={groupIndex === 0}
                        onClick={() => moveGroup(groupIndex, "up")}
                        title="Move Group Up"
                      >
                        <ArrowUp className="dy-h-3 dy-w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="dy-h-6 dy-w-6 dy-text-muted-foreground hover:dy-text-foreground"
                        disabled={groupIndex === filteredGroups.length - 1}
                        onClick={() => moveGroup(groupIndex, "down")}
                        title="Move Group Down"
                      >
                        <ArrowDown className="dy-h-3 dy-w-3" />
                      </Button>

                      {/* Visibility Toggle */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`dy-h-6 dy-w-6 ${groupHidden ? "!dy-opacity-100 dy-text-destructive" : "dy-text-muted-foreground hover:dy-text-foreground"}`}
                        onClick={() => toggleHide(group.id, group.slug)}
                        title={groupHidden ? "Unhide Group" : "Hide Group"}
                      >
                        {groupHidden ? <EyeOff className="dy-h-3 dy-w-3" /> : <Eye className="dy-h-3 dy-w-3" />}
                      </Button>

                      {/* Delete Custom Group */}
                      {isCustomGroup && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="dy-h-6 dy-w-6 dy-text-muted-foreground hover:dy-text-destructive"
                          onClick={() => deleteCustomGroup(group.name)}
                          title="Delete Group"
                        >
                          <Trash2 className="dy-h-3 dy-w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Group Items */}
                  {isExpanded && (
                    <div className="dy-ml-3 dy-pl-2.5 dy-border-l dy-border-border/30 dy-space-y-0.5 dy-py-0.5">
                      {group.items.length === 0 ? (
                        <div className="dy-text-xs dy-text-muted-foreground/60 dy-py-1.5 dy-pl-2 dy-italic">
                          No items in this group.
                        </div>
                      ) : (
                        group.items.map((item, itemIndex) => {
                          const itemHidden = isHidden(item.id, item.slug)
                          const itemPinned = isPinned(item.slug)
                          const isTombstone = (item as any).isTombstone
                          const isCustomItem = (prefs.items || []).some((i) => i.slug === item.slug)
                          const ItemIcon = resolveAdminIcon(item.icon, Briefcase)

                          return (
                            <div
                              key={item.id || item.slug}
                              className={`dy-group/item dy-rounded-md dy-p-1.5 dy-transition-colors hover:dy-bg-accent/30 ${itemHidden ? "dy-opacity-50" : ""
                                } ${isTombstone ? "dy-bg-destructive/5" : ""}`}
                            >
                              <div className="dy-flex dy-items-center dy-justify-between dy-gap-2">
                                <div className="dy-flex dy-items-center dy-gap-2 dy-min-w-0">
                                  {/* Remove for now since no drag and drop is implemented */}
                                  {/* <GripVertical className="dy-h-3.5 dy-w-3.5 dy-text-muted-foreground/30 group-hover/item:dy-text-muted-foreground dy-shrink-0 dy-cursor-grab" /> */}
                                  <ItemIcon className="dy-h-4 dy-w-4 dy-text-muted-foreground/80 dy-shrink-0" />
                                  <span className="dy-text-xs dy-font-medium dy-truncate">{item.label}</span>
                                  {isTombstone && (
                                    <span className="dy-text-[9px] dy-font-medium dy-text-destructive dy-bg-destructive/10 dy-px-1.5 dy-py-0.2 dy-rounded">
                                      Archived
                                    </span>
                                  )}
                                  {isCustomItem && (
                                    <span className="dy-text-[9px] dy-font-medium dy-text-muted-foreground/70 dy-bg-muted/50 dy-px-1.5 dy-py-0.2 dy-rounded">
                                      Workspace
                                    </span>
                                  )}
                                </div>

                                <div className="dy-flex dy-items-center dy-gap-0.5">
                                  {/* Move Item Stepper */}
                                  <div className="dy-flex dy-items-center dy-gap-0.5 sm:dy-opacity-0 sm:group-hover/item:dy-opacity-100 sm:focus-within:dy-opacity-100 dy-transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="dy-h-6 dy-w-6 dy-text-muted-foreground hover:dy-text-foreground"
                                      disabled={itemIndex === 0}
                                      onClick={() => moveItem(group.id, itemIndex, "up")}
                                      title="Move Item Up"
                                    >
                                      <ArrowUp className="dy-h-3 dy-w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="dy-h-6 dy-w-6 dy-text-muted-foreground hover:dy-text-foreground"
                                      disabled={itemIndex === group.items.length - 1}
                                      onClick={() => moveItem(group.id, itemIndex, "down")}
                                      title="Move Item Down"
                                    >
                                      <ArrowDown className="dy-h-3 dy-w-3" />
                                    </Button>
                                  </div>

                                  {/* Pin / Unpin */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`dy-h-6 dy-w-6 ${itemPinned
                                      ? "dy-text-primary !dy-opacity-100"
                                      : "dy-text-muted-foreground hover:dy-text-foreground sm:dy-opacity-0 sm:group-hover/item:dy-opacity-100 sm:focus-within:dy-opacity-100"
                                      } dy-transition-opacity`}
                                    onClick={() => togglePin(item)}
                                    title={itemPinned ? "Unpin Item" : "Pin Item"}
                                  >
                                    {itemPinned ? <PinOff className="dy-h-3 dy-w-3" /> : <Pin className="dy-h-3 dy-w-3" />}
                                  </Button>

                                  {/* Hide / Unhide */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`dy-h-6 dy-w-6 ${itemHidden
                                      ? "dy-text-destructive !dy-opacity-100"
                                      : "dy-text-muted-foreground hover:dy-text-foreground sm:dy-opacity-0 sm:group-hover/item:dy-opacity-100 sm:focus-within:dy-opacity-100"
                                      } dy-transition-opacity`}
                                    onClick={() => toggleHide(item.id, item.slug)}
                                    title={itemHidden ? "Unhide Item" : "Hide Item"}
                                  >
                                    {itemHidden ? <EyeOff className="dy-h-3 dy-w-3" /> : <Eye className="dy-h-3 dy-w-3" />}
                                  </Button>

                                  {/* Delete Custom / Tombstone Item */}
                                  {(isCustomItem || isTombstone) && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="dy-h-6 dy-w-6 dy-text-muted-foreground hover:dy-text-destructive sm:dy-opacity-0 sm:group-hover/item:dy-opacity-100 sm:focus-within:dy-opacity-100 dy-transition-opacity"
                                      onClick={() => deleteCustomItem(item.slug)}
                                      title="Remove from Sidebar"
                                    >
                                      <Trash2 className="dy-h-3 dy-w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Subviews list */}
                              {item.views && item.views.length > 0 && (
                                <div className="dy-ml-5 dy-mt-1 dy-space-y-0.5 dy-border-l dy-border-border/30 dy-pl-2.5">
                                  {item.views.map((view) => {
                                    const isEditingThisView =
                                      editingView?.itemSlug === item.slug && editingView?.viewSlug === view.slug

                                    if (isEditingThisView) {
                                      return (
                                        <div
                                          key={view.slug}
                                          className="dy-my-1.5 dy-p-2 dy-rounded-lg dy-border dy-border-border dy-bg-muted/30 dy-space-y-1.5"
                                        >
                                          <div className="dy-flex dy-items-center dy-justify-between">
                                            <span className="dy-text-[11px] dy-font-semibold dy-text-foreground">Edit View</span>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="dy-h-4 dy-w-4 dy-text-muted-foreground hover:dy-text-foreground"
                                              onClick={cancelEditView}
                                            >
                                              <X className="dy-h-3 dy-w-3" />
                                            </Button>
                                          </div>

                                          <Input
                                            size="sm"
                                            placeholder="View title (e.g. VIP Concierge)..."
                                            value={editViewLabel}
                                            onChange={(e) => setEditViewLabel(e.target.value)}
                                            className="dy-h-7 dy-px-2 dy-text-xs dy-bg-background"
                                            autoFocus
                                          />

                                          <Select value={editViewCollection} onValueChange={setEditViewCollection}>
                                            <SelectTrigger className="dy-h-7 dy-px-2 dy-text-xs dy-bg-background">
                                              <SelectValue placeholder="Target collection..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {(schemas?.collections || []).map((col) => (
                                                <SelectItem key={col.slug} value={col.slug} className="dy-text-xs">
                                                  {col.labels?.plural || col.slug}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>

                                          <div className="dy-grid dy-grid-cols-2 dy-gap-1.5">
                                            <Select value={editViewLayout} onValueChange={(val) => setEditViewLayout(val as ViewLayout)}>
                                              <SelectTrigger className="dy-h-7 dy-px-2 dy-text-xs dy-bg-background">
                                                <SelectValue placeholder="Layout..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="table" className="dy-text-xs">Table</SelectItem>
                                                <SelectItem value="kanban" className="dy-text-xs">Kanban</SelectItem>
                                                <SelectItem value="cards" className="dy-text-xs">Cards</SelectItem>
                                                <SelectItem value="calendar" className="dy-text-xs">Calendar</SelectItem>
                                                <SelectItem value="gantt" className="dy-text-xs">Gantt</SelectItem>
                                              </SelectContent>
                                            </Select>

                                            <IconPicker
                                              field={{ value: editViewIcon, onChange: setEditViewIcon }}
                                              hidePreview
                                              placeholder="Icon..."
                                              className="dy-h-7 dy-px-2 dy-text-xs dy-bg-background"
                                            />
                                          </div>

                                          {/* Badge Configuration Row */}
                                          <div className="dy-flex dy-items-center dy-gap-1.5 dy-pt-0.5">
                                            <span className="dy-text-[11px] dy-text-muted-foreground dy-w-11 dy-shrink-0">Badge:</span>
                                            <Select value={editViewBadgeType} onValueChange={(val: any) => setEditViewBadgeType(val)}>
                                              <SelectTrigger className="dy-h-6 dy-px-1.5 dy-text-[11px] dy-bg-background dy-w-28">
                                                <SelectValue placeholder="Badge..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="none" className="dy-text-xs">None</SelectItem>
                                                <SelectItem value="count" className="dy-text-xs">Auto Count</SelectItem>
                                                <SelectItem value="text" className="dy-text-xs">Custom Text</SelectItem>
                                              </SelectContent>
                                            </Select>

                                            {editViewBadgeType === "text" && (
                                              <Input
                                                size="sm"
                                                placeholder="e.g. VIP, Live..."
                                                value={editViewBadgeText}
                                                onChange={(e) => setEditViewBadgeText(e.target.value)}
                                                className="dy-h-6 dy-px-1.5 dy-text-[11px] dy-bg-background dy-flex-1"
                                              />
                                            )}

                                            {editViewBadgeType !== "none" && (
                                              <Select value={editViewBadgeVariant} onValueChange={(val: any) => setEditViewBadgeVariant(val)}>
                                                <SelectTrigger className="dy-h-6 dy-px-1.5 dy-text-[11px] dy-bg-background dy-w-24">
                                                  <SelectValue placeholder="Color..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="default" className="dy-text-xs">Default</SelectItem>
                                                  <SelectItem value="info" className="dy-text-xs">Info</SelectItem>
                                                  <SelectItem value="warning" className="dy-text-xs">Warning</SelectItem>
                                                  <SelectItem value="destructive" className="dy-text-xs">Destructive</SelectItem>
                                                  <SelectItem value="success" className="dy-text-xs">Success</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            )}
                                          </div>

                                          {/* View Metrics Builder */}
                                          <ViewMetricsBuilder
                                            metrics={editViewMetrics}
                                            onChange={setEditViewMetrics}
                                            collectionSlug={editViewCollection || item.collection}
                                            schemas={schemas}
                                          />

                                          {/* View Filter Builder */}
                                          <ViewFilterBuilder
                                            filter={editViewFilter}
                                            onChange={setEditViewFilter}
                                            collectionSlug={editViewCollection || item.collection}
                                            schemas={schemas}
                                          />

                                          <div className="dy-flex dy-items-center dy-justify-end dy-gap-1 dy-pt-0.5">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="dy-h-6 dy-px-2 dy-text-xs"
                                              onClick={cancelEditView}
                                            >
                                              Cancel
                                            </Button>
                                            <Button
                                              size="sm"
                                              className="dy-h-6 dy-px-2.5 dy-text-xs"
                                              onClick={handleUpdateView}
                                              disabled={!editViewLabel.trim()}
                                            >
                                              Save Changes
                                            </Button>
                                          </div>
                                        </div>
                                      )
                                    }

                                    const viewHidden = isHidden(`${item.slug}_${view.slug}`, view.slug)
                                    return (
                                      <div
                                        key={view.slug}
                                        className={`dy-group/view dy-flex dy-items-center dy-justify-between dy-py-1 dy-px-1.5 dy-rounded hover:dy-bg-accent/40 dy-transition-colors dy-text-xs ${viewHidden ? "dy-opacity-50" : ""
                                          }`}
                                      >
                                        <div className="dy-flex dy-items-center dy-gap-2 dy-min-w-0">
                                          {view.icon ? (
                                            (() => {
                                              const IconComp = resolveAdminIcon(view.icon, LayoutGrid)
                                              return <IconComp className="dy-h-3 dy-w-3 dy-text-muted-foreground/70" />
                                            })()
                                          ) : (
                                            <span className="dy-h-1 dy-w-1 dy-rounded-full dy-bg-muted-foreground/40" />
                                          )}
                                          <span className="dy-truncate dy-text-muted-foreground group-hover/view:dy-text-foreground">
                                            {view.label}
                                          </span>
                                          {view.layout && (
                                            <span className="dy-text-[9px] dy-font-normal dy-text-muted-foreground/60 dy-bg-muted/40 dy-px-1.5 dy-py-0.2 dy-rounded dy-capitalize">
                                              {view.layout}
                                            </span>
                                          )}
                                          {view.badge && (
                                            <span className="dy-text-[9px] dy-font-semibold dy-text-primary dy-bg-primary/10 dy-px-1.5 dy-py-0.2 dy-rounded-full">
                                              {typeof view.badge === "string" ? view.badge : (view.badge as any).text || "count"}
                                            </span>
                                          )}
                                          {view.metrics && view.metrics.length > 0 && (
                                            <span className="dy-text-[9px] dy-font-medium dy-text-muted-foreground dy-bg-muted/50 dy-px-1.5 dy-py-0.2 dy-rounded">
                                              {view.metrics.length} KPI{view.metrics.length > 1 ? "s" : ""}
                                            </span>
                                          )}
                                        </div>

                                        <div className="dy-flex dy-items-center dy-gap-0.5">
                                          {/* Quick Edit View Button on Hover */}
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="dy-h-5 dy-w-5 dy-text-muted-foreground hover:dy-text-foreground sm:dy-opacity-0 sm:group-hover/view:dy-opacity-100 sm:focus-within:dy-opacity-100 dy-transition-opacity"
                                            onClick={() => startEditView(item.slug, view)}
                                            title="Edit View"
                                          >
                                            <Pencil className="dy-h-3 dy-w-3" />
                                          </Button>

                                          {/* View Actions Menu */}
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="dy-h-5 dy-w-5 dy-text-muted-foreground hover:dy-text-foreground sm:dy-opacity-0 sm:group-hover/view:dy-opacity-100 sm:focus-within:dy-opacity-100 dy-transition-opacity"
                                              >
                                                <MoreVertical className="dy-h-3 dy-w-3" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="dy-w-48">
                                              <DropdownMenuItem onClick={() => startEditView(item.slug, view)}>
                                                <Pencil className="dy-h-3.5 dy-w-3.5 dy-mr-1.5" />
                                                <span>Edit View</span>
                                              </DropdownMenuItem>
                                              <DropdownMenuSeparator />
                                              <div className="dy-px-2 dy-py-1.5 dy-text-[11px] dy-font-semibold dy-text-muted-foreground">
                                                Move view to...
                                              </div>
                                              <DropdownMenuSeparator />
                                              {tree.groups
                                                .flatMap((g) => g.items)
                                                .filter((dest) => dest.slug !== item.slug)
                                                .map((dest) => (
                                                  <DropdownMenuItem
                                                    key={dest.slug}
                                                    onClick={() => handleRelocateSubview(item.slug, view.slug, dest.slug)}
                                                  >
                                                    {dest.label}
                                                  </DropdownMenuItem>
                                                ))}
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem
                                                className="dy-text-destructive focus:dy-text-destructive"
                                                onClick={() => deleteView(item.slug, view.slug)}
                                              >
                                                <Trash2 className="dy-h-3.5 dy-w-3.5 dy-mr-1.5" />
                                                <span>Delete View</span>
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>

                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className={`dy-h-5 dy-w-5 ${viewHidden
                                              ? "!dy-opacity-100 dy-text-destructive"
                                              : "dy-text-muted-foreground hover:dy-text-foreground sm:dy-opacity-0 sm:group-hover/view:dy-opacity-100 sm:focus-within:dy-opacity-100"
                                              } dy-transition-opacity`}
                                            onClick={() => toggleHide(`${item.slug}_${view.slug}`, view.slug)}
                                            title={viewHidden ? "Unhide View" : "Hide View"}
                                          >
                                            {viewHidden ? (
                                              <EyeOff className="dy-h-3 dy-w-3" />
                                            ) : (
                                              <Eye className="dy-h-3 dy-w-3" />
                                            )}
                                          </Button>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}

                              {/* Inline Add View Form or Button */}
                              {activeItemForNewView === item.slug ? (
                                <div className="dy-ml-5 dy-mt-1 dy-p-2 dy-rounded-lg dy-border dy-border-border dy-bg-muted/30 dy-space-y-1.5">
                                  <div className="dy-flex dy-items-center dy-justify-between">
                                    <span className="dy-text-[11px] dy-font-semibold dy-text-foreground">New View</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="dy-h-4 dy-w-4 dy-text-muted-foreground hover:dy-text-foreground"
                                      onClick={() => setActiveItemForNewView(null)}
                                    >
                                      <X className="dy-h-3 dy-w-3" />
                                    </Button>
                                  </div>

                                  <Input
                                    size="sm"
                                    placeholder="View title (e.g. VIP Concierge)..."
                                    value={viewLabel}
                                    onChange={(e) => setViewLabel(e.target.value)}
                                    className="dy-h-7 dy-px-2 dy-text-xs dy-bg-background"
                                    autoFocus
                                  />

                                  <Select value={viewCollection} onValueChange={setViewCollection}>
                                    <SelectTrigger className="dy-h-7 dy-px-2 dy-text-xs dy-bg-background">
                                      <SelectValue placeholder="Target collection..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(schemas?.collections || []).map((col) => (
                                        <SelectItem key={col.slug} value={col.slug} className="dy-text-xs">
                                          {col.labels?.plural || col.slug}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <div className="dy-grid dy-grid-cols-2 dy-gap-1.5">
                                    <Select value={viewLayout} onValueChange={(val) => setViewLayout(val as ViewLayout)}>
                                      <SelectTrigger className="dy-h-7 dy-px-2 dy-text-xs dy-bg-background">
                                        <SelectValue placeholder="Layout..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="table" className="dy-text-xs">Table</SelectItem>
                                        <SelectItem value="kanban" className="dy-text-xs">Kanban</SelectItem>
                                        <SelectItem value="cards" className="dy-text-xs">Cards</SelectItem>
                                        <SelectItem value="calendar" className="dy-text-xs">Calendar</SelectItem>
                                        <SelectItem value="gantt" className="dy-text-xs">Gantt</SelectItem>
                                      </SelectContent>
                                    </Select>

                                    <IconPicker
                                      field={{ value: viewIcon, onChange: setViewIcon }}
                                      hidePreview
                                      placeholder="Icon..."
                                      className="dy-h-7 dy-px-2 dy-text-xs dy-bg-background"
                                    />
                                  </div>

                                  {/* Badge Configuration Row */}
                                  <div className="dy-flex dy-items-center dy-gap-1.5 dy-pt-0.5">
                                    <span className="dy-text-[11px] dy-text-muted-foreground dy-w-11 dy-shrink-0">Badge:</span>
                                    <Select value={viewBadgeType} onValueChange={(val: any) => setViewBadgeType(val)}>
                                      <SelectTrigger className="dy-h-6 dy-px-1.5 dy-text-[11px] dy-bg-background dy-w-28">
                                        <SelectValue placeholder="Badge..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none" className="dy-text-xs">None</SelectItem>
                                        <SelectItem value="count" className="dy-text-xs">Auto Count</SelectItem>
                                        <SelectItem value="text" className="dy-text-xs">Custom Text</SelectItem>
                                      </SelectContent>
                                    </Select>

                                    {viewBadgeType === "text" && (
                                      <Input
                                        size="sm"
                                        placeholder="e.g. VIP, Live..."
                                        value={viewBadgeText}
                                        onChange={(e) => setViewBadgeText(e.target.value)}
                                        className="dy-h-6 dy-px-1.5 dy-text-[11px] dy-bg-background dy-flex-1"
                                      />
                                    )}

                                    {viewBadgeType !== "none" && (
                                      <Select value={viewBadgeVariant} onValueChange={(val: any) => setViewBadgeVariant(val)}>
                                        <SelectTrigger className="dy-h-6 dy-px-1.5 dy-text-[11px] dy-bg-background dy-w-24">
                                          <SelectValue placeholder="Color..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="default" className="dy-text-xs">Default</SelectItem>
                                          <SelectItem value="info" className="dy-text-xs">Info</SelectItem>
                                          <SelectItem value="warning" className="dy-text-xs">Warning</SelectItem>
                                          <SelectItem value="destructive" className="dy-text-xs">Destructive</SelectItem>
                                          <SelectItem value="success" className="dy-text-xs">Success</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </div>

                                  {/* View Metrics Builder */}
                                  <ViewMetricsBuilder
                                    metrics={viewMetrics}
                                    onChange={setViewMetrics}
                                    collectionSlug={viewCollection || item.collection}
                                    schemas={schemas}
                                  />

                                  {/* View Filter Builder */}
                                  <ViewFilterBuilder
                                    filter={viewFilter}
                                    onChange={setViewFilter}
                                    collectionSlug={viewCollection || item.collection}
                                    schemas={schemas}
                                  />

                                  <div className="dy-flex dy-items-center dy-justify-end dy-gap-1 dy-pt-0.5">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="dy-h-6 dy-px-2 dy-text-xs"
                                      onClick={() => {
                                        setViewLabel("")
                                        setViewFilter(undefined)
                                        setActiveItemForNewView(null)
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="dy-h-6 dy-px-2.5 dy-text-xs"
                                      onClick={handleCreateSubview}
                                      disabled={!viewLabel.trim()}
                                    >
                                      Add View
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="dy-ml-5 dy-pl-2.5 dy-pt-0.5">
                                  <button
                                    type="button"
                                    className="dy-inline-flex dy-items-center dy-gap-1 dy-text-[11px] dy-text-muted-foreground/60 hover:dy-text-foreground dy-py-0.5 dy-px-1.5 dy-rounded hover:dy-bg-accent/30 dy-transition-colors"
                                    onClick={() => {
                                      setActiveItemForNewView(item.slug)
                                      setViewLabel("")
                                      setViewCollection(item.collection || "")
                                    }}
                                  >
                                    <Plus className="dy-h-3 dy-w-3" />
                                    <span>Add view</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </SortableContext>
        </DndContext>

        {/* Ungrouped Items (if any) */}
        {tree.ungrouped && tree.ungrouped.length > 0 && (
          <div className="dy-space-y-1 dy-pt-2 dy-border-t dy-border-border/30">
            <div className="dy-py-1.5 dy-px-2">
              <span className="dy-text-xs dy-font-semibold dy-uppercase dy-tracking-wider dy-text-muted-foreground/70">
                Ungrouped
              </span>
            </div>
            <div className="dy-ml-3 dy-pl-2.5 dy-border-l dy-border-border/30 dy-space-y-0.5 dy-py-0.5">
              {tree.ungrouped.map((item) => {
                const itemHidden = isHidden(item.id, item.slug)
                const itemPinned = isPinned(item.slug)
                const ItemIcon = resolveAdminIcon(item.icon, Briefcase)
                return (
                  <div
                    key={item.id || item.slug}
                    className={`dy-group/item dy-rounded-md dy-p-1.5 dy-transition-colors hover:dy-bg-accent/30 ${itemHidden ? "dy-opacity-50" : ""
                      }`}
                  >
                    <div className="dy-flex dy-items-center dy-justify-between dy-gap-2">
                      <div className="dy-flex dy-items-center dy-gap-2 dy-min-w-0">
                        <ItemIcon className="dy-h-4 dy-w-4 dy-text-muted-foreground/80 dy-shrink-0" />
                        <span className="dy-text-xs dy-font-medium dy-truncate">{item.label}</span>
                      </div>
                      <div className="dy-flex dy-items-center dy-gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`dy-h-6 dy-w-6 ${itemPinned
                            ? "dy-text-primary !dy-opacity-100"
                            : "dy-text-muted-foreground hover:dy-text-foreground sm:dy-opacity-0 sm:group-hover/item:dy-opacity-100"
                            } dy-transition-opacity`}
                          onClick={() => togglePin(item)}
                          title={itemPinned ? "Unpin Item" : "Pin Item"}
                        >
                          {itemPinned ? <PinOff className="dy-h-3 dy-w-3" /> : <Pin className="dy-h-3 dy-w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`dy-h-6 dy-w-6 ${itemHidden
                            ? "dy-text-destructive !dy-opacity-100"
                            : "dy-text-muted-foreground hover:dy-text-foreground sm:dy-opacity-0 sm:group-hover/item:dy-opacity-100"
                            } dy-transition-opacity`}
                          onClick={() => toggleHide(item.id, item.slug)}
                          title={itemHidden ? "Unhide Item" : "Hide Item"}
                        >
                          {itemHidden ? <EyeOff className="dy-h-3 dy-w-3" /> : <Eye className="dy-h-3 dy-w-3" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="dy-border-t dy-border-border dy-p-2 dy-bg-card dy-shrink-0 dy-space-y-1.5">
        {/* --- Inline Form 4: Publish as Default for Role --- */}
        {publishRoleOpen && (
          <div className="dy-p-2 dy-rounded-lg dy-border dy-border-border dy-bg-muted/30 dy-space-y-1.5 dy-mb-2">
            <div className="dy-flex dy-items-center dy-justify-between">
              <span className="dy-text-[11px] dy-font-semibold dy-text-foreground">Publish as Role Default</span>
              <Button
                variant="ghost"
                size="icon"
                className="dy-h-4 dy-w-4 dy-text-muted-foreground hover:dy-text-foreground"
                onClick={() => setPublishRoleOpen(false)}
              >
                <X className="dy-h-3 dy-w-3" />
              </Button>
            </div>
            <p className="dy-text-[10px] dy-text-muted-foreground">
              Save layout as default for all users with this role.
            </p>
            <Select value={selectedRoleToPublish} onValueChange={setSelectedRoleToPublish}>
              <SelectTrigger className="dy-h-7 dy-px-2 dy-text-xs dy-bg-background">
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin" className="dy-text-xs">Administrator (admin)</SelectItem>
                <SelectItem value="editor" className="dy-text-xs">Editor (editor)</SelectItem>
                <SelectItem value="operator" className="dy-text-xs">Operator (operator)</SelectItem>
                <SelectItem value="compliance" className="dy-text-xs">Compliance (compliance)</SelectItem>
              </SelectContent>
            </Select>
            <div className="dy-flex dy-items-center dy-justify-end dy-gap-1 dy-pt-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="dy-h-6 dy-px-2 dy-text-xs"
                onClick={() => setPublishRoleOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="dy-h-6 dy-px-2.5 dy-text-xs"
                onClick={handlePublishForRole}
              >
                Publish
              </Button>
            </div>
          </div>
        )}

        <div className="dy-flex dy-items-center dy-justify-between dy-gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="dy-h-7 dy-text-[11px] dy-px-2 dy-text-muted-foreground hover:dy-text-destructive"
            onClick={handleResetToDefaults}
          >
            <RotateCcw className="dy-h-3 dy-w-3 dy-mr-1" />
            Reset
          </Button>

          {isUserAdmin && (
            <Button
              variant={publishRoleOpen ? "secondary" : "outline"}
              size="sm"
              className="dy-h-7 dy-text-[11px] dy-px-2"
              onClick={() => setPublishRoleOpen((prev) => !prev)}
            >
              <Share2 className="dy-h-3 dy-w-3 dy-mr-1" />
              Role Default
            </Button>
          )}
        </div>

        <Button
          size="sm"
          className="dy-w-full dy-h-7 dy-text-xs dy-gap-1.5"
          onClick={onClose}
        >
          <Check className="dy-h-3.5 dy-w-3.5" />
          <span>Done Customizing</span>
        </Button>
      </div>
    </div>
  )
}
