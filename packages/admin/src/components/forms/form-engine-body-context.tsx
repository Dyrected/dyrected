import React from "react"
import type { Control } from "react-hook-form"
import type { Field as FieldSchema } from "@dyrected/sdk"

/** Which fields `DyrectedDefaultForm` renders. Names are top-level field names. */
export interface DefaultBodyOptions {
  /** Render the default body without these fields. */
  exclude?: string[]
}

/**
 * What the form engine hands to the embedding components (`DyrectedField`,
 * `DyrectedFields`, `DyrectedDefaultForm`) so a custom form can reuse the
 * built-in inputs, layout rules, and tabs.
 */
export interface FormEngineBodyApi {
  control: Control<any>
  collection: string
  documentId?: string
  /** Every field the form knows about, after dynamic options are applied. */
  fields: FieldSchema[]
  /** Renders one field with its width, condition, access and read-only rules. */
  renderField: (schema: FieldSchema) => React.ReactNode
  /** Renders the default body (tabs, fields, change-password section). */
  renderDefaultBody: (options?: DefaultBodyOptions) => React.ReactNode
}

const FormEngineBodyContext = React.createContext<FormEngineBodyApi | null>(null)

export const FormEngineBodyProvider = FormEngineBodyContext.Provider

/** Returns the form engine's body API, or `null` outside a form. */
export function useOptionalFormEngineBody() {
  return React.useContext(FormEngineBodyContext)
}

/** Returns the form engine's body API. Throws outside a form, with a hint on where to render. */
export function useFormEngineBody() {
  const api = React.useContext(FormEngineBodyContext)
  if (!api) {
    throw new Error(
      "DyrectedField, DyrectedFields and DyrectedDefaultForm can only render inside a Dyrected create or edit form.",
    )
  }
  return api
}
