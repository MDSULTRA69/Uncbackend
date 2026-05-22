const express = require('express');
const { Move, Clan, Rule, Gem, Village } = require('../models/GameData');
const User = require('../models/User');
const { adminAuth, npcAuth } = require('../middleware/auth');

const router = express.Router();

// ---- MOVES ----
router.get('/moves', async (req, res) => {
  try {
    const moves = await Move.find().sort({ type: 1, class: 1 });
    res.json({ moves });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/moves', adminAuth, async (req, res) => {
  try {
    const move = new Move({ ...req.body, createdBy: req.user._id });
    await move.save();
    res.status(201).json({ move });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/moves/:id', adminAuth, async (req, res) => {
  try {
    const move = await Move.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ move });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/moves/:id', npcAuth, async (req, res) => {
  try {
    await Move.findByIdAndDelete(req.params.id);
    res.json({ message: 'Move deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- CLANS ----
router.get('/clans', async (req, res) => {
  try {
    const clans = await Clan.find().sort({ name: 1 });
    res.json({ clans });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/clans', adminAuth, async (req, res) => {
  try {
    const clan = new Clan({ ...req.body, createdBy: req.user._id });
    await clan.save();
    res.status(201).json({ clan });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/clans/:id', adminAuth, async (req, res) => {
  try {
    const clan = await Clan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ clan });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- RULES ----
router.get('/rules', async (req, res) => {
  try {
    const rules = await Rule.find({ isActive: true }).sort({ section: 1 });
    res.json({ rules });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/rules', adminAuth, async (req, res) => {
  try {
    const rule = new Rule({ ...req.body, createdBy: req.user._id });
    await rule.save();
    res.status(201).json({ rule });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/rules/:id', adminAuth, async (req, res) => {
  try {
    const rule = await Rule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ rule });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- GEMS ----
router.get('/gems', async (req, res) => {
  try {
    const gems = await Gem.find().sort({ category: 1 });
    res.json({ gems });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/gems', adminAuth, async (req, res) => {
  try {
    const gem = new Gem({ ...req.body, createdBy: req.user._id });
    await gem.save();
    res.status(201).json({ gem });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- VILLAGES ----
router.get('/villages', async (req, res) => {
  try {
    const villages = await Village.find().populate('kage', 'characterName username');
    res.json({ villages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/villages', npcAuth, async (req, res) => {
  try {
    const village = new Village(req.body);
    await village.save();
    res.status(201).json({ village });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/villages/:id', adminAuth, async (req, res) => {
  try {
    const village = await Village.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ village });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- ALL PLAYERS (admin view) ----
router.get('/players', adminAuth, async (req, res) => {
  try {
    const players = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ players });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- DASHBOARD STATS ----
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const [totalPlayers, activeBattles, totalClans, totalMoves] = await Promise.all([
      User.countDocuments({ role: 'player' }),
      require('../models/Battle').countDocuments({ status: 'active' }),
      Clan.countDocuments(),
      Move.countDocuments()
    ]);
    res.json({ totalPlayers, activeBattles, totalClans, totalMoves });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
