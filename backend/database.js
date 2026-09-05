/**
 * database.js — Postgres-backed, but exposes the exact same db.run / db.get /
 * db.all callback API the rest of the app already uses (originally written
 * against sqlite3). This lets every route file stay untouched: the shim
 * below translates '?' placeholders to Postgres's '$1, $2...' style,
 * emulates `this.lastID` / `this.changes` inside db.run's callback, and
 * rewrites Postgres's unique-violation error so the two existing
 * `err.message.includes('UNIQUE constraint failed')` checks in
 * routes/auth.js and routes/patients.js keep working unmodified.
 *
 * Connection comes from the DATABASE_URL environment variable (Render
 * Postgres provides this automatically once the database is attached to
 * the web service).
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL is not set. Attach a Postgres database to this service ' +
    '(Render: Dashboard -> your web service -> Environment) and redeploy.'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render's managed Postgres requires SSL; rejectUnauthorized:false is the
  // standard setting for Render's self-signed connection chain.
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error:', err.message);
});

/**
 * Converts '?' placeholders (sqlite3 style) to Postgres's '$1, $2...' style.
 * Every existing query in the app uses '?', so this runs on every call.
 */
function toPgPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/**
 * node-pg returns BIGINT-derived values (COUNT(*), SUM(...) on integer
 * columns) as strings, not numbers — this avoids silently truncating
 * values above Number.MAX_SAFE_INTEGER. SQLite never did this, so every
 * route that does `sum + row.some_count` was relying on real numbers
 * coming back and silently fell into string concatenation once Postgres
 * started returning "12" instead of 12 (e.g. Reports.tsx's stats.reduce
 * calls). None of this app's aggregates need bigint precision, so it's
 * safe to coerce every numeric-looking string field back to a JS number
 * on the way out.
 */
function coerceNumericStrings(row) {
  if (!row) return row;
  for (const key of Object.keys(row)) {
    const value = row[key];
    if (typeof value === 'string' && value !== '' && !isNaN(value) && !isNaN(parseFloat(value))) {
      row[key] = Number(value);
    }
  }
  return row;
}

/**
 * SQLite's error message for a UNIQUE violation is literally the string
 * "UNIQUE constraint failed: <table>.<column>". Postgres uses error code
 * 23505 with a different message shape. The two call sites that check for
 * this (routes/auth.js, routes/patients.js) only look for that substring,
 * so we rewrite the message here rather than touch either route.
 */
function normalizeError(err) {
  if (err && err.code === '23505') {
    const wrapped = new Error(`UNIQUE constraint failed: ${err.detail || err.message}`);
    wrapped.code = err.code;
    wrapped.original = err;
    return wrapped;
  }
  return err;
}

const db = {
  /**
   * Matches sqlite3's db.run(sql, params, callback). The callback receives
   * (err) and is called with `this` bound to an object exposing `lastID`
   * and `changes`, matching what routes/auth.js etc. already rely on via
   * `this.lastID` inside `function(err) { ... }` callbacks.
   */
  run(sql, params = [], callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    const pgSql = toPgPlaceholders(sql);
    const isInsert = /^\s*insert/i.test(sql);
    const finalSql = isInsert && !/returning/i.test(sql) ? `${pgSql} RETURNING id` : pgSql;

    pool.query(finalSql, params)
      .then((result) => {
        if (!callback) return;
        const context = {
          lastID: isInsert && result.rows[0] ? result.rows[0].id : undefined,
          changes: result.rowCount,
        };
        callback.call(context, null);
      })
      .catch((err) => {
        if (!callback) {
          console.error('db.run error (unhandled):', err.message);
          return;
        }
        callback.call({}, normalizeError(err));
      });
  },

  /** Matches sqlite3's db.get(sql, params, callback) — returns one row or undefined. */
  get(sql, params = [], callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    const pgSql = toPgPlaceholders(sql);
    pool.query(pgSql, params)
      .then((result) => callback(null, coerceNumericStrings(result.rows[0])))
      .catch((err) => callback(normalizeError(err)));
  },

  /** Matches sqlite3's db.all(sql, params, callback) — returns an array of rows. */
  all(sql, params = [], callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    const pgSql = toPgPlaceholders(sql);
    pool.query(pgSql, params)
      .then((result) => callback(null, result.rows.map(coerceNumericStrings)))
      .catch((err) => callback(normalizeError(err)));
  },

  /**
   * sqlite3's db.serialize() just guarantees queued statements run in
   * order; the schema/seed setup below uses async/await against the pool
   * directly instead, so this is only kept in case any route still calls
   * db.serialize() defensively.
   */
  serialize(fn) {
    fn();
  },
};

async function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Full schema, translated from the original SQLite version:
 *  - INTEGER PRIMARY KEY AUTOINCREMENT -> SERIAL PRIMARY KEY
 *  - DATETIME DEFAULT CURRENT_TIMESTAMP -> TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 *  - REAL -> DOUBLE PRECISION
 *  - CHECK(...) constraints kept as-is (Postgres supports the same syntax)
 *  - is_read / reviewed kept as INTEGER (not BOOLEAN) since every route
 *    compares them against 0/1 literals, not true/false
 */
