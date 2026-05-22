const mongoose = require('mongoose');

const moveSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['ninjutsu', 'genjutsu', 'taijutsu', 'kenjutsu', 'kkg', 'weapon', 'skill'], required: true },
  class: { type: String, enum: ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'], required: true },
  rank: { type: Number, min: 1, max: 5, default: 1 },
  hitValue: Number,
  description: String,
  element: String,
  unlockPrice: Number,
  specialEffect: String,
  isArmorTized: { type: Boolean, default: false },
  cardType: { type: String, enum: ['attack', 'defense', 'illusion', 'trap'] },
  cooldownTurns: { type: Number, default: 0 },
  requiresRank: { type: String, enum: ['Rookie', 'Genin', 'Chunin', 'Jounin', 'Kage', 'Sage', 'God'] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const clanSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  kkg: String,
  kkgDescription: String,
  autoCompatibleElements: [String],
  village: String,
  description: String,
  specialAbilities: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const ruleSchema = new mongoose.Schema({
  section: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  version: { type: String, default: '6.0' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const gemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  priceXC: Number,
  priceNaira: Number,
  priceGold: Number,
  priceUniversalGems: Number,
  effect: String,
  category: { type: String, enum: ['rankup', 'move', 'skill', 'weapon', 'beast', 'utility'] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const villageSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  kage: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  kageName: String,
  description: String,
  specialWeapons: [String],
  memberCount: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  gold: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = {
  Move: mongoose.model('Move', moveSchema),
  Clan: mongoose.model('Clan', clanSchema),
  Rule: mongoose.model('Rule', ruleSchema),
  Gem: mongoose.model('Gem', gemSchema),
  Village: mongoose.model('Village', villageSchema)
};
