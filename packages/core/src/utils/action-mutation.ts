/**
 * Resolves declarative action mutations (`defineAction({ mutation })`) into
 * concrete field values before they flow through the standard update pipeline.
 *
 * Supported expression forms:
 * - `now()`        → current ISO timestamp
 * - `input.<path>` → value from the action's input form (e.g. `input.tableNumber`)
 * - `doc.<path>`   → value from the target document (e.g. `doc.email`)
 * - anything else  → passed through literally (strings, numbers, booleans, null)
 *
 * Objects and arrays are resolved recursively, so mutations can compose
 * expressions into nested payloads.
 */
export interface MutationContext {
  /** The document the action is operating on. */
  doc: Record<string, unknown>;
  /** Values collected from the action's input form dialog. */
  input: Record<string, unknown>;
  /** The authenticated user triggering the action, when present. */
  user: Record<string, unknown> | null;
}

export function resolveActionMutation(
  mutation: Record<string, unknown> | undefined,
  ctx: MutationContext,
): Record<string, unknown> {
  if (!mutation) return {};
  return resolveValue(mutation, ctx) as Record<string, unknown>;
}

function resolveValue(value: unknown, ctx: MutationContext): unknown {
  if (typeof value === "string") return resolveExpression(value, ctx);
  if (Array.isArray(value)) return value.map((item) => resolveValue(item, ctx));
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = resolveValue(entry, ctx);
    }
    return out;
  }
  return value;
}

function resolveExpression(expression: string, ctx: MutationContext): unknown {
  // Only treat the value as an expression when the entire string is a bare
  // reference — prose that merely starts with "input." stays untouched.
  if (expression === "now()") return new Date().toISOString();
  const inputPath = expression.match(/^input\.([A-Za-z0-9_.-]+)$/)?.[1];
  if (inputPath !== undefined) return getPath(ctx.input, inputPath);
  const docPath = expression.match(/^doc\.([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)$/)?.[1];
  if (docPath !== undefined) return getPath(ctx.doc, docPath);
  const userPath = expression.match(/^user\.([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)$/)?.[1];
  if (userPath !== undefined && ctx.user) return getPath(ctx.user, userPath);
  return expression;
}

function getPath(source: Record<string, unknown>, path: string): unknown {
  let cursor: unknown = source;
  for (const segment of path.split(".")) {
    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
