import * as React from "react"
import { Textarea } from "../../ui/textarea"
import { Button } from "../../ui/button"
import { ScrollArea } from "../../ui/scroll-area"
import { cn } from "../../../lib/utils"
import { Braces, Code, Eye, ChevronRight, ChevronDown } from "lucide-react"

interface JsonEditorProps {
  id?: string
  value?: unknown
  onChange: (value: unknown) => void
  label?: string
  disabled?: boolean
}

function JsonTreeNode({ label, value, isLast }: { label?: string; value: unknown; isLast?: boolean }) {
  const [isExpanded, setIsExpanded] = React.useState(true)

  if (value === null) {
    return (
      <div className="dy-pl-4 dy-py-0.5 dy-font-mono dy-text-xs">
        {label && <span className="dy-text-purple-600 dark:dy-text-purple-400">"{label}": </span>}
        <span className="dy-text-muted-foreground">null</span>
        {!isLast && ","}
      </div>
    )
  }

  if (typeof value === "boolean") {
    return (
      <div className="dy-pl-4 dy-py-0.5 dy-font-mono dy-text-xs">
        {label && <span className="dy-text-purple-600 dark:dy-text-purple-400">"{label}": </span>}
        <span className="dy-text-amber-600 dark:dy-text-amber-400">{String(value)}</span>
        {!isLast && ","}
      </div>
    )
  }

  if (typeof value === "number") {
    return (
      <div className="dy-pl-4 dy-py-0.5 dy-font-mono dy-text-xs">
        {label && <span className="dy-text-purple-600 dark:dy-text-purple-400">"{label}": </span>}
        <span className="dy-text-blue-600 dark:dy-text-blue-400">{value}</span>
        {!isLast && ","}
      </div>
    )
  }

  if (typeof value === "string") {
    return (
      <div className="dy-pl-4 dy-py-0.5 dy-font-mono dy-text-xs">
        {label && <span className="dy-text-purple-600 dark:dy-text-purple-400">"{label}": </span>}
        <span className="dy-text-emerald-600 dark:dy-text-emerald-400">"{value}"</span>
        {!isLast && ","}
      </div>
    )
  }

  if (Array.isArray(value)) {
    const isEmpty = value.length === 0
    return (
      <div className="dy-pl-4 dy-py-0.5 dy-font-mono dy-text-xs">
        <div className="dy-flex dy-items-center dy-gap-1">
          {!isEmpty && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="dy-p-0.5 hover:dy-bg-muted dy-rounded dy-text-muted-foreground"
            >
              {isExpanded ? <ChevronDown className="dy-h-3.5 dy-w-3.5" /> : <ChevronRight className="dy-h-3.5 dy-w-3.5" />}
            </button>
          )}
          {label && <span className="dy-text-purple-600 dark:dy-text-purple-400">"{label}": </span>}
          <span className="dy-text-muted-foreground">[</span>
          {!isExpanded && <span className="dy-text-muted-foreground/60 dy-text-[10px]"> {value.length} items </span>}
          {!isExpanded && <span className="dy-text-muted-foreground">]</span>}
          {!isExpanded && !isLast && ","}
        </div>
        {isExpanded && !isEmpty && (
          <div className="dy-border-l dy-border-border/60 dy-ml-2.5 dy-pl-1">
            {value.map((item, idx) => (
              <JsonTreeNode key={idx} value={item} isLast={idx === value.length - 1} />
            ))}
          </div>
        )}
        {isExpanded && <div className="dy-pl-4 dy-text-muted-foreground">]{!isLast && ","}</div>}
      </div>
    )
  }

  if (typeof value === "object") {
    const keys = Object.keys(value as object)
    const isEmpty = keys.length === 0
    return (
      <div className="dy-pl-4 dy-py-0.5 dy-font-mono dy-text-xs">
        <div className="dy-flex dy-items-center dy-gap-1">
          {!isEmpty && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="dy-p-0.5 hover:dy-bg-muted dy-rounded dy-text-muted-foreground"
            >
              {isExpanded ? <ChevronDown className="dy-h-3.5 dy-w-3.5" /> : <ChevronRight className="dy-h-3.5 dy-w-3.5" />}
            </button>
          )}
          {label && <span className="dy-text-purple-600 dark:dy-text-purple-400">"{label}": </span>}
          <span className="dy-text-muted-foreground">{"{"}</span>
          {!isExpanded && <span className="dy-text-muted-foreground/60 dy-text-[10px]"> {keys.length} keys </span>}
          {!isExpanded && <span className="dy-text-muted-foreground">{"}"}</span>}
          {!isExpanded && !isLast && ","}
        </div>
        {isExpanded && !isEmpty && (
          <div className="dy-border-l dy-border-border/60 dy-ml-2.5 dy-pl-1">
            {keys.map((key, idx) => (
              <JsonTreeNode
                key={key}
                label={key}
                value={(value as Record<string, unknown>)[key]}
                isLast={idx === keys.length - 1}
              />
            ))}
          </div>
        )}
        {isExpanded && <div className="dy-pl-4 dy-text-muted-foreground">{"}"}{!isLast && ","}</div>}
      </div>
    )
  }

  return null
}

