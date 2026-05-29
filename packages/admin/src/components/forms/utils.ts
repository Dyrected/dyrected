import * as z from "zod"
import type { Field as FieldSchema } from "@dyrected/sdk"

export function normalizeOptions(options: string[] | { label: string; value: string }[] | undefined): { label: string; value: string }[] {
  if (!options) return []
  return options.map(opt => typeof opt === "string" ? { label: opt, value: opt } : opt)
}

export function buildSchemaShape(fields: FieldSchema[], isEdit: boolean = false) {
  const shape: Record<string, z.ZodTypeAny> = {}
  fields.forEach((field) => {
    if ((field.type as string) === "join") return
    if ((field.type as string) === "row" && field.fields) {
      Object.assign(shape, buildSchemaShape(field.fields, isEdit))
      return
    }

    const name = field.name!
    let validator: any = z.any()
    const label = field.label || name.charAt(0).toUpperCase() + name.slice(1)
    const isPassword = name === "password" || (field.type as string) === "password"

    if (field.type === "object" && field.fields) {
      validator = z.object(buildSchemaShape(field.fields, isEdit))
      if (!field.required) validator = validator.optional()
      shape[name] = validator
      return
    }

    if (field.type === "blocks") {
      validator = z.array(z.any())
      if (!field.required) validator = validator.optional()
      shape[name] = validator
      return
    }

    if (field.type === "array" && field.fields) {
      validator = z.array(z.object(buildSchemaShape(field.fields, isEdit)))
      if (!field.required) validator = validator.optional()
      shape[name] = validator
      return
    }

    const fieldType = field.type as string
    if (fieldType === "relationship" || fieldType === "image") {
      const singleRelSchema = z.union([
        z.string(),
        z.object({ id: z.string() }).passthrough()
      ])
      validator = z.union([
        singleRelSchema,
        z.array(singleRelSchema)
      ])
      if (field.required) {
        validator = validator.refine((val: any) => {
          if (typeof val === "string") return val.trim().length > 0
          if (Array.isArray(val)) {
            if (val.length === 0) return false
            return val.every(item => {
              if (typeof item === "string") return item.trim().length > 0
              if (item && typeof item === "object") return typeof item.id === "string" && item.id.trim().length > 0
              return false
            })
          }
          if (val && typeof val === "object") return typeof val.id === "string" && val.id.trim().length > 0
          return false
        }, { message: `${label} is required` })
      }
    } else if (fieldType === "text" || fieldType === "textarea" || fieldType === "select" || fieldType === "radio" || fieldType === "richText" || fieldType === "date" || fieldType === "datetime" || fieldType === "icon" || fieldType === "password") {
      validator = z.string()
      if (isPassword) {
        if (!isEdit) {
          validator = validator.min(8, "Password must be at least 8 characters")
        } else {
          validator = z.string().refine((val) => val === "" || val.length >= 8, {
            message: "Password must be at least 8 characters",
          })
        }
      } else if (field.required) {
        validator = validator.min(1, `${label} is required`)
      }
    } else if (field.type === "email") {
      validator = z.string().email(`${label} must be a valid email`)
      if (field.required) validator = validator.min(1, `${label} is required`)
    } else if (field.type === "url") {
      const urlObjectSchema = z.object({
        type: z.enum(["custom", "internal"]),
        url: z.string(),
        relationTo: z.string().optional(),
        value: z.string().optional(),
        label: z.string().optional(),
      })
      validator = z.union([z.string(), urlObjectSchema])
      if (field.required) {
        validator = validator.refine((val: any) => {
          if (typeof val === "string") return val.trim().length > 0
          if (val && typeof val === "object") return typeof val.url === "string" && val.url.trim().length > 0
          return false
        }, { message: `${label} is required` })
      }
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

    shape[name] = validator
  })
  return shape
}

export function buildDefaultValues(fields: FieldSchema[], defaults: any) {
  return fields.reduce((acc, field) => {
    if ((field.type as string) === "join") return acc
    if ((field.type as string) === "row" && field.fields) {
      Object.assign(acc, buildDefaultValues(field.fields, defaults))
      return acc
    }

    const name = field.name!
    let defaultVal = defaults[name] ?? field.defaultValue

    if (name === "password" || (field.type as string) === "password") {
      defaultVal = ""
    }

    if (field.type === "object" && field.fields) {
      acc[name] = buildDefaultValues(field.fields, defaultVal || {})
      return acc
    }

    if (field.type === "array") {
      const arr = Array.isArray(defaultVal) ? defaultVal : []
      if (field.fields) {
        acc[name] = arr.map(item => buildDefaultValues(field.fields!, item || {}))
      } else {
        acc[name] = arr
      }
      return acc
    }

    if (field.type === "blocks") {
      const arr = Array.isArray(defaultVal) ? defaultVal : []
      acc[name] = arr.map(item => {
        const block = field.blocks?.find((b: any) => b.slug === item.blockType)
        if (block && block.fields) {
          return {
            ...item,
            ...buildDefaultValues(block.fields, item || {})
          }
        }
        return item
      })
      return acc
    }

    if (field.type === "relationship" || field.type === "image") {
      if (Array.isArray(defaultVal)) {
        acc[name] = defaultVal.map(val => (val && typeof val === "object" && "id" in val) ? val.id : val)
      } else if (defaultVal && typeof defaultVal === "object" && "id" in defaultVal) {
        acc[name] = defaultVal.id
      } else {
        acc[name] = defaultVal ?? ""
      }
      return acc
    }

    if (defaultVal === undefined) {
      if (field.type === "boolean") defaultVal = false
      else if (field.type === "multiSelect") defaultVal = []
      else if (field.type === "json") defaultVal = {}
      else defaultVal = ""
    }

    acc[name] = defaultVal
    return acc
  }, {} as any)
}

export function getFlatErrors(
  errors: Record<string, unknown>,
  path: string = "",
): { path: string; message: string }[] {
  const result: { path: string; message: string }[] = []
  if (!errors) return result

  if (typeof errors === "object") {
    const asMsg = errors as { message?: string }
    if (typeof asMsg.message === "string") {
      result.push({ path, message: asMsg.message })
      return result
    }
    for (const key in errors) {
      if (Object.prototype.hasOwnProperty.call(errors, key)) {
        if (key === "ref" || key === "type") continue
        const nextPath = path ? `${path}.${key}` : key
        result.push(...getFlatErrors(errors[key] as Record<string, unknown>, nextPath))
      }
    }
  }
  return result
}

export function formatPath(path: string): string {
  return path
    .split(".")
    .map((part) => {
      if (/^\d+$/.test(part)) {
        return `Item ${parseInt(part, 10) + 1}`
      }
      return part.charAt(0).toUpperCase() + part.slice(1).replace(/([A-Z])/g, " $1")
    })
    .join(" > ")
}
