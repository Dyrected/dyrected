import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

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
import { useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../../providers/dyrected-provider"

interface SelectFieldProps {
  schema: FieldSchema
  // React Hook Form field control object
  field: { value: unknown; onChange: (v: unknown) => void; onBlur?: () => void }
  disabled?: boolean
  collection?: string
  siblingValues?: Record<string, string | number | boolean>
}

export function SelectField({ schema, field, disabled, collection, siblingValues }: SelectFieldProps) {
  const { client } = useDyrected()
  const [open, setOpen] = React.useState(false)
  const label = schema.label || schema.name.charAt(0).toUpperCase() + schema.name.slice(1)

  const isDynamic = !!(schema.options && typeof schema.options === "object" && "_dynamic" in schema.options)

  const { data: dynamicOptions, isLoading } = useQuery({
    queryKey: ["options", collection, schema.name, siblingValues],
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

  return (
    <Popover open={disabled ? false : open} onOpenChange={setOpen}>
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
            {selectedOption?.label || placeholder}
          </span>
          <ChevronsUpDown className="dy-ml-2 dy-h-4 dy-w-4 dy-shrink-0 dy-opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="dy-w-[var(--radix-popover-trigger-width)] dy-p-0 dy-rounded-xl dy-border-border/40 dy-shadow-xl" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value || "__empty"}
                  value={`${opt.label} ${opt.value}`}
                  onSelect={() => {
                    field.onChange(opt.value)
                    setOpen(false)
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
