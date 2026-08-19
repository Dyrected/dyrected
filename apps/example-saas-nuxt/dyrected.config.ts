import { defineConfig } from "@dyrected/core";
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
  },
  // db,
});
