import type {
  EmailField,
  Field as FieldSchema,
  IconField,
  NumberField,
  TextField as TextFieldSchema,
  TextareaField as TextareaFieldSchema,
  UrlField as UrlFieldSchema,
  RelationshipField as RelationFieldSchema,
  RichTextField as RichTextFieldSchema,
} from "@dyrected/core"

import { TextField } from "./fields/text-field"
import { TextAreaField } from "./fields/text-area-field"
import { SwitchField } from "./fields/switch-field"
import { CheckboxField } from "./fields/checkbox-field"
import { SelectField } from "./fields/select-field"
import { RadioField } from "./fields/radio-field"
import { MultiSelect } from "./fields/multi-select"
import { MediaPicker } from "./fields/media-picker"
import { RichTextEditor } from "./fields/rich-text-editor"
import { JsonEditor } from "./fields/json-editor"
import { DatePicker, DateRangePicker } from "./fields/date-picker"
import { TimePicker } from "./fields/time-picker"
import { RelationshipPicker } from "./fields/relationship-picker"
import { IconPicker } from "./fields/icon-picker"
import { UrlField as UrlFieldComponent } from "./fields/url-field"
import jexl from 'jexl'
import { useDyrected } from "../../providers/dyrected-context"
import { ErrorBoundary } from "../error-boundary"
import { DyrectedFieldPathProvider } from "../../providers/dyrected-form-context"
import type { AdminFieldComponentContext, AdminFieldComponentProps } from "../../types/admin-components"

type DefaultTextInputSchema = TextFieldSchema | EmailField | NumberField
type TextAreaSchema = TextareaFieldSchema
type AdminUrlFieldSchema = UrlFieldSchema
type AdminIconFieldSchema = IconField

interface FieldRendererProps {
  schema: FieldSchema
  field: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange: (...event: any[]) => void
    name: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ref: any
  }
  collection: string
  context?: AdminFieldComponentContext
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
  const updateAccess = schema.access?.update
  let canUpdate = true
  if ((updateAccess as unknown) === false) {
    canUpdate = false
  } else if (typeof updateAccess === 'string' && context) {
    try {
      canUpdate = jexl.evalSync(updateAccess, { user: context.user, ...context.siblingData })
    } catch (e) {
      console.warn("Update access eval failed:", e)
    }
  }

  const disabled = schema.admin?.readOnly || !canUpdate

  const { components } = useDyrected()
  const customComponentKey = schema.admin?.component
  if (customComponentKey && components?.fields?.[customComponentKey]) {
    const CustomComponent = components.fields[customComponentKey]
    const customProps: AdminFieldComponentProps = {
      value: field.value,
      onChange: field.onChange,
      field: schema,
      path: field.name,
      disabled,
      collection,
      context,
    }
    return (
      <DyrectedFieldPathProvider path={field.name}>
        <ErrorBoundary fieldName={schema.name ?? customComponentKey}>
          <CustomComponent {...customProps} />
        </ErrorBoundary>
      </DyrectedFieldPathProvider>
    )
  }

  const relSchema = schema as RelationFieldSchema

  switch (schema.type as string) {
    case "textarea":
      return <TextAreaField schema={schema as TextAreaSchema} field={field} disabled={disabled} />
    case "boolean":
      return (schema.admin as { layout?: string })?.layout === "switch"
        ? <SwitchField field={field} disabled={disabled} />
        : <CheckboxField field={field} disabled={disabled} />
    case "select":
      return <SelectField schema={schema} field={field} disabled={disabled} collection={collection} siblingValues={context?.siblingData as Record<string, string | number | boolean>} />
    case "radio":
      return <RadioField schema={schema} field={field} disabled={disabled} collection={collection} siblingValues={context?.siblingData as Record<string, string | number | boolean>} />
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
    case "image": {
      const imageMediaColl = relSchema.relationTo || (context?.schemas?.collections?.find((c) => c.upload)?.slug) || "media"
      return (
        <MediaPicker
          collection={imageMediaColl}
          value={field.value}
          onChange={field.onChange}
          disabled={disabled}
          multiple={relSchema.hasMany}
        />
      )
    }
    case "richText": {
      const rtSchema = schema as RichTextFieldSchema
      const richTextMediaColl =
        rtSchema.uploadCollection || (context?.schemas?.collections?.find((c) => c.upload)?.slug) || "media"
      return (
        <RichTextEditor
          collection={richTextMediaColl}
          value={field.value}
          onChange={field.onChange}
          disabled={disabled}
          features={rtSchema.features}
          headingLevels={rtSchema.headingLevels}
        />
      )
    }
    case "json":
      return <JsonEditor value={field.value} onChange={field.onChange} disabled={disabled} />
    case "date":
      return <DatePicker value={field.value} onChange={field.onChange} disabled={disabled} />
    case "datetime":
      return <DatePicker value={field.value} onChange={field.onChange} disabled={disabled} withTime />
    case "daterange":
      return <DateRangePicker value={field.value} onChange={field.onChange} disabled={disabled} />
    case "time":
      return <TimePicker value={field.value} onChange={field.onChange} disabled={disabled} />
    case "icon":
      return <IconPicker schema={schema as AdminIconFieldSchema} field={field} disabled={disabled} />
    case "url":
      return <UrlFieldComponent schema={schema as AdminUrlFieldSchema} field={field} disabled={disabled} context={context} />
    case "relationship": {
      const defaultMediaColl = (context?.schemas?.collections?.find((c) => c.upload)?.slug) || "media"
      const isMediaRel = relSchema.relationTo === "media" ||
        !!(context?.schemas?.collections?.find((c) => c.slug === relSchema.relationTo)?.upload)

      if (isMediaRel) {
        return (
          <MediaPicker
            collection={relSchema.relationTo || defaultMediaColl}
            value={field.value}
            onChange={field.onChange}
            multiple={relSchema.hasMany}
            disabled={disabled}
          />
        )
      }

      return (
        <RelationshipPicker
          value={field.value}
          onChange={field.onChange}
          relationTo={relSchema.relationTo || relSchema.collection}
          multiple={relSchema.hasMany}
          disabled={disabled}
        />
      )
    }
    default:
      return <TextField schema={schema as DefaultTextInputSchema} field={field} disabled={disabled} />
  }
}
