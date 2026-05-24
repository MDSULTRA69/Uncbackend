const express = require('express');
const Battle = require('../models/Battle');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { moderateTurn, getAIRuling, generateSpinResult } = require('../aiModerator');

const router = express.Router();

// ── CREATE BATTLE ─────────────────────────────────────────────

router.post('/create', auth, async (req, res) => {
  try {
    const { opponentId, battleType } = req.body;
    if (!opponentId) return res.status(400).json({ error: 'Opponent required' });

    const opponent = await User.findById(opponentId);
    if (!opponent) return res.status(404).json({ error: 'Opponent not found' });

    const player = req.user;

    const battle = new Battle({
      player1: player._id,
      player2: opponent._id,
      player1Name: player.characterName,
      player2Name: opponent.characterName,
      battleType: battleType || 'official',
      maxTurns: battleType === 'sparring' ? 5 : 10,
      whoseTurn: player._id,
      status: 'active',
      village: player.village,
    });

    battle.chatLog.push({
      sender: player._id,
      senderName: 'AI-MOD',
      message: `⚔️ BATTLE INITIATED!\n\n${player.characterName} vs ${opponent.characterName}\nType: ${(battleType || 'official').toUpperCase()} | Max Turns: ${battle.maxTurns}\n\n🔒 Both players should submit their private deck before turn 1 starts. Use the DECK tab — your opponent will never see your cards.\n\nA coin toss determines who goes first. ${player.characterName} (P1) calls it!`,
      type: 'ai-mod',
    });

    await battle.save();
    res.status(201).json({ battle });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SUBMIT PRIVATE DECK ───────────────────────────────────────

router.post('/:id/submit-deck', auth, async (req, res) => {
  try {
    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ error: 'Battle not found' });

    const isPlayer1 = battle.player1.toString() === req.user._id.toString();
    const isPlayer2 = battle.player2.toString() === req.user._id.toString();
    if (!isPlayer1 && !isPlayer2) {
      return res.status(403).json({ error: 'You are not in this battle' });
    }

    const { deck } = req.body;
    if (!deck) return res.status(400).json({ error: 'Deck required' });

    if (isPlayer1) {
      battle.player1Deck = deck;
      battle.player1DeckSubmitted = true;
    } else {
      battle.player2Deck = deck;
      battle.player2DeckSubmitted = true;
    }

    // Log submission (visible to both — but not the contents)
    const playerName = isPlayer1 ? battle.player1Name : battle.player2Name;
    battle.chatLog.push({
      sender: req.user._id,
      senderName: 'AI-MOD',
      message: `🔒 ${playerName} has submitted their private deck. Deck contents are hidden from opponent. AI MOD will validate card usage during the battle.`,
      type: 'ai-mod',
    });

    await battle.save();
    res.json({ message: 'Deck submitted privately. Your opponent cannot see your cards.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SUBMIT PRIVATE TRAPS ──────────────────────────────────────
// Players can update traps at the start of every turn before acting.
// Max 3 traps. Opponent never sees trap names — only the count.

router.post('/:id/submit-traps', auth, async (req, res) => {
  try {
    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ error: 'Battle not found' });

    const isPlayer1 = battle.player1.toString() === req.user._id.toString();
    const isPlayer2 = battle.player2.toString() === req.user._id.toString();
    if (!isPlayer1 && !isPlayer2) {
      return res.status(403).json({ error: 'You are not in this battle' });
    }

    const { traps } = req.body;
    if (!Array.isArray(traps)) return res.status(400).json({ error: 'Traps must be an array' });
    if (traps.length > 3) return res.status(400).json({ error: 'Max 3 traps allowed' });

    const cleanTraps = traps.map(t => ({
      name: String(t.name || ''),
      class: String(t.class || 'D')
    })).filter(t => t.name);

    const playerName = isPlayer1 ? battle.player1Name : battle.player2Name;

    if (isPlayer1) {
      battle.player1Traps = cleanTraps;
    } else {
      battle.player2Traps = cleanTraps;
    }

    // Log trap submission — shows count only, not names
    battle.chatLog.push({
      sender: req.user._id,
      senderName: 'AI-MOD',
      message: `🪤 ${playerName} has updated their traps (${cleanTraps.length} trap${cleanTraps.length !== 1 ? 's' : ''} set). Contents hidden from opponent.`,
      type: 'ai-mod',
    });

    await battle.save();
    res.json({ message: `${cleanTraps.length} trap(s) submitted privately.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
      .populate('player1', 'characterName clan village rank compatibleMoves elements')
      .populate('player2', 'characterName clan village rank compatibleMoves elements')
      .populate('winner', 'characterName')
      .populate('chatLog.sender', 'characterName');

    if (!battle) return res.status(404).json({ error: 'Battle not found' });

    const isPlayer1 = battle.player1?._id?.toString() === req.user._id.toString();
    const isPlayer2 = battle.player2?._id?.toString() === req.user._id.toString();

    const battleObj = battle.toObject();

    // Each player only sees their OWN deck — opponent deck is always redacted
    if (isPlayer1) {
      battleObj.player2Deck = null;
      // Hide opponent trap names — show count only
      battleObj.player2Traps = battle.player2Traps?.map(() => ({ name: '🔒 Hidden', class: '?' })) || [];
    } else if (isPlayer2) {
      battleObj.player1Deck = null;
      battleObj.player1Traps = battle.player1Traps?.map(() => ({ name: '🔒 Hidden', class: '?' })) || [];
    } else {
      // Spectator — sees neither deck nor traps
      battleObj.player1Deck = null;
      battleObj.player2Deck = null;
      battleObj.player1Traps = battle.player1Traps?.map(() => ({ name: '🔒 Hidden', class: '?' })) || [];
      battleObj.player2Traps = battle.player2Traps?.map(() => ({ name: '🔒 Hidden', class: '?' })) || [];
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

    // ── VALIDATE CARDS AGAINST PRIVATE DECK ──────────────────
    let deckViolationWarning = '';
    const deckSubmitted = isPlayer1 ? battle.player1DeckSubmitted : battle.player2DeckSubmitted;

    if (deckSubmitted && actingDeck && cardsUsed?.length > 0) {
      const allowedNames = new Set();
      (actingDeck.ninjutsuGenjutsu || []).forEach(c => c.name && allowedNames.add(c.name.toLowerCase().trim()));
      (actingDeck.skills || []).forEach(c => c.name && allowedNames.add(c.name.toLowerCase().trim()));
      (actingDeck.weaponBag || []).forEach(c => c.name && allowedNames.add(c.name.toLowerCase().trim()));
      if (actingDeck.kkgCard?.name) allowedNames.add(actingDeck.kkgCard.name.toLowerCase().trim());
      if (actingDeck.tailedBeast?.name) allowedNames.add(actingDeck.tailedBeast.name.toLowerCase().trim());
      if (actingDeck.summoningBeast?.name) allowedNames.add(actingDeck.summoningBeast.name.toLowerCase().trim());
      ['punch','kick','block','slash','throw','evade','genjutsu kai','substitution jutsu'].forEach(be => allowedNames.add(be));

      const violations = cardsUsed
        .filter(c => c.name && !allowedNames.has(c.name.toLowerCase().trim()))
        .map(c => c.name);

      if (violations.length > 0) {
        deckViolationWarning = `\n\n⚠️ DECK VIOLATION — ${actingPlayer.characterName} used card(s) NOT in their submitted deck:\n${violations.map(v => `• ${v}`).join('\n')}\nThese cards are INVALID this turn and disregarded by MOD.`;
      }
    }

    // Add player message to chat
    battle.chatLog.push({
      sender: req.user._id,
      senderName: actingPlayer.characterName,
      message: action,
      type: 'player',
    });

    const turnEntry = {
      turnNumber: battle.currentTurn,
      phase: phase || battle.phase,
      playerId: req.user._id,
      playerName: actingPlayer.characterName,
      action,
      cardsUsed: cardsUsed || [],
    };

    const aiResponse = await moderateTurn(battle, action, actingPlayer, opposingPlayer);
    const fullAiResponse = deckViolationWarning ? aiResponse + deckViolationWarning : aiResponse;

    const p1HPMatch = fullAiResponse.match(/P1[:\s]+(\d+)/i);
    const p2HPMatch = fullAiResponse.match(/P2[:\s]+(\d+)/i);
    if (p1HPMatch) battle.player1HP = Math.max(0, parseInt(p1HPMatch[1]));
    if (p2HPMatch) battle.player2HP = Math.max(0, parseInt(p2HPMatch[1]));

    turnEntry.result = fullAiResponse.substring(0, 200);
    turnEntry.hpChange = { player1: battle.player1HP, player2: battle.player2HP };
    turnEntry.aiModNote = fullAiResponse;
    battle.turns.push(turnEntry);

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
        battle.endReason = "Both players KO'd";
      } else if (battle.player1HP <= 0) {
        battle.winner = battle.player2._id;
        battle.loser  = battle.player1._id;
        battle.endReason = "Player 1 KO'd";
      } else if (battle.player2HP <= 0) {
        battle.winner = battle.player1._id;
        battle.loser  = battle.player2._id;
        battle.endReason = "Player 2 KO'd";
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

      if (battle.winner) {
        await User.findByIdAndUpdate(battle.winner, { $inc: { 'stats.wins': 1, 'stats.points': 3, 'stats.modCoins': 2 } });
        await User.findByIdAndUpdate(battle.loser, { $inc: { 'stats.losses': 1, 'stats.modCoins': 2 } });
      } else if (battle.isDraw) {
        await User.findByIdAndUpdate(battle.player1._id, { $inc: { 'stats.draws': 1, 'stats.points': 1, 'stats.modCoins': 2 } });
        await User.findByIdAndUpdate(battle.player2._id, { $inc: { 'stats.draws': 1, 'stats.points': 1, 'stats.modCoins': 2 } });
      }

      battle.chatLog.push({
        sender: req.user._id,
        senderName: 'AI-MOD',
        message: `🏁 BATTLE CONCLUDED!\nResult: ${battle.isDraw ? 'DRAW!' : `${battle.winner.toString() === battle.player1._id.toString() ? battle.player1Name : battle.player2Name} WINS!`}\nReason: ${battle.endReason}`,
        type: 'ai-mod',
      });
    } else {
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
    res.json({ battle, message: 'Battle forfeited' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
