// UNC 6.0 Rule-Based Moderator — no API calls, fully deterministic

// Hit values per class
const HIT_VALUES = { E: 10, D: 20, C: 30, B: 40, A: 50, S: 60, SS: 70, SSS: 80 };
const CLASS_ORDER = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

// BE usage limits by rank
const BE_LIMITS = { Rookie: 2, Genin: 3, Chunin: 4, Jounin: 5, Kage: 6, Sage: 7, God: 8 };

// Cooldown thresholds by rank
const COOLDOWN_RANK = { Rookie: 'E', Genin: 'D', Chunin: 'C', Jounin: 'B', Kage: 'A', Sage: 'S', God: 'SS' };

function classIndex(cls) {
  return CLASS_ORDER.indexOf(cls);
}

function randomNumbers(count, min, max) {
  const nums = [];
  while (nums.length < count) {
    const n = Math.floor(Math.random() * (max - min + 1)) + min;
    if (!nums.includes(n)) nums.push(n);
  }
  return nums;
}

function coinToss() {
  return Math.random() < 0.5 ? 'HEADS' : 'TAILS';
}

function rollDice(sides = 6) {
  return Math.floor(Math.random() * sides) + 1;
}

// Parse action text to detect move type keywords
function detectActionType(action) {
  const lower = action.toLowerCase();
  if (lower.includes('trap')) return 'trap';
  if (lower.includes('genjutsu') || lower.includes('illusion')) return 'genjutsu';
  if (lower.includes('defend') || lower.includes('block') || lower.includes('dodge') || lower.includes('evade')) return 'defense';
  if (lower.includes('ninjutsu') || lower.includes('jutsu') || lower.includes('attack') || lower.includes('strike') || lower.includes('punch') || lower.includes('kick')) return 'attack';
  return 'attack'; // default
}

// Parse class from action text or cards used
function detectClass(action, cardsUsed) {
  if (cardsUsed && cardsUsed.length > 0) {
    // Use highest class card
    let highest = 'E';
    for (const card of cardsUsed) {
      if (card.class && classIndex(card.class) > classIndex(highest)) {
        highest = card.class;
      }
    }
    return highest;
  }
  // Try to find class in text
  for (const cls of ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'E']) {
    if (action.includes(cls + ' class') || action.includes(cls + '-class')) return cls;
  }
  return 'D'; // default
}

