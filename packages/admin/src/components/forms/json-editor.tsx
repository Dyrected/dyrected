import * as React from "react"
import { Textarea } from "../../components/ui/textarea"
import { cn } from "../../lib/utils"

interface JsonEditorProps {
  value?: any
  onChange: (value: any) => void
  label?: string
}

export function JsonEditor({ value, onChange, label }: JsonEditorProps) {
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
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-medium leading-none">{label}</label>}
      <Textarea
        value={internalValue}
        onChange={handleChange}
        className={cn(
          "font-mono text-xs min-h-[150px]",
          error && "border-destructive focus-visible:ring-destructive"
        )}
        placeholder='{ "key": "value" }'
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
