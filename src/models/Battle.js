const mongoose = require('mongoose');

const turnSchema = new mongoose.Schema({
  turnNumber: Number,
  phase: { type: String, enum: ['attack', 'response', 'trap', 'counter', '2fa', '3fa'] },
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  playerName: String,
  action: String,
  cardsUsed: [{ name: String, class: String, type: String }],
  result: String,
  hpChange: { player1: Number, player2: Number },
  aiModNote: String,
  timestamp: { type: Date, default: Date.now }
});

const battleSchema = new mongoose.Schema({
  player1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  player2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  player1Name: String,
  player2Name: String,
  player1HP: { type: Number, default: 100 },
  player2HP: { type: Number, default: 100 },

  // Private decks — only visible to each respective player server-side
  player1Deck: Object,
  player2Deck: Object,
  player1DeckSubmitted: { type: Boolean, default: false },
  player2DeckSubmitted: { type: Boolean, default: false },

  // Private traps — submitted each turn, hidden from opponent until triggered
  // Max 3 traps. Updated at start of every turn before acting.
  player1Traps: [{ name: String, class: String }],
  player2Traps: [{ name: String, class: String }],

  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'abandoned'],
    default: 'pending'
  },
  battleType: {
    type: String,
    enum: ['official', 'sparring', 'war', 'deathmatch', 'story'],
    default: 'official'
  },

  currentTurn: { type: Number, default: 1 },
  openingRolls: { type: mongoose.Schema.Types.Mixed, default: null },
  maxTurns: { type: Number, default: 10 },
  whoseTurn: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  phase: { type: String, default: 'attack' },

  turns: [turnSchema],
  chatLog: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: String,
    message: String,
    type: { type: String, enum: ['player', 'ai-mod', 'system'], default: 'player' },
    timestamp: { type: Date, default: Date.now }
  }],

  activeTraps: [{
    playerId: mongoose.Schema.Types.ObjectId,
    trapName: String,
    setOnTurn: Number
  }],
  activeCooldowns: [{
    playerId: mongoose.Schema.Types.ObjectId,
    moveName: String,
    resumesOnTurn: Number
  }],
  activeMomentumDice: { value: Number, expiresOnTurn: Number },

  faChain: [{
    player: String,
    action: String,
    faLevel: Number
  }],

  boardState: {
    player1: {
      activated:  [String],
      effects:    [String],
      clones:     String,
      summonings: [String],
      traps:      [String]
    },
    player2: {
      activated:  [String],
      effects:    [String],
      clones:     String,
      summonings: [String],
      traps:      [String]
    }
  },

  afterEffects: [{
    targetPlayer:  { type: String, enum: ['player1', 'player2'] },
    effectType:    { type: String, enum: ['bleed', 'burn', 'linger', 'poison'] },
    damage:        Number,
    sourceName:    String,
    expiresOnTurn: Number
  }],

  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  loser:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDraw: { type: Boolean, default: false },
  endReason: String,

  modCoinsAwarded: { type: Boolean, default: false },
  village: String,
  eventId: String
}, { timestamps: true });

module.exports = mongoose.model('Battle', battleSchema);
