import React from "react"
import {
  RotateCcw,
  Trash2,
  Eye,
  Pin,
  PinOff,
  MoreVertical,
  ShieldCheck,
  Clock,
  AlertTriangle,
} from "lucide-react"

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../components/ui/table"
import { Checkbox } from "../../components/ui/checkbox"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { Skeleton } from "../../components/ui/skeleton"
import type { TrashEntrySnapshot } from "./trash-types"
import { cn } from "../../lib/utils"

export interface TrashViewTableProps {
  entries: TrashEntrySnapshot[]
  isLoading?: boolean
  isGlobal?: boolean
  collections?: Array<{ slug: string; labels?: { singular?: string; plural?: string } }>
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  onRestore: (entry: TrashEntrySnapshot) => Promise<void> | void
  onKeep: (entry: TrashEntrySnapshot, keep: boolean) => Promise<void> | void
  onDeleteForever: (entry: TrashEntrySnapshot) => void
  onPreview: (entry: TrashEntrySnapshot) => void
  allowPermanentDelete?: boolean
  restoringId?: string | null
}

function formatCountdown(purgeAt: number | null): { text: string; variant: "default" | "warning" | "destructive" | "secondary" } {
  if (purgeAt === null) {
    return { text: "Kept until emptied", variant: "secondary" }
  }

  const diffMs = purgeAt - Date.now()
  if (diffMs <= 0) {
    return { text: "Purge overdue", variant: "destructive" }
  }

  const hours = Math.ceil(diffMs / (60 * 60 * 1000))
  if (hours < 24) {
    return { text: `Purges in ${hours}h`, variant: hours <= 6 ? "warning" : "default" }
  }

  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
  return { text: `Purges in ${days} day${days === 1 ? "" : "s"}`, variant: days <= 3 ? "warning" : "default" }
}

function formatDateTime(timestamp: number | string | undefined): string {
  if (!timestamp) return "—"
  try {
    const d = new Date(timestamp)
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return String(timestamp)
  }
}

