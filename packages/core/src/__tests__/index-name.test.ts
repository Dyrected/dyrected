import { describe, it, expect } from "vitest";
import { resolveIndexName } from "../utils/index-name.js";

describe("resolveIndexName", () => {
  it("keeps short names readable", () => {
    expect(resolveIndexName("uniq", "collection_wallets", ["currency"])).toBe("uniq_collection_wallets_currency");
    expect(resolveIndexName("idx", "collection_wallets", ["status", "createdAt"])).toBe(
      "idx_collection_wallets_status_createdAt",
    );
  });

  it("shortens over-long names to fit MySQL's 64-character limit, stably and uniquely", () => {
    const table = `collection_${"a".repeat(60)}`;
    const a = resolveIndexName("uniq", table, ["external_reference"]);
    expect(a.length).toBeLessThanOrEqual(63);
    expect(a).toBe(resolveIndexName("uniq", table, ["external_reference"]));
    expect(a.endsWith("_external_reference")).toBe(true);
    expect(resolveIndexName("uniq", `${table}b`, ["external_reference"])).not.toBe(a);
    expect(resolveIndexName("uniq", table, ["a", "external_reference"])).not.toBe(a);
  });
});
