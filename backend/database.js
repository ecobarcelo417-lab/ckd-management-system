const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'ckd_database.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'doctor', 'nurse', 'patient')),
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      date_of_birth TEXT,
      blood_type TEXT,
      emergency_contact TEXT,
      emergency_phone TEXT,
      medical_history TEXT,
      allergies TEXT,
      current_medications TEXT,
      dialysis_start_date TEXT,
      access_type TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      specialization TEXT,
      license_number TEXT,
      department TEXT,
      shift_preference TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    // Safety net for existing databases created before shift_preference was added
    db.run(`ALTER TABLE doctors ADD COLUMN shift_preference TEXT`, () => {});

    db.run(`CREATE TABLE IF NOT EXISTS nurses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      license_number TEXT,
      department TEXT,
      shift_preference TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS dialysis_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 240,
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'missed')),
      doctor_id INTEGER,
      nurse_id INTEGER,
      machine_id TEXT,
      pre_weight REAL,
      post_weight REAL,
      weight_gain REAL,
      blood_pressure_before TEXT,
      blood_pressure_after TEXT,
      heart_rate_before INTEGER,
      heart_rate_after INTEGER,
      temperature REAL,
      ufr REAL,
      dry_weight REAL,
      kt_v REAL,
      urea_reduction_ratio REAL,
      fluid_removed REAL,
      heparin_dose TEXT,
      dialysate_composition TEXT,
      access_site_condition TEXT,
      complications TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id),
      FOREIGN KEY (nurse_id) REFERENCES nurses(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS lab_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      test_date TEXT NOT NULL,
      hemoglobin REAL,
      hematocrit REAL,
      white_blood_cells REAL,
      platelets REAL,
      sodium REAL,
      potassium REAL,
      chloride REAL,
      bicarbonate REAL,
      bun REAL,
      creatinine REAL,
      glucose REAL,
      calcium REAL,
      phosphorus REAL,
      pth REAL,
      albumin REAL,
      iron REAL,
      ferritin REAL,
      tsat REAL,
      crp REAL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      medication_name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      frequency TEXT NOT NULL,
      route TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      instructions TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'discontinued', 'completed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      table_name TEXT,
      record_id INTEGER,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS shift_handoffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_nurse_id INTEGER NOT NULL,
      to_nurse_id INTEGER,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_nurse_id) REFERENCES nurses(id),
      FOREIGN KEY (to_nurse_id) REFERENCES nurses(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS shift_handoff_patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      handoff_id INTEGER NOT NULL,
      patient_id INTEGER NOT NULL,
      session_id INTEGER,
      acuity TEXT DEFAULT 'stable' CHECK(acuity IN ('stable', 'watch', 'critical')),
      situation TEXT,
      background TEXT,
      assessment TEXT,
      recommendation TEXT,
      FOREIGN KEY (handoff_id) REFERENCES shift_handoffs(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (session_id) REFERENCES dialysis_sessions(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS symptom_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      logged_at TEXT NOT NULL,
      symptoms TEXT NOT NULL,
      severity TEXT DEFAULT 'mild' CHECK(severity IN ('mild', 'moderate', 'severe')),
      fluid_intake_ml REAL,
      weight_kg REAL,
      notes TEXT,
      reviewed INTEGER DEFAULT 0,
      reviewed_by INTEGER,
      reviewed_at TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )`, (err) => {
      if (err) {
        console.error('Error creating symptom_logs:', err.message);
      } else {
        console.log('Database tables initialized successfully');
        // Never wipe accounts — only fill empty feature tables / empty install
        ensureFeatureSeedData();
      }
    });
  });
}

/**
 * Safe seeding rules:
 * 1. NEVER delete or update existing user accounts / passwords.
 * 2. If users table is empty (fresh install), seed a full starter set.
 * 3. If symptom_logs / shift_handoffs are empty, seed sample rows for those features only.
 */
function ensureFeatureSeedData() {
  db.get('SELECT COUNT(*) as count FROM users', [], async (err, row) => {
    if (err) {
      console.error('Seed check failed:', err.message);
      return;
    }

    if (row.count === 0) {
      console.log('No users found — seeding starter accounts (fresh install only)...');
      await seedFreshInstallAccounts();
    } else {
      console.log(`Existing accounts preserved (${row.count} users). No account changes.`);
    }

    seedSymptomLogsIfEmpty();
    seedHandoffsIfEmpty();
  });
}

async function seedFreshInstallAccounts() {
  const hash = await bcrypt.hash('ckd2024', 10);

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

  console.log('Fresh install accounts created. Default password for all: ckd2024');
}

function seedSymptomLogsIfEmpty() {
  db.get('SELECT COUNT(*) as count FROM symptom_logs', [], (err, row) => {
    if (err || !row || row.count > 0) return;

    db.get('SELECT id FROM patients ORDER BY id LIMIT 1', [], (e2, patient) => {
      if (e2 || !patient) return;

      const now = new Date();
      const logged = now.toISOString().slice(0, 16).replace('T', ' ');
      db.run(
        `INSERT INTO symptom_logs
          (patient_id, logged_at, symptoms, severity, fluid_intake_ml, weight_kg, notes, reviewed)
         VALUES (?, ?, ?, 'mild', 800, 68.0, 'Starter sample log', 0)`,
        [patient.id, logged, 'Mild ankle swelling between sessions']
      );
      console.log('Seeded sample symptom log (table was empty)');
    });
  });
}

function seedHandoffsIfEmpty() {
  db.get('SELECT COUNT(*) as count FROM shift_handoffs', [], (err, row) => {
    if (err || !row || row.count > 0) return;

    db.all('SELECT id FROM nurses ORDER BY id LIMIT 2', [], (e2, nurses) => {
      if (e2 || !nurses || nurses.length < 1) return;

      const fromId = nurses[0].id;
      const toId = nurses[1] ? nurses[1].id : null;
      const today = new Date().toISOString().slice(0, 10);

      db.run(
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
          new Date().toISOString()
        ],
        function () {
          console.log('Seeded sample shift handoff (table was empty)');
        }
      );
    });
  });
}

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

module.exports = db;
