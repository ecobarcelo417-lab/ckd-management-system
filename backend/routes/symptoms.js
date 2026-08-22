const express = require('express');
const db = require('../database');
const { verifyToken, checkRole } = require('./auth');
const router = express.Router();

// List symptom logs
// - Patients: own logs only
// - Doctor / Nurse / Admin: all (optional patient_id filter)
router.get('/', verifyToken, (req, res) => {
  const { patient_id, reviewed } = req.query;
  let query = `SELECT sl.*, u.full_name as patient_name
    FROM symptom_logs sl
    JOIN patients p ON sl.patient_id = p.id
    JOIN users u ON p.user_id = u.id`;
  const params = [];
  const conditions = [];

  if (req.user.role === 'patient') {
    conditions.push('sl.patient_id = ?');
    params.push(req.user.patientId);
  } else if (patient_id) {
    conditions.push('sl.patient_id = ?');
    params.push(patient_id);
  }

  if (reviewed === '0' || reviewed === '1') {
    conditions.push('sl.reviewed = ?');
    params.push(parseInt(reviewed, 10));
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY sl.logged_at DESC, sl.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Patient creates a symptom log entry
router.post('/', verifyToken, checkRole(['patient']), (req, res) => {
  const patientId = req.user.patientId;
  if (!patientId) {
    return res.status(400).json({ error: 'Patient profile not found for this account' });
  }

  const {
    symptoms,
    severity,
    fluid_intake_ml,
    weight_kg,
    notes,
    logged_at
  } = req.body;

  if (!symptoms || !String(symptoms).trim()) {
    return res.status(400).json({ error: 'Symptoms description is required' });
  }

  const validSeverities = ['mild', 'moderate', 'severe'];
  const sev = validSeverities.includes(severity) ? severity : 'mild';
  const when = logged_at || new Date().toISOString().slice(0, 16).replace('T', ' ');

  db.run(
    `INSERT INTO symptom_logs
      (patient_id, logged_at, symptoms, severity, fluid_intake_ml, weight_kg, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      patientId,
      when,
      String(symptoms).trim(),
      sev,
      fluid_intake_ml != null && fluid_intake_ml !== '' ? Number(fluid_intake_ml) : null,
      weight_kg != null && weight_kg !== '' ? Number(weight_kg) : null,
      notes || null
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      // Notify care team (doctors) — best-effort
      db.all(
        `SELECT u.id FROM users u JOIN doctors d ON d.user_id = u.id`,
        [],
        (nErr, doctors) => {
          if (!nErr && doctors && doctors.length) {
            const title = 'New patient symptom report';
            const message = `A patient logged symptoms (${sev}): ${String(symptoms).slice(0, 120)}`;
            doctors.forEach((doc) => {
              db.run(
                'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
                [doc.id, title, message, sev === 'severe' ? 'alert' : 'info']
              );
            });
          }
        }
      );

      res.status(201).json({ message: 'Symptom log recorded', id: this.lastID });
    }
  );
});

// Care team marks a log as reviewed
router.put('/:id/review', verifyToken, checkRole(['admin', 'doctor', 'nurse']), (req, res) => {
  const reviewerId = req.user.userId;
  const now = new Date().toISOString();

  db.run(
    `UPDATE symptom_logs SET reviewed = 1, reviewed_by = ?, reviewed_at = ? WHERE id = ?`,
    [reviewerId, now, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Symptom log not found' });
      res.json({ message: 'Marked as reviewed' });
    }
  );
});

// Delete own unreviewed log (patient) or any (admin)
router.delete('/:id', verifyToken, (req, res) => {
  db.get('SELECT * FROM symptom_logs WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Symptom log not found' });

    if (req.user.role === 'patient') {
      if (req.user.patientId != row.patient_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (row.reviewed) {
        return res.status(400).json({ error: 'Cannot delete a log already reviewed by the care team' });
      }
    } else if (req.user.role !== 'admin' && req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.run('DELETE FROM symptom_logs WHERE id = ?', [req.params.id], function (delErr) {
      if (delErr) return res.status(500).json({ error: delErr.message });
      res.json({ message: 'Symptom log deleted' });
    });
  });
});

module.exports = router;
