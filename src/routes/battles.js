// ============================================================
// src/routes/battles.js  (UPDATED — private deck code support)
// New behaviour:
//   • POST /battles/create now accepts optional player1DeckCode
//     and player2DeckCode. If provided, the encrypted deck is
//     resolved server-side and stored as player1Deck / player2Deck.
//     The code itself is stored so the AI moderator can verify
//     submitted cards against the locked deck.
//   • POST /battles/:id/action now checks submitted cardsUsed
//     against the locked deck and injects a violation warning
//     into the AI moderator response if cards don't match.
// ============================================================

const express = require('express');
const Battle = require('../models/Battle');
const User = require('../models/User');
const DeckCode = require('../models/DeckCode');
const { auth } = require('../middleware/auth');
const { moderateTurn, getAIRuling, generateSpinResult } = require('../controllers/aiModerator');
const deckCodesRouter = require('./deckCodes');

const router = express.Router();

// ── DECK CODE VALIDATION HELPER ──────────────────────────────

/**
 * Given a UNC-XXXXXX code, fetch and decrypt the deck.
 * Returns { deck, deckCodeRecord } or throws.
 */
async function resolveDeckCode(code, playerId) {
  const record = await DeckCode.findOne({ code: code.toUpperCase().trim() });
  if (!record) throw new Error(`Deck code ${code} not found or has expired.`);
  if (record.player.toString() !== playerId.toString()) {
    throw new Error(`Deck code ${code} does not belong to you.`);
  }
  const deck = deckCodesRouter.decryptDeck(record.encryptedDeck);
  if (!deck) throw new Error(`Deck code ${code} could not be decrypted. Please re-lock your deck.`);
  return { deck, deckCodeRecord: record };
}

/**
 * Build a flat array of all card names from a deck object.
 * Used for card-use validation.
 */
function flatCardNames(deck) {
  const names = new Set();
  (deck.ninjutsuGenjutsu || []).forEach(c => c.name && names.add(c.name.toLowerCase().trim()));
  (deck.skills || []).forEach(c => c.name && names.add(c.name.toLowerCase().trim()));
  (deck.weaponBag || []).forEach(c => c.name && names.add(c.name.toLowerCase().trim()));
  if (deck.kkgCard?.name) names.add(deck.kkgCard.name.toLowerCase().trim());
  if (deck.tailedBeast?.name) names.add(deck.tailedBeast.name.toLowerCase().trim());
  if (deck.summoningBeast?.name) names.add(deck.summoningBeast.name.toLowerCase().trim());
  // BE moves are always valid — they're part of every deck
  ['punch','kick','block','slash','throw','evade','genjutsu kai','substitution jutsu'].forEach(be => names.add(be));
  return names;
}

/**
 * Check submitted cardsUsed against the player's locked deck.
 * Returns { valid: true } or { valid: false, violations: [...] }
 */
function validateCardsAgainstDeck(cardsUsed = [], lockedDeck) {
  if (!lockedDeck) return { valid: true }; // no locked deck in use — skip
  const allowed = flatCardNames(lockedDeck);
  const violations = cardsUsed
    .filter(c => c.name && !allowed.has(c.name.toLowerCase().trim()))
    .map(c => c.name);
  return violations.length > 0
    ? { valid: false, violations }
    : { valid: true };
}

// ── CREATE BATTLE ─────────────────────────────────────────────

