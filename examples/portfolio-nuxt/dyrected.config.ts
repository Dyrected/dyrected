import { defineConfig } from "@dyrected/core";
import { SqliteAdapter } from "@dyrected/db-sqlite";
import { PostgresAdapter } from "@dyrected/db-postgres";

// Collections
import { media } from "./config/collections/media.config";
import { pages } from "./config/collections/pages.config";
import { posts } from "./config/collections/posts.config";
import { inquiries } from "./config/collections/inquiries.config";
import { comments } from "./config/collections/comments.config";

// Globals
import { navigation } from "./config/globals/navigation.config";
import { settings } from "./config/globals/settings.config";

const db = process.env.DATABASE_URL
  ? new PostgresAdapter({ url: process.env.DATABASE_URL })
  : new SqliteAdapter({ filename: process.env.DB_FILENAME || "dyrected.db" });

export default defineConfig({
  collections: [media, pages, posts, inquiries, comments],
  globals: [navigation, settings],
  db,
  admin: {
    branding: {
      primaryColor: "#4f46e5",
    },
  },
});
