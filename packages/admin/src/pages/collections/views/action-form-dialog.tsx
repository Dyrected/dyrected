import * as React from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Textarea } from "../../../components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select"
import { Switch } from "../../../components/ui/switch"

interface ActionFormDialogProps {
  open: boolean
  label: string
  confirm?: string
  fields?: any[]
  isRunning: boolean
  onSubmit: (input: Record<string, unknown>) => void
  onCancel: () => void
}

/**
 * Input form dialog for actions that declare `fields`.
 * Renders type-aware controls (text, number, select, boolean, date, textarea)
 * and submits the collected values as the action's `input` payload.
 */
export function ActionFormDialog({ open, label, confirm, fields, isRunning, onSubmit, onCancel }: ActionFormDialogProps) {
  if (!open) return null
  return (
    <Dialog open onOpenChange={(next) => (!next ? onCancel() : undefined)}>
      <DialogContent className="dy-sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          {confirm && <DialogDescription>{confirm}</DialogDescription>}
        </DialogHeader>
        {/* Keyed by the field set so each staged action starts a fresh draft. */}
        <ActionForm key={formKey(fields)} fields={fields} isRunning={isRunning} onSubmit={onSubmit} onCancel={onCancel} />
      </DialogContent>
    </Dialog>
  )
}

function formKey(fields?: any[]): string {
  return (fields ?? []).map((field) => field.name).join(",")
}

function buildDefaults(fields?: any[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}
  for (const field of fields ?? []) {
    defaults[field.name] = field.defaultValue ?? (field.type === "boolean" ? false : "")
  }
  return defaults
}

function ActionForm({
  fields,
  isRunning,
  onSubmit,
  onCancel,
}: Pick<ActionFormDialogProps, "fields" | "isRunning" | "onSubmit" | "onCancel">) {
  const [values, setValues] = React.useState<Record<string, unknown>>(() => buildDefaults(fields))

  const setValue = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="dy-space-y-4">
      {(fields ?? []).map((field) => (
        <ActionField
          key={field.name}
          field={field}
          value={values[field.name]}
          onChange={(value) => setValue(field.name, value)}
        />
      ))}
      <DialogFooter className="dy-gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isRunning}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isRunning}>
          {isRunning && <Loader2 className="dy-mr-1 dy-h-3.5 dy-w-3.5 dy-animate-spin" />}
          Run
        </Button>
      </DialogFooter>
    </form>
  )
}

function ActionField({
  field,
  value,
  onChange,
}: {
  field: any
  value: unknown
  onChange: (value: unknown) => void
}) {
  const id = `action-field-${field.name}`
  const label = (
    <Label htmlFor={id} className="dy-text-xs dy-font-medium">
      {field.label || field.name}
      {field.required && <span className="dy-ml-0.5 dy-text-destructive">*</span>}
    </Label>
  )

  switch (field.type) {
    case "number": {
      return (
        <div className="dy-space-y-1.5">
          {label}
          <Input
            id={id}
            type="number"
            required={field.required}
            value={value === "" || value === null || value === undefined ? "" : String(value)}
            onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}
          />
        </div>
      )
    }
    case "boolean": {
      return (
        <div className="dy-flex dy-items-center dy-justify-between dy-gap-4">
          {label}
          <Switch id={id} checked={!!value} onCheckedChange={onChange} />
        </div>
      )
    }
    case "select":
    case "radio": {
      const options = Array.isArray(field.options)
        ? field.options.map((option: any) => (typeof option === "string" ? { label: option, value: option } : option))
        : []
      return (
        <div className="dy-space-y-1.5">
          {label}
          <Select value={String(value ?? "")} onValueChange={onChange} required={field.required}>
            <SelectTrigger id={id} className="dy-w-full">
              <SelectValue placeholder={`Select ${field.label || field.name}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option: { label: string; value: string }) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }
    case "date":
    case "datetime": {
      return (
        <div className="dy-space-y-1.5">
          {label}
          <Input
            id={id}
            type={field.type === "datetime" ? "datetime-local" : "date"}
            value={typeof value === "string" ? value.slice(0, field.type === "datetime" ? 16 : 10) : ""}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      )
    }
    case "textarea": {
      return (
        <div className="dy-space-y-1.5">
          {label}
          <Textarea
            id={id}
            rows={3}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      )
    }
    default: {
      return (
        <div className="dy-space-y-1.5">
          {label}
          <Input
            id={id}
            required={field.required}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      )
    }
  }
}
