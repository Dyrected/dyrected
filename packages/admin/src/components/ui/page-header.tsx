import * as React from "react"
import type { LucideIcon } from "lucide-react"

interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  children?: React.ReactNode
  count?: number;
}

export function PageHeader({ title, description, count, icon: Icon, children }: PageHeaderProps) {
  return (
    <div className="dy-mb-2 dy-flex dy-flex-col dy-flex-wrap dy-gap-4 sm:dy-mb-2 sm:dy-flex-row sm:dy-items-end sm:dy-justify-between">
      <div className="dy-min-w-0">
        <div className="dy-mb-1 dy-flex dy-items-center dy-gap-3">
          {Icon && <Icon className="dy-mt-1 dy-h-4 dy-w-4 dy-flex-shrink-0 dy-text-primary" />}
          <h1 className="dy-min-w-0 dy-break-words dy-text-xl dy-font-bold dy-tracking-tight dy-text-foreground sm:dy-text-2xl">{title} {count ? `(${count})` : ''}</h1>
        </div>
        {description && (
          <p className="dy-max-w-2xl dy-text-[11px] dy-font-medium dy-leading-5 dy-text-muted-foreground/60">
            {description}
          </p>
        )}
      </div>
      <div className="dy-flex dy-flex-wrap dy-w-full dy-flex-col dy-gap-2 sm:dy-w-auto sm:dy-flex-row sm:dy-items-center sm:dy-gap-3">
        {children}
      </div>
    </div>
  )
}
