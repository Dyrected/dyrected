import { DatabaseAdapter } from '../types/index.js';

export interface AuditLogArgs {
  action: 'create' | 'update' | 'delete' | 'publish';
  entity: string;
  entityId?: string;
  user?: { sub: string; collection: string; email?: string };
  /** Delta between old and new document (update only). */
  changes?: Record<string, { old: any; new: any }>;
  /** Full document snapshot at the time of the action. */
  snapshot?: any;
}

/**
 * Computes a shallow diff between two objects, returning an object where each
 * changed key maps to { old, new }.
 */
export function computeDiff(
  original: Record<string, any>,
  updated: Record<string, any>,
): Record<string, { old: any; new: any }> {
  const allKeys = new Set([...Object.keys(original), ...Object.keys(updated)]);
  const diff: Record<string, { old: any; new: any }> = {};
  for (const key of allKeys) {
    const oldVal = original[key];
    const newVal = updated[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[key] = { old: oldVal, new: newVal };
    }
  }
  return diff;
}

export class AuditService {
  /**
   * Writes a single audit log entry to the __audit collection.
   * Never throws — errors are swallowed to avoid blocking the primary operation.
   */
  static async log(db: DatabaseAdapter, args: AuditLogArgs): Promise<void> {
    try {
      await db.create({
        collection: '__audit',
        data: {
          entity: args.entity,
          entityId: args.entityId ?? null,
          action: args.action,
          userCollection: args.user?.collection ?? null,
          userId: args.user?.sub ?? null,
          userEmail: args.user?.email ?? null,
          changes: args.changes ? JSON.stringify(args.changes) : null,
          snapshot: args.snapshot ? JSON.stringify(args.snapshot) : null,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error('[dyrected/audit] Failed to write audit log:', err);
    }
  }
}