// Main moderation function
const moderateTurn = async (battleState, playerAction, actingPlayer, opposingPlayer) => {
  const turn = battleState.currentTurn;
  const phase = battleState.phase;
  const p1HP = battleState.player1HP;
  const p2HP = battleState.player2HP;
  const isP1Acting = actingPlayer._id.toString() === battleState.player1.toString();
  const actingHP = isP1Acting ? p1HP : p2HP;
  const opposingHP = isP1Acting ? p2HP : p1HP;

  const actionType = detectActionType(playerAction);
  const moveClass = detectClass(playerAction, battleState.turns?.slice(-1)[0]?.cardsUsed);
  const hitValue = HIT_VALUES[moveClass] || 10;
  const cardsUsed = battleState.turns?.slice(-1)[0]?.cardsUsed || [];

  // Check card limit
  if (cardsUsed.length > 5) {
    return `[MOD RULING] ❌ ILLEGAL MOVE — Maximum 5 active cards per turn. You played ${cardsUsed.length}. Action rejected. Replaying turn.

[HP UPDATE] P1: ${p1HP} | P2: ${p2HP}
[ACTIVE STATE] No change — resubmit with 5 or fewer cards.
[NEXT ACTION] ${actingPlayer.characterName} must resubmit their action.`;
  }

  let newP1HP = p1HP;
  let newP2HP = p2HP;
  let ruling = '';
  let activeState = '';
  let nextAction = '';
  let flavor = '';

  // Momentum dice every 3 turns
  const momentumNote = turn % 3 === 0 && turn > 0
    ? `\n⚡ MOMENTUM DICE — Turn ${turn} triggers a dice roll: [${rollDice()}] — KKG and auto-on effects may fluctuate this turn.`
    : '';

  if (phase === 'attack') {
    if (actionType === 'trap') {
      ruling = `[MOD RULING] 🪤 ${actingPlayer.characterName} sets a TRAP (${moveClass} class). Trap is now active. Opponent must play their action — if it matches the trap condition, it triggers.`;
      activeState = `[ACTIVE STATE] Trap set by ${actingPlayer.characterName} (${moveClass} class). Max 3 traps allowed simultaneously.`;
      nextAction = `[NEXT ACTION] ${opposingPlayer.characterName} — ATTACK phase. Your move.`;
      flavor = `[FLAVOR] The battlefield falls silent as ${actingPlayer.characterName} weaves a hidden snare...`;
    } else if (actionType === 'genjutsu') {
      ruling = `[MOD RULING] 🌀 ${actingPlayer.characterName} casts a GENJUTSU (${moveClass} class — ${hitValue} dmg if unbroken). Takes 1 turn to activate. ${opposingPlayer.characterName} may attempt Genjutsu Kai of equal or higher class on their response turn to break out.`;
      activeState = `[ACTIVE STATE] Genjutsu activating — ${opposingPlayer.characterName} must respond with Genjutsu Kai (${moveClass}+) or take ${hitValue} damage next turn.`;
      nextAction = `[NEXT ACTION] ${opposingPlayer.characterName} — RESPONSE phase. Break out or take the hit.`;
      flavor = `[FLAVOR] Reality warps and twists around ${opposingPlayer.characterName}...`;
    } else {
      // Standard attack
      ruling = `[MOD RULING] ⚔️ ${actingPlayer.characterName} launches a ${moveClass}-class ATTACK (${hitValue} damage potential). ${opposingPlayer.characterName} must respond — defend, counter, or take the hit.`;
      activeState = `[ACTIVE STATE] Attack in play — ${moveClass} class, ${hitValue} base damage.`;
      nextAction = `[NEXT ACTION] ${opposingPlayer.characterName} — RESPONSE phase. Defend, counter, or declare hit.`;
      flavor = `[FLAVOR] ${actingPlayer.characterName}'s chakra surges as they commit to the assault!`;
    }
  } else {
    // Response phase
    if (actionType === 'defense') {
      // Check if defense matches attack class
      const lastAttack = battleState.turns?.slice(-1)[0];
      const attackClass = lastAttack ? detectClass(lastAttack.action, lastAttack.cardsUsed) : 'D';
      const attackHit = HIT_VALUES[attackClass] || 20;

      if (moveClass === attackClass) {
        // Total counter — no damage
        ruling = `[MOD RULING] 🛡️ TOTAL COUNTER! ${actingPlayer.characterName}'s ${moveClass}-class defense perfectly matches the ${attackClass}-class attack. No damage dealt. Turn advances.`;
        activeState = `[ACTIVE STATE] Clean block — no HP change.`;
        nextAction = `[NEXT ACTION] Turn ${turn + 1} begins. ${actingPlayer.characterName} — ATTACK phase.`;
        flavor = `[FLAVOR] A perfect clash of force — neither ninja yields!`;
      } else if (classIndex(moveClass) > classIndex(attackClass)) {
        // Over-defense — counter damage on attacker
        const counterDmg = Math.floor(attackHit * 0.5);
        if (isP1Acting) newP2HP = Math.max(0, opposingHP - counterDmg);
        else newP1HP = Math.max(0, opposingHP - counterDmg);
        ruling = `[MOD RULING] 💥 OVER-DEFENSE! ${actingPlayer.characterName}'s defense exceeds the attack. Counter-blow deals ${counterDmg} damage to ${opposingPlayer.characterName}!`;
        activeState = `[ACTIVE STATE] Counter damage applied.`;
        nextAction = `[NEXT ACTION] Turn ${turn + 1}. ${actingPlayer.characterName} — ATTACK phase.`;
        flavor = `[FLAVOR] ${actingPlayer.characterName} turns the attack against its user!`;
      } else {
        // Under-defense — partial damage
        const diff = classIndex(attackClass) - classIndex(moveClass);
        const dmgTaken = Math.floor(attackHit * (0.3 + diff * 0.1));
        if (isP1Acting) newP2HP = Math.max(0, actingHP - dmgTaken);
        else newP1HP = Math.max(0, actingHP - dmgTaken);
        ruling = `[MOD RULING] 💢 PARTIAL BLOCK — ${actingPlayer.characterName}'s ${moveClass}-class defense is outclassed by the ${attackClass} attack. ${dmgTaken} damage taken!`;
        activeState = `[ACTIVE STATE] Partial damage applied.`;
        nextAction = `[NEXT ACTION] Turn ${turn + 1}. ${opposingPlayer.characterName} — ATTACK phase.`;
        flavor = `[FLAVOR] The defense holds — barely!`;
      }
    } else if (actionType === 'attack') {
      // Counter-attack — speed game triggered
      const nums = randomNumbers(3, 1, 10);
      ruling = `[MOD RULING] ⚡ ATTACK-COUNTER! ${actingPlayer.characterName} responds with a ${moveClass}-class counter! Both moves clash — SPEED GAME initiated!\n\nNumbers: [${nums.join(', ')}]\n${actingPlayer.characterName} picks first — call your number!`;
      activeState = `[ACTIVE STATE] Speed game in progress. Winner deals their move's damage. Loser takes damage.`;
      nextAction = `[NEXT ACTION] Both players call their number. MOD resolves.`;
      flavor = `[FLAVOR] Lightning reflexes on both sides — who is faster?!`;
    } else {
      // Hit taken
      const lastAttack = battleState.turns?.slice(-1)[0];
      const attackClass = lastAttack ? detectClass(lastAttack.action, lastAttack.cardsUsed) : 'D';
      const dmg = HIT_VALUES[attackClass] || 20;
      if (isP1Acting) newP2HP = Math.max(0, actingHP - dmg);
      else newP1HP = Math.max(0, actingHP - dmg);
      ruling = `[MOD RULING] 💥 HIT CONFIRMED! ${actingPlayer.characterName} takes ${dmg} damage from the ${attackClass}-class attack!`;
      activeState = `[ACTIVE STATE] HP updated.`;
      nextAction = `[NEXT ACTION] Turn ${turn + 1}. ${actingPlayer.characterName} — ATTACK phase.`;
      flavor = `[FLAVOR] ${actingPlayer.characterName} staggers from the impact!`;
    }
  }

  const finalP1HP = isP1Acting ? newP1HP : newP1HP;
  const finalP2HP = isP1Acting ? newP2HP : newP2HP;

  return `${momentumNote}
${ruling}

[HP UPDATE] P1: ${finalP1HP} | P2: ${finalP2HP}
${activeState}
${nextAction}
${flavor}`.trim();
};

