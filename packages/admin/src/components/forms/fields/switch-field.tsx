import { Switch } from "../../ui/switch"

interface SwitchFieldProps {
  field: any
  disabled?: boolean
}

export function SwitchField({ field, disabled }: SwitchFieldProps) {
  return (
    <Switch
      id={field.id}
      checked={field.value}
      onCheckedChange={field.onChange}
      disabled={disabled}
    />
  )
}
