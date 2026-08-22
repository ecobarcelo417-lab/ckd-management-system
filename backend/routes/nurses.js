const express = require('express');
const db = require('../database');
const { verifyToken, checkRole } = require('./auth');
const router = express.Router();

// Get all nurses
router.get('/', verifyToken, (req, res) => {
  db.all(
    `SELECT n.*, u.full_name, u.email, u.phone
    FROM nurses n
    JOIN users u ON n.user_id = u.id
    ORDER BY u.full_name`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get nurse's assigned sessions
router.get('/:id/sessions', verifyToken, checkRole(['admin', 'nurse']), (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  db.all(
    `SELECT ds.*, u.full_name as patient_name
    FROM dialysis_sessions ds
    JOIN patients p ON ds.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE ds.nurse_id = ? AND ds.scheduled_date >= ?
    ORDER BY ds.scheduled_date, ds.scheduled_time`,
    [req.params.id, today],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

module.exports = router;
