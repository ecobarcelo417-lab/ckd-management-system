const express = require('express');
const db = require('../database');
const { verifyToken } = require('./auth');
const router = express.Router();

// Get notifications for current user
router.get('/', verifyToken, (req, res) => {
  db.all(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.user.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get unread count
router.get('/unread-count', verifyToken, (req, res) => {
  db.get(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
    [req.user.userId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ count: row.count });
    }
  );
});

// Mark as read
router.put('/:id/read', verifyToken, (req, res) => {
  db.run(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.userId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Notification marked as read' });
    }
  );
});

// Mark all as read
router.put('/read-all', verifyToken, (req, res) => {
  db.run(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
    [req.user.userId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'All notifications marked as read' });
    }
  );
});

// Create notification (internal use)
router.post('/', verifyToken, (req, res) => {
  const { user_id, title, message, type } = req.body;

  db.run(
    'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
    [user_id, title, message, type || 'info'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Notification created' });
    }
  );
});

module.exports = router;