// Rules question handler — returns rule lookup
const getAIRuling = async (question, battleState) => {
  const lower = question.toLowerCase();

  if (lower.includes('be') || lower.includes('basic essential')) {
    return `[MOD RULING] B.E. Usage Limits: Genin(3), Chunin(4), Jounin(5), Kage(6), Sage(7), God(8) per battle. After limit is reached, rest 3 turns before using again.`;
  }
  if (lower.includes('cooldown')) {
    return `[MOD RULING] Cooldowns apply when a move's class meets or exceeds your rank threshold: Rookie=E, Genin=D, Chunin=C, Jounin=B, Kage=A, Sage=S, God=SS. Higher class moves require rest turns.`;
  }
  if (lower.includes('genjutsu') || lower.includes('illusion')) {
    return `[MOD RULING] Genjutsu takes 1 turn to activate. To break out, opponent must use Genjutsu Kai of equal or higher class. Clones must also break out unless the owner is not under it.`;
  }
  if (lower.includes('trap')) {
    return `[MOD RULING] Max 3 traps active at once. Traps can only be changed on your next turn. A trap activates when the opponent performs the guessed action at the same rank or higher.`;
  }
  if (lower.includes('combo')) {
    return `[MOD RULING] Max 2 moves can be chained in a combo. Combos can be broken via speed test by the opponent.`;
  }
  if (lower.includes('counter')) {
    return `[MOD RULING] Counter Types:\n- Attack-Counter: Same class clash → speed game (pick 1 of 3 numbers)\n- Defense-Counter: Equal class block → total counter, no damage\n- Instinct Counter: Speed attack → opponent picks 1 of 3 numbers\n- Stalemate: Equal ninjutsu clash → 3 numbers, wrong picker takes 10% damage`;
  }
  if (lower.includes('turn') || lower.includes('max')) {
    return `[MOD RULING] Official matches: 10 turns max. Casual sparring: 10 turns. Win = more damage dealt OR KO within turn limit.`;
  }
  if (lower.includes('damage') || lower.includes('hit')) {
    return `[MOD RULING] Hit values by class: E=10, D=20, C=30, B=40, A=50, S=60, SS=70, SSS=80. Against armor/prime beings: S=10, SS=20, SSS=30 (below S has no effect).`;
  }
  if (lower.includes('compatible') || lower.includes('compatibility')) {
    return `[MOD RULING] Ninjutsu/Genjutsu require a compatibility coin toss. KKG is auto-compatible. Basic Taijutsu is auto-compatible; advanced Taijutsu requires a test.`;
  }
  if (lower.includes('kkg')) {
    return `[MOD RULING] KKG cards are auto-compatible. They are limited to SSS class after armorization. All KKG effects last 1 turn unless stated otherwise.`;
  }

  return `[MOD RULING] Rule not found in quick-reference. Current battle state — Turn ${battleState?.currentTurn || '?'}, Phase: ${battleState?.phase || '?'}. Refer to the full UNC 6.0 rulebook for edge cases.`;
};

