import * as React from "react"
import { Textarea } from "../../ui/textarea"
import { cn } from "../../../lib/utils"

interface JsonEditorProps {
  value?: any
  onChange: (value: any) => void
  label?: string
  disabled?: boolean
}

export function JsonEditor({ value, onChange, label, disabled }: JsonEditorProps) {
  const [internalValue, setInternalValue] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  // Initialize internal string value from the JSON prop
  React.useEffect(() => {
    try {
      if (value !== undefined) {
        setInternalValue(JSON.stringify(value, null, 2))
      }
    } catch (e) {
      // Ignore initial parse errors if the value is somehow malformed
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInternalValue(val)
    
    if (!val.trim()) {
      setError(null)
      onChange(null)
      return
    }

    try {
      const parsed = JSON.parse(val)
      setError(null)
      onChange(parsed)
    } catch (err: any) {
      setError("Invalid JSON format")
    }
  }

  return (
    <div className="dy-flex dy-flex-col dy-gap-2">
      {label && <label className="dy-text-sm dy-font-medium dy-leading-none">{label}</label>}
      <Textarea
        value={internalValue}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          "dy-font-mono dy-text-xs dy-min-h-[150px]",
          error && "dy-border-destructive focus-visible:dy-ring-destructive"
        )}
        placeholder='{ "key": "value" }'
      />
      {error && <span className="dy-text-xs dy-text-destructive">{error}</span>}
    </div>
  )
}
