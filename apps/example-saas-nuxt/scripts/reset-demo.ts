/**
 * Daily demo reset.
 *
 * Run this on a schedule (see .github/workflows/reset-demo.yml) to return the
 * public SnackTrack Pro demo to a clean, seeded state every morning:
 *
 *   1. Cloudinary  — delete assets uploaded AFTER MEDIA_CUTOFF (visitor uploads);
 *                    keep the baseline assets uploaded on/before that date.
 *   2. Postgres    — keep the `admin` collection; keep media rows for the assets
 *                    we kept in Cloudinary, and delete the rows for the ones we
 *                    purged; truncate every other collection; clear the
 *                    `global_*` rows so globals fall back to the `initialData`
 *                    defined in dyrected.config.
 *   3. Reseed      — call the live site's unfiltered collection endpoints (and
 *                    the homepage) so Dyrected re-seeds collections + globals
 *                    from config immediately.
 *
 * Everything is driven by env vars, so the same script works locally and in CI:
 *
 *   DATABASE_URL              Postgres connection string (required)
 *   CLOUDINARY_URL            cloudinary://<key>:<secret>@<cloud>   (or the three vars below)
 *   CLOUDINARY_CLOUD_NAME     alternative to CLOUDINARY_URL
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *   SITE_URL                  deployed base URL, e.g. https://demo.example.com (required to reseed)
 *   MEDIA_CUTOFF              ISO date; assets uploaded AFTER this are deleted, older kept (default 2026-07-10)
 *   KEEP_COLLECTIONS          comma list of collection slugs to preserve (default "admin")
 *   RESET_GLOBALS             "false" to leave globals untouched (default resets them)
 *   DRY_RUN                   "true" to log what would happen without deleting
 *
 * Run:  pnpm dlx tsx scripts/reset-demo.ts
 */

import { Client } from "pg";
import { v2 as cloudinary } from "cloudinary";

const DRY_RUN = process.env.DRY_RUN === "true";
const RESET_GLOBALS = process.env.RESET_GLOBALS !== "false";
const MEDIA_CUTOFF = process.env.MEDIA_CUTOFF || "2026-07-10";
const SITE_URL = (process.env.SITE_URL || "").replace(/\/$/, "");
const KEEP_COLLECTIONS = new Set(
  (process.env.KEEP_COLLECTIONS || "admin")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith("collection_") ? s : `collection_${s}`)),
);
// Admin UI preferences live in this table and are tied to the admin users we
// keep, so never wipe it.
KEEP_COLLECTIONS.add("collection___global_preferences");
// Media is never blanket-truncated: we keep the baseline (pre-cutoff) library
// and delete only the rows for assets purged from Cloudinary (see below).
KEEP_COLLECTIONS.add("collection_media");

// Collections to reseed after the wipe (order authors before blog so the
// author relationships exist for depth reads). Globals reseed on the homepage.
const RESEED_COLLECTIONS = ["authors", "pages", "blog", "products"];

function log(...args: unknown[]) {
  console.log("[reset-demo]", ...args);
}