// Spin/coin toss — fully random, no API
const generateSpinResult = async (spinType, player) => {
  if (spinType === 'compatibility') {
    const result = coinToss();
    return `🪙 COIN TOSS — ${result}!\n${result === 'HEADS' ? '✅ COMPATIBLE — Move is approved!' : '❌ INCOMPATIBLE — Move cannot be used this turn.'}`;
  }
  if (spinType === 'momentum') {
    const roll = rollDice(6);
    const effects = {
      1: 'KKG weakened — -1 class to auto-on effects this turn.',
      2: 'Minor disruption — auto-on effects at normal power.',
      3: 'Stable momentum — no change.',
      4: 'Chakra surge — +1 rank to KKG this turn.',
      5: 'Power boost — auto-on moves gain +1 class this turn.',
      6: '🌟 MOMENTUM PEAK — auto-on and KKG at maximum power this turn!'
    };
    return `🎲 MOMENTUM DICE — ${player.characterName} rolled a [${roll}]!\n${effects[roll]}`;
  }
  if (spinType === 'stalemate') {
    const nums = randomNumbers(3, 1, 10);
    return `⚡ STALEMATE NUMBERS: [${nums.join(', ')}]\nBoth players pick a number. Wrong picker takes 10% damage.`;
  }
  if (spinType === 'speedGame') {
    const nums = randomNumbers(3, 1, 10);
    return `⚡ SPEED GAME NUMBERS: [${nums.join(', ')}]\nBoth players pick a number. Highest wins — winner's move deals full damage.`;
  }
  // Generic coin toss
  const result = coinToss();
  return `🪙 COIN TOSS — ${result}!`;
};

module.exports = { moderateTurn, getAIRuling, generateSpinResult };
