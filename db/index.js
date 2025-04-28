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
const connectPromise = dbClient.connect().then(() => { isConnected = true; }).catch(err => {
  console.error('Postgres connection error:', err);
  process.exit(1);
});

async function getClient() {
  if (!isConnected) await connectPromise;
  return dbClient;
}

module.exports = getClient;
