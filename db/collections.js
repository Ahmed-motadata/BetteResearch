// Get all collections from the database
const getClient = require('./index');

async function getCollections() {
  const dbClient = await getClient();
  // Ensure collections table exists
  await dbClient.query(`
    CREATE TABLE IF NOT EXISTS collections (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );
  `);
  const result = await dbClient.query('SELECT * FROM collections ORDER BY id ASC');
  return result.rows;
}

async function createCollection(name) {
  const dbClient = await getClient();
  await dbClient.query('INSERT INTO collections (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
  // Create a new table for this collection
  const table = sanitizeTableName(name);
  await dbClient.query(`
    CREATE TABLE IF NOT EXISTS ${table} (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      content TEXT,
      image_data BYTEA,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

function sanitizeTableName(name) {
  if (!name) return 'default_collection'; // Changed default name to be clearer
  const safe = name.replace(/[^a-zA-Z0-9_]/g, '_');
  return safe; // No longer adding the clipboard_items_ prefix
}

async function deleteCollection(name) {
  const dbClient = await getClient();
  await dbClient.query('DELETE FROM collections WHERE name = $1', [name]);
  // Always drop the associated clipboard table for this collection
  const table = sanitizeTableName(name);
  await dbClient.query(`DROP TABLE IF EXISTS ${table}`);
}

module.exports = {
  getCollections,
  createCollection,
  deleteCollection
};