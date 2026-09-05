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

// Real dialysis patients typically attend ~3x/week, not every single day.
// This picks a deterministic subset of ~41-45 patients (out of the full
// roster) for a given date, rotating who's "on" each day so the same people
// aren't always picked or always skipped, and so a re-run for the same date
// always yields the same subset.
function selectTodaysPatients(dateStr, patients) {
  const MIN_COUNT = 41;
  const MAX_COUNT = 45;

  // Deterministic seed from the date string so the subset is stable per day
  // but varies day to day.
  let dateSeed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    dateSeed = (dateSeed * 31 + dateStr.charCodeAt(i)) % 100000;
  }

  const targetCount = MIN_COUNT + Math.floor(deterministicRandom(dateSeed) * (MAX_COUNT - MIN_COUNT + 1));

  // Score every patient with a value that depends on both their id and
  // today's date seed, then take the top N — this rotates who attends
  // each day rather than always picking the same first N patients.
  const scored = patients.map((p, idx) => ({
    patient: p,
    score: deterministicRandom(dateSeed + p.id * 13 + idx),
  }));
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, targetCount).map((s) => s.patient);
}

async function seedTodaysDialysisSessions(dateStr, patients, doctors, nurses, now) {
  const existing = await getAsync(
    'SELECT COUNT(*) as count FROM dialysis_sessions WHERE scheduled_date = ?',
    [dateStr]
  );
  if (existing.count > 0) return { created: 0, skipped: true };

  const todaysPatients = selectTodaysPatients(dateStr, patients);

  const nursesByShift = {
    morning: nurses.filter((n) => (n.shift_preference || '').toLowerCase() === 'morning'),
    afternoon: nurses.filter((n) => (n.shift_preference || '').toLowerCase() === 'afternoon'),
    night: nurses.filter((n) => (n.shift_preference || '').toLowerCase() === 'night'),
  };

  // Split today's selected patients evenly across the three shifts
  const buckets = { morning: [], afternoon: [], night: [] };
  todaysPatients.forEach((p, idx) => {
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

      const seed = patient.id * 7 + i;

      // A small, deterministic share of each day's sessions are cancelled or
      // missed instead of following the normal scheduled -> in_progress ->
      // completed path. This keeps demo/calendar views realistic (not every
      // session simply completes) without being random/non-reproducible.
      const outcomeRoll = deterministicRandom(seed + 100);
      const isPastSession = now >= endsAt;

      let status;
      if (isPastSession && outcomeRoll < 0.05) {
        status = 'cancelled'; // ~5% of past sessions were called off ahead of time
      } else if (isPastSession && outcomeRoll < 0.10) {
        status = 'missed'; // ~5% of past sessions the patient no-showed for
      } else if (now >= endsAt) {
        status = 'completed';
      } else if (now >= scheduledAt) {
        status = 'in_progress';
      } else {
        status = 'scheduled';
      }
      const dryWeight = Math.round((55 + deterministicRandom(seed) * 30) * 10) / 10;
      const preWeight = Math.round((dryWeight + 1.5 + deterministicRandom(seed + 1) * 2) * 10) / 10;
      const sessionOccurred = status === 'in_progress' || status === 'completed';
      const postWeight = sessionOccurred ? dryWeight : null;
      const fluidRemoved = status === 'completed' ? Math.round((preWeight - postWeight) * 950) : null;
      // Adequacy labs are only measured once a session actually finishes.
      // Typical adult hemodialysis targets: Kt/V ~1.2-1.8, URR ~65-75%.
      const ktv = status === 'completed' ? Math.round((1.2 + deterministicRandom(seed + 8) * 0.6) * 100) / 100 : null;
      const urr = status === 'completed' ? Math.round((65 + deterministicRandom(seed + 9) * 10) * 10) / 10 : null;

      await runAsync(
        `INSERT INTO dialysis_sessions (
          patient_id, scheduled_date, scheduled_time, duration_minutes, status,
          doctor_id, nurse_id, machine_id, pre_weight, post_weight,
          weight_gain, dry_weight, fluid_removed,
          blood_pressure_before, heart_rate_before,
          blood_pressure_after, heart_rate_after,
          kt_v, urea_reduction_ratio
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patient.id, dateStr, time, durationMinutes, status,
          doctor.id, nurse.id, machineId,
          sessionOccurred ? preWeight : null,
          postWeight,
          status === 'completed' ? Math.round((preWeight - dryWeight) * 10) / 10 : null,
          dryWeight,
          fluidRemoved,
          sessionOccurred ? `${120 + Math.round(deterministicRandom(seed + 2) * 20)}/${75 + Math.round(deterministicRandom(seed + 3) * 10)}` : null,
          sessionOccurred ? 70 + Math.round(deterministicRandom(seed + 4) * 20) : null,
          status === 'completed' ? `${115 + Math.round(deterministicRandom(seed + 5) * 20)}/${72 + Math.round(deterministicRandom(seed + 6) * 10)}` : null,
          status === 'completed' ? 68 + Math.round(deterministicRandom(seed + 7) * 20) : null,
          ktv,
          urr,
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

  // Every nurse who actually works a shift files (or receives) a handoff for
  // that shift — not just one designated nurse per shift company-wide.
  // Each outgoing nurse hands off to the next nurse in the following shift's
  // roster (wrapping/round-robining if the counts don't match evenly), so
  // coverage is spread across the whole incoming shift rather than always
  // landing on the same one or two people.
  const nextShift = { morning: 'afternoon', afternoon: 'night', night: 'morning' };

  let created = 0;

  for (const shift of SHIFT_ORDER) {
    const outgoing = nursesByShift[shift].length ? nursesByShift[shift] : nurses;
    const incomingShift = nextShift[shift];
    const incoming = nursesByShift[incomingShift].length ? nursesByShift[incomingShift] : nurses;

    const { startHour, endHour } = SHIFT_WINDOWS[shift];
    const submittedAt = new Date(now);
    submittedAt.setHours(endHour, 0, 0, 0);

    // Night handoffs are left "submitted" (Pending Ack) — realistic, since the
    // incoming morning nurse hasn't reviewed it yet at the moment night ends.
    // Morning/afternoon handoffs are auto-acknowledged shortly after submission.
    const isNight = shift === 'night';

    const censusCount = await getAsync(
      `SELECT COUNT(*) as count FROM dialysis_sessions
       WHERE scheduled_date = ? AND scheduled_time >= ? AND scheduled_time < ?`,
      [dateStr, `${pad(startHour)}:00`, `${pad(endHour)}:00`]
    );

    for (let i = 0; i < outgoing.length; i++) {
      const fromNurse = outgoing[i];
      const toNurse = incoming[i % incoming.length];
      const status = isNight ? 'submitted' : 'acknowledged';
      const isAck = status === 'acknowledged';
      const acknowledgedAt = isAck ? new Date(submittedAt.getTime() + 15 * 60000 + i * 60000) : null;

      await runAsync(
        `INSERT INTO shift_handoffs (
          from_nurse_id, to_nurse_id, shift_date, shift_type, status,
          unit_summary, pending_tasks, recommendations, census_count,
          submitted_at, acknowledged_at, acknowledged_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fromNurse.id,
          toNurse.id,
          dateStr,
          shift,
          status,
          `Unit stable at end of ${shift} shift. Auto-generated daily summary.`,
          status === 'submitted' ? 'Awaiting acknowledgment from incoming nurse.' : 'None outstanding.',
          'Review watch-list patients before starting new chairs.',
          censusCount.count,
          submittedAt.toISOString(),
          acknowledgedAt ? acknowledgedAt.toISOString() : null,
          isAck ? toNurse.id : null,
        ]
      );
      created++;
    }
  }

  return { created, skipped: false };
}

