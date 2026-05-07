import postgres from '/Users/busola/Work/dyrected/node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/src/index.js';
import dotenv from '/Users/busola/Work/dyrected/node_modules/.pnpm/dotenv@17.4.2/node_modules/dotenv/lib/main.js';

dotenv.config({ path: '/Users/busola/Work/dyrected/.env' });

const {
  DATABASE_USER,
  DATABASE_PASSWORD,
  DATABASE_HOST,
  DATABASE_PORT,
  DATABASE_NAME
} = process.env;

const url = `postgres://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}`;
const sql = postgres(url);

async function checkSite() {
  try {
    const siteId = 'fjtxv';
    console.log(`Checking site ${siteId}...`);
    const sites = await sql`SELECT id, data FROM collection_sites WHERE id = ${siteId}`;

    if (sites.length === 0) {
      console.error(`Site ${siteId} not found.`);
      process.exit(1);
    }

    const site = sites[0];
    console.log(`Found site: ${site.id}`);
    console.log(`Data:`, JSON.stringify(site.data, null, 2));

    if (site.data.apiKey) {
      console.log(`API Key in DB: ${site.data.apiKey}`);
    } else {
      console.log(`No API key found for this site in DB.`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

checkSite();
