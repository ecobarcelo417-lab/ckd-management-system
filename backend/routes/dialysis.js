const express = require('express');
const db = require('../database');
const { verifyToken, checkRole } = require('./auth');
const router = express.Router();

// Get all dialysis sessions
router.get('/', verifyToken, (req, res) => {
  const { status, date, patient_id } = req.query;
  let query = `SELECT ds.*, 
    u.full_name as patient_name,
    doc_u.full_name as doctor_name,
    nurse_u.full_name as nurse_name
  FROM dialysis_sessions ds
  JOIN patients p ON ds.patient_id = p.id
  JOIN users u ON p.user_id = u.id
  LEFT JOIN doctors doc ON ds.doctor_id = doc.id
  LEFT JOIN users doc_u ON doc.user_id = doc_u.id
  LEFT JOIN nurses n ON ds.nurse_id = n.id
  LEFT JOIN users nurse_u ON n.user_id = nurse_u.id`;

  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('ds.status = ?');
    params.push(status);
  }
  if (date) {
    conditions.push('ds.scheduled_date = ?');
    params.push(date);
  }
  if (patient_id) {
    conditions.push('ds.patient_id = ?');
    params.push(patient_id);
  }

  // Patients can only see their own sessions
  if (req.user.role === 'patient') {
    conditions.push('ds.patient_id = ?');
    params.push(req.user.patientId);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY ds.scheduled_date DESC, ds.scheduled_time DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get session by ID
router.get('/:id', verifyToken, (req, res) => {
  db.get(
    `SELECT ds.*, 
      u.full_name as patient_name,
      doc_u.full_name as doctor_name,
      nurse_u.full_name as nurse_name
    FROM dialysis_sessions ds
    JOIN patients p ON ds.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    LEFT JOIN doctors doc ON ds.doctor_id = doc.id
    LEFT JOIN users doc_u ON doc.user_id = doc_u.id
    LEFT JOIN nurses n ON ds.nurse_id = n.id
    LEFT JOIN users nurse_u ON n.user_id = nurse_u.id
    WHERE ds.id = ?`,
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Session not found' });

      if (req.user.role === 'patient' && req.user.patientId != row.patient_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(row);
    }
  );
});

// Create new session
router.post('/', verifyToken, checkRole(['admin', 'doctor', 'nurse']), (req, res) => {
  const {
    patient_id, scheduled_date, scheduled_time, duration_minutes,
    doctor_id, nurse_id, machine_id, dry_weight, dialysate_composition
  } = req.body;

  if (!patient_id || !scheduled_date || !scheduled_time) {
    return res.status(400).json({ error: 'Patient, date, and time are required' });
  }

  db.run(
    `INSERT INTO dialysis_sessions 
    (patient_id, scheduled_date, scheduled_time, duration_minutes, status, doctor_id, nurse_id, machine_id, dry_weight, dialysate_composition)
    VALUES (?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?)`,
    [patient_id, scheduled_date, scheduled_time, duration_minutes || 240, doctor_id, nurse_id, machine_id, dry_weight, dialysate_composition],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Session created', sessionId: this.lastID });
    }
  );
});

// Update session (pre-dialysis assessment)
router.put('/:id/pre', verifyToken, checkRole(['admin', 'nurse']), (req, res) => {
  const {
    pre_weight, blood_pressure_before, heart_rate_before, temperature,
    access_site_condition, heparin_dose, notes
  } = req.body;

  db.run(
    `UPDATE dialysis_sessions SET
      pre_weight = ?, blood_pressure_before = ?, heart_rate_before = ?, temperature = ?,
      access_site_condition = ?, heparin_dose = ?, notes = ?, status = 'in_progress',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [pre_weight, blood_pressure_before, heart_rate_before, temperature, access_site_condition, heparin_dose, notes, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Pre-dialysis assessment recorded' });
    }
  );
});

// Update session (post-dialysis assessment) — nurse/admin floor workflow
router.put('/:id/post', verifyToken, checkRole(['admin', 'nurse']), (req, res) => {
  const {
    post_weight, blood_pressure_after, heart_rate_after,
    fluid_removed, kt_v, urea_reduction_ratio, complications, notes
  } = req.body;

  // Calculate weight gain/loss
  db.get('SELECT pre_weight FROM dialysis_sessions WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    const weightGain = row && row.pre_weight && post_weight ? (row.pre_weight - post_weight).toFixed(2) : null;

    db.run(
      `UPDATE dialysis_sessions SET
        post_weight = ?, blood_pressure_after = ?, heart_rate_after = ?,
        weight_gain = ?, fluid_removed = ?, kt_v = ?, urea_reduction_ratio = ?,
        complications = ?, notes = ?, status = 'completed',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [post_weight, blood_pressure_after, heart_rate_after, weightGain, fluid_removed, kt_v, urea_reduction_ratio, complications, notes, req.params.id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Post-dialysis assessment recorded' });
      }
    );
  });
});

// Update session status — nurse runs the floor; doctor/admin may cancel/miss
router.put('/:id/status', verifyToken, checkRole(['admin', 'doctor', 'nurse']), (req, res) => {
  const { status } = req.body;
  const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled', 'missed'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.run(
    'UPDATE dialysis_sessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Status updated' });
    }
  );
});

// Delete session
router.delete('/:id', verifyToken, checkRole(['admin', 'doctor']), (req, res) => {
  db.run('DELETE FROM dialysis_sessions WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Session deleted' });
  });
});

// Get today's sessions
router.get('/today/all', verifyToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  let query = `SELECT ds.*, 
    u.full_name as patient_name,
    doc_u.full_name as doctor_name,
    nurse_u.full_name as nurse_name
  FROM dialysis_sessions ds
  JOIN patients p ON ds.patient_id = p.id
  JOIN users u ON p.user_id = u.id
  LEFT JOIN doctors doc ON ds.doctor_id = doc.id
  LEFT JOIN users doc_u ON doc.user_id = doc_u.id
  LEFT JOIN nurses n ON ds.nurse_id = n.id
  LEFT JOIN users nurse_u ON n.user_id = nurse_u.id
  WHERE ds.scheduled_date = ?`;

  const params = [today];

  if (req.user.role === 'patient') {
    query += ' AND ds.patient_id = ?';
    params.push(req.user.patientId);
  }

  query += ' ORDER BY ds.scheduled_time';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
