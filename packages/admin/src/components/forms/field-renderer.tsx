import type { Field as FieldSchema } from "@dyrected/sdk"
import { TextField } from "./fields/text-field"
import { TextAreaField } from "./fields/text-area-field"
import { SwitchField } from "./fields/switch-field"
import { SelectField } from "./fields/select-field"
import { RadioField } from "./fields/radio-field"
import { MultiSelect } from "./fields/multi-select"
import { MediaPicker } from "./fields/media-picker"
import { RichTextEditor } from "./fields/rich-text-editor"
import { JsonEditor } from "./fields/json-editor"
import { DatePicker } from "./fields/date-picker"
import { RelationshipPicker } from "./fields/relationship-picker"
import { IconPicker } from "./fields/icon-picker"
import { UrlField } from "./fields/url-field"
import jexl from 'jexl'

interface FieldRendererProps {
  schema: FieldSchema
  field: any
  collection: string
  context?: { user: any, schemas?: any, siblingData: any }
}

/**
 * FieldRenderer (Field Registry/Dispatcher)
 * 
 * This component is a pure dispatcher that maps a field schema type to its 
 * corresponding UI component (e.g., TextField, MediaPicker, SelectField).
 * 
 * It receives standard props (field, schema, collection, context) and ensures 
 * they are passed down to the specialized field implementation.
 */
export function FieldRenderer({ schema, field, collection, context }: FieldRendererProps) {
  void collection

  // Evaluate Update Access
  const updateAccess = (schema.access as any)?.update
  let canUpdate = true
  if (updateAccess === false) {
    canUpdate = false
  } else if (typeof updateAccess === 'string' && context) {
    try {
      canUpdate = jexl.evalSync(updateAccess, { user: context.user, ...context.siblingData })
    } catch (e) {
      console.warn("Update access eval failed:", e)
    }
  }

  const disabled = schema.admin?.readOnly || !canUpdate

  switch (schema.type) {
    case "textarea":
      return <TextAreaField schema={schema} field={field} disabled={disabled} />
    case "boolean":
      return <SwitchField field={field} disabled={disabled} />
    case "select":
      return <SelectField schema={schema} field={field} disabled={disabled} collection={collection} siblingValues={context?.siblingData} />
    case "radio":
      return <RadioField schema={schema} field={field} disabled={disabled} collection={collection} siblingValues={context?.siblingData} />
    case "multiSelect":
      return (
        <MultiSelect
          options={(Array.isArray(schema.options) ? schema.options : []) as Array<{ label: string; value: string }>}
          value={field.value || []}
          onChange={field.onChange}
          disabled={disabled}
          collection={collection}
          siblingValues={context?.siblingData as Record<string, string | number | boolean>}
          schema={schema}
        />
      )
    case "image" as any:
      const imageMediaColl = (schema as any).relationTo || (context?.schemas?.collections?.find((c: any) => c.upload)?.slug) || "media"
      return (
        <MediaPicker
          collection={imageMediaColl}
          value={field.value}
          onChange={field.onChange}
          disabled={disabled}
          multiple={(schema as any).hasMany}
        />
      )
    case "richText":
      const richTextMediaColl = (context?.schemas?.collections?.find((c: any) => c.upload)?.slug) || "media"
      return <RichTextEditor collection={richTextMediaColl} value={field.value} onChange={field.onChange} disabled={disabled} />
    case "json":
      return <JsonEditor value={field.value} onChange={field.onChange} disabled={disabled} />
    case "date":
      return <DatePicker value={field.value} onChange={field.onChange} disabled={disabled} />
    case "datetime":
      return <DatePicker value={field.value} onChange={field.onChange} disabled={disabled} withTime />
    case "icon":
      return <IconPicker schema={schema} field={field} disabled={disabled} />
    case "url":
      return <UrlField schema={schema} field={field} disabled={disabled} context={context} />
    case "relationship":
      const defaultMediaColl = (context?.schemas?.collections?.find((c: any) => c.upload)?.slug) || "media"
      const isMediaRel = (schema as any).relationTo === "media" ||
        (context?.schemas?.collections?.find((c: any) => c.slug === (schema as any).relationTo)?.upload)

      if (isMediaRel) {
        return (
          <MediaPicker
            collection={(schema as any).relationTo || defaultMediaColl}
            value={field.value}
            onChange={field.onChange}
            multiple={(schema as any).hasMany}
            disabled={disabled}
          />
        )
      }

      return (
        <RelationshipPicker
          value={field.value}
          onChange={field.onChange}
          relationTo={(schema as any).relationTo || (schema as any).collection}
          multiple={(schema as any).hasMany}
          disabled={disabled}
        />
      )
    default:
      return <TextField schema={schema} field={field} disabled={disabled} />
  }
}
