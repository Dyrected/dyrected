import { describe, it, expect } from "vitest";
import {
  defineBlock,
  defineBlocksField,
  defineConfig,
  defineCollection,
  defineGlobal,
  defineRichTextField,
  defineTextField,
  normalizeConfig,
  type AdminIconName,
} from "../index.js";
import { MockDatabaseAdapter } from "./mocks.js";
import { mergeDynamicConfig } from "../utils/block-references.js";

describe("Configuration Helpers", () => {
  it("only accepts valid Lucide names for admin navigation icons", () => {
    const icon: AdminIconName = "Newspaper";
    // @ts-expect-error — invalid names must fail during configuration authoring.
    const invalidIcon: AdminIconName = "DefinitelyNotALucideIcon";

    expect(icon).toBe("Newspaper");
    expect(invalidIcon).toBe("DefinitelyNotALucideIcon");
  });

  it("should define a collection correctly", () => {
    const posts = defineCollection({
      slug: "posts",
      fields: [{ name: "title", type: "text", label: "Title", required: true }],
    });

    expect(posts.slug).toBe("posts");
    expect(posts.fields[0].name).toBe("title");
  });

  it("should define a global correctly", () => {
    const navbar = defineGlobal({
      slug: "navbar",
      fields: [{ name: "logo", type: "text", label: "Logo" }],
    });

    expect(navbar.slug).toBe("navbar");
  });

  it("should define a main config correctly", () => {
    const config = defineConfig({
      collections: [],
      globals: [],
      db: new MockDatabaseAdapter(),
    });

    expect(config.collections).toEqual([]);
    expect(config.db).toBeInstanceOf(MockDatabaseAdapter);
  });

  it("re-asserts email/password integrity constraints on an auth collection even when redefined", () => {
    const normalized = normalizeConfig(
      defineConfig({
        collections: [
          defineCollection({
            slug: "users",
            auth: true,
            fields: [
              // Developer redefines email without `unique` — it must not be silently dropped.
              { name: "email", type: "email", label: "Work email" },
              { name: "password", type: "text" },
            ],
          }),
        ],
        globals: [],
        db: new MockDatabaseAdapter(),
      }),
    );

    const users = normalized.collections.find((c) => c.slug === "users")!;
    const email = users.fields.find((f) => f.name === "email")!;
    const password = users.fields.find((f) => f.name === "password")!;

    expect(email.unique).toBe(true);
    expect(email.required).toBe(true);
    expect(email.promoted).toBe(true);
    expect(email.access?.update).toBe("!id");
    // Developer customization (label) is preserved.
    expect(email.label).toBe("Work email");

    expect(password.required).toBe(true);
    expect(password.access?.update).toBe("!id || user.id == id");
  });

  it("rejects components passed directly into admin.components configuration (type test)", () => {
    const FakeComponent = () => "div";

    const validDashboard = defineConfig({
      collections: [],
      globals: [],
      db: new MockDatabaseAdapter(),
      admin: {
        components: {
          beforeDashboard: ["custom-banner"],
        },
      },
    });

    const invalidDashboard = defineConfig({
      collections: [],
      globals: [],
      db: new MockDatabaseAdapter(),
      admin: {
        components: {
          // @ts-expect-error — must be an array of strings
          beforeDashboard: [FakeComponent],
          // @ts-expect-error — must be an array of strings
          afterDashboard: FakeComponent,
        },
      },
    });

    const validCollection = defineCollection({
      slug: "posts",
      fields: [],
      admin: {
        components: {
          beforeList: ["custom-header"],
          beforeListTable: ["custom-filters"],
          afterListTable: ["custom-footer"],
          afterList: ["custom-pagination"],
        },
      },
    });

    const invalidCollection = defineCollection({
      slug: "posts",
      fields: [],
      admin: {
        components: {
          // @ts-expect-error — must be an array of strings
          beforeList: [FakeComponent],
        },
      },
    });

    expect(validDashboard.admin?.components?.beforeDashboard).toEqual([
      "custom-banner",
    ]);
    expect(validCollection.admin?.components?.beforeList).toEqual([
      "custom-header",
    ]);
  });

  it("type-checks collection admin field references against declared top-level fields", () => {
    const valid = defineCollection({
      slug: "articles",
      fields: [
        { name: "title", type: "text", label: "Title" },
        { name: "summary", type: "textarea", label: "Summary" },
        { name: "author", type: "relationship", label: "Author", relationTo: "authors" },
      ],
      admin: {
        useAsTitle: "title",
        defaultColumns: ["title", "summary"],
        searchableFields: ["title", "summary", "author"],
      },
    });

    const invalid = defineCollection({
      slug: "articles-invalid",
      fields: [
        { name: "title", type: "text", label: "Title" },
        { name: "summary", type: "textarea", label: "Summary" },
      ],
      admin: {
        // @ts-expect-error -- must match a declared top-level field name
        useAsTitle: "headline",
        // @ts-expect-error -- every column must match a declared top-level field name
        defaultColumns: ["title", "headline"],
        // @ts-expect-error -- every searchable field must match a declared top-level field name
        searchableFields: ["summary", "seoTitle"],
      },
    });

    expect(valid.admin?.useAsTitle).toBe("title");
    expect(valid.admin?.defaultColumns).toEqual(["title", "summary"]);
    expect(valid.admin?.searchableFields).toEqual(["title", "summary", "author"]);
    expect(invalid.admin?.useAsTitle).toBe("headline");
  });

  it("type-checks nested array/object admin.useAsTitle against declared child fields", () => {
    const valid = defineCollection({
      slug: "pages",
      fields: [
        {
          name: "links",
          type: "array",
          label: "Links",
          admin: { useAsTitle: "label" },
          fields: [
            { name: "label", type: "text", label: "Label" },
            { name: "url", type: "text", label: "URL" },
          ],
        },
        {
          name: "seo",
          type: "object",
          label: "SEO",
          admin: { useAsTitle: "title" },
          fields: [
            { name: "title", type: "text", label: "Meta title" },
            { name: "description", type: "textarea", label: "Meta description" },
          ],
        },
      ],
    });

    const invalid = defineCollection({
      slug: "pages-invalid",
      fields: [
        {
          name: "links",
          type: "array",
          label: "Links",
          // @ts-expect-error -- nested admin.useAsTitle must match a declared child field name
          admin: { useAsTitle: "headline" },
          fields: [
            { name: "label", type: "text", label: "Label" },
            { name: "url", type: "text", label: "URL" },
          ],
        },
      ],
    });

    expect(valid.fields[0].admin?.useAsTitle).toBe("label");
    expect(valid.fields[1].admin?.useAsTitle).toBe("title");
    expect((invalid.fields[0].admin as { useAsTitle?: string } | undefined)?.useAsTitle).toBe("headline");
  });

  it("merges dynamic accessPolicies on top of the base config", () => {
    const base = defineConfig({
      collections: [],
      globals: [],
      accessPolicies: {
        builtIn: true,
      },
      db: new MockDatabaseAdapter(),
    });

    const merged = mergeDynamicConfig(base, {
      collections: [],
      globals: [],
      accessPolicies: {
        builtIn: "user != null",
        ownDocs: "{ owner: { equals: user.sub } }",
      },
    });

    expect(merged.accessPolicies).toEqual({
      builtIn: "user != null",
      ownDocs: "{ owner: { equals: user.sub } }",
    });
  });

  it("normalizes drafts: true to simplePublishingWorkflow", () => {
    const normalized = normalizeConfig(
      defineConfig({
        collections: [
          defineCollection({
            slug: "posts",
            drafts: true,
            fields: [],
          }),
        ],
        globals: [],
        db: new MockDatabaseAdapter(),
      }),
    );

    const posts = normalized.collections.find((c) => c.slug === "posts")!;
    expect(posts.workflow).toBeDefined();
    expect(posts.workflow?.initialState).toBe("draft");
    expect(posts.workflow?.states.map((s) => s.name)).toEqual([
      "draft",
      "published",
    ]);
  });

  it("resolves blockReferences from the root reusable block registry", () => {
    const HeroBlock = defineBlock({
      slug: "hero",
      fields: [defineTextField({ name: "heading", label: "Heading" })],
    });

    const normalized = normalizeConfig(
      defineConfig({
        blocks: [HeroBlock],
        collections: [
          defineCollection({
            slug: "pages",
            fields: [
              defineBlocksField({
                name: "layout",
                label: "Layout",
                blockReferences: ["hero"],
              }),
            ],
          }),
        ],
        globals: [],
        db: new MockDatabaseAdapter(),
      }),
    );

    const layoutField = normalized.collections
      .find((c) => c.slug === "pages")
      ?.fields.find((f) => f.name === "layout");

    expect(layoutField?.type).toBe("blocks");
    expect(layoutField?.blockReferences).toEqual(["hero"]);
    expect(layoutField?.blocks?.map((block) => block.slug)).toEqual(["hero"]);
    expect(layoutField?.blocks?.[0]?.fields[0]?.name).toBe("heading");
  });

  it("type-checks named access policies and cross-config string references", () => {
    const HeroBlock = defineBlock({
      slug: "hero",
      fields: [
        defineTextField({ name: "heading", label: "Heading" }),
        defineRichTextField({
          name: "content",
          label: "Content",
          uploadCollection: "media",
        }),
      ],
    });

    const Users = defineCollection({
      slug: "users",
      auth: true,
      fields: [{ name: "name", type: "text", label: "Name" }],
    });

    const Media = defineCollection({
      slug: "media",
      upload: true,
      fields: [{ name: "alt", type: "text", label: "Alt" }],
    });

    const Posts = defineCollection({
      slug: "posts",
      access: {
        read: { policy: "canReadPosts" },
      },
      workflow: {
        initialState: "draft",
        states: [
          { name: "draft", label: "Draft" },
          { name: "published", label: "Published", published: true },
        ],
        transitions: [
          {
            name: "publish",
            label: "Publish",
            from: "draft",
            to: "published",
          },
        ],
      },
      fields: [
        {
          name: "title",
          type: "text",
          label: "Title",
          access: { read: { policy: "canReadPosts" } },
        },
        {
          name: "author",
          type: "relationship",
          label: "Author",
          relationTo: "users",
        },
        defineBlocksField({
          name: "layout",
          label: "Layout",
          blockReferences: ["hero"],
        }),
      ],
    });

    const valid = defineConfig({
      blocks: [HeroBlock],
      collections: [Users, Media, Posts],
      globals: [
        defineGlobal({
          slug: "settings",
          access: { read: { policy: "canReadPosts" } },
          fields: [
            defineRichTextField({
              name: "homepageBody",
              label: "Homepage body",
              uploadCollection: "media",
            }),
          ],
        }),
      ],
      adminAuth: {
        mode: "local",
        collectionSlug: "users",
        providers: [],
      },
      accessPolicies: {
        canReadPosts: true,
      },
      db: new MockDatabaseAdapter(),
    });

    const invalid = defineConfig({
      blocks: [HeroBlock],
      collections: [
        Users,
        Media,
        defineCollection({
          slug: "articles",
          access: {
            // @ts-expect-error -- policy names must exist on accessPolicies
            read: { policy: "missingPolicy" },
          },
          workflow: {
            // @ts-expect-error -- initialState must exist in workflow.states
            initialState: "queued",
            states: [{ name: "draft", label: "Draft" }],
            transitions: [
              {
                name: "publish",
                label: "Publish",
                // @ts-expect-error -- transition from/to values must reference workflow.states
                from: "queued",
                // @ts-expect-error -- transition from/to values must reference workflow.states
                to: "published",
              },
            ],
          },
          fields: [
            {
              name: "author",
              type: "relationship",
              label: "Author",
              // @ts-expect-error -- relationTo must match a configured collection slug
              relationTo: "people",
            },
            defineBlocksField({
              name: "layout",
              label: "Layout",
              // @ts-expect-error -- blockReferences must match defineConfig({ blocks })
              blockReferences: ["cta"],
            }),
            defineRichTextField({
              name: "body",
              label: "Body",
              // @ts-expect-error -- uploadCollection must reference an upload-enabled collection
              uploadCollection: "users",
            }),
          ],
        }),
      ],
      globals: [],
      adminAuth: {
        mode: "local",
        // @ts-expect-error -- admin auth collectionSlug must reference an auth-enabled collection
        collectionSlug: "media",
        providers: [],
      },
      accessPolicies: {
        canReadPosts: true,
      },
      db: new MockDatabaseAdapter(),
    });

    expect(valid.collections).toHaveLength(3);
    expect(valid.adminAuth?.collectionSlug).toBe("users");
    expect(invalid.adminAuth?.collectionSlug).toBe("media");
  });
});
