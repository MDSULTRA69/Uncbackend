const express = require('express');
const Battle = require('../models/Battle');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { moderateTurn, getAIRuling, generateSpinResult } = require('../aiModerator');
const router = express.Router();

// Create a new battle
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
      player1Deck: player.deck,
      player2Deck: opponent.deck,
      battleType: battleType || 'official',
      maxTurns: 10,
      whoseTurn: player._id,
      status: 'active',
      village: player.village
    });

    // System opening message
    battle.chatLog.push({
      sender: player._id,
      senderName: 'AI-MOD',
      message: `⚔️ BATTLE INITIATED!\n\n${player.characterName} vs ${opponent.characterName}\nType: ${(battleType || 'official').toUpperCase()} | Max Turns: ${battle.maxTurns}\n\nA coin toss determines who goes first. ${player.characterName} (P1) calls it!`,
      type: 'ai-mod'
    });

    await battle.save();
    res.status(201).json({ battle });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's battles
router.get('/my-battles', auth, async (req, res) => {
  try {
    const battles = await Battle.find({
      $or: [{ player1: req.user._id }, { player2: req.user._id }]
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

// Get active battles
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

// Get specific battle
router.get('/:id', auth, async (req, res) => {
  try {
    const battle = await Battle.findById(req.params.id)
      .populate('player1', 'characterName clan village rank deck compatibleMoves elements')
      .populate('player2', 'characterName clan village rank deck compatibleMoves elements')
      .populate('winner', 'characterName')
      .populate('chatLog.sender', 'characterName');

    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    res.json({ battle });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit a turn action
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

    const actingPlayer = isPlayer1 ? battle.player1 : battle.player2;
    const opposingPlayer = isPlayer1 ? battle.player2 : battle.player1;

    const { action, cardsUsed, phase } = req.body;
    if (!action) return res.status(400).json({ error: 'Action required' });

    // Add player message to chat
    battle.chatLog.push({
      sender: req.user._id,
      senderName: actingPlayer.characterName,
      message: action,
      type: 'player'
    });

    // Add cards used to turn log
    const turnEntry = {
      turnNumber: battle.currentTurn,
      phase: phase || battle.phase,
      playerId: req.user._id,
      playerName: actingPlayer.characterName,
      action,
      cardsUsed: cardsUsed || []
    };

    // Get AI moderation
    const aiResponse = await moderateTurn(battle, action, actingPlayer, opposingPlayer);

    // Parse HP changes from AI response (simple regex approach)
    const p1HPMatch = aiResponse.match(/P1[:\s]+(\d+)/i);
    const p2HPMatch = aiResponse.match(/P2[:\s]+(\d+)/i);
    if (p1HPMatch) battle.player1HP = Math.max(0, parseInt(p1HPMatch[1]));
    if (p2HPMatch) battle.player2HP = Math.max(0, parseInt(p2HPMatch[1]));

    turnEntry.result = aiResponse.substring(0, 200);
    turnEntry.hpChange = { player1: battle.player1HP, player2: battle.player2HP };
    turnEntry.aiModNote = aiResponse;
    battle.turns.push(turnEntry);

    // Add AI mod response to chat
    battle.chatLog.push({
      sender: req.user._id,
      senderName: 'AI-MOD',
      message: aiResponse,
      type: 'ai-mod'
    });

    // Check win/loss conditions
    if (battle.player1HP <= 0 || battle.player2HP <= 0 || battle.currentTurn >= battle.maxTurns) {
      battle.status = 'completed';

      if (battle.player1HP <= 0 && battle.player2HP <= 0) {
        battle.isDraw = true;
        battle.endReason = "Both players KO'd";
        battle.winner = battle.player2._id;
        battle.loser = battle.player1._id;
        battle.endReason = "Player 1 KO'd";
      } else if (battle.player2HP <= 0) {
        battle.winner = battle.player1._id;
        battle.loser = battle.player2._id;
        battle.endReason = "Player 2 KO'd";
      } else {
        // Turn limit reached - compare damage
        const p1Damage = 100 - battle.player2HP;
        const p2Damage = 100 - battle.player1HP;
        if (p1Damage > p2Damage) {
          battle.winner = battle.player1._id;
          battle.loser = battle.player2._id;
        } else if (p2Damage > p1Damage) {
          battle.winner = battle.player2._id;
          battle.loser = battle.player1._id;
        } else {
          battle.isDraw = true;
        }
        battle.endReason = 'Turn limit reached';
      }

      // Update player stats
      if (battle.winner) {
        await User.findByIdAndUpdate(battle.winner, {
          $inc: { 'stats.wins': 1, 'stats.points': 3, 'stats.modCoins': 2 }
        });
        await User.findByIdAndUpdate(battle.loser, {
          $inc: { 'stats.losses': 1, 'stats.modCoins': 2 }
        });
      } else if (battle.isDraw) {
        await User.findByIdAndUpdate(battle.player1._id, {
          $inc: { 'stats.draws': 1, 'stats.points': 1, 'stats.modCoins': 2 }
        });
        await User.findByIdAndUpdate(battle.player2._id, {
          $inc: { 'stats.draws': 1, 'stats.points': 1, 'stats.modCoins': 2 }
        });
      }

      battle.chatLog.push({
        sender: req.user._id,
        senderName: 'AI-MOD',
        message: `🏁 BATTLE CONCLUDED!\nResult: ${battle.isDraw ? 'DRAW!' : `${battle.winner.toString() === battle.player1._id.toString() ? battle.player1Name : battle.player2Name} WINS!`}\nReason: ${battle.endReason}`,
        type: 'ai-mod'
      });
    } else {
      // Advance turn
      if (battle.phase === 'attack') {
        battle.phase = 'response';
      } else {
        battle.phase = 'attack';
        battle.currentTurn += 1;
        battle.whoseTurn = battle.whoseTurn.toString() === battle.player1._id.toString()
          ? battle.player2._id : battle.player1._id;
      }
    }

    await battle.save();
    res.json({ battle, aiResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ask AI MOD a rules question
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

// Trigger a spin/coin toss
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

// Forfeit / runaway
router.post('/:id/forfeit', auth, async (req, res) => {
  try {
    const battle = await Battle.findById(req.params.id);
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.status !== 'active') return res.status(400).json({ error: 'Battle not active' });

    const isPlayer1 = battle.player1.toString() === req.user._id.toString();
    battle.winner = isPlayer1 ? battle.player2 : battle.player1;
    battle.loser = req.user._id;
    battle.status = 'completed';
    battle.endReason = `${req.user.characterName || req.user.username} forfeited`;

    await User.findByIdAndUpdate(battle.winner, { $inc: { 'stats.wins': 1, 'stats.points': 3 } });
    await User.findByIdAndUpdate(battle.loser, { $inc: { 'stats.losses': 1, 'stats.points': -3 } });

    await battle.save();
    res.json({ battle, message: 'Battle forfeited' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
