import { getMediaUrl } from "./utils";

/**
 * Detects the kind of external media a URL points to and builds the document
 * payload used to store it as a media record (no file bytes — just a reference).
 *
 * Supports YouTube and Vimeo video links, direct image URLs, direct video URLs, and generic files.
 * The resulting `mimeType` (`video/youtube`, `video/vimeo`, `image/external`, `video/external`, or a
 * generic type) is what the media grid/preview components key off to render the asset correctly.
 */
export interface ExternalMediaPayload {
  filename: string;
  url: string;
  mimeType: string;
  filesize: number;
  id: string;
}

const YOUTUBE_RE = /(?:youtu\.be\/|youtube\.com\/(?:v\/|u\/\w\/|embed\/|watch\?v=))([^#&?]*)/;
const VIMEO_RE = /vimeo\.com\/(?:video\/)?([0-9]+)/;
const IMAGE_RE = /\.(jpeg|jpg|gif|png|webp|svg|avif)(?:\?.*)?$/i;
const VIDEO_RE = /\.(mp4|webm|ogg|mov|m4v|mkv)(?:\?.*)?$/i;

/** Extract the trailing filename from a URL, stripping any query string. */
export function filenameFromUrl(url: string, fallback: string): string {
  return url.split("/").pop()?.split("?")[0] || fallback;
}

/** Check if a URL points to an embeddable video streaming site (YouTube or Vimeo). */
export function isEmbeddableVideoUrl(url: string): boolean {
  const trimmed = url.trim();
  return YOUTUBE_RE.test(trimmed) || VIMEO_RE.test(trimmed);
}

/** Check if a URL points directly to a raster/vector image file. */
export function isDirectImageUrl(url: string): boolean {
  return IMAGE_RE.test(url.trim());
}

/**
 * Build a media document payload from an external URL.
 * Returns `null` when the input is empty/whitespace.
 */
export function buildExternalMediaPayload(rawUrl: string): ExternalMediaPayload | null {
  const url = rawUrl.trim();
  if (!url) return null;

  const yt = url.match(YOUTUBE_RE);
  if (yt && yt[1]) {
    return { filename: `YouTube: ${yt[1]}`, url, mimeType: "video/youtube", filesize: 0, id: `yt_${yt[1]}` };
  }

  const vimeo = url.match(VIMEO_RE);
  if (vimeo && vimeo[1]) {
    return { filename: `Vimeo: ${vimeo[1]}`, url, mimeType: "video/vimeo", filesize: 0, id: `vm_${vimeo[1]}` };
  }

  if (IMAGE_RE.test(url)) {
    return {
      filename: filenameFromUrl(url, "External Image"),
      url,
      mimeType: "image/external",
      filesize: 0,
      id: `img_${Math.random().toString(36).substring(7)}`,
    };
  }

  if (VIDEO_RE.test(url)) {
    const ext = url.split(".").pop()?.split("?")[0] || "mp4";
    return {
      filename: filenameFromUrl(url, "External Video"),
      url,
      mimeType: `video/${ext === "mov" ? "quicktime" : ext}`,
      filesize: 0,
      id: `vid_${Math.random().toString(36).substring(7)}`,
    };
  }

  return {
    filename: filenameFromUrl(url, "External File"),
    url,
    mimeType: "application/external",
    filesize: 0,
    id: `ext_${Math.random().toString(36).substring(7)}`,
  };
}

/**
 * Resolves the thumbnail/preview image URL for any media item — external or uploaded.
 *
 * This is the single source of truth used by every media surface (grid, picker,
 * library dialog) so YouTube, Vimeo, external images, and uploaded files all render
 * consistently everywhere.
 * - `video/youtube` → the YouTube thumbnail for the video id
 * - `video/vimeo`   → the Vimeo logo placeholder
 * - `image/external`→ the external URL itself
 * - anything else   → resolved through {@link getMediaUrl}
 */
export function getMediaPreviewUrl(item: unknown, baseUrl: string): string {
  if (!item) return "";

  const obj = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : null;
  const mimeType = obj ? (obj.mimeType as string | undefined) : undefined;
  const url = obj ? (obj.url as string | undefined) : undefined;

  if (mimeType === "video/youtube") {
    const match = url?.match(YOUTUBE_RE);
    const videoId = match && match[1];
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : "";
  }
  if (mimeType === "video/vimeo") {
    return "https://vimeo.com/assets/images/logo_vimeo_blue.png";
  }
  if (mimeType === "image/external") {
    return url || "";
  }

  return getMediaUrl(item as string | Record<string, unknown>, baseUrl);
}

/**
 * Returns the player embed URL for an external video item (YouTube/Vimeo), or
 * `null` for anything that isn't an embeddable video. Used to render an inline
 * iframe player instead of a static thumbnail.
 */
export function getVideoEmbedUrl(item: unknown): string | null {
  const obj = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : null;
  if (!obj) return null;

  const mimeType = obj.mimeType as string | undefined;
  const url = (obj.url as string | undefined) || "";

  if (mimeType === "video/youtube") {
    const m = url.match(YOUTUBE_RE);
    return m && m[1] ? `https://www.youtube.com/embed/${m[1]}` : null;
  }
  if (mimeType === "video/vimeo") {
    const m = url.match(VIMEO_RE);
    return m && m[1] ? `https://player.vimeo.com/video/${m[1]}` : null;
  }
  return null;
}
