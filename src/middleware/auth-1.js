const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET environment variable is not set');
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register
router.post('/register', async (req, res) => {
  try {
    const {
      username, password, characterName, nickname, clan, village,
      gender, characterDOB, phoneNumber,
      // Existing character fields (optional)
      rank, deck, compatibleMoves, elements, stats
    } = req.body;

    if (!username || !password || !characterName || !clan || !village) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) return res.status(400).json({ error: 'Username already taken' });

    const userData = {
      username: username.toLowerCase(),
      password,
      characterName,
      nickname,
      clan,
      village,
      gender,
      characterDOB,
      phoneNumber
    };

    // Apply existing character data if provided
    if (rank && ['Rookie', 'Genin', 'Chunin', 'Jounin', 'Kage', 'Sage', 'God'].includes(rank)) {
      userData.rank = rank;
    }
    if (deck) {
      userData.deck = deck;
    }
    if (compatibleMoves && Array.isArray(compatibleMoves)) {
      userData.compatibleMoves = compatibleMoves;
    }
    if (elements) {
      userData.elements = elements;
    }
    if (stats) {
      userData.stats = {
        hp: 100,
        xp: stats.xp || 0,
        xc: stats.xc || 0,
        modCoins: 0,
        gold: 0,
        wins: stats.wins || 0,
        losses: stats.losses || 0,
        draws: stats.draws || 0,
        points: stats.points || (stats.wins ? stats.wins * 3 : 0)
      };
    }
    console.log('USERDATA:', JSON.stringify(userData, null, 2));
    const user = new User(userData);
    await user.save({ validateBeforeSave: false });
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: user.toProfileJSON()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    // Use updateOne to avoid triggering the bcrypt pre-save hook on lastSeen update
    await User.updateOne({ _id: user._id }, { $set: { lastSeen: new Date() } });

    const token = generateToken(user._id);
    res.json({ token, user: user.toProfileJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user.toProfileJSON() });
});

// Update profile
router.patch('/me', auth, async (req, res) => {
  try {
    const allowed = ['nickname', 'gender', 'characterDOB', 'phoneNumber'];
    const updates = {};
    allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });
    res.json({ user: user.toProfileJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
