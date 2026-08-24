import { Checkbox } from "../../ui/checkbox"

interface CheckboxFieldProps {
  field: any
  disabled?: boolean
}

export function CheckboxField({ field, disabled }: CheckboxFieldProps) {
  return (
    <Checkbox
      id={field.id}
      checked={!!field.value}
      onCheckedChange={(checked) => field.onChange(checked === true)}
      disabled={disabled}
    />
  )
}
