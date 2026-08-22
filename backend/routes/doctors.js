const express = require('express');
const db = require('../database');
const { verifyToken, checkRole } = require('./auth');
const router = express.Router();

// Get all doctors
router.get('/', verifyToken, (req, res) => {
  db.all(
    `SELECT d.*, u.full_name, u.email, u.phone
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    ORDER BY u.full_name`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get doctor's patients
router.get('/:id/patients', verifyToken, checkRole(['admin', 'doctor']), (req, res) => {
  db.all(
    `SELECT DISTINCT p.*, u.full_name, u.email, u.phone
    FROM patients p
    JOIN users u ON p.user_id = u.id
    JOIN dialysis_sessions ds ON p.id = ds.patient_id
    WHERE ds.doctor_id = ?
    ORDER BY u.full_name`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

module.exports = router;
