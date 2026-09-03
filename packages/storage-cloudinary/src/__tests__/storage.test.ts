import { describe, it, expect } from "vitest";
import { CloudinaryStorageAdapter } from "../index.js";

describe("CloudinaryStorageAdapter - Dynamic URL Transformations", () => {
  const adapter = new CloudinaryStorageAdapter({
    cloudName: "demo-cloud",
    apiKey: "test-api-key",
    apiSecret: "test-api-secret",
  });

  it("returns base secure URL when no transform is requested", () => {
    const url = adapter.getURL({ filename: "samples/nature.jpg" });
    expect(url).toContain("res.cloudinary.com/demo-cloud/image/upload");
    expect(url).toContain("samples/nature.jpg");
  });

  it("generates dynamic width, height, crop, format, and quality parameters", () => {
    const url = adapter.getURL({
      filename: "samples/nature.jpg",
      transform: {
        width: 800,
        height: 600,
        crop: "fill",
        format: "webp",
        quality: 85,
      },
    });

    expect(url).toContain("c_fill");
    expect(url).toContain("h_600");
    expect(url).toContain("w_800");
    expect(url).toContain("f_webp");
    expect(url).toContain("q_85");
  });

  it("generates focal point coordinates when provided", () => {
    const url = adapter.getURL({
      filename: "samples/portrait.jpg",
      transform: {
        width: 400,
        height: 400,
        focalPoint: { x: 0.65, y: 0.35 },
      },
    });

    expect(url).toContain("g_xy_center");
    expect(url).toContain("x_0.65");
    expect(url).toContain("y_0.35");
  });
});