// ---------------------------------------------------------------------------
// 1. Cloudinary — delete assets uploaded before the cutoff
// ---------------------------------------------------------------------------
async function purgeCloudinary(): Promise<string[]> {
  if (!process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_CLOUD_NAME) {
    log("Cloudinary not configured — skipping asset purge.");
    return [];
  }

  cloudinary.config({
    secure: true,
    // Falls back to CLOUDINARY_URL automatically when the explicit vars are unset.
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // Delete anything uploaded AFTER the cutoff; keep the older baseline library.
  const expression = `uploaded_at>${MEDIA_CUTOFF}`;
  log(`Cloudinary: searching for assets where ${expression}`);

  // Group public_ids by (resource_type, delivery type) — delete_resources
  // requires both, and only accepts 100 ids per call.
  const groups = new Map<string, string[]>();
  let cursor: string | undefined;
  let found = 0;

  do {
    let query = cloudinary.search.expression(expression).max_results(500);
    if (cursor) query = query.next_cursor(cursor);
    const res: any = await query.execute();

    for (const asset of res.resources || []) {
      found++;
      const key = `${asset.resource_type || "image"}::${asset.type || "upload"}`;
      const list = groups.get(key) || [];
      list.push(asset.public_id);
      groups.set(key, list);
    }
    cursor = res.next_cursor;
  } while (cursor);

  log(`Cloudinary: ${found} asset(s) uploaded after ${MEDIA_CUTOFF}.`);
  const purged: string[] = [];
  if (found === 0) return purged;

  for (const [key, ids] of groups) {
    const [resource_type, type] = key.split("::");
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      if (DRY_RUN) {
        log(`DRY_RUN would delete ${chunk.length} ${resource_type}/${type} asset(s).`);
        continue;
      }
      await cloudinary.api.delete_resources(chunk, { resource_type: resource_type as any, type, invalidate: true });
      purged.push(...chunk);
      log(`Cloudinary: deleted ${chunk.length} ${resource_type}/${type} asset(s).`);
    }
  }
  return purged;
}

// ---------------------------------------------------------------------------
// 2. Postgres — keep admin, wipe every other collection, clear globals
// ---------------------------------------------------------------------------
async function resetDatabase(purgedMediaIds: string[]) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");

  const client = new Client({
    connectionString,
    // Most managed Postgres (Neon, Supabase, Vercel) require TLS.
    ssl: connectionString.includes("sslmode=disable") ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    // Discover every Dyrected collection table, minus the ones we keep.
    const { rows } = await client.query(
      `SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND tablename LIKE 'collection\\_%'`,
    );
    const toWipe = rows
      .map((r) => r.tablename as string)
      .filter((t) => !KEEP_COLLECTIONS.has(t));

    log(`Postgres: wiping ${toWipe.length} table(s): ${toWipe.join(", ") || "(none)"}`);
    log(`Postgres: keeping ${[...KEEP_COLLECTIONS].join(", ")}`);

    if (DRY_RUN) {
      log("DRY_RUN — no rows deleted.");
      return;
    }

    await client.query("BEGIN");
    for (const table of toWipe) {
      // Table names come from pg_tables (not user input); quote defensively.
      await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY`);
    }
    // Remove media rows for the assets we purged from Cloudinary; the baseline
    // (pre-cutoff) media rows are kept. media.filename holds the public_id.
    if (purgedMediaIds.length > 0) {
      const res = await client.query(
        `DELETE FROM collection_media WHERE data->>'filename' = ANY($1::text[])`,
        [purgedMediaIds],
      );
      log(`Postgres: deleted ${res.rowCount} media row(s) for purged assets.`);
    }
    if (RESET_GLOBALS) {
      const res = await client.query(`DELETE FROM dyrected_internal WHERE key LIKE 'global\\_%'`);
      log(`Postgres: cleared ${res.rowCount} global(s) — they will re-seed from config.`);
    }
    await client.query("COMMIT");
    log("Postgres: reset committed.");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

// ---------------------------------------------------------------------------
// 3. Reseed — trigger Dyrected's auto-seed from config initialData
// ---------------------------------------------------------------------------
async function reseed() {
  if (!SITE_URL) {
    log("SITE_URL not set — skipping reseed trigger (site will seed on first visit).");
    return;
  }
  if (DRY_RUN) {
    log("DRY_RUN — skipping reseed trigger.");
    return;
  }

  // Collections only auto-seed on an unfiltered list request; globals seed on any read.
  for (const slug of RESEED_COLLECTIONS) {
    const url = `${SITE_URL}/dyrected/api/collections/${slug}`;
    const res = await fetch(url);
    log(`Reseed ${slug}: HTTP ${res.status}`);
  }
  const home = await fetch(`${SITE_URL}/`);
  log(`Reseed globals (homepage): HTTP ${home.status}`);
}

async function main() {
  log(`Starting demo reset${DRY_RUN ? " (DRY_RUN)" : ""} — keep assets on/before ${MEDIA_CUTOFF}`);
  const purgedMediaIds = await purgeCloudinary();
  await resetDatabase(purgedMediaIds);
  await reseed();
  log("Demo reset complete.");
}

main().catch((err) => {
  console.error("[reset-demo] FAILED:", err);
  process.exit(1);
});
