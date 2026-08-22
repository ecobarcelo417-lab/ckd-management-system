/**
 * dailySeed.js
 *
 * Keeps the system "live" without manual data entry: every day, this
 * automatically fills in that day's dialysis sessions (spread across
 * Morning / Afternoon / Night) and shift handoffs (Morning, Afternoon,
 * Night — with the Night handoff left in "Pending Ack" / submitted
 * status, awaiting acknowledgment by the next morning's nurse).
 *
 * Safe by design:
 *  - Never touches user accounts, credentials, or any existing row.
 *  - Idempotent per calendar day: checks whether today's rows already
 *    exist before inserting anything, so running it twice in one day
 *    (e.g. server restart) does not create duplicates.
 *  - Runs once at server startup, and again every day at 00:05
 *    (Asia/Manila) via node-cron, so a long-running server keeps
 *    itself filled in without needing a restart.
 */

const db = require('./database');

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
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

// Today's date in Philippine time, as YYYY-MM-DD (matches scheduled_date/shift_date format used elsewhere)
function todayManila() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

function nowManila() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
}

const SHIFT_WINDOWS = {
  morning: { startHour: 6, endHour: 10 },
  afternoon: { startHour: 12, endHour: 16 },
  night: { startHour: 18, endHour: 22 },
};

const SHIFT_ORDER = ['morning', 'afternoon', 'night'];

function pad(n) {
  return String(n).padStart(2, '0');
}

// Spread `count` appointment times evenly across a shift window, e.g. every ~20 minutes
function timesForShift(shift, count) {
  const { startHour, endHour } = SHIFT_WINDOWS[shift];
  const totalMinutes = (endHour - startHour) * 60;
  const step = count > 0 ? Math.max(15, Math.floor(totalMinutes / count)) : 60;
  const times = [];
  for (let i = 0; i < count; i++) {
    const minutesFromStart = i * step;
    const hour = startHour + Math.floor(minutesFromStart / 60);
    const minute = minutesFromStart % 60;
    times.push(`${pad(Math.min(hour, endHour - 1))}:${pad(minute)}`);
  }
  return times;
}

