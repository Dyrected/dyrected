import { describe, it, expect } from "vitest";
import { collectConfigDiagnostics } from "../utils/declarative-hooks.js";

const base = { slug: "check_ins", fields: [] } as const;

describe("admin component diagnostics", () => {
  it("accepts valid form settings", () => {
    const diagnostics = collectConfigDiagnostics({
      collections: [{ ...base, admin: { components: { createForm: "a", form: "b", formShell: "none" } } }],
      globals: [{ slug: "s", fields: [], admin: { components: { editForm: "c", formShell: "full" } } }],
    } as never);
    expect(diagnostics.filter((d) => d.source === "adminComponents")).toEqual([]);
  });

  it("flags an unknown formShell and a non-string key", () => {
    const diagnostics = collectConfigDiagnostics({
      collections: [{ ...base, admin: { components: { createForm: 5, formShell: "wide" } } }],
    } as never).filter((d) => d.source === "adminComponents");
    expect(diagnostics.map((d) => d.path)).toEqual([
      'collections["check_ins"].admin.components.createForm',
      'collections["check_ins"].admin.components.formShell',
    ]);
    expect(diagnostics[1].message).toContain('"full", "header", "none"');
  });

  it("checks globals too", () => {
    const diagnostics = collectConfigDiagnostics({
      collections: [],
      globals: [{ slug: "s", fields: [], admin: { components: { formShell: "x" } } }],
    } as never).filter((d) => d.source === "adminComponents");
    expect(diagnostics).toHaveLength(1);
  });
});
