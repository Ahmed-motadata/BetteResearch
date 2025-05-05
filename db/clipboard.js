const getClient = require('../db/index');

function sanitizeTableName(name) {
  if (!name) return 'default_collection';
  const safe = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  return safe;
}

async function saveClipboardItem({ type, content, imageData, collectionName, title }) {
  const dbClient = await getClient();
  const table = sanitizeTableName(collectionName);
  // Ensure table exists with title column
  await dbClient.query(`
    CREATE TABLE IF NOT EXISTS ${table} (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT,
      content TEXT,
      image_data BYTEA,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  // Add title column if missing (for existing tables)
  await dbClient.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='${table}' AND column_name='title'
      ) THEN
        ALTER TABLE ${table} ADD COLUMN title TEXT;
      END IF;
    END $$;
  `);
  const result = await dbClient.query(
    `INSERT INTO ${table} (type, title, content, image_data) VALUES ($1, $2, $3, $4) RETURNING *`,
    [type, title || null, content || null, imageData ? Buffer.from(imageData, 'base64') : null]
  );
  return result.rows[0];
}

async function getClipboardItems(collectionName) {
  const dbClient = await getClient();
  const table = sanitizeTableName(collectionName);
  // Ensure table exists with title column
  await dbClient.query(`
    CREATE TABLE IF NOT EXISTS ${table} (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT,
      content TEXT,
      image_data BYTEA,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await dbClient.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='${table}' AND column_name='title'
      ) THEN
        ALTER TABLE ${table} ADD COLUMN title TEXT;
      END IF;
    END $$;
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

async function updateClipboardItemTitle(id, collectionName, title) {
  const dbClient = await getClient();
  const table = sanitizeTableName(collectionName);
  await dbClient.query(`UPDATE ${table} SET title = $1 WHERE id = $2`, [title, id]);
}

module.exports = {
  saveClipboardItem,
  getClipboardItems,
  deleteClipboardItem,
  updateClipboardItemTitle
};
