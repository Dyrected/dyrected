/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react"
import { normalizeDetailItem, isDetailItemVisible } from "@dyrected/core"
import { DetailSectionComponent } from "./detail-section"
import { DetailTabsComponent } from "./detail-tabs"
import { DetailGridComponent } from "./detail-grid"
import { DetailFieldRenderer } from "./detail-field-renderer"
import { DetailRepeatComponent } from "./detail-repeat"
import { DetailComputedComponent } from "./detail-computed"
import { cn } from "../../lib/utils"
import { useDyrected } from "../../providers/dyrected-context"
import type { DetailItem, DetailSpan } from "@dyrected/core"

export interface DetailRendererProps {
  items: DetailItem[]
  doc: any
  collection: any
  user?: any
  client?: any
  schemas?: any
  onUpdate?: (fieldName: string, newValue: any) => Promise<void> | void
}

const topLevelSpanClasses: Record<number, string> = {
  1: "dy-col-span-12 lg:dy-col-span-1",
  2: "dy-col-span-12 lg:dy-col-span-2",
  3: "dy-col-span-12 lg:dy-col-span-3",
  4: "dy-col-span-12 lg:dy-col-span-4",
  5: "dy-col-span-12 lg:dy-col-span-5",
  6: "dy-col-span-12 lg:dy-col-span-6",
  7: "dy-col-span-12 lg:dy-col-span-7",
  8: "dy-col-span-12 lg:dy-col-span-8",
  9: "dy-col-span-12 lg:dy-col-span-9",
  10: "dy-col-span-12 lg:dy-col-span-10",
  11: "dy-col-span-12 lg:dy-col-span-11",
  12: "dy-col-span-12",
}

const innerSpanClasses: Record<number, string> = {
  1: "dy-col-span-12 sm:dy-col-span-6 md:dy-col-span-3 lg:dy-col-span-1",
  2: "dy-col-span-12 sm:dy-col-span-6 md:dy-col-span-4 lg:dy-col-span-2",
  3: "dy-col-span-12 sm:dy-col-span-6 md:dy-col-span-6 lg:dy-col-span-3",
  4: "dy-col-span-12 sm:dy-col-span-6 md:dy-col-span-6 lg:dy-col-span-4",
  5: "dy-col-span-12 sm:dy-col-span-6 md:dy-col-span-6 lg:dy-col-span-5",
  6: "dy-col-span-12 sm:dy-col-span-6 md:dy-col-span-6 lg:dy-col-span-6",
  7: "dy-col-span-12 lg:dy-col-span-7",
  8: "dy-col-span-12 lg:dy-col-span-8",
  9: "dy-col-span-12 lg:dy-col-span-9",
  10: "dy-col-span-12 lg:dy-col-span-10",
  11: "dy-col-span-12 lg:dy-col-span-11",
  12: "dy-col-span-12",
}

function getItemSpan(item: any): DetailSpan {
  if (item && typeof item === "object") {
    if (item.options?.span) return item.options.span
  }
  return 12
}

function humanizeLabel(fieldName: string): string {
  if (!fieldName) return ""
  return fieldName
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_.]/g, " ")
    .trim()
    .replace(/^./, (str) => str.toUpperCase())
}

