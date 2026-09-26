import { RotateCcw } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "../../components/ui/sheet"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import type { TrashEntrySnapshot } from "./trash-types"

interface TrashPreviewSheetProps {
  entry: TrashEntrySnapshot | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestore: (entry: TrashEntrySnapshot) => Promise<void> | void
  isRestoring?: boolean
}

export function TrashPreviewSheet({
  entry,
  open,
  onOpenChange,
  onRestore,
  isRestoring = false,
}: TrashPreviewSheetProps) {
  if (!entry) return null

  const snapshot = entry.snapshot || {}
  const keys = Object.keys(snapshot).filter((k) => !k.startsWith("_") && k !== "password")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:dy-max-w-xl dy-flex dy-flex-col dy-h-full dy-overflow-hidden">
        <SheetHeader className="dy-pb-4 dy-border-b dy-border-border/60">
          <div className="dy-flex dy-items-center dy-gap-2">
            <Badge variant="outline" className="dy-text-[11px]">
              {entry.collection}
            </Badge>
            <Badge variant="secondary" className="dy-text-[11px]">
              Read-only snapshot
            </Badge>
          </div>
          <SheetTitle className="dy-text-lg dy-font-semibold dy-truncate">
            {entry.title || entry.docId}
          </SheetTitle>
          <SheetDescription className="dy-text-xs dy-text-muted-foreground">
            Document ID: <span className="dy-font-mono dy-text-foreground">{entry.docId}</span>
          </SheetDescription>
        </SheetHeader>

        {/* Metadata section */}
        <div className="dy-grid dy-grid-cols-2 dy-gap-3 dy-py-3 dy-px-1 dy-border-b dy-border-border/40 dy-bg-muted/20 dy-rounded-md dy-my-2 dy-text-xs">
          <div>
            <span className="dy-text-muted-foreground dy-block">Deleted At</span>
            <span className="dy-font-medium dy-text-foreground">
              {new Date(entry.deletedAt).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="dy-text-muted-foreground dy-block">Deleted By</span>
            <span className="dy-font-medium dy-text-foreground">
              {entry.deletedBy || "System"}
            </span>
          </div>
          <div className="dy-col-span-2">
            <span className="dy-text-muted-foreground dy-block">Purge Status</span>
            <span className="dy-font-medium dy-text-foreground">
              {entry.purgeAt ? `Scheduled for ${new Date(entry.purgeAt).toLocaleString()}` : "Exempt from automatic purge (Kept)"}
            </span>
          </div>
        </div>

        {/* Snapshot Fields */}
        <div className="dy-flex-1 dy-overflow-y-auto dy-space-y-3 dy-py-2 dy-pr-1">
          <h4 className="dy-text-xs dy-font-semibold dy-uppercase dy-tracking-wider dy-text-muted-foreground">
            Stored Document Fields
          </h4>
          <div className="dy-space-y-2">
            {keys.map((key) => {
              const val = snapshot[key]
              const isObject = val !== null && typeof val === "object"

              return (
                <div
                  key={key}
                  className="dy-rounded-md dy-border dy-border-border/50 dy-bg-muted/10 dy-p-2.5 dy-space-y-1"
                >
                  <span className="dy-text-[11px] dy-font-semibold dy-text-muted-foreground dy-block">
                    {key}
                  </span>
                  {isObject ? (
                    <pre className="dy-text-xs dy-font-mono dy-bg-muted/40 dy-p-2 dy-rounded dy-overflow-x-auto dy-text-foreground/90">
                      {JSON.stringify(val, null, 2)}
                    </pre>
                  ) : (
                    <div className="dy-text-xs dy-font-medium dy-text-foreground dy-break-words">
                      {val === undefined || val === null ? (
                        <span className="dy-text-muted-foreground/60 dy-italic">empty</span>
                      ) : typeof val === "boolean" ? (
                        val ? "true" : "false"
                      ) : (
                        String(val)
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <SheetFooter className="dy-pt-4 dy-border-t dy-border-border/60 dy-flex dy-items-center dy-justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={async () => {
              await onRestore(entry)
              onOpenChange(false)
            }}
            disabled={isRestoring}
            className="dy-gap-1.5"
          >
            <RotateCcw className="dy-h-4 dy-w-4" />
            <span>Restore Document</span>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
