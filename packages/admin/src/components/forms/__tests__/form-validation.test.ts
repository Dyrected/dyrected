import { describe, it, expect } from "vitest"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { buildSchemaShape, buildDefaultValues } from "../utils"
import type { Field as FieldSchema } from "@dyrected/sdk"

describe("buildSchemaShape - optional field null handling", () => {
  const fields: FieldSchema[] = [
    { name: "nin", type: "text" },
    { name: "lga", type: "text" },
    { name: "cscs_number", type: "text" },
    { name: "chn_number", type: "text" },
    { name: "receipt_url", type: "text" },
    { name: "depositor_name", type: "text" },
    { name: "finance_notes", type: "textarea" },
    { name: "required_title", type: "text", required: true },
    { name: "optional_email", type: "email" },
    { name: "optional_url", type: "url" },
    { name: "optional_rel", type: "relationship", relationTo: "media" },
    { name: "optional_multi", type: "multiSelect" },
    { name: "optional_num", type: "number" },
    { name: "optional_money", type: "money" },
    { name: "optional_obj", type: "object", fields: [{ name: "inner", type: "text" }] },
    { name: "optional_blocks", type: "blocks", blocks: [] },
    { name: "optional_arr", type: "array", fields: [{ name: "item", type: "text" }] },
  ]

  it("accepts null for optional fields without producing 'Expected string, received null' errors", async () => {
    const shape = buildSchemaShape(fields)
    const schema = z.object(shape)
    const resolver = zodResolver(schema)

    const payload = {
      nin: null,
      lga: null,
      cscs_number: null,
      chn_number: null,
      receipt_url: null,
      depositor_name: null,
      finance_notes: null,
      required_title: "Valid Title",
      optional_email: null,
      optional_url: null,
      optional_rel: null,
      optional_multi: null,
      optional_num: null,
      optional_money: null,
      optional_obj: null,
      optional_blocks: null,
      optional_arr: null,
    }

    const result = await resolver(payload, {}, { shouldUseNativeValidation: false, fields: {} })
    expect(result.errors).toEqual({})
    expect(result.values.nin).toBeNull()
    expect(result.values.lga).toBeNull()
    expect(result.values.cscs_number).toBeNull()
    expect(result.values.chn_number).toBeNull()
    expect(result.values.receipt_url).toBeNull()
    expect(result.values.depositor_name).toBeNull()
    expect(result.values.finance_notes).toBeNull()
  })

  it("accepts empty strings for optional string fields", async () => {
    const shape = buildSchemaShape(fields)
    const schema = z.object(shape)
    const resolver = zodResolver(schema)

    const payload = {
      nin: "",
      lga: "",
      cscs_number: "",
      chn_number: "",
      receipt_url: "",
      depositor_name: "",
      finance_notes: "",
      required_title: "Valid Title",
    }

    const result = await resolver(payload, {}, { shouldUseNativeValidation: false, fields: {} })
    expect(result.errors).toEqual({})
  })

  it("still enforces required fields when they are empty or null", async () => {
    const shape = buildSchemaShape(fields)
    const schema = z.object(shape)
    const resolver = zodResolver(schema)

    const payload = {
      nin: null,
      required_title: "",
    }

    const result = await resolver(payload, {}, { shouldUseNativeValidation: false, fields: {} })
    expect(result.errors.required_title).toBeDefined()
    expect(result.errors.nin).toBeUndefined()
  })
})

describe("buildDefaultValues - null handling", () => {
  it("normalizes boolean and multiSelect nulls into safe defaults", () => {
    const fields: FieldSchema[] = [
      { name: "is_active", type: "boolean" },
      { name: "tags", type: "multiSelect" },
      { name: "nin", type: "text" },
    ]

    const defaults = {
      is_active: null,
      tags: null,
      nin: null,
    }

    const result = buildDefaultValues(fields, defaults)
    expect(result.is_active).toBe(false)
    expect(result.tags).toEqual([])
    expect(result.nin).toBeNull()
  })
})
