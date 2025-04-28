const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const dbClient = new Client({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
});

let isConnected = false;
const connectPromise = dbClient.connect().then(async () => {
  isConnected = true;
  // Ensure clipboard_items table exists
  await dbClient.query(`
    CREATE TABLE IF NOT EXISTS clipboard_items (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      content TEXT,
      image_data BYTEA,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  
  // Ensure collections table exists
  await dbClient.query(`
    CREATE TABLE IF NOT EXISTS collections (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );
  `);
  
  // Create a default collection if none exists
  await dbClient.query(`
    INSERT INTO collections (name) 
    VALUES ('Default') 
    ON CONFLICT (name) DO NOTHING;
  `);
}).catch(err => {
  console.error('Postgres connection error:', err);
  process.exit(1);
});

async function getClient() {
  if (!isConnected) await connectPromise;
  return dbClient;
}

module.exports = getClient;
