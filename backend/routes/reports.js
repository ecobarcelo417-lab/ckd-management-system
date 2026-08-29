const express = require('express');
const db = require('../database');
const { verifyToken, checkRole } = require('./auth');
const router = express.Router();

// Get dialysis statistics
router.get('/dialysis-stats', verifyToken, checkRole(['admin', 'doctor', 'nurse']), (req, res) => {
  const { start_date, end_date } = req.query;

  db.all(
    `SELECT 
      scheduled_date,
      COUNT(*) as total_sessions,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
      SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed,
      AVG(fluid_removed) as avg_fluid_removed,
      AVG(kt_v) as avg_ktv,
      AVG(urea_reduction_ratio) as avg_urr
    FROM dialysis_sessions
    WHERE scheduled_date BETWEEN ? AND ?
    GROUP BY scheduled_date
    ORDER BY scheduled_date`,
    [start_date || '2024-01-01', end_date || '2024-12-31'],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get patient treatment summary
router.get('/patient-summary/:patientId', verifyToken, (req, res) => {
  const patientId = req.params.patientId;

  if (req.user.role === 'patient' && req.user.patientId != patientId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.all(
    `SELECT 
      SUBSTR(scheduled_date, 1, 7) as month,
      COUNT(*) as total_sessions,
      AVG(fluid_removed) as avg_fluid_removed,
      AVG(kt_v) as avg_ktv,
      AVG(urea_reduction_ratio) as avg_urr,
      AVG(pre_weight - post_weight) as avg_weight_loss
    FROM dialysis_sessions
    WHERE patient_id = ? AND status = 'completed'
    GROUP BY SUBSTR(scheduled_date, 1, 7)
    ORDER BY month DESC`,
    [patientId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

module.exports = router;
