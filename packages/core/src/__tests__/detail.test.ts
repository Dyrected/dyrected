import { describe, it, expect } from "vitest";
import {
  displaySection,
  displayTabs,
  displayTab,
  displayGrid,
  displayField,
  displayRepeat,
  displayComputed,
  generateDefaultDetailSchema,
  normalizeDetailItem,
  evaluateJexl,
  isDetailItemVisible,
  defineCollection,
  defineConfig,
} from "../index.js";
import { createDyrectedApp } from "../app.js";
import { InMemoryAdapter } from "./mocks.js";

describe("Detail View Helpers & Schemas", () => {
  it("normalizes shorthand strings into field items", () => {
    expect(normalizeDetailItem("title")).toEqual({
      type: "field",
      field: "title",
    });

    const fullItem = displayField("title", { span: 6 });
    expect(normalizeDetailItem(fullItem)).toBe(fullItem);
  });

  it("creates valid section structures with 12-column spans and options", () => {
    const section = displaySection(
      "Product Information",
      [displayField("name", { span: 8 }), displayField("sku", { span: 4 })],
      {
        span: 8,
        icon: "package",
        description: "Core product info",
        collapsible: true,
      },
    );

    expect(section).toEqual({
      type: "section",
      title: "Product Information",
      items: [
        { type: "field", field: "name", options: { span: 8 } },
        { type: "field", field: "sku", options: { span: 4 } },
      ],
      options: {
        span: 8,
        icon: "package",
        description: "Core product info",
        collapsible: true,
      },
    });
  });

  it("creates valid tabs structures with badges and icons", () => {
    const tabs = displayTabs(
      [
        displayTab("Specifications", [displayField("specs")], {
          icon: "file-text",
        }),
        displayTab("Reviews", [displayRepeat("reviews", [displayField("rating")])], {
          icon: "message-square",
          badge: "count(doc.reviews)",
        }),
      ],
      { span: 12 },
    );

    expect(tabs.type).toBe("tabs");
    expect(tabs.tabs).toHaveLength(2);
    expect(tabs.tabs[0].label).toBe("Specifications");
    expect(tabs.tabs[1].options?.badge).toBe("count(doc.reviews)");
  });

  it("creates valid grid containers", () => {
    const grid = displayGrid(2, [
      displayField("firstName"),
      displayField("lastName"),
    ]);

    expect(grid).toEqual({
      type: "grid",
      columns: 2,
      items: [
        { type: "field", field: "firstName", options: undefined },
        { type: "field", field: "lastName", options: undefined },
      ],
      options: undefined,
    });
  });

  it("creates repeat structures in table, cards, and list layouts", () => {
    const tableRepeat = displayRepeat(
      "items",
      [displayField("product"), displayField("qty")],
      { layout: "table" },
    );
    expect(tableRepeat.options?.layout).toBe("table");

    const cardsRepeat = displayRepeat("reviews", [displayField("comment")], {
      layout: "cards",
    });
    expect(cardsRepeat.options?.layout).toBe("cards");

    const listRepeat = displayRepeat("logs", [displayField("event")], {
      layout: "list",
    });
    expect(listRepeat.options?.layout).toBe("list");
  });

  it("creates computed items with JEXL expressions and custom IDs", () => {
    const computedShorthand = displayComputed(
      "Reading Time",
      'math.ceil(doc.wordCount / 200) + " min"',
    );

    expect(computedShorthand).toEqual({
      type: "computed",
      id: "reading_time",
      label: "Reading Time",
      expression: 'math.ceil(doc.wordCount / 200) + " min"',
      handler: undefined,
      options: undefined,
    });
  });

  it("generates automatic default detail schema when omitted", () => {
    const generated = generateDefaultDetailSchema({
      slug: "articles",
      labels: { singular: "Article", plural: "Articles" },
      fields: [
        { name: "title", type: "text" },
        { name: "content", type: "richText" },
        { name: "status", type: "select", options: ["draft", "live"] },
      ],
    });

    expect(generated).toHaveLength(2);
    expect(generated[0].type).toBe("section");
    expect((generated[0] as any).title).toBe("Article");
    expect((generated[0] as any).options?.span).toBe(8);
    expect((generated[1] as any).title).toBe("Overview");
    expect((generated[1] as any).options?.span).toBe(4);
  });
});

describe("JEXL Shared Evaluator & Math Functions", () => {
  it("evaluates math expressions with full namespace support", async () => {
    const doc = { price: 249.99, quantity: 3, weight: 12.4 };

    expect(await evaluateJexl("math.ceil(doc.weight)", { doc })).toBe(13);
    expect(await evaluateJexl("math.floor(doc.weight)", { doc })).toBe(12);
    expect(await evaluateJexl("math.round(doc.price * doc.quantity, 2)", { doc })).toBe(
      749.97,
    );
    expect(await evaluateJexl("min(10, 20, 5)", {})).toBe(5);
    expect(await evaluateJexl("max(10, 20, 5)", {})).toBe(20);
    expect(await evaluateJexl("sum([10, 20, 30])", {})).toBe(60);
    expect(await evaluateJexl("count(['a', 'b', 'c'])", {})).toBe(3);
  });

  it("handles empty or invalid expressions gracefully", async () => {
    expect(await evaluateJexl("", {})).toBeUndefined();
    expect(await evaluateJexl("invalid.syntax(()", {})).toBeUndefined();
  });
});

