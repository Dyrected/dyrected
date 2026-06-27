import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "../../../lib/utils"
import { Button } from "../../ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../ui/popover"
import { Badge } from "../../ui/badge"
import { useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../../providers/dyrected-context"
import type { Field as FieldSchema } from "@dyrected/sdk"

interface Option {
  label: string
  value: string
}

interface MultiSelectProps {
  options: Option[]
  value?: string[]
  onChange: (value: string[]) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  collection?: string
  siblingValues?: Record<string, string | number | boolean>
  schema?: FieldSchema
}

/**
 * MultiSelect Component
 * 
 * Renders a tag-based multi-selection UI using a searchable dropdown.
 * Includes support for:
 * - **Tag Removal**: Individual tags can be removed using their inline close buttons.
 * - **Clear All Selections**: A clear button ("X" icon) is rendered next to the chevron when values are selected,
 *   safely clearing the entire selection list at once (`onChange([])`) without opening the dropdown list.
 */
export function MultiSelect({
  options,
  value = [],
  onChange,
  label,
  placeholder = "Select options...",
  disabled,
  collection,
  siblingValues,
  schema,
}: MultiSelectProps) {
  const { client } = useDyrected()
  const [open, setOpen] = React.useState(false)

  const isDynamic = !!(schema?.options && typeof schema.options === "object" && "_dynamic" in schema.options)

  const { data: dynamicOptions, isLoading } = useQuery({
    queryKey: ["options", collection, schema?.name, siblingValues],
    queryFn: async () => {
      const q = new URLSearchParams()
      if (siblingValues) {
        Object.entries(siblingValues).forEach(([k, v]) => {
          if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
            q.append(k, String(v))
          }
        })
      }
      const baseUrl = client?.getBaseUrl() || ""
      const url = `${baseUrl}/api/dyrected/options/${collection}/${schema?.name}?${q.toString()}`
      const authHeaders: Record<string, string> = {}
      const token = typeof window !== "undefined" ? localStorage.getItem("dyrected_token") : null
      if (token) authHeaders["Authorization"] = `Bearer ${token}`
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json", ...authHeaders },
      })
      if (!res.ok) throw new Error("Failed to fetch options")
      return res.json()
    },
    enabled: !!client && isDynamic && !!collection && !!schema?.name,
  })

  const rawOptions = isDynamic ? (dynamicOptions || []) : options
  const normalizedOpts = (Array.isArray(rawOptions) ? rawOptions : []).map((opt: string | Option) => {
    if (typeof opt === "string") return { label: opt, value: opt }
    return { label: opt?.label || "", value: opt?.value || "" }
  })

  const handleSelect = (currentValue: string) => {
    const isSelected = value.includes(currentValue)
    if (isSelected) {
      onChange(value.filter((val) => val !== currentValue))
    } else {
      onChange([...value, currentValue])
    }
  }

  const handleRemove = (valueToRemove: string) => {
    onChange(value.filter((val) => val !== valueToRemove))
  }

  return (
    <div className="dy-flex dy-flex-col dy-gap-2">
      {label && <label className="dy-text-sm dy-font-medium dy-leading-none">{label}</label>}
      <Popover open={disabled ? false : open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || (isDynamic && isLoading)}
            className="dy-min-h-12 dy-w-full dy-justify-between dy-rounded-xl dy-border-border/40 dy-bg-background/50 dy-px-4 dy-font-normal dy-shadow-sm dy-transition-all hover:dy-shadow-md"
          >
            <div className="dy-flex dy-min-w-0 dy-flex-1 dy-flex-wrap dy-items-center dy-gap-1">
              {value.length === 0 && (
                <span className="dy-truncate dy-text-muted-foreground">
                  {isDynamic && isLoading ? "Loading options..." : placeholder}
                </span>
              )}
              {value.map((val) => {
                const option = normalizedOpts.find((opt) => opt.value === val)
                return (
                  <Badge
                    key={val}
                    variant="secondary"
                    className="dy-mr-1 dy-items-center dy-gap-1 dy-rounded-md"
                  >
                    {option?.label || val}
                    {!disabled && (
                      <div
                        role="button"
                        tabIndex={0}
                        className="dy-ring-offset-background dy-rounded-full dy-outline-none focus:dy-ring-2 focus:dy-ring-ring focus:dy-ring-offset-2"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRemove(val)
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onClick={() => handleRemove(val)}
                      >
                        <X className="dy-h-3 dy-w-3 dy-text-muted-foreground hover:dy-text-foreground" />
                      </div>
                    )}
                  </Badge>
                )
              })}
            </div>
            <div className="dy-flex dy-items-center dy-gap-1.5 dy-shrink-0 dy-ml-2">
              {value.length > 0 && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  className="dy-text-muted-foreground hover:dy-text-foreground dy-p-1 dy-rounded-md hover:dy-bg-muted dy-transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onChange([])
                  }}
                >
                  <X className="dy-h-3.5 dy-w-3.5" />
                </span>
              )}
              <ChevronsUpDown className="dy-h-4 dy-w-4 dy-opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="dy-w-[var(--radix-popover-trigger-width)] dy-p-0 dy-rounded-xl dy-border-border/40 dy-shadow-xl" align="start">
          <Command>
            <CommandInput placeholder="Search options..." />
            <CommandList>
              <CommandEmpty>No option found.</CommandEmpty>
              <CommandGroup>
                {normalizedOpts.map((option) => {
                  const isSelected = value.includes(option.value)
                  return (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.value}`}
                      onSelect={() => handleSelect(option.value)}
                      className="dy-rounded-lg dy-py-2.5"
                    >
                      <Check
                        className={cn(
                          "dy-mr-2 dy-h-4 dy-w-4",
                          isSelected ? "dy-opacity-100" : "dy-opacity-0"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
