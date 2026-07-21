import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createMediaLibraryController,
  createMediaUploadController,
  createMediaURLController,
} from "../media"

const mockUpload = vi.fn()
const mockCreate = vi.fn()
const mockListMedia = vi.fn()

const client = {
  collection: vi.fn(() => ({
    upload: mockUpload,
    create: mockCreate,
  })),
  listMedia: mockListMedia,
} as any

describe("media controllers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn())
  })

  it("createMediaUploadController uploads files and falls back to the media collection", async () => {
    mockUpload.mockResolvedValueOnce({ id: "asset-1", filename: "photo.jpg", mimeType: "image/jpeg" })
    const onAllCompleted = vi.fn()
    const controller = createMediaUploadController({
      client,
      schemas: { collections: [{ slug: "posts" }, { slug: "media", upload: true }] },
      collection: "posts",
      onAllCompleted,
    })

    const file = new File(["demo"], "photo.jpg", { type: "image/jpeg" })
    const result = await controller.uploadFiles([file])

    expect(client.collection).toHaveBeenCalledWith("media")
    expect(mockUpload).toHaveBeenCalled()
    expect(result).toEqual([{ id: "asset-1", filename: "photo.jpg", mimeType: "image/jpeg" }])
    expect(onAllCompleted).toHaveBeenCalledWith(result)
    expect(controller.getState().queue[0]?.status).toBe("completed")
  })

  it("createMediaURLController imports remote images into storage when fetch succeeds", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(["image"], { type: "image/jpeg" }),
    } as Response)
    mockUpload.mockResolvedValueOnce({ id: "uploaded-1", mimeType: "image/jpeg" })

    const controller = createMediaURLController({
      client,
      schemas: { collections: [{ slug: "media", upload: true }] },
      collection: "media",
    })

    const result = await controller.importURL("https://example.com/photo.jpg")

    expect(globalThis.fetch).toHaveBeenCalledWith("https://example.com/photo.jpg")
    expect(mockUpload).toHaveBeenCalled()
    expect(result).toEqual({ id: "uploaded-1", mimeType: "image/jpeg" })
  })

  it("createMediaURLController classifies direct videos as direct-video", () => {
    const controller = createMediaURLController({
      client,
      schemas: { collections: [{ slug: "media", upload: true }] },
      collection: "media",
    })

    expect(controller.classifyURL("https://cdn.example.com/video.mp4").kind).toBe("direct-video")
  })

  it("createMediaLibraryController loads, searches, paginates, and tracks selection", async () => {
    mockListMedia
      .mockResolvedValueOnce({
        docs: [{ id: "asset-1", filename: "first.jpg", mimeType: "image/jpeg" }],
        hasNextPage: true,
      })
      .mockResolvedValueOnce({
        docs: [{ id: "asset-2", filename: "second.jpg", mimeType: "image/jpeg" }],
        hasNextPage: false,
      })
      .mockResolvedValueOnce({
        docs: [{ id: "asset-3", filename: "filtered.jpg", mimeType: "image/jpeg" }],
        hasNextPage: false,
      })

    const controller = createMediaLibraryController({
      client,
      schemas: { collections: [{ slug: "posts" }, { slug: "media", upload: true }] },
      collection: "posts",
      initialSelectedIds: ["asset-1"],
    })

    await controller.load()
    controller.toggle("asset-1")
    controller.select("asset-2")
    await controller.loadNextPage()
    await controller.search("filtered")

    expect(mockListMedia).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ page: 1, limit: 12 }),
      "media"
    )
    expect(mockListMedia).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ page: 2, limit: 12 }),
      "media"
    )
    expect(mockListMedia).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        page: 1,
        where: { filename: { contains: "filtered" } },
      }),
      "media"
    )

    expect(controller.getState().items).toEqual([
      { id: "asset-3", filename: "filtered.jpg", mimeType: "image/jpeg" },
    ])
    expect(controller.getState().selectedIds).toEqual(["asset-2"])
  })
})
