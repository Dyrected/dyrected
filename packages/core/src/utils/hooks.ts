import type {
  AuthenticatedUser,
  DeclarativeHookExpression,
  Field,
  FieldAfterReadHook,
  FieldAfterReadHookArgs,
  FieldBeforeChangeHook,
  FieldBeforeChangeHookArgs,
  ReadonlyDatabaseAdapter,
} from "../types/index.js";
import { getConfigLogger } from "../observability.js";
import jexl from "jexl";

// Internal loose type used by the hook runner.
// Using `any` for the parameter type is intentional — TypeScript's function
// parameter contravariance would otherwise prevent specific hook types
// (CollectionBeforeChangeHook, etc.) from being assigned here.
type AnyHookFn = (args: any) => any;
type AnyHook = AnyHookFn | DeclarativeHookExpression;

type AnyFieldBeforeChangeHook = FieldBeforeChangeHook<
  unknown,
  Record<string, unknown>
>;
type AnyFieldAfterReadHook = FieldAfterReadHook<
  unknown,
  Record<string, unknown>
>;

/**
 * Run a list of hook functions sequentially.
 *
 * Each hook receives the output of the previous hook merged back into the
 * original `args`. When a hook returns a non-undefined value it becomes the
 * `data` / `doc` for the next hook in the chain.
 *
 * Pass `{ isolated: true }` for hooks that run **after** a DB write has already
 * been committed (`afterChange`, `afterDelete`). In isolated mode each hook is
 * wrapped in a try/catch so a failing side-effect (email, webhook, etc.) never
 * surfaces as an HTTP 500 to the caller — the write already succeeded.
 */
export async function runCollectionHooks(
  hooks: AnyHook[] | undefined,
  args: {
    data?: unknown;
    doc?: unknown;
    query?: unknown;
    user?: unknown;
    req?: unknown;
    db?: unknown;
    operation?: "create" | "update" | "delete";
    [key: string]: unknown;
  },
  options: { isolated?: boolean } = {},
): Promise<any> {
  if (!hooks || hooks.length === 0) {
    return args.data ?? args.doc ?? args.query ?? undefined;
  }

  const payloadKey =
    args.data !== undefined
      ? "data"
      : args.doc !== undefined
        ? "doc"
        : "query" in args
          ? "query"
          : undefined;
  let currentPayload =
    payloadKey === undefined ? undefined : (args[payloadKey] as unknown);

  for (const hook of hooks) {
    try {
      const hookArgs = {
        ...args,
        ...(payloadKey !== undefined ? { [payloadKey]: currentPayload } : {}),
      };
      const result =
        typeof hook === "string"
          ? await jexl.eval(hook, hookArgs)
          : await hook(hookArgs);

      if (result !== undefined) {
        currentPayload =
          typeof hook === "string" &&
          currentPayload &&
          typeof currentPayload === "object" &&
          !Array.isArray(currentPayload) &&
          result &&
          typeof result === "object" &&
          !Array.isArray(result)
            ? {
                ...(currentPayload as Record<string, unknown>),
                ...(result as Record<string, unknown>),
              }
            : result;
      }
    } catch (err) {
      if (options.isolated) {
        getConfigLogger(undefined, "hooks").error({
          err,
          msg: "Side-effect hook failed after a successful write",
        });
      } else {
        throw err;
      }
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
  db?: unknown,
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
        const hookArgs: FieldBeforeChangeHookArgs<
          unknown,
          Record<string, unknown>
        > = {
          value: updatedValue,
          originalDoc: originalDoc ?? undefined,
          data: result,
          user: user as AuthenticatedUser | undefined,
          db: db as ReadonlyDatabaseAdapter,
        };
        updatedValue =
          typeof hook === "string"
            ? await jexl.eval(hook, hookArgs)
            : await (hook as unknown as AnyFieldBeforeChangeHook)(hookArgs);
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
          db,
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
            await executeFieldBeforeChange(
              field.fields,
              item,
              origItem,
              user,
              db,
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
                db,
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
  db?: unknown,
): Promise<Record<string, unknown>> {
  if (!doc || typeof doc !== "object") return doc;

  const result = { ...doc };

  for (const field of fields) {
    if (!field.name) continue;

    const value = result[field.name];

    let updatedValue = value;
    if (field.hooks?.afterRead) {
      for (const hook of field.hooks.afterRead) {
        const typedHook = hook as unknown as AnyFieldAfterReadHook;
        const hookArgs: FieldAfterReadHookArgs<
          unknown,
          Record<string, unknown>
        > = {
          value: updatedValue,
          doc: result,
          user: user as AuthenticatedUser | undefined,
          db: db as ReadonlyDatabaseAdapter,
        };
        updatedValue = await typedHook(hookArgs);
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
          db,
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
              db,
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
                db,
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
