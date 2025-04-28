const getClient = require('../db/index');

async function saveClipboardItem({ type, content, imageData }) {
  const dbClient = await getClient();
  const result = await dbClient.query(
    'INSERT INTO clipboard_items (type, content, image_data) VALUES ($1, $2, $3) RETURNING *',
    [type, content || null, imageData ? Buffer.from(imageData, 'base64') : null]
  );
  return result.rows[0];
}

async function getClipboardItems() {
  const dbClient = await getClient();
  const result = await dbClient.query('SELECT * FROM clipboard_items ORDER BY id DESC');
  return result.rows.map(row => ({
    ...row,
    image_data: row.image_data ? row.image_data.toString('base64') : null
  }));
}

async function deleteClipboardItem(id) {
  const dbClient = await getClient();
  await dbClient.query('DELETE FROM clipboard_items WHERE id = $1', [id]);
}

module.exports = {
  saveClipboardItem,
  getClipboardItems,
  deleteClipboardItem
};
