import { defineConfig, defineNavItem } from "@dyrected/core";
import { exampleSaasAccessPolicies } from "./dyrected/access-policies";
import { postgresAdapter } from "@dyrected/db-postgres";
// Collections
import { Media } from "./dyrected/collections/media";
import { Admin } from "./dyrected/collections/admin";
import { Pages } from "./dyrected/collections/pages";
import { Blog } from "./dyrected/collections/blog";
import { Products } from "./dyrected/collections/products";
import { Authors } from "./dyrected/collections/authors";
import { exampleSaasTheme } from "./theme/site-theme";

// Globals
import { Settings } from "./dyrected/globals/settings";
import { Navigation } from "./dyrected/globals/navigation";
import { Footer } from "./dyrected/globals/footer";

// const db = postgresAdapter({
//   url: process.env.DATABASE_URL as string,
// });
export default defineConfig({
  accessPolicies: exampleSaasAccessPolicies,
  collections: [Admin, Media, Pages, Blog, Products, Authors],
  globals: [Settings, Navigation, Footer],
  admin: {
    branding: exampleSaasTheme.adminBranding,
    meta: { titleSuffix: "| SnackTrack CMS" },
    navigation: [
      defineNavItem({
        collection: "products",
        group: { name: "Catalog", icon: "Boxes", defaultExpanded: true, order: 10 },
        order: 1,
      }),
      defineNavItem({
        collection: "pages",
        group: { name: "Content", icon: "FileText", defaultExpanded: true, order: 20 },
        order: 1,
      }),
      defineNavItem({
        collection: "blog",
        group: "Content",
        order: 2,
      }),
      defineNavItem({
        collection: "authors",
        group: "Content",
        order: 3,
      }),
      defineNavItem({
        collection: "media",
        group: "Content",
        order: 4,
      }),
      defineNavItem({
        global: "settings",
        group: { name: "Settings", icon: "Settings", defaultExpanded: false, order: 30 },
        order: 1,
      }),
      defineNavItem({
        global: "navigation",
        group: "Settings",
        order: 2,
      }),
      defineNavItem({
        global: "footer",
        group: "Settings",
        order: 3,
      }),
      defineNavItem({
        collection: "admin",
        label: "Team Members",
        group: "Settings",
        order: 4,
      }),
    ],
  },
  // db,
});
