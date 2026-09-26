import type {
  CollectionConfig,
  DyrectedConfig,
  TaskConfig,
} from "./types/index.js";
import { getConfigLogger } from "./observability.js";
import { AuditService } from "./services/audit.service.js";
import { runCollectionHooks } from "./utils/hooks.js";

export const TRASH_COLLECTION = "__trash";

/**
 * Internal collection holding snapshots of trashed documents across all collections.
 */
export const TRASH_COLLECTION_CONFIG: CollectionConfig = {
  slug: TRASH_COLLECTION,
  labels: { singular: "Trash entry", plural: "Trash entries" },
  fields: [
    { name: "collection", type: "text", required: true, promoted: true },
    { name: "docId", type: "text", required: true, promoted: true },
    { name: "deletedAt", type: "number", required: true, promoted: true }, // epoch ms
    { name: "purgeAt", type: "number", promoted: true }, // epoch ms, null = never
    { name: "deletedBy", type: "text", promoted: true },
    { name: "title", type: "text" }, // resolved useAsTitle, for listing
    { name: "snapshot", type: "json", required: true }, // the raw stored document
    { name: "createdAt", type: "date" }, // original doc timestamps live in snapshot
  ],
  indexes: [
    { fields: ["purgeAt"] },
    { fields: ["collection", "docId"] },
  ],
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  admin: { hidden: true },
};

/**
 * Deterministic primary key for a trash entry: `${collection}:${docId}`.
 */
export function getTrashEntryId(collection: string, docId: string): string {
  return `${collection}:${docId}`;
}

export interface ResolvedTrashConfig {
  enabled: boolean;
  retentionDays: number | null;
  allowPermanentDelete: boolean;
}

/**
 * Resolves trash settings for a collection based on collection and app-level config.
 *
 * Resolution order:
 * | Collection trash | App trash.enabled | Result |
 * |---|---|---|
 * | false            | any               | hard delete |
 * | true / object    | any               | trash enabled |
 * | omitted          | false             | hard delete |
 * | omitted          | omitted / true    | trash enabled (default: 30 days retention) |
 */
export function resolveTrashConfig(
  collection: CollectionConfig,
  appConfig?: DyrectedConfig,
): ResolvedTrashConfig {
  const colTrash = collection.trash;
  const appTrash = appConfig?.trash;

  let enabled = true;
  if (colTrash === false) {
    enabled = false;
  } else if (colTrash === true || (typeof colTrash === "object" && colTrash !== null)) {
    enabled = true;
  } else if (appTrash?.enabled === false) {
    enabled = false;
  }

  if (!enabled) {
    return {
      enabled: false,
      retentionDays: null,
      allowPermanentDelete: true,
    };
  }

  let retentionDays: number | null = 30;
  if (typeof colTrash === "object" && colTrash !== null && "retentionDays" in colTrash) {
    retentionDays = colTrash.retentionDays ?? null;
  } else if (appTrash?.retentionDays !== undefined) {
    retentionDays = appTrash.retentionDays ?? null;
  }

  const allowPermanentDelete =
    typeof colTrash === "object" && colTrash !== null && colTrash.allowPermanentDelete !== undefined
      ? colTrash.allowPermanentDelete
      : appTrash?.allowPermanentDelete !== undefined
        ? appTrash.allowPermanentDelete
        : true;

  return {
    enabled: true,
    retentionDays,
    allowPermanentDelete,
  };
}

/**
 * Validates trash configuration for app and collections.
 */
export function assertValidTrashInConfig(config: DyrectedConfig, source = "config"): void {
  const logger = getConfigLogger(config, "trash");

  if (config.trash) {
    const { retentionDays } = config.trash;
    if (retentionDays !== undefined && retentionDays !== null) {
      if (!Number.isInteger(retentionDays) || retentionDays < 1) {
        throw new Error(
          `Invalid trash retentionDays in ${source}: must be an integer >= 1. Received ${retentionDays}.`,
        );
      }
      if (retentionDays > 3650) {
        logger.warn({
          msg: `Trash retentionDays in ${source} is unusually large (${retentionDays} days > 10 years). Check if value was provided in hours or seconds.`,
        });
      }
    }
  }

  for (const col of config.collections || []) {
    if (col.slug === "trash") {
      throw new Error(`Collection slug "trash" is reserved by Dyrected for the trash system.`);
    }
    const isSystem = col.slug.startsWith("__");
    if (isSystem && col.trash) {
      throw new Error(`System collection "${col.slug}" cannot enable trash.`);
    }

    if (col.trash === false) {
      continue;
    }

    if (typeof col.trash === "object" && col.trash !== null) {
      const { retentionDays } = col.trash;
      if (retentionDays !== undefined && retentionDays !== null) {
        if (!Number.isInteger(retentionDays) || retentionDays < 1) {
          throw new Error(
            `Invalid trash retentionDays for collection "${col.slug}" in ${source}: must be an integer >= 1. Received ${retentionDays}. Use trash: false for immediate hard delete.`,
          );
        }
        if (retentionDays > 3650) {
          logger.warn({
            msg: `Trash retentionDays for collection "${col.slug}" is unusually large (${retentionDays} days > 10 years). Check if value was provided in hours or seconds.`,
            collection: col.slug,
          });
        }
      }
    }
  }

  for (const glob of config.globals || []) {
    if (glob.slug === "trash") {
      throw new Error(`Global slug "trash" is reserved by Dyrected for the trash system.`);
    }
  }
}

