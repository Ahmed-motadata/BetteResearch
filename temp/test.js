const getClient = require('../db/index');

async function addTitleColumnIfMissing() {
  const dbClient = await getClient();
  // Get all user tables except 'collections' and 'clipboard_items'
  const tablesRes = await dbClient.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN ('collections', 'clipboard_items')
  `);

  for (const row of tablesRes.rows) {
    const table = row.table_name;
    const colRes = await dbClient.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'title'`,
      [table]
    );
    if (colRes.rowCount === 0) {
      console.log(`Adding 'title' column to table: ${table}`);
      await dbClient.query(`ALTER TABLE "${table}" ADD COLUMN title TEXT`);
    } else {
      console.log(`Table ${table} already has 'title' column.`);
    }
  }
  await dbClient.end();
  console.log('Done.');
}

addTitleColumnIfMissing().catch(err => {
  console.error('Error:', err);
});