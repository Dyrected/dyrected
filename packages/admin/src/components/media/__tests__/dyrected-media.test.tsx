import { render as rtlRender, screen, cleanup } from "@testing-library/react"
import { describe, it, expect, afterEach } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { DyrectedMedia, isMediaValue, resolveMediaKind } from "../dyrected-media"

function render(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return rtlRender(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe("DyrectedMedia & Media Resolution Engine", () => {
  afterEach(() => {
    cleanup()
  })

  describe("isMediaValue", () => {
    it("recognizes upload and image field definitions", () => {
      expect(isMediaValue("test.png", { type: "upload" })).toBe(true)
      expect(isMediaValue("test.jpg", { type: "image" })).toBe(true)
      expect(isMediaValue("test.mp4", { type: "media" })).toBe(true)
    })

    it("recognizes relationship fields pointing to upload collections", () => {
      const schemas = { collections: [{ slug: "media", upload: true }] }
      expect(isMediaValue("doc-id", { type: "relationship", relationTo: "media" }, schemas)).toBe(true)
    })

    it("recognizes objects with mimeType or url or filename", () => {
      expect(isMediaValue({ url: "/uploads/photo.jpg" })).toBe(true)
      expect(isMediaValue({ mimeType: "image/png" })).toBe(true)
      expect(isMediaValue({ filename: "document.pdf" })).toBe(true)
    })

    it("recognizes media filename strings with known extensions", () => {
      expect(isMediaValue("avatar.png")).toBe(true)
      expect(isMediaValue("clip.mp4")).toBe(true)
      expect(isMediaValue("song.mp3")).toBe(true)
      expect(isMediaValue("sheet.csv")).toBe(true)
      expect(isMediaValue("plain-text-value")).toBe(false)
    })
  })

  describe("resolveMediaKind", () => {
    it("resolves avatar from field definition or variant", () => {
      expect(resolveMediaKind({ url: "/avatar.png" }, { name: "avatar" })).toBe("avatar")
      expect(resolveMediaKind({ url: "/photo.jpg" }, { name: "user_avatar" })).toBe("avatar")
      expect(resolveMediaKind("photo.jpg", {}, "avatar")).toBe("avatar")
    })

    it("resolves video from mimeType, extension, or embed URLs", () => {
      expect(resolveMediaKind({ mimeType: "video/mp4", url: "/video.mp4" })).toBe("video")
      expect(resolveMediaKind("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("video")
      expect(resolveMediaKind("clip.webm")).toBe("video")
    })

    it("resolves audio from mimeType or extension", () => {
      expect(resolveMediaKind({ mimeType: "audio/mpeg", url: "/song.mp3" })).toBe("audio")
      expect(resolveMediaKind("track.wav")).toBe("audio")
    })

    it("resolves image from mimeType or extension", () => {
      expect(resolveMediaKind({ mimeType: "image/jpeg", url: "/photo.jpg" })).toBe("image")
      expect(resolveMediaKind("banner.webp")).toBe("image")
    })

    it("falls back to file for documents and binary assets", () => {
      expect(resolveMediaKind({ mimeType: "application/pdf", filename: "annual-report.pdf" })).toBe("file")
      expect(resolveMediaKind("archive.zip")).toBe("file")
    })
  })

  describe("DyrectedMedia component rendering", () => {
    it("renders circular avatar with image for avatar media", () => {
      const { container } = render(
        <DyrectedMedia
          media={{ url: "https://example.com/avatar.jpg", filename: "avatar.jpg" }}
          fieldDef={{ name: "avatar" }}
          baseUrl="https://example.com"
          unstyled={false}
        />
      )
      const img = container.querySelector("img")
      expect(img).toBeTruthy()
      expect(img?.getAttribute("src")).toBe("https://example.com/avatar.jpg")
      expect(container.querySelector(".dy-rounded-full")).toBeTruthy()
    })

    it("renders image preview card for images with link to full view", () => {
      render(
        <DyrectedMedia
          media={{ url: "https://example.com/cover.png", filename: "cover.png", mimeType: "image/png" }}
          baseUrl="https://example.com"
          unstyled={false}
        />
      )
      expect(screen.getByText("cover.png")).toBeTruthy()
      expect(screen.getByText("Open image")).toBeTruthy()
      const img = screen.getByAltText("cover.png")
      expect(img.getAttribute("src")).toBe("https://example.com/cover.png")
    })

    it("renders responsive iframe for YouTube videos", () => {
      const { container } = render(
        <DyrectedMedia
          media="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        />
      )
      const iframe = container.querySelector("iframe")
      expect(iframe).toBeTruthy()
      expect(iframe?.getAttribute("src")).toContain("youtube.com/embed/dQw4w9WgXcQ")
    })

    it("renders video element for HTML5 video files", () => {
      const { container } = render(
        <DyrectedMedia
          media={{ url: "https://example.com/video.mp4", filename: "demo.mp4", mimeType: "video/mp4" }}
        />
      )
      const video = container.querySelector("video")
      expect(video).toBeTruthy()
      expect(video?.getAttribute("src")).toBe("https://example.com/video.mp4")
      expect(screen.getByText("demo.mp4")).toBeTruthy()
    })

    it("renders audio element for audio files", () => {
      const { container } = render(
        <DyrectedMedia
          media={{ url: "https://example.com/podcast.mp3", filename: "episode1.mp3", mimeType: "audio/mpeg" }}
        />
      )
      const audio = container.querySelector("audio")
      expect(audio).toBeTruthy()
      expect(audio?.getAttribute("src")).toBe("https://example.com/podcast.mp3")
      expect(screen.getByText("episode1.mp3")).toBeTruthy()
    })

    it("renders download file button for PDFs and documents", () => {
      render(
        <DyrectedMedia
          media={{ url: "https://example.com/manual.pdf", filename: "UserManual.pdf", mimeType: "application/pdf" }}
        />
      )
      expect(screen.getByText("UserManual.pdf")).toBeTruthy()
      const link = screen.getByRole("link")
      expect(link.getAttribute("href")).toBe("https://example.com/manual.pdf")
    })
  })
})
