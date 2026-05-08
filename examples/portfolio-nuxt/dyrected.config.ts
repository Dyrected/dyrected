import { defineConfig, type DatabaseAdapter } from "@dyrected/core";
import { collections, globals } from "./config/schema.ts";

// Database Setup
// We use a helper variable to keep the top-level clean of Node-only imports

const getDb = async (): Promise<DatabaseAdapter> => {
  let db: DatabaseAdapter;
  if (typeof window === "undefined") {
    // We only pull in the adapters if we are on the server
    const { SqliteAdapter } = await import("@dyrected/db-sqlite");
    const { PostgresAdapter } = await import("@dyrected/db-postgres");

    if (process.env.DATABASE_URL) {
      db = new PostgresAdapter({ url: process.env.DATABASE_URL });
    } else {
      db = new SqliteAdapter({
        filename: process.env.DB_FILENAME || "dyrected.db",
      });
    }
  }
  // @ts-ignore
  return db;
};

export default defineConfig({
  collections,
  globals,
  db: await getDb(),
  admin: {
    branding: {
      primaryColor: "#4f46e5",
    },
  },
});
