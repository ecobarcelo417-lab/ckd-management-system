const express = require('express');
const db = require('../database');
const { verifyToken, checkRole } = require('./auth');
const router = express.Router();

// Get all prescriptions
router.get('/', verifyToken, (req, res) => {
  const { patient_id, status } = req.query;
  let query = `SELECT pr.*, u.full_name as patient_name, doc_u.full_name as doctor_name
    FROM prescriptions pr
    JOIN patients p ON pr.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    JOIN doctors doc ON pr.doctor_id = doc.id
    JOIN users doc_u ON doc.user_id = doc_u.id`;
  const params = [];
  const conditions = [];

  if (patient_id) {
    conditions.push('pr.patient_id = ?');
    params.push(patient_id);
  }
  if (status) {
    conditions.push('pr.status = ?');
    params.push(status);
  }
  if (req.user.role === 'patient') {
    conditions.push('pr.patient_id = ?');
    params.push(req.user.patientId);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY pr.created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get prescription by ID
router.get('/:id', verifyToken, (req, res) => {
  db.get(
    `SELECT pr.*, u.full_name as patient_name, doc_u.full_name as doctor_name
    FROM prescriptions pr
    JOIN patients p ON pr.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    JOIN doctors doc ON pr.doctor_id = doc.id
    JOIN users doc_u ON doc.user_id = doc_u.id
    WHERE pr.id = ?`,
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Prescription not found' });

      if (req.user.role === 'patient' && req.user.patientId != row.patient_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(row);
    }
  );
});

// Create prescription
router.post('/', verifyToken, checkRole(['admin', 'doctor']), (req, res) => {
  const {
    patient_id, medication_name, dosage, frequency, route,
    start_date, end_date, instructions
  } = req.body;

  if (!patient_id || !medication_name || !dosage || !frequency || !start_date) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  const doctorId = req.user.role === 'doctor' ? req.user.doctorId : req.body.doctor_id;

  db.run(
    `INSERT INTO prescriptions 
    (patient_id, doctor_id, medication_name, dosage, frequency, route, start_date, end_date, instructions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [patient_id, doctorId, medication_name, dosage, frequency, route, start_date, end_date, instructions],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Prescription created', prescriptionId: this.lastID });
    }
  );
});

// Update prescription
router.put('/:id', verifyToken, checkRole(['admin', 'doctor']), (req, res) => {
  const { dosage, frequency, route, end_date, instructions, status } = req.body;

  db.run(
    `UPDATE prescriptions SET
      dosage = ?, frequency = ?, route = ?, end_date = ?, instructions = ?, status = ?
    WHERE id = ?`,
    [dosage, frequency, route, end_date, instructions, status, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Prescription updated' });
    }
  );
});

// Delete prescription
router.delete('/:id', verifyToken, checkRole(['admin', 'doctor']), (req, res) => {
  db.run('DELETE FROM prescriptions WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Prescription deleted' });
  });
});

module.exports = router;
