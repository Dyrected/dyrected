import type { AdminAuthConfig } from "./admin-auth.js";
import type { AdminConfig } from "./admin.js";
import type { AccessPolicyResolver } from "./access.js";
import type {
  DatabaseAdapter,
  ImageService,
  ImageTransformOptions,
  StorageAdapter,
} from "./adapters.js";
import type { AuthenticatedUser } from "./request.js";
import type { LifecycleEventHandler } from "./workflows.js";
import type { Block } from "./schema-core.js";
import type { CollectionConfig, GlobalConfig } from "./schema-config.js";
import type { DestinationStream, Logger, LoggerOptions } from "pino";
import type { HookRequestContext } from "./request.js";

export type DyrectedLoggerConfig =
  | {
      options: LoggerOptions;
      destination?: DestinationStream;
    }
  | Logger;

export interface DyrectedObservabilityConfig {
  requestLogging?: {
    enabled?: boolean;
    logBodies?: boolean;
    maxBodyBytes?: number;
    redactPaths?: string[];
    includeHeaders?: string[];
    redactHeaders?: string[];
  };
  sampling?: {
    successRate?: number;
    traceSuccessRate?: number;
    bodySuccessRate?: number;
    alwaysKeep4xx?: boolean;
    alwaysKeep5xx?: boolean;
  };
  tracing?: {
    enabled?: boolean;
    serviceName?: string;
    exporter?: "otlp" | "console" | "none";
    headers?: Record<string, string>;
    endpoint?: string;
  };
  metrics?: {
    enabled?: boolean;
    exporter?: "otlp" | "prometheus" | "none";
    endpoint?: string;
    path?: string;
  };
  transports?: {
    targets?: Array<
      | { type: "stdout" }
      | { type: "stderr" }
      | { type: "file"; path: string }
      | { type: "otlp"; endpoint: string; headers?: Record<string, string> }
    >;
  };
}

export type TrustProxyConfig = boolean | number;

export interface RateLimitConfig {
  /**
   * Enable in-process request rate limiting for HTTP API routes.
   *
   * This protects routes at the Dyrected app layer. For production you should
   * still prefer an edge or proxy limit in front of it when possible.
   */
  enabled?: boolean;

  /**
   * Time window, in milliseconds, used to count requests from the same client.
   *
   * Defaults to `15 * 60 * 1000` (15 minutes).
   */
  window?: number;

  /**
   * Maximum number of requests a client may make within the current window.
   *
   * Defaults to `500`.
   */
  max?: number;

  /**
   * Trust upstream proxy forwarding headers when resolving the client IP.
   *
   * Set to `true` when Dyrected is deployed behind a reverse proxy or
   * platform edge that correctly sets `X-Forwarded-For`. Set to a number to
   * trust that many proxy hops from the right side of the header chain.
   */
  trustProxy?: TrustProxyConfig;

  /**
   * Route prefixes that should be subject to rate limiting.
   *
   * Defaults to `['/api']`.
   */
  paths?: string[];

  /**
   * Optional escape hatch for requests that should bypass the in-app limiter.
   *
   * Return `true` to skip limiting for the current request.
   */
  skip?: (args: {
    ip: string;
    path: string;
    method: string;
    req: HookRequestContext;
  }) => boolean | Promise<boolean>;
}

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
export interface DyrectedConfig<
  TUser extends AuthenticatedUser = AuthenticatedUser,
> {
  /**
   * Reusable block definitions that `blocks` fields can reference by slug via
   * `blockReferences`.
   */
  blocks?: Block[];

  /** Collection definitions. Each collection maps to a database table/collection. */
  collections: CollectionConfig<any>[];

  /** Global (singleton) definitions. Each global maps to a single document. */
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

  /**
   * Media management, dynamic transformations, and transformation preset configurations.
   */
  media?: {
    /** Whether to restrict dynamic transformations to registered preset keys in production. */
    restrictTransforms?: boolean;
    /** Named transformation presets available via `?key=name`. */
    presets?: Record<string, ImageTransformOptions>;
  };

  /**
   * Runtime logger configuration. Accepts either logger options/destination or
   * a fully-instantiated Pino logger.
   */
  logger?: DyrectedLoggerConfig;

  /**
   * Request logging, redaction, sampling, tracing, metrics, and transport
   * configuration for the Dyrected server runtime.
   */
  observability?: DyrectedObservabilityConfig;

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
   *
   * A policy can be a **function** (full server logic, evaluated to a static
   * boolean when serialized for the admin panel) or a **Jexl string** (or
   * boolean). String policies are inlined when the schema is sent to the admin,
   * so the admin panel evaluates them live against the current form — the same
   * way it evaluates inline Jexl rules.
   */
  accessPolicies?: Record<
    string,
    AccessPolicyResolver<Record<string, unknown>, TUser> | string | boolean
  >;

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
    send: (args: {
      to: string;
      subject: string;
      html: string;
    }) => Promise<void>;

    /** Override the default email templates. */
    templates?: {
      welcome?: (args: { email: string }) => { subject?: string; html: string };
      invite?: (args: { token: string; invitedByEmail?: string; url?: string }) => {
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
   * App-level HTTP request rate limiting.
   *
   * Similar to Payload's `rateLimit` option, this counts requests by client IP
   * over a rolling time window and returns `429` responses once the limit is
   * exhausted.
   */
  rateLimit?: RateLimitConfig;

  /**
   * Callback to dynamically fetch additional collections and globals for a
   * given site ID at request time. Used in multi-tenant deployments where each
   * site has its own schema stored in the database.
   */
  onSchemaFetch?: (siteId: string) => Promise<{
    blocks?: Block[];
    collections?: CollectionConfig<any>[];
    globals?: GlobalConfig<any>[];
    accessPolicies?: Record<
      string,
      AccessPolicyResolver<Record<string, unknown>, TUser> | string | boolean
    >;
    admin?: AdminConfig;
    adminAuth?: AdminAuthConfig;
  }>;
}
