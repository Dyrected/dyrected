import type { DatabaseAdapter, ReadonlyDatabaseAdapter } from "../types/index.js";

const WRITE_METHODS = ["create", "update", "delete", "updateGlobal", "execute"];

/**
 * Wrap a DatabaseAdapter so that write operations throw at runtime.
 *
 * Passed to `beforeChange`, `beforeDelete`, `beforeRead`, `afterRead`,
 * and field-level hooks — phases where only reads are permitted.
 */
export function createReadonlyDb(db: DatabaseAdapter): ReadonlyDatabaseAdapter {
  return new Proxy(db, {
    get(target, prop) {
      if (WRITE_METHODS.includes(prop as string)) {
        return () => {
          throw new Error(
            `[dyrected] Write operation "${String(prop)}" is not allowed in this hook phase. ` +
            `Use afterChange/afterDelete hooks for write operations.`
          );
        };
      }
      return Reflect.get(target, prop);
    },
  });
}
