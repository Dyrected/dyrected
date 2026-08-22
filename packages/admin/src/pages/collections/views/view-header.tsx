import type { LucideIcon } from "lucide-react"
import { Calendar, LayoutGrid, Table2 } from "lucide-react"
import { PageHeader } from "../../../components/ui/page-header"
import { resolveAdminIcon } from "../../../lib/admin-icons"

const FALLBACK_ICONS: Record<string, LucideIcon> = {
  table: Table2,
  kanban: LayoutGrid,
  calendar: Calendar,
  cards: LayoutGrid,
}

interface ViewHeaderProps {
  label: string
  icon?: string
  layout?: string
  description?: string
  children?: React.ReactNode
}

/**
 * Header for an operational view — view label with its configured icon,
 * plus a slot for header-type actions.
 */
export function ViewHeader({ label, icon, layout, description, children }: ViewHeaderProps) {
  const fallback = (layout && FALLBACK_ICONS[layout]) || Table2
  const Icon = resolveAdminIcon(icon ?? "", fallback)
  return (
    <PageHeader title={label} description={description} icon={Icon}>
      {children}
    </PageHeader>
  )
}
