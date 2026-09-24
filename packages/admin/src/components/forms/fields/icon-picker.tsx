import * as React from "react"
import { icons } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { ScrollArea } from "../../ui/scroll-area"
import { cn } from "../../../lib/utils"
import type { Field as FieldSchema } from "@dyrected/sdk"

import { CATEGORIES, getIconCategory, availableIconNames, getIcon } from "./icon-utils"


interface IconPickerProps {
  schema?: Partial<FieldSchema>
  field: { value: string; onChange: (v: string) => void }
  disabled?: boolean
  className?: string
  placeholder?: string
  hidePreview?: boolean
}

export function IconPicker({ schema, field, disabled, className, placeholder, hidePreview }: IconPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("all")
  const [visibleCount, setVisibleCount] = React.useState(100)

  const selectedIconName: string = field.value || ""
  const SelectedIcon = selectedIconName ? getIcon(selectedIconName) : undefined

  const filteredIcons = React.useMemo(() => {
    let list = availableIconNames
    if (selectedCategory !== "all") {
      list = availableIconNames.filter(name => getIconCategory(name) === selectedCategory)
    }
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(name => name.toLowerCase().includes(q))
    }
    return list
  }, [search, selectedCategory])

  return (
    <div className={cn("dy-flex dy-items-center dy-w-full", hidePreview ? "dy-gap-0" : "dy-gap-3")}>
      <Popover open={disabled ? false : open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              hidePreview
                ? "dy-flex-1 dy-justify-start dy-gap-1.5 dy-h-7 dy-rounded-md dy-border-border/50 dy-bg-background dy-px-2 dy-text-xs dy-font-normal hover:dy-bg-accent/40 dy-transition-colors"
                : "dy-flex-1 dy-justify-start dy-gap-3 dy-h-12 dy-rounded-lg dy-border-border/40 dy-bg-background/50 dy-font-normal hover:dy-shadow-md dy-transition-all",
              className
            )}
          >
            {SelectedIcon ? (
              <>
                {React.createElement(SelectedIcon, { className: "dy-h-3.5 dy-w-3.5 dy-text-primary dy-shrink-0" })}
                <span className="dy-text-xs dy-text-foreground/80 dy-truncate">{selectedIconName}</span>
              </>
            ) : (
              <span className="dy-text-muted-foreground dy-text-xs">
                {placeholder || schema?.admin?.placeholder || "Select an icon..."}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="dy-w-[340px] dy-p-3" align="start">
          <Input
            placeholder="Search icons..."
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setVisibleCount(100)
            }}
            className="dy-mb-3"
            autoFocus
          />
          <div className="dy-flex dy-gap-1.5 dy-overflow-x-auto dy-pb-2 dy-mb-2 dy-scrollbar-none">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id)
                  setVisibleCount(100)
                }}
                className={cn(
                  "dy-px-2.5 dy-py-1 dy-text-[10px] dy-rounded-full dy-whitespace-nowrap dy-transition-all",
                  selectedCategory === cat.id
                    ? "dy-bg-primary dy-text-primary-foreground dy-font-medium"
                    : "dy-bg-muted dy-text-muted-foreground hover:dy-bg-muted/80"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <ScrollArea className="dy-h-[240px]">
            <div className="dy-grid dy-grid-cols-7 dy-gap-1 dy-pr-3">
              {filteredIcons.slice(0, visibleCount).map(name => {
                const IconComp = icons[name]
                return (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => {
                      field.onChange(name)
                      setOpen(false)
                      setSearch("")
                    }}
                    className={cn(
                      "dy-flex dy-items-center dy-justify-center dy-h-9 dy-w-9 dy-rounded-lg dy-transition-colors hover:dy-bg-muted",
                      selectedIconName === name && "dy-bg-primary/10 dy-text-primary dy-ring-1 dy-ring-primary/20"
                    )}
                  >
                    <IconComp className="dy-h-4 dy-w-4" />
                  </button>
                )
              })}
              {filteredIcons.length === 0 && (
                <p className="dy-col-span-7 dy-py-6 dy-text-center dy-text-xs dy-text-muted-foreground/60">
                  No icons found for "{search}"
                </p>
              )}
            </div>
            {filteredIcons.length > visibleCount && (
              <div className="dy-py-2 dy-text-center dy-pr-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="dy-text-xs dy-text-muted-foreground hover:dy-text-primary"
                  onClick={() => setVisibleCount(prev => prev + 100)}
                >
                  Load more... ({filteredIcons.length - visibleCount} left)
                </Button>
              </div>
            )}
          </ScrollArea>
          {selectedIconName && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="dy-mt-2 dy-w-full dy-text-xs dy-text-muted-foreground hover:dy-text-destructive"
              onClick={() => {
                field.onChange("")
                setOpen(false)
              }}
            >
              Clear selection
            </Button>
          )}
        </PopoverContent>
      </Popover>

      {!hidePreview && SelectedIcon && (
        <div className="dy-flex dy-items-center dy-justify-center dy-h-12 dy-w-12 dy-rounded-lg dy-border dy-border-border/40 dy-bg-background/50 dy-shrink-0">
          {React.createElement(SelectedIcon, { className: "dy-h-6 dy-w-6 dy-text-foreground/70" })}
        </div>
      )}
    </div>
  )
}
