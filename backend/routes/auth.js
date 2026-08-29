const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'ckd-management-system-secret-key-2024';

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, full_name, role, phone, address, ...roleData } = req.body;

    if (!username || !password || !email || !full_name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validRoles = ['admin', 'doctor', 'nurse', 'patient'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (username, password, email, full_name, role, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, email, full_name, role, phone || null, address || null],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: err.message });
        }

        const userId = this.lastID;

        // Create role-specific record
        if (role === 'patient') {
          db.run(
            'INSERT INTO patients (user_id, date_of_birth, blood_type, emergency_contact, dialysis_start_date, access_type) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, roleData.date_of_birth || null, roleData.blood_type || null, roleData.emergency_contact || null, roleData.dialysis_start_date || null, roleData.access_type || null]
          );
        } else if (role === 'doctor') {
          db.run(
            'INSERT INTO doctors (user_id, specialization, license_number, department, shift_preference) VALUES (?, ?, ?, ?, ?)',
            [userId, roleData.specialization || null, roleData.license_number || null, roleData.department || null, roleData.shift_preference || null]
          );
        } else if (role === 'nurse') {
          db.run(
            'INSERT INTO nurses (user_id, license_number, department, shift_preference) VALUES (?, ?, ?, ?)',
            [userId, roleData.license_number || null, roleData.department || null, roleData.shift_preference || null]
          );
        }

        res.status(201).json({ message: 'User registered successfully', userId });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get(
    `SELECT u.*, 
      p.id as patient_id, p.date_of_birth, p.blood_type, p.dialysis_start_date, p.access_type,
      d.id as doctor_id, d.specialization, d.license_number, d.department as doctor_department, d.shift_preference as doctor_shift_preference,
      n.id as nurse_id, n.license_number as nurse_license, n.department as nurse_department, n.shift_preference
    FROM users u
    LEFT JOIN patients p ON u.id = p.user_id
    LEFT JOIN doctors d ON u.id = d.user_id
    LEFT JOIN nurses n ON u.id = n.user_id
    WHERE u.username = ?`,
    [username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username, 
          role: user.role,
          patientId: user.patient_id,
          doctorId: user.doctor_id,
          nurseId: user.nurse_id
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Remove password from response
      delete user.password;

      res.json({
        message: 'Login successful',
        token,
        user
      });
    }
  );
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
};

// Check role middleware
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

// Get current user
router.get('/me', verifyToken, (req, res) => {
  db.get(
    `SELECT u.*, 
      p.id as patient_id, p.date_of_birth, p.blood_type, p.dialysis_start_date, p.access_type,
      d.id as doctor_id, d.specialization, d.license_number, d.department as doctor_department, d.shift_preference as doctor_shift_preference,
      n.id as nurse_id, n.license_number as nurse_license, n.department as nurse_department, n.shift_preference
    FROM users u
    LEFT JOIN patients p ON u.id = p.user_id
    LEFT JOIN doctors d ON u.id = d.user_id
    LEFT JOIN nurses n ON u.id = n.user_id
    WHERE u.id = ?`,
    [req.user.userId],
    (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(404).json({ error: 'User not found' });
      delete user.password;
      res.json(user);
    }
  );
});

module.exports = { router, verifyToken, checkRole, JWT_SECRET };
