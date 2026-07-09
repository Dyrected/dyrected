import type { Context } from "hono";
import type { DyrectedContext } from "../app.js";
import type { GlobalConfig } from "../types/index.js";
import { PopulationService } from "../services/population.service.js";
import { DefaultsService } from "../services/defaults.service.js";
import { runCollectionHooks, executeFieldBeforeChange, executeFieldAfterRead } from "../utils/hooks.js";
import { createReadonlyDb } from "../utils/readonly-db.js";
import { applyFieldReadAccess, applyFieldWriteAccess, resolveBooleanAccess, toHookRequestContext } from "../utils/access-control.js";

export class GlobalController {
  private global: GlobalConfig;

  constructor(global: GlobalConfig) {
    this.global = global;
  }

  async get(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const readonlyDb = createReadonlyDb(db);
    // Default relationship depth is 1, matching the SDK default.
    const depth = c.req.query("depth") !== undefined ? Number(c.req.query("depth")) : 1;
    const user = c.get("user");

    // Run beforeRead collection hook
    let query: any = undefined;
    const beforeReadResult = await runCollectionHooks(this.global.hooks?.beforeRead, {
      req: c.req,
      query,
      user,
      db: readonlyDb,
    });
    if (beforeReadResult !== undefined) {
      query = beforeReadResult;
    }

    let data = await db.getGlobal({ slug: this.global.slug });
    const isEmpty = !data || isFunctionallyEmpty(data);

    if (isEmpty && this.global.initialData) {
      console.log(`[dyrected/core] Auto-seeding global "${this.global.slug}" from config.initialData`);
      await db.updateGlobal({ slug: this.global.slug, data: this.global.initialData });
      data = this.global.initialData as Record<string, unknown>;
    }

    const canRead = await resolveBooleanAccess(config, this.global.access?.read, {
      user,
      req: toHookRequestContext(c.req),
      doc: data,
    });
    if (!canRead) {
      return c.json({ error: true, message: `Access denied: read on ${this.global.slug}` }, 403);
    }

    const dataWithDefaults = DefaultsService.apply(this.global.fields, data);

    // Run afterRead hooks
    const docWithCollectionHooks = await runCollectionHooks(this.global.hooks?.afterRead, {
      doc: dataWithDefaults,
      req: c.req,
      user,
      db: readonlyDb,
    });
    const docWithFieldHooks = await executeFieldAfterRead(this.global.fields, docWithCollectionHooks, user, readonlyDb);
    const docWithFieldAccess = await applyFieldReadAccess({
      config,
      fields: this.global.fields,
      user,
      req: toHookRequestContext(c.req),
      doc: docWithFieldHooks,
    }, docWithFieldHooks);

    if (depth > 0 && docWithFieldAccess) {
      const populationService = new PopulationService(db!, config.collections);
      const populatedData = await populationService.populate({
        data: docWithFieldAccess,
        fields: this.global.fields,
        currentDepth: 0,
        maxDepth: depth,
      });
      return c.json(populatedData);
    }

    return c.json(docWithFieldAccess);
  }

  async update(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const readonlyDb = createReadonlyDb(db);
    const body = await c.req.json();
    const user = c.get("user");

    const originalDoc = await db.getGlobal({ slug: this.global.slug }) || {};

    const canUpdate = await resolveBooleanAccess(config, this.global.access?.update, {
      user,
      req: toHookRequestContext(c.req),
      doc: originalDoc,
      data: body,
    });
    if (!canUpdate) {
      return c.json({ error: true, message: `Access denied: update on ${this.global.slug}` }, 403);
    }

    let sanitizedBody = await applyFieldWriteAccess({
      config,
      fields: this.global.fields,
      user,
      req: toHookRequestContext(c.req),
      doc: originalDoc,
      data: body,
    }, body);

    // Run beforeChange hooks (field-level then collection-level)
    let data = await executeFieldBeforeChange(this.global.fields, sanitizedBody, originalDoc, user, readonlyDb);
    data = await runCollectionHooks(this.global.hooks?.beforeChange, {
      data,
      doc: originalDoc,
      req: c.req,
      user,
      operation: "update",
      db: readonlyDb,
    });

    const updated = await db.updateGlobal({ slug: this.global.slug, data });

    // Run afterChange global hooks (full db access)
    await runCollectionHooks(this.global.hooks?.afterChange, {
      doc: updated,
      previousDoc: originalDoc,
      user,
      req: c.req,
      operation: "update",
      db,
    }, { isolated: true });

    // Run afterRead hooks
    const readDoc = await runCollectionHooks(this.global.hooks?.afterRead, {
      doc: updated,
      req: c.req,
      user,
      db: readonlyDb,
    });
    const finalDoc = await executeFieldAfterRead(this.global.fields, readDoc, user, readonlyDb);
    const accessibleDoc = await applyFieldReadAccess({
      config,
      fields: this.global.fields,
      user,
      req: toHookRequestContext(c.req),
      doc: finalDoc,
    }, finalDoc);

    return c.json(accessibleDoc);
  }

  async seed(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const body = await c.req.json();
    const initialData = body.data;

    if (!initialData) {
      return c.json({ message: "Invalid initial data" }, 400);
    }

    // Check if functionally empty
    const existing = await db.getGlobal({ slug: this.global.slug });
    if (existing && !isFunctionallyEmpty(existing)) {
      return c.json({ message: "Global is not empty, skipping seed" });
    }

    console.log(`[dyrected/core] Auto-seeding global: ${this.global.slug}`);
    await db.updateGlobal({ slug: this.global.slug, data: initialData });

    return c.json({ message: "Seed successful", data: initialData }, 201);
  }
}

function isFunctionallyEmpty(obj: any): boolean {
  if (obj === null || obj === undefined || obj === "") return true;
  if (Array.isArray(obj)) {
    if (obj.length === 0) return true;
    return obj.every(isFunctionallyEmpty);
  }
  if (typeof obj === "object") {
    const keys = Object.keys(obj);
    if (keys.length === 0) return true;
    return keys.every((key) => isFunctionallyEmpty(obj[key]));
  }
  return false;
}
