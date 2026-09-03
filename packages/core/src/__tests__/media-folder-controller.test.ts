import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { MediaFolderController } from "../controllers/media-folders.controller.js";
import type { DyrectedConfig } from "../types/index.js";
import type { DyrectedContext } from "../app.js";

describe("MediaFolderController - Database Persistence CRUD", () => {
  const mockDb = {
    create: vi.fn().mockImplementation(async ({ collection, data }) => ({
      id: "folder-123",
      ...data,
    })),
    find: vi.fn().mockResolvedValue({
      docs: [
        {
          id: "folder-1",
          name: "Marketing",
          slug: "marketing",
          collection: "media",
          parentId: null,
          path: "/marketing",
          color: "#3b82f6",
        },
      ],
      totalDocs: 1,
    }),
    findOne: vi.fn().mockResolvedValue({
      id: "folder-1",
      name: "Marketing",
      slug: "marketing",
      collection: "media",
      parentId: null,
      path: "/marketing",
      color: "#3b82f6",
    }),
    update: vi.fn().mockImplementation(async ({ collection, id, data }) => ({
      id,
      ...data,
    })),
    delete: vi.fn().mockResolvedValue(true),
    aggregate: vi.fn(),
    getGlobal: vi.fn(),
  };

  const createTestApp = (configOverrides: Partial<DyrectedConfig> = {}) => {
    const app = new Hono<DyrectedContext>();
    const config: DyrectedConfig = {
      collections: [{ slug: "media", upload: true, fields: [] }],
      globals: [],
      db: mockDb as any,
      ...configOverrides,
    };

    app.use("*", async (c, next) => {
      c.set("config" as any, config);
      await next();
    });

    const controller = new MediaFolderController("media");
    app.get("/api/collections/media/folders", (c) => controller.list(c));
    app.post("/api/collections/media/folders", (c) => controller.create(c));
    app.patch("/api/collections/media/folders/:id", (c) => controller.update(c));
    app.delete("/api/collections/media/folders/:id", (c) => controller.delete(c));

    return app;
  };

  it("lists folders for the active collection", async () => {
    const app = createTestApp();
    const res = await app.request("http://localhost/api/collections/media/folders");

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.docs).toHaveLength(1);
    expect(json.docs[0].name).toBe("Marketing");
    expect(mockDb.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "_media_folders",
        where: { collection: { equals: "media" } },
      })
    );
  });

  it("creates a new folder with auto-generated slug and path", async () => {
    const app = createTestApp();
    const res = await app.request("http://localhost/api/collections/media/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Brand Assets", color: "#ec4899" }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.name).toBe("Brand Assets");
    expect(json.slug).toBe("brand-assets");
    expect(json.path).toBe("/brand-assets");
    expect(json.color).toBe("#ec4899");
    expect(mockDb.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "_media_folders",
        data: expect.objectContaining({
          name: "Brand Assets",
          slug: "brand-assets",
          collection: "media",
          color: "#ec4899",
        }),
      })
    );
  });

  it("updates an existing folder", async () => {
    const app = createTestApp();
    const res = await app.request("http://localhost/api/collections/media/folders/folder-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Global Marketing", color: "#10b981" }),
    });

    expect(res.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "_media_folders",
        id: "folder-1",
        data: expect.objectContaining({
          name: "Global Marketing",
          slug: "global-marketing",
          color: "#10b981",
        }),
      })
    );
  });

  it("deletes a folder", async () => {
    const app = createTestApp();
    const res = await app.request("http://localhost/api/collections/media/folders/folder-1", {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockDb.delete).toHaveBeenCalledWith({
      collection: "_media_folders",
      id: "folder-1",
    });
  });
});
