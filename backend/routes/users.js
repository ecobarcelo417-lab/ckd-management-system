const express = require('express');
const db = require('../database');
const { verifyToken, checkRole } = require('./auth');
const router = express.Router();

// Get all users (admin only)
router.get('/', verifyToken, checkRole(['admin']), (req, res) => {
  db.all(
    `SELECT u.id, u.username, u.email, u.full_name, u.role, u.phone, u.address, u.created_at,
      p.id as patient_id, p.date_of_birth, p.blood_type,
      d.id as doctor_id, d.specialization, d.license_number as doctor_license_number, d.department as doctor_department, d.shift_preference as doctor_shift_preference,
      n.id as nurse_id, n.license_number as nurse_license_number, n.department as nurse_department, n.shift_preference as nurse_shift_preference
    FROM users u
    LEFT JOIN patients p ON u.id = p.user_id
    LEFT JOIN doctors d ON u.id = d.user_id
    LEFT JOIN nurses n ON u.id = n.user_id
    ORDER BY u.created_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get user by ID
router.get('/:id', verifyToken, (req, res) => {
  const userId = req.params.id;

  // Users can only view their own profile unless admin
  if (req.user.role !== 'admin' && req.user.userId != userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.get(
    `SELECT u.id, u.username, u.email, u.full_name, u.role, u.phone, u.address, u.created_at,
      p.*,
      d.*,
      n.*
    FROM users u
    LEFT JOIN patients p ON u.id = p.user_id
    LEFT JOIN doctors d ON u.id = d.user_id
    LEFT JOIN nurses n ON u.id = n.user_id
    WHERE u.id = ?`,
    [userId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'User not found' });
      delete row.password;
      res.json(row);
    }
  );
});

// Update user
router.put('/:id', verifyToken, (req, res) => {
  const userId = req.params.id;

  if (req.user.role !== 'admin' && req.user.userId != userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { full_name, email, phone, address } = req.body;

  db.run(
    'UPDATE users SET full_name = ?, email = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [full_name, email, phone, address, userId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'User updated successfully' });
    }
  );
});

// Delete user (admin only)
router.delete('/:id', verifyToken, checkRole(['admin']), (req, res) => {
  db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'User deleted successfully' });
  });
});

module.exports = router;