function deterministicRandom(seed) {
  // Small deterministic pseudo-random generator so re-runs (if ever forced) are stable per day+id
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

async function seedTodaysDialysisSessions(dateStr, patients, doctors, nurses, now) {
  const existing = await getAsync(
    'SELECT COUNT(*) as count FROM dialysis_sessions WHERE scheduled_date = ?',
    [dateStr]
  );
  if (existing.count > 0) return { created: 0, skipped: true };

  const nursesByShift = {
    morning: nurses.filter((n) => (n.shift_preference || '').toLowerCase() === 'morning'),
    afternoon: nurses.filter((n) => (n.shift_preference || '').toLowerCase() === 'afternoon'),
    night: nurses.filter((n) => (n.shift_preference || '').toLowerCase() === 'night'),
  };

  // Split patients evenly across the three shifts
  const buckets = { morning: [], afternoon: [], night: [] };
  patients.forEach((p, idx) => {
    buckets[SHIFT_ORDER[idx % 3]].push(p);
  });

  let created = 0;
  const machineCount = 8;

  for (const shift of SHIFT_ORDER) {
    const shiftPatients = buckets[shift];
    const times = timesForShift(shift, shiftPatients.length);
    const shiftNurses = nursesByShift[shift].length ? nursesByShift[shift] : nurses;

    for (let i = 0; i < shiftPatients.length; i++) {
      const patient = shiftPatients[i];
      const time = times[i];
      const nurse = shiftNurses[i % shiftNurses.length];
      const doctor = doctors[i % doctors.length];
      const machineId = `Machine-${pad((i % machineCount) + 1)}`;

      const [h, m] = time.split(':').map(Number);
      const scheduledAt = new Date(now);
      scheduledAt.setHours(h, m, 0, 0);
      const durationMinutes = 240;
      const endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60000);

      let status = 'scheduled';
      if (now >= endsAt) status = 'completed';
      else if (now >= scheduledAt) status = 'in_progress';

      const seed = patient.id * 7 + i;
      const dryWeight = Math.round((55 + deterministicRandom(seed) * 30) * 10) / 10;
      const preWeight = Math.round((dryWeight + 1.5 + deterministicRandom(seed + 1) * 2) * 10) / 10;
      const postWeight = status !== 'scheduled' ? dryWeight : null;
      const fluidRemoved = status === 'completed' ? Math.round((preWeight - postWeight) * 950) : null;

      await runAsync(
        `INSERT INTO dialysis_sessions (
          patient_id, scheduled_date, scheduled_time, duration_minutes, status,
          doctor_id, nurse_id, machine_id, pre_weight, post_weight,
          weight_gain, dry_weight, fluid_removed,
          blood_pressure_before, heart_rate_before,
          blood_pressure_after, heart_rate_after
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patient.id, dateStr, time, durationMinutes, status,
          doctor.id, nurse.id, machineId,
          status !== 'scheduled' ? preWeight : null,
          postWeight,
          status === 'completed' ? Math.round((preWeight - dryWeight) * 10) / 10 : null,
          dryWeight,
          fluidRemoved,
          status !== 'scheduled' ? `${120 + Math.round(deterministicRandom(seed + 2) * 20)}/${75 + Math.round(deterministicRandom(seed + 3) * 10)}` : null,
          status !== 'scheduled' ? 70 + Math.round(deterministicRandom(seed + 4) * 20) : null,
          status === 'completed' ? `${115 + Math.round(deterministicRandom(seed + 5) * 20)}/${72 + Math.round(deterministicRandom(seed + 6) * 10)}` : null,
          status === 'completed' ? 68 + Math.round(deterministicRandom(seed + 7) * 20) : null,
        ]
      );
      created++;
    }
  }

  return { created, skipped: false };
}

async function seedTodaysHandoffs(dateStr, nurses, now) {
  const existing = await getAsync(
    'SELECT COUNT(*) as count FROM shift_handoffs WHERE shift_date = ?',
    [dateStr]
  );
  if (existing.count > 0) return { created: 0, skipped: true };

  const nursesByShift = {
    morning: nurses.filter((n) => (n.shift_preference || '').toLowerCase() === 'morning'),
    afternoon: nurses.filter((n) => (n.shift_preference || '').toLowerCase() === 'afternoon'),
    night: nurses.filter((n) => (n.shift_preference || '').toLowerCase() === 'night'),
  };

  // Morning -> Afternoon -> Night -> (next day's Morning, left pending)
  const handoffPlan = [
    {
      shift: 'morning',
      from: nursesByShift.morning[0] || nurses[0],
      to: nursesByShift.afternoon[0] || nurses[1] || nurses[0],
      status: 'acknowledged',
    },
    {
      shift: 'afternoon',
      from: nursesByShift.afternoon[0] || nurses[1] || nurses[0],
      to: nursesByShift.night[0] || nurses[2] || nurses[0],
      status: 'acknowledged',
    },
    {
      shift: 'night',
      from: nursesByShift.night[0] || nurses[2] || nurses[0],
      to: nursesByShift.morning[0] || nurses[0],
      // Night shift just ended — the incoming morning nurse hasn't acknowledged it yet.
      status: 'submitted', // "Pending Ack" in the UI
    },
  ];

  let created = 0;
  for (const plan of handoffPlan) {
    const { startHour, endHour } = SHIFT_WINDOWS[plan.shift];
    const submittedAt = new Date(now);
    submittedAt.setHours(endHour, 0, 0, 0);

    const isAck = plan.status === 'acknowledged';
    const acknowledgedAt = isAck ? new Date(submittedAt.getTime() + 15 * 60000) : null;

    const censusCount = await getAsync(
      `SELECT COUNT(*) as count FROM dialysis_sessions
       WHERE scheduled_date = ? AND scheduled_time >= ? AND scheduled_time < ?`,
      [dateStr, `${pad(startHour)}:00`, `${pad(endHour)}:00`]
    );

    await runAsync(
      `INSERT INTO shift_handoffs (
        from_nurse_id, to_nurse_id, shift_date, shift_type, status,
        unit_summary, pending_tasks, recommendations, census_count,
        submitted_at, acknowledged_at, acknowledged_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        plan.from.id,
        plan.to.id,
        dateStr,
        plan.shift,
        plan.status,
        `Unit stable at end of ${plan.shift} shift. Auto-generated daily summary.`,
        plan.status === 'submitted' ? 'Awaiting acknowledgment from incoming nurse.' : 'None outstanding.',
        'Review watch-list patients before starting new chairs.',
        censusCount.count,
        submittedAt.toISOString(),
        acknowledgedAt ? acknowledgedAt.toISOString() : null,
        isAck ? plan.to.id : null,
      ]
    );
    created++;
  }

  return { created, skipped: false };
}

async function runDailySeed() {
  try {
    const dateStr = todayManila();
    const now = nowManila();

    const patients = await allAsync('SELECT id FROM patients ORDER BY id');
    const doctors = await allAsync('SELECT id, shift_preference FROM doctors ORDER BY id');
    const nurses = await allAsync('SELECT id, shift_preference FROM nurses ORDER BY id');

    if (!patients.length || !doctors.length || !nurses.length) {
      console.log('Daily seed skipped: not enough patients/doctors/nurses yet.');
      return;
    }

    const sessionResult = await seedTodaysDialysisSessions(dateStr, patients, doctors, nurses, now);
    const handoffResult = await seedTodaysHandoffs(dateStr, nurses, now);

    if (sessionResult.skipped && handoffResult.skipped) {
      console.log(`Daily seed: ${dateStr} already filled — nothing to do.`);
    } else {
      console.log(
        `Daily seed for ${dateStr}: ${sessionResult.created} dialysis sessions, ` +
        `${handoffResult.created} shift handoffs created.`
      );
    }
  } catch (err) {
    console.error('Daily seed failed:', err.message);
  }
}

module.exports = { runDailySeed };
