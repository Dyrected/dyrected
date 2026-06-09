import type { Context } from "hono";
import type { DyrectedContext } from "../app.js";
import type { GlobalConfig } from "../types/index.js";
import { PopulationService } from "../services/population.service.js";
import { DefaultsService } from "../services/defaults.service.js";
import { runCollectionHooks, executeFieldBeforeChange, executeFieldAfterRead } from "../utils/hooks.js";
import { createReadonlyDb } from "../utils/readonly-db.js";

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
    const depth = c.req.query("depth") !== undefined ? Number(c.req.query("depth")) : 10;
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
    const isEmpty = !data || Object.keys(data).length === 0;

    if (isEmpty && this.global.initialData) {
      console.log(`[dyrected/core] Auto-seeding global "${this.global.slug}" from config.initialData`);
      await db.updateGlobal({ slug: this.global.slug, data: this.global.initialData });
      data = this.global.initialData as Record<string, unknown>;
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

    if (depth > 0 && docWithFieldHooks) {
      const populationService = new PopulationService(db!, config.collections);
      const populatedData = await populationService.populate({
        data: docWithFieldHooks,
        fields: this.global.fields,
        currentDepth: 0,
        maxDepth: depth,
      });
      return c.json(populatedData);
    }

    return c.json(docWithFieldHooks);
  }

  async update(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const readonlyDb = createReadonlyDb(db);
    const body = await c.req.json();
    const user = c.get("user");

    const originalDoc = await db.getGlobal({ slug: this.global.slug }) || {};

    // Run beforeChange hooks (field-level then collection-level)
    let data = await executeFieldBeforeChange(this.global.fields, body, originalDoc, user, readonlyDb);
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

    return c.json(finalDoc);
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

    // Check if empty
    const existing = await db.getGlobal({ slug: this.global.slug });
    if (existing && Object.keys(existing).length > 0) {
      return c.json({ message: "Global is not empty, skipping seed" });
    }

    console.log(`[dyrected/core] Auto-seeding global: ${this.global.slug}`);
    await db.updateGlobal({ slug: this.global.slug, data: initialData });

    return c.json({ message: "Seed successful", data: initialData }, 201);
  }
}
