import type { UploadConfig } from '../types/schema-core.js';

/**
 * Returns true if `mimeType` matches any of the allowed patterns.
 * Patterns support `*` / `*​/*` (any), a `type/*` wildcard (e.g. `image/*`),
 * or an exact `type/subtype` match. Matching is case-insensitive.
 */
export function isMimeAllowed(mimeType: string, allowed: string[]): boolean {
  const type = (mimeType || '').toLowerCase().trim();
  return allowed.some((raw) => {
    const pattern = (raw || '').toLowerCase().trim();
    if (!pattern) return false;
    if (pattern === '*' || pattern === '*/*') return true;
    if (pattern.endsWith('/*')) return type.startsWith(pattern.slice(0, -1)); // "image/*" -> "image/"
    return type === pattern;
  });
}

export interface UploadValidationError {
  /** HTTP status to return: 415 Unsupported Media Type or 413 Payload Too Large. */
  status: 413 | 415;
  message: string;
}

/**
 * Validates an uploaded file against a collection's {@link UploadConfig}.
 * Enforces `allowedMimeTypes` and `maxFileSize` when they are configured.
 * Returns `null` when the upload is allowed (or when no config restricts it).
 */
export function validateUpload(
  file: { type?: string; size?: number; name?: string },
  config: UploadConfig | undefined,
): UploadValidationError | null {
  if (!config) return null;

  const { allowedMimeTypes, maxFileSize } = config;

  if (allowedMimeTypes && allowedMimeTypes.length > 0) {
    if (!isMimeAllowed(file.type || '', allowedMimeTypes)) {
      return {
        status: 415,
        message: `File type "${file.type || 'unknown'}" is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}.`,
      };
    }
  }

  if (typeof maxFileSize === 'number' && typeof file.size === 'number' && file.size > maxFileSize) {
    return {
      status: 413,
      message: `File is too large (${file.size} bytes). Maximum allowed size is ${maxFileSize} bytes.`,
    };
  }

  return null;
}
