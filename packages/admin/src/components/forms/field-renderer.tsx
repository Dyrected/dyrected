import type {
  EmailField,
  DateField,
  DateTimeField,
  Field as FieldSchema,
  IconField,
  NumberField,
  TextField as TextFieldSchema,
  TextareaField as TextareaFieldSchema,
  UrlField as UrlFieldSchema,
  RelationshipField as RelationFieldSchema,
  RichTextField as RichTextFieldSchema,
} from "@dyrected/core"
import * as React from "react"
import { TextField } from "./fields/text-field"
import { TextAreaField } from "./fields/text-area-field"
import { SwitchField } from "./fields/switch-field"
import { CheckboxField } from "./fields/checkbox-field"
import { SelectField } from "./fields/select-field"
import { RadioField } from "./fields/radio-field"
import { MultiSelect } from "./fields/multi-select"
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

const RichTextEditor = React.lazy(async () => {
  const module = await import("./fields/rich-text-editor")
  return { default: module.RichTextEditor }
})

const MediaPicker = React.lazy(async () => {
  const module = await import("./fields/media-picker")
  return { default: module.MediaPicker }
})

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
    onBlur?: () => void
    name: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ref: any
    id?: string
  }
  id?: string
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
export function FieldRenderer({ schema, field, id, collection, context }: FieldRendererProps) {
  void collection

  const fieldWithId = React.useMemo(() => {
    const effectiveId = id || field.id
    if (!effectiveId) return field
    return { ...field, id: effectiveId }
  }, [field, id])

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
      value: fieldWithId.value,
      onChange: fieldWithId.onChange,
      field: schema,
      path: fieldWithId.name,
      disabled,
      collection,
      context,
    }
    return (
      <DyrectedFieldPathProvider path={fieldWithId.name}>
        <ErrorBoundary fieldName={schema.name ?? customComponentKey}>
          <CustomComponent {...customProps} />
        </ErrorBoundary>
      </DyrectedFieldPathProvider>
    )
  }

  const relSchema = schema as RelationFieldSchema

  switch (schema.type as string) {
    case "textarea":
      return <TextAreaField schema={schema as TextAreaSchema} field={fieldWithId} disabled={disabled} />
    case "boolean":
      return (schema.admin as { layout?: string })?.layout === "switch"
        ? <SwitchField field={fieldWithId} disabled={disabled} />
        : <CheckboxField field={fieldWithId} disabled={disabled} />
    case "select":
      return <SelectField schema={schema} field={fieldWithId} disabled={disabled} collection={collection} siblingValues={context?.siblingData as Record<string, string | number | boolean>} />
    case "radio":
      return <RadioField schema={schema} field={fieldWithId} disabled={disabled} collection={collection} siblingValues={context?.siblingData as Record<string, string | number | boolean>} />
    case "multiSelect":
      return (
        <MultiSelect
          options={(Array.isArray(schema.options) ? schema.options : []) as Array<{ label: string; value: string }>}
          value={fieldWithId.value || []}
          onChange={fieldWithId.onChange}
          disabled={disabled}
          collection={collection}
          siblingValues={context?.siblingData as Record<string, string | number | boolean>}
          schema={schema}
        />
      )
    case "image": {
      const imageMediaColl = relSchema.relationTo || (context?.schemas?.collections?.find((c) => c.upload)?.slug) || "media"
      return (
        <React.Suspense fallback={<div className="dy-h-24 dy-rounded-md dy-border dy-border-dashed dy-border-border/70 dy-bg-muted/20" />}>
          <MediaPicker
            collection={imageMediaColl}
            value={fieldWithId.value}
            onChange={fieldWithId.onChange}
            disabled={disabled}
            multiple={relSchema.hasMany}
          />
        </React.Suspense>
      )
    }
    case "richText": {
      const rtSchema = schema as RichTextFieldSchema
      const richTextMediaColl =
        rtSchema.uploadCollection || (context?.schemas?.collections?.find((c) => c.upload)?.slug) || "media"
      return (
        <React.Suspense fallback={<div className="dy-h-40 dy-rounded-md dy-border dy-border-dashed dy-border-border/70 dy-bg-muted/20" />}>
          <RichTextEditor
            collection={richTextMediaColl}
            value={fieldWithId.value}
            onChange={fieldWithId.onChange}
            disabled={disabled}
            features={rtSchema.features}
            headingLevels={rtSchema.headingLevels}
          />
        </React.Suspense>
      )
    }
    case "json":
      return <JsonEditor value={fieldWithId.value} onChange={fieldWithId.onChange} disabled={disabled} />
    case "date":
      return <DatePicker id={fieldWithId.id} value={fieldWithId.value} onChange={fieldWithId.onChange} disabled={disabled} fieldType="date" format={(schema as DateField).admin?.format} />
    case "datetime":
      return <DatePicker id={fieldWithId.id} value={fieldWithId.value} onChange={fieldWithId.onChange} disabled={disabled} withTime fieldType="datetime" format={(schema as DateTimeField).admin?.format} />
    case "daterange":
      return <DateRangePicker id={fieldWithId.id} value={fieldWithId.value} onChange={fieldWithId.onChange} disabled={disabled} />
    case "time":
      return <TimePicker id={fieldWithId.id} value={fieldWithId.value} onChange={fieldWithId.onChange} disabled={disabled} />
    case "icon":
      return <IconPicker schema={schema as AdminIconFieldSchema} field={fieldWithId} disabled={disabled} />
    case "url":
      return <UrlFieldComponent schema={schema as AdminUrlFieldSchema} field={fieldWithId} disabled={disabled} context={context} />
    case "relationship": {
      const defaultMediaColl = (context?.schemas?.collections?.find((c) => c.upload)?.slug) || "media"
      const isMediaRel = relSchema.relationTo === "media" ||
        !!(context?.schemas?.collections?.find((c) => c.slug === relSchema.relationTo)?.upload)

      if (isMediaRel) {
        return (
          <React.Suspense fallback={<div className="dy-h-24 dy-rounded-md dy-border dy-border-dashed dy-border-border/70 dy-bg-muted/20" />}>
            <MediaPicker
              collection={relSchema.relationTo || defaultMediaColl}
              value={fieldWithId.value}
              onChange={fieldWithId.onChange}
              multiple={relSchema.hasMany}
              disabled={disabled}
            />
          </React.Suspense>
        )
      }

      return (
        <RelationshipPicker
          id={fieldWithId.id}
          value={fieldWithId.value}
          onChange={fieldWithId.onChange}
          relationTo={relSchema.relationTo || relSchema.collection}
          multiple={relSchema.hasMany}
          disabled={disabled}
        />
      )
    }
    default:
      return <TextField schema={schema as DefaultTextInputSchema} field={fieldWithId} disabled={disabled} />
  }
}
