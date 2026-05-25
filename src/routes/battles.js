const express = require('express');
const Battle = require('../models/Battle');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { moderateTurn, getAIRuling, generateSpinResult, generateOpeningRolls } = require('../aiModerator');

const router = express.Router();

// ── CREATE BATTLE ─────────────────────────────────────────────

router.post('/create', auth, async (req, res) => {
  try {
    const { opponentId, battleType } = req.body;
    if (!opponentId) return res.status(400).json({ error: 'Opponent required' });

    const opponent = await User.findById(opponentId);
    if (!opponent) return res.status(404).json({ error: 'Opponent not found' });

    const player = req.user;

    // Generate opening rolls for the match
    const openingRolls = generateOpeningRolls();

    const battle = new Battle({
      player1: player._id,
      player2: opponent._id,
      player1Name: player.characterName,
      player2Name: opponent.characterName,
      battleType: battleType || 'official',
      maxTurns: battleType === 'sparring' ? 5 : 10,
      currentTurn: 1,
      whoseTurn: player._id,
      status: 'active',
      village: player.village,
      openingRolls,
    });

    // Opening message with rolls
    const rollsText = `
🎲 OPENING ROLLS (once per match):
• AA (Attack Ability): ${openingRolls.AA}
• TB (Tailed Beast): ${openingRolls.TB}
• SSS" (Prime): ${openingRolls.SSS_prime}
• SB (Sage Boost): ${openingRolls.SB}
• Armour AA: ${openingRolls.armourAA}
• Z Class: ${openingRolls.zClass}
• Terrain: ${openingRolls.terrain}

These rolls apply for the entire match.`;

    battle.chatLog.push({
      sender: player._id,
      senderName: 'AI-MOD',
      message: `⚔️ BATTLE INITIATED!\n\n${player.characterName} (P1) vs ${opponent.characterName} (P2)\nType: ${(battleType || 'official').toUpperCase()} | Max Turns: ${battle.maxTurns}\n${rollsText}\n\n🔒 Both players submit their private deck (DECK tab) and traps (TRAPS tab) before acting.\n\n🪙 COIN TOSS — Who goes first?\n${player.characterName} (P1) calls it! Type HEADS or TAILS.`,
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
    if (!isPlayer1 && !isPlayer2) return res.status(403).json({ error: 'You are not in this battle' });

    const { deck } = req.body;
    if (!deck) return res.status(400).json({ error: 'Deck required' });

    if (isPlayer1) { battle.player1Deck = deck; battle.player1DeckSubmitted = true; }
    else { battle.player2Deck = deck; battle.player2DeckSubmitted = true; }

    const playerName = isPlayer1 ? battle.player1Name : battle.player2Name;
    battle.chatLog.push({
      sender: req.user._id,
      senderName: 'AI-MOD',
      message: `🔒 ${playerName} has submitted their private deck. Contents hidden from opponent.`,
      type: 'ai-mod',
    });

    await battle.save();

    // Build a summary of the saved deck to confirm back to the submitting player
    const savedDeck = isPlayer1 ? battle.player1Deck : battle.player2Deck;
    const deckSummary = {
      ninjutsuGenjutsu: (savedDeck.ninjutsuGenjutsu || []).map(c => ({ name: c.name, class: c.class })),
      skills:           (savedDeck.skills || []).map(c => ({ name: c.name, class: c.class })),
      weaponBag:        (savedDeck.weaponBag || []).map(c => ({ name: c.name, class: c.class })),
      kkgCard:          savedDeck.kkgCard   ? { name: savedDeck.kkgCard.name,   class: savedDeck.kkgCard.class   } : null,
      tailedBeast:      savedDeck.tailedBeast    ? { name: savedDeck.tailedBeast.name,    class: savedDeck.tailedBeast.class    } : null,
      summoningBeast:   savedDeck.summoningBeast ? { name: savedDeck.summoningBeast.name, class: savedDeck.summoningBeast.class } : null,
    };

    res.json({
      message: 'Deck submitted privately.',
      playerLabel: isPlayer1 ? 'P1' : 'P2',
      playerName,
      deck: deckSummary,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SUBMIT PRIVATE TRAPS ──────────────────────────────────────

router.post('/:id/submit-traps', auth, async (req, res) => {
  try {
    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ error: 'Battle not found' });

    const isPlayer1 = battle.player1.toString() === req.user._id.toString();
    const isPlayer2 = battle.player2.toString() === req.user._id.toString();
    if (!isPlayer1 && !isPlayer2) return res.status(403).json({ error: 'You are not in this battle' });

    const { traps } = req.body;
    if (!Array.isArray(traps)) return res.status(400).json({ error: 'Traps must be an array' });
    if (traps.length > 3) return res.status(400).json({ error: 'Max 3 traps allowed' });

    const cleanTraps = traps.map(t => ({
      name: String(t.name || ''),
      class: String(t.class || 'D')
    })).filter(t => t.name);

    if (isPlayer1) battle.player1Traps = cleanTraps;
    else battle.player2Traps = cleanTraps;

    const playerName = isPlayer1 ? battle.player1Name : battle.player2Name;
    battle.chatLog.push({
      sender: req.user._id,
      senderName: 'AI-MOD',
      message: `🪤 ${playerName} updated traps (${cleanTraps.length} set). Contents hidden from opponent.`,
      type: 'ai-mod',
    });

    await battle.save();
    res.json({ message: `${cleanTraps.length} trap(s) submitted privately.` });
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
      .populate('player1', 'characterName clan village rank compatibleMoves elements')
      .populate('player2', 'characterName clan village rank compatibleMoves elements')
      .populate('winner', 'characterName')
      .populate('chatLog.sender', 'characterName');

    if (!battle) return res.status(404).json({ error: 'Battle not found' });

    const isPlayer1 = battle.player1?._id?.toString() === req.user._id.toString();
    const isPlayer2 = battle.player2?._id?.toString() === req.user._id.toString();

    const battleObj = battle.toObject();

    if (isPlayer1) {
      battleObj.player2Deck = null;
      battleObj.player2Traps = (battle.player2Traps || []).map(() => ({ name: '🔒 Hidden', class: '?' }));
      // Keep player1Deck intact so P1 can see their own submitted deck
    } else if (isPlayer2) {
      battleObj.player1Deck = null;
      battleObj.player1Traps = (battle.player1Traps || []).map(() => ({ name: '🔒 Hidden', class: '?' }));
      // Keep player2Deck intact so P2 can see their own submitted deck
    } else {
      battleObj.player1Deck = null;
      battleObj.player2Deck = null;
      battleObj.player1Traps = (battle.player1Traps || []).map(() => ({ name: '🔒 Hidden', class: '?' }));
      battleObj.player2Traps = (battle.player2Traps || []).map(() => ({ name: '🔒 Hidden', class: '?' }));
    }

    res.json({ battle: battleObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ── GET MY OWN DECK ──────────────────────────────────────────

router.get('/:id/my-deck', auth, async (req, res) => {
  try {
    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    const isPlayer1 = battle.player1.toString() === req.user._id.toString();
    const isPlayer2 = battle.player2.toString() === req.user._id.toString();
    if (!isPlayer1 && !isPlayer2) return res.status(403).json({ error: 'Not in this battle' });
    const myDeck      = isPlayer1 ? battle.player1Deck : battle.player2Deck;
    const mySubmitted = isPlayer1 ? battle.player1DeckSubmitted : battle.player2DeckSubmitted;
    const myName      = isPlayer1 ? battle.player1Name : battle.player2Name;
    const myLabel     = isPlayer1 ? 'P1' : 'P2';
    if (!myDeck || !mySubmitted) return res.json({ submitted: false, playerLabel: myLabel, playerName: myName, deck: null });
    const deckSummary = {
      ninjutsuGenjutsu: (myDeck.ninjutsuGenjutsu || []).map(c => ({ name: c.name, class: c.class })),
      skills:           (myDeck.skills || []).map(c => ({ name: c.name, class: c.class })),
      weaponBag:        (myDeck.weaponBag || []).map(c => ({ name: c.name, class: c.class })),
      kkgCard:          myDeck.kkgCard        ? { name: myDeck.kkgCard.name,        class: myDeck.kkgCard.class        } : null,
      tailedBeast:      myDeck.tailedBeast    ? { name: myDeck.tailedBeast.name,    class: myDeck.tailedBeast.class    } : null,
      summoningBeast:   myDeck.summoningBeast ? { name: myDeck.summoningBeast.name, class: myDeck.summoningBeast.class } : null,
    };
    res.json({ submitted: true, playerLabel: myLabel, playerName: myName, deck: deckSummary });
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
    if (!isPlayer1 && !isPlayer2) return res.status(403).json({ error: 'You are not in this battle' });

    const actingPlayer   = isPlayer1 ? battle.player1 : battle.player2;
    const opposingPlayer = isPlayer1 ? battle.player2 : battle.player1;
    const actingDeck     = isPlayer1 ? battle.player1Deck : battle.player2Deck;

    const { action, cardsUsed, phase } = req.body;
    if (!action) return res.status(400).json({ error: 'Action required' });

    // ── COIN TOSS HANDLING ────────────────────────────────────
    const actionLower = action.toLowerCase().trim();
    const isCoinTossInput = actionLower === 'heads' || actionLower === 'tails' ||
                            actionLower.includes('i call heads') || actionLower.includes('i call tails');

    // Guard: if coin toss not yet done, ONLY accept heads/tails — reject everything else
    if (!battle.coinTossCompleted) {
      if (!isCoinTossInput) {
        return res.status(400).json({
          error: 'Waiting for coin toss. Please type HEADS or TAILS to determine who goes first.'
        });
      }

      const result = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
      const call = actionLower.includes('tail') ? 'TAILS' : 'HEADS';
      const p1Wins = call === result;
      const firstPlayer    = p1Wins ? battle.player1Name : battle.player2Name;
      const firstPlayerId  = p1Wins ? battle.player1._id : battle.player2._id;

      battle.whoseTurn         = firstPlayerId;
      battle.coinTossCompleted = true;
      battle.phase             = 'attack';

      battle.chatLog.push({ sender: req.user._id, senderName: actingPlayer.characterName, message: action, type: 'player' });

      const coinMsg = `🪙 COIN TOSS RESULT: ${result}!\n${actingPlayer.characterName} called ${call.toUpperCase()} — ${call === result ? '✅ CORRECT!' : '❌ WRONG!'}\n\n⚔️ ${firstPlayer} goes FIRST!\n\n🪤 Both players: submit your traps via the TRAPS tab before Turn 1 begins.\nTurn 1 | Phase: ATTACK`;

      battle.chatLog.push({ sender: req.user._id, senderName: 'AI-MOD', message: coinMsg, type: 'ai-mod' });

      await battle.save();
      return res.json({ battle, aiResponse: coinMsg });
    }

    // ── DECK VIOLATION CHECK ──────────────────────────────────
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

      const violations = (cardsUsed || [])
        .filter(c => c.name && !allowedNames.has(c.name.toLowerCase().trim()))
        .map(c => c.name);

      if (violations.length > 0) {
        deckViolationWarning = `\n\n⚠️ DECK VIOLATION — ${actingPlayer.characterName} used card(s) NOT in their submitted deck:\n${violations.map(v => `• ${v}`).join('\n')}\nThese cards are INVALID this turn.`;
      }
    }

    // Add player message
    battle.chatLog.push({ sender: req.user._id, senderName: actingPlayer.characterName, message: action, type: 'player' });

    const turnEntry = {
      turnNumber: battle.currentTurn || 1,
      phase: phase || battle.phase,
      playerId: req.user._id,
      playerName: actingPlayer.characterName,
      action,
      cardsUsed: cardsUsed || [],
    };

    // Pass player identity clearly to moderator
    const aiResponse = await moderateTurn(
      battle,
      action,
      actingPlayer,
      opposingPlayer,
      isPlayer1 ? 'player1' : 'player2'
    );
    const fullAiResponse = deckViolationWarning ? aiResponse + deckViolationWarning : aiResponse;

    // Parse HP
    const p1HPMatch = fullAiResponse.match(/P1[:\s]+(\d+)/i);
    const p2HPMatch = fullAiResponse.match(/P2[:\s]+(\d+)/i);
    if (p1HPMatch) battle.player1HP = Math.max(0, parseInt(p1HPMatch[1]));
    if (p2HPMatch) battle.player2HP = Math.max(0, parseInt(p2HPMatch[1]));

    turnEntry.result = fullAiResponse.substring(0, 200);
    turnEntry.hpChange = { player1: battle.player1HP, player2: battle.player2HP };
    turnEntry.aiModNote = fullAiResponse;
    battle.turns.push(turnEntry);

    battle.chatLog.push({ sender: req.user._id, senderName: 'AI-MOD', message: fullAiResponse, type: 'ai-mod' });

    // Win check
    if (battle.player1HP <= 0 || battle.player2HP <= 0 || (battle.currentTurn || 1) >= battle.maxTurns) {
      battle.status = 'completed';
      if (battle.player1HP <= 0 && battle.player2HP <= 0) {
        battle.isDraw = true; battle.endReason = "Both KO'd";
      } else if (battle.player1HP <= 0) {
        battle.winner = battle.player2._id; battle.loser = battle.player1._id; battle.endReason = "P1 KO'd";
      } else if (battle.player2HP <= 0) {
        battle.winner = battle.player1._id; battle.loser = battle.player2._id; battle.endReason = "P2 KO'd";
      } else {
        const p1Dmg = 100 - battle.player2HP; const p2Dmg = 100 - battle.player1HP;
        if (p1Dmg > p2Dmg) { battle.winner = battle.player1._id; battle.loser = battle.player2._id; }
        else if (p2Dmg > p1Dmg) { battle.winner = battle.player2._id; battle.loser = battle.player1._id; }
        else battle.isDraw = true;
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
        sender: req.user._id, senderName: 'AI-MOD',
        message: `🏁 BATTLE CONCLUDED!\n${battle.isDraw ? 'DRAW!' : `${battle.winner.toString() === battle.player1._id.toString() ? battle.player1Name : battle.player2Name} WINS!`}\nReason: ${battle.endReason}`,
        type: 'ai-mod'
      });
    } else {
      if (battle.phase === 'attack') {
        battle.phase = 'response';
      } else {
        battle.phase = 'attack';
        battle.currentTurn = (battle.currentTurn || 1) + 1;
        battle.whoseTurn = battle.whoseTurn.toString() === battle.player1._id.toString()
          ? battle.player2._id : battle.player1._id;
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

// ── SPIN ──────────────────────────────────────────────────────

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
