import postgres from 'postgres';

async function main() {
  const adminSql = postgres('postgres://postgres:Tvzl4lI9sI1yxZBvd3bW7Z5VPsraIKzQVPXyQIT7BCdrdDv5oxPhzWR6qB4nezY9@185.190.143.94:5432/postgres');
  
  try {
    console.log('Connected to postgres database. Checking if dyrected exists...');
    const dbs = await adminSql`SELECT datname FROM pg_database WHERE datname = 'dyrected'`;
    
    if (dbs.length === 0) {
      console.log('Database dyrected does not exist. Creating...');
      await adminSql`CREATE DATABASE dyrected`;
      console.log('Database dyrected created.');
    } else {
      console.log('Database dyrected already exists.');
    }
  } catch (error) {
    console.error('Error connecting to admin db:', error.message);
  } finally {
    await adminSql.end();
  }

  const sql = postgres('postgres://postgres:Tvzl4lI9sI1yxZBvd3bW7Z5VPsraIKzQVPXyQIT7BCdrdDv5oxPhzWR6qB4nezY9@185.190.143.94:5432/dyrected');
  
  try {
    console.log('\nConnected to dyrected database. Checking for api keys...');
    
    // Attempt to select from api keys table. I don't know the exact name, let's try to find tables first.
    const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    console.log('Tables in dyrected:', tables.map(t => t.tablename).join(', '));
    
    if (tables.length > 0) {
      // Look for a table like 'api_keys' or 'sites' or 'workspaces'
      for (const table of tables) {
        if (table.tablename.includes('key') || table.tablename.includes('site') || table.tablename.includes('auth')) {
          console.log(`\nChecking table ${table.tablename}...`);
          const rows = await sql.unsafe(`SELECT * FROM "${table.tablename}" LIMIT 5`);
          console.log(rows);
        }
      }
    } else {
      console.log('No tables found. Schema is empty.');
    }
  } catch (error) {
    console.error('Error querying dyrected db:', error.message);
  } finally {
    await sql.end();
  }
}

main();
