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
    <div className={`flex items-center justify-between px-4 py-4 border-t border-border/40 ${className}`}>
      <p className="text-xs text-muted-foreground">
        Showing page <strong>{page}</strong> of <strong>{totalPages}</strong>
        {total != null && (
          <> &mdash; {total} total entries</>
        )}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={!hasPrevPage}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
