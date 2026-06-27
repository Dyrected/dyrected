/**
 * The minimum shape of every document returned by the database layer.
 *
 * All documents have an `id` field assigned by the adapter. Additional fields
 * are stored as `unknown` until you narrow them with your own interface.
 *
 * Use this as the base when declaring your collection document types:
 * ```ts
 * interface Post extends BaseDocument {
 *   title: string
 *   slug: string
 * }
 * ```
 */
export interface BaseDocument {
  /** The document's unique identifier, assigned by the database adapter. */
  id: string;
  [key: string]: any;
}

/**
 * The envelope returned by collection list endpoints (`GET /api/collections/:slug`).
 *
 * @template T  The document type.
 */
export interface PaginatedResult<T = Record<string, any>> {
  /** The documents on the current page. */
  docs: T[];
  /** Total number of documents matching the query (across all pages). */
  total: number;
  /** Maximum number of documents per page as requested. */
  limit: number;
  /** The current page number (1-indexed). */
  page: number;
  /** Total number of pages given the current `limit`. */
  totalPages: number;
  /** Whether a next page exists. */
  hasNextPage: boolean;
  /** Whether a previous page exists. */
  hasPrevPage: boolean;
}

/**
 * Metadata returned after a file is uploaded and stored.
 * Stored on the document in upload collections.
 */
export interface FileData {
  filename: string;
  filesize?: number;
  mimeType: string;
  /** Public URL of the stored file. */
  url: string;
  width?: number;
  height?: number;
  focalPoint?: { x: number; y: number };
  /** Base64-encoded BlurHash string for progressive image loading. */
  blurhash?: string;
  /** `'upload'` for server-stored files; `'external'` for provider-managed files. */
  type?: "upload" | "external";
  provider?: string;
  provider_metadata?: unknown;
  [key: string]: unknown;
}
