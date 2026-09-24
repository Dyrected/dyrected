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
  GripVertical,
  MoreVertical,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Trash2,
} from "lucide-react"

import type { CompiledNavGroup, CompiledNavItem, DefineNavItemOptions, NavGroup, ViewConfig, ViewLayout } from "@dyrected/core"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Switch } from "../ui/switch"
import { useDyrected } from "../../providers/dyrected-context"
import { usePreference } from "../../hooks/use-preferences"
import { resolveAdminIcon } from "../../lib/admin-icons"
import { reconcileNavigation } from "../../utils/navigation-reconciler"
import {
  DEFAULT_USER_NAV_PREFERENCES,
} from "../../types/preferences"

interface NavigationCustomizerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NavigationCustomizer({ open, onOpenChange }: NavigationCustomizerProps) {
  const { navigation: baseTree, schemas, client, user } = useDyrected()
  const [prefs, setPrefs] = usePreference("admin:navigation", DEFAULT_USER_NAV_PREFERENCES)

  const [searchQuery, setSearchQuery] = React.useState("")
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({})

  // Dialog states
  const [newGroupOpen, setNewGroupOpen] = React.useState(false)
  const [newItemOpen, setNewItemOpen] = React.useState(false)
  const [newViewOpen, setNewViewOpen] = React.useState(false)
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
  const [itemSlug, setItemSlug] = React.useState("")
  const [itemIcon, setItemIcon] = React.useState("Briefcase")
  const [itemParentGroup, setItemParentGroup] = React.useState("")
  const [itemCollection, setItemCollection] = React.useState("")

  // Form states for New Subview
  const [viewLabel, setViewLabel] = React.useState("")
  const [viewSlug, setViewSlug] = React.useState("")
  const [viewLayout, setViewLayout] = React.useState<ViewLayout>("table")
  const [viewCollection, setViewCollection] = React.useState("")
  const [viewIcon, setViewIcon] = React.useState("LayoutGrid")

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

    const newGroup: NavGroup = {
      name: groupName.trim(),
      slug: groupName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
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
    setNewGroupOpen(false)
  }

