import { describe, expect, it } from "vitest";
import { sanitizeWhereClause } from "../utils/where-sanitizer.js";
import type { Field } from "../types/index.js";

describe("sanitizeWhereClause", () => {
  const fields: Field[] = [
    { name: "leadName", type: "text" },
    { name: "wantsAsoebi", type: "boolean" },
    { name: "wantsAsoOke", type: "boolean" },
    { name: "asoebiPaymentStatus", type: "select", options: ["pending", "received"] },
    { name: "secretNotes", type: "text", admin: { filterable: false } },
    { name: "password", type: "password" as any },
  ];

  it("preserves uppercase OR and AND", () => {
    const where = {
      OR: [{ wantsAsoebi: { equals: true } }, { wantsAsoOke: { equals: true } }],
    };
    const sanitized = sanitizeWhereClause(where, fields);
    expect(sanitized).toEqual({
      OR: [{ wantsAsoebi: { equals: true } }, { wantsAsoOke: { equals: true } }],
    });
  });

  it("preserves and normalizes lowercase or and and", () => {
    const where = {
      or: [{ wantsAsoebi: { equals: true } }, { wantsAsoOke: { equals: true } }],
    };
    const sanitized = sanitizeWhereClause(where as any, fields);
    expect(sanitized).toEqual({
      OR: [{ wantsAsoebi: { equals: true } }, { wantsAsoOke: { equals: true } }],
    });
  });

  it("strips non-existent fields and unfilterable fields", () => {
    const where = {
      AND: [
        { leadName: { equals: "Adun" } },
        { nonexistentField: { equals: "value" } },
        { secretNotes: { equals: "hidden" } },
        { password: { equals: "123456" } },
      ],
    };
    const sanitized = sanitizeWhereClause(where, fields);
    expect(sanitized).toEqual({
      AND: [{ leadName: { equals: "Adun" } }],
    });
  });

  it("preserves system fields like folderId, id, createdAt, updatedAt, and filename", () => {
    const where = {
      folderId: { equals: "a4e4ch" },
      createdAt: { greater_than: "2026-01-01" },
    };
    const sanitized = sanitizeWhereClause(where, fields);
    expect(sanitized).toEqual({
      folderId: { equals: "a4e4ch" },
      createdAt: { greater_than: "2026-01-01" },
    });
  });
});