describe("Schema Projection & Computed Pipeline Integration", () => {
  it("projects detail schema cleanly in /api/schemas", async () => {
    const db = new InMemoryAdapter();
    const config = defineConfig({
      collections: [
        defineCollection({
          slug: "products",
          fields: [
            { name: "name", type: "text" },
            { name: "price", type: "number" },
          ],
          detail: [
            displaySection("Info", [displayField("name", { span: 12 })], {
              span: 8,
              icon: "package",
            }),
            displayComputed("PriceWithTax", "math.round(doc.price * 1.075, 2)"),
          ],
        }),
      ],
      globals: [],
      db,
    });

    const app = await createDyrectedApp(config);
    const res = await app.request("/api/schemas");
    const json = await res.json();

    expect(res.status).toBe(200);
    const productCol = json.collections.find((c: any) => c.slug === "products");
    expect(productCol.detail).toBeDefined();
    expect(productCol.detail).toHaveLength(2);
    expect(productCol.detail[0].title).toBe("Info");
    expect(productCol.detail[1].id).toBe("pricewithtax");
    expect(productCol.detail[1].expression).toBe("math.round(doc.price * 1.075, 2)");
  });

  it("evaluates computed values in findOne document response", async () => {
    const db = new InMemoryAdapter();
    db.seed("products", [
      { id: "prod-1", name: "Chair", price: 100, wordCount: 400 },
    ]);

    const config = defineConfig({
      collections: [
        defineCollection({
          slug: "products",
          fields: [
            { name: "name", type: "text" },
            { name: "price", type: "number" },
            { name: "wordCount", type: "number" },
          ],
          detail: [
            displayComputed("totalWithVat", "math.round(doc.price * 1.2, 2)"),
            displayComputed("readingTime", ({ doc }) => `${Math.ceil(doc.wordCount / 200)} min`),
          ],
        }),
      ],
      globals: [],
      db,
    });

    const app = await createDyrectedApp(config);
    const res = await app.request("/api/collections/products/prod-1");
    const doc = await res.json();

    expect(res.status).toBe(200);
    expect(doc.id).toBe("prod-1");
    expect(doc._meta?.computed).toBeDefined();
    expect(doc._meta.computed.totalwithvat).toBe(120);
    expect(doc._meta.computed.readingtime).toBe("2 min");
  });

  it("projects detail schema for globals in /api/schemas", async () => {
    const db = new InMemoryAdapter();
    const config = defineConfig({
      collections: [],
      globals: [
        {
          slug: "siteSettings",
          label: "Site Settings",
          fields: [
            { name: "siteName", type: "text" },
            { name: "twitter", type: "text" },
          ],
          detail: [
            displaySection("General", [displayField("siteName")]),
            displayComputed("socialCount", "count([doc.twitter])"),
          ],
        },
      ],
      db,
    });

    const app = await createDyrectedApp(config);
    const res = await app.request("/api/schemas");
    const json = await res.json();

    expect(res.status).toBe(200);
    const globalSchema = json.globals.find((g: any) => g.slug === "siteSettings");
    expect(globalSchema.detail).toBeDefined();
    expect(globalSchema.detail).toHaveLength(2);
    expect(globalSchema.detail[0].title).toBe("General");
    expect(globalSchema.detail[1].id).toBe("socialcount");
  });

  it("evaluates computed values in global get response", async () => {
    const db = new InMemoryAdapter();
    const config = defineConfig({
      collections: [],
      globals: [
        {
          slug: "siteSettings",
          label: "Site Settings",
          fields: [
            { name: "siteName", type: "text" },
            { name: "twitter", type: "text" },
            { name: "instagram", type: "text" },
          ],
          initialData: {
            siteName: "Dyrected CMS",
            twitter: "@dyrected",
            instagram: "@dyrected_cms",
          },
          detail: [
            displayComputed("configuredAccounts", "count([doc.twitter, doc.instagram])"),
            displayComputed("siteSummary", ({ doc }) => `Site: ${doc.siteName}`),
          ],
        },
      ],
      db,
    });

    const app = await createDyrectedApp(config);
    const res = await app.request("/api/globals/siteSettings");
    const doc = await res.json();

    expect(res.status).toBe(200);
    expect(doc.siteName).toBe("Dyrected CMS");
    expect(doc._meta?.computed).toBeDefined();
    expect(doc._meta.computed.configuredaccounts).toBe(2);
    expect(doc._meta.computed.sitesummary).toBe("Site: Dyrected CMS");
  });

  it("evaluates isDetailItemVisible for boolean and JEXL expressions against doc and user", () => {
    const doc = { status: "published", price: 100 };
    const user = { roles: ["admin"] };

    // Default (no visible option)
    expect(isDetailItemVisible(displayField("title"), doc, user)).toBe(true);

    // Boolean visible
    expect(isDetailItemVisible(displayField("title", { visible: true }), doc, user)).toBe(true);
    expect(isDetailItemVisible(displayField("title", { visible: false }), doc, user)).toBe(false);

    // JEXL visible expression
    expect(
      isDetailItemVisible(
        displayField("price", { visible: "doc.status == 'published'" }),
        doc,
        user,
      ),
    ).toBe(true);
    expect(
      isDetailItemVisible(
        displayField("price", { visible: "doc.status == 'draft'" }),
        doc,
        user,
      ),
    ).toBe(false);
    expect(
      isDetailItemVisible(
        displayField("adminNotes", { visible: "user.roles != null and includes(user.roles, 'admin')" }),
        doc,
        user,
      ),
    ).toBe(true);
    expect(
      isDetailItemVisible(
        displayField("editorNotes", { visible: "user.roles != null and includes(user.roles, 'editor')" }),
        doc,
        user,
      ),
    ).toBe(false);
  });
});
