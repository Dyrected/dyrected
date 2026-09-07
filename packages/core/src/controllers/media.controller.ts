import type { Context } from "hono";
import type { DyrectedContext } from "../app.js";
import type { ImageTransformOptions } from "../types/adapters.js";
import { validateUpload, generateUniqueUploadFilename } from "../utils/upload-validation.js";
import { mergeDynamicConfig } from "../utils/block-references.js";
import { getRequestLogger } from "../observability.js";

export class MediaController {
  private collection: string;
  private loggerComponent = "media";

  constructor(collection: string = "media") {
    this.collection = collection;
  }

  async upload(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const storage = config.storage;
    const imageService = config.image;

    if (!storage) {
      return c.json({ message: "Storage not configured" }, 500);
    }

    const body = await c.req.parseBody();
    const file = body["file"] as File;
    const folderId = (body["folderId"] as string) || null;
    const focalPointStr = body["focalPoint"] as string;
    const focalPoint = focalPointStr ? JSON.parse(focalPointStr) : undefined;

    if (!file) {
      return c.json({ message: "No file uploaded" }, 400);
    }

    const siteId = c.get("siteId");

    // Resolve the collection config so we can enforce its upload restrictions.
    let colConfig = config.collections.find(
      (col) => col.slug === this.collection,
    );
    if (!colConfig && config.onSchemaFetch && siteId) {
      const requestConfig = mergeDynamicConfig(
        config,
        await config.onSchemaFetch(siteId),
      );
      colConfig = requestConfig.collections.find(
        (col) => col.slug === this.collection,
      );
    }

    const uploadConfig =
      typeof colConfig?.upload === "object" ? colConfig.upload : undefined;
    const validationError = validateUpload(file, uploadConfig);
    if (validationError) {
      return c.json(
        { message: validationError.message },
        validationError.status,
      );
    }

    const buffer = new Uint8Array(await file.arrayBuffer());

    const workspaceId = c.get("workspaceId");
    const prefix = workspaceId
      ? `${workspaceId}/${siteId}`
      : siteId || "default";

    const uniqueFilename = generateUniqueUploadFilename(file.name);

    // 1. Process Image if service exists
    let imageMetadata: any = {};
    let imageSizes: any = {};

    if (imageService && file.type.startsWith("image/")) {
      try {
        const processed = await imageService.process({
          buffer,
          mimeType: file.type,
          config: colConfig?.upload,
          focalPoint,
        });
        imageMetadata = processed.metadata || {};
        imageSizes = processed.sizes || {};
      } catch (err) {
        getRequestLogger(c, this.loggerComponent).error({
          err,
          msg: "Image processing failed",
          collection: this.collection,
          filename: file.name,
        });
      }
    }

    // 2. Upload main file
    const fileData = await storage.upload({
      filename: uniqueFilename,
      buffer,
      mimeType: file.type,
      prefix,
    });

    const width = fileData.width || imageMetadata.width;
    const height = fileData.height || imageMetadata.height;
    const aspectRatio = width && height ? width / height : undefined;

    // Collect custom form fields from body (e.g. alt, title, caption, sku, etc.)
    const customFields: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(body)) {
      if (!["file", "focalPoint", "folderId"].includes(key) && typeof val === "string") {
        try {
          customFields[key] = JSON.parse(val);
        } catch {
          customFields[key] = val;
        }
      }
    }

    const finalFileData = {
      ...customFields,
      ...fileData,
      ...imageMetadata,
      originalFilename: file.name,
      folderId,
      width,
      height,
      aspectRatio,
      focalPoint,
      sizes: {} as any,
    };

    // 3. Upload resized versions
    if (imageSizes) {
      for (const [sizeName, sizeData] of Object.entries(imageSizes) as [
        string,
        any,
      ][]) {
        const lastDot = uniqueFilename.lastIndexOf(".");
        const ext = lastDot !== -1 ? uniqueFilename.substring(lastDot) : "";
        const baseName = lastDot !== -1 ? uniqueFilename.substring(0, lastDot) : uniqueFilename;
        const sizeFilename = `${baseName}-${sizeName}${ext}`;

        try {
          const sizeFileData = await storage.upload({
            filename: sizeFilename,
            buffer: sizeData.buffer,
            mimeType: file.type,
            prefix,
          });

          finalFileData.sizes[sizeName] = {
            ...sizeFileData,
            width: sizeData.width,
            height: sizeData.height,
          };
        } catch (err) {
          getRequestLogger(c, this.loggerComponent).error({
            err,
            msg: "Failed to upload image size",
            collection: this.collection,
            filename: file.name,
            sizeName,
          });
        }
      }
    }

