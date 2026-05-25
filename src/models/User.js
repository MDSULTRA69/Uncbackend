const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const deckSchema = new mongoose.Schema({
  ninjutsuGenjutsu: { type: [], default: [] },
  skills: { type: [], default: [] },
  weaponBag: { type: [], default: [] },
  kkgCard: { type: mongoose.Schema.Types.Mixed, default: {} },
  basicEssentials: { type: mongoose.Schema.Types.Mixed, default: {} },
  tailedBeast: { type: mongoose.Schema.Types.Mixed, default: {} },
  summoningBeast: { type: mongoose.Schema.Types.Mixed, default: {} }
});

const statsSchema = new mongoose.Schema({
  hp: { type: Number, default: 100 },
  xp: { type: Number, default: 0 },
  xc: { type: Number, default: 0 },
  modCoins: { type: Number, default: 0 },
  gold: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  points: { type: Number, default: 0 }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['player', 'kage', 'npc'], default: 'player' },

  // Character info
  characterName: { type: String, required: true },
  nickname: { type: String },
  clan: { type: String, required: true },
  village: { type: String, required: true },
  rank: { type: String, enum: ['Rookie', 'Genin', 'Chunin', 'Jounin', 'Kage', 'Sage', 'God'], default: 'Rookie' },
  gameAge: { type: Number, default: 10 },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  characterDOB: { type: String },

  // Moves
  compatibleMoves: [{ name: String, class: String, rank: Number, type: String, description: String }],
  incompatibleMoves: [String],
  elements: { compatible: [String], incompatible: [String] },

  // Deck
  deck: deckSchema,

  // Stats
  stats: { type: statsSchema, default: () => ({}) },

  // Skills
  skills: [{ name: String, type: String, description: String, charges: Number }],

  // Feats & missions
  missionsCompleted: [String],
  featsAccomplished: [String],

  // Phone for payments (optional)
  phoneNumber: { type: String },

  isActive: { type: Boolean, default: true },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  // Only hash if password was explicitly changed AND is not already a bcrypt hash
  if (!this.isModified('password')) return next();
  if (this.password && this.password.startsWith('$2')) return next(); // already hashed
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toProfileJSON = function() {
  return {
    id: this._id,
    username: this.username,
    role: this.role,
    characterName: this.characterName,
    nickname: this.nickname,
    clan: this.clan,
    village: this.village,
    rank: this.rank,
    gameAge: this.gameAge,
    gender: this.gender,
    stats: this.stats,
    compatibleMoves: this.compatibleMoves,
    elements: this.elements,
    deck: this.deck,
    skills: this.skills,
    missionsCompleted: this.missionsCompleted,
    featsAccomplished: this.featsAccomplished,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
