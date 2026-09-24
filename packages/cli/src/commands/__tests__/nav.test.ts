import { describe, expect, it } from "vitest";
import type { DefineWorkspaceOptions, UserNavigationPreferences, DyrectedConfig } from "@dyrected/core";
import {
  serializeWorkspacesToTypeScript,
  reconcilePreferencesToWorkspaceOptions,
} from "../../utils/nav-serializer.js";
import {
  patchConfigNavigation,
  ensureDefineWorkspaceImport,
} from "../../utils/config-patcher.js";

describe("CLI Navigation Synchronization (Phase 4)", () => {
  describe("nav-serializer", () => {
    it("serializes DefineWorkspaceOptions array into clean TypeScript using defineWorkspace", async () => {
      const items: DefineWorkspaceOptions[] = [
        {
          slug: "kyc-review",
          label: "KYC Review",
          icon: "ShieldAlert",
          group: { name: "Operations", icon: "Briefcase", defaultExpanded: true, order: 10 },
          order: 1,
          badge: {
            aggregate: {
              collection: "investors",
              where: { status: { equals: "pending" } },
            },
            variant: "warning",
          },
          views: [
            {
              slug: "pending-investors",
              label: "Pending Verification",
              layout: "table",
              collection: "investors",
              columns: ["name", "email", "createdAt"],
            },
          ],
        },
        {
          collection: "media",
          group: "Content",
          order: 2,
        },
      ];

      const tsCode = await serializeWorkspacesToTypeScript(items);

      expect(tsCode).toContain("defineWorkspace({");
      expect(tsCode).toContain('slug: "kyc-review"');
      expect(tsCode).toContain('label: "KYC Review"');
      expect(tsCode).toContain('icon: "ShieldAlert"');
      expect(tsCode).toContain('name: "Operations"');
      expect(tsCode).toContain('collection: "investors"');
      expect(tsCode).toContain('collection: "media"');
      expect(tsCode.startsWith("[") && tsCode.endsWith("]")).toBe(true);
    });

    it("reconciles user preferences with base config into ordered workspace options", () => {
      const baseConfig: DyrectedConfig = {
        collections: [
          { slug: "articles", fields: [] },
          { slug: "media", fields: [] },
        ],
        globals: [
          { slug: "settings", fields: [] },
        ],
      };

      const userPrefs: UserNavigationPreferences = {
        _version: 1,
        groups: [
          { name: "Content", icon: "FileText", defaultExpanded: true, order: 1 },
          { name: "System", icon: "Settings", defaultExpanded: false, order: 2 },
        ],
        items: [
          {
            slug: "editorial-desk",
            label: "Editorial Desk",
            icon: "PenTool",
            group: "Content",
            views: [
              {
                slug: "drafts",
                label: "Draft Articles",
                layout: "table",
                collection: "articles",
              },
            ],
          },
          {
            collection: "articles",
            group: "Content",
          },
        ],
        groupOrder: ["Content", "System"],
        itemOrder: {
          Content: ["workspace_editorial-desk", "collection_articles", "collection_media"],
        },
        pinned: [],
        hidden: [],
      };

      const workspaces = reconcilePreferencesToWorkspaceOptions(userPrefs, baseConfig);

      expect(workspaces.length).toBeGreaterThanOrEqual(3);
      // First item in Content group should carry the group metadata
      const firstContentItem = workspaces.find((w) => w.slug === "editorial-desk");
      expect(firstContentItem).toBeDefined();
      expect(firstContentItem?.group).toEqual({
        name: "Content",
        icon: "FileText",
        order: 1,
      });

      // Subsequent items in Content group should just carry group name string
      const articlesItem = workspaces.find((w) => w.collection === "articles");
      expect(articlesItem).toBeDefined();
      expect(articlesItem?.group).toBe("Content");
    });

    it("filters out hidden items during preference reconciliation", () => {
      const baseConfig: DyrectedConfig = {
        collections: [
          { slug: "articles", fields: [] },
          { slug: "media", fields: [] },
        ],
        globals: [],
      };

      const userPrefs: UserNavigationPreferences = {
        _version: 1,
        hidden: ["collection_media", "media"],
      };

      const workspaces = reconcilePreferencesToWorkspaceOptions(userPrefs, baseConfig);
      const mediaItem = workspaces.find((w) => w.collection === "media");
      expect(mediaItem).toBeUndefined();
    });
  });

  describe("config-patcher", () => {
    it("ensures defineWorkspace import in file with existing core import", () => {
      const original = `import { defineConfig, defineCollection } from "@dyrected/core";\n\nexport default defineConfig({});`;
      const result = ensureDefineWorkspaceImport(original);
      expect(result).toContain("defineWorkspace");
      expect(result).toContain('from "@dyrected/core"');
    });

    it("does not duplicate defineWorkspace import if already present", () => {
      const original = `import { defineConfig, defineWorkspace } from "@dyrected/core";`;
      const result = ensureDefineWorkspaceImport(original);
      expect(result).toBe(original);
    });

    it("replaces existing navigation array inside admin block", async () => {
      const original = `import { defineConfig } from "@dyrected/core";

export default defineConfig({
  collections: [],
  admin: {
    meta: { titleSuffix: "Test" },
    navigation: [
      { collection: "old-item" }
    ],
  },
});
`;
      const serialized = `[
  defineWorkspace({
    slug: "new-workspace",
    label: "New Workspace",
    order: 1,
  }),
]`;

      const patched = await patchConfigNavigation(original, serialized);

      expect(patched).toContain("defineWorkspace");
      expect(patched).toContain('slug: "new-workspace"');
      expect(patched).not.toContain("old-item");
      expect(patched).toContain('titleSuffix: "Test"');
      expect(patched).toContain("collections: []");
    });

    it("inserts navigation into admin block when navigation is not present", async () => {
      const original = `import { defineConfig } from "@dyrected/core";

export default defineConfig({
  collections: [],
  admin: {
    meta: { titleSuffix: "Test" },
  },
});
`;
      const serialized = `[
  defineWorkspace({
    collection: "articles",
    order: 1,
  }),
]`;

      const patched = await patchConfigNavigation(original, serialized);

      expect(patched).toContain("defineWorkspace");
      expect(patched).toContain("navigation:");
      expect(patched).toContain('collection: "articles"');
      expect(patched).toContain('titleSuffix: "Test"');
    });

    it("creates admin block with navigation when admin is not present", async () => {
      const original = `import { defineConfig } from "@dyrected/core";

export default defineConfig({
  collections: [],
});
`;
      const serialized = `[
  defineWorkspace({
    collection: "posts",
    order: 1,
  }),
]`;

      const patched = await patchConfigNavigation(original, serialized);

      expect(patched).toContain("defineWorkspace");
      expect(patched).toContain("admin:");
      expect(patched).toContain("navigation:");
      expect(patched).toContain('collection: "posts"');
    });
  });
});
