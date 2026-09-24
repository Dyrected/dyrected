import type { Field } from "../types/index.js";
import { ValidationError } from "./errors.js";

/**
 * Yields every field that stores a value directly on the document, looking
 * through layout-only `row` fields whose children are stored flat.
 */
function* storedFields(fields: readonly Field[] | undefined): Generator<Field & { name: string }> {
  for (const field of fields ?? []) {
    if (field.type === "row") {
      yield* storedFields((field as { fields?: Field[] }).fields);
    } else if (field.name) {
      yield field as Field & { name: string };
    }
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return a == b;
  if (typeof a === "object" || typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

/**
 * Rejects an update that changes a field marked `immutable: true`. Sending the
 * value it already has is allowed, so full-document saves from the Admin keep working.
 */
export function assertImmutableFieldsUnchanged(
  fields: readonly Field[] | undefined,
  data: Record<string, unknown>,
  original: Record<string, unknown>,
): void {
  for (const field of storedFields(fields)) {
    if (!field.immutable || data[field.name] === undefined) continue;
    if (!sameValue(data[field.name], original[field.name])) {
      throw new ValidationError(
        `Field "${field.label ?? field.name}" is immutable and cannot be modified.`,
      );
    }
  }
}

/**
 * Validates `money` fields and normalizes them to integer minor units. Integer
 * strings are converted to numbers; anything that is not a safe integer is rejected.
 * Returns a copy of `data` and never mutates the input.
 */
export function normalizeMoneyFields(
  fields: readonly Field[] | undefined,
  data: Record<string, unknown>,
): Record<string, unknown> {
  let next = data;
  for (const field of storedFields(fields)) {
    if (field.type !== "money") continue;
    const value = data[field.name];
    if (value === undefined || value === null || value === "") continue;

    let minor: number | undefined;
    if (typeof value === "number") minor = value;
    else if (typeof value === "string" && /^-?\d+$/.test(value.trim())) minor = Number(value.trim());

    if (minor === undefined || !Number.isSafeInteger(minor)) {
      throw new ValidationError(
        `Field "${field.label ?? field.name}" must be a whole number of minor units (for example kobo or cents).`,
      );
    }
    if (next === data) next = { ...data };
    next[field.name] = minor;
  }
  return next;
}
