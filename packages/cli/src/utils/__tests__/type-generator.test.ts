import { describe, it, expect } from "vitest";
import { generateTypes, flattenFields } from "../type-generator.js";

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
});
