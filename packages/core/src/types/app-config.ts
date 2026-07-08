import type { AdminAuthConfig } from "./admin-auth.js";
import type { AdminConfig } from "./admin.js";
import type { AccessPolicyResolver } from "./access.js";
import type { DatabaseAdapter, ImageService, StorageAdapter } from "./adapters.js";
import type { LifecycleEventHandler } from "./workflows.js";
import type { CollectionConfig, GlobalConfig } from "./schema-config.js";

/**
 * The root configuration object passed to `createDyrectedApp`.
 *
 * This is the single source of truth for your entire Dyrected instance —
 * collections, globals, database adapter, storage, email, and more.
 *
 * @example
 * import { defineConfig } from '@dyrected/core'
 * import { SQLiteAdapter } from '@dyrected/db-sqlite'
 *
 * export default defineConfig({
 *   db: new SQLiteAdapter({ filename: './db.sqlite' }),
 *   collections: [Posts, Users],
 *   globals: [SiteSettings],
 * })
 */
export interface DyrectedConfig {
  /** Collection definitions. Each collection maps to a database table/collection. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  collections: CollectionConfig<any>[];

  /** Global (singleton) definitions. Each global maps to a single document. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globals: GlobalConfig<any>[];

  /**
   * The database adapter. Required for all data operations.
   * @see DatabaseAdapter
   */
  db?: DatabaseAdapter;

  /**
   * The storage adapter for file uploads.
   * Required when any collection has `upload: true`.
   * @see StorageAdapter
   */
  storage?: StorageAdapter;

  /**
   * The image processing service. Required when any upload collection
   * defines `imageSizes`.
   * @see ImageService
   */
  image?: ImageService;

  /** Admin UI branding and metadata. */
  admin?: AdminConfig;

  /**
   * Deployment-level authentication strategy for the CMS dashboard (`/admin`).
   * This is separate from collection-level `auth: true`, which continues to
   * power application/customer auth independently.
   */
  adminAuth?: AdminAuthConfig;

  /**
   * Named access policies available to collection, global, and field access
   * rules via `{ policy: 'name' }`.
   */
  accessPolicies?: Record<string, AccessPolicyResolver>;

  /**
   * Email transport configuration. Required for welcome emails, password
   * resets, and invite links.
   *
   * @example
   * email: {
   *   from: 'no-reply@myapp.com',
   *   send: async ({ to, subject, html }) => {
   *     await resend.emails.send({ from, to, subject, html })
   *   },
   * }
   */
  email?: {
    /** The `From` address for all outbound emails. */
    from: string;

    /** The send function. Wire in any email provider (Resend, SendGrid, SES, etc.). */
    send: (args: { to: string; subject: string; html: string }) => Promise<void>;

    /** Override the default email templates. */
    templates?: {
      welcome?: (args: { email: string }) => { subject?: string; html: string };
      invite?: (args: { token: string; invitedByEmail?: string }) => {
        subject?: string;
        html: string;
      };
      resetPassword?: (args: { token: string; url?: string }) => {
        subject?: string;
        html: string;
      };
      passwordChanged?: (args: { email: string }) => {
        subject?: string;
        html: string;
      };
    };
  };

  /**
   * Redis connection URL. Required for distributed caching of dynamic option
   * resolvers and other server-side caches in multi-instance deployments.
   *
   * @example
   * redis: { url: process.env.REDIS_URL }
   */
  redis?: {
    url: string;
  };

  /** Durable lifecycle-event delivery configuration. */
  events?: {
    handlers: LifecycleEventHandler[];

    /** Maximum delivery attempts before an event remains failed. Defaults to 8. */
    maxAttempts?: number;

    /** Initial exponential-backoff delay in milliseconds. Defaults to 1000. */
    retryDelayMs?: number;
  };

  /**
   * Cross-Origin Resource Sharing (CORS) configuration.
   * List all origins that are allowed to call the Dyrected API.
   *
   * @example
   * cors: { origins: ['https://myapp.com', 'https://www.myapp.com'] }
   */
  cors?: {
    origins: string[];
  };

  /**
   * Callback to dynamically fetch additional collections and globals for a
   * given site ID at request time. Used in multi-tenant deployments where each
   * site has its own schema stored in the database.
   */
  onSchemaFetch?: (
    siteId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<{
    collections?: CollectionConfig<any>[];
    globals?: GlobalConfig<any>[];
    admin?: AdminConfig;
    adminAuth?: AdminAuthConfig;
  }>;
}
