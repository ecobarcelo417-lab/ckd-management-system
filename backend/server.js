const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const db = require('./database');
const { runDailySeed } = require('./dailySeed');
const { router: authRouter } = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', require('./routes/users'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/nurses', require('./routes/nurses'));
app.use('/api/dialysis', require('./routes/dialysis'));
app.use('/api/labs', require('./routes/labs'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/symptoms', require('./routes/symptoms'));
app.use('/api/handoffs', require('./routes/handoffs'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`CKD Management System Backend running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);

  // Run once on startup (short delay lets table creation/seed-check finish first),
  // then automatically every day at 00:05 Asia/Manila so the system keeps
  // filling itself in without needing a restart.
  setTimeout(() => {
    runDailySeed();
  }, 1500);

  cron.schedule('5 0 * * *', () => {
    runDailySeed();
  }, { timezone: 'Asia/Manila' });
});

module.exports = app;
