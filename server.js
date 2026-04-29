/* ═══════════════════════════════════════════════
   DRISHTI — Express Backend Server  v2.4.1
   HAL TPE331-12B Inspection System
═══════════════════════════════════════════════ */

'use strict';

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const path       = require('path');
const rateLimit  = require('express-rate-limit');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Security Middleware ── */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "https://fonts.googleapis.com"],
      styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:     ["'self'", "https://fonts.gstatic.com"],
      imgSrc:      ["'self'", "data:"],
      connectSrc:  ["'self'"],
    }
  }
}));

app.use(cors({
  origin:      process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

/* ── Rate limiting ── */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max:      200,
  message:  { message: 'Too many requests, please try again later.' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { message: 'Too many login attempts. Try again in 15 minutes.' }
});

app.use('/api/',        limiter);
app.use('/api/auth/',   authLimiter);

/* ── Request logging ── */
app.use((req, _res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

/* ── API Routes ── */
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/inspections', require('./routes/inspections'));
app.use('/api/ecl',         require('./routes/ecl'));
app.use('/api/defects',     require('./routes/defects'));
app.use('/api/reports',     require('./routes/reports'));
app.use('/api/users',       require('./routes/users'));

/* ── Health check ── */
app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    app:       'DRISHTI',
    version:   '2.4.1',
    timestamp: new Date().toISOString(),
    uptime:    Math.floor(process.uptime()) + 's'
  });
});

/* ── Serve Frontend static files ── */
app.use(express.static(path.join(__dirname, '../frontend')));

/* ── SPA fallback — all non-API routes → index.html ── */
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API endpoint not found.' });
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

/* ── Global error handler ── */
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.' });
});

/* ── Start server ── */
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   DRISHTI Server  v2.4.1             ║');
  console.log('║   HAL TPE331-12B Inspection System   ║');
  console.log(`║   http://localhost:${PORT}               ║`);
  console.log('╚══════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
