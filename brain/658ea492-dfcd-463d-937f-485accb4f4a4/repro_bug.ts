import { PostgresAdapter } from "/Users/busola/Work/dyrected/packages/db-postgres/src/index.ts";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '/Users/busola/Work/dyrected/.env' });

async function testUpdate() {
  const db = new PostgresAdapter({ url: process.env.DATABASE_URL });
  
  // 1. Create a site
  const siteId = 'test-site-' + Math.random().toString(36).substring(7);
  console.log('Creating site:', siteId);
  await db.create({
    collection: 'sites',
    data: {
      id: siteId,
      name: 'Test Site',
      workspaceId: 'test-workspace',
      apiKey: 'test-key'
    }
  });

  // 2. Check site
  let site = await db.findOne({ collection: 'sites', id: siteId });
  console.log('Initial site:', site);

  // 3. Update schema only (as sync:schema does)
  console.log('Updating schema...');
  await db.update({
    collection: 'sites',
    id: siteId,
    data: { schema: { collections: [] } }
  });

  // 4. Check site again
  site = await db.findOne({ collection: 'sites', id: siteId });
  console.log('Site after update:', site);

  if (site && !site.name) {
    console.error('FAIL: Site name is missing! It was deleted by the update.');
  } else {
    console.log('PASS: Site name is still there.');
  }

  // Cleanup
  await db.delete({ collection: 'sites', id: siteId });
  process.exit(0);
}

testUpdate().catch(err => {
  console.error(err);
  process.exit(1);
});
