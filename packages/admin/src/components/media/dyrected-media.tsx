/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useContext } from "react"
import { useQuery } from "@tanstack/react-query"
import { ExternalLink, FileText, Download } from "lucide-react"
import { cn, getMediaUrl } from "../../lib/utils"
import { getMediaPreviewUrl, getVideoEmbedUrl } from "../../lib/external-media"
import { DyrectedContext } from "../../providers/dyrected-context"

export type MediaKind = "avatar" | "image" | "video" | "audio" | "file"

export interface DyrectedMediaProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  media: any
  baseUrl?: string
  alt?: string
  variant?: "auto" | "avatar" | "image" | "video" | "audio" | "card" | "thumbnail" | "file"
  imgClassName?: string
  fallback?: React.ReactNode
  showDetails?: boolean
  width?: number | string
  height?: number | string
  fieldDef?: any
  unstyled?: boolean
  imageComponent?: React.ElementType
  loading?: "lazy" | "eager"
  aspectRatio?: string
  objectFit?: "cover" | "contain" | "fill" | "scale-down"
  align?: "left" | "center" | "right"
}

/**
 * Checks whether a given value or field definition represents a media / upload asset.
 */
export function isMediaValue(val: any, fieldDef?: any, schemas?: any): boolean {
  if (!val) return false
  if (fieldDef?.type === "upload" || fieldDef?.type === "image" || fieldDef?.type === "media") return true

  // Check if relationTo points to an upload collection
  if (fieldDef?.type === "relationship" && fieldDef?.relationTo) {
    const targetCol = schemas?.collections?.find((c: any) => c.slug === fieldDef.relationTo)
    if (targetCol?.upload || targetCol?.slug === "media" || targetCol?.slug === "uploads" || targetCol?.slug === "images") {
      return true
    }
  }

  // Check heuristic field names
  const name = String(fieldDef?.name || "").toLowerCase()
  if (
    name.includes("avatar") ||
    name.includes("image") ||
    name.includes("photo") ||
    name.includes("thumbnail") ||
    name.includes("logo") ||
    name.includes("banner") ||
    name.includes("media") ||
    name.includes("attachment") ||
    name.includes("file") ||
    name.includes("upload")
  ) {
    if (typeof val === "object" || (typeof val === "string" && val.length > 0)) {
      return true
    }
  }

  // Check value properties
  if (typeof val === "object") {
    if (
      val.mimeType ||
      val.contentType ||
      val.format ||
      (typeof val.url === "string" && val.url.length > 0) ||
      (typeof val.filename === "string" && val.filename.length > 0) ||
      val.src ||
      val.width ||
      val.height ||
      val.filesize ||
      val.size
    ) {
      return true
    }
  }

  // Check file extension on string
  if (typeof val === "string") {
    const clean = val.split("?")[0].toLowerCase()
    return /\.(jpg|jpeg|png|gif|webp|avif|svg|mp4|webm|mov|ogg|mp3|wav|pdf|docx?|xlsx?|csv|zip|tar|gz)$/.test(
      clean
    )
  }

  return false
}

/**
 * Classifies media into its visual representation kind.
 */
export function resolveMediaKind(
  media: any,
  fieldDef?: any,
  forcedVariant?: "auto" | "avatar" | "image" | "video" | "audio" | "card" | "thumbnail" | "file"
): MediaKind {
  if (forcedVariant && forcedVariant !== "auto" && forcedVariant !== "card" && forcedVariant !== "thumbnail") {
    return forcedVariant
  }

  const rawUrl = typeof media === "string" ? media : media?.url || media?.src || media?.path || media?.filename || ""
  const filename = typeof media === "object" ? media?.filename || media?.name || media?.title || media?.alt || "" : rawUrl
  const mimeType = typeof media === "object" ? String(media?.mimeType || media?.contentType || "").toLowerCase() : ""
  const fieldName = String(fieldDef?.name || "").toLowerCase()

  // 1. Avatar heuristics
  if (
    fieldDef?.display === "avatar" ||
    fieldName.includes("avatar") ||
    (fieldName === "photo" && !rawUrl.includes("banner") && !rawUrl.includes("cover"))
  ) {
    return "avatar"
  }

  // 2. Video heuristics (mimeType video/*, youtube/vimeo regex, or .mp4/.webm/.mov)
  if (
    mimeType.startsWith("video/") ||
    mimeType === "video/youtube" ||
    mimeType === "video/vimeo" ||
    fieldDef?.type === "video" ||
    getVideoEmbedUrl(media) !== null ||
    /\.(mp4|webm|mov|ogv|m4v)(\?.*)?$/i.test(rawUrl) ||
    /\.(mp4|webm|mov|ogv|m4v)(\?.*)?$/i.test(filename)
  ) {
    return "video"
  }

  // 3. Audio heuristics (mimeType audio/* or .mp3/.wav/.ogg)
  if (
    mimeType.startsWith("audio/") ||
    fieldDef?.type === "audio" ||
    /\.(mp3|wav|ogg|aac|m4a|flac)(\?.*)?$/i.test(rawUrl) ||
    /\.(mp3|wav|ogg|aac|m4a|flac)(\?.*)?$/i.test(filename)
  ) {
    return "audio"
  }

  // 4. Image heuristics (image/* mimeType, image extensions, or image field name)
  if (
    mimeType.startsWith("image/") ||
    mimeType === "image" ||
    mimeType === "image/external" ||
    fieldDef?.type === "image" ||
    fieldName.includes("image") ||
    fieldName.includes("photo") ||
    fieldName.includes("thumbnail") ||
    fieldName.includes("logo") ||
    fieldName.includes("banner") ||
    fieldName.includes("cover") ||
    fieldName.includes("picture") ||
    /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp|ico|heic|tiff)(\?.*)?$/i.test(rawUrl) ||
    /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp|ico|heic|tiff)(\?.*)?$/i.test(filename)
  ) {
    return "image"
  }

  // 5. Default fallback to downloadable file
  return "file"
}

