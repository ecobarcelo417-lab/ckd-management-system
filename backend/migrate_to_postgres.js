/**
 * migrate_to_postgres.js
 *
 * One-time script: imports data_export.json (dumped from the existing
 * SQLite database) into a Postgres database. Run this AFTER:
 *   1. database.js has been deployed with DATABASE_URL set (so the schema
 *      / tables already exist), and
 *   2. data_export.json has been generated from the old SQLite file.
 *
 * Usage:
 *   DATABASE_URL="postgres://..." node migrate_to_postgres.js
 *
 * Safe to re-run: it checks each table's row count first and skips any
 * table that already has data, so it won't create duplicates.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL before running this script.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Insertion order matters: tables with foreign keys must come after the
// tables they reference.
const TABLE_ORDER = [
  'users',
  'patients',
  'doctors',
  'nurses',
  'dialysis_sessions',
  'lab_results',
  'prescriptions',
  'appointments',
  'notifications',
  'audit_logs',
  'shift_handoffs',
  'shift_handoff_patients',
  'symptom_logs',
];

async function importTable(client, tableName, rows) {
  if (rows.length === 0) {
    console.log(`${tableName}: no rows to import, skipping.`);
    return;
  }

  const { rows: countRows } = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
  if (parseInt(countRows[0].count, 10) > 0) {
    console.log(`${tableName}: already has data, skipping (safe re-run).`);
    return;
  }

  const columns = Object.keys(rows[0]);
  const colList = columns.join(', ');

  for (const row of rows) {
    const values = columns.map((c) => row[c]);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    await client.query(
      `INSERT INTO ${tableName} (${colList}) VALUES (${placeholders})`,
      values
    );
  }

  console.log(`${tableName}: imported ${rows.length} rows.`);
}

async function resetSequence(client, tableName) {
  // After inserting explicit ids, the SERIAL sequence still starts at 1.
  // Bump it past the max existing id so the next app-generated INSERT
  // (which omits id) doesn't collide with a migrated row.
  await client.query(`
    SELECT setval(
      pg_get_serial_sequence('${tableName}', 'id'),
      COALESCE((SELECT MAX(id) FROM ${tableName}), 1),
      true
    )
  `);
  console.log(`${tableName}: sequence reset.`);
}

async function main() {
  const exportPath = path.join(__dirname, 'data_export.json');
  if (!fs.existsSync(exportPath)) {
    console.error(`Missing ${exportPath}. Generate it from the SQLite database first.`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  const client = await pool.connect();

  try {
    console.log('Starting migration into Postgres...');
    for (const table of TABLE_ORDER) {
      await importTable(client, table, data[table] || []);
    }
    console.log('\nResetting SERIAL sequences...');
    for (const table of TABLE_ORDER) {
      await resetSequence(client, table);
    }
    console.log('\nMigration complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
