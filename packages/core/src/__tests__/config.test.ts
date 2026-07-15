import { describe, it, expect } from "vitest";
import {
  defineBlock,
  defineBlocksField,
  defineConfig,
  defineCollection,
  defineGlobal,
  defineTextField,
  normalizeConfig,
  type AdminIconName,
} from "../index.js";
import { MockDatabaseAdapter } from "./mocks.js";

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
      fields: [{ name: "title", type: "text", required: true }],
    });

    expect(posts.slug).toBe("posts");
    expect(posts.fields[0].name).toBe("title");
  });

  it("should define a global correctly", () => {
    const navbar = defineGlobal({
      slug: "navbar",
      fields: [{ name: "logo", type: "text" }],
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
});
