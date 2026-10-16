import { PageHeader } from "../../../components/ui/page-header"
import { resolveAdminIcon } from "../../../lib/admin-icons"
import { getLayoutCapabilities } from "./layout-registry"

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
  const fallback = getLayoutCapabilities(layout).icon
  const Icon = resolveAdminIcon(icon ?? "", fallback)
  return (
    <PageHeader title={label} description={description} icon={Icon}>
      {children}
    </PageHeader>
  )
}
