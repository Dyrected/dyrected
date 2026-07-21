import { describe, it, expect } from "vitest"
import {
  buildExternalMediaPayload,
  isEmbeddableVideoUrl,
  isDirectImageUrl,
  getMediaPreviewUrl,
  getVideoEmbedUrl,
} from "../external-media"

describe("external-media helpers", () => {
  describe("isEmbeddableVideoUrl", () => {
    it("returns true for YouTube and Vimeo URLs", () => {
      expect(isEmbeddableVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true)
      expect(isEmbeddableVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true)
      expect(isEmbeddableVideoUrl("https://vimeo.com/76979871")).toBe(true)
    })

    it("returns false for direct video files or direct images", () => {
      expect(isEmbeddableVideoUrl("https://example.com/video.mp4")).toBe(false)
      expect(isEmbeddableVideoUrl("https://example.com/photo.jpg")).toBe(false)
    })
  })

  describe("isDirectImageUrl", () => {
    it("returns true for direct image URLs", () => {
      expect(isDirectImageUrl("https://example.com/photo.jpg")).toBe(true)
      expect(isDirectImageUrl("https://example.com/graphic.png?v=1")).toBe(true)
      expect(isDirectImageUrl("https://example.com/image.webp")).toBe(true)
    })

    it("returns false for non-image links", () => {
      expect(isDirectImageUrl("https://youtube.com/watch?v=123")).toBe(false)
      expect(isDirectImageUrl("https://example.com/doc.pdf")).toBe(false)
    })
  })

  describe("buildExternalMediaPayload", () => {
    it("builds YouTube payload with video/youtube mimeType", () => {
      const payload = buildExternalMediaPayload("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
      expect(payload).not.toBeNull()
      expect(payload?.mimeType).toBe("video/youtube")
      expect(payload?.id).toBe("yt_dQw4w9WgXcQ")
    })

    it("builds Vimeo payload with video/vimeo mimeType", () => {
      const payload = buildExternalMediaPayload("https://vimeo.com/76979871")
      expect(payload).not.toBeNull()
      expect(payload?.mimeType).toBe("video/vimeo")
      expect(payload?.id).toBe("vm_76979871")
    })

    it("builds image payload with image/external mimeType", () => {
      const payload = buildExternalMediaPayload("https://example.com/my-photo.jpg")
      expect(payload).not.toBeNull()
      expect(payload?.mimeType).toBe("image/external")
      expect(payload?.filename).toBe("my-photo.jpg")
    })

    it("builds direct video payload with video/mp4 mimeType", () => {
      const payload = buildExternalMediaPayload("https://example.com/sample.mp4")
      expect(payload).not.toBeNull()
      expect(payload?.mimeType).toBe("video/mp4")
      expect(payload?.filename).toBe("sample.mp4")
    })

    it("returns null for empty string", () => {
      expect(buildExternalMediaPayload("   ")).toBeNull()
    })
  })

  describe("getVideoEmbedUrl", () => {
    it("generates YouTube embed iframe URL", () => {
      const item = { mimeType: "video/youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }
      expect(getVideoEmbedUrl(item)).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ")
    })

    it("generates Vimeo embed iframe URL", () => {
      const item = { mimeType: "video/vimeo", url: "https://vimeo.com/76979871" }
      expect(getVideoEmbedUrl(item)).toBe("https://player.vimeo.com/video/76979871")
    })

    it("returns null for non-embeddable media", () => {
      const item = { mimeType: "image/jpeg", url: "/file.jpg" }
      expect(getVideoEmbedUrl(item)).toBeNull()
    })
  })
})