export function DetailRenderer({
  items,
  doc,
  collection,
  user,
  client,
  schemas,
  onUpdate,
}: DetailRendererProps) {
  let components: any = {}
  try {
    const ctx = useDyrected()
    components = ctx?.components ?? {}
  } catch {
    components = {}
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

  function findNestedFieldDef(fields: any[] | undefined, path: string): any {
    if (!fields || !path) return undefined
    const parts = path.split(".")
    let currentFields: any[] | undefined = fields
    let found: any = undefined

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      found = currentFields?.find((f: any) => f.name === part)
      if (!found) return undefined
      if (i < parts.length - 1) {
        currentFields = found.fields || found.blocks
      }
    }
    return found
  }

  const renderSingleItem = (
    rawItem: DetailItem,
    currentDoc: any = doc,
    scopedFields: any[] | undefined = collection?.fields,
  ): React.ReactNode => {
    if (!isDetailItemVisible(rawItem, currentDoc, user)) {
      return null
    }
    const item = normalizeDetailItem(rawItem)

    if (item.type === "section") {
      const visibleSubItems = item.items.filter((subItem) => isDetailItemVisible(subItem, currentDoc, user))
      return (
        <DetailSectionComponent title={item.title} options={item.options}>
          {visibleSubItems.map((subItem, idx) => (
            <div key={idx} className={innerSpanClasses[getItemSpan(subItem)] || "dy-col-span-12"}>
              {renderSingleItem(subItem, currentDoc, scopedFields)}
            </div>
          ))}
        </DetailSectionComponent>
      )
    }

    if (item.type === "tabs") {
      const visibleTabs = item.tabs.filter((tab) => isDetailItemVisible({ type: "tab", label: tab.label, items: tab.items, options: tab.options } as any, currentDoc, user))
      if (visibleTabs.length === 0) return null

      return (
        <DetailTabsComponent
          tabs={visibleTabs}
          options={item.options}
          doc={currentDoc}
          user={user}
          renderItems={(tabItems) =>
            tabItems
              .filter((subItem) => isDetailItemVisible(subItem, currentDoc, user))
              .map((subItem, idx) => (
                <div key={idx} className={innerSpanClasses[getItemSpan(subItem)] || "dy-col-span-12"}>
                  {renderSingleItem(subItem, currentDoc, scopedFields)}
                </div>
              ))
          }
        />
      )
    }

    if (item.type === "grid") {
      const visibleSubItems = item.items.filter((subItem) => isDetailItemVisible(subItem, currentDoc, user))
      return (
        <DetailGridComponent columns={item.columns}>
          {visibleSubItems.map((subItem, idx) => (
            <div key={idx}>{renderSingleItem(subItem, currentDoc, scopedFields)}</div>
          ))}
        </DetailGridComponent>
      )
    }

    if (item.type === "repeat") {
      const parentFieldDef = findNestedFieldDef(scopedFields, item.field)
      const childFields = parentFieldDef?.fields || scopedFields
      const rawRepeatData = getNestedValue(currentDoc, item.field)
      const repeatData = Array.isArray(rawRepeatData) ? rawRepeatData : (rawRepeatData?.docs || [])
      const visibleRepeatItems = item.items.filter((subItem) => isDetailItemVisible(subItem, currentDoc, user))
      return (
        <DetailRepeatComponent
          field={item.field}
          fieldDef={parentFieldDef}
          doc={currentDoc}
          client={client}
          items={visibleRepeatItems}
          options={item.options}
          data={repeatData}
          renderItemContent={(subItem, rowData) => renderSingleItem(subItem, rowData, childFields)}
        />
      )
    }

    if (item.type === "computed") {
      return (
        <DetailComputedComponent
          id={item.id}
          label={item.label}
          expression={item.expression}
          options={item.options}
          doc={currentDoc}
          user={user}
        />
      )
    }

    if (item.type === "divider") {
      const spacingClass =
        item.options?.spacing === "sm"
          ? "dy-my-2"
          : item.options?.spacing === "lg"
            ? "dy-my-6"
            : item.options?.spacing === "none"
              ? "dy-my-0"
              : "dy-my-4"
      return <hr className={cn("dy-border-border/60 border-[0.5px] dy-w-full", spacingClass)} />
    }

    if (item.type === "text") {
      const variant = item.options?.variant || "body"
      if (variant === "heading") {
        return (
          <h3 className={cn("dy-text-base dy-font-semibold dy-text-card-foreground", item.options?.className)}>
            {item.content}
          </h3>
        )
      }
      if (variant === "subheading") {
        return (
          <h4 className={cn("dy-text-sm dy-font-semibold dy-text-card-foreground", item.options?.className)}>
            {item.content}
          </h4>
        )
      }
      if (variant === "muted") {
        return (
          <p className={cn("dy-text-xs dy-text-muted-foreground", item.options?.className)}>
            {item.content}
          </p>
        )
      }
      if (variant === "caption") {
        return (
          <p className={cn("dy-text-xs dy-font-medium dy-text-muted-foreground dy-uppercase dy-tracking-wider", item.options?.className)}>
            {item.content}
          </p>
        )
      }
      if (variant === "callout" || variant === "info") {
        return (
          <div className={cn("dy-p-3 dy-rounded-lg dy-bg-primary/10 dy-border dy-border-primary/20 dy-text-primary dy-text-sm", item.options?.className)}>
            {item.content}
          </div>
        )
      }
      if (variant === "warning") {
        return (
          <div className={cn("dy-p-3 dy-rounded-lg dy-bg-amber-500/10 dy-border dy-border-amber-500/20 dy-text-amber-600 dark:dy-text-amber-400 dy-text-sm", item.options?.className)}>
            {item.content}
          </div>
        )
      }
      return <p className={cn("dy-text-sm dy-text-foreground", item.options?.className)}>{item.content}</p>
    }

    if (item.type === "custom") {
      if (typeof item.options?.render === "function") {
        return item.options.render({ doc: currentDoc, user, props: item.options?.props })
      }
      const CustomComp =
        (components as any)?.[item.name] ||
        (components as any)?.fields?.[item.name] ||
        (components as any)?.customComponents?.[item.name] ||
        schemas?.customComponents?.[item.name] ||
        collection?.admin?.components?.[item.name]
      if (CustomComp) {
        return <CustomComp doc={currentDoc} user={user} {...(item.options?.props || {})} />
      }
      return (
        <div className="dy-p-3 dy-rounded-lg dy-border dy-border-dashed dy-border-border dy-text-xs dy-text-muted-foreground">
          Custom Component: <span className="dy-font-mono">{item.name}</span>
        </div>
      )
    }

    if (item.type === "field") {
      const fieldDef = findNestedFieldDef(scopedFields, item.field) || {
        name: item.field,
        label: humanizeLabel(item.field),
      }
      const value = getNestedValue(currentDoc, item.field)
      return (
        <DetailFieldRenderer
          fieldDef={fieldDef}
          value={value}
          doc={currentDoc}
          collection={collection}
          options={item.options}
          client={client}
          schemas={schemas}
          onUpdate={onUpdate}
        />
      )
    }

    return null
  }

  return (
    <div className="dy-grid dy-grid-cols-12 dy-gap-4">
      {items
        .filter((rawItem) => isDetailItemVisible(rawItem, doc, user))
        .map((rawItem, idx) => {
          const item = normalizeDetailItem(rawItem)
          const span = getItemSpan(item)
          const spanClass = topLevelSpanClasses[span] || "dy-col-span-12"

          return (
            <div key={idx} className={cn(spanClass, "dy-min-w-0")}>
              {renderSingleItem(item, doc)}
            </div>
          )
        })}
    </div>
  )
}