/**
 * Resolves a human-readable title for a document snapshot using collection useAsTitle.
 */
export function resolveDocumentTitle(collection: CollectionConfig, doc: any): string {
  if (!doc || typeof doc !== "object") return "";
  const titleField = collection.admin?.useAsTitle || "title";
  const val = doc[titleField];
  if (val !== undefined && val !== null && String(val).trim().length > 0) {
    return String(val);
  }
  if (doc.name !== undefined && doc.name !== null && String(doc.name).trim().length > 0) {
    return String(doc.name);
  }
  if (doc.id !== undefined && doc.id !== null) {
    return String(doc.id);
  }
  return "";
}

/**
 * Creates the built-in purge task that automatically permanently deletes
 * expired documents from __trash.
 */
export function createTrashPurgeTask(config: DyrectedConfig): TaskConfig {
  return {
    name: "dyrected:trash-purge",
    cron: config.trash?.purge?.cron ?? "0 3 * * *",
    run: async ({ db, logger, signal }) => {
      const batchSize = Math.max(1, config.trash?.purge?.batchSize ?? 200);

      while (true) {
        if (signal?.aborted) return;
        const now = Date.now();

        const due = await db.find({
          collection: TRASH_COLLECTION,
          where: {
            purgeAt: { lte: now, not_equals: null },
          },
          limit: batchSize,
          sort: "purgeAt",
        });

        if (!due.docs.length) break;

        for (const entry of due.docs) {
          if (signal?.aborted) return;
          if (entry.purgeAt == null || typeof entry.purgeAt !== "number") continue;

          try {
            const colSlug = entry.collection as string;
            const colConfig = config.collections.find((c) => c.slug === colSlug);
            const snapshot = (typeof entry.snapshot === "string" ? JSON.parse(entry.snapshot) : entry.snapshot) as any;

            // 1. Upload collection: delete storage file and variants
            if (colConfig?.upload && config.storage && snapshot?.filename) {
              try {
                await config.storage.delete({ filename: snapshot.filename as string });
                if (snapshot.sizes && typeof snapshot.sizes === "object") {
                  for (const size of Object.values(snapshot.sizes) as any[]) {
                    if (size?.filename) {
                      await config.storage.delete({ filename: size.filename });
                    }
                  }
                }
              } catch (storageErr: any) {
                logger.warn({ err: storageErr?.message || storageErr, docId: entry.docId, collection: colSlug }, "Failed to delete storage file on purge");
              }
            }

            // 2. Run afterDelete hooks (mode "permanent", user undefined)
            if (colConfig?.hooks?.afterDelete) {
              await runCollectionHooks(
                colConfig.hooks.afterDelete,
                {
                  id: entry.docId as string,
                  doc: snapshot,
                  user: undefined,
                  req: {} as any,
                  db,
                  mode: "permanent",
                },
                { isolated: true },
              );
            }

            // 3. Audit "purge"
            if (colConfig?.audit) {
              await AuditService.log(
                db,
                {
                  operation: "purge",
                  collection: colSlug,
                  documentId: entry.docId as string,
                  user: undefined,
                  before: snapshot,
                  after: null,
                },
                config,
              );
            }

            // 4. Delete the __trash entry last
            await db.delete({ collection: TRASH_COLLECTION, id: entry.id });
          } catch (entryErr: any) {
            logger.error({ err: entryErr?.message || entryErr, entryId: entry.id }, "Error purging trash entry");
          }
        }

        if (due.docs.length < batchSize) break;
      }
    },
  };
}
