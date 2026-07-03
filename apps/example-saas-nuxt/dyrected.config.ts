import { defineConfig } from "@dyrected/core";

// Collections
import { Media } from "./dyrected/collections/media.ts";
import { Admin } from "./dyrected/collections/admin.ts";
import { Pages } from "./dyrected/collections/pages.ts";
import { Blog } from "./dyrected/collections/blog.ts";
import { Products } from "./dyrected/collections/products.ts";
import { Authors } from "./dyrected/collections/authors.ts";

// Globals
import { Settings } from "./dyrected/globals/settings.ts";
import { Navigation } from "./dyrected/globals/navigation.ts";
import { Footer } from "./dyrected/globals/footer.ts";

export default defineConfig({
  collections: [Admin, Media, Pages, Blog, Products, Authors],
  globals: [Settings, Navigation, Footer],
  admin: {
    branding: {
      logoText: "SnackTrack CMS", // replaces the Dyrected logo
    },
  },
});
