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
