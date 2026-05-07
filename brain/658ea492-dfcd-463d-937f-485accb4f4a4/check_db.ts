import { PostgresAdapter } from "/Users/busola/Work/dyrected/packages/db-postgres/src/index.ts";
import dotenv from 'dotenv';

dotenv.config({ path: '/Users/busola/Work/dyrected/.env' });

async function checkSites() {
  const db = new PostgresAdapter({ url: process.env.DATABASE_URL });
  const sites = await db.find({ collection: 'sites', limit: 100 });
  console.log(JSON.stringify(sites.docs, null, 2));
  process.exit(0);
}

checkSites().catch(err => {
  console.error(err);
  process.exit(1);
});
