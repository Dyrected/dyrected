import { createHash } from "node:crypto";

/** Longest index name MySQL (64) and Postgres (63) accept, with a little headroom. */
const MAX_INDEX_NAME_LENGTH = 60;

/**
 * Builds the physical name of an index, for example `uniq_collection_wallets_currency`.
 *
 * MySQL rejects names over 64 characters and Postgres silently truncates at 63, which can
 * collide or, on MySQL, leave a unique constraint uncreated. Names that would be too long are
 * shortened to `<prefix>_<hash>_<last field>`, where the hash is derived from the full name so
 * the result stays stable and unique per table and field set.
 */
export function resolveIndexName(prefix: "uniq" | "idx", table: string, fields: string[]): string {
  const full = `${prefix}_${table}_${fields.join("_")}`;
  if (full.length <= MAX_INDEX_NAME_LENGTH) return full;
  const hash = createHash("sha1").update(full).digest("hex").slice(0, 10);
  const tail = (fields[fields.length - 1] ?? "").slice(0, 30);
  return `${prefix}_${hash}_${tail}`;
}
