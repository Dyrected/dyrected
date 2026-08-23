import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { FileDown, FileUp, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "../../../components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface ExportMenuProps {
  slug: string
  schema: unknown
  /** The view's resolved server-side filter/sort, applied to full exports. */
  findArgs?: { where?: Record<string, unknown>; sort?: string }
  /** Documents currently shown after client-side refinement. */
  currentDocs?: Record<string, any>[]
  /** Ids of the active selection (resolved against the loaded documents). */
  selectedIds?: string[]
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

/**
 * CSV export for any layout: everything (all pages), the current result set,
 * or just the active selection.
 */
export function ExportMenu({ slug, schema, findArgs, currentDocs, selectedIds }: ExportMenuProps) {
  const { client } = useDyrected()
  const [isExporting, setIsExporting] = React.useState(false)

  const handleExportAll = async () => {
    if (!client) return
    setIsExporting(true)
    try {
      const allDocs = await fetchAllDocs(client, slug, findArgs)
      exportDocsToCsv(client, slug, schema, allDocs)
    } catch (error: unknown) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportCurrent = () => {
    if (!client || !currentDocs?.length) return
    exportDocsToCsv(client, slug, schema, currentDocs)
  }

  const handleExportSelected = () => {
    if (!client || !selectedIds?.length) return
    const idSet = new Set(selectedIds)
    const selectedDocs = (currentDocs ?? []).filter((doc) => idSet.has(String(doc.id)))
    if (!selectedDocs.length) return
    exportDocsToCsv(client, slug, schema, selectedDocs, "-selected")
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
        <DropdownMenuItem onClick={() => void handleExportAll()}>
          <FileDown />
          All records
        </DropdownMenuItem>
        {!!currentDocs?.length && (
          <DropdownMenuItem onClick={handleExportCurrent}>
            <FileDown />
            Current results ({currentDocs.length})
          </DropdownMenuItem>
        )}
        {!!selectedIds?.length && (
          <DropdownMenuItem onClick={handleExportSelected}>
            <FileDown />
            Selected ({selectedIds.length})
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface ImportCsvDialogProps {
  slug: string
  schema: any
}

/**
 * CSV import flow behind a dialog trigger. Available wherever creating is
 * allowed — importing bulk-creates new documents.
 */
export function ImportCsvDialog({ slug, schema }: ImportCsvDialogProps) {
  const [open, setOpen] = React.useState(false)
  const queryClient = useQueryClient()

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      void queryClient.invalidateQueries({ queryKey: ["operational-view", slug] })
      void queryClient.invalidateQueries({ queryKey: ["operational-view-metrics", slug] })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="dy-h-8 dy-gap-1.5 dy-px-3 dy-text-xs">
          <FileUp className="dy-h-3.5 dy-w-3.5" />
          <span className="dy-hidden sm:dy-inline">Import</span>
        </Button>
      </DialogTrigger>
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
