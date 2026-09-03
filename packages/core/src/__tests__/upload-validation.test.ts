import { describe, it, expect } from "vitest";
import { isMimeAllowed, validateUpload, generateUniqueUploadFilename } from "../utils/upload-validation.js";

describe("isMimeAllowed", () => {
  it("matches exact mime types (case-insensitive)", () => {
    expect(isMimeAllowed("image/png", ["image/png"])).toBe(true);
    expect(isMimeAllowed("IMAGE/PNG", ["image/png"])).toBe(true);
    expect(isMimeAllowed("image/gif", ["image/png"])).toBe(false);
  });

  it("supports type/* wildcards", () => {
    expect(isMimeAllowed("image/webp", ["image/*"])).toBe(true);
    expect(isMimeAllowed("video/mp4", ["image/*"])).toBe(false);
  });

  it("supports full wildcards", () => {
    expect(isMimeAllowed("application/zip", ["*"])).toBe(true);
    expect(isMimeAllowed("application/zip", ["*/*"])).toBe(true);
  });
});

describe("validateUpload", () => {
  it("allows anything when no config is set", () => {
    expect(validateUpload({ type: "application/x-msdownload", size: 999 }, undefined)).toBeNull();
  });

  it("rejects disallowed mime types with 415", () => {
    const err = validateUpload({ type: "image/svg+xml", size: 10 }, { allowedMimeTypes: ["image/png", "image/jpeg"] });
    expect(err?.status).toBe(415);
  });

  it("allows permitted mime types", () => {
    expect(validateUpload({ type: "image/png", size: 10 }, { allowedMimeTypes: ["image/*"] })).toBeNull();
  });

  it("rejects oversized files with 413", () => {
    const err = validateUpload({ type: "image/png", size: 5_000 }, { maxFileSize: 1_000 });
    expect(err?.status).toBe(413);
  });

  it("allows files within the size limit", () => {
    expect(validateUpload({ type: "image/png", size: 500 }, { maxFileSize: 1_000 })).toBeNull();
  });

  it("checks mime type before size", () => {
    const err = validateUpload(
      { type: "text/plain", size: 5_000 },
      { allowedMimeTypes: ["image/*"], maxFileSize: 1_000 },
    );
    expect(err?.status).toBe(415);
  });
});

describe("generateUniqueUploadFilename", () => {
  it("preserves the file extension", () => {
    const result = generateUniqueUploadFilename("photo.png");
    expect(result).toMatch(/\.png$/);
  });

  it("preserves multi-dot extensions by taking only the last dot", () => {
    const result = generateUniqueUploadFilename("screenshot.2026.08.png");
    expect(result).toMatch(/^screenshot-2026-08-\d+-[a-z0-9]+\.png$/);
  });

  it("sanitizes unsafe characters and normalizes to lowercase", () => {
    const result = generateUniqueUploadFilename("My Photo (1).JPEG");
    expect(result).toMatch(/^my-photo-1-\d+-[a-z0-9]+\.jpeg$/);
  });

  it("strips diacritics and accented characters", () => {
    const result = generateUniqueUploadFilename("café.jpg");
    expect(result).toMatch(/^cafe-\d+-[a-z0-9]+\.jpg$/);
  });

  it("handles files with no extension", () => {
    const result = generateUniqueUploadFilename("README");
    expect(result).toMatch(/^readme-\d+-[a-z0-9]+$/);
    expect(result).not.toContain(".");
  });

  it("generates unique filenames for identical inputs", async () => {
    const a = generateUniqueUploadFilename("image.png");
    const b = generateUniqueUploadFilename("image.png");
    const [c, d] = await Promise.all([
      generateUniqueUploadFilename("image.png"),
      generateUniqueUploadFilename("image.png"),
    ]);
    expect(a).not.toBe(b);
    expect(c).not.toBe(d);
  });

  it("does not double-suffix a filename that already has a timestamp-random pattern", () => {
    const alreadySuffixed = "photo-1725195000000-a1b2c3.jpg";
    const result = generateUniqueUploadFilename(alreadySuffixed);
    expect(result).toBe("photo-1725195000000-a1b2c3.jpg");
  });

  it('falls back to "file" for degenerate filenames', () => {
    const result = generateUniqueUploadFilename("....png");
    expect(result).toMatch(/^file-\d+-[a-z0-9]+\.png$/);
  });

  it("collapses consecutive dashes from special characters", () => {
    const result = generateUniqueUploadFilename("a---b___c.webp");
    expect(result).toMatch(/^a-b___c-\d+-[a-z0-9]+\.webp$/);
  });
});
