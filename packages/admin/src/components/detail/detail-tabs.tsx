/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react"
import { Folder } from "lucide-react"
import { resolveAdminIcon } from "../../lib/admin-icons"
import { Badge } from "../ui/badge"
import { cn } from "../../lib/utils"
import { evaluateJexl } from "@dyrected/core"
import type { DetailTab, DetailTabsOptions } from "@dyrected/core"

export interface DetailTabsComponentProps {
  tabs: DetailTab[]
  options?: DetailTabsOptions
  doc: any
  user?: any
  renderItems: (items: any[]) => React.ReactNode
}

export function DetailTabsComponent({
  tabs,
  options,
  doc,
  user,
  renderItems,
}: DetailTabsComponentProps) {
  const [activeTab, setActiveTab] = useState<string>(
    options?.defaultTab || tabs[0]?.label || "",
  )
  const [badges, setBadges] = useState<Record<string, string | number>>({})

  useEffect(() => {
    let cancelled = false

    const evalBadges = async () => {
      const nextBadges: Record<string, string | number> = {}
      for (const tab of tabs) {
        if (tab.options?.badge) {
          try {
            const val = await evaluateJexl(tab.options.badge, { doc, user })
            if (val !== undefined && val !== null) {
              nextBadges[tab.label] = val
            }
          } catch (_err) {
            // ignore
          }
        }
      }
      if (!cancelled) {
        setBadges(nextBadges)
      }
    }

    evalBadges()
    return () => {
      cancelled = true
    }
  }, [tabs, doc, user])

  const selectedTab = tabs.find((t) => t.label === activeTab) || tabs[0]

  return (
    <div className="dy-space-y-4">
      <div className="dy-flex dy-items-center dy-gap-2 dy-border-b dy-border-border/60 dy-overflow-x-auto dy-pb-px">
        {tabs.map((tab) => {
          const isActive = tab.label === activeTab
          const Icon = tab.options?.icon ? resolveAdminIcon(tab.options.icon, Folder) : null
          const badgeValue = badges[tab.label]

          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => setActiveTab(tab.label)}
              className={cn(
                "dy-flex dy-items-center dy-gap-2 dy-px-4 dy-py-2.5 dy-text-sm dy-font-semibold dy-border-b-2 dy-transition-all dy-whitespace-nowrap",
                isActive
                  ? "dy-border-primary dy-text-primary"
                  : "dy-border-transparent dy-text-muted-foreground hover:dy-text-foreground hover:dy-border-border",
              )}
            >
              {Icon && <Icon className="dy-h-4 dy-w-4" />}
              <span>{tab.label}</span>
              {badgeValue !== undefined && (
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className="dy-text-[10px] dy-px-1.5 dy-py-0 dy-h-4.5 dy-tabular-nums"
                >
                  {String(badgeValue)}
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      <div className="dy-grid dy-grid-cols-12 dy-gap-6 dy-pt-2">
        {selectedTab && renderItems(selectedTab.items)}
      </div>
    </div>
  )
}
