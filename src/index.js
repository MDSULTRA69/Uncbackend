require('dotenv').config();
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
  process.exit(1);
});

console.log('Starting server...');
console.log('MONGODB_URI set:', !!process.env.MONGODB_URI);
console.log('JWT_SECRET set:', !!process.env.JWT_SECRET);
console.log('ANTHROPIC_API_KEY set:', !!process.env.ANTHROPIC_API_KEY);

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const playerRoutes = require('./routes/players');
const battleRoutes = require('./routes/battles');
const adminRoutes = require('./routes/admin');
const gameDataRoutes = require('./routes/gameData');

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, slow down ninja.'
});

// Middleware
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/battles', battleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/game-data', gameDataRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'UNC Server Online', timestamp: new Date().toISOString() });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT || 5000, () => {
      console.log(`UNC Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;
