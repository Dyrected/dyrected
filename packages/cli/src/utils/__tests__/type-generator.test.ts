import { describe, it, expect } from "vitest";
import { generateTypes, flattenFields, collectComponentKeys } from "../type-generator.js";

describe("type-generator: flattenFields and generateTypes", () => {
  it("flattens row layout fields into top-level fields", () => {
    const fields = [
      { name: "id", type: "text" },
      {
        type: "row",
        fields: [
          { name: "firstName", type: "text", required: true },
          { name: "lastName", type: "text", required: true },
        ],
      },
      { name: "email", type: "email" },
    ];

    const flattened = flattenFields(fields);
    expect(flattened.map((f: any) => f.name)).toEqual([
      "id",
      "firstName",
      "lastName",
      "email",
    ]);
  });

  it("generates typescript interfaces with flattened row fields", () => {
    const schema = {
      collections: [
        {
          slug: "customers",
          fields: [
            {
              type: "row",
              fields: [
                { name: "firstName", type: "text", required: true },
                { name: "lastName", type: "text" },
              ],
            },
            { name: "company", type: "text" },
          ],
        },
      ],
      globals: [],
    };

    const code = generateTypes(schema);

    expect(code).toContain("export interface Customers {");
    expect(code).toContain("firstName: string;");
    expect(code).toContain("lastName?: string;");
    expect(code).toContain("company?: string;");
  });

  it("collects component keys from fields, slots, forms, layouts, and pages", () => {
    const schema = {
      admin: {
        components: {
          beforeDashboard: ["analytics-summary"],
          afterDashboard: "feed-stream",
        },
        pages: [
          { slug: "scanner", component: "door-scanner" },
          { slug: "door-checkin", component: "door-checkin" },
        ],
      },
      collections: [
        {
          slug: "check_ins",
          admin: {
            components: {
              beforeList: ["checkin-banner"],
              collectionView: {
                beforeViewHeader: ["qr-button"],
              },
            },
          },
          views: [
            { slug: "chart", components: { afterViewContent: ["chart-legend"] } },
          ],
          detail: [
            {
              type: "tabs",
              tabs: [
                { type: "tab", label: "Pass", items: [{ type: "custom", name: "PassPreview" }] },
              ],
            },
          ],
          fields: [
            {
              name: "scanner",
              type: "text",
              admin: { component: "check_ins.checkInScanner" },
            },
          ],
        },
      ],
      globals: [],
    };

    const keys = collectComponentKeys(schema);

    expect(Array.from(keys.fields)).toEqual(["check_ins.checkInScanner"]);
    expect(Array.from(keys.dashboard)).toContain("analytics-summary");
    expect(Array.from(keys.dashboard)).toContain("feed-stream");
    expect(Array.from(keys.pages)).toContain("door-scanner");
    expect(Array.from(keys.pages)).toContain("door-checkin");
    expect(Array.from(keys.collectionList)).toContain("checkin-banner");
    expect(Array.from(keys.collectionView)).toContain("qr-button");
    expect(Array.from(keys.collectionView)).toContain("chart-legend");
    expect(Array.from(keys.customComponents)).toContain("PassPreview");

    const code = generateTypes(schema);

    expect(code).toContain("declare module \"@dyrected/sdk\" {");
    expect(code).toContain("interface Register {");
    expect(code).toContain("schema: DyrectedSchema;");
    expect(code).toContain("componentKeys: {");
    expect(code).toContain('fields: "check_ins.checkInScanner";');
    expect(code).toMatch(/collectionView: "(qr-button" \| "chart-legend|chart-legend" \| "qr-button)";/);
    expect(code).toContain("forms: string;");
    expect(code).toContain('customComponents: "PassPreview";');
  });
});
