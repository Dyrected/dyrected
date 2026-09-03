import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { MediaController } from "../controllers/media.controller.js";
import type { DyrectedConfig, StorageAdapter } from "../types/index.js";

describe("MediaController - Dynamic Transforms & DAM Ingestion", () => {
  const mockStorage: StorageAdapter = {
    upload: vi.fn().mockImplementation(async ({ filename, mimeType }) => ({
      filename,
      filesize: 1024,
      mimeType,
      url: `https://cdn.example.com/${filename}`,
      width: 1920,
      height: 1080,
    })),
    delete: vi.fn().mockResolvedValue(undefined),
    getURL: vi.fn().mockImplementation(({ filename, transform }) => {
      if (!transform) return `https://cdn.example.com/${filename}`;
      const params = [];
      if (transform.width) params.push(`w_${transform.width}`);
      if (transform.height) params.push(`h_${transform.height}`);
      if (transform.crop) params.push(`c_${transform.crop}`);
      if (transform.format) params.push(`f_${transform.format}`);
      return `https://cdn.example.com/${params.join(",")}/${filename}`;
    }),
    resolve: vi.fn().mockResolvedValue({
      buffer: new Uint8Array([1, 2, 3, 4]),
      mimeType: "image/png",
    }),
  };

  const mockDb = {
    create: vi.fn().mockImplementation(async ({ collection, data }) => ({
      id: "doc-123",
      ...data,
    })),
    find: vi.fn().mockResolvedValue({
      docs: [],
      total: 0,
      limit: 10,
      page: 1,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    }),
    findOne: vi.fn().mockResolvedValue({
      id: "doc-123",
      filename: "sample.jpg",
      sizes: {},
    }),
    update: vi.fn(),
    delete: vi.fn().mockResolvedValue(true),
    aggregate: vi.fn(),
    getGlobal: vi.fn(),
  };

  const createTestApp = (configOverrides: Partial<DyrectedConfig> = {}) => {
    const app = new Hono();
    const config: DyrectedConfig = {
      collections: [{ slug: "media", upload: true, fields: [] }],
      globals: [],
      db: mockDb as any,
      storage: mockStorage,
      media: {
        presets: {
          thumbnail: { width: 150, height: 150, crop: "fill", format: "webp" },
          banner: { width: 1200, height: 400, crop: "fill", format: "webp" },
        },
      },
      ...configOverrides,
    };

    app.use("*", async (c, next) => {
      c.set("config", config);
      await next();
    });

    const controller = new MediaController("media");
    app.post("/api/media", (c) => controller.upload(c as any));
    app.get("/api/media", (c) => controller.find(c as any));
    app.get("/api/media/:filename", (c) => controller.serve(c as any));
    app.delete("/api/media/:id", (c) => controller.delete(c as any));

    return app;
  };

  it("extracts folderId, focalPoint, and computes aspectRatio during upload", async () => {
    const app = createTestApp();
    const formData = new FormData();
    const file = new File([new Uint8Array([1, 2, 3])], "test-image.png", {
      type: "image/png",
    });
    formData.append("file", file);
    formData.append("folderId", "folder-summer-2026");
    formData.append("focalPoint", JSON.stringify({ x: 0.5, y: 0.3 }));
    formData.append("alt", "Summer Campaign Banner");

    const res = await app.request("/api/media", {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.folderId).toBe("folder-summer-2026");
    expect(body.focalPoint).toEqual({ x: 0.5, y: 0.3 });
    expect(body.originalFilename).toBe("test-image.png");
    expect(body.alt).toBe("Summer Campaign Banner");
    expect(body.aspectRatio).toBeCloseTo(1920 / 1080);
  });

  it("serves transformed asset with redirect when transform params are passed", async () => {
    const app = createTestApp();
    const res = await app.request("/api/media/sample.jpg?width=400&height=300&crop=fill&format=webp");

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://cdn.example.com/w_400,h_300,c_fill,f_webp/sample.jpg");
  });

  it("resolves named transformation presets via ?key=name", async () => {
    const app = createTestApp();
    const res = await app.request("/api/media/sample.jpg?key=thumbnail");

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://cdn.example.com/w_150,h_150,c_fill,f_webp/sample.jpg");
  });

  it("filters assets by folderId in list queries", async () => {
    const app = createTestApp();
    const res = await app.request("/api/media?folderId=folder-summer-2026");

    expect(res.status).toBe(200);
    expect(mockDb.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "media",
        where: { folderId: "folder-summer-2026" },
      })
    );
  });
});
