const express = require('express');
const db = require('../database');
const { verifyToken, checkRole } = require('./auth');
const router = express.Router();

// Get all appointments
router.get('/', verifyToken, (req, res) => {
  const { patient_id, status, date } = req.query;
  let query = `SELECT a.*, u.full_name as patient_name, doc_u.full_name as doctor_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    LEFT JOIN doctors doc ON a.doctor_id = doc.id
    LEFT JOIN users doc_u ON doc.user_id = doc_u.id`;
  const params = [];
  const conditions = [];

  if (patient_id) {
    conditions.push('a.patient_id = ?');
    params.push(patient_id);
  }
  if (status) {
    conditions.push('a.status = ?');
    params.push(status);
  }
  if (date) {
    conditions.push('a.appointment_date = ?');
    params.push(date);
  }
  if (req.user.role === 'patient') {
    conditions.push('a.patient_id = ?');
    params.push(req.user.patientId);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get appointment by ID
router.get('/:id', verifyToken, (req, res) => {
  db.get(
    `SELECT a.*, u.full_name as patient_name, doc_u.full_name as doctor_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    LEFT JOIN doctors doc ON a.doctor_id = doc.id
    LEFT JOIN users doc_u ON doc.user_id = doc_u.id
    WHERE a.id = ?`,
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Appointment not found' });

      if (req.user.role === 'patient' && req.user.patientId != row.patient_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(row);
    }
  );
});

// Create appointment
router.post('/', verifyToken, checkRole(['admin', 'doctor', 'nurse']), (req, res) => {
  const { patient_id, doctor_id, appointment_date, appointment_time, type, notes } = req.body;

  if (!patient_id || !appointment_date || !appointment_time || !type) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  db.run(
    'INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, type, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [patient_id, doctor_id, appointment_date, appointment_time, type, notes],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Appointment created', appointmentId: this.lastID });
    }
  );
});

// Update appointment
router.put('/:id', verifyToken, checkRole(['admin', 'doctor', 'nurse']), (req, res) => {
  const { appointment_date, appointment_time, type, status, notes } = req.body;

  db.run(
    'UPDATE appointments SET appointment_date = ?, appointment_time = ?, type = ?, status = ?, notes = ? WHERE id = ?',
    [appointment_date, appointment_time, type, status, notes, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Appointment updated' });
    }
  );
});

// Delete appointment
router.delete('/:id', verifyToken, checkRole(['admin', 'doctor', 'nurse']), (req, res) => {
  db.run('DELETE FROM appointments WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Appointment deleted' });
  });
});

module.exports = router;
