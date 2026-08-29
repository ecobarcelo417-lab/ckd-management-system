const express = require('express');
const db = require('../database');
const { verifyToken, checkRole } = require('./auth');
const router = express.Router();

// Philippine-time "today" (YYYY-MM-DD), matching the format dailySeed.js uses
// when generating scheduled_date/shift_date. Using plain UTC here caused
// nurse/doctor/patient dashboards to look empty near midnight boundaries,
// since the server's system time (UTC) can be a different calendar day
// than Manila time.
function todayManila() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

// Returns dateStr minus N days, as 'YYYY-MM-DD'. Replaces SQLite's
// date(?, '-N days') syntax, which has no direct Postgres equivalent when
// scheduled_date/shift_date are stored as TEXT — computing the boundary in
// JS keeps the query itself portable across both databases.
function daysBefore(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// Get dashboard stats
router.get('/stats', verifyToken, (req, res) => {
  const today = todayManila();

  const stats = {};

  // Total patients
  db.get('SELECT COUNT(*) as count FROM patients', [], (err, row) => {
    stats.totalPatients = row ? row.count : 0;

    // Total doctors
    db.get('SELECT COUNT(*) as count FROM doctors', [], (err, row) => {
      stats.totalDoctors = row ? row.count : 0;

      // Total nurses
      db.get('SELECT COUNT(*) as count FROM nurses', [], (err, row) => {
        stats.totalNurses = row ? row.count : 0;

        // Today's sessions
        db.get("SELECT COUNT(*) as count FROM dialysis_sessions WHERE scheduled_date = ?", [today], (err, row) => {
          stats.todaySessions = row ? row.count : 0;

          // Sessions by status
          db.all("SELECT status, COUNT(*) as count FROM dialysis_sessions WHERE scheduled_date = ? GROUP BY status", [today], (err, rows) => {
            stats.todayStatus = rows || [];

            // Recent sessions
            db.all(
              `SELECT ds.*, u.full_name as patient_name
              FROM dialysis_sessions ds
              JOIN patients p ON ds.patient_id = p.id
              JOIN users u ON p.user_id = u.id
              ORDER BY ds.scheduled_date DESC, ds.scheduled_time DESC
              LIMIT 10`,
              [],
              (err, rows) => {
                stats.recentSessions = rows || [];

                // 14-day daily session volume, for trend sparkline
                db.all(
                  `SELECT scheduled_date as date, COUNT(*) as count
                   FROM dialysis_sessions
                   WHERE scheduled_date >= ? AND scheduled_date <= ?
                   GROUP BY scheduled_date
                   ORDER BY scheduled_date`,
                  [daysBefore(today, 13), today],
                  (err, trendRows) => {
                    stats.sessionsTrend = trendRows || [];

                    // Week-over-week completed session volume
                    db.get(
                      `SELECT COUNT(*) as count FROM dialysis_sessions
                       WHERE status = 'completed' AND scheduled_date >= ? AND scheduled_date <= ?`,
                      [daysBefore(today, 6), today],
                      (err, thisWeekRow) => {
                        db.get(
                          `SELECT COUNT(*) as count FROM dialysis_sessions
                           WHERE status = 'completed' AND scheduled_date >= ? AND scheduled_date <= ?`,
                          [daysBefore(today, 13), daysBefore(today, 7)],
                          (err, lastWeekRow) => {
                            const thisWeek = thisWeekRow ? thisWeekRow.count : 0;
                            const lastWeek = lastWeekRow ? lastWeekRow.count : 0;
                            stats.weeklyCompleted = thisWeek;
                            stats.weekOverWeekChange = lastWeek > 0
                              ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
                              : (thisWeek > 0 ? 100 : 0);

                            // Average Kt/V this month vs. prior month (dialysis adequacy trend)
                            db.get(
                              `SELECT AVG(kt_v) as avg FROM dialysis_sessions
                               WHERE kt_v IS NOT NULL AND scheduled_date >= ? AND scheduled_date <= ?`,
                              [daysBefore(today, 29), today],
                              (err, ktvNowRow) => {
                                db.get(
                                  `SELECT AVG(kt_v) as avg FROM dialysis_sessions
                                   WHERE kt_v IS NOT NULL AND scheduled_date >= ? AND scheduled_date <= ?`,
                                  [daysBefore(today, 59), daysBefore(today, 30)],
                                  (err, ktvPrevRow) => {
                                    const ktvNow = ktvNowRow && ktvNowRow.avg ? ktvNowRow.avg : 0;
                                    const ktvPrev = ktvPrevRow && ktvPrevRow.avg ? ktvPrevRow.avg : 0;
                                    stats.avgKtv = Math.round(ktvNow * 100) / 100;
                                    stats.avgKtvChange = ktvPrev > 0
                                      ? Math.round(((ktvNow - ktvPrev) / ktvPrev) * 1000) / 10
                                      : 0;
                                    res.json(stats);
                                  }
                                );
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          });
        });
      });
    });
  });
});

// Get patient dashboard
router.get('/patient', verifyToken, checkRole(['patient']), (req, res) => {
  const patientId = req.user.patientId;
  const today = todayManila();

  const stats = {};

  // Upcoming sessions
  db.all(
    `SELECT * FROM dialysis_sessions 
    WHERE patient_id = ? AND scheduled_date >= ?
    ORDER BY scheduled_date, scheduled_time
    LIMIT 5`,
    [patientId, today],
    (err, rows) => {
      stats.upcomingSessions = rows || [];

      // Recent lab results
      db.all(
        'SELECT * FROM lab_results WHERE patient_id = ? ORDER BY test_date DESC LIMIT 5',
        [patientId],
        (err, rows) => {
          stats.recentLabs = rows || [];

          // Active prescriptions
          db.all(
            `SELECT pr.*, u.full_name as doctor_name
            FROM prescriptions pr
            JOIN doctors doc ON pr.doctor_id = doc.id
            JOIN users u ON doc.user_id = u.id
            WHERE pr.patient_id = ? AND pr.status = 'active'`,
            [patientId],
            (err, rows) => {
              stats.activePrescriptions = rows || [];
              res.json(stats);
            }
          );
        }
      );
    }
  );
});

// Get doctor dashboard
router.get('/doctor', verifyToken, checkRole(['doctor']), (req, res) => {
  const doctorId = req.user.doctorId;
  const today = todayManila();

  const stats = {};

  // Today's assigned sessions
  db.all(
    `SELECT ds.*, u.full_name as patient_name
    FROM dialysis_sessions ds
    JOIN patients p ON ds.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE ds.doctor_id = ? AND ds.scheduled_date = ?
    ORDER BY ds.scheduled_time`,
    [doctorId, today],
    (err, rows) => {
      stats.todaySessions = rows || [];

      // Total patients under care
      db.get(
        `SELECT COUNT(DISTINCT patient_id) as count FROM dialysis_sessions WHERE doctor_id = ?`,
        [doctorId],
        (err, row) => {
          stats.totalPatients = row ? row.count : 0;

          // Pending lab reviews
          db.all(
            `SELECT lr.*, u.full_name as patient_name
            FROM lab_results lr
            JOIN patients p ON lr.patient_id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE lr.patient_id IN (
              SELECT DISTINCT patient_id FROM dialysis_sessions WHERE doctor_id = ?
            )
            ORDER BY lr.test_date DESC
            LIMIT 10`,
            [doctorId],
            (err, rows) => {
              stats.recentLabs = rows || [];
              res.json(stats);
            }
          );
        }
      );
    }
  );
});

// Get nurse dashboard
router.get('/nurse', verifyToken, checkRole(['nurse']), (req, res) => {
  const nurseId = req.user.nurseId;
  const today = todayManila();

  const stats = {};

  // Today's assigned sessions
  db.all(
    `SELECT ds.*, u.full_name as patient_name
    FROM dialysis_sessions ds
    JOIN patients p ON ds.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE ds.nurse_id = ? AND ds.scheduled_date = ?
    ORDER BY ds.scheduled_time`,
    [nurseId, today],
    (err, rows) => {
      stats.todaySessions = rows || [];

      // In-progress sessions
      db.all(
        `SELECT ds.*, u.full_name as patient_name
        FROM dialysis_sessions ds
        JOIN patients p ON ds.patient_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE ds.nurse_id = ? AND ds.status = 'in_progress'`,
        [nurseId],
        (err, rows) => {
          stats.inProgressSessions = rows || [];
          res.json(stats);
        }
      );
    }
  );
});

module.exports = router;
