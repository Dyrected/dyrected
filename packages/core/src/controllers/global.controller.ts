import type { Context } from "hono";
import type { DyrectedContext } from "../app.js";
import type { GlobalConfig } from "../types/index.js";
import { PopulationService } from "../services/population.service.js";
import { DefaultsService } from "../services/defaults.service.js";

export class GlobalController {
  private global: GlobalConfig;

  constructor(global: GlobalConfig) {
    this.global = global;
  }

  async get(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const depth = c.req.query("depth") !== undefined ? Number(c.req.query("depth")) : 10;
    let data = await db.getGlobal({ slug: this.global.slug });
    const isEmpty = !data || Object.keys(data).length === 0;

    if (isEmpty && this.global.initialData) {
      console.log(`[dyrected/core] Auto-seeding global "${this.global.slug}" from config.initialData`);
      await db.updateGlobal({ slug: this.global.slug, data: this.global.initialData });
      data = this.global.initialData;
    }

    const dataWithDefaults = DefaultsService.apply(this.global.fields, data);

    if (depth > 0 && dataWithDefaults) {
      const populationService = new PopulationService(db!, config.collections);
      const populatedData = await populationService.populate({
        data: dataWithDefaults,
        fields: this.global.fields,
        currentDepth: 0,
        maxDepth: depth,
      });
      return c.json(populatedData);
    }

    return c.json(dataWithDefaults);
  }

  async update(c: Context<DyrectedContext>) {
    const db = c.get("config").db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const body = await c.req.json();
    const data = await db.updateGlobal({ slug: this.global.slug, data: body });
    return c.json(data);
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