export function JsonEditor({ id, value, onChange, label, disabled }: JsonEditorProps) {
  const [internalValue, setInternalValue] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [mode, setMode] = React.useState<"code" | "tree">("code")

  // Initialize internal string value from the JSON prop
  React.useEffect(() => {
    try {
      if (value !== undefined) {
        const nextStr = JSON.stringify(value, null, 2)
        if (nextStr !== internalValue) {
          Promise.resolve().then(() => {
            setInternalValue(nextStr)
          })
        }
      }
    } catch {
      // Ignore initial parse errors
    }
  }, [value, internalValue])

  const validateAndFormat = (val: string, format: boolean = false) => {
    if (!val.trim()) {
      setError(null)
      onChange(null)
      return
    }

    try {
      const parsed = JSON.parse(val)
      setError(null)
      onChange(parsed)
      if (format) {
        setInternalValue(JSON.stringify(parsed, null, 2))
      }
    } catch (err: unknown) {
      const msg = (err as Error).message || "Invalid JSON format"
      const match = msg.match(/position (\d+)/) || msg.match(/char (\d+)/)
      if (match) {
        const pos = parseInt(match[1], 10)
        const lines = val.substring(0, pos).split("\n")
        const line = lines.length
        const col = lines[lines.length - 1].length + 1
        setError(`${msg} (at line ${line}, column ${col})`)
      } else {
        setError(msg)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInternalValue(val)
    validateAndFormat(val, false)
  }

  const handleFormat = () => {
    validateAndFormat(internalValue, true)
  }

  return (
    <div className="dy-flex dy-flex-col dy-gap-2">
      <div className="dy-flex dy-items-center dy-justify-between">
        {label && <span className="dy-text-sm dy-font-semibold dy-text-foreground/70 dy-tracking-tight dy-leading-none">{label}</span>}
        <div className="dy-flex dy-items-center dy-gap-1.5 dy-ml-auto">
          {mode === "code" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFormat}
              disabled={disabled || !!error || !internalValue.trim()}
              className="dy-h-7 dy-px-2 dy-text-[11px] dy-rounded-md"
            >
              <Braces className="dy-h-3 dy-w-3 dy-mr-1" />
              Format
            </Button>
          )}
          <div className="dy-flex dy-bg-muted dy-p-0.5 dy-rounded-lg dy-border dy-border-border/50">
            <Button
              type="button"
              variant={mode === "code" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setMode("code")}
              className="dy-h-6 dy-px-2.5 dy-text-[10px] dy-rounded-md dy-font-bold"
            >
              <Code className="dy-h-3 dy-w-3 dy-mr-1" />
              Code
            </Button>
            <Button
              type="button"
              variant={mode === "tree" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setMode("tree")}
              disabled={!!error || !internalValue.trim()}
              className="dy-h-6 dy-px-2.5 dy-text-[10px] dy-rounded-md dy-font-bold"
            >
              <Eye className="dy-h-3 dy-w-3 dy-mr-1" />
              Tree
            </Button>
          </div>
        </div>
      </div>

      {mode === "code" ? (
        <Textarea
          id={id}
          value={internalValue}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            "dy-font-mono dy-text-xs dy-min-h-[180px] dy-bg-muted/15 dy-border-dashed focus-visible:dy-ring-1 dy-rounded-lg",
            error && "dy-border-destructive/60 focus-visible:dy-ring-destructive/30"
          )}
          placeholder='{ "key": "value" }'
        />
      ) : (
        <ScrollArea className="dy-h-[180px] dy-w-full dy-rounded-lg dy-border dy-border-dashed dy-border-border/60 dy-bg-muted/15 dy-p-4">
          {value ? (
            <div className="dy-flex dy-flex-col">
              <JsonTreeNode value={value} isLast={true} />
            </div>
          ) : (
            <span className="dy-text-xs dy-text-muted-foreground/60 dy-italic">No JSON values to show.</span>
          )}
        </ScrollArea>
      )}

      {error && <span className="dy-text-xs dy-text-destructive dy-font-semibold dy-bg-destructive/5 dy-border dy-border-destructive/10 dy-p-2 dy-rounded-lg dy-animate-in dy-slide-in-from-top-1">{error}</span>}
    </div>
  )
}
