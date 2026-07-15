import type { DatabaseAdapter, DyrectedConfig } from '../types/index.js';
import { getConfigLogger, getObservabilityRuntime } from '../observability.js';

export interface AuditLogArgs {
  operation: 'create' | 'update' | 'delete';
  collection: string;
  documentId?: string;
  user?: { id: string; collection: string; email?: string };
  /** Full state before the operation (null for create). */
  before?: any;
  /** Full state after the operation (null for delete). */
  after?: any;
}

export class AuditService {
  /**
   * Writes a single entry to the __audit collection.
   * Called without await — runs asynchronously and never blocks the primary operation.
   */
  static async log(
    db: DatabaseAdapter,
    args: AuditLogArgs,
    config?: DyrectedConfig,
  ): Promise<void> {
    try {
      await db.create({
        collection: '__audit',
        data: {
          collection: args.collection,
          documentId: args.documentId ?? null,
          operation: args.operation,
          user: args.user?.id ?? null,
          timestamp: new Date().toISOString(),
          changes: JSON.stringify({
            before: args.before ?? null,
            after: args.after ?? null,
          }),
        },
      });
    } catch (err) {
      getObservabilityRuntime(config)?.recordAuditWriteFailure({
        collection: args.collection,
        operation: args.operation,
      });
      getConfigLogger(config, 'audit').error({
        err,
        msg: 'Failed to write audit log',
        collection: args.collection,
        operation: args.operation,
        documentId: args.documentId,
      });
    }
  }
}
