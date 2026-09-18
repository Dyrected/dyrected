import { describe, it, expect } from "vitest";
import {
  nanoid,
  ulid,
  uuid,
  prefixedId,
  resolvePrefix,
  generateId,
  generateDocumentId,
  CROCKFORD_BASE32,
  BASE62_ALPHABET,
} from "../utils/id.js";

describe("ID Generation Engine", () => {
  describe("nanoid", () => {
    it("generates 21-character strings by default", () => {
      const id = nanoid();
      expect(id).toHaveLength(21);
      expect(id).toMatch(/^[0-9a-zA-Z_-]{21}$/);
    });

    it("supports custom lengths", () => {
      expect(nanoid(12)).toHaveLength(12);
      expect(nanoid(32)).toHaveLength(32);
    });

    it("supports custom alphabets", () => {
      const hex = nanoid(16, "0123456789abcdef");
      expect(hex).toHaveLength(16);
      expect(hex).toMatch(/^[0-9a-f]{16}$/);
    });
  });

  describe("ulid", () => {
    it("generates 26-character Crockford Base32 strings", () => {
      const id = ulid();
      expect(id).toHaveLength(26);
      for (const char of id) {
        expect(CROCKFORD_BASE32).toContain(char);
      }
      // Never contains lookalike characters I, L, O, U
      expect(id).not.toMatch(/[ILOUilou]/);
    });

    it("sorts lexicographically by millisecond timestamp", () => {
      const t1 = 1700000000000;
      const t2 = 1700000001000;
      const u1 = ulid(t1);
      const u2 = ulid(t2);
      expect(u1 < u2).toBe(true);
    });
  });

  describe("uuid", () => {
    it("generates RFC 4122 compliant UUIDv4 strings", () => {
      const id = uuid();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe("resolvePrefix", () => {
    it("resolves prefixes from common slugs", () => {
      expect(resolvePrefix("users")).toBe("usr");
      expect(resolvePrefix("applications")).toBe("app");
      expect(resolvePrefix("members")).toBe("mem");
      expect(resolvePrefix("transactions")).toBe("txn");
    });

    it("resolves prefixes from hyphenated / underscored slugs", () => {
      expect(resolvePrefix("cob-daily-reports")).toBe("cob");
      expect(resolvePrefix("ipo-reservations")).toBe("ipo");
      expect(resolvePrefix("audit_logs")).toBe("audi");
    });

    it("resolves short slugs directly", () => {
      expect(resolvePrefix("post")).toBe("post");
      expect(resolvePrefix("tags")).toBe("tag");
      expect(resolvePrefix("page")).toBe("page");
    });

    it("prioritizes explicit custom prefix", () => {
      expect(resolvePrefix("applications", "custom")).toBe("custom");
      expect(resolvePrefix("users", "my_app")).toBe("my_app");
    });

    it("falls back to 'col' when slug is empty or missing", () => {
      expect(resolvePrefix()).toBe("col");
      expect(resolvePrefix("")).toBe("col");
    });
  });

  describe("prefixedId", () => {
    it("generates Stripe-style prefixed Base62 IDs", () => {
      const id = prefixedId("cob", 16);
      expect(id.startsWith("cob_")).toBe(true);
      expect(id).toHaveLength(4 + 16); // 'cob_' (4) + 16 = 20
      const randomPart = id.slice(4);
      for (const char of randomPart) {
        expect(BASE62_ALPHABET).toContain(char);
      }
      // Random part does not contain hyphens or underscores
      expect(randomPart).not.toMatch(/[-_]/);
    });

    it("defaults to 'col' prefix and 16 characters random part", () => {
      const id = prefixedId();
      expect(id.startsWith("col_")).toBe(true);
      expect(id).toHaveLength(4 + 16);
    });
  });

  describe("generateDocumentId", () => {
    it("generates default prefixed ID from collection slug", () => {
      const id = generateDocumentId("cob-daily-reports");
      expect(id.startsWith("cob_")).toBe(true);
      expect(id).toHaveLength(20);
    });

    it("uses explicit idPrefix from CollectionConfig", () => {
      const id = generateDocumentId({
        slug: "daily-settlement-batches",
        idPrefix: "set",
      });
      expect(id.startsWith("set_")).toBe(true);
      expect(id).toHaveLength(20);
    });

    it("supports ULID idType", () => {
      const id = generateDocumentId({
        slug: "logs",
        idType: "ulid",
      });
      expect(id).toHaveLength(26);
      expect(id).not.toContain("_");
    });

    it("supports NanoID idType", () => {
      const id = generateDocumentId({
        slug: "items",
        idType: "nanoid",
      });
      expect(id).toHaveLength(21);
      expect(id.startsWith("items_")).toBe(false);
      expect(id).toMatch(/^[0-9a-zA-Z_-]{21}$/);
    });

    it("supports UUID idType", () => {
      const id = generateDocumentId({
        slug: "legacy",
        idType: "uuid",
      });
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it("supports custom idGenerator function", () => {
      const id = generateDocumentId({
        slug: "orders",
        idGenerator: (slug) => `ORD-${slug.toUpperCase()}-99`,
      });
      expect(id).toBe("ORD-ORDERS-99");
    });
  });
});