export function TrashViewTable({
  entries,
  isLoading = false,
  isGlobal = false,
  collections = [],
  selectedIds,
  onSelectedIdsChange,
  onRestore,
  onKeep,
  onDeleteForever,
  onPreview,
  allowPermanentDelete = true,
  restoringId,
}: TrashViewTableProps) {
  const collectionLabelMap = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const c of collections) {
      map.set(c.slug, c.labels?.singular || c.slug)
    }
    return map
  }, [collections])

  const allSelected = entries.length > 0 && entries.every((e) => selectedIds.includes(e.id))
  const someSelected = entries.some((e) => selectedIds.includes(e.id)) && !allSelected

  const handleToggleAll = () => {
    if (allSelected) {
      onSelectedIdsChange([])
    } else {
      onSelectedIdsChange(entries.map((e) => e.id))
    }
  }

  const handleToggleRow = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectedIdsChange(selectedIds.filter((item) => item !== id))
    } else {
      onSelectedIdsChange([...selectedIds, id])
    }
  }

  if (isLoading) {
    return (
      <div className="dy-rounded-md dy-border dy-border-border/60 dy-bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="dy-w-10">
                <Skeleton className="dy-h-4 dy-w-4" />
              </TableHead>
              <TableHead>Title</TableHead>
              {isGlobal && <TableHead>Collection</TableHead>}
              <TableHead>Deleted by</TableHead>
              <TableHead>Deleted at</TableHead>
              <TableHead>Retention status</TableHead>
              <TableHead className="dy-text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="dy-h-4 dy-w-4" /></TableCell>
                <TableCell><Skeleton className="dy-h-4 dy-w-48" /></TableCell>
                {isGlobal && <TableCell><Skeleton className="dy-h-4 dy-w-20" /></TableCell>}
                <TableCell><Skeleton className="dy-h-4 dy-w-28" /></TableCell>
                <TableCell><Skeleton className="dy-h-4 dy-w-32" /></TableCell>
                <TableCell><Skeleton className="dy-h-4 dy-w-24" /></TableCell>
                <TableCell className="dy-text-right"><Skeleton className="dy-h-8 dy-w-16 dy-ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="dy-flex dy-flex-col dy-items-center dy-justify-center dy-rounded-md dy-border dy-border-dashed dy-border-border/60 dy-p-12 dy-text-center">
        <div className="dy-flex dy-h-12 dy-w-12 dy-items-center dy-justify-center dy-rounded-full dy-bg-muted/80 dy-text-muted-foreground dy-mb-4">
          <Trash2 className="dy-h-6 dy-w-6" />
        </div>
        <h3 className="dy-text-sm dy-font-semibold dy-text-foreground">Trash is empty</h3>
        <p className="dy-mt-1 dy-text-xs dy-text-muted-foreground dy-max-w-sm">
          No items have been moved to the trash yet. Soft-deleted documents will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="dy-rounded-md dy-border dy-border-border/60 dy-bg-card dy-overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="dy-bg-muted/30">
            <TableHead className="dy-w-10">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={handleToggleAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Title</TableHead>
            {isGlobal && <TableHead>Collection</TableHead>}
            <TableHead>Deleted by</TableHead>
            <TableHead>Deleted at</TableHead>
            <TableHead>Retention status</TableHead>
            <TableHead className="dy-text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const isSelected = selectedIds.includes(entry.id)
            const countdown = formatCountdown(entry.purgeAt)
            const isRestoring = restoringId === entry.id
            const displayTitle = entry.title || entry.docId

            return (
              <TableRow
                key={entry.id}
                data-state={isSelected ? "selected" : undefined}
                className="dy-group"
              >
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleRow(entry.id)}
                    aria-label={`Select ${displayTitle}`}
                  />
                </TableCell>
                <TableCell className="dy-font-medium">
                  <div className="dy-flex dy-items-center dy-gap-2">
                    <button
                      type="button"
                      onClick={() => onPreview(entry)}
                      className="dy-text-left dy-font-medium dy-text-foreground hover:dy-text-primary hover:dy-underline dy-truncate dy-max-w-[280px]"
                      title="Click to preview snapshot"
                    >
                      {displayTitle}
                    </button>
                    {entry.purgeAt === null && (
                      <span title="Exempt from automatic purge">
                        <Pin className="dy-h-3 dy-w-3 dy-text-primary/70 dy-shrink-0" />
                      </span>
                    )}
                  </div>
                  <div className="dy-text-[11px] dy-text-muted-foreground/70 dy-font-mono dy-truncate">
                    ID: {entry.docId}
                  </div>
                </TableCell>
                {isGlobal && (
                  <TableCell>
                    <Badge variant="outline" className="dy-text-[11px] dy-font-normal">
                      {collectionLabelMap.get(entry.collection) || entry.collection}
                    </Badge>
                  </TableCell>
                )}
                <TableCell className="dy-text-xs dy-text-muted-foreground">
                  {entry.deletedBy || "—"}
                </TableCell>
                <TableCell className="dy-text-xs dy-text-muted-foreground">
                  {formatDateTime(entry.deletedAt)}
                </TableCell>
                <TableCell>
                  <div className="dy-flex dy-items-center dy-gap-1.5">
                    {entry.purgeAt === null ? (
                      <Badge variant="secondary" className="dy-gap-1 dy-text-[11px] dy-font-normal">
                        <ShieldCheck className="dy-h-3 dy-w-3 text-primary" />
                        <span>Kept until emptied</span>
                      </Badge>
                    ) : countdown.variant === "destructive" ? (
                      <Badge variant="destructive" className="dy-gap-1 dy-text-[11px]">
                        <AlertTriangle className="dy-h-3 dy-w-3" />
                        <span>{countdown.text}</span>
                      </Badge>
                    ) : countdown.variant === "warning" ? (
                      <Badge variant="outline" className="dy-gap-1 dy-text-[11px] dy-border-amber-500/30 dy-text-amber-600 dark:dy-text-amber-400">
                        <Clock className="dy-h-3 dy-w-3" />
                        <span>{countdown.text}</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="dy-gap-1 dy-text-[11px] dy-text-muted-foreground">
                        <Clock className="dy-h-3 dy-w-3" />
                        <span>{countdown.text}</span>
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="dy-text-right">
                  <div className="dy-flex dy-items-center dy-justify-end dy-gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRestore(entry)}
                      disabled={isRestoring}
                      className="dy-h-7 dy-gap-1 dy-px-2 dy-text-xs"
                      title="Restore document"
                    >
                      <RotateCcw className={cn("dy-h-3.5 dy-w-3.5", isRestoring && "dy-animate-spin")} />
                      <span>{isRestoring ? "Restoring…" : "Restore"}</span>
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="dy-h-7 dy-w-7 dy-p-0"
                          aria-label="More actions"
                        >
                          <MoreVertical className="dy-h-3.5 dy-w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="dy-w-48">
                        <DropdownMenuItem onClick={() => onPreview(entry)} className="dy-gap-2">
                          <Eye className="dy-h-4 dy-w-4" />
                          <span>Preview snapshot</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onKeep(entry, entry.purgeAt !== null)}
                          className="dy-gap-2"
                        >
                          {entry.purgeAt === null ? (
                            <>
                              <PinOff className="dy-h-4 dy-w-4" />
                              <span>Resume countdown</span>
                            </>
                          ) : (
                            <>
                              <Pin className="dy-h-4 dy-w-4" />
                              <span>Keep (exempt)</span>
                            </>
                          )}
                        </DropdownMenuItem>
                        {allowPermanentDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDeleteForever(entry)}
                              className="dy-gap-2 dy-text-destructive focus:dy-text-destructive"
                            >
                              <Trash2 className="dy-h-4 dy-w-4" />
                              <span>Delete forever</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
