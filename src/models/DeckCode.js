// ============================================================
// src/models/DeckCode.js
// Private deck code model — stores AES-encrypted deck payloads
//
// EXPIRY STRATEGY (no TTL index):
//   • Codes have NO automatic TTL expiry.
//   • Instead, codes are cleaned up in two situations:
//     1. When a player generates a new code, their previous
//        unused codes (usedInBattle: null) are deleted.
//     2. A cleanup helper (cleanupCompletedBattleCodes) is
//        called whenever a battle reaches 'completed' status —
//        it deletes any DeckCode records whose linked battle
//        is now finished.
//   This means codes live exactly as long as needed:
//     • Unused codes: until the player generates a new one
//     • In-use codes: until the battle they're tied to ends
// ============================================================

const mongoose = require('mongoose');

const deckCodeSchema = new mongoose.Schema({
  // The short public code players share in the battle channel
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },

  // Owner of this locked deck
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  playerName: { type: String },

  // AES-256-CBC encrypted deck JSON — format: "iv:ciphertextHex"
  encryptedDeck: {
    type: String,
    required: true,
  },

  // Optional label (e.g. "My Kage tournament deck")
  label: { type: String, default: '' },

  // When this code was locked in
  lockedAt: { type: Date, default: Date.now },

  // Link to the battle this code was activated for.
  // null  = code generated but no battle started yet
  // ObjectId = code is bound to this battle; deleted when battle completes
  usedInBattle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Battle',
    default: null,
    index: true,
  },
}, { timestamps: true });

// ── STATIC: clean up codes whose battle has completed ─────────
// Call this after any battle.status is set to 'completed'.
// Accepts a single battleId or an array of battleIds.
deckCodeSchema.statics.cleanupForBattle = async function (battleId) {
  const ids = Array.isArray(battleId) ? battleId : [battleId];
  const result = await this.deleteMany({ usedInBattle: { $in: ids } });
  return result.deletedCount;
};

module.exports = mongoose.model('DeckCode', deckCodeSchema);
