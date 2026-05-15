import * as React from "react"
import * as Icons from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { ScrollArea } from "../../ui/scroll-area"
import { cn } from "../../../lib/utils"
import type { Field as FieldSchema } from "@dyrected/sdk"

const allIconNames = Object.keys(Icons).filter(
  key => typeof (Icons as any)[key] === "function" && /^[A-Z]/.test(key)
)

interface IconPickerProps {
  schema: FieldSchema
  field: any
  disabled?: boolean
}

export function IconPicker({ schema, field, disabled }: IconPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selectedIconName: string = field.value || ""
  const SelectedIcon = selectedIconName ? (Icons as any)[selectedIconName] : null

  const filteredIcons = React.useMemo(() => {
    if (!search) return allIconNames
    const q = search.toLowerCase()
    return allIconNames.filter(name => name.toLowerCase().includes(q))
  }, [search])

  return (
    <div className="dy-flex dy-items-center dy-gap-3">
      <Popover open={disabled ? false : open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="dy-flex-1 dy-justify-start dy-gap-3 dy-h-12 dy-rounded-xl dy-border-border/40 dy-bg-white/50 dy-font-normal hover:dy-shadow-md dy-transition-all"
          >
            {SelectedIcon ? (
              <>
                <SelectedIcon className="dy-h-5 dy-w-5 dy-text-primary dy-shrink-0" />
                <span className="dy-text-sm dy-text-foreground/80">{selectedIconName}</span>
              </>
            ) : (
              <span className="dy-text-muted-foreground dy-text-sm">
                {schema.admin?.placeholder || "Select an icon..."}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="dy-w-[340px] dy-p-3" align="start">
          <Input
            placeholder="Search icons..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="dy-mb-3"
            autoFocus
          />
          <ScrollArea className="dy-h-[240px]">
            <div className="dy-grid dy-grid-cols-7 dy-gap-1 dy-pr-3">
              {filteredIcons.slice(0, 280).map(name => {
                const IconComp = (Icons as any)[name]
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

      {SelectedIcon && (
        <div className="dy-flex dy-items-center dy-justify-center dy-h-12 dy-w-12 dy-rounded-xl dy-border dy-border-border/40 dy-bg-white/50 dy-shrink-0">
          <SelectedIcon className="dy-h-6 dy-w-6 dy-text-foreground/70" />
        </div>
      )}
    </div>
  )
}
