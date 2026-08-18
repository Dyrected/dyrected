/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react"
import { normalizeDetailItem } from "@dyrected/core"
import { resolveAdminIcon } from "../../lib/admin-icons"
import { Layers } from "lucide-react"
import { cn } from "../../lib/utils"
import type { DetailItem, DetailRepeatOptions } from "@dyrected/core"

export interface DetailRepeatComponentProps {
  field: string
  items: DetailItem[]
  options?: DetailRepeatOptions
  data: any[]
  renderItemContent: (item: DetailItem, rowData: any) => React.ReactNode
}

const cardSpanClasses: Record<number, string> = {
  1: "dy-col-span-12 sm:dy-col-span-6 md:dy-col-span-1",
  2: "dy-col-span-12 sm:dy-col-span-6 md:dy-col-span-2",
  3: "dy-col-span-12 sm:dy-col-span-6 md:dy-col-span-3",
  4: "dy-col-span-12 sm:dy-col-span-6 md:dy-col-span-4",
  5: "dy-col-span-12 sm:dy-col-span-6 md:dy-col-span-5",
  6: "dy-col-span-12 sm:dy-col-span-6",
  7: "dy-col-span-12 md:dy-col-span-7",
  8: "dy-col-span-12 md:dy-col-span-8",
  9: "dy-col-span-12 md:dy-col-span-9",
  10: "dy-col-span-12 md:dy-col-span-10",
  11: "dy-col-span-12 md:dy-col-span-11",
  12: "dy-col-span-12",
}

function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined
  if (path in obj) return obj[path]
  const parts = path.split(".")
  let curr = obj
  for (const part of parts) {
    if (curr == null) return undefined
    curr = curr[part]
  }
  return curr
}

export function DetailRepeatComponent({
  field: _field,
  items,
  options,
  data,
  renderItemContent,
}: DetailRepeatComponentProps) {
  const layout = options?.layout || "table"
  const emptyText = options?.emptyText || "No items recorded"

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="dy-p-6 dy-text-center dy-text-sm dy-text-muted-foreground/70 dy-bg-muted/20 dy-border dy-border-dashed dy-border-border dy-rounded-xl">
        {emptyText}
      </div>
    )
  }

  const normalizedItems = items.map(normalizeDetailItem)
  const Icon = options?.icon ? resolveAdminIcon(options.icon, Layers) : null

  function resolveRowTitle(row: any, rowIdx: number): string | undefined {
    const titleKey = options?.useAsTitle || options?.titleField
    if (titleKey) {
      const val = getNestedValue(row, titleKey)
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        return String(val)
      }
    }
    if (typeof options?.title === "string") {
      if (options.title.includes("{index}")) {
        return options.title.replace("{index}", String(rowIdx + 1))
      }
      return `${options.title} #${rowIdx + 1}`
    }
    return undefined
  }

  if (layout === "cards") {
    const gridCols =
      options?.columns === 1
        ? "dy-grid-cols-1"
        : options?.columns === 2
          ? "dy-grid-cols-1 sm:dy-grid-cols-2"
          : options?.columns === 4
            ? "dy-grid-cols-1 sm:dy-grid-cols-2 lg:dy-grid-cols-4"
            : "dy-grid-cols-1 sm:dy-grid-cols-2 lg:dy-grid-cols-3"

    return (
      <div className={cn("dy-grid dy-gap-4 dy-w-full", gridCols)}>
        {data.map((row, rowIdx) => {
          const rowTitle = resolveRowTitle(row, rowIdx)

          return (
            <div
              key={rowIdx}
              className="dy-p-4 dy-bg-card dy-border dy-border-border/60 dy-rounded-xl dy-shadow-sm dy-flex dy-flex-col dy-justify-between"
            >
              <div>
                {rowTitle && (
                  <div className="dy-flex dy-items-center dy-justify-between dy-border-b dy-border-border/40 dy-pb-2.5 dy-mb-3.5">
                    <div className="dy-flex dy-items-center dy-gap-2 dy-min-w-0">
                      {Icon && <Icon className="dy-h-4 dy-w-4 dy-text-primary dy-shrink-0" />}
                      <span className="dy-font-semibold dy-text-sm dy-text-card-foreground dy-truncate">
                        {rowTitle}
                      </span>
                    </div>
                    <span className="dy-text-xs dy-text-muted-foreground/60 dy-font-mono dy-shrink-0 dy-ml-2">
                      #{rowIdx + 1}
                    </span>
                  </div>
                )}
                <div className="dy-grid dy-grid-cols-12 dy-gap-3">
                  {normalizedItems.map((item, itemIdx) => {
                    const span = (item as any)?.options?.span ?? 12
                    const spanClass = cardSpanClasses[span] || "dy-col-span-12"
                    return (
                      <div key={itemIdx} className={spanClass}>
                        {renderItemContent(item, row)}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (layout === "list") {
    return (
      <div className="dy-divide-y dy-divide-border/40 dy-border dy-border-border/60 dy-rounded-xl dy-overflow-hidden dy-bg-card dy-w-full">
        {data.map((row, rowIdx) => {
          const rowTitle = resolveRowTitle(row, rowIdx)

          return (
            <div key={rowIdx} className="dy-p-4 hover:dy-bg-muted/20 dy-transition-colors dy-space-y-2.5">
              {rowTitle && (
                <div className="dy-flex dy-items-center dy-justify-between dy-mb-1">
                  <div className="dy-flex dy-items-center dy-gap-2">
                    {Icon && <Icon className="dy-h-3.5 dy-w-3.5 dy-text-primary" />}
                    <span className="dy-font-semibold dy-text-sm dy-text-card-foreground">
                      {rowTitle}
                    </span>
                  </div>
                  <span className="dy-text-xs dy-text-muted-foreground/60 dy-font-mono">
                    #{rowIdx + 1}
                  </span>
                </div>
              )}
              <div className="dy-grid dy-grid-cols-12 dy-gap-2.5">
                {normalizedItems.map((item, itemIdx) => {
                  const span = (item as any)?.options?.span ?? 12
                  const spanClass = cardSpanClasses[span] || "dy-col-span-12"
                  return (
                    <div key={itemIdx} className={spanClass}>
                      {renderItemContent(item, row)}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Default: Table layout
  return (
    <div className="dy-w-full dy-border dy-border-border/60 dy-rounded-xl dy-overflow-x-auto dy-shadow-sm dy-bg-card">
      <table className="dy-w-full dy-text-sm dy-text-left">
        <thead className="dy-bg-muted/50 dy-text-xs dy-uppercase dy-text-muted-foreground dy-border-b dy-border-border/60">
          <tr>
            {normalizedItems.map((item, idx) => {
              const label =
                typeof item === "object" && "options" in item && (item.options as any)?.label
                  ? (item.options as any).label
                  : typeof item === "object" && "field" in item
                    ? item.field
                    : typeof item === "object" && "label" in item
                      ? item.label
                      : `Col ${idx + 1}`
              return (
                <th key={idx} className="dy-px-4 dy-py-3 dy-font-semibold dy-whitespace-nowrap">
                  {label}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="dy-divide-y dy-divide-border/40">
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:dy-bg-muted/20 dy-transition-colors">
              {normalizedItems.map((item, colIdx) => (
                <td key={colIdx} className="dy-px-4 dy-py-3 dy-align-top">
                  {renderItemContent(item, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
