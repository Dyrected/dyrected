import type { Field } from "../types/index.js";

// Internal loose type used by the hook runner.
// Using `any` for the parameter type is intentional — TypeScript's function
// parameter contravariance would otherwise prevent specific hook types
// (CollectionBeforeChangeHook, etc.) from being assigned here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHookFn = (args: any) => any;

/**
 * Run a list of hook functions sequentially.
 *
 * Each hook receives the output of the previous hook merged back into the
 * original `args`. When a hook returns a non-undefined value it becomes the
 * `data` / `doc` for the next hook in the chain.
 */
export async function runCollectionHooks(
  hooks: AnyHookFn[] | undefined,
  args: {
    data?: unknown;
    doc?: unknown;
    user?: unknown;
    req?: unknown;
    operation?: "create" | "update" | "delete";
    [key: string]: unknown;
  },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (!hooks || hooks.length === 0) {
    return args.data ?? args.doc ?? undefined;
  }

  let currentPayload = args.data ?? args.doc ?? undefined;

  for (const hook of hooks) {
    const result = await hook({
      ...args,
      data: args.data !== undefined ? currentPayload : undefined,
      doc: args.doc !== undefined ? currentPayload : undefined,
    });

    if (result !== undefined) {
      currentPayload = result;
    }
  }

  return currentPayload;
}

/**
 * Execute field-level `beforeChange` hooks recursively on a data payload.
 *
 * Traverses `array`, `object`, and `blocks` fields depth-first so that nested
 * field hooks fire on every item automatically.
 */
export async function executeFieldBeforeChange(
  fields: Field[],
  data: Record<string, unknown>,
  originalDoc: Record<string, unknown> | null,
  user: unknown,
): Promise<Record<string, unknown>> {
  if (!data || typeof data !== "object") return data;

  const result = { ...data };

  for (const field of fields) {
    if (!field.name) continue;

    const value = result[field.name];
    const origValue = originalDoc?.[field.name];

    let updatedValue = value;
    if (field.hooks?.beforeChange) {
      for (const hook of field.hooks.beforeChange) {
        updatedValue = await (hook as (args: Record<string, unknown>) => unknown)({
          value: updatedValue,
          originalDoc: originalDoc ?? undefined,
          data: result,
          user,
        });
      }
      result[field.name] = updatedValue;
    }

    // Recurse into nested structures
    if (updatedValue !== undefined && updatedValue !== null) {
      if (field.type === "object" && field.fields) {
        result[field.name] = await executeFieldBeforeChange(
          field.fields,
          updatedValue as Record<string, unknown>,
          origValue as Record<string, unknown> | null,
          user,
        );
      } else if (
        field.type === "array" &&
        field.fields &&
        Array.isArray(updatedValue)
      ) {
        const arrayResult: unknown[] = [];
        for (let i = 0; i < updatedValue.length; i++) {
          const item = updatedValue[i] as Record<string, unknown>;
          const origItem = Array.isArray(origValue)
            ? (origValue[i] as Record<string, unknown> | null)
            : null;
          arrayResult.push(
            await executeFieldBeforeChange(field.fields, item, origItem, user),
          );
        }
        result[field.name] = arrayResult;
      } else if (
        field.type === "blocks" &&
        field.blocks &&
        Array.isArray(updatedValue)
      ) {
        const blocksResult: unknown[] = [];
        for (let i = 0; i < updatedValue.length; i++) {
          const blockData = updatedValue[i] as Record<string, unknown>;
          const origBlock = Array.isArray(origValue)
            ? (origValue[i] as Record<string, unknown> | null)
            : null;
          const blockConfig = field.blocks.find(
            (b) => b.slug === blockData.blockType,
          );
          if (blockConfig) {
            blocksResult.push(
              await executeFieldBeforeChange(
                blockConfig.fields,
                blockData,
                origBlock,
                user,
              ),
            );
          } else {
            blocksResult.push(blockData);
          }
        }
        result[field.name] = blocksResult;
      }
    }
  }

  return result;
}

/**
 * Execute field-level `afterRead` hooks recursively on a document.
 *
 * Traverses `array`, `object`, and `blocks` fields depth-first so that nested
 * field hooks fire on every item automatically.
 */
export async function executeFieldAfterRead(
  fields: Field[],
  doc: Record<string, unknown>,
  user: unknown,
): Promise<Record<string, unknown>> {
  if (!doc || typeof doc !== "object") return doc;

  const result = { ...doc };

  for (const field of fields) {
    if (!field.name) continue;

    const value = result[field.name];

    let updatedValue = value;
    if (field.hooks?.afterRead) {
      for (const hook of field.hooks.afterRead) {
        updatedValue = await (hook as (args: Record<string, unknown>) => unknown)({
          value: updatedValue,
          doc: result,
          user,
        });
      }
      result[field.name] = updatedValue;
    }

    // Recurse into nested structures
    if (updatedValue !== undefined && updatedValue !== null) {
      if (field.type === "object" && field.fields) {
        result[field.name] = await executeFieldAfterRead(
          field.fields,
          updatedValue as Record<string, unknown>,
          user,
        );
      } else if (
        field.type === "array" &&
        field.fields &&
        Array.isArray(updatedValue)
      ) {
        const arrayResult: unknown[] = [];
        for (const item of updatedValue) {
          arrayResult.push(
            await executeFieldAfterRead(
              field.fields,
              item as Record<string, unknown>,
              user,
            ),
          );
        }
        result[field.name] = arrayResult;
      } else if (
        field.type === "blocks" &&
        field.blocks &&
        Array.isArray(updatedValue)
      ) {
        const blocksResult: unknown[] = [];
        for (const blockData of updatedValue) {
          const typedBlock = blockData as Record<string, unknown>;
          const blockConfig = field.blocks.find(
            (b) => b.slug === typedBlock.blockType,
          );
          if (blockConfig) {
            blocksResult.push(
              await executeFieldAfterRead(
                blockConfig.fields,
                typedBlock,
                user,
              ),
            );
          } else {
            blocksResult.push(blockData);
          }
        }
        result[field.name] = blocksResult;
      }
    }
  }

  return result;
}
