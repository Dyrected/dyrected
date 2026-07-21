import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useAddMediaFromUrl } from "../use-add-media-from-url"

const mockCreate = vi.fn()
const mockUpload = vi.fn()

vi.mock("../../providers/dyrected-context", () => ({
  useDyrected: () => ({
    client: {
      collection: () => ({
        create: mockCreate,
        upload: mockUpload,
      }),
    },
    schemas: {
      collections: [
        { slug: "media", upload: true },
        { slug: "posts" },
      ],
    },
  }),
}))

describe("useAddMediaFromUrl hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn())
  })

  it("safely resolves target collection to 'media' for non-upload collection", () => {
    const onAdded = vi.fn()
    const { result } = renderHook(() =>
      useAddMediaFromUrl({ collection: "posts", onAdded })
    )
    expect(result.current.activeCollection).toBe("media")
  })

  it("handles YouTube embed links via .create() without downloading", async () => {
    mockCreate.mockResolvedValueOnce({ id: "yt_123", mimeType: "video/youtube" })
    const onAdded = vi.fn()

    const { result } = renderHook(() =>
      useAddMediaFromUrl({ collection: "media", onAdded })
    )

    act(() => {
      result.current.setUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    })

    await act(async () => {
      await result.current.submit()
    })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: "video/youtube",
        id: "yt_dQw4w9WgXcQ",
      })
    )
    expect(onAdded).toHaveBeenCalledWith({ id: "yt_123", mimeType: "video/youtube" })
  })

  it("handles direct MP4 video links as External CDN reference via .create()", async () => {
    mockCreate.mockResolvedValueOnce({ id: "vid_456", mimeType: "video/mp4" })
    const onAdded = vi.fn()

    const { result } = renderHook(() =>
      useAddMediaFromUrl({ collection: "media", onAdded })
    )

    act(() => {
      result.current.setUrl("https://example.com/big-video.mp4")
    })

    await act(async () => {
      await result.current.submit()
    })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: "video/mp4",
        url: "https://example.com/big-video.mp4",
      })
    )
    expect(onAdded).toHaveBeenCalledWith({ id: "vid_456", mimeType: "video/mp4" })
  })

  it("fetches direct images, compresses, and uploads via .upload() when CORS allows", async () => {
    const mockBlob = new Blob(["fake image data"], { type: "image/jpeg" })
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    } as Response)

    mockUpload.mockResolvedValueOnce({ id: "img_uploaded_789", mimeType: "image/jpeg" })
    const onAdded = vi.fn()

    const { result } = renderHook(() =>
      useAddMediaFromUrl({ collection: "media", onAdded })
    )

    act(() => {
      result.current.setUrl("https://example.com/photo.jpg")
    })

    await act(async () => {
      await result.current.submit()
    })

    expect(globalThis.fetch).toHaveBeenCalledWith("https://example.com/photo.jpg")
    expect(mockUpload).toHaveBeenCalled()
    expect(onAdded).toHaveBeenCalledWith({ id: "img_uploaded_789", mimeType: "image/jpeg" })
  })

  it("falls back gracefully to creating image/external reference when CORS fetch fails", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new TypeError("Failed to fetch (CORS)"))
    mockCreate.mockResolvedValueOnce({ id: "img_fallback_321", mimeType: "image/external" })
    const onAdded = vi.fn()

    const { result } = renderHook(() =>
      useAddMediaFromUrl({ collection: "media", onAdded })
    )

    act(() => {
      result.current.setUrl("https://blocked-cors-domain.com/photo.jpg")
    })

    await act(async () => {
      await result.current.submit()
    })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: "image/external",
        url: "https://blocked-cors-domain.com/photo.jpg",
      })
    )
    expect(onAdded).toHaveBeenCalledWith({ id: "img_fallback_321", mimeType: "image/external" })
  })
})
