import { describe, it, expect } from "vitest"
import { resolveActiveMediaCollection, getMediaSourceInfo, isExternalMedia } from "../media-utils"

describe("resolveActiveMediaCollection", () => {
  const schemas = {
    collections: [
      { slug: "media", upload: true },
      { slug: "avatars", upload: { imageSizes: [] } },
      { slug: "posts", upload: false },
      { slug: "users" },
    ],
  }

  it("returns collectionSlug when target collection is upload-enabled", () => {
    expect(resolveActiveMediaCollection(schemas, "avatars")).toBe("avatars")
    expect(resolveActiveMediaCollection(schemas, "media")).toBe("media")
  })

  it("safely falls back to 'media' when target collection is not upload-enabled or missing", () => {
    expect(resolveActiveMediaCollection(schemas, "posts")).toBe("media")
    expect(resolveActiveMediaCollection(schemas, "users")).toBe("media")
    expect(resolveActiveMediaCollection(schemas, "nonexistent")).toBe("media")
    expect(resolveActiveMediaCollection(null, "posts")).toBe("media")
  })
})

describe("getMediaSourceInfo & isExternalMedia", () => {
  it("correctly identifies YouTube embed media", () => {
    const item = { mimeType: "video/youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }
    const info = getMediaSourceInfo(item)
    expect(info.source).toBe("external")
    expect(info.type).toBe("youtube")
    expect(isExternalMedia(item)).toBe(true)
  })

  it("correctly identifies Vimeo embed media", () => {
    const item = { mimeType: "video/vimeo", url: "https://vimeo.com/123456" }
    const info = getMediaSourceInfo(item)
    expect(info.source).toBe("external")
    expect(info.type).toBe("vimeo")
    expect(isExternalMedia(item)).toBe(true)
  })

  it("correctly identifies External Image CDN reference", () => {
    const item = { mimeType: "image/external", url: "https://example.com/image.jpg" }
    const info = getMediaSourceInfo(item)
    expect(info.source).toBe("external")
    expect(info.type).toBe("external-cdn")
    expect(isExternalMedia(item)).toBe(true)
  })

  it("correctly identifies External Video CDN reference via video/external or remote MP4 with 0 filesize", () => {
    const item1 = { mimeType: "video/external", url: "https://example.com/video.mp4" }
    const info1 = getMediaSourceInfo(item1)
    expect(info1.source).toBe("external")
    expect(info1.type).toBe("external-cdn")
    expect(isExternalMedia(item1)).toBe(true)

    const item2 = { mimeType: "video/mp4", url: "https://cdn.example.com/stream.mp4", filesize: 0 }
    const info2 = getMediaSourceInfo(item2)
    expect(info2.source).toBe("external")
    expect(info2.type).toBe("external-cdn")
    expect(isExternalMedia(item2)).toBe(true)
  })

  it("correctly identifies Internal Uploaded Storage media", () => {
    const item = { mimeType: "image/jpeg", url: "/api/collections/media/file/photo.jpg", filesize: 204800 }
    const info = getMediaSourceInfo(item)
    expect(info.source).toBe("internal")
    expect(info.type).toBe("storage")
    expect(isExternalMedia(item)).toBe(false)
  })
})