async function initializeSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'doctor', 'nurse', 'patient')),
      phone TEXT,
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS patients (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      date_of_birth TEXT,
      blood_type TEXT,
      emergency_contact TEXT,
      emergency_phone TEXT,
      medical_history TEXT,
      allergies TEXT,
      current_medications TEXT,
      dialysis_start_date TEXT,
      access_type TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS doctors (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      specialization TEXT,
      license_number TEXT,
      department TEXT,
      shift_preference TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS nurses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      license_number TEXT,
      department TEXT,
      shift_preference TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS dialysis_sessions (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 240,
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'missed')),
      doctor_id INTEGER REFERENCES doctors(id),
      nurse_id INTEGER REFERENCES nurses(id),
      machine_id TEXT,
      pre_weight DOUBLE PRECISION,
      post_weight DOUBLE PRECISION,
      weight_gain DOUBLE PRECISION,
      blood_pressure_before TEXT,
      blood_pressure_after TEXT,
      heart_rate_before INTEGER,
      heart_rate_after INTEGER,
      temperature DOUBLE PRECISION,
      ufr DOUBLE PRECISION,
      dry_weight DOUBLE PRECISION,
      kt_v DOUBLE PRECISION,
      urea_reduction_ratio DOUBLE PRECISION,
      fluid_removed DOUBLE PRECISION,
      heparin_dose TEXT,
      dialysate_composition TEXT,
      access_site_condition TEXT,
      complications TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lab_results (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      test_date TEXT NOT NULL,
      hemoglobin DOUBLE PRECISION,
      hematocrit DOUBLE PRECISION,
      white_blood_cells DOUBLE PRECISION,
      platelets DOUBLE PRECISION,
      sodium DOUBLE PRECISION,
      potassium DOUBLE PRECISION,
      chloride DOUBLE PRECISION,
      bicarbonate DOUBLE PRECISION,
      bun DOUBLE PRECISION,
      creatinine DOUBLE PRECISION,
      glucose DOUBLE PRECISION,
      calcium DOUBLE PRECISION,
      phosphorus DOUBLE PRECISION,
      pth DOUBLE PRECISION,
      albumin DOUBLE PRECISION,
      iron DOUBLE PRECISION,
      ferritin DOUBLE PRECISION,
      tsat DOUBLE PRECISION,
      crp DOUBLE PRECISION,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id INTEGER NOT NULL REFERENCES doctors(id),
      medication_name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      frequency TEXT NOT NULL,
      route TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      instructions TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'discontinued', 'completed')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id INTEGER REFERENCES doctors(id),
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      action TEXT NOT NULL,
      table_name TEXT,
      record_id INTEGER,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shift_handoffs (
      id SERIAL PRIMARY KEY,
      from_nurse_id INTEGER NOT NULL REFERENCES nurses(id),
      to_nurse_id INTEGER REFERENCES nurses(id),
      shift_date TEXT NOT NULL,
      shift_type TEXT NOT NULL CHECK(shift_type IN ('morning', 'afternoon', 'night', 'other')),
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'acknowledged')),
      unit_summary TEXT,
      patients_in_progress TEXT,
      completed_sessions_notes TEXT,
      complications_alerts TEXT,
      access_concerns TEXT,
      pending_tasks TEXT,
      medications_notes TEXT,
      equipment_notes TEXT,
      recommendations TEXT,
      census_count INTEGER,
      submitted_at TEXT,
      acknowledged_at TEXT,
      acknowledged_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shift_handoff_patients (
      id SERIAL PRIMARY KEY,
      handoff_id INTEGER NOT NULL REFERENCES shift_handoffs(id) ON DELETE CASCADE,
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      session_id INTEGER REFERENCES dialysis_sessions(id),
      acuity TEXT DEFAULT 'stable' CHECK(acuity IN ('stable', 'watch', 'critical')),
      situation TEXT,
      background TEXT,
      assessment TEXT,
      recommendation TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS symptom_logs (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      logged_at TEXT NOT NULL,
      symptoms TEXT NOT NULL,
      severity TEXT DEFAULT 'mild' CHECK(severity IN ('mild', 'moderate', 'severe')),
      fluid_intake_ml DOUBLE PRECISION,
      weight_kg DOUBLE PRECISION,
      notes TEXT,
      reviewed INTEGER DEFAULT 0,
      reviewed_by INTEGER,
      reviewed_at TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database tables initialized successfully (Postgres)');
}

/**
 * Safe seeding rules (unchanged from the original):
 * 1. NEVER delete or update existing user accounts / passwords.
 * 2. If users table is empty (fresh install), seed a full starter set.
 * 3. If symptom_logs / shift_handoffs are empty, seed sample rows for those features only.
 */
async function ensureFeatureSeedData() {
  const row = await getAsync('SELECT COUNT(*) as count FROM users');
  const count = parseInt(row.count, 10);

  if (count === 0) {
    console.log('No users found — seeding starter accounts (fresh install only)...');
    await seedFreshInstallAccounts();
  } else {
    console.log(`Existing accounts preserved (${count} users). No account changes.`);
  }

  await seedSymptomLogsIfEmpty();
  await seedHandoffsIfEmpty();
}

async function seedFreshInstallAccounts() {
  const hash = await bcrypt.hash('password', 10);

  const accounts = [
    ['admin', hash, 'admin@ckd.local', 'System Administrator', 'admin', '09000000001', 'CKD Unit'],
    ['dr.villanueva', hash, 'ramon.villanueva@ckdmed.ph', 'Dr. Ramon Villanueva', 'doctor', '09000000002', 'Nephrology'],
    ['nurse.mendoza', hash, 'liza.mendoza@ckdmed.ph', 'Liza Mendoza', 'nurse', '09000000003', 'Dialysis Floor'],
    ['nurse.reyes', hash, 'jasmin.reyes@ckdmed.ph', 'Jasmin Reyes', 'nurse', '09000000004', 'Dialysis Floor'],
    ['patient.villaraza', hash, 'eduardo.villaraza@gmail.com', 'Eduardo Villaraza', 'patient', '09000000005', 'Manila'],
  ];

  for (const a of accounts) {
    await runAsync(
      'INSERT INTO users (username, password, email, full_name, role, phone, address) VALUES (?,?,?,?,?,?,?)',
      a
    );
  }

  const admin = await getAsync("SELECT id FROM users WHERE username='admin'");
  const doc = await getAsync("SELECT id FROM users WHERE username='dr.villanueva'");
  const n1 = await getAsync("SELECT id FROM users WHERE username='nurse.mendoza'");
  const n2 = await getAsync("SELECT id FROM users WHERE username='nurse.reyes'");
  const p1 = await getAsync("SELECT id FROM users WHERE username='patient.villaraza'");

  await runAsync(
    'INSERT INTO doctors (user_id, specialization, license_number, department) VALUES (?,?,?,?)',
    [doc.id, 'Nephrology', 'MD-NEPH-001', 'Renal']
  );
  await runAsync(
    'INSERT INTO nurses (user_id, license_number, department, shift_preference) VALUES (?,?,?,?)',
    [n1.id, 'RN-001', 'Dialysis', 'morning']
  );
  await runAsync(
    'INSERT INTO nurses (user_id, license_number, department, shift_preference) VALUES (?,?,?,?)',
    [n2.id, 'RN-002', 'Dialysis', 'afternoon']
  );
  await runAsync(
    `INSERT INTO patients (user_id, date_of_birth, blood_type, emergency_contact, dialysis_start_date, access_type)
     VALUES (?,?,?,?,?,?)`,
    [p1.id, '1965-04-12', 'O+', 'Maria Villaraza', '2022-01-15', 'AV Fistula']
  );

  console.log('Fresh install accounts created. Default password for all: password');
}

async function seedSymptomLogsIfEmpty() {
  const row = await getAsync('SELECT COUNT(*) as count FROM symptom_logs');
  if (parseInt(row.count, 10) > 0) return;

  const patient = await getAsync('SELECT id FROM patients ORDER BY id LIMIT 1');
  if (!patient) return;

  const now = new Date();
  const logged = now.toISOString().slice(0, 16).replace('T', ' ');
  await runAsync(
    `INSERT INTO symptom_logs
      (patient_id, logged_at, symptoms, severity, fluid_intake_ml, weight_kg, notes, reviewed)
     VALUES (?, ?, ?, 'mild', 800, 68.0, 'Starter sample log', 0)`,
    [patient.id, logged, 'Mild ankle swelling between sessions']
  );
  console.log('Seeded sample symptom log (table was empty)');
}

async function seedHandoffsIfEmpty() {
  const row = await getAsync('SELECT COUNT(*) as count FROM shift_handoffs');
  if (parseInt(row.count, 10) > 0) return;

  const nurses = await allAsync('SELECT id FROM nurses ORDER BY id LIMIT 2');
  if (!nurses || nurses.length < 1) return;

  const fromId = nurses[0].id;
  const toId = nurses[1] ? nurses[1].id : null;
  const today = new Date().toISOString().slice(0, 10);

  await runAsync(
    `INSERT INTO shift_handoffs (
      from_nurse_id, to_nurse_id, shift_date, shift_type, status,
      unit_summary, pending_tasks, recommendations, census_count, submitted_at
    ) VALUES (?, ?, ?, 'afternoon', 'submitted', ?, ?, ?, 4, ?)`,
    [
      fromId,
      toId,
      today,
      'Sample handoff — unit stable at change of shift.',
      'Complete remaining post-assessments.',
      'Incoming nurse: review watch patients before starting new chairs.',
      new Date().toISOString(),
    ]
  );
  console.log('Seeded sample shift handoff (table was empty)');
}

async function initializeDatabase() {
  try {
    await initializeSchema();
    await ensureFeatureSeedData();
  } catch (err) {
    console.error('Database initialization failed:', err.message);
  }
}

initializeDatabase();

module.exports = db;