const APPOINTMENT_TYPES = [
  'Nephrology Follow-up',
  'Vascular Access Evaluation',
  'Dietary Consultation',
  'Pre-Dialysis Assessment',
  'Bone Mineral Disorder Follow-up',
  'Anemia Management Review',
];

// Fills in a handful of clinic appointments (separate from dialysis sessions)
// for today, with a realistic mix of statuses, so the appointments calendar
// isn't only ever "scheduled" (blue). Deterministic per day so a server
// restart on the same day never creates duplicates or changes results, but
// rotates which patients have an appointment from day to day (rather than
// the same fixed subset every single day).
async function seedTodaysAppointments(dateStr, patients, doctors, now) {
  const existing = await getAsync(
    'SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ?',
    [dateStr]
  );
  if (existing.count > 0) return { created: 0, skipped: true };

  // Not every patient has a clinic appointment every day. Pick a rotating
  // subset sized 8-14 (out of the full roster), so every day has a healthy,
  // consistent amount of calendar activity instead of occasionally dipping
  // to just 1 or 2.
  let dateSeed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    dateSeed = (dateSeed * 37 + dateStr.charCodeAt(i)) % 100000;
  }
  const MIN_APPTS = 8;
  const MAX_APPTS = 14;
  const targetCount = MIN_APPTS + Math.floor(deterministicRandom(dateSeed + 500) * (MAX_APPTS - MIN_APPTS + 1));

  const scored = patients.map((p, idx) => ({
    patient: p,
    score: deterministicRandom(dateSeed + p.id * 17 + idx + 500),
  }));
  scored.sort((a, b) => b.score - a.score);
  const todaysPatients = scored.slice(0, targetCount).map((s) => s.patient);

  let created = 0;
  for (let i = 0; i < todaysPatients.length; i++) {
    const patient = todaysPatients[i];
    const doctor = doctors[i % doctors.length];
    const seed = patient.id * 11 + i;

    const hour = 8 + (i % 8); // spread across an 8am-4pm clinic day
    const minute = (i * 20) % 60;
    const apptTime = `${pad(hour)}:${pad(minute)}`;
    const apptAt = new Date(now);
    apptAt.setHours(hour, minute, 0, 0);

    const outcomeRoll = deterministicRandom(seed + 200);
    let status = 'scheduled';
    if (now >= apptAt) {
      if (outcomeRoll < 0.08) status = 'cancelled';
      else if (outcomeRoll < 0.16) status = 'no_show';
      else status = 'completed';
    }

    const type = APPOINTMENT_TYPES[(patient.id + i) % APPOINTMENT_TYPES.length];
    const notes =
      status === 'cancelled' ? 'Cancelled in advance by patient.' :
      status === 'no_show' ? 'Patient did not arrive for scheduled appointment.' :
      status === 'completed' ? 'Visit completed. See clinical notes for details.' :
      null;

    await runAsync(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, type, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patient.id, doctor.id, dateStr, apptTime, type, status, notes]
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
    const appointmentResult = await seedTodaysAppointments(dateStr, patients, doctors, now);

    if (sessionResult.skipped && handoffResult.skipped && appointmentResult.skipped) {
      console.log(`Daily seed: ${dateStr} already filled — nothing to do.`);
    } else {
      console.log(
        `Daily seed for ${dateStr}: ${sessionResult.created} dialysis sessions, ` +
        `${handoffResult.created} shift handoffs, ` +
        `${appointmentResult.created} appointments created.`
      );
    }
  } catch (err) {
    console.error('Daily seed failed:', err.message);
  }
}

module.exports = {
  runDailySeed,
  // Exposed for one-off backfill scripts only (e.g. filling gap days after
  // a period where the server wasn't running). Not used by the app itself.
  _internal: { seedTodaysDialysisSessions, seedTodaysHandoffs, seedTodaysAppointments },
};
