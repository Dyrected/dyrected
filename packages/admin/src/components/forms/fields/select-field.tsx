import * as React from "react"
import { Check, ChevronsUpDown, X, Plus } from "lucide-react"

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
import { normalizeOptions } from "../utils"
import type { Field as FieldSchema } from "@dyrected/sdk"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../../providers/dyrected-context"
import { useDebouncedValue } from "../../../hooks/use-debounced-value"

interface SelectFieldProps {
  schema: FieldSchema
  // React Hook Form field control object
  field: { value: unknown; onChange: (v: unknown) => void; onBlur?: () => void }
  disabled?: boolean
  collection?: string
  siblingValues?: Record<string, string | number | boolean>
}

/**
 * SelectField Component
 * 
 * Renders a single-select combobox dropdown utilizing shadcn UI Command.
 * Includes support for:
 * - **Static Options**: Resolved from collection field schemas.
 * - **Dynamic Options**: Async loaded from an endpoint based on collection, field name, and parent/sibling form values.
 * - **Clear Selection**: An inline clear button ("X" icon) is displayed next to the chevron when a value is selected,
 *   safely clearing the selection using `field.onChange("")` without opening the dropdown overlay.
 * - **Custom Option Creation**: Users can type custom values and select them as the field value.
 */
export function SelectField({ schema, field, disabled, collection, siblingValues }: SelectFieldProps) {
  const { client } = useDyrected()
  const [open, setOpen] = React.useState(false)
  const [searchVal, setSearchVal] = React.useState("")
  const label = schema.label || schema.name.charAt(0).toUpperCase() + schema.name.slice(1)

  const isDynamic = !!(schema.options && typeof schema.options === "object" && "_dynamic" in schema.options)

  // For dynamic options, let the server do the searching so large and growing
  // lists never have to be shipped to the browser in full. The typed query is
  // debounced and forwarded as `?search=`; the resolver decides how to use it.
  const debouncedSearch = useDebouncedValue(searchVal.trim(), 250)

  const { data: dynamicOptions, isLoading, isFetching } = useQuery({
    queryKey: ["options", collection, schema.name, siblingValues, debouncedSearch],
    queryFn: async () => {
      const q = new URLSearchParams()
      if (siblingValues) {
        Object.entries(siblingValues).forEach(([k, v]) => {
          if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
            q.append(k, String(v))
          }
        })
      }
      if (debouncedSearch) q.append("search", debouncedSearch)
      const baseUrl = client?.getBaseUrl() || ""
      const url = `${baseUrl}/api/dyrected/options/${collection}/${schema.name}?${q.toString()}`
      const authHeaders: Record<string, string> = {}
      const token = typeof window !== "undefined" ? localStorage.getItem("dyrected_token") : null
      if (token) authHeaders["Authorization"] = `Bearer ${token}`
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json", ...authHeaders },
      })
      if (!res.ok) throw new Error("Failed to fetch options")
      return res.json()
    },
    enabled: !!client && isDynamic && !!collection && !!schema.name,
    placeholderData: keepPreviousData,
  })

  const rawOptions = isDynamic ? (dynamicOptions || []) : schema.options
  const options = normalizeOptions(rawOptions).map((opt) => ({
    label: opt.label,
    value: String(opt.value ?? ""),
  }))

  const currentValue =
    field.value === "" || field.value === undefined || field.value === null
      ? ""
      : String(field.value)
  const selectedOption = options.find((opt) => opt.value === currentValue)
  const placeholder = isDynamic && isLoading ? "Loading options..." : schema.admin?.placeholder || `Select ${label.toLowerCase()}`

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchVal("")
    }
  }

  const trimmedSearch = searchVal.trim()
  const hasExactMatch = options.some(
    (opt) => opt.label.toLowerCase() === trimmedSearch.toLowerCase() || opt.value.toLowerCase() === trimmedSearch.toLowerCase()
  )
  const showCustomOption = trimmedSearch !== "" && !hasExactMatch

  return (
    <Popover open={disabled ? false : open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || (isDynamic && isLoading)}
          className={cn(
            "dy-h-12 dy-w-full dy-justify-between dy-rounded-xl dy-border-border/40 dy-bg-background/50 dy-px-4 dy-font-normal dy-shadow-sm dy-transition-all hover:dy-shadow-md",
            !selectedOption && "dy-text-muted-foreground"
          )}
        >
          <span className="dy-truncate">
            {selectedOption?.label || (currentValue && !selectedOption ? currentValue : placeholder)}
          </span>
          <div className="dy-flex dy-items-center dy-gap-1.5 dy-shrink-0">
            {selectedOption && !disabled && (
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
                  field.onChange("")
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
        <Command shouldFilter={!isDynamic}>
          <CommandInput
            placeholder={`Search ${label.toLowerCase()}...`}
            value={searchVal}
            onValueChange={setSearchVal}
          />
          <CommandList>
            {isDynamic && isFetching && (
              <div className="dy-py-6 dy-text-center dy-text-sm dy-text-muted-foreground">
                Searching…
              </div>
            )}
            {showCustomOption && (
              <CommandGroup heading="Custom Value">
                <CommandItem
                  value={searchVal}
                  onSelect={() => {
                    field.onChange(trimmedSearch)
                    handleOpenChange(false)
                  }}
                  className="dy-rounded-lg dy-py-2.5 dy-text-primary dy-font-medium"
                >
                  <Plus className="dy-mr-2 dy-h-4 dy-w-4" />
                  <span>Use "{trimmedSearch}"</span>
                </CommandItem>
              </CommandGroup>
            )}
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value || "__empty"}
                  value={`${opt.label} ${opt.value}`}
                  onSelect={() => {
                    field.onChange(opt.value)
                    handleOpenChange(false)
                  }}
                  className="dy-rounded-lg dy-py-2.5"
                >
                  <Check
                    className={cn(
                      "dy-mr-2 dy-h-4 dy-w-4",
                      currentValue === opt.value ? "dy-opacity-100" : "dy-opacity-0"
                    )}
                  />
                  <span className="dy-truncate">{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
