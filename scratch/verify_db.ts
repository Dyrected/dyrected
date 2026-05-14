import { createClient } from './packages/sdk/src/index';
import Database from 'better-sqlite3';

const db = new Database('./apps/example-saas-nuxt/dyrected.db');
const pages = db.prepare('SELECT * FROM pages').all();
console.log('Pages in DB:', pages.length);
pages.forEach(p => console.log(`- ${p.slug}`));
db.close();
