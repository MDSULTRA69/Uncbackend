const express = require('express');
const { Move, Clan, Rule, Gem, Village } = require('../models/GameData');

const router = express.Router();

// Get all moves (public, for deck building)
router.get('/moves', async (req, res) => {
  try {
    const { type, class: moveClass } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (moveClass) filter.class = moveClass;
    const moves = await Move.find(filter).sort({ type: 1, class: 1 }).select('-createdBy');
    res.json({ moves });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get all clans (public)
router.get('/clans', async (req, res) => {
  try {
    const clans = await Clan.find().sort({ name: 1 }).select('-createdBy');
    res.json({ clans });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get all rules (public)
router.get('/rules', async (req, res) => {
  try {
    const rules = await Rule.find({ isActive: true }).sort({ section: 1 }).select('-createdBy');
    res.json({ rules });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get all gems (public)
router.get('/gems', async (req, res) => {
  try {
    const gems = await Gem.find().sort({ category: 1 }).select('-createdBy');
    res.json({ gems });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get all villages
router.get('/villages', async (req, res) => {
  try {
    const villages = await Village.find().populate('kage', 'characterName').select('-createdAt');
    res.json({ villages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
