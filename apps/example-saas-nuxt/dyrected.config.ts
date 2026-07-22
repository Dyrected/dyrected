import { defineConfig } from "@dyrected/core";
import { exampleSaasAccessPolicies } from "./dyrected/access-policies.ts";
import { postgresAdapter } from "@dyrected/db-postgres";
// Collections
import { Media } from "./dyrected/collections/media.ts";
import { Admin } from "./dyrected/collections/admin.ts";
import { Pages } from "./dyrected/collections/pages.ts";
import { Blog } from "./dyrected/collections/blog.ts";
import { Products } from "./dyrected/collections/products.ts";
import { Authors } from "./dyrected/collections/authors.ts";
import { exampleSaasTheme } from "./theme/site-theme.ts";

// Globals
import { Settings } from "./dyrected/globals/settings.ts";
import { Navigation } from "./dyrected/globals/navigation.ts";
import { Footer } from "./dyrected/globals/footer.ts";

const db = postgresAdapter({
  url: process.env.DATABASE_URL as string,
});
export default defineConfig({
  accessPolicies: exampleSaasAccessPolicies,
  collections: [Admin, Media, Pages, Blog, Products, Authors],
  globals: [Settings, Navigation, Footer],
  admin: {
    branding: exampleSaasTheme.adminBranding,
  },
  db,
});
