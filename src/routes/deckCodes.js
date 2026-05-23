// ============================================================
// src/routes/deckCodes.js
// Private deck code system:
//   POST /deck-codes/generate   → lock deck, return UNC-XXXXXX code
//   GET  /deck-codes/my-codes   → player's own active codes
//   POST /deck-codes/verify     → (admin/mod) verify a code is valid
// The decode helper is NOT exposed as an HTTP route — it's imported
// directly by battles.js so the plain deck NEVER crosses the wire.
// ============================================================

const express = require('express');
const crypto = require('crypto');
const DeckCode = require('../models/DeckCode');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();

// ── AES HELPERS ─────────────────────────────────────────────

// DECK_SECRET must be set in your .env (min 32 chars)
const DECK_SECRET = process.env.DECK_SECRET || 'unc_default_secret_change_in_prod_!!';

function deriveKey(secret) {
  // Always produce a 32-byte key regardless of secret length
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a JavaScript object → "iv:ciphertext" string
 */
function encryptDeck(deckObj) {
  const key = deriveKey(DECK_SECRET);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const json = JSON.stringify(deckObj);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt "iv:ciphertext" string → JavaScript object
 * Returns null if anything fails (wrong key, tampered data, etc.)
 */
function decryptDeck(encryptedStr) {
  try {
    const [ivHex, cipherHex] = encryptedStr.split(':');
    if (!ivHex || !cipherHex) return null;
    const key = deriveKey(DECK_SECRET);
    const iv = Buffer.from(ivHex, 'hex');
    const ciphertext = Buffer.from(cipherHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Generate a unique UNC-XXXXXX style code
 */
async function generateUniqueCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/1/I to avoid confusion
  let code;
  let attempts = 0;
  do {
    const random = crypto.randomBytes(6);
    code = 'UNC-' + Array.from(random).map(b => chars[b % chars.length]).join('').slice(0, 6);
    attempts++;
    if (attempts > 20) throw new Error('Could not generate a unique deck code — try again');
  } while (await DeckCode.findOne({ code }));
  return code;
}

// ── ROUTES ───────────────────────────────────────────────────

/**
 * POST /api/deck-codes/generate
 * Body: { label?: string }
 * Locks the player's current saved deck and returns a shareable code.
 * The encrypted deck is stored in MongoDB — only the code leaves this endpoint.
 */
router.post('/generate', auth, async (req, res) => {
  try {
    const player = req.user;

    // Require a built deck
    const deck = player.deck;
    if (!deck || (!deck.ninjutsuGenjutsu?.length && !deck.skills?.length && !deck.weaponBag?.length)) {
      return res.status(400).json({ error: 'Your deck is empty. Build your deck before locking it.' });
    }

    // Expire any previous unlocked codes for this player
    await DeckCode.deleteMany({ player: player._id, usedInBattle: null });

    // Encrypt and store
    const encryptedDeck = encryptDeck(JSON.parse(JSON.stringify(deck)));
    const code = await generateUniqueCode();

    const deckCode = await DeckCode.create({
      code,
      player: player._id,
      playerName: player.characterName,
      encryptedDeck,
      label: req.body.label?.slice(0, 80) || '',
    });

    res.status(201).json({
      code: deckCode.code,
      label: deckCode.label,
      lockedAt: deckCode.lockedAt,
      expiresAt: deckCode.expiresAt,
      message: `Your deck is locked. Share code ${deckCode.code} in the battle channel. Your opponent cannot see your deck contents.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/deck-codes/my-codes
 * Returns the player's own active (non-expired) deck codes.
 * Shows card COUNT only — not card names — even to the owner via this endpoint.
 * (Owner already knows their own deck from /deck builder.)
 */
router.get('/my-codes', auth, async (req, res) => {
  try {
    const codes = await DeckCode.find({ player: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('usedInBattle', 'player1Name player2Name status');

    const safeList = codes.map(c => ({
      code: c.code,
      label: c.label,
      lockedAt: c.lockedAt,
      expiresAt: c.expiresAt,
      usedInBattle: c.usedInBattle
        ? { id: c.usedInBattle._id, vs: `${c.usedInBattle.player1Name} vs ${c.usedInBattle.player2Name}`, status: c.usedInBattle.status }
        : null,
    }));

    res.json({ codes: safeList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/deck-codes/verify
 * Body: { code: "UNC-XXXXXX" }
 * Kage/NPC only — confirms a code is valid and shows the card COUNT (not names).
 * Used by admins to validate a code is legit before a battle starts.
 */
router.post('/verify', auth, adminAuth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });

    const record = await DeckCode.findOne({ code: code.toUpperCase().trim() })
      .populate('player', 'characterName clan village rank');

    if (!record) return res.status(404).json({ error: 'Code not found or expired' });

    const deck = decryptDeck(record.encryptedDeck);
    if (!deck) return res.status(500).json({ error: 'Deck data is corrupted' });

    // Return counts only — not card names — so the admin/kage just confirms legitimacy
    res.json({
      valid: true,
      code: record.code,
      player: {
        characterName: record.player.characterName,
        clan: record.player.clan,
        village: record.player.village,
        rank: record.player.rank,
      },
      deckSummary: {
        jutsuCount: deck.ninjutsuGenjutsu?.length || 0,
        skillCount: deck.skills?.length || 0,
        weaponCount: deck.weaponBag?.length || 0,
        hasKKG: !!(deck.kkgCard?.name),
        hasTailedBeast: !!(deck.tailedBeast?.name),
        hasSummoning: !!(deck.summoningBeast?.name),
      },
      lockedAt: record.lockedAt,
      usedInBattle: record.usedInBattle,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── EXPORT DECRYPT HELPER FOR USE IN battles.js ──────────────
// battles.js calls this internally — the plain deck never hits an HTTP response
router.decryptDeck = decryptDeck;

module.exports = router;
