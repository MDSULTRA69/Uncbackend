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
      maxTurns: 10,
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
    res.json({ message: 'Deck submitted privately.' });
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
    } else if (isPlayer2) {
      battleObj.player1Deck = null;
      battleObj.player1Traps = (battle.player1Traps || []).map(() => ({ name: '🔒 Hidden', class: '?' }));
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

    // ── WHOSE TURN ENFORCEMENT ────────────────────────────────
    // Coin toss at the very start is exempt — either player can call it
    const _actionLowerCheck = action.toLowerCase().trim();
    const _isCoinTossAction = (_actionLowerCheck === 'heads' || _actionLowerCheck === 'tails' ||
                               _actionLowerCheck.includes('i call heads') || _actionLowerCheck.includes('i call tails'))
                              && battle.currentTurn === 1 && battle.turns.length === 0;

    if (!_isCoinTossAction) {
      if (battle.phase === 'attack') {
        // Only the player whose turn it is may attack
        const _expectedAttacker = battle.whoseTurn?.toString();
        if (_expectedAttacker && req.user._id.toString() !== _expectedAttacker) {
          const _expectedName = _expectedAttacker === battle.player1._id.toString() ? battle.player1Name : battle.player2Name;
          return res.status(403).json({ error: `It is not your turn. Waiting for ${_expectedName} to attack.` });
        }
      } else if (battle.phase === 'response') {
        // Only the player who did NOT submit the most recent action may respond
        const _lastTurnEntry = battle.turns[battle.turns.length - 1];
        const _lastActorId = _lastTurnEntry?.playerId?.toString();
        if (_lastActorId && req.user._id.toString() === _lastActorId) {
          return res.status(403).json({ error: 'You already acted this phase. Wait for your opponent to respond.' });
        }
      }
    }

    // ── COIN TOSS HANDLING ────────────────────────────────────
    const actionLower = action.toLowerCase().trim();
    const isCoinToss = actionLower === 'heads' || actionLower === 'tails' || 
                       actionLower.includes('i call heads') || actionLower.includes('i call tails');
    
    if (isCoinToss && battle.currentTurn === 1 && battle.turns.length === 0) {
      const result = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
      const call = actionLower.includes('tail') ? 'TAILS' : 'HEADS';
      const p1WonToss = call === result;
      // Winner of toss goes first
      const firstPlayer = p1WonToss ? battle.player1Name : battle.player2Name;
      const firstPlayerId = p1WonToss ? battle.player1._id : battle.player2._id;

      battle.whoseTurn = firstPlayerId;

      battle.chatLog.push({ sender: req.user._id, senderName: actingPlayer.characterName, message: action, type: 'player' });

      const coinMsg = `🪙 COIN TOSS RESULT: ${result}!\n${actingPlayer.characterName} called ${call} — ${call === result ? '✅ CORRECT! You go first!' : '❌ WRONG! Opponent goes first.'}\n\n⚔️ ${firstPlayer} goes FIRST!\n\n🪤 Both players: submit traps via TRAPS tab before acting.\nTurn 1 | Phase: ATTACK — ${firstPlayer} to act.`;

      battle.chatLog.push({ sender: req.user._id, senderName: 'AI-MOD', message: coinMsg, type: 'ai-mod' });

      await battle.save();
      return res.json({ battle, aiResponse: coinMsg });
    }

    // ── DECK VIOLATION CHECK ──────────────────────────────────
    let deckViolationWarning = '';
    const deckSubmitted = isPlayer1 ? battle.player1DeckSubmitted : battle.player2DeckSubmitted;

    if (deckSubmitted && actingDeck) {
      const allowedNames = new Set();
      (actingDeck.ninjutsuGenjutsu || []).forEach(c => c.name && allowedNames.add(c.name.toLowerCase().trim()));
      (actingDeck.skills || []).forEach(c => c.name && allowedNames.add(c.name.toLowerCase().trim()));
      (actingDeck.weaponBag || []).forEach(c => c.name && allowedNames.add(c.name.toLowerCase().trim()));
      if (actingDeck.kkgCard?.name) allowedNames.add(actingDeck.kkgCard.name.toLowerCase().trim());
      if (actingDeck.tailedBeast?.name) allowedNames.add(actingDeck.tailedBeast.name.toLowerCase().trim());
      if (actingDeck.summoningBeast?.name) allowedNames.add(actingDeck.summoningBeast.name.toLowerCase().trim());

      // Bonus skills are always allowed (they're universal, not deck-specific)
      const BONUS_SKILLS = ['negate','shield','bulletproof','speed','active','time-time','heightened sense',
        'old flame','nature','erase','crystal','health','king of luck'];
      BONUS_SKILLS.forEach(b => allowedNames.add(b));

      // Sage Mode — allowed if it's in the player's deck specials
      if (actingDeck.sageMode?.type) {
        allowedNames.add('sage mode');
        allowedNames.add('heavenly sage mode');
        allowedNames.add('devil sage mode');
        allowedNames.add('sage');
      }

      // Basic essentials always allowed
      ['punch','kick','block','slash','throw','evade','dodge','genjutsu kai','substitution jutsu',
       'clone sub','skip','set trap','counter','heads','tails','coin','trap:','activate',
       'contingency','2fa','3fa','no 2fa'].forEach(be => allowedNames.add(be));

      // --- Check the explicit cardsUsed array ---
      const cardViolations = (cardsUsed || [])
        .filter(c => c.name && !allowedNames.has(c.name.toLowerCase().trim()))
        .map(c => c.name);

      // --- Also parse the free-text action for move names ---
      // Build a lookup set of all move names from the MOVE_DB (known moves)
      // We extract anything after "activate", "summon", "use" keywords and check each line
      const actionLines = action.split(/[\n,]+/).map(l => l.trim().toLowerCase()).filter(Boolean);
      const textViolations = [];
      for (const line of actionLines) {
        // Strip common prefixes to get the card name
        const stripped = line
          .replace(/^activate\s+/i, '')
          .replace(/^summon\s+/i, '')
          .replace(/^create\s+\d+\s+\S*\s*clones?\s*/i, '')
          .replace(/^all\s+\S+\s+clones?\s*:/i, '')
          .replace(/^set\s+traps?\s*/i, '')
          .replace(/^instant\s+/i, '')
          .replace(/\s+(SSS|SS|S|A|B|C|D|E|Z)\d*$/i, '')
          .trim();

        if (!stripped || stripped.length < 3) continue;

        // Check if it matches any allowed deck card or always-allowed keyword
        const isAllowed = [...allowedNames].some(allowed => stripped.includes(allowed) || allowed.includes(stripped));
        // Only flag if the line clearly refers to a specific named move (contains a capital letter or known suffix)
        const looksLikeMove = /activate|summon|jutsu|mode|rasengan|chidori|tbb|hvt|chakra|bijuu|sage|manda|zephyr/.test(stripped);
        if (looksLikeMove && !isAllowed) {
          // Extra check: is it a basic essential or generic action?
          const isGeneric = ['skip','counter','yes','no','2fa','3fa','trap','set','all','clone sub'].some(g => stripped.startsWith(g));
          if (!isGeneric) {
            textViolations.push(stripped);
          }
        }
      }

      const allViolations = [...new Set([...cardViolations, ...textViolations])];
      if (allViolations.length > 0) {
        deckViolationWarning = `\n\n⚠️ DECK VIOLATION — ${actingPlayer.characterName} attempted to use card(s) NOT in their submitted deck:\n${allViolations.map(v => `• ${v}`).join('\n')}\nThese moves are INVALID and will not count this turn. Deck must be submitted before the match and cannot be changed mid-battle.`;
      }
    } else if (!deckSubmitted) {
      deckViolationWarning = `\n\n⚠️ DECK NOT SUBMITTED — ${actingPlayer.characterName} has not submitted a private deck. All moves are unverified. Please submit your deck via the DECK tab immediately.`;
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

    // Pass player identity and deck clearly to moderator
    const aiResponse = await moderateTurn(
      battle,
      action,
      actingPlayer,
      opposingPlayer,
      isPlayer1 ? 'player1' : 'player2',
      actingDeck  // ← deck passed so moderator can validate moves inline
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


// ── UPDATE PLAYER STATUS (active power-ups, effects, clones, summonings) ──────
// Called when a player activates/deactivates a power-up (Sage Mode, Armor, Prime, etc.)
// This is what the AI moderator reads to determine damage multipliers (NB4).

router.post('/:id/update-status', auth, async (req, res) => {
  try {
    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.status !== 'active') return res.status(400).json({ error: 'Battle is not active' });

    const isPlayer1 = battle.player1.toString() === req.user._id.toString();
    const isPlayer2 = battle.player2.toString() === req.user._id.toString();
    if (!isPlayer1 && !isPlayer2) return res.status(403).json({ error: 'You are not in this battle' });

    const { activated, effects, clones, summonings } = req.body;

    // Initialise boardState if missing
    if (!battle.boardState) battle.boardState = { player1: {}, player2: {} };
    const side = isPlayer1 ? 'player1' : 'player2';

    if (Array.isArray(activated))   battle.boardState[side].activated   = activated;
    if (Array.isArray(effects))     battle.boardState[side].effects     = effects;
    if (typeof clones === 'string') battle.boardState[side].clones      = clones;
    if (Array.isArray(summonings))  battle.boardState[side].summonings  = summonings;

    // Mark the boardState as modified (mongoose mixed type needs this)
    battle.markModified('boardState');

    const playerName = isPlayer1 ? battle.player1Name : battle.player2Name;
    const activatedList = (activated || []).join(', ') || 'none';
    battle.chatLog.push({
      sender: req.user._id,
      senderName: 'AI-MOD',
      message: `📋 ${playerName} status updated — Active: ${activatedList}`,
      type: 'ai-mod',
    });

    await battle.save();
    res.json({ message: 'Status updated.', boardState: battle.boardState });
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
