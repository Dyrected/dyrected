import * as z from "zod"
import type { Field as FieldSchema } from "@dyrected/sdk"
import type { PathSegment } from "./nested-editor-context"

/**
 * Normalises a field's `options` array to the canonical `{ label, value }` shape.
 * Accepts either a shorthand string array or the full object form.
 */
export function normalizeOptions(options: string[] | { label: string; value: string }[] | undefined): { label: string; value: string }[] {
  if (!options) return []
  return options.map(opt => typeof opt === "string" ? { label: opt, value: opt } : opt)
}

/**
 * Builds a Zod schema shape from a collection's field definitions.
 * Used by the form engine to validate the edit form before submission.
 *
 * @param fields - Field definitions from the collection schema.
 * @param isEdit - When `true`, password fields accept an empty string (no change).
 * @returns A record of Zod validators keyed by field name, suitable for `z.object(shape)`.
 */
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
    } else if (fieldType === "text" || fieldType === "textarea" || fieldType === "select" || fieldType === "radio" || fieldType === "richText" || fieldType === "date" || fieldType === "datetime" || fieldType === "time" || fieldType === "icon" || fieldType === "password") {
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

/**
 * Builds `react-hook-form` default values from a collection's field definitions
 * and an existing document (or an empty object for new documents).
 *
 * Handles nested `object`, `array`, and `blocks` fields recursively.
 * Relationship and image fields are normalised to their IDs.
 * Password fields are always reset to `""` so they are never pre-filled.
 *
 * @param fields - Field definitions from the collection schema.
 * @param defaults - Existing document data, or `{}` for a new document.
 */
export function buildDefaultValues(fields: FieldSchema[], defaults: any) {
  return fields.reduce((acc, field) => {
    if ((field.type as string) === "join") {
      // Include backend-populated join data for display (read-only, not submitted)
      if (field.name && defaults[field.name] !== undefined) {
        acc[field.name] = defaults[field.name]
      }
      return acc
    }
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
          const merged: Record<string, unknown> = {
            ...item,
            ...buildDefaultValues(block.fields, item || {})
          }
          // Ensure a variant is always present in form state when the block
          // defines variants, so switching/saving round-trips (older rows may
          // predate the block gaining variants).
          if (block.variants?.length && merged.variant == null) {
            merged.variant = block.variants[0].slug
          }
          return merged
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

/**
 * Flattens a nested `react-hook-form` errors object into a list of
 * `{ path, message }` pairs for rendering under individual fields.
 *
 * @param errors - The `formState.errors` object from `react-hook-form`.
 * @param path - Dot-notation prefix accumulated during recursion (omit when calling externally).
 * @returns A flat array of field path / error message pairs.
 */
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

/**
 * Formats a dot-notation field path into a human-readable label.
 * Array indices are converted to 1-based "Item N" labels.
 *
 * @example
 * formatPath("address.street")      // → "Address > Street"
 * formatPath("items.0.name")        // → "Items > Item 1 > Name"
 */
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

/**
 * Walks the schema tree alongside a dot-notation path (e.g. "body.2.cta.url")
 * and returns the ordered PathSegments representing each drillable container
 * boundary crossed. Drillable boundaries are:
 *   - `blocks` fields (always drillable)
 *   - `array` or `object` fields with `admin.drillIn === true`
 * Leaf field names and raw numeric indices are consumed but not emitted.
 *
 * @param fields       Top-level field schemas for the collection.
 * @param path         Dot-notation path, e.g. "body.2.cta.url"
 * @param getStableId  Resolves (basePath, rawIndex) → stableId from live
 *                     useFieldArray state. Takes the full cumulative RHF path
 *                     (e.g. "body.2.items"), not just the leaf field name, to
 *                     disambiguate identically-named sub-arrays across block types.
 * @returns Ordered PathSegment[] for the drill-in trail, or null if the path
 *          cannot be resolved against the schema.
 */
export function resolveContainerPath(
  fields: FieldSchema[],
  path: string,
  getStableId: (basePath: string, rawIndex: number) => string | undefined
): PathSegment[] | null {
  const segments = path.split('.')
  const result: PathSegment[] = []
  let currentFields: FieldSchema[] = fields
  let i = 0

  // Running RHF path of everything consumed so far (field names AND indices),
  // whether or not it produced an emitted segment. Building each emitted
  // segment's basePath from this — rather than from the last emitted segment —
  // keeps paths correct even when a consumed-but-not-emitted container (e.g. a
  // non-drillIn object) sits between two drillable boundaries.
  let cumulativePath = ''
  const join = (base: string, next: string) => (base ? `${base}.${next}` : next)

  const labelFor = (field: FieldSchema, name: string) =>
    field.label || name.charAt(0).toUpperCase() + name.slice(1)

  while (i < segments.length) {
    const segment = segments[i]

    // Numeric index without a preceding container is malformed — but if we get
    // here it means the container branch already consumed its index, so a stray
    // index is just skipped defensively.
    if (/^\d+$/.test(segment)) {
      cumulativePath = join(cumulativePath, segment)
      i++
      continue
    }

    const field = currentFields.find(f => f.name === segment)
    if (!field) return null // path doesn't match schema

    const isLast = i === segments.length - 1
    const fieldPath = join(cumulativePath, segment)

    // Array-like container (blocks always; array only when drillIn) — expects a
    // following numeric index and emits an item-level segment.
    const isBlocks = field.type === 'blocks'
    const isDrillInArray =
      field.type === 'array' && (field.admin as Record<string, unknown>)?.drillIn === true

    if (isBlocks || isDrillInArray) {
      const nextIndex = i + 1 < segments.length ? parseInt(segments[i + 1], 10) : NaN
      if (isLast || isNaN(nextIndex)) {
        // Path ends at the container field itself — not a drillable item position.
        break
      }
      const itemBasePath = join(fieldPath, String(nextIndex))
      result.push({
        fieldName: segment,
        basePath: itemBasePath,
        stableId: getStableId(fieldPath, nextIndex),
        breadcrumbLabel: labelFor(field, segment),
      })
      cumulativePath = itemBasePath
      i += 2
      // Descend into the item's fields. For blocks we can't know the block type
      // without runtime data, so we union all block field definitions.
      currentFields = isBlocks
        ? (field.blocks ?? []).flatMap(b => b.fields ?? [])
        : field.fields ?? []
      continue
    }

    // Object container with drillIn — single instance, no index, no stableId.
    if (field.type === 'object' && (field.admin as Record<string, unknown>)?.drillIn === true) {
      if (isLast) break
      result.push({
        fieldName: segment,
        basePath: fieldPath,
        stableId: undefined,
        breadcrumbLabel: labelFor(field, segment),
      })
      cumulativePath = fieldPath
      i++
      currentFields = field.fields ?? []
      continue
    }

    // Leaf field or non-drillable container — consume without emitting, but keep
    // descending into nested fields so deeper drillable boundaries resolve.
    cumulativePath = fieldPath
    if (field.fields && !isLast) {
      currentFields = field.fields
    }
    i++
  }

  return result
}

