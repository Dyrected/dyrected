import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "./dialog"
import { CsvImporter } from "./csv-importer"
import type { CollectionConfig } from "@dyrected/core"

interface CsvImporterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  schema: CollectionConfig
}

export function CsvImporterDialog({
  open,
  onOpenChange,
  slug,
  schema
}: CsvImporterDialogProps) {
  const title = schema.labels?.singular || schema.slug || slug

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:dy-max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import CSV Data</DialogTitle>
          <DialogDescription>
            Import records into the {title} collection.
          </DialogDescription>
        </DialogHeader>
        <CsvImporter
          slug={slug}
          schema={schema}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
