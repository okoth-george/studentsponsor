require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────

// Allowed frontend origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

// Parse JSON request bodies
app.use(express.json());

// Parse form data
app.use(express.urlencoded({ extended: true }));

// Static file access (uploads)
app.use('/uploads', express.static('uploads'));

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

const authRoutes = require('./routes/auth');

const studentRoutes = require('./routes/studentRoutes');
const sponsorRoutes = require('./routes/sponsorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const bursaryRoutes = require('./routes/bursaryRoutes');
const applicationRoutes = require('./routes/applicationRoutes');

app.use('/api/bursaries', bursaryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/sponsors', sponsorRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/auth', authRoutes);

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// ─────────────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error(err.message);

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Server error'
        : err.message,
  });
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running: http://localhost:${PORT}`);
});