/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react"
import { ChevronDown, ChevronRight, Folder } from "lucide-react"
import { resolveAdminIcon } from "../../lib/admin-icons"
import { cn } from "../../lib/utils"
import type { DetailSectionOptions } from "@dyrected/core"

export interface DetailSectionComponentProps {
  title: string
  options?: DetailSectionOptions
  children: React.ReactNode
}

export function DetailSectionComponent({
  title,
  options,
  children,
}: DetailSectionComponentProps) {
  const [collapsed, setCollapsed] = useState(
    Boolean(options?.collapsible && options?.collapsedByDefault),
  )

  const Icon = options?.icon ? resolveAdminIcon(options.icon, Folder) : null

  return (
    <div className="dy-bg-card dy-border dy-border-border/60 dy-rounded-2xl dy-shadow-sm dy-overflow-hidden dy-transition-all">
      <div
        onClick={() => options?.collapsible && setCollapsed(!collapsed)}
        className={cn(
          "dy-px-6 dy-py-4 dy-border-b dy-border-border/40 dy-flex dy-items-center dy-justify-between",
          options?.collapsible && "dy-cursor-pointer hover:dy-bg-muted/30 dy-select-none",
        )}
      >
        <div className="dy-flex dy-items-center dy-gap-3">
          {Icon && (
            <div className="dy-p-2 dy-rounded-lg dy-bg-primary/10 dy-text-primary">
              <Icon className="dy-h-4 dy-w-4" />
            </div>
          )}
          <div>
            <h3 className="dy-text-base dy-font-semibold dy-text-foreground dy-tracking-tight">
              {title}
            </h3>
            {options?.description && (
              <p className="dy-text-xs dy-text-muted-foreground dy-mt-0.5">
                {options.description}
              </p>
            )}
          </div>
        </div>

        {options?.collapsible && (
          <button
            type="button"
            className="dy-p-1 dy-rounded-md dy-text-muted-foreground hover:dy-text-foreground"
          >
            {collapsed ? (
              <ChevronRight className="dy-h-4 dy-w-4" />
            ) : (
              <ChevronDown className="dy-h-4 dy-w-4" />
            )}
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="dy-p-6">
          <div className="dy-grid dy-grid-cols-12 dy-gap-6">{children}</div>
        </div>
      )}
    </div>
  )
}
