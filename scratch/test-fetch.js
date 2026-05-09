
import { createClient } from './packages/sdk/src/index.js';

async function test() {
  const client = createClient({
    baseUrl: '/dyrected',
  });

  try {
    console.log('Testing relative fetch...');
    await client.getSchemas();
    console.log('Success!');
  } catch (err) {
    console.error('Failed as expected:', err.message);
  }
}

test();
