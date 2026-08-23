import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { FileDown, Loader2, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"

import { Button } from "../../../components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { CsvImporter } from "../../../components/ui/csv-importer"
import { buildCsv, csvColumnsForSchema, downloadCsv, fetchAllDocs } from "../../../lib/csv"
import { useDyrected } from "../../../providers/dyrected-context"

export interface ViewFindArgs {
  where?: Record<string, unknown>
  sort?: string
}

function exportDocsToCsv(
  client: any,
  slug: string,
  schema: unknown,
  docs: Record<string, unknown>[],
  filenameSuffix = "",
): void {
  const columns = csvColumnsForSchema(schema)
  const baseUrl = typeof client?.getBaseUrl === "function" ? client.getBaseUrl() : ""
  downloadCsv(buildCsv(docs, columns, baseUrl), `${slug}-export${filenameSuffix}.csv`)
  toast.success(`Exported ${docs.length} ${docs.length === 1 ? "entry" : "entries"}`)
}

interface ExportHandlers {
  exportAll: () => Promise<void>
  exportDocs: (docs: Record<string, any>[], filenameSuffix?: string) => void
}

/** Shared export implementations used by the desktop menu and mobile sheet. */
export function createExportHandlers(args: {
  client: any
  slug: string
  schema: unknown
  findArgs?: ViewFindArgs
}): ExportHandlers {
  const { client, slug, schema, findArgs } = args

  const exportAll = async () => {
    if (!client) return
    try {
      const allDocs = await fetchAllDocs(client, slug, findArgs)
      exportDocsToCsv(client, slug, schema, allDocs)
    } catch (error: unknown) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const exportDocs = (docs: Record<string, any>[], filenameSuffix = "") => {
    if (!client || !docs.length) return
    exportDocsToCsv(client, slug, schema, docs, filenameSuffix)
  }

  return { exportAll, exportDocs }
}

export interface ExportMenuItem {
  key: string
  label: string
  onSelect: () => void
}

/**
 * CSV export dropdown for any layout: everything (all pages) plus the current
 * result set when the caller can supply one.
 */
export function ExportMenu({
  slug,
  schema,
  findArgs,
  currentDocs,
}: {
  slug: string
  schema: unknown
  findArgs?: ViewFindArgs
  currentDocs?: Record<string, any>[]
}) {
  const { client } = useDyrected()
  const [isExporting, setIsExporting] = React.useState(false)
  const handlers = createExportHandlers({ client, slug, schema, findArgs })

  const items: ExportMenuItem[] = [
    {
      key: "all",
      label: "All records",
      onSelect: () => {
        setIsExporting(true)
        void handlers.exportAll().finally(() => setIsExporting(false))
      },
    },
  ]
  if (currentDocs?.length) {
    items.push({
      key: "current",
      label: `Current results (${currentDocs.length})`,
      onSelect: () => handlers.exportDocs(currentDocs),
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="dy-h-8 dy-gap-1.5 dy-px-3 dy-text-xs" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="dy-h-3.5 dy-w-3.5 dy-animate-spin" />
          ) : (
            <FileDown className="dy-h-3.5 dy-w-3.5" />
          )}
          <span className="dy-hidden sm:dy-inline">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="dy-w-52">
        <DropdownMenuLabel>Export to CSV</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuItem key={item.key} onClick={item.onSelect}>
            <FileDown />
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface ImportCsvDialogProps {
  slug: string
  schema: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Controlled CSV import flow. The caller owns the trigger button so the same
 * dialog can be opened from both the desktop toolbar and the mobile menu.
 */
export function ImportCsvDialog({ slug, schema, open, onOpenChange }: ImportCsvDialogProps) {
  const queryClient = useQueryClient()

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      void queryClient.invalidateQueries({ queryKey: ["operational-view", slug] })
      void queryClient.invalidateQueries({ queryKey: ["operational-view-metrics", slug] })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="dy-max-h-[85vh] dy-overflow-y-auto sm:dy-max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk-create records in this collection.
          </DialogDescription>
        </DialogHeader>
        {open ? <CsvImporter slug={slug} schema={schema} onClose={() => handleOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

export interface HeaderMenuItem {
  key: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  destructive?: boolean
  disabled?: boolean
  onSelect: () => void
}

/**
 * Compact ⋯ menu holding secondary header actions on small screens, where a
 * row of full-width buttons would stack awkwardly. Hidden from `sm:` up.
 */
export function MobileHeaderMenu({ items }: { items: HeaderMenuItem[] }) {
  if (!items.length) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="More actions"
          className="dy-h-8 dy-w-8 sm:dy-hidden"
        >
          <MoreHorizontal className="dy-h-4 dy-w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="dy-min-w-48">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.key}
            disabled={item.disabled}
            onSelect={item.onSelect}
            className={item.destructive ? "dy-text-destructive focus:dy-text-destructive" : undefined}
          >
            {item.icon ? <item.icon /> : null}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
