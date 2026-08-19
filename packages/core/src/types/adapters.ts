import type { BaseDocument, FileData, PaginatedResult } from "./documents.js";
import type { CollectionConfig, GlobalConfig } from "./schema-config.js";
import type { Field, UploadConfig } from "./schema-core.js";
import type { AggregateArgs, AggregateResult } from "./aggregate.js";

export type { AggregateArgs, AggregateResult } from "./aggregate.js";
export type {
  AggregateCastType,
  AggregateOperation,
  CountOperation,
  NumericOperation,
  AggregateInput,
  InferAggregateResult,
} from "./aggregate.js";

/**
 * The interface every database adapter must implement.
 *
 * Dyrected ships adapters for PostgreSQL, MySQL, SQLite, and MongoDB.
 * Implement this interface to connect any other database.
 */
export interface DatabaseAdapter {
  /** Find a paginated list of documents in a collection. */
  find(args: {
    collection: string;
    where?: Record<string, unknown>;
    limit?: number;
    page?: number;
    sort?: string;
    /**
     * The collection's field definitions. Optional, so simple adapters can
     * ignore it; SQL adapters use it to sort numeric fields by magnitude.
     */
    fields?: Field[];
  }): Promise<PaginatedResult>;

  /** Find a single document by its ID. Returns `null` if not found. */
  findOne(args: { collection: string; id: string }): Promise<BaseDocument | null>;

  /** Insert a new document and return it with its generated `id`. */
  create(args: { collection: string; data: Record<string, unknown> }): Promise<BaseDocument>;

  /** Update a document by ID and return the updated document. */
  update(args: { collection: string; id: string; data: Record<string, unknown> }): Promise<BaseDocument>;

  /** Delete a document by ID. Return value is intentionally untyped — callers do not use it. */
  delete(args: { collection: string; id: string }): Promise<unknown>;

  /**
   * Compute aggregate statistics across a collection without returning documents.
   *
   * Each named key in `args.aggregates` maps to a `count`, `sum`, `avg`, `min`,
   * or `max` operation, with optional `where` filtering and `cast` conversion.
   * The result is a flat object of the same named keys mapped to `number | null`.
   */
  aggregate(args: AggregateArgs): Promise<AggregateResult>;

  /** Fetch the singleton document for a global. Returns an empty object if not yet initialised. */
  getGlobal(args: { slug: string }): Promise<Record<string, unknown>>;

  /** Create or replace the singleton document for a global. */
  updateGlobal(args: { slug: string; data: Record<string, unknown> }): Promise<Record<string, unknown>>;

  /**
   * Sync the database schema with the current collection and global configs.
   * Called on startup to create tables/collections that don't exist yet.
   * Not all adapters implement this (e.g. MongoDB is schema-less).
   */
  sync?(collections: CollectionConfig[], globals: GlobalConfig[]): Promise<void>;

  /**
   * Execute a raw SQL query or database command.
   * Optional — not all adapters support raw access.
   */
  execute?(query: string, params?: unknown[]): Promise<unknown>;

  /**
   * Run all adapter operations in `callback` as one atomic transaction.
   * Shipped adapters implement this; workflow transitions require it.
   */
  transaction?<T>(callback: (db: DatabaseAdapter) => Promise<T>): Promise<T>;

  /**
   * Close any open connection pools, sockets, or background timers.
   * Called during server teardown or build lifecycle cleanup.
   */
  disconnect?(): Promise<void>;
}

/**
 * Read-only view of the database adapter. Exposes only `find`, `findOne`,
 * `getGlobal`, and `aggregate` — no write operations.
 *
 * Passed to `beforeChange`, `beforeDelete`, `beforeRead`, `afterRead`,
 * and field-level hooks. Write operations are available in `afterChange`
 * and `afterDelete` hooks where the full {@link DatabaseAdapter} is provided.
 */
export type ReadonlyDatabaseAdapter = Pick<DatabaseAdapter, "find" | "findOne" | "getGlobal" | "aggregate">;

/**
 * The interface every storage adapter must implement.
 *
 * Dyrected ships adapters for local disk, AWS S3 and other S3-compatible
 * services through the S3 adapter, Cloudinary, and Backblaze B2. Implement
 * this interface to use any other storage provider.
 */
export interface StorageAdapter {
  /**
   * Upload a file and return its metadata (URL, dimensions, etc.).
   * The `prefix` is a path prefix used for multi-tenant setups.
   */
  upload(args: { filename: string; buffer: Uint8Array; mimeType: string; prefix?: string }): Promise<FileData>;

  /** Delete a file by its stored filename. */
  delete(args: { filename: string }): Promise<void>;

  /** Return the public URL for a stored file. */
  getURL(args: { filename: string }): string;

  /**
   * Retrieve the file's raw bytes and MIME type for serving via the API.
   * Only needed by adapters that serve files through the Dyrected API
   * (e.g. `LocalStorage`). Cloud adapters return `null` here and rely on
   * direct CDN URLs instead.
   */
  resolve?(args: { filename: string }): Promise<{ buffer: Uint8Array; mimeType: string } | null>;
}

/**
 * Processes uploaded images — generates metadata (dimensions, BlurHash) and
 * produces resized variants defined in `UploadConfig.imageSizes`.
 *
 * @example
 * import { SharpImageService } from '@dyrected/image-sharp'
 * defineConfig({ image: new SharpImageService(), ... })
 */
export interface ImageService {
  process(args: {
    buffer: Uint8Array;
    mimeType: string;
    config?: boolean | UploadConfig;
    focalPoint?: { x: number; y: number };
  }): Promise<{
    metadata: {
      width?: number;
      height?: number;
      /** Base64-encoded BlurHash for progressive loading. */
      blurhash?: string;
    };
    /** Generated image sizes keyed by their `name`. */
    sizes?: Record<string, { buffer: Uint8Array; width: number; height: number; filename: string }>;
  }>;
}
