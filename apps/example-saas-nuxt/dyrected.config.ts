import { defineConfig } from "@dyrected/core";
import { exampleSaasAccessPolicies } from "./dyrected/access-policies.js";
import { postgresAdapter } from "@dyrected/db-postgres";
// Collections
import { Media } from "./dyrected/collections/media.js";
import { Admin } from "./dyrected/collections/admin.js";
import { Pages } from "./dyrected/collections/pages.js";
import { Blog } from "./dyrected/collections/blog.js";
import { Products } from "./dyrected/collections/products.js";
import { Authors } from "./dyrected/collections/authors.js";
import { exampleSaasTheme } from "./theme/site-theme.js";

// Globals
import { Settings } from "./dyrected/globals/settings.js";
import { Navigation } from "./dyrected/globals/navigation.js";
import { Footer } from "./dyrected/globals/footer.js";

// const db = postgresAdapter({
//   url: process.env.DATABASE_URL as string,
// });
export default defineConfig({
  accessPolicies: exampleSaasAccessPolicies,
  collections: [Admin, Media, Pages, Blog, Products, Authors],
  globals: [Settings, Navigation, Footer],
  admin: {
    branding: exampleSaasTheme.adminBranding,
  },
  // db,
});
