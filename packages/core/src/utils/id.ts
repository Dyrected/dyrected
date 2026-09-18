import { randomBytes, randomUUID } from "node:crypto";

export const NANOID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
export const BASE62_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const COMMON_SLUG_PREFIXES: Record<string, string> = {
  users: "usr",
  members: "mem",
  accounts: "acc",
  applications: "app",
  customers: "cus",
  products: "prd",
  orders: "ord",
  reports: "rpt",
  sessions: "ses",
  transactions: "txn",
  wallets: "wal",
  media: "med",
  files: "fil",
  posts: "post",
  pages: "page",
  tags: "tag",
  categories: "cat",
  comments: "com",
};

/**
 * Generates an unbiased cryptographically secure NanoID string.
 *
 * @param size Number of characters to generate (default: 21)
 * @param alphabet Characters to draw from (default: URL-safe Base64 alphanumeric)
 */
export function nanoid(size: number = 21, alphabet: string = NANOID_ALPHABET): string {
  const mask = (2 << (31 - Math.clz32((alphabet.length - 1) | 1))) - 1;
  const step = Math.ceil((1.6 * mask * size) / alphabet.length);
  let id = "";
  while (true) {
    const bytes = randomBytes(step);
    for (let i = 0; i < step; i++) {
      const byte = bytes[i] & mask;
      if (alphabet[byte]) {
        id += alphabet[byte];
        if (id.length === size) return id;
      }
    }
  }
}

/**
 * Encodes a 48-bit millisecond timestamp into 10 Crockford Base32 characters.
 */
function encodeUlidTime(now: number, len: number = 10): string {
  let str = "";
  let time = Math.floor(now);
  for (let i = len - 1; i >= 0; i--) {
    const mod = time % 32;
    str = CROCKFORD_BASE32[mod] + str;
    time = (time - mod) / 32;
  }
  return str;
}

/**
 * Encodes 80 bits (10 bytes) of randomness into 16 Crockford Base32 characters.
 */
function encodeUlidRandom(bytes: Uint8Array): string {
  let str = "";
  let bitBuffer = 0;
  let bitsInBuffer = 0;
  for (let i = 0; i < bytes.length; i++) {
    bitBuffer = (bitBuffer << 8) | bytes[i];
    bitsInBuffer += 8;
    while (bitsInBuffer >= 5) {
      bitsInBuffer -= 5;
      const index = (bitBuffer >> bitsInBuffer) & 0x1f;
      str += CROCKFORD_BASE32[index];
    }
  }
  return str;
}

/**
 * Generates a 26-character time-sortable ULID (Universally Unique Lexicographically Sortable Identifier).
 *
 * The first 10 characters encode the millisecond timestamp, followed by 16 cryptographically secure
 * random Crockford Base32 characters. ULIDs sort in chronological order, making them optimal
 * for B-tree index locality in relational databases.
 *
 * @param seedTime Optional millisecond timestamp (default: Date.now())
 */
export function ulid(seedTime: number = Date.now()): string {
  const timePart = encodeUlidTime(seedTime);
  const randPart = encodeUlidRandom(randomBytes(10));
  return timePart + randPart;
}

/**
 * Standard RFC 4122 UUIDv4 generator wrapper.
 */
export function uuid(): string {
  return randomUUID();
}

/**
 * Resolves a clean 3-4 character prefix for a collection slug or explicit prefix.
 *
 * @example
 * resolvePrefix('cob-daily-reports') // 'cob'
 * resolvePrefix('ipo-reservations')   // 'ipo'
 * resolvePrefix('users')              // 'usr'
 * resolvePrefix('applications')       // 'app'
 * resolvePrefix('anything', 'custom') // 'custom'
 */
export function resolvePrefix(slug?: string, explicitPrefix?: string): string {
  if (explicitPrefix && typeof explicitPrefix === "string" && explicitPrefix.trim().length > 0) {
    const cleaned = explicitPrefix.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (cleaned.length > 0) return cleaned;
  }
  if (!slug || typeof slug !== "string") return "col";
  const s = slug.trim().toLowerCase();
  if (COMMON_SLUG_PREFIXES[s]) return COMMON_SLUG_PREFIXES[s];

  const pieces = s.split(/[-_]/).filter(Boolean);
  if (pieces.length > 1 && pieces[0].length >= 2) {
    const first = pieces[0].replace(/[^a-z0-9]/g, "");
    if (first.length >= 2) return first.slice(0, 4);
  }

  const cleanWord = s.replace(/[^a-z0-9]/g, "");
  if (cleanWord.length <= 4) return cleanWord || "col";

  return cleanWord.slice(0, 3) || "col";
}

/**
 * Generates a Stripe-style prefixed NanoID (e.g. `col_k9pQ2mZwRtx89aB1`).
 *
 * Uses Base62 for the random suffix to prevent extra underscores and hyphens in the ID body.
 *
 * @param prefix Collection prefix (e.g. 'usr', 'cob', 'app', 'col')
 * @param size Length of the random suffix (default: 16)
 */
export function prefixedId(prefix: string = "col", size: number = 16): string {
  const cleanPrefix = (prefix || "col").toLowerCase().replace(/[^a-z0-9_]/g, "") || "col";
  return `${cleanPrefix}_${nanoid(size, BASE62_ALPHABET)}`;
}

import type { IdStrategy } from "../types/schema-config.js";

export interface GenerateIdOptions {
  prefix?: string;
  type?: IdStrategy;
  size?: number;
}

/**
 * Generates an ID according to the specified options. Defaults to Stripe-style prefixed NanoID.
 */
export function generateId(options?: GenerateIdOptions | string): string {
  if (typeof options === "string") {
    return prefixedId(resolvePrefix(options));
  }
  const opts = options || {};
  const type = opts.type || "prefixed-nanoid";
  switch (type) {
    case "uuid":
      return uuid();
    case "ulid":
      return ulid();
    case "nanoid":
      return nanoid(opts.size || 21);
    case "prefixed-nanoid":
    default:
      return prefixedId(opts.prefix || "col", opts.size || 16);
  }
}

/**
 * Generates a document ID based on collection configuration or slug.
 */
export function generateDocumentId(
  collectionOrSlug?:
    | string
    | {
        slug: string;
        idPrefix?: string;
        idType?: IdStrategy;
        idGenerator?: (slug: string) => string;
      },
): string {
  if (!collectionOrSlug) {
    return prefixedId("col");
  }

  if (typeof collectionOrSlug === "string") {
    const prefix = resolvePrefix(collectionOrSlug);
    return prefixedId(prefix);
  }

  if (typeof collectionOrSlug.idGenerator === "function") {
    return collectionOrSlug.idGenerator(collectionOrSlug.slug);
  }

  const type = collectionOrSlug.idType || "prefixed-nanoid";
  const prefix = resolvePrefix(collectionOrSlug.slug, collectionOrSlug.idPrefix);

  return generateId({ prefix, type });
}
