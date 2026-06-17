import * as React from "react"
import { useWatch } from "react-hook-form"
import type { Control, FieldValues } from "react-hook-form"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { FieldSchema } from "../form-engine"
import { Button } from "../../ui/button"

interface ObjectFieldRendererProps {
  schema: FieldSchema
  basePath: string
  control: Control<FieldValues>
  renderField: (field: FieldSchema, basePath: string) => React.ReactNode
}

function FieldColumn({
  field,
  children,
}: {
  field: FieldSchema
  children: React.ReactNode
}) {
  return (
    <div
      className="dy-min-w-0 dy-px-3"
      style={{ width: field.admin?.width || "100%" }}
    >
      {children}
    </div>
  )
}

export function ObjectFieldRenderer({
  schema,
  basePath,
  control,
  renderField,
}: ObjectFieldRendererProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false)

  const objectValues = useWatch({
    control,
    name: basePath as never,
  }) || {}

  const getObjectSummary = () => {
    if (!objectValues || typeof objectValues !== "object") return ""

    const candidates = ["title", "label", "name", "filename", "header", "slug", "text"]
    for (const key of candidates) {
      if (objectValues[key] && typeof objectValues[key] === "string" && objectValues[key].trim()) {
        return objectValues[key].trim()
      }
    }

    const summaries: string[] = []
    schema.fields?.forEach((field) => {
      const val = objectValues[field.name]
      if (val !== undefined && val !== null && val !== "") {
        if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
          summaries.push(`${field.label || field.name}: ${val}`)
        }
      }
    })

    return summaries.length > 0 ? summaries.slice(0, 3).join(", ") : "Empty"
  }

  return (
    <div className="dy-border dy-border-muted/30 dy-bg-muted/5 dy-rounded-2xl dy-p-4 dy-transition-all">
      <div className="dy-flex dy-items-center dy-justify-between dy-pb-3 dy-border-b dy-border-muted/20 dy-mb-4">
        <div className="dy-flex dy-flex-col dy-min-w-0">
          <div className="dy-flex dy-items-center dy-gap-2">
            <h4 className="dy-font-bold dy-text-sm dy-text-foreground/80 dy-tracking-tight">
              {schema.label || schema.name!.charAt(0).toUpperCase() + schema.name!.slice(1)}
            </h4>
            {isCollapsed && (
              <span className="dy-text-xs dy-text-muted-foreground/60 dy-truncate max-w-[250px] dy-font-normal dy-italic">
                - {getObjectSummary()}
              </span>
            )}
          </div>
          {schema.admin?.description && (
            <p className="dy-text-[10px] dy-text-muted-foreground/50 dy-italic dy-mt-0.5">{schema.admin.description}</p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="dy-h-7 dy-w-7 dy-text-muted-foreground/40 hover:dy-bg-muted"
          onClick={() => setIsCollapsed((value) => !value)}
          title={isCollapsed ? "Expand section" : "Collapse section"}
        >
          {isCollapsed ? <ChevronDown className="dy-w-3.5 dy-h-3.5" /> : <ChevronUp className="dy-w-3.5 dy-h-3.5" />}
        </Button>
      </div>

      {!isCollapsed && (
        <div className="dy--mx-3 dy-flex dy-flex-wrap dy-gap-y-6">
          {schema.fields?.map((subField) => (
            <FieldColumn key={subField.name} field={subField}>
              {renderField(subField, basePath)}
            </FieldColumn>
          ))}
        </div>
      )}
    </div>
  )
}
