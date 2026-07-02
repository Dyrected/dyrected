import { defineConfig } from "@dyrected/core";
import { SqliteAdapter } from "@dyrected/db-sqlite";
import { LocalStorageAdapter } from "@dyrected/storage-local";
import path from "node:path";

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
  db: new SqliteAdapter({
    filename: "dyrected.db",
  }),
  storage: new LocalStorageAdapter({
    uploadDir: path.resolve(process.cwd(), "public/uploads"),
    staticUrlPrefix: "/uploads",
  }),
  admin: {
    branding: {
      logoText: "Acme CMS", // replaces the Dyrected logo
    },
  },
});
