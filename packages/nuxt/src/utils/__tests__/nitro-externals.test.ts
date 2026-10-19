import { describe, expect, it } from "vitest";
import { addNitroInlineExternals } from "../nitro-externals";

const bundles = (inline: Array<string | RegExp | ((id: string) => boolean)> | undefined, id: string) =>
  (inline ?? []).some((rule) =>
    typeof rule === "string" ? rule === id : rule instanceof RegExp ? rule.test(id) : rule(id),
  );

describe("addNitroInlineExternals", () => {
  it("bundles react-router and react-router-dom, including deep imports", () => {
    const nitro = {};
    addNitroInlineExternals(nitro);
    const inline = (nitro as any).externals.inline;

    expect(bundles(inline, "@dyrected/nuxt")).toBe(true);
    expect(bundles(inline, "react-router")).toBe(true);
    expect(bundles(inline, "react-router-dom")).toBe(true);
    expect(bundles(inline, "react-router/dom")).toBe(true);
    expect(bundles(inline, "react-router/dist/development/dom-export.mjs")).toBe(true);
  });

  it("does not match unrelated packages", () => {
    const nitro = {};
    addNitroInlineExternals(nitro);
    const inline = (nitro as any).externals.inline;

    expect(bundles(inline, "react")).toBe(false);
    expect(bundles(inline, "react-routerish")).toBe(false);
    expect(bundles(inline, "vue-router")).toBe(false);
  });

  it("keeps the app's own inline rules", () => {
    const custom = /^my-lib/;
    const nitro = { externals: { inline: [custom, "other"] } };
    addNitroInlineExternals(nitro);

    expect(nitro.externals.inline).toContain(custom);
    expect(nitro.externals.inline).toContain("other");
    expect(bundles(nitro.externals.inline, "react-router-dom")).toBe(true);
  });

  it("is idempotent", () => {
    const nitro = {};
    addNitroInlineExternals(nitro);
    const first = [...(nitro as any).externals.inline];
    addNitroInlineExternals(nitro);
    expect((nitro as any).externals.inline).toEqual(first);
  });
});
