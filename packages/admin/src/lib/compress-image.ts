/**
 * Compress a raster image file client-side using the Canvas API before upload.
 * - Skips SVGs, GIFs, and non-images (returned unchanged).
 * - Skips if the environment lacks DOM Canvas / URL API (SSR or Node.js test environment).
 * - Skips if the result would be larger than the original.
 * - maxDimension: longest edge cap in pixels (default 2048).
 * - quality: JPEG/WebP quality 0–1 (default 0.85).
 */
export async function compressImage(
  file: File,
  maxDimension = 2048,
  quality = 0.85
): Promise<File> {
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    file.type === "image/gif" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function" ||
    typeof Image === "undefined"
  ) {
    return file
  }

  return new Promise((resolve) => {
    try {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)

      img.onerror = () => {
        if (typeof URL.revokeObjectURL === "function") {
          URL.revokeObjectURL(objectUrl)
        }
        resolve(file)
      }

      img.onload = () => {
        if (typeof URL.revokeObjectURL === "function") {
          URL.revokeObjectURL(objectUrl)
        }

        let { width, height } = img
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // PNG -> keep as PNG (lossless). Everything else -> JPEG.
        const outputType = file.type === "image/png" ? "image/png" : "image/jpeg"

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // Never make the file bigger
              resolve(file)
              return
            }
            resolve(
              new File([blob], file.name, {
                type: outputType,
                lastModified: Date.now(),
              })
            )
          },
          outputType,
          quality
        )
      }

      img.src = objectUrl
    } catch {
      resolve(file)
    }
  })
}
