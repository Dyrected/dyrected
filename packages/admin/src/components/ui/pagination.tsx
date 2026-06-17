import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "./button"

interface PaginationProps {
  page: number
  totalPages: number
  total?: number
  hasPrevPage: boolean
  hasNextPage: boolean
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({
  page,
  totalPages,
  total,
  hasPrevPage,
  hasNextPage,
  onPageChange,
  className
}: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className={`dy-flex dy-flex-col dy-gap-3 dy-border-t dy-border-border/40 dy-px-4 dy-py-4 sm:dy-flex-row sm:dy-items-center sm:dy-justify-between ${className}`}>
      <p className="dy-text-xs dy-leading-5 dy-text-muted-foreground">
        Showing page <strong>{page}</strong> of <strong>{totalPages}</strong>
        {total != null && (
          <> - {total} total entries</>
        )}
      </p>
      <div className="dy-flex dy-items-center dy-justify-between dy-gap-2 sm:dy-justify-end">
        <Button
          variant="outline"
          size="sm"
          className="dy-h-9 dy-w-9 dy-p-0"
          disabled={!hasPrevPage}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          title="Previous page"
        >
          <ChevronLeft className="dy-h-4 dy-w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="dy-h-9 dy-w-9 dy-p-0"
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
          title="Next page"
        >
          <ChevronRight className="dy-h-4 dy-w-4" />
        </Button>
      </div>
    </div>
  )
}
