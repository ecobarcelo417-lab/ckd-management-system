const express = require('express');
const db = require('../database');
const { verifyToken, checkRole } = require('./auth');
const router = express.Router();

// Get all lab results
router.get('/', verifyToken, (req, res) => {
  const { patient_id } = req.query;
  let query = `SELECT lr.*, u.full_name as patient_name
    FROM lab_results lr
    JOIN patients p ON lr.patient_id = p.id
    JOIN users u ON p.user_id = u.id`;
  const params = [];

  if (patient_id) {
    query += ' WHERE lr.patient_id = ?';
    params.push(patient_id);
  }

  if (req.user.role === 'patient') {
    query += params.length > 0 ? ' AND' : ' WHERE';
    query += ' lr.patient_id = ?';
    params.push(req.user.patientId);
  }

  query += ' ORDER BY lr.test_date DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get lab result by ID
router.get('/:id', verifyToken, (req, res) => {
  db.get(
    `SELECT lr.*, u.full_name as patient_name
    FROM lab_results lr
    JOIN patients p ON lr.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE lr.id = ?`,
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Lab result not found' });

      if (req.user.role === 'patient' && req.user.patientId != row.patient_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(row);
    }
  );
});

// Create lab result
router.post('/', verifyToken, checkRole(['admin', 'doctor']), (req, res) => {
  const {
    patient_id, test_date, hemoglobin, hematocrit, white_blood_cells, platelets,
    sodium, potassium, chloride, bicarbonate, bun, creatinine, glucose,
    calcium, phosphorus, pth, albumin, iron, ferritin, tsat, crp, notes
  } = req.body;

  if (!patient_id || !test_date) {
    return res.status(400).json({ error: 'Patient and test date are required' });
  }

  db.run(
    `INSERT INTO lab_results 
    (patient_id, test_date, hemoglobin, hematocrit, white_blood_cells, platelets,
     sodium, potassium, chloride, bicarbonate, bun, creatinine, glucose,
     calcium, phosphorus, pth, albumin, iron, ferritin, tsat, crp, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [patient_id, test_date, hemoglobin, hematocrit, white_blood_cells, platelets,
     sodium, potassium, chloride, bicarbonate, bun, creatinine, glucose,
     calcium, phosphorus, pth, albumin, iron, ferritin, tsat, crp, notes],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Lab result recorded', labId: this.lastID });
    }
  );
});

// Update lab result
router.put('/:id', verifyToken, checkRole(['admin', 'doctor']), (req, res) => {
  const {
    test_date, hemoglobin, hematocrit, white_blood_cells, platelets,
    sodium, potassium, chloride, bicarbonate, bun, creatinine, glucose,
    calcium, phosphorus, pth, albumin, iron, ferritin, tsat, crp, notes
  } = req.body;

  db.run(
    `UPDATE lab_results SET
      test_date = ?, hemoglobin = ?, hematocrit = ?, white_blood_cells = ?, platelets = ?,
      sodium = ?, potassium = ?, chloride = ?, bicarbonate = ?, bun = ?, creatinine = ?, glucose = ?,
      calcium = ?, phosphorus = ?, pth = ?, albumin = ?, iron = ?, ferritin = ?, tsat = ?, crp = ?, notes = ?
    WHERE id = ?`,
    [test_date, hemoglobin, hematocrit, white_blood_cells, platelets,
     sodium, potassium, chloride, bicarbonate, bun, creatinine, glucose,
     calcium, phosphorus, pth, albumin, iron, ferritin, tsat, crp, notes, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Lab result updated' });
    }
  );
});

// Delete lab result
router.delete('/:id', verifyToken, checkRole(['admin', 'doctor']), (req, res) => {
  db.run('DELETE FROM lab_results WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Lab result deleted' });
  });
});

module.exports = router;
