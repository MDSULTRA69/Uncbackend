const express = require('express');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const players = await User.find({ isActive: true, role: 'player' })
      .select('characterName clan village rank stats nickname')
      .sort({ 'stats.points': -1, 'stats.xp': -1 })
      .limit(50);
    res.json({ players });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all players (for battle matchmaking)
router.get('/', auth, async (req, res) => {
  try {
    const players = await User.find({ isActive: true })
      .select('characterName clan village rank nickname username role')
      .sort({ characterName: 1 });
    res.json({ players });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get player by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const player = await User.findById(req.params.id).select('-password -phoneNumber');
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json({ player: player.toProfileJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update own deck
router.put('/me/deck', auth, async (req, res) => {
  try {
    const { deck } = req.body;
    console.log('DECK RECEIVED:', JSON.stringify(deck, null, 2));
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { deck },
      { new: true }
    );
    res.json({ deck: user.deck, message: 'Deck updated!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update own moves (compatible/incompatible)
router.put('/me/moves', auth, async (req, res) => {
  try {
    const { compatibleMoves, incompatibleMoves, elements } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { compatibleMoves, incompatibleMoves, elements },
      { new: true }
    );
    res.json({ user: user.toProfileJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: update player rank, stats, role
router.patch('/:id/admin-update', adminAuth, async (req, res) => {
  try {
    const allowed = ['rank', 'role', 'stats', 'skills', 'missionsCompleted', 'featsAccomplished', 'isActive'];
    const updates = {};
    allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

    // Only NPC can change roles
    if (updates.role && req.user.role !== 'npc') {
      return res.status(403).json({ error: 'Only NPC can change roles' });
    }

    const user = await User.findByIdAndUpdate(
  req.user._id,
  { $set: { deck } },
  { new: true, runValidators: false }
);
    if (!user) return res.status(404).json({ error: 'Player not found' });
    res.json({ user: user.toProfileJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
