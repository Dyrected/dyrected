import type { AdminAuthConfig } from "./admin-auth.js";
import type { AdminConfig } from "./admin.js";
import type { DatabaseAdapter, ImageService, StorageAdapter } from "./adapters.js";
import type { LifecycleEventHandler } from "./workflows.js";
import type { CollectionConfig, GlobalConfig } from "./schema-config.js";

/**
 * The root configuration object passed to `createDyrectedApp`.
 *
 * This is the single source of truth for your entire Dyrected instance —
 * collections, globals, database adapter, storage, email, and more.
 */
export interface DyrectedConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  collections: CollectionConfig<any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globals: GlobalConfig<any>[];
  db?: DatabaseAdapter;
  storage?: StorageAdapter;
  image?: ImageService;
  admin?: AdminConfig;
  adminAuth?: AdminAuthConfig;
  email?: {
    from: string;
    send: (args: { to: string; subject: string; html: string }) => Promise<void>;
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
  redis?: {
    url: string;
  };
  events?: {
    handlers: LifecycleEventHandler[];
    maxAttempts?: number;
    retryDelayMs?: number;
  };
  cors?: {
    origins: string[];
  };
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