    // 4. Save to database
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const doc = await db.create({
      collection: this.collection,
      data: finalFileData,
    });

    return c.json(doc, 201);
  }

  async replace(c: Context<DyrectedContext>) {
    const id = c.req.param("id");
    const config = c.get("config");
    const storage = config.storage;
    const imageService = config.image;
    const db = config.db;

    if (!storage) {
      return c.json({ message: "Storage not configured" }, 500);
    }
    if (!db) {
      return c.json({ message: "Database not configured" }, 500);
    }
    if (!id) {
      return c.json({ message: "Missing ID" }, 400);
    }

    const existingDoc = await db.findOne({ collection: this.collection, id });
    if (!existingDoc) {
      return c.json({ message: "Asset not found" }, 404);
    }

    const body = await c.req.parseBody();
    const file = body["file"] as File;
    if (!file) {
      return c.json({ message: "No file uploaded" }, 400);
    }

    const siteId = c.get("siteId");
    let colConfig = config.collections.find((col) => col.slug === this.collection);
    if (!colConfig && config.onSchemaFetch && siteId) {
      const requestConfig = mergeDynamicConfig(config, await config.onSchemaFetch(siteId));
      colConfig = requestConfig.collections.find((col) => col.slug === this.collection);
    }

    const uploadConfig = typeof colConfig?.upload === "object" ? colConfig.upload : undefined;
    const validationError = validateUpload(file, uploadConfig);
    if (validationError) {
      return c.json({ message: validationError.message }, validationError.status);
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const workspaceId = c.get("workspaceId");
    const prefix = workspaceId ? `${workspaceId}/${siteId}` : siteId || "default";
    const uniqueFilename = generateUniqueUploadFilename(file.name);

    let imageMetadata: any = {};
    let imageSizes: any = {};

    if (imageService && file.type.startsWith("image/")) {
      try {
        const processed = await imageService.process({
          buffer,
          mimeType: file.type,
          config: colConfig?.upload,
          focalPoint: existingDoc.focalPoint,
        });
        imageMetadata = processed.metadata || {};
        imageSizes = processed.sizes || {};
      } catch (err) {
        getRequestLogger(c, this.loggerComponent).error({
          err,
          msg: "Image processing failed during replace",
          collection: this.collection,
          filename: file.name,
        });
      }
    }

    const fileData = await storage.upload({
      filename: uniqueFilename,
      buffer,
      mimeType: file.type,
      prefix,
    });

    const width = fileData.width || imageMetadata.width;
    const height = fileData.height || imageMetadata.height;
    const aspectRatio = width && height ? width / height : undefined;

    const finalFileData = {
      ...fileData,
      ...imageMetadata,
      originalFilename: file.name,
      width,
      height,
      aspectRatio,
      sizes: {} as any,
    };

    if (imageSizes) {
      for (const [sizeName, sizeData] of Object.entries(imageSizes) as [string, any][]) {
        const lastDot = uniqueFilename.lastIndexOf(".");
        const ext = lastDot !== -1 ? uniqueFilename.substring(lastDot) : "";
        const baseName = lastDot !== -1 ? uniqueFilename.substring(0, lastDot) : uniqueFilename;
        const sizeFilename = `${baseName}-${sizeName}${ext}`;
        try {
          const sizeFileData = await storage.upload({
            filename: sizeFilename,
            buffer: sizeData.buffer,
            mimeType: file.type,
            prefix,
          });
          finalFileData.sizes[sizeName] = {
            ...sizeFileData,
            width: sizeData.width,
            height: sizeData.height,
          };
        } catch (err) {
          getRequestLogger(c, this.loggerComponent).error({
            err,
            msg: "Failed to upload image size during replace",
            collection: this.collection,
            filename: file.name,
            sizeName,
          });
        }
      }
    }

    // Cleanup old storage file if filename changed
    if (existingDoc.filename && existingDoc.filename !== fileData.filename) {
      try {
        await storage.delete({ filename: existingDoc.filename as string });
      } catch {}
    }

    const updatedDoc = await db.update({
      collection: this.collection,
      id,
      data: finalFileData,
    });

    return c.json(updatedDoc, 200);
  }

  async find(c: Context<DyrectedContext>) {
    const db = c.get("config").db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const limit = Number(c.req.query("limit")) || 10;
    const page = Number(c.req.query("page")) || 1;
    const sort = c.req.query("sort") || undefined;
    const folderId = c.req.query("folderId");

    const where: Record<string, unknown> = {};
    if (folderId !== undefined) {
      where.folderId = folderId === "root" || folderId === "null" ? null : folderId;
    }

    const result = await db.find({
      collection: this.collection,
      limit,
      page,
      sort,
      where: Object.keys(where).length > 0 ? where : undefined,
    });
    return c.json(result);
  }

  async delete(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const storage = config.storage;
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const id = c.req.param("id");

    if (!id) return c.json({ message: "Missing ID" }, 400);

    const doc = await db.findOne({ collection: this.collection, id });
    if (!doc) return c.json({ message: "Not Found" }, 404);

    if (storage) {
      // Delete main file
      await storage.delete({ filename: doc.filename as string });

      // Delete all sizes
      if (doc.sizes) {
        for (const size of Object.values(doc.sizes) as any[]) {
          if (size.filename) {
            await storage.delete({ filename: size.filename });
          }
        }
      }
    }

    await db.delete({ collection: this.collection, id });
    return c.json({ message: "Deleted" });
  }

  async serve(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const storage = config.storage;
    if (!storage) {
      return c.json({ message: "Storage not configured for serving" }, 404);
    }

    const filename = c.req.param("filename");
    if (!filename) return c.json({ message: "Missing filename" }, 400);

    // Parse dynamic transform query parameters
    const key = c.req.query("key");
    const width = c.req.query("width") ? Number(c.req.query("width")) : undefined;
    const height = c.req.query("height") ? Number(c.req.query("height")) : undefined;
    const aspectRatio = c.req.query("aspectRatio") || c.req.query("aspect_ratio");
    const crop = (c.req.query("crop") || c.req.query("fit")) as ImageTransformOptions["crop"];
    const gravity = c.req.query("gravity") as ImageTransformOptions["gravity"];
    const format = c.req.query("format") as ImageTransformOptions["format"];
    const qualityParam = c.req.query("quality");
    const quality = qualityParam
      ? isNaN(Number(qualityParam))
        ? (qualityParam as any)
        : Number(qualityParam)
      : undefined;
    const download = c.req.query("download") === "true" || c.req.query("download") === "1";

    let transform: ImageTransformOptions | undefined;

    // Resolve preset if key is specified
    if (key && config.media?.presets?.[key]) {
      transform = { ...config.media.presets[key] };
    } else if (width || height || aspectRatio || crop || gravity || format || quality) {
      transform = { width, height, aspectRatio, crop, gravity, format, quality };
    }

    // If storage can generate transformed CDN URLs directly (e.g. Cloudinary)
    if (transform && typeof storage.getURL === "function") {
      const targetUrl = storage.getURL({ filename, transform });
      if (targetUrl && targetUrl.startsWith("http")) {
        return c.redirect(targetUrl, 302);
      }
    }

    if (!storage.resolve) {
      const publicUrl = storage.getURL({ filename, transform });
      return c.redirect(publicUrl, 302);
    }

    let res = await storage.resolve({ filename });

    // Fallback: Try with 'default/' prefix if not found and not already prefixed
    if (!res && !filename.includes("/")) {
      res = await storage.resolve({ filename: `default/${filename}` });
    }

    if (!res) return c.json({ message: "Not Found" }, 404);

    c.header("Content-Type", res.mimeType);
    c.header("Cache-Control", "public, max-age=31536000, immutable");
    if (download) {
      const downloadName = filename.split("/").pop() || "download";
      c.header("Content-Disposition", `attachment; filename="${downloadName}"`);
    }

    return c.body(res.buffer as any);
  }
}
