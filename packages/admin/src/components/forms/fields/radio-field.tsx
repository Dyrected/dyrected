import { useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../../providers/dyrected-context"
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group"
import { Label } from "../../ui/label"
import { cn } from "../../../lib/utils"
import { normalizeOptions } from "../utils"
import type { Field as FieldSchema } from "@dyrected/sdk"

interface RadioFieldProps {
  schema: FieldSchema
  field: {
    value: string | number | null | undefined
    onChange: (value: string) => void
    onBlur?: () => void
    name: string
  }
  disabled?: boolean
  collection?: string
  siblingValues?: Record<string, unknown>
}

export function RadioField({ schema, field, disabled, collection, siblingValues }: RadioFieldProps) {
  const { client } = useDyrected()
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
      const res = await fetch(url, { headers: { "Content-Type": "application/json", ...authHeaders } })
      if (!res.ok) throw new Error("Failed to fetch options")
      return res.json()
    },
    enabled: !!client && isDynamic && !!collection && !!schema.name,
  })

  const rawOptions = isDynamic ? (dynamicOptions || []) : (Array.isArray(schema.options) ? schema.options : [])
  const options = normalizeOptions(rawOptions)
  const isHorizontal = (schema.admin as { direction?: string })?.direction === "horizontal"

  if (isDynamic && isLoading) {
    return (
      <div className="dy-flex dy-gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="dy-h-12 dy-w-32 dy-rounded-xl dy-bg-muted dy-animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <RadioGroup
      onValueChange={field.onChange}
      value={field.value !== undefined && field.value !== null ? String(field.value) : ""}
      disabled={disabled}
      className={cn(
        "dy-gap-4",
        isHorizontal ? "dy-flex dy-flex-wrap dy-items-center" : "dy-flex dy-flex-col"
      )}
    >
      {options.map((opt) => (
        <div key={opt.value} className={cn(
          "dy-relative dy-flex dy-items-center",
          isHorizontal ? "dy-min-w-[120px]" : "dy-w-full"
        )}>
          <RadioGroupItem
            value={opt.value}
            id={`${field.name}-${opt.value}`}
            className="dy-peer dy-absolute dy-left-4 dy-z-10"
          />
          <Label
            htmlFor={`${field.name}-${opt.value}`}
            className={cn(
              "dy-flex dy-flex-1 dy-items-center dy-pl-12 dy-pr-4 dy-py-3 dy-rounded-xl dy-border dy-border-border/40 dy-bg-background/50 dy-cursor-pointer dy-transition-all hover:dy-bg-background/80 hover:dy-shadow-sm",
              "dy-peer-data-[state=checked]:dy-border-primary dy-peer-data-[state=checked]:dy-bg-primary/5 dy-peer-data-[state=checked]:dy-shadow-md dy-peer-data-[state=checked]:dy-ring-1 dy-peer-data-[state=checked]:dy-ring-primary/20",
              "dy-text-sm dy-font-medium dy-text-foreground/70 dy-peer-data-[state=checked]:dy-text-primary"
            )}
          >
            {opt.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  )
}
