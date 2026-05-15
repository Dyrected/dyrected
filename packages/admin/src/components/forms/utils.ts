import * as z from "zod"
import type { Field as FieldSchema } from "@dyrected/sdk"

export function normalizeOptions(options: string[] | { label: string; value: string }[] | undefined): { label: string; value: string }[] {
  if (!options) return []
  return options.map(opt => typeof opt === "string" ? { label: opt, value: opt } : opt)
}

export function buildSchemaShape(fields: FieldSchema[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  fields.forEach((field) => {
    let validator: any = z.any()
    const label = field.label || field.name.charAt(0).toUpperCase() + field.name.slice(1)

    if (field.type === "object" && field.fields) {
      validator = z.object(buildSchemaShape(field.fields))
      if (!field.required) validator = validator.optional()
      shape[field.name] = validator
      return
    }

    if (field.type === "blocks") {
      validator = z.array(z.any())
      if (!field.required) validator = validator.optional()
      shape[field.name] = validator
      return
    }

    if (field.type === "array" && field.fields) {
      validator = z.array(z.object(buildSchemaShape(field.fields)))
      if (!field.required) validator = validator.optional()
      shape[field.name] = validator
      return
    }

    if ((field.type as string) === "join") return

    const fieldType = field.type as string
    if (fieldType === "text" || fieldType === "textarea" || fieldType === "select" || fieldType === "image" || fieldType === "richText" || fieldType === "relationship" || fieldType === "date" || fieldType === "icon") {
      validator = z.string()
      if (field.required) validator = validator.min(1, `${label} is required`)
    } else if (field.type === "email") {
      validator = z.string().email(`${label} must be a valid email`)
      if (field.required) validator = validator.min(1, `${label} is required`)
    } else if (field.type === "url") {
      validator = z.string().url(`${label} must be a valid URL`)
      if (field.required) validator = validator.min(1, `${label} is required`)
    } else if (field.type === "number") {
      validator = z.coerce.number()
    } else if (field.type === "boolean") {
      validator = z.boolean()
    } else if (field.type === "json") {
      validator = z.any()
    } else if (field.type === "multiSelect") {
      validator = z.array(z.string())
      if (field.required) validator = validator.min(1, `${label} requires at least one selection`)
    }

    if (!field.required && field.type !== "multiSelect") {
      validator = validator.optional().or(z.literal(""))
    } else if (!field.required && field.type === "multiSelect") {
      validator = validator.optional()
    }

    shape[field.name] = validator
  })
  return shape
}

export function buildDefaultValues(fields: FieldSchema[], defaults: any) {
  return fields.reduce((acc, field) => {
    let defaultVal = defaults[field.name] ?? field.defaultValue

    if (field.type === "object" && field.fields) {
      acc[field.name] = buildDefaultValues(field.fields, defaultVal || {})
      return acc
    }

    if ((field.type as string) === "join") return acc

    if (field.type === "array") {
      acc[field.name] = Array.isArray(defaultVal) ? defaultVal : []
      return acc
    }

    if (field.type === "blocks") {
      acc[field.name] = Array.isArray(defaultVal) ? defaultVal : []
      return acc
    }

    if (defaultVal === undefined) {
      if (field.type === "boolean") defaultVal = false
      else if (field.type === "multiSelect") defaultVal = []
      else if (field.type === "json") defaultVal = {}
      else defaultVal = ""
    }

    acc[field.name] = defaultVal
    return acc
  }, {} as any)
}
