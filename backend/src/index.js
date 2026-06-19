const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── MIDDLEWARE ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ─── ROUTES ────────────────────────────────────────────────────
app.use('/api', require('./routes/index'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'EasyBook API is running / EasyBook API waa shaqaynaysaa',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error / Khalad gudaha server', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

// ─── START ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║          EasyBook API Server v1.0             ║
║   Waa La Bilaabay — Server Is Running        ║
╠═══════════════════════════════════════════════╣
║  Port:    http://localhost:${PORT}               ║
║  Mode:    ${(process.env.NODE_ENV || 'development').padEnd(33)}║
║  Docs:    /health                             ║
╚═══════════════════════════════════════════════╝
  `);
});

module.exports = app;
