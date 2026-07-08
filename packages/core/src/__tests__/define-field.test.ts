import { describe, it, expect } from "vitest";
import {
  defineField,
  defineTextField,
  defineNumberField,
  defineBooleanField,
  defineRelationshipField,
  defineRichTextField,
  defineRowField,
  defineBlock,
  defineBlocksField,
  defineCollection,
} from "../index.js";
import type { Block, InferDocShape } from "../index.js";

describe("define<Type>Field helpers", () => {
  it("inject the field type at runtime and pass config through untouched", () => {
    expect(defineTextField({ name: "title", required: true })).toEqual({
      name: "title",
      required: true,
      type: "text",
    });
    expect(defineNumberField({ name: "price" })).toEqual({ name: "price", type: "number" });
    expect(defineRichTextField({ name: "body", features: ["bold", "italic", "link"] })).toEqual({
      name: "body",
      type: "richText",
      features: ["bold", "italic", "link"],
    });
    // layout-only field with no name
    expect(defineRowField({ fields: [] })).toEqual({ type: "row", fields: [] });
  });

  it("defineField returns the field unchanged (identity)", () => {
    const field = { name: "slug", type: "text", required: true } as const;
    expect(defineField(field)).toBe(field);
  });

  it("defineBlock returns the block unchanged (identity)", () => {
    const block: Block = { slug: "hero", fields: [] };
    expect(defineBlock(block)).toBe(block);
  });

  it("compose with defineCollection", () => {
    const Posts = defineCollection({
      slug: "posts",
      fields: [
        defineTextField({ name: "title", required: true }),
        defineRichTextField({ name: "body" }),
        defineBlocksField({
          name: "layout",
          blocks: [defineBlock({ slug: "hero", fields: [defineTextField({ name: "heading" })] })],
        }),
      ],
    });
    expect(Posts.slug).toBe("posts");
    expect(Posts.fields.map((f) => f.type)).toEqual(["text", "richText", "blocks"]);
  });
});

/**
 * Compile-time guards: these assignments only type-check if the per-type helpers
 * preserve literal inference (name, required, hasMany, type) so that
 * {@link InferDocShape} still derives the document shape correctly. A regression
 * in the helper signatures would surface as a `tsc` error here.
 */
const inferredFields = [
  defineTextField({ name: "title", required: true }),
  defineNumberField({ name: "views" }),
  defineBooleanField({ name: "featured" }),
  defineRelationshipField({ name: "authors", relationTo: "users", hasMany: true }),
  defineRichTextField({ name: "body", required: true }),
] as const;

type InferredDoc = InferDocShape<typeof inferredFields>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _shapeOk: InferredDoc = {
  title: "hello", // required text -> string
  views: 3, // optional number
  featured: true, // optional boolean
  authors: ["author-1"], // hasMany relationship -> string[]
  body: { type: "doc" }, // required richText -> Record<string, unknown>
};

// @ts-expect-error `title` is required and cannot be omitted
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _requiredEnforced: InferredDoc = {
  views: 1,
  body: {},
};

// `defineField` must preserve literals well enough for inference too.
const genericField = defineField({ name: "slug", type: "text", required: true });
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _genericOk: InferDocShape<readonly [typeof genericField]> = { slug: "posts-are-great" };
