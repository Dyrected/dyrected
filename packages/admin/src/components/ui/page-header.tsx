import * as React from "react"
import type { LucideIcon } from "lucide-react"

interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  children?: React.ReactNode
}

export function PageHeader({ title, description, icon: Icon, children }: PageHeaderProps) {
  return (
    <div className="dy-flex dy-items-end dy-justify-between dy-mb-8">
      <div>
        <div className="dy-flex dy-items-center dy-gap-3 dy-mb-1">
          {Icon && <Icon className="dy-h-4 dy-w-4 dy-text-primary/60" />}
          <h1 className="dy-text-2xl dy-font-bold dy-tracking-tight dy-text-foreground">{title}</h1>
        </div>
        {description && (
          <p className="dy-text-[11px] dy-text-muted-foreground/60 dy-font-medium">
            {description}
          </p>
        )}
      </div>
      <div className="dy-flex dy-items-center dy-gap-3">
        {children}
      </div>
    </div>
  )
}
