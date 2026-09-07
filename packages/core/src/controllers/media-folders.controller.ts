import type { Context } from "hono";
import type { DyrectedContext } from "../app.js";

export class MediaFolderController {
  private collection: string;

  constructor(collection: string = "media") {
    this.collection = collection;
  }

  async list(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;

    if (!db) {
      return c.json({ message: "Database not configured" }, 500);
    }

    try {
      const result = await db.find({
        collection: "_media_folders",
        where: {
          collection: { equals: this.collection },
        },
        limit: 1000,
        sort: "name",
      });

      return c.json(result);
    } catch {
      // If table doesn't exist yet, return standard empty paginated result
      return c.json({
        docs: [],
        total: 0,
        limit: 1000,
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    }
  }

  async create(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;

    if (!db) {
      return c.json({ message: "Database not configured" }, 500);
    }

    const body = await c.req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const parentId = body.parentId ? String(body.parentId) : null;
    const color = body.color ? String(body.color) : null;

    if (!name) {
      return c.json({ message: "Folder name is required" }, 400);
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    let path = `/${slug}`;
    if (parentId) {
      try {
        const parent = await db.findOne({
          collection: "_media_folders",
          id: parentId,
        });
        if (parent && parent.path) {
          path = `${parent.path}/${slug}`;
        }
      } catch {
        // Fallback to top-level path
      }
    }

    const now = new Date().toISOString();
    const folderData = {
      name,
      slug,
      collection: this.collection,
      parentId,
      path,
      color,
      createdAt: now,
      updatedAt: now,
    };

    const doc = await db.create({
      collection: "_media_folders",
      data: folderData,
    });

    return c.json(doc, 201);
  }

  async update(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    const id = c.req.param("id");

    if (!db) {
      return c.json({ message: "Database not configured" }, 500);
    }

    if (!id) {
      return c.json({ message: "Folder ID is required" }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const existing = await db.findOne({
      collection: "_media_folders",
      id,
    });

    if (!existing) {
      return c.json({ message: "Folder not found" }, 404);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return c.json({ message: "Folder name cannot be empty" }, 400);
      updateData.name = name;
      updateData.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }

    if (body.color !== undefined) {
      updateData.color = body.color || null;
    }

    if (body.parentId !== undefined) {
      updateData.parentId = body.parentId || null;
    }

    const updated = await db.update({
      collection: "_media_folders",
      id,
      data: updateData,
    });

    return c.json(updated);
  }

  async delete(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    const id = c.req.param("id");

    if (!db) {
      return c.json({ message: "Database not configured" }, 500);
    }

    if (!id) {
      return c.json({ message: "Folder ID is required" }, 400);
    }

    const existing = await db.findOne({
      collection: "_media_folders",
      id,
    });

    if (!existing) {
      return c.json({ message: "Folder not found" }, 404);
    }

    // Delete the folder
    await db.delete({
      collection: "_media_folders",
      id,
    });

    return c.json({ success: true, id });
  }
}
