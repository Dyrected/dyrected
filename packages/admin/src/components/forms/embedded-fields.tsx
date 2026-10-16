import { FormFieldRenderer } from "./form-field-renderer"
import { useFormEngineBody } from "./form-engine-body-context"
import { useDyrectedFormControllerContext } from "../../providers/dyrected-form-context"
import { normalizeFieldPath } from "../../controllers/form"
import { isDevelopment } from "../../lib/env"

export interface DyrectedFieldProps {
  /**
   * Path of the field to render, such as `"guestName"` or `"address.city"`.
   * Nested paths render the field without the column width of the page layout.
   */
  path: string
}

/**
 * Renders one built-in input, wired to the form. It keeps the field's label,
 * description, validation message, `admin.condition`, read-only state, access
 * rules, and any `admin.component` override.
 *
 * Use it inside a custom create or edit form.
 *
 * @experimental
 */
export function DyrectedField({ path }: DyrectedFieldProps) {
  const body = useFormEngineBody()
  const controller = useDyrectedFormControllerContext()
  const schema = controller.getFieldSchema(path)

  if (!schema) {
    if (isDevelopment()) {
      console.warn(`[Dyrected Admin] <DyrectedField path="${path}"> does not match a field of "${body.collection}".`)
    }
    return null
  }

  const segments = normalizeFieldPath(path)
  const basePath = segments.slice(0, -1).join(".")
  if (!basePath) return <>{body.renderField(schema)}</>

  return (
    <FormFieldRenderer
      schema={schema}
      basePath={basePath}
      control={body.control}
      collection={body.collection}
      documentId={body.documentId}
    />
  )
}

export interface DyrectedFieldsProps {
  /** Render exactly these fields, in this order. */
  names?: string[]
  /** Render every field except these. Ignored when `names` is set. */
  exclude?: string[]
}

/**
 * Renders several built-in inputs with the schema's layout rules (width and
 * conditions). Pass `names` for a hand-picked list, or `exclude` to render
 * everything else. With neither, it renders every field.
 *
 * @experimental
 */
export function DyrectedFields({ names, exclude }: DyrectedFieldsProps) {
  const body = useFormEngineBody()
  const hidden = new Set(exclude ?? [])
  const list = names
    ? names
    : body.fields.filter((field) => !!field.name && !field.admin?.hidden && !hidden.has(field.name)).map((f) => f.name!)

  return (
    <div className="dy--mx-3 dy-flex dy-flex-wrap dy-gap-y-6">
      {list.map((name) => (
        <DyrectedField key={name} path={name} />
      ))}
    </div>
  )
}

export interface DyrectedDefaultFormProps {
  /** Leave these fields out of the default body. */
  exclude?: string[]
}

/**
 * Renders the whole built-in form body: tabs, fields, and the change-password
 * section. Wrap it to add something around the default form, or pass `exclude`
 * to take over a few fields yourself.
 *
 * @experimental
 */
export function DyrectedDefaultForm({ exclude }: DyrectedDefaultFormProps) {
  const body = useFormEngineBody()
  return <>{body.renderDefaultBody({ exclude })}</>
}
