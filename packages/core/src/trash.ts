import type {
  CollectionConfig,
  DyrectedConfig,
  TaskConfig,
} from "./types/index.js";
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

function logTrashWarning(config: DyrectedConfig | undefined, payload: { msg: string; [key: string]: unknown }): void {
  if (config?.logger && typeof (config.logger as any).warn === "function") {
    (config.logger as any).warn(payload);
  } else if (typeof console !== "undefined" && console.warn) {
    console.warn(`[dyrected] ${payload.msg}`);
  }
}

/**
 * Validates trash configuration for app and collections.
 */
export function assertValidTrashInConfig(config: DyrectedConfig, source = "config"): void {
  if (config.trash) {
    const { retentionDays } = config.trash;
    if (retentionDays !== undefined && retentionDays !== null) {
      if (!Number.isInteger(retentionDays) || retentionDays < 1) {
        throw new Error(
          `Invalid trash retentionDays in ${source}: must be an integer >= 1. Received ${retentionDays}.`,
        );
      }
      if (retentionDays > 3650) {
        logTrashWarning(config, {
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
          logTrashWarning(config, {
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
              try {
                await db.create({
                  collection: "__audit",
                  data: {
                    collection: colSlug,
                    documentId: entry.docId as string,
                    operation: "purge",
                    user: null,
                    timestamp: new Date().toISOString(),
                    changes: JSON.stringify({
                      before: snapshot,
                      after: null,
                    }),
                  },
                });
              } catch (auditErr: any) {
                logger.warn({ err: auditErr?.message || auditErr, docId: entry.docId, collection: colSlug }, "Failed to write audit log on purge");
              }
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

export interface SoftDeleteOptions {
  db: any;
  config: DyrectedConfig;
  collection: string;
  id: string;
  deletedBy?: string | null;
}

export async function softDeleteDocument(options: SoftDeleteOptions): Promise<{ id: string; purgeAt: number | null }> {
  const { db, config, collection: collectionSlug, id, deletedBy } = options;
  const colConfig = config.collections.find((c) => c.slug === collectionSlug);
  if (!colConfig) throw new Error(`Collection ${collectionSlug} not found`);

  const doc = await db.findOne({ collection: collectionSlug, id });
  if (!doc) throw new Error(`Document ${id} in ${collectionSlug} not found`);

  const resolvedTrash = resolveTrashConfig(colConfig, config);
  const deletedAt = Date.now();
  const purgeAt =
    resolvedTrash.retentionDays !== null && resolvedTrash.retentionDays !== undefined
      ? deletedAt + resolvedTrash.retentionDays * 86_400_000
      : null;
  const title = resolveDocumentTitle(colConfig, doc);
  const trashId = getTrashEntryId(collectionSlug, id);

  const trashData = {
    id: trashId,
    collection: collectionSlug,
    docId: id,
    deletedAt,
    purgeAt,
    deletedBy: deletedBy ?? null,
    title,
    snapshot: doc,
    createdAt: doc.createdAt ?? new Date(deletedAt).toISOString(),
  };

  if (db.transaction) {
    await db.transaction(async (tx: any) => {
      await tx.create({ collection: TRASH_COLLECTION, data: trashData });
      await tx.delete({ collection: collectionSlug, id });
    });
  } else {
    await db.create({ collection: TRASH_COLLECTION, data: trashData });
    await db.delete({ collection: collectionSlug, id });
  }

  return { id: trashId, purgeAt };
}

export interface RestoreDocumentOptions {
  db: any;
  config: DyrectedConfig;
  collection: string;
  trashId: string;
  overrides?: Record<string, unknown>;
}

export async function restoreDocument(options: RestoreDocumentOptions): Promise<{ restoredDoc: any }> {
  const { db, config, collection: collectionSlug, trashId: param, overrides } = options;
  const colConfig = config.collections.find((c) => c.slug === collectionSlug);
  if (!colConfig) throw new Error(`Collection ${collectionSlug} not found`);

  const trashId = param.includes(":") ? param : getTrashEntryId(collectionSlug, param);
  const entry =
    (await db.findOne({ collection: TRASH_COLLECTION, id: trashId })) ||
    (await db.findOne({ collection: TRASH_COLLECTION, id: param }));

  if (!entry || entry.collection !== collectionSlug) {
    throw new Error(`Trash entry ${param} not found for collection ${collectionSlug}`);
  }

  const snapshot = typeof entry.snapshot === "string" ? JSON.parse(entry.snapshot) : entry.snapshot;
  const now = new Date().toISOString();
  const docToRestore: Record<string, any> = {
    ...snapshot,
    ...(overrides || {}),
    id: entry.docId,
    createdAt: snapshot.createdAt ?? entry.createdAt ?? now,
    updatedAt: now,
  };

  if (db.transaction) {
    await db.transaction(async (tx: any) => {
      await tx.create({ collection: collectionSlug, data: docToRestore });
      await tx.delete({ collection: TRASH_COLLECTION, id: entry.id });
    });
  } else {
    await db.create({ collection: collectionSlug, data: docToRestore });
    await db.delete({ collection: TRASH_COLLECTION, id: entry.id });
  }

  return { restoredDoc: docToRestore };
}

