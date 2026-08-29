const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { verifyToken, checkRole } = require('./auth');
const router = express.Router();

// Create a new patient (creates both the user account and the patient record)
router.post('/', verifyToken, checkRole(['admin']), async (req, res) => {
  const {
    username, password, email, full_name, phone, address,
    date_of_birth, blood_type, emergency_contact, emergency_phone,
    medical_history, allergies, current_medications, dialysis_start_date, access_type
  } = req.body;

  if (!username || !password || !email || !full_name) {
    return res.status(400).json({ error: 'Username, password, email, and full name are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (username, password, email, full_name, role, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, email, full_name, 'patient', phone || null, address || null],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: err.message });
        }

        const userId = this.lastID;

        db.run(
          `INSERT INTO patients (
            user_id, date_of_birth, blood_type, emergency_contact, emergency_phone,
            medical_history, allergies, current_medications, dialysis_start_date, access_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId, date_of_birth || null, blood_type || null, emergency_contact || null, emergency_phone || null,
            medical_history || null, allergies || null, current_medications || null, dialysis_start_date || null, access_type || null
          ],
          function (err2) {
            if (err2) return res.status(500).json({ error: err2.message });

            const patientId = this.lastID;

            db.get(
              `SELECT p.*, u.full_name, u.email, u.phone, u.address, u.created_at
              FROM patients p
              JOIN users u ON p.user_id = u.id
              WHERE p.id = ?`,
              [patientId],
              (err3, row) => {
                if (err3) return res.status(500).json({ error: err3.message });
                res.status(201).json(row);
              }
            );
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all patients
router.get('/', verifyToken, checkRole(['admin', 'doctor', 'nurse']), (req, res) => {
  db.all(
    `SELECT p.*, u.full_name, u.email, u.phone, u.address, u.created_at
    FROM patients p
    JOIN users u ON p.user_id = u.id
    ORDER BY u.full_name`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get patient by ID
router.get('/:id', verifyToken, (req, res) => {
  const patientId = req.params.id;

  db.get(
    `SELECT p.*, u.full_name, u.email, u.phone, u.address
    FROM patients p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?`,
    [patientId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Patient not found' });

      // Check permissions
      if (req.user.role === 'patient' && req.user.patientId != patientId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(row);
    }
  );
});

// Get patient dialysis history
router.get('/:id/dialysis-history', verifyToken, (req, res) => {
  const patientId = req.params.id;

  if (req.user.role === 'patient' && req.user.patientId != patientId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.all(
    `SELECT ds.*, 
      doc_u.full_name as doctor_name,
      nurse_u.full_name as nurse_name
    FROM dialysis_sessions ds
    LEFT JOIN doctors doc ON ds.doctor_id = doc.id
    LEFT JOIN users doc_u ON doc.user_id = doc_u.id
    LEFT JOIN nurses n ON ds.nurse_id = n.id
    LEFT JOIN users nurse_u ON n.user_id = nurse_u.id
    WHERE ds.patient_id = ?
    ORDER BY ds.scheduled_date DESC, ds.scheduled_time DESC`,
    [patientId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get patient lab results
router.get('/:id/lab-results', verifyToken, (req, res) => {
  const patientId = req.params.id;

  if (req.user.role === 'patient' && req.user.patientId != patientId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.all(
    'SELECT * FROM lab_results WHERE patient_id = ? ORDER BY test_date DESC',
    [patientId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Update patient
router.put('/:id', verifyToken, checkRole(['admin', 'doctor']), (req, res) => {
  const { date_of_birth, blood_type, emergency_contact, emergency_phone, medical_history, allergies, current_medications, access_type } = req.body;

  db.run(
    `UPDATE patients SET 
      date_of_birth = ?, blood_type = ?, emergency_contact = ?, emergency_phone = ?,
      medical_history = ?, allergies = ?, current_medications = ?, access_type = ?
    WHERE id = ?`,
    [date_of_birth, blood_type, emergency_contact, emergency_phone, medical_history, allergies, current_medications, access_type, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Patient updated successfully' });
    }
  );
});

module.exports = router;
