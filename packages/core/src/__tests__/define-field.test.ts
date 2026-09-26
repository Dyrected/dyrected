import { describe, it, expect } from "vitest";
import {
  defineField,
  defineTextField,
  defineNumberField,
  defineBooleanField,
  defineRelationshipField,
  defineRichTextField,
  defineRowField,
  defineTab,
  defineBlock,
  defineBlocksField,
  defineCollection,
  defineCreatedAtField,
  defineUpdatedAtField,
  defineCreatedByField,
  defineUpdatedByField,
  defineRolesField,
  defineRoles,
} from "../index.js";
import type { Block, InferDocShape } from "../index.js";

describe("define<Type>Field helpers", () => {
  it("inject the field type at runtime and pass config through untouched", () => {
    expect(defineTextField({ name: "title", required: true })).toEqual({
      name: "title",
      required: true,
      type: "text",
    });
    expect(defineNumberField({ name: "price" })).toEqual({
      name: "price",
      type: "number",
    });
    expect(defineNumberField({ name: "rating", min: 1, max: 5 })).toEqual({
      name: "rating",
      type: "number",
      min: 1,
      max: 5,
    });
    expect(
      defineRichTextField({
        name: "body",
        features: ["bold", "italic", "link"],
      }),
    ).toEqual({
      name: "body",
      type: "richText",
      features: ["bold", "italic", "link"],
    });
    // layout-only field with no name
    expect(defineRowField({ fields: [] })).toEqual({ type: "row", fields: [] });
  });

  it("defineTab stamps admin.tab on every field and preserves existing admin options", () => {
    expect(
      defineTab({
        label: "SEO",
        fields: [
          defineTextField({ name: "metaTitle" }),
          defineTextField({
            name: "metaDescription",
            admin: { placeholder: "Summary" },
          }),
        ],
      }),
    ).toEqual([
      { name: "metaTitle", type: "text", admin: { tab: "SEO" } },
      {
        name: "metaDescription",
        type: "text",
        admin: { placeholder: "Summary", tab: "SEO" },
      },
    ]);
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
          blocks: [
            defineBlock({
              slug: "hero",
              fields: [defineTextField({ name: "heading" })],
            }),
          ],
        }),
      ],
    });
    expect(Posts.slug).toBe("posts");
    expect(Posts.fields.map((f) => f.type)).toEqual([
      "text",
      "richText",
      "blocks",
    ]);
  });

  describe("audit timestamp helpers", () => {
    it("defineCreatedAtField provides sensible defaults", () => {
      expect(defineCreatedAtField()).toEqual({
        name: "createdAt",
        label: "Created At",
        type: "datetime",
        admin: { readOnly: true },
      });
    });

    it("defineCreatedAtField allows customizing name, type, and options", () => {
      expect(
        defineCreatedAtField({
          name: "created_at",
          type: "date",
          label: "Registration Date",
          admin: { description: "Creation date" },
        }),
      ).toEqual({
        name: "created_at",
        label: "Registration Date",
        type: "date",
        admin: { readOnly: true, description: "Creation date" },
      });
    });

    it("defineUpdatedAtField provides sensible defaults", () => {
      expect(defineUpdatedAtField()).toEqual({
        name: "updatedAt",
        label: "Updated At",
        type: "datetime",
        admin: { readOnly: true },
      });
    });

    it("defineUpdatedAtField allows customizing name and options", () => {
      expect(
        defineUpdatedAtField({
          name: "updated_at",
          label: "Last Modified",
        }),
      ).toEqual({
        name: "updated_at",
        label: "Last Modified",
        type: "datetime",
        admin: { readOnly: true },
      });
    });
  });

  describe("audit user helpers", () => {
    it("defineCreatedByField defaults to relationship with users collection", () => {
      const field = defineCreatedByField();
      expect(field.name).toBe("createdBy");
      expect(field.label).toBe("Created By");
      expect(field.type).toBe("relationship");
      expect((field as any).relationTo).toBe("users");
      expect(field.admin?.readOnly).toBe(true);
      expect(typeof field.access?.update).toBe("function");
      expect((field.access as any).update()).toBe(false);
    });

    it("defineCreatedByField allows custom relationTo and options", () => {
      const field = defineCreatedByField({
        relationTo: "authors",
        label: "Author",
        admin: { description: "Record author" },
      });
      expect(field.name).toBe("createdBy");
      expect(field.label).toBe("Author");
      expect(field.type).toBe("relationship");
      expect((field as any).relationTo).toBe("authors");
      expect(field.admin?.readOnly).toBe(true);
      expect(field.admin?.description).toBe("Record author");
    });

    it("defineCreatedByField allows text user identifier type", () => {
      const field = defineCreatedByField({ type: "text" });
      expect(field.name).toBe("createdBy");
      expect(field.type).toBe("text");
      expect(field.admin?.readOnly).toBe(true);
    });

    it("defineUpdatedByField defaults to relationship with users collection", () => {
      const field = defineUpdatedByField();
      expect(field.name).toBe("updatedBy");
      expect(field.label).toBe("Updated By");
      expect(field.type).toBe("relationship");
      expect((field as any).relationTo).toBe("users");
      expect(field.admin?.readOnly).toBe(true);
      expect(typeof field.access?.update).toBe("function");
    });

    it("defineUpdatedByField allows custom relationTo and text type", () => {
      const relField = defineUpdatedByField({ relationTo: "staff" });
      expect((relField as any).relationTo).toBe("staff");

      const textField = defineUpdatedByField({ type: "text", name: "modifiedBy" });
      expect(textField.name).toBe("modifiedBy");
      expect(textField.type).toBe("text");
    });
  });

  describe("roles helpers", () => {
    it("defineRolesField provides out-of-the-box admin/editor/viewer options and update access protection", () => {
      const field = defineRolesField();
      expect(field.name).toBe("roles");
      expect(field.label).toBe("Roles");
      expect(field.type).toBe("select");
      expect(field.defaultValue).toBe("viewer");
      expect(field.options).toEqual([
        { value: "admin", label: "Admin" },
        { value: "editor", label: "Editor" },
        { value: "viewer", label: "Viewer" },
      ]);
      expect(field.access?.update).toBe(
        "user.role == 'admin' || (user.roles != null && 'admin' in user.roles)",
      );
    });

    it("defineRoles alias behaves identically to defineRolesField", () => {
      expect(defineRoles()).toEqual(defineRolesField());
    });

    it("supports singular role naming", () => {
      const field = defineRoles({ name: "role" });
      expect(field.name).toBe("role");
      expect(field.label).toBe("Role");
      expect(field.type).toBe("select");
    });

    it("supports multiSelect mode via multiple: true", () => {
      const field = defineRoles({ multiple: true });
      expect(field.type).toBe("multiSelect");
      expect(field.hasMany).toBe(true);
      expect(field.defaultValue).toEqual(["viewer"]);
    });

    it("supports custom roles shorthand string array", () => {
      const field = defineRoles({
        roles: ["admin", "moderator", "guest"],
        defaultValue: "guest",
      });
      expect(field.options).toEqual([
        { value: "admin", label: "Admin" },
        { value: "moderator", label: "Moderator" },
        { value: "guest", label: "Guest" },
      ]);
      expect(field.defaultValue).toBe("guest");
    });

    it("supports custom adminRole string and array", () => {
      const singleAdmin = defineRoles({
        roles: ["super-admin", "moderator", "member"],
        adminRole: "super-admin",
        defaultValue: "member",
      });
      expect(singleAdmin.access?.update).toBe(
        "user.role == 'super-admin' || (user.roles != null && 'super-admin' in user.roles)",
      );

      const multiAdmin = defineRoles({
        roles: ["owner", "admin", "contributor"],
        adminRole: ["owner", "admin"],
      });
      expect(multiAdmin.access?.update).toBe(
        "user.role == 'owner' || (user.roles != null && 'owner' in user.roles) || user.role == 'admin' || (user.roles != null && 'admin' in user.roles)",
      );
    });
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
  defineRelationshipField({
    name: "authors",
    relationTo: "users",
    hasMany: true,
  }),
  defineRichTextField({ name: "body", required: true }),
  defineCreatedAtField(),
  defineUpdatedAtField(),
  defineCreatedByField(),
  defineUpdatedByField(),
  defineRolesField(),
  defineRoles({ name: "assignedRoles", multiple: true }),
] as const;

type InferredDoc = InferDocShape<typeof inferredFields>;

const _shapeOk: InferredDoc = {
  title: "hello", // required text -> string
  views: 3, // optional number
  featured: true, // optional boolean
  authors: ["author-1"], // hasMany relationship -> string[]
  body: "<p>hello</p>", // required richText -> HTML string
  createdAt: "2026-09-26T00:00:00.000Z",
  updatedAt: "2026-09-26T00:00:00.000Z",
  createdBy: "usr_1",
  updatedBy: "usr_1",
  roles: "admin",
  assignedRoles: ["admin", "editor"],
};

// @ts-expect-error `title` is required and cannot be omitted
const _requiredEnforced: InferredDoc = {
  views: 1,
  body: "<p>hi</p>",
};

// `defineField` must preserve literals well enough for inference too.
const genericField = defineField({
  name: "slug",
  type: "text",
  required: true,
});
const _genericOk: InferDocShape<readonly [typeof genericField]> = {
  slug: "posts-are-great",
};
