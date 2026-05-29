import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select"
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
    value: opt.value === "" ? "__EMPTY_VALUE__" : opt.value,
  }))

  const currentValue =
    field.value === "" || field.value === undefined || field.value === null
      ? "__EMPTY_VALUE__"
      : String(field.value)

  return (
    <Select
      value={currentValue}
      onValueChange={(val) => field.onChange(val === "__EMPTY_VALUE__" ? "" : val)}
      disabled={disabled || (isDynamic && isLoading)}
    >
      <SelectTrigger className="dy-h-12 dy-rounded-xl dy-border-border/40 dy-bg-background/50 focus:dy-ring-0 focus:dy-ring-offset-0 focus:dy-bg-background dy-shadow-sm dy-transition-all hover:dy-shadow-md">
        <SelectValue placeholder={isDynamic && isLoading ? "Loading options..." : schema.admin?.placeholder || `Select ${label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent className="dy-rounded-xl dy-border-border/40 dy-shadow-xl dy-animate-in dy-fade-in dy-zoom-in-95">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="dy-rounded-lg focus:dy-bg-primary/5 focus:dy-text-primary dy-transition-colors">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
