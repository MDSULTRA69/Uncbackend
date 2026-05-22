const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Register
router.post('/register', async (req, res) => {
  try {
    const {
      username, password, characterName, nickname, clan, village,
      gender, characterDOB, phoneNumber
    } = req.body;

    if (!username || !password || !characterName || !clan || !village) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) return res.status(400).json({ error: 'Username already taken' });

    const user = new User({
      username: username.toLowerCase(),
      password,
      characterName,
      nickname,
      clan,
      village,
      gender,
      characterDOB,
      phoneNumber
    });

    await user.save();
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

    user.lastSeen = new Date();
    await user.save();

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

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ user: user.toProfileJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
