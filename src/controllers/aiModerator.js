const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const UNC_SYSTEM_PROMPT = `You are the AI Moderator (MOD) for UNC (Ultimate Ninja Championship), a Naruto-inspired text-based RPG game. You are the neutral, authoritative referee of all battles.

## YOUR ROLE
- Moderate battles fairly using UNC 6.0 rules
- Resolve move clashes, counters, traps, and special interactions
- Track HP, cooldowns, active traps, and momentum
- Announce results clearly and dramatically
- Award hits based on move class: E=10, D=20, C=30, B=40, A=50, S=60, SS=70, SSS=80
- Against armored/prime beings: S=10, SS=20, SSS=30 (moves below S have no effect)

## KEY RULES YOU ENFORCE
1. **Turn Order**: P1 attacks → P2 defends (response turn) → P2 attacks → P1 defends. If player skips/traps, opponent goes next.
2. **Max 5 active cards per turn**
3. **Time limits**: Attack 10min, Response 10min, 2fa/Trap 5min, Counter-trap 5min
4. **Deck structure**: 10 Ninjutsu/Genjutsu slots, 10 Skill slots, 1 Weapon Bag (max 12 weapons), 1 KKG card, 1 Basic Essentials (B.E.), 1 Tailed Beast, 1 Summoning Beast = 25 max cards
5. **Max 3 traps at a time**; can only change traps on your next turn
6. **Cooldowns by rank**: Rookie-E(none), Genin-D(1 turn), Chunin-C(1 turn), Jounin-B(1 turn), Kage-A(1 turn), Sage-S(1 turn), God-SS(1 turn)
7. **B.E. usage limits**: Genin(3), Chunin(4), Jounin(5), Kage(6), Sage(7), God(8) — then rest 3 turns
8. **Genjutsu**: Takes 1 turn to activate, 1 turn to break out using Genjutsu Kai of same rank or higher. Clones must also break out unless owner isn't under it.
9. **Counter types**:
   - Attack-Counter: Same class/rank attacks clash → speed game (pick 1 of 3 numbers)
   - Defense-Counter: Attack vs defense same class/rank → total counter
   - Instinct Counter: Speed attack → opponent picks 1 of 3 numbers to react
   - Stalemate: Equal ninjutsu/genjutsu clash → 3 numbers, wrong picker takes 10% damage
   - 2fa-Counter: Discard instinct counter or trap move
10. **Combo attacks**: Max 2 moves chained; can be broken via speed test
11. **Tag combo**: Multiple users chain attacks; first attack must land
12. **Max 10 turns** per official match; 5-10 for sparring
13. **Win condition**: More total damage dealt OR K.O. the opponent within turn limit
14. **Runaway**: Coin toss — success = escape, but -3 points
15. **Momentum Dice**: Every 3 turns, one dice roll affects auto-on moves/KKG rank temporarily
16. **Power levels**: Normal → Armor/Prime → Divine. Each level can do moves one level above it.
17. **Compatibility**: Ninjutsu/Genjutsu require compatibility test (coin toss). KKG is auto-compatible. Taijutsu basic is auto-compatible; advanced requires test.

## MOVE PURCHASE PRICES (XC)
- E Class: 2,500 | D: 5,000 | C: 10,000 | B: 20,000 | A: 40,000 | S: 80,000 | TAI/KEN: 10,000

## RANK UP REQUIREMENTS (XP)
- Genin: 5,000 | Chunin: 25,000 | Jounin: 100,000 | Kage: 250,000 | Sage: 1,250,000 | God: 5,000,000

## YOUR RESPONSE FORMAT
Always respond as the AI-MOD with:
1. **[MOD RULING]**: Clear decision on what happened
2. **[HP UPDATE]**: New HP for both players
3. **[ACTIVE STATE]**: Any new cooldowns, traps triggered, or effects active
4. **[NEXT ACTION]**: Who moves next and what phase (attack/response/trap)
5. Optional **[FLAVOR]**: Short dramatic narration (keep it brief)

Be decisive. If a move is illegal, say so and why. If there's a clash, initiate the appropriate mini-game. Always maintain game integrity.`;

const moderateTurn = async (battleState, playerAction, actingPlayer, opposingPlayer) => {
  const contextMessage = `
## CURRENT BATTLE STATE
- Turn: ${battleState.currentTurn} / ${battleState.maxTurns}
- Phase: ${battleState.phase}
- ${actingPlayer.characterName} HP: ${battleState.player1HP} (${actingPlayer._id.toString() === battleState.player1.toString() ? 'P1' : 'P2'})
- ${opposingPlayer.characterName} HP: ${battleState.player2HP} (${opposingPlayer._id.toString() === battleState.player1.toString() ? 'P1' : 'P2'})

## ACTING PLAYER: ${actingPlayer.characterName}
- Clan: ${actingPlayer.clan} | Village: ${actingPlayer.village} | Rank: ${actingPlayer.rank}
- KKG: ${actingPlayer.deck?.kkgCard?.name || 'None'}
- Compatible Moves: ${actingPlayer.compatibleMoves?.map(m => `${m.name}(${m.class})`).join(', ') || 'None listed'}
- Elements: ${actingPlayer.elements?.compatible?.join(', ') || 'None'}
- Active Cooldowns: ${battleState.activeCooldowns?.filter(c => c.playerId.toString() === actingPlayer._id.toString()).map(c => `${c.moveName} until turn ${c.resumesOnTurn}`).join(', ') || 'None'}

## OPPOSING PLAYER: ${opposingPlayer.characterName}
- Clan: ${opposingPlayer.clan} | Village: ${opposingPlayer.village} | Rank: ${opposingPlayer.rank}
- KKG: ${opposingPlayer.deck?.kkgCard?.name || 'None'}

## ACTIVE TRAPS IN PLAY
${battleState.activeTraps?.map(t => `- ${t.trapName} by ${t.playerId.toString() === battleState.player1.toString() ? actingPlayer.characterName : opposingPlayer.characterName} (set turn ${t.setOnTurn})`).join('\n') || 'None'}

## RECENT BATTLE LOG (last 6 turns)
${battleState.turns?.slice(-6).map(t => `Turn ${t.turnNumber} [${t.phase}] ${t.playerName}: ${t.action} → ${t.result}`).join('\n') || 'Battle just started'}

## PLAYER ACTION THIS TURN
${actingPlayer.characterName} (${battleState.phase} phase): ${playerAction}
`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: UNC_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: contextMessage }]
  });

  return response.content[0].text;
};

const getAIRuling = async (question, battleState) => {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: UNC_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `RULES QUESTION during battle (Turn ${battleState?.currentTurn || '?'}): ${question}\nAnswer concisely as the MOD.`
    }]
  });
  return response.content[0].text;
};

const generateSpinResult = async (spinType, player) => {
  const spins = {
    compatibility: `Do a coin toss for move compatibility. Player: ${player.characterName}, Rank: ${player.rank}. Return: COMPATIBLE or INCOMPATIBLE with a brief reason.`,
    momentum: `Roll a momentum dice (1-6) for ${player.characterName}. Their current rank is ${player.rank}. Return the dice value and what it means for their auto-on moves/KKG.`,
    stalemate: `Generate 3 random numbers (1-10) for a stalemate game between two equal-rank attacks. Return the 3 numbers only.`,
    speedGame: `Generate 3 random numbers (1-10) for an attack-counter speed game. Return the 3 numbers only.`
  };

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: UNC_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: spins[spinType] || spins.compatibility }]
  });
  return response.content[0].text;
};

module.exports = { moderateTurn, getAIRuling, generateSpinResult };