/**
 * Universal media component for Dyrected.
 * 
 * DESIGN GOALS & ALIGNMENT:
 * - This component handles resolving and displaying various media types (images, avatars, 
 *   HTML5 / YouTube / Vimeo videos, audio, and downloadable documents) from Dyrected collections.
 * - Public Website Usage: This component is explicitly designed to be exported and used 
 *   in consumers' public-facing websites (e.g. Next.js, Nuxt, React apps) as the primary 
 *   way to display Dyrected media.
 * - Styling Philosophy: Because it is used in external consumer projects, the styling must be 
 *   completely unopinionated. Hardcoded opinionated styles (like fixed borders, aggressive 
 *   paddings, or forced background colors) must be strictly avoided or made opt-in so they 
 *   never break or conflict with the design system of the public website importing it.
 */
export const DyrectedMedia = React.forwardRef<HTMLDivElement, DyrectedMediaProps>(({
  media,
  baseUrl = "",
  alt,
  variant = "auto",
  className,
  imgClassName,
  fallback,
  showDetails = true,
  fieldDef,
  unstyled = true,
  imageComponent: ImageComponent,
  loading = "lazy",
  aspectRatio,
  objectFit,
  align,
  width,
  height,
  ...props
}, ref) => {
  const dyContext = useContext(DyrectedContext)
  const effectiveBaseUrl = baseUrl || dyContext?.client?.getBaseUrl?.() || ""

  const ImgOrCustom = ImageComponent || "img"
  const mediaStyle: React.CSSProperties = {
    ...(aspectRatio ? { aspectRatio } : {}),
    ...(objectFit ? { objectFit } : {}),
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  }

  const isBareId =
    typeof media === "string" &&
    !media.includes("/") &&
    !/\.[a-z0-9]+($|\?)/i.test(media) &&
    media.trim().length > 0 &&
    !media.startsWith("http") &&
    !media.startsWith("blob:") &&
    !media.startsWith("data:")

  let targetColSlug = fieldDef?.relationTo;
  if (!targetColSlug && dyContext?.schemas?.collections) {
    const uploadCol = dyContext.schemas.collections.find((c: any) => c.upload || c.slug === "media" || c.slug === "uploads" || c.slug === "images");
    if (uploadCol) {
      targetColSlug = uploadCol.slug;
    }
  }
  if (!targetColSlug) targetColSlug = "media";

  const { data: fetchedMedia } = useQuery({
    queryKey: ["media-item", targetColSlug, media],
    queryFn: async () => {
      if (!isBareId || !dyContext?.client) return null;
      try {
        const item = await dyContext.client.collection(targetColSlug).findOne(media);
        return item;
      } catch {
        return null;
      }
    },
    enabled: Boolean(isBareId && dyContext?.client),
    staleTime: 60_000,
  });

  const currentMedia = isBareId && fetchedMedia ? fetchedMedia : media
  if (!currentMedia) return fallback ? <>{fallback}</> : null

  const rawUrl = typeof currentMedia === "string" ? currentMedia : currentMedia?.url || currentMedia?.src || currentMedia?.path || currentMedia?.filename || ""
  const filename = typeof currentMedia === "object" ? currentMedia?.filename || currentMedia?.name || currentMedia?.title || currentMedia?.alt || "" : (typeof currentMedia === "string" ? currentMedia.split("/").pop()?.split("?")[0] || "" : "")
  const mimeType = typeof currentMedia === "object" ? currentMedia?.mimeType || currentMedia?.contentType || currentMedia?.type || "" : ""

  const previewUrl = getMediaPreviewUrl(currentMedia, effectiveBaseUrl) || getMediaUrl(currentMedia, effectiveBaseUrl) || (rawUrl.startsWith("http") || rawUrl.startsWith("/") ? rawUrl : (effectiveBaseUrl && rawUrl ? `${effectiveBaseUrl.replace(/\/$/, "")}/api/media/${rawUrl}` : rawUrl))
  const embedUrl = getVideoEmbedUrl(currentMedia)

  const kind = resolveMediaKind(currentMedia, fieldDef, variant)
  const displayAlt = alt || filename || "Media asset"

  // 1. Avatar display
  if (kind === "avatar") {
    return (
      <div
        ref={ref}
        className={cn(
          unstyled
            ? "dy-relative"
            : "dy-relative dy-h-16 dy-w-16 dy-rounded-full dy-overflow-hidden dy-border-2 dy-border-border/80 dy-bg-muted/40 dy-shadow-sm dy-shrink-0 dy-group/avatar",
          align === "center" ? "dy-mx-auto" : align === "right" ? "dy-ml-auto" : "",
          className
        )}
        {...props}
      >
        {previewUrl ? (
          <ImgOrCustom
            src={previewUrl}
            alt={displayAlt}
            loading={loading}
            style={mediaStyle}
            className={cn(
              unstyled
                ? "dy-w-full dy-h-full dy-object-cover"
                : "dy-h-full dy-w-full dy-object-cover dy-transition-transform group-hover/avatar:dy-scale-105",
              imgClassName
            )}
          />
        ) : (
          <div className={cn(unstyled ? "" : "dy-flex dy-h-full dy-w-full dy-items-center dy-justify-center dy-text-muted-foreground dy-text-sm dy-font-semibold")}>
            {(filename || alt || "A").charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    )
  }

  // 2. Video display (Embed or HTML5 Video)
  if (kind === "video") {
    if (embedUrl) {
      return (
        <div ref={ref} className={cn(unstyled ? "" : "dy-space-y-2 dy-w-full dy-max-w-md", align === "center" ? "dy-mx-auto dy-flex dy-flex-col dy-items-center" : align === "right" ? "dy-ml-auto dy-flex dy-flex-col dy-items-end" : "", className)} {...props}>
          <div className={cn(unstyled ? "dy-relative dy-w-full dy-pt-[56.25%]" : "dy-relative dy-w-full dy-pt-[56.25%] dy-rounded-xl dy-overflow-hidden dy-border dy-border-border/60 dy-bg-black")}>
            <iframe
              src={embedUrl}
              title={filename || "Video player"}
              className="dy-absolute dy-top-0 dy-left-0 dy-h-full dy-w-full dy-border-0"
              style={mediaStyle}
              loading={loading}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {showDetails && filename && <p className={cn(unstyled ? "" : "dy-text-xs dy-text-muted-foreground dy-truncate")}>{filename}</p>}
        </div>
      )
    }

    return (
      <div ref={ref} className={cn(unstyled ? "" : "dy-space-y-2 dy-w-full dy-max-w-md", align === "center" ? "dy-mx-auto dy-flex dy-flex-col dy-items-center" : align === "right" ? "dy-ml-auto dy-flex dy-flex-col dy-items-end" : "", className)} {...props}>
        <video
          src={previewUrl}
          controls
          style={mediaStyle}
          className={cn(unstyled ? "dy-max-w-full dy-h-auto" : "dy-w-full dy-rounded-xl dy-border dy-border-border/60 dy-bg-black/90", imgClassName)}
        />
        {showDetails && filename && <p className={cn(unstyled ? "" : "dy-text-xs dy-text-muted-foreground dy-truncate")}>{filename}</p>}
      </div>
    )
  }

  // 3. Audio display
  if (kind === "audio") {
    return (
      <div ref={ref} className={cn(unstyled ? "" : "dy-space-y-1.5 dy-w-full dy-max-w-md", align === "center" ? "dy-mx-auto dy-flex dy-flex-col dy-items-center" : align === "right" ? "dy-ml-auto dy-flex dy-flex-col dy-items-end" : "", className)} {...props}>
        <audio src={previewUrl} controls className={cn(unstyled ? "" : "dy-w-full")} style={{ width }} />
        {showDetails && filename && <p className={cn(unstyled ? "" : "dy-text-xs dy-text-muted-foreground dy-truncate")}>{filename}</p>}
      </div>
    )
  }

  // 4. Image display
  if (kind === "image") {
    if (variant === "thumbnail") {
      return (
        <div
          ref={ref}
          className={cn(
            unstyled
              ? ""
              : "dy-relative dy-h-12 dy-w-12 dy-rounded-lg dy-overflow-hidden dy-border dy-border-border/60 dy-bg-muted/40 dy-shrink-0",
            align === "center" ? "dy-mx-auto" : align === "right" ? "dy-ml-auto" : "",
            className
          )}
          {...props}
        >
          {previewUrl ? (
            <ImgOrCustom src={previewUrl} alt={displayAlt} loading={loading} style={mediaStyle} className={cn(unstyled ? "dy-max-w-full dy-h-auto" : "dy-h-full dy-w-full dy-object-cover", imgClassName)} />
          ) : (
            <div className={cn(unstyled ? "" : "dy-flex dy-h-full dy-w-full dy-items-center dy-justify-center dy-text-muted-foreground")}>
              <FileText className={cn(unstyled ? "" : "dy-h-4 dy-w-4")} />
            </div>
          )}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          unstyled
            ? "dy-flex dy-flex-col dy-gap-2"
            : "dy-flex dy-items-start dy-gap-3.5 dy-p-3 dy-bg-muted/20 dy-border dy-border-border/60 dy-rounded-xl dy-max-w-md dy-transition-all hover:dy-border-border hover:dy-bg-muted/30",
          align === "center" ? "dy-mx-auto" : align === "right" ? "dy-ml-auto" : "",
          className
        )}
        {...props}
      >
        <a
          href={previewUrl || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            unstyled
              ? ""
              : "dy-relative dy-h-20 dy-w-20 dy-rounded-lg dy-overflow-hidden dy-border dy-border-border/60 dy-bg-muted/40 dy-shrink-0 dy-group/media"
          )}
          title="Click to view full image"
        >
          {previewUrl ? (
            <ImgOrCustom
              src={previewUrl}
              alt={displayAlt}
              loading={loading}
              style={mediaStyle}
              className={cn(
                unstyled
                  ? "dy-max-w-full dy-h-auto"
                  : "dy-h-full dy-w-full dy-object-cover dy-transition-transform group-hover/media:dy-scale-105",
                imgClassName
              )}
            />
          ) : (
            <div className={cn(unstyled ? "" : "dy-flex dy-h-full dy-w-full dy-items-center dy-justify-center dy-text-muted-foreground")}>
              <FileText className={cn(unstyled ? "" : "dy-h-6 dy-w-6")} />
            </div>
          )}
        </a>
        {showDetails && (
          <div className={cn(unstyled ? "" : "dy-flex-1 dy-min-w-0 dy-space-y-1")}>
            <p className={cn(unstyled ? "" : "dy-text-xs dy-font-semibold dy-text-foreground dy-truncate")}>{filename || "Image asset"}</p>
            {mimeType && <p className={cn(unstyled ? "" : "dy-text-[11px] dy-text-muted-foreground")}>{mimeType}</p>}
            {previewUrl && !unstyled && (
              <div className="dy-flex dy-items-center dy-gap-2 dy-pt-1">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dy-inline-flex dy-items-center dy-gap-1 dy-text-xs dy-font-medium dy-text-primary hover:dy-underline"
                >
                  <span>Open image</span>
                  <ExternalLink className="dy-h-3 dy-w-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // 5. Generic downloadable file
  if (unstyled) {
    return (
      <div ref={ref} className={cn("dy-inline-flex", align === "center" ? "dy-mx-auto" : align === "right" ? "dy-ml-auto" : "", className)} {...props}>
        <a href={previewUrl || "#"} target="_blank" rel="noopener noreferrer">
          {filename || "Download File"}
        </a>
      </div>
    )
  }

  return (
    <div ref={ref} className={cn("dy-inline-flex", align === "center" ? "dy-mx-auto" : align === "right" ? "dy-ml-auto" : "", className)} {...props}>
      <a
        href={previewUrl || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="dy-inline-flex dy-items-center dy-gap-2.5 dy-px-3.5 dy-py-2.5 dy-rounded-xl dy-bg-muted/30 hover:dy-bg-muted/60 dy-border dy-border-border/60 dy-text-xs dy-font-medium dy-text-foreground dy-transition-colors"
      >
        <FileText className="dy-h-4 dy-w-4 dy-text-primary" />
        <span className="dy-truncate dy-max-w-[220px]">{filename || "Download File"}</span>
        <Download className="dy-h-3.5 dy-w-3.5 dy-text-muted-foreground" />
      </a>
    </div>
  )
})
