const getClient = require('../db/index');

function sanitizeTableName(name) {
  // Only allow alphanumeric and underscore, fallback to default if invalid
  if (!name) return 'default_collection';
  const safe = name.replace(/[^a-zA-Z0-9_]/g, '_');
  return safe;
}

async function saveClipboardItem({ type, content, imageData, collectionName }) {
  const dbClient = await getClient();
  const table = sanitizeTableName(collectionName);
  // Ensure table exists
  await dbClient.query(`
    CREATE TABLE IF NOT EXISTS ${table} (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      content TEXT,
      image_data BYTEA,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  const result = await dbClient.query(
    `INSERT INTO ${table} (type, content, image_data) VALUES ($1, $2, $3) RETURNING *`,
    [type, content || null, imageData ? Buffer.from(imageData, 'base64') : null]
  );
  return result.rows[0];
}

async function getClipboardItems(collectionName) {
  const dbClient = await getClient();
  const table = sanitizeTableName(collectionName);
  // Ensure table exists
  await dbClient.query(`
    CREATE TABLE IF NOT EXISTS ${table} (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      content TEXT,
      image_data BYTEA,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  const result = await dbClient.query(`SELECT * FROM ${table} ORDER BY id DESC`);
  return result.rows.map(row => {
    if (row.type === 'image' && row.image_data) {
      row.content = `data:image/png;base64,${row.image_data.toString('base64')}`;
    }
    return row;
  });
}

async function deleteClipboardItem(id, collectionName) {
  const dbClient = await getClient();
  const table = sanitizeTableName(collectionName);
  await dbClient.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
}

module.exports = {
  saveClipboardItem,
  getClipboardItems,
  deleteClipboardItem
};
