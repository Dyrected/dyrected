"use client"

import * as React from "react"
import { ArrowDown, ArrowUp } from "lucide-react"
import {
  NAVIGATION_POLICY_KEY,
  reconcileNavigation,
  type CompiledNavTree,
  type NavigationRolePolicy,
} from "@dyrected/core"

import { Button } from "../ui/button"
import { Checkbox } from "../ui/checkbox"
import { Input } from "../ui/input"
import { Switch } from "../ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { useDyrected } from "../../providers/dyrected-context"
import type { RoleOption } from "../../utils/role-options"

interface RoleMenuPolicyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Roles the project defines. When empty the administrator types the role name. */
  roleOptions: RoleOption[]
}

const EMPTY_TREE: CompiledNavTree = { groups: [], ungrouped: [] }

const moveInList = (list: string[], id: string, delta: -1 | 1): string[] => {
  const from = list.indexOf(id)
  const to = from + delta
  if (from < 0 || to < 0 || to >= list.length) return list
  const next = [...list]
  next.splice(to, 0, next.splice(from, 1)[0])
  return next
}

const flattenSlugs = (tree: CompiledNavTree | null) =>
  tree ? [...tree.groups.flatMap((g) => g.items), ...tree.ungrouped].map((i) => i.label) : []

/**
 * Lets an administrator design the menu a role receives and enforce it.
 *
 * Pick the items the role may see and arrange them. While "Enforce" is on, people
 * in the role see only these items, and personal customizations cannot add
 * anything else. The role's `access` rules still apply: this list can hide items,
 * never grant them.
 */
export function RoleMenuPolicyDialog({ open, onOpenChange, roleOptions }: RoleMenuPolicyDialogProps) {
  const { client, user } = useDyrected()
  const [typedRole, setTypedRole] = React.useState("")
  const [selectedRole, setSelectedRole] = React.useState("")
  const role = (selectedRole || roleOptions[0]?.value || typedRole).trim()

  const [rawTree, setRawTree] = React.useState<CompiledNavTree | null>(null)
  const [allowed, setAllowed] = React.useState<Set<string>>(() => new Set())
  const [enforced, setEnforced] = React.useState(false)
  const [groupOrder, setGroupOrder] = React.useState<string[]>([])
  const [itemOrder, setItemOrder] = React.useState<Record<string, string[]>>({})
  const [hasPolicy, setHasPolicy] = React.useState(false)
  const [preview, setPreview] = React.useState<CompiledNavTree | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [message, setMessage] = React.useState<{ kind: "error" | "ok"; text: string } | null>(null)

  const loadPreview = React.useCallback(
    async (forRole: string) => {
      if (!client || !forRole) return
      try {
        setPreview(await client.getNavigation({ asRole: forRole }))
      } catch {
        setPreview(null)
      }
    },
    [client],
  )

  React.useEffect(() => {
    if (!open || !client || !role) return
    let cancelled = false
    setLoading(true)
    setMessage(null)
    Promise.all([
      client.getNavigation({ asRole: role, raw: true }),
      client.getPreference<NavigationRolePolicy>(NAVIGATION_POLICY_KEY, { scope: "role", role }),
    ])
      .then(([tree, stored]) => {
        if (cancelled) return
        const policy = stored.value
        const items = [...tree.groups.flatMap((g) => g.items), ...tree.ungrouped]
        setRawTree(tree)
        setHasPolicy(!!policy)
        setEnforced(!!policy?.enforced)
        setAllowed(new Set(policy ? policy.allowed : items.map((i) => i.id)))
        setGroupOrder(policy?.layout?.groupOrder ?? [])
        setItemOrder(policy?.layout?.itemOrder ?? {})
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setRawTree(null)
        setMessage({ kind: "error", text: e instanceof Error ? e.message : "Could not load this role's menu." })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    void loadPreview(role)
    return () => {
      cancelled = true
    }
  }, [open, client, role, loadPreview])

  // What the administrator is arranging: the role's full menu in the current order.
  const arranged = React.useMemo(() => {
    if (!rawTree) return EMPTY_TREE
    const reconciled = reconcileNavigation(
      rawTree,
      { _version: 1, groupOrder, itemOrder },
      undefined,
      { allowUserItems: false },
    )
    return { groups: reconciled.groups, ungrouped: reconciled.ungrouped }
  }, [rawTree, groupOrder, itemOrder])

  const toggleItem = (id: string, checked: boolean) =>
    setAllowed((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })

  const moveGroup = (id: string, delta: -1 | 1) =>
    setGroupOrder(moveInList(arranged.groups.map((g) => g.id), id, delta))

  const moveItem = (groupId: string, id: string, delta: -1 | 1) => {
    const group = arranged.groups.find((g) => g.id === groupId)
    if (!group) return
    setItemOrder((prev) => ({ ...prev, [groupId]: moveInList(group.items.map((i) => i.id), id, delta) }))
  }

  const holdsRole = enforced && !!role && [user?.role, ...((user?.roles as string[] | undefined) ?? [])].includes(role)

  const handleSave = async () => {
    if (!client || !role) return
    setSaving(true)
    setMessage(null)
    try {
      const policy: NavigationRolePolicy = {
        _version: 1,
        enforced,
        allowed: [...allowed],
        layout: {
          _version: 1,
          groupOrder: arranged.groups.map((g) => g.id),
          itemOrder: Object.fromEntries(arranged.groups.map((g) => [g.id, g.items.map((i) => i.id)])),
        },
      }
      await client.setPreference(NAVIGATION_POLICY_KEY, policy, { scope: "role", role })
      setHasPolicy(true)
      setMessage({ kind: "ok", text: enforced ? `Menu enforced for ${role}.` : `Saved. The menu is not enforced for ${role}.` })
      await loadPreview(role)
    } catch (e: unknown) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Could not save this menu." })
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!client || !role) return
    setSaving(true)
    setMessage(null)
    try {
      await client.deletePreference(NAVIGATION_POLICY_KEY, { scope: "role", role })
      setHasPolicy(false)
      setEnforced(false)
      setAllowed(new Set([...(rawTree?.groups.flatMap((g) => g.items) ?? []), ...(rawTree?.ungrouped ?? [])].map((i) => i.id)))
      setMessage({ kind: "ok", text: `Removed the menu for ${role}. They get their full menu again.` })
      await loadPreview(role)
    } catch (e: unknown) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Could not remove this menu." })
    } finally {
      setSaving(false)
    }
  }

  const renderRow = (id: string, label: string, onUp?: () => void, onDown?: () => void) => (
    <div key={id} className="dy-flex dy-items-center dy-gap-2 dy-py-0.5">
      <Checkbox
        id={`role-menu-${id}`}
        checked={allowed.has(id)}
        onCheckedChange={(checked) => toggleItem(id, checked === true)}
        aria-label={label}
      />
      <label htmlFor={`role-menu-${id}`} className="dy-flex-1 dy-truncate dy-text-xs">
        {label}
      </label>
      {onUp && (
        <Button variant="ghost" size="icon" className="dy-h-5 dy-w-5" onClick={onUp} aria-label={`Move ${label} up`}>
          <ArrowUp className="dy-h-3 dy-w-3" />
        </Button>
      )}
      {onDown && (
        <Button variant="ghost" size="icon" className="dy-h-5 dy-w-5" onClick={onDown} aria-label={`Move ${label} down`}>
          <ArrowDown className="dy-h-3 dy-w-3" />
        </Button>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dy-max-w-xl dy-max-h-[85vh] dy-overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Role menu</DialogTitle>
          <DialogDescription>
            Choose what a role sees in the sidebar. When enforced, people in that role get exactly this menu and cannot add
            anything back. Access rules still apply, so this can hide items but never grant them.
          </DialogDescription>
        </DialogHeader>

        <div className="dy-space-y-3">
          {roleOptions.length > 0 ? (
            <Select value={role} onValueChange={setSelectedRole}>
              <SelectTrigger aria-label="Role" className="dy-h-8 dy-text-xs">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={typedRole}
              onChange={(e) => setTypedRole(e.target.value)}
              placeholder="Role name, e.g. external"
              aria-label="Role name"
              className="dy-h-8 dy-text-xs"
            />
          )}

          {!role ? null : loading ? (
            <p className="dy-text-xs dy-text-muted-foreground">Loading the menu for {role}…</p>
          ) : !rawTree ? (
            message && (
              <p role="alert" className="dy-text-xs dy-text-destructive">
                {message.text}
              </p>
            )
          ) : (
            <>
              <div className="dy-flex dy-items-center dy-justify-between dy-rounded-md dy-border dy-border-border/60 dy-p-2">
                <div>
                  <p className="dy-text-xs dy-font-medium">Enforce this menu</p>
                  <p className="dy-text-[11px] dy-text-muted-foreground">
                    Off keeps it as a draft. People in {role} see their normal menu.
                  </p>
                </div>
                <Switch checked={enforced} onCheckedChange={setEnforced} aria-label="Enforce this menu" />
              </div>

              {holdsRole && (
                <p role="alert" className="dy-text-[11px] dy-text-destructive">
                  You hold the {role} role. Enforcing this menu limits your own sidebar too.
                </p>
              )}

              <div className="dy-space-y-2">
                {arranged.groups.map((group) => (
                  <div key={group.id} className="dy-rounded-md dy-border dy-border-border/60 dy-p-2">
                    <div className="dy-flex dy-items-center dy-justify-between dy-pb-1">
                      <span className="dy-text-[11px] dy-font-semibold dy-uppercase dy-tracking-wide dy-text-muted-foreground">
                        {group.name}
                      </span>
                      <span className="dy-flex">
                        <Button variant="ghost" size="icon" className="dy-h-5 dy-w-5" onClick={() => moveGroup(group.id, -1)} aria-label={`Move group ${group.name} up`}>
                          <ArrowUp className="dy-h-3 dy-w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="dy-h-5 dy-w-5" onClick={() => moveGroup(group.id, 1)} aria-label={`Move group ${group.name} down`}>
                          <ArrowDown className="dy-h-3 dy-w-3" />
                        </Button>
                      </span>
                    </div>
                    {group.items.map((item) =>
                      renderRow(item.id, item.label, () => moveItem(group.id, item.id, -1), () => moveItem(group.id, item.id, 1)),
                    )}
                  </div>
                ))}
                {arranged.ungrouped.length > 0 && (
                  <div className="dy-rounded-md dy-border dy-border-border/60 dy-p-2">
                    {arranged.ungrouped.map((item) => renderRow(item.id, item.label))}
                  </div>
                )}
              </div>

              <div className="dy-rounded-md dy-bg-muted/40 dy-p-2">
                <p className="dy-text-[11px] dy-font-semibold">What {role} sees today</p>
                <p className="dy-text-[11px] dy-text-muted-foreground" data-testid="role-menu-preview">
                  {flattenSlugs(preview).join(", ") || "Nothing yet."}
                </p>
              </div>

              {message && (
                <p role="status" className={message.kind === "error" ? "dy-text-xs dy-text-destructive" : "dy-text-xs dy-text-emerald-600"}>
                  {message.text}
                </p>
              )}

              <div className="dy-flex dy-justify-between">
                <Button variant="ghost" size="sm" disabled={saving || !hasPolicy} onClick={handleRemove}>
                  Remove menu
                </Button>
                <Button size="sm" disabled={saving} onClick={handleSave}>
                  Save menu
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