router.post('/create', auth, async (req, res) => {
  try {
    const { opponentId, battleType, player1DeckCode, player2DeckCode } = req.body;
    if (!opponentId) return res.status(400).json({ error: 'Opponent required' });

    const opponent = await User.findById(opponentId);
    if (!opponent) return res.status(404).json({ error: 'Opponent not found' });

    const player = req.user;

    // ── Resolve decks (from code or from saved deck) ──────────
    let p1Deck = player.deck?.toObject ? player.deck.toObject() : player.deck;
    let p2Deck = opponent.deck?.toObject ? opponent.deck.toObject() : opponent.deck;
    let p1DeckCodeRecord = null;
    let p2DeckCodeRecord = null;

    if (player1DeckCode) {
      try {
        const resolved = await resolveDeckCode(player1DeckCode, player._id);
        p1Deck = resolved.deck;
        p1DeckCodeRecord = resolved.deckCodeRecord;
      } catch (err) {
        return res.status(400).json({ error: `P1 deck code error: ${err.message}` });
      }
    }

    if (player2DeckCode) {
      try {
        const resolved = await resolveDeckCode(player2DeckCode, opponent._id);
        p2Deck = resolved.deck;
        p2DeckCodeRecord = resolved.deckCodeRecord;
      } catch (err) {
        return res.status(400).json({ error: `P2 deck code error: ${err.message}` });
      }
    }

    // ── Build battle ──────────────────────────────────────────
    const battle = new Battle({
      player1: player._id,
      player2: opponent._id,
      player1Name: player.characterName,
      player2Name: opponent.characterName,
      player1Deck: p1Deck,
      player2Deck: p2Deck,

      // Store codes so the action handler can verify card usage
      player1DeckCode: p1DeckCodeRecord ? p1DeckCodeRecord.code : null,
      player2DeckCode: p2DeckCodeRecord ? p2DeckCodeRecord.code : null,

      battleType: battleType || 'official',
      maxTurns: battleType === 'sparring' ? 5 : 10,
      whoseTurn: player._id,
      status: 'active',
      village: player.village,
    });

    // Opening message — mention if deck codes are in use
    const codeNotice = (p1DeckCodeRecord || p2DeckCodeRecord)
      ? `\n🔒 Private deck codes verified:\n${p1DeckCodeRecord ? `• ${player.characterName}: ${p1DeckCodeRecord.code}` : `• ${player.characterName}: no code (open deck)`}\n${p2DeckCodeRecord ? `• ${opponent.characterName}: ${p2DeckCodeRecord.code}` : `• ${opponent.characterName}: no code (open deck)`}\nDecks are locked server-side. AI MOD will flag any unlisted cards.`
      : '';

    battle.chatLog.push({
      sender: player._id,
      senderName: 'AI-MOD',
      message: `⚔️ BATTLE INITIATED!\n\n${player.characterName} vs ${opponent.characterName}\nType: ${(battleType || 'official').toUpperCase()} | Max Turns: ${battle.maxTurns}${codeNotice}\n\nA coin toss determines who goes first. ${player.characterName} (P1) calls it!`,
      type: 'ai-mod',
    });

    await battle.save();

    // Mark deck codes as in-use
    if (p1DeckCodeRecord) {
      await p1DeckCodeRecord.updateOne({ usedInBattle: battle._id });
    }
    if (p2DeckCodeRecord) {
      await p2DeckCodeRecord.updateOne({ usedInBattle: battle._id });
    }

    res.status(201).json({ battle });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET USER'S BATTLES ────────────────────────────────────────

router.get('/my-battles', auth, async (req, res) => {
  try {
    const battles = await Battle.find({
      $or: [{ player1: req.user._id }, { player2: req.user._id }],
    })
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate('player1', 'characterName clan village rank')
      .populate('player2', 'characterName clan village rank')
      .populate('winner', 'characterName');

    res.json({ battles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET ACTIVE BATTLES ────────────────────────────────────────

router.get('/active', auth, async (req, res) => {
  try {
    const battles = await Battle.find({ status: 'active' })
      .populate('player1', 'characterName clan village rank')
      .populate('player2', 'characterName clan village rank')
      .sort({ updatedAt: -1 })
      .limit(10);
    res.json({ battles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET SPECIFIC BATTLE ───────────────────────────────────────

router.get('/:id', auth, async (req, res) => {
  try {
    const battle = await Battle.findById(req.params.id)
      .populate('player1', 'characterName clan village rank deck compatibleMoves elements')
      .populate('player2', 'characterName clan village rank deck compatibleMoves elements')
      .populate('winner', 'characterName')
      .populate('chatLog.sender', 'characterName');

    if (!battle) return res.status(404).json({ error: 'Battle not found' });

    // Redact the opponent's deck from the response so neither player
    // can read each other's deck contents via the API.
    // Each player only receives their OWN deck back.
    const isPlayer1 = battle.player1?._id?.toString() === req.user._id.toString();
    const isPlayer2 = battle.player2?._id?.toString() === req.user._id.toString();

    const battleObj = battle.toObject();
    if (isPlayer1) {
      // Redact P2 deck
      battleObj.player2Deck = battle.player2DeckCode
        ? { _redacted: true, code: battle.player2DeckCode }
        : battleObj.player2Deck;
    } else if (isPlayer2) {
      // Redact P1 deck
      battleObj.player1Deck = battle.player1DeckCode
        ? { _redacted: true, code: battle.player1DeckCode }
        : battleObj.player1Deck;
    }
    // Spectators see neither deck
    if (!isPlayer1 && !isPlayer2) {
      if (battle.player1DeckCode) battleObj.player1Deck = { _redacted: true, code: battle.player1DeckCode };
      if (battle.player2DeckCode) battleObj.player2Deck = { _redacted: true, code: battle.player2DeckCode };
    }

    res.json({ battle: battleObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SUBMIT TURN ACTION ────────────────────────────────────────

router.post('/:id/action', auth, async (req, res) => {
  try {
    const battle = await Battle.findById(req.params.id)
      .populate('player1')
      .populate('player2');

    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.status !== 'active') return res.status(400).json({ error: 'Battle is not active' });

    const isPlayer1 = battle.player1._id.toString() === req.user._id.toString();
    const isPlayer2 = battle.player2._id.toString() === req.user._id.toString();
    if (!isPlayer1 && !isPlayer2) {
      return res.status(403).json({ error: 'You are not in this battle' });
    }

    const actingPlayer   = isPlayer1 ? battle.player1 : battle.player2;
    const opposingPlayer = isPlayer1 ? battle.player2 : battle.player1;
    const actingDeck     = isPlayer1 ? battle.player1Deck : battle.player2Deck;

    const { action, cardsUsed, phase } = req.body;
    if (!action) return res.status(400).json({ error: 'Action required' });

    // ── DECK CODE CARD VALIDATION ─────────────────────────────
    const actingCode = isPlayer1 ? battle.player1DeckCode : battle.player2DeckCode;
    let deckViolationWarning = '';

    if (actingCode && cardsUsed?.length > 0) {
      const check = validateCardsAgainstDeck(cardsUsed, actingDeck);
      if (!check.valid) {
        deckViolationWarning = `\n\n⚠️ **DECK VIOLATION DETECTED** ⚠️\n${actingPlayer.characterName} submitted card(s) NOT in their locked deck (${actingCode}):\n${check.violations.map(v => `• ${v}`).join('\n')}\n\nThese cards are INVALID this turn. MOD will disregard them in resolution.`;
      }
    }

    // Filter out violated cards before passing to AI moderator
    const validCardsUsed = actingCode
      ? (cardsUsed || []).filter(c => {
          const allowed = flatCardNames(actingDeck);
          return !c.name || allowed.has(c.name.toLowerCase().trim());
        })
      : (cardsUsed || []);

    // Add player message to chat
    battle.chatLog.push({
      sender: req.user._id,
      senderName: actingPlayer.characterName,
      message: action,
      type: 'player',
    });

    // Build turn entry
    const turnEntry = {
      turnNumber: battle.currentTurn,
      phase: phase || battle.phase,
      playerId: req.user._id,
      playerName: actingPlayer.characterName,
      action,
      cardsUsed: validCardsUsed,
    };

    // Get AI moderation (with violation warning appended if needed)
    const aiResponse = await moderateTurn(battle, action, actingPlayer, opposingPlayer);
    const fullAiResponse = deckViolationWarning
      ? aiResponse + deckViolationWarning
      : aiResponse;

    // Parse HP changes from AI response
    const p1HPMatch = fullAiResponse.match(/P1[:\s]+(\d+)/i);
    const p2HPMatch = fullAiResponse.match(/P2[:\s]+(\d+)/i);
    if (p1HPMatch) battle.player1HP = Math.max(0, parseInt(p1HPMatch[1]));
    if (p2HPMatch) battle.player2HP = Math.max(0, parseInt(p2HPMatch[1]));

    turnEntry.result = fullAiResponse.substring(0, 200);
    turnEntry.hpChange = { player1: battle.player1HP, player2: battle.player2HP };
    turnEntry.aiModNote = fullAiResponse;
    battle.turns.push(turnEntry);

    // Add AI mod response to chat
    battle.chatLog.push({
      sender: req.user._id,
      senderName: 'AI-MOD',
      message: fullAiResponse,
      type: 'ai-mod',
    });

    // ── WIN / LOSS CONDITIONS ─────────────────────────────────
    if (battle.player1HP <= 0 || battle.player2HP <= 0 || battle.currentTurn >= battle.maxTurns) {
      battle.status = 'completed';

      if (battle.player1HP <= 0 && battle.player2HP <= 0) {
        battle.isDraw = true;
        battle.endReason = 'Both players KO'd";
      } else if (battle.player1HP <= 0) {
        battle.winner = battle.player2._id;
        battle.loser  = battle.player1._id;
        battle.endReason = 'Player 1 KO'd";
      } else if (battle.player2HP <= 0) {
        battle.winner = battle.player1._id;
        battle.loser  = battle.player2._id;
        battle.endReason = 'Player 2 KO'd";
      } else {
        const p1Damage = 100 - battle.player2HP;
        const p2Damage = 100 - battle.player1HP;
        if (p1Damage > p2Damage) {
          battle.winner = battle.player1._id;
          battle.loser  = battle.player2._id;
        } else if (p2Damage > p1Damage) {
          battle.winner = battle.player2._id;
          battle.loser  = battle.player1._id;
        } else {
          battle.isDraw = true;
        }
        battle.endReason = 'Turn limit reached';
      }

      // Update player stats
      if (battle.winner) {
        await User.findByIdAndUpdate(battle.winner, {
          $inc: { 'stats.wins': 1, 'stats.points': 3, 'stats.modCoins': 2 },
        });
        await User.findByIdAndUpdate(battle.loser, {
          $inc: { 'stats.losses': 1, 'stats.modCoins': 2 },
        });
      } else if (battle.isDraw) {
        await User.findByIdAndUpdate(battle.player1._id, {
          $inc: { 'stats.draws': 1, 'stats.points': 1, 'stats.modCoins': 2 },
        });
        await User.findByIdAndUpdate(battle.player2._id, {
          $inc: { 'stats.draws': 1, 'stats.points': 1, 'stats.modCoins': 2 },
        });
      }

      battle.chatLog.push({
        sender: req.user._id,
        senderName: 'AI-MOD',
        message: `🏁 BATTLE CONCLUDED!\nResult: ${battle.isDraw ? 'DRAW!' : `${battle.winner.toString() === battle.player1._id.toString() ? battle.player1Name : battle.player2Name} WINS!`}\nReason: ${battle.endReason}`,
        type: 'ai-mod',
      });

      // Clean up deck code records now that the battle is done.
      // Fire-and-forget — don't block the response on this.
      DeckCode.cleanupForBattle(battle._id).catch(() => {});
    } else {
      // Advance turn
      if (battle.phase === 'attack') {
        battle.phase = 'response';
      } else {
        battle.phase = 'attack';
        battle.currentTurn += 1;
        battle.whoseTurn = battle.whoseTurn.toString() === battle.player1._id.toString()
          ? battle.player2._id
          : battle.player1._id;
      }
    }

    await battle.save();
    res.json({ battle, aiResponse: fullAiResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ASK AI MOD ────────────────────────────────────────────────

router.post('/:id/ask-mod', auth, async (req, res) => {
  try {
    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ error: 'Battle not found' });

    const { question } = req.body;
    const answer = await getAIRuling(question, battle);
    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SPIN / COIN TOSS ──────────────────────────────────────────

router.post('/:id/spin', auth, async (req, res) => {
  try {
    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ error: 'Battle not found' });

    const { spinType } = req.body;
    const result = await generateSpinResult(spinType, req.user);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── FORFEIT ───────────────────────────────────────────────────

router.post('/:id/forfeit', auth, async (req, res) => {
  try {
    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.status !== 'active') return res.status(400).json({ error: 'Battle not active' });

    const isPlayer1 = battle.player1.toString() === req.user._id.toString();
    battle.winner = isPlayer1 ? battle.player2 : battle.player1;
    battle.loser  = req.user._id;
    battle.status = 'completed';
    battle.endReason = `${req.user.characterName || req.user.username} forfeited`;

    await User.findByIdAndUpdate(battle.winner, { $inc: { 'stats.wins': 1, 'stats.points': 3 } });
    await User.findByIdAndUpdate(battle.loser,  { $inc: { 'stats.losses': 1, 'stats.points': -3 } });

    await battle.save();

    // Clean up deck code records for this completed battle.
    DeckCode.cleanupForBattle(battle._id).catch(() => {});

    res.json({ battle, message: 'Battle forfeited' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
