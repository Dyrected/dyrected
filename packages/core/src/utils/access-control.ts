import type { HookRequestContext, Field, DyrectedConfig } from "../types/index.js";
import type { AccessResult, AccessRule } from "../types/access.js";
import { resolveAccess } from "../auth/access.js";

type RequestLike = {
  query: () => Record<string, string>;
  header: () => Record<string, string>;
  raw?: Request;
};

type AccessArgs<TDoc extends object = Record<string, unknown>> = {
  user: unknown;
  req: HookRequestContext;
  doc?: TDoc;
  data?: Partial<TDoc>;
};

function isConstraintResult(value: AccessResult | undefined): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function toHookRequestContext(req: RequestLike): HookRequestContext {
  return {
    query: req.query(),
    headers: req.header(),
    raw: req.raw,
  };
}

export async function resolveBooleanAccess<TDoc extends object = Record<string, unknown>>(
  config: DyrectedConfig,
  access: AccessRule<TDoc> | undefined | null,
  args: AccessArgs<TDoc>,
): Promise<boolean> {
  const result = await resolveAccess(config, access, args);
  if (result === undefined) return true;
  return typeof result === "boolean" ? result : false;
}

export async function matchesAccessConstraint(
  config: DyrectedConfig,
  collection: string,
  id: string,
  constraint: Record<string, unknown>,
): Promise<boolean> {
  if (!config.db) return false;

  const match = await config.db.find({
    collection,
    where: { AND: [{ id: { equals: id } }, constraint] },
    limit: 1,
  });

  return match.total > 0;
}

export async function resolveCollectionAccess<TDoc extends object = Record<string, unknown>>(
  config: DyrectedConfig,
  collection: string,
  action: "read" | "create" | "update" | "delete",
  access: AccessRule<TDoc> | undefined | null,
  args: AccessArgs<TDoc> & { id?: string },
): Promise<{ allowed: boolean; constraint?: Record<string, unknown> }> {
  const result = await resolveAccess(config, access, args);
  if (result === undefined) return { allowed: true };
  if (typeof result === "boolean") return { allowed: result };

  if (action === "read" && !args.id) {
    return { allowed: true, constraint: result };
  }

  if (!args.id) {
    return { allowed: false };
  }

  return {
    allowed: await matchesAccessConstraint(config, collection, args.id, result),
  };
}

type FieldAccessContext = {
  config: DyrectedConfig;
  fields: Field[];
  user: unknown;
  req: HookRequestContext;
  doc?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

export async function applyFieldReadAccess(
  context: FieldAccessContext,
  doc: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!doc || typeof doc !== "object") return doc;

  const result = { ...doc };

  for (const field of context.fields) {
    if (field.type === "row" && field.fields) {
      Object.assign(result, await applyFieldReadAccess({ ...context, fields: field.fields }, result));
      continue;
    }

    if (!field.name) continue;

    const value = result[field.name];
    const canRead = await resolveBooleanAccess(context.config, field.access?.read, {
      user: context.user,
      req: context.req,
      doc: context.doc,
      data: context.data,
    });

    if (!canRead) {
      delete result[field.name];
      continue;
    }

    if (value === undefined || value === null) continue;

    if (field.type === "object" && field.fields && typeof value === "object" && !Array.isArray(value)) {
      result[field.name] = await applyFieldReadAccess({ ...context, fields: field.fields }, value as Record<string, unknown>);
      continue;
    }

    if (field.type === "array" && field.fields && Array.isArray(value)) {
      result[field.name] = await Promise.all(
        value.map((item) =>
          typeof item === "object" && item !== null
            ? applyFieldReadAccess({ ...context, fields: field.fields }, item as Record<string, unknown>)
            : item,
        ),
      );
      continue;
    }

    if (field.type === "blocks" && field.blocks && Array.isArray(value)) {
      result[field.name] = await Promise.all(
        value.map(async (item) => {
          if (typeof item !== "object" || item === null) return item;
          const typedItem = item as Record<string, unknown>;
          const block = field.blocks?.find((candidate) => candidate.slug === typedItem.blockType);
          if (!block) return item;
          return applyFieldReadAccess({ ...context, fields: block.fields }, typedItem);
        }),
      );
    }
  }

  return result;
}

export async function applyFieldWriteAccess(
  context: FieldAccessContext,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!data || typeof data !== "object") return data;

  const result = { ...data };

  for (const field of context.fields) {
    if (field.type === "row" && field.fields) {
      Object.assign(result, await applyFieldWriteAccess({ ...context, fields: field.fields }, result));
      continue;
    }

    if (!field.name || !(field.name in result)) continue;

    const canUpdate = await resolveBooleanAccess(context.config, field.access?.update, {
      user: context.user,
      req: context.req,
      doc: context.doc,
      data: context.data,
    });

    if (!canUpdate) {
      delete result[field.name];
      continue;
    }

    const value = result[field.name];
    if (value === undefined || value === null) continue;

    if (field.type === "object" && field.fields && typeof value === "object" && !Array.isArray(value)) {
      result[field.name] = await applyFieldWriteAccess({ ...context, fields: field.fields }, value as Record<string, unknown>);
      continue;
    }

    if (field.type === "array" && field.fields && Array.isArray(value)) {
      result[field.name] = await Promise.all(
        value.map((item) =>
          typeof item === "object" && item !== null
            ? applyFieldWriteAccess({ ...context, fields: field.fields }, item as Record<string, unknown>)
            : item,
        ),
      );
      continue;
    }

    if (field.type === "blocks" && field.blocks && Array.isArray(value)) {
      result[field.name] = await Promise.all(
        value.map(async (item) => {
          if (typeof item !== "object" || item === null) return item;
          const typedItem = item as Record<string, unknown>;
          const block = field.blocks?.find((candidate) => candidate.slug === typedItem.blockType);
          if (!block) return item;
          return applyFieldWriteAccess({ ...context, fields: block.fields }, typedItem);
        }),
      );
    }
  }

  return result;
}

export function mergeWhereConstraint(
  where: Record<string, unknown> | undefined,
  constraint: Record<string, unknown>,
): Record<string, unknown> {
  return where ? { AND: [where, constraint] } : constraint;
}
