import { Context } from "hono";
import { DyrectedContext } from "../app.js";
import { GlobalConfig } from "../types/index.js";
import { PopulationService } from "../services/population.service.js";
import { DefaultsService } from "../services/defaults.service.js";

export class GlobalController {
  constructor(private global: GlobalConfig) {}

  async get(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const depth = c.req.query("depth") !== undefined ? Number(c.req.query("depth")) : 1;
    const data = await db.getGlobal({ slug: this.global.slug });

    const dataWithDefaults = DefaultsService.apply(this.global.fields, data);

    if (depth > 0 && dataWithDefaults) {
      const populationService = new PopulationService(db!, config.collections);
      const populatedData = await populationService.populate({
        data: dataWithDefaults,
        fields: this.global.fields,
        currentDepth: 1,
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
}
