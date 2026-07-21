export interface MediaSourceInfo {
  source: "external" | "internal"
  type: "youtube" | "vimeo" | "external-cdn" | "storage"
  label: string
}

/**
 * Safely resolves the collection slug to use for media uploads.
 * If the target collection is upload-enabled, returns collectionSlug.
 * Otherwise, safely falls back to "media".
 */
export function resolveActiveMediaCollection(schemas: any, collectionSlug: string): string {
  if (!collectionSlug) return "media"
  const targetColl = schemas?.collections?.find((c: { slug: string; upload?: unknown }) => c.slug === collectionSlug)
  if (targetColl?.upload) return collectionSlug
  return "media"
}

/**
 * Determines whether a media item is an External asset (embed/remote link) or an
 * Internal asset (uploaded file in storage) based strictly on its persisted metadata.
 */
export function getMediaSourceInfo(item: unknown): MediaSourceInfo {
  if (!item || typeof item !== "object") {
    return { source: "internal", type: "storage", label: "Uploaded Asset" }
  }

  const obj = item as Record<string, unknown>
  const mimeType = String(obj.mimeType || "")
  const filesize = typeof obj.filesize === "number" ? obj.filesize : (typeof obj.size === "number" ? obj.size : undefined)
  const urlStr = String(obj.url || "")
  const isRemoteUrl = urlStr.startsWith("http://") || urlStr.startsWith("https://")

  if (mimeType === "video/youtube") {
    return { source: "external", type: "youtube", label: "YouTube Embed" }
  }
  if (mimeType === "video/vimeo") {
    return { source: "external", type: "vimeo", label: "Vimeo Embed" }
  }
  if (mimeType === "image/external") {
    return { source: "external", type: "external-cdn", label: "External Image" }
  }
  if (
    mimeType === "video/external" ||
    mimeType.startsWith("external/") ||
    (mimeType.startsWith("video/") && filesize === 0 && isRemoteUrl)
  ) {
    return { source: "external", type: "external-cdn", label: "External Video" }
  }
  if (mimeType === "application/external" || (filesize === 0 && isRemoteUrl)) {
    return { source: "external", type: "external-cdn", label: "External Asset" }
  }

  return { source: "internal", type: "storage", label: "Uploaded Asset" }
}

/** Returns true if the given item is an external asset. */
export function isExternalMedia(item: unknown): boolean {
  return getMediaSourceInfo(item).source === "external"
}
