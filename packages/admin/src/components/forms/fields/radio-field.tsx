import { RadioGroup, RadioGroupItem } from "../../ui/radio-group"
import { Label } from "../../ui/label"
import { cn } from "../../../lib/utils"
import { normalizeOptions } from "../utils"
import type { Field as FieldSchema } from "@dyrected/sdk"

interface RadioFieldProps {
  schema: FieldSchema
  field: any
  disabled?: boolean
}

export function RadioField({ schema, field, disabled }: RadioFieldProps) {
  const options = normalizeOptions(schema.options)
  const isHorizontal = schema.admin?.direction === "horizontal"

  return (
    <RadioGroup
      onValueChange={field.onChange}
      defaultValue={field.value}
      disabled={disabled}
      className={cn(
        "gap-4",
        isHorizontal ? "flex flex-wrap items-center" : "flex flex-col"
      )}
    >
      {options.map((opt) => (
        <div key={opt.value} className={cn(
          "relative flex items-center",
          isHorizontal ? "min-w-[120px]" : "w-full"
        )}>
          <RadioGroupItem
            value={opt.value}
            id={`${field.name}-${opt.value}`}
            className="peer absolute left-4 z-10"
          />
          <Label
            htmlFor={`${field.name}-${opt.value}`}
            className={cn(
              "flex flex-1 items-center pl-12 pr-4 py-3 rounded-xl border border-border/40 bg-white/50 cursor-pointer transition-all hover:bg-white/80 hover:shadow-sm",
              "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:shadow-md peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-primary/20",
              "text-sm font-medium text-foreground/70 peer-data-[state=checked]:text-primary"
            )}
          >
            {opt.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  )
}
