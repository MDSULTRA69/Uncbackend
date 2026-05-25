// ============================================================
// src/index.js  (UPDATED — deck-codes route added)
// ============================================================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());

// ── ROUTES ───────────────────────────────────────────────────
const authRoutes     = require('./routes/auth');
const playerRoutes   = require('./routes/players');
const battleRoutes   = require('./routes/battles');
const gameDataRoutes = require('./routes/gameData');
const adminRoutes    = require('./routes/admin');

app.use('/api/auth',       authRoutes);
app.use('/api/players',    playerRoutes);
app.use('/api/battles',    battleRoutes);
app.use('/api/game-data',  gameDataRoutes);
app.use('/api/admin',      adminRoutes);

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', version: '6.0' }));

// ── DATABASE + SERVER ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`UNC API running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