  const handleCreateItem = () => {
    if (!itemLabel.trim() || !itemSlug.trim()) return

    const newItem: DefineNavItemOptions = {
      slug: itemSlug.trim().toLowerCase().replace(/[^a-z0-9]/g, "-"),
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
    setItemSlug("")
    setItemCollection("")
    setNewItemOpen(false)
  }

  const handleCreateSubview = () => {
    if (!viewLabel.trim() || !viewSlug.trim() || !activeItemForNewView) return

    const newView: ViewConfig = {
      slug: viewSlug.trim().toLowerCase().replace(/[^a-z0-9]/g, "-"),
      label: viewLabel.trim(),
      layout: viewLayout,
      icon: viewIcon,
      collection: viewCollection || undefined,
    } as any

    setPrefs((prev) => {
      const customItems = [...(prev.items || [])]
      const targetItemIdx = customItems.findIndex((i) => i.slug === activeItemForNewView)

      if (targetItemIdx >= 0) {
        const targetItem = { ...customItems[targetItemIdx] }
        targetItem.views = [...(targetItem.views || []), newView]
        customItems[targetItemIdx] = targetItem
        return { ...prev, items: customItems }
      }

      // If the target item is codebase-defined, add a personal item override with the new view
      const baseItem = tree.groups.flatMap((g) => g.items).find((i) => i.slug === activeItemForNewView)
      if (baseItem) {
        const itemOverride: DefineNavItemOptions = {
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
    setViewSlug("")
    setViewCollection("")
    setNewViewOpen(false)
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="dy-w-full sm:dy-max-w-xl dy-flex dy-flex-col dy-p-0 dy-h-full !dy-gap-0">
        <SheetHeader className="dy-px-6 dy-pt-6 dy-pb-4 dy-border-b">
          <div className="dy-flex dy-items-center dy-justify-between">
            <SheetTitle className="dy-text-xl dy-font-semibold">Customize Navigation</SheetTitle>
          </div>
          <SheetDescription className="dy-text-xs dy-text-muted-foreground">
            Personalize sidebar groups, operational workspaces, and views. Changes save automatically.
          </SheetDescription>

          {/* Quick Creation Row */}
          <div className="dy-flex dy-items-center dy-gap-2 dy-pt-3">
            <Button
              variant="outline"
              size="sm"
              className="dy-h-8 dy-text-xs dy-gap-1.5"
              onClick={() => setNewGroupOpen(true)}
            >
              <FolderPlus className="dy-h-3.5 dy-w-3.5" />
              New Group
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="dy-h-8 dy-text-xs dy-gap-1.5"
              onClick={() => setNewItemOpen(true)}
            >
              <Plus className="dy-h-3.5 dy-w-3.5" />
              New Nav Item
            </Button>
            <div className="dy-relative dy-flex-1">
              <Search className="dy-absolute dy-left-2.5 dy-top-2.5 dy-h-3.5 dy-w-3.5 dy-text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="dy-h-8 dy-pl-8 dy-text-xs"
              />
            </div>
          </div>
        </SheetHeader>

        {/* Tree Content */}
        <div className="dy-flex-1 dy-overflow-y-auto dy-p-6 dy-space-y-6">
          {publishStatus && (
            <div className="dy-p-2.5 dy-rounded-md dy-bg-emerald-500/10 dy-border dy-border-emerald-500/30 dy-text-xs dy-text-emerald-600 dark:dy-text-emerald-400 dy-flex dy-items-center dy-gap-2">
              <Check className="dy-h-4 dy-w-4" />
              {publishStatus}
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
                                className={`dy-group/item dy-rounded-md dy-p-1.5 dy-transition-colors hover:dy-bg-accent/30 ${
                                  itemHidden ? "dy-opacity-50" : ""
                                } ${isTombstone ? "dy-bg-destructive/5" : ""}`}
                              >
                                <div className="dy-flex dy-items-center dy-justify-between dy-gap-2">
                                  <div className="dy-flex dy-items-center dy-gap-2 dy-min-w-0">
                                    <GripVertical className="dy-h-3.5 dy-w-3.5 dy-text-muted-foreground/30 group-hover/item:dy-text-muted-foreground dy-shrink-0 dy-cursor-grab" />
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
                                      className={`dy-h-6 dy-w-6 ${
                                        itemPinned
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
                                      className={`dy-h-6 dy-w-6 ${
                                        itemHidden
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
                                      const viewHidden = isHidden(`${item.slug}_${view.slug}`, view.slug)
                                      return (
                                        <div
                                          key={view.slug}
                                          className={`dy-group/view dy-flex dy-items-center dy-justify-between dy-py-1 dy-px-1.5 dy-rounded hover:dy-bg-accent/40 dy-transition-colors dy-text-xs ${
                                            viewHidden ? "dy-opacity-50" : ""
                                          }`}
                                        >
                                          <div className="dy-flex dy-items-center dy-gap-2 dy-min-w-0">
                                            <span className="dy-h-1 dy-w-1 dy-rounded-full dy-bg-muted-foreground/40" />
                                            <span className="dy-truncate dy-text-muted-foreground group-hover/view:dy-text-foreground">
                                              {view.label}
                                            </span>
                                            {view.layout && (
                                              <span className="dy-text-[9px] dy-font-normal dy-text-muted-foreground/60 dy-bg-muted/40 dy-px-1.5 dy-py-0.2 dy-rounded dy-capitalize">
                                                {view.layout}
                                              </span>
                                            )}
                                          </div>

                                          <div className="dy-flex dy-items-center dy-gap-0.5">
                                            {/* Move To Another Workspace Menu */}
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
                                                <div className="dy-px-2 dy-py-1.5 dy-text-[11px] dy-font-semibold dy-text-muted-foreground">
                                                  Move subview to...
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
                                              </DropdownMenuContent>
                                            </DropdownMenu>

                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className={`dy-h-5 dy-w-5 ${
                                                viewHidden
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

                                {/* Inline Add Subview button */}
                                <div className="dy-ml-5 dy-pl-2.5 dy-pt-0.5">
                                  <button
                                    type="button"
                                    className="dy-inline-flex dy-items-center dy-gap-1 dy-text-[11px] dy-text-muted-foreground/60 hover:dy-text-foreground dy-py-0.5 dy-px-1.5 dy-rounded hover:dy-bg-accent/30 dy-transition-colors"
                                    onClick={() => {
                                      setActiveItemForNewView(item.slug)
                                      setNewViewOpen(true)
                                    }}
                                  >
                                    <Plus className="dy-h-3 dy-w-3" />
                                    <span>Add view</span>
                                  </button>
                                </div>
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
                      className={`dy-group/item dy-rounded-md dy-p-1.5 dy-transition-colors hover:dy-bg-accent/30 ${
                        itemHidden ? "dy-opacity-50" : ""
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
                            className={`dy-h-6 dy-w-6 ${
                              itemPinned
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
                            className={`dy-h-6 dy-w-6 ${
                              itemHidden
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
        <div className="dy-p-4 dy-border-t dy-bg-background/80 dy-backdrop-blur dy-flex dy-items-center dy-justify-between dy-gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="dy-text-xs dy-gap-1.5 dy-text-muted-foreground hover:dy-text-destructive"
            onClick={handleResetToDefaults}
          >
            <RotateCcw className="dy-h-3.5 dy-w-3.5" />
            Reset to System Defaults
          </Button>

          <div className="dy-flex dy-items-center dy-gap-2">
            {isUserAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="dy-text-xs dy-gap-1.5"
                onClick={() => setPublishRoleOpen(true)}
              >
                <Share2 className="dy-h-3.5 dy-w-3.5" />
                Publish for Role...
              </Button>
            )}

            <Button size="sm" className="dy-text-xs" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </SheetContent>

      {/* --- Modal 1: New Group --- */}
      <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
        <DialogContent className="sm:dy-max-w-md">
          <DialogHeader>
            <DialogTitle>Create Navigation Group</DialogTitle>
          </DialogHeader>
          <div className="dy-space-y-4 dy-py-2">
            <div className="dy-space-y-1.5">
              <Label className="dy-text-xs">Group Name</Label>
              <Input
                placeholder="e.g. Daily Operations"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            <div className="dy-space-y-1.5">
              <Label className="dy-text-xs">Lucide Icon</Label>
              <Input
                placeholder="e.g. Briefcase, Folder, Inbox, Star"
                value={groupIcon}
                onChange={(e) => setGroupIcon(e.target.value)}
              />
            </div>

            <div className="dy-flex dy-items-center dy-justify-between">
              <Label className="dy-text-xs">Expanded by default</Label>
              <Switch checked={groupExpanded} onCheckedChange={setGroupExpanded} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewGroupOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateGroup} disabled={!groupName.trim()}>
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Modal 2: New Nav Item (Operational Workspace) --- */}
      <Dialog open={newItemOpen} onOpenChange={setNewItemOpen}>
        <DialogContent className="sm:dy-max-w-md">
          <DialogHeader>
            <DialogTitle>Create Operational Workspace / Nav Item</DialogTitle>
          </DialogHeader>
          <div className="dy-space-y-4 dy-py-2">
            <div className="dy-space-y-1.5">
              <Label className="dy-text-xs">Display Label</Label>
              <Input
                placeholder="e.g. VIP Concierge"
                value={itemLabel}
                onChange={(e) => {
                  setItemLabel(e.target.value)
                  if (!itemSlug) {
                    setItemSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"))
                  }
                }}
              />
            </div>

            <div className="dy-space-y-1.5">
              <Label className="dy-text-xs">URL Slug</Label>
              <Input
                placeholder="e.g. vip-concierge"
                value={itemSlug}
                onChange={(e) => setItemSlug(e.target.value)}
              />
            </div>

            <div className="dy-space-y-1.5">
              <Label className="dy-text-xs">Parent Group</Label>
              <Select value={itemParentGroup} onValueChange={setItemParentGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a parent group (or standalone)" />
                </SelectTrigger>
                <SelectContent>
                  {tree.groups.map((g) => (
                    <SelectItem key={g.id || g.name} value={g.name}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="dy-space-y-1.5">
              <Label className="dy-text-xs">Primary Target Collection (Optional)</Label>
              <Select value={itemCollection} onValueChange={setItemCollection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target collection (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {(schemas?.collections || []).map((col) => (
                    <SelectItem key={col.slug} value={col.slug}>
                      {col.labels?.plural || col.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="dy-space-y-1.5">
              <Label className="dy-text-xs">Lucide Icon</Label>
              <Input
                placeholder="e.g. Crown, Users, ClipboardCheck"
                value={itemIcon}
                onChange={(e) => setItemIcon(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewItemOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateItem} disabled={!itemLabel.trim() || !itemSlug.trim()}>
              Create Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Modal 3: Add Subview --- */}
      <Dialog open={newViewOpen} onOpenChange={setNewViewOpen}>
        <DialogContent className="sm:dy-max-w-md">
          <DialogHeader>
            <DialogTitle>Add Subview to Workspace</DialogTitle>
          </DialogHeader>
          <div className="dy-space-y-4 dy-py-2">
            <div className="dy-space-y-1.5">
              <Label className="dy-text-xs">View Label</Label>
              <Input
                placeholder="e.g. Urgent Attention"
                value={viewLabel}
                onChange={(e) => {
                  setViewLabel(e.target.value)
                  if (!viewSlug) {
                    setViewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"))
                  }
                }}
              />
            </div>

            <div className="dy-space-y-1.5">
              <Label className="dy-text-xs">View Slug</Label>
              <Input
                placeholder="e.g. urgent-attention"
                value={viewSlug}
                onChange={(e) => setViewSlug(e.target.value)}
              />
            </div>

            <div className="dy-space-y-1.5">
              <Label className="dy-text-xs">Target Collection</Label>
              <Select value={viewCollection} onValueChange={setViewCollection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target collection" />
                </SelectTrigger>
                <SelectContent>
                  {(schemas?.collections || []).map((col) => (
                    <SelectItem key={col.slug} value={col.slug}>
                      {col.labels?.plural || col.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="dy-space-y-1.5">
              <Label className="dy-text-xs">Layout Engine</Label>
              <Select value={viewLayout} onValueChange={(val) => setViewLayout(val as ViewLayout)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="table">Table (Columns, Search, Filters)</SelectItem>
                  <SelectItem value="kanban">Kanban Board (Status Columns)</SelectItem>
                  <SelectItem value="cards">Cards Gallery (Visual Grid)</SelectItem>
                  <SelectItem value="calendar">Calendar (Date Planner)</SelectItem>
                  <SelectItem value="gantt">Gantt Timeline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="dy-space-y-1.5">
              <Label className="dy-text-xs">Icon</Label>
              <Input
                placeholder="e.g. AlertCircle, LayoutGrid, CheckSquare"
                value={viewIcon}
                onChange={(e) => setViewIcon(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewViewOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateSubview} disabled={!viewLabel.trim() || !viewSlug.trim()}>
              Add View
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Modal 4: Publish as Default for Role --- */}
      <Dialog open={publishRoleOpen} onOpenChange={setPublishRoleOpen}>
        <DialogContent className="sm:dy-max-w-md">
          <DialogHeader>
            <DialogTitle>Publish Layout as Role Default</DialogTitle>
          </DialogHeader>
          <div className="dy-space-y-4 dy-py-2">
            <p className="dy-text-xs dy-text-muted-foreground">
              This will save your current customized navigation layout as the default template for all users with this role who haven't set their own personal customizations.
            </p>
            <div className="dy-space-y-1.5">
              <Label className="dy-text-xs">Target Role</Label>
              <Select value={selectedRoleToPublish} onValueChange={setSelectedRoleToPublish}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator (admin)</SelectItem>
                  <SelectItem value="editor">Editor (editor)</SelectItem>
                  <SelectItem value="operator">Operator (operator)</SelectItem>
                  <SelectItem value="compliance">Compliance Reviewer (compliance)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPublishRoleOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handlePublishForRole}>
              Publish as Default
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}
