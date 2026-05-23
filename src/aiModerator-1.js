// ============================================================
// UNC 6.0 AI MODERATOR — Full Rules Engine
// ============================================================

// ── CLASS / DAMAGE TABLES ────────────────────────────────────
const CLASS_ORDER = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'Z'];
const HIT_VALUES  = { E: 10, D: 20, C: 30, B: 40, A: 50, S: 60, SS: 70, SSS: 80, Z: 90 };

// BE usage limits per rank
const BE_LIMITS = { Rookie: 2, Genin: 3, Chunin: 4, Jounin: 5, Kage: 6, Sage: 7, God: 8 };

// Cooldown threshold class per rank (moves at/above this class trigger cooldown)
const COOLDOWN_THRESHOLD = {
  Rookie: 'E', Genin: 'D', Chunin: 'C', Jounin: 'B', Kage: 'A', Sage: 'S', God: 'SS'
};

// ── MOVE DATABASE ─────────────────────────────────────────────
// Key = lowercase name fragment(s), value = move metadata
const MOVE_DB = {
  // NINJUTSU
  'shadow clone': { type: 'ninjutsu', subtype: 'balanced', maxClass: 'B', sr: false, cloning: true },
  'cloning jutsu': { type: 'ninjutsu', subtype: 'balanced', maxClass: 'C', sr: false, cloning: true },
  'wind blade': { type: 'ninjutsu', subtype: 'attack', maxClass: 'A', sr: true, bleed: 0.10, invisible: true },
  'wind typhoon': { type: 'ninjutsu', subtype: 'attack', maxClass: 'A', sr: false },
  'passing typhoon': { type: 'ninjutsu', subtype: 'attack', maxClass: 'A', sr: false },
  'rasengan': { type: 'ninjutsu', subtype: 'attack', maxClass: 'A', sr: true, noPenalty: true },
  'massive rasengan': { type: 'ninjutsu', subtype: 'attack', maxClass: 'A', sr: true },
  'chidori nagashi': { type: 'ninjutsu', subtype: 'attack', maxClass: 'A', sr: false },
  'chidori': { type: 'ninjutsu', subtype: 'attack', maxClass: 'A', sr: true },
  'purple lightning': { type: 'ninjutsu', subtype: 'attack', maxClass: 'A', sr: false, noPenalty: true },
  'fireball jutsu': { type: 'ninjutsu', subtype: 'attack', maxClass: 'C', sr: false, burn: 0.10, weakTo: 'water' },
  'fire ball jutsu': { type: 'ninjutsu', subtype: 'attack', maxClass: 'C', sr: false, burn: 0.10, weakTo: 'water' },
  'fire storm': { type: 'ninjutsu', subtype: 'attack', maxClass: 'S', sr: false, bleed: 0.10, burn: 0.10 },
  'dragon flame bomb': { type: 'ninjutsu', subtype: 'attack', maxClass: 'C', sr: false, burn: 0.10, weakTo: 'water' },
  'kirin': { type: 'ninjutsu', subtype: 'attack', maxClass: 'S', sr: false, instinct: true, requiresDFB: true },
  'burning ash explosion': { type: 'ninjutsu', subtype: 'attack', maxClass: 'B', sr: false, burn: 0.10 },
  'elemental rasenshuriken': { type: 'ninjutsu', subtype: 'attack', maxClass: 'S', sr: true, linger: 0.15 },
  'lightning ball': { type: 'ninjutsu', subtype: 'attack', maxClass: 'C', sr: false, stun: true, weakTo: 'earth' },
  'lightning skin': { type: 'ninjutsu', subtype: 'balanced', maxClass: 'B', instinct: true, extraDmg: 0.10 },
  'liquid bullet': { type: 'ninjutsu', subtype: 'attack', maxClass: 'C', sr: false, bleed: 0.10, weakTo: 'lightning' },
  'water dragon': { type: 'ninjutsu', subtype: 'attack', maxClass: 'B', sr: false, bleed: 0.10, weakTo: 'lightning' },
  'water vortex': { type: 'ninjutsu', subtype: 'attack', maxClass: 'A', sr: false, bleed: 0.10, weakTo: 'lightning' },
  'wild water wave': { type: 'ninjutsu', subtype: 'attack', maxClass: 'C', sr: false, bleed: 0.10, weakTo: 'lightning' },
  'water prison': { type: 'ninjutsu', subtype: 'balanced', maxClass: 'C', sr: true, deactivatesCards: true },
  'water mirror': { type: 'ninjutsu', subtype: 'defense', maxClass: 'S', reflects: true },
  'hidden mist': { type: 'ninjutsu', subtype: 'balanced', maxClass: 'D', sr: false, turnsOffEvade: true },
  'mud wave': { type: 'ninjutsu', subtype: 'balanced', maxClass: 'B', sr: false, stun: true },
  'earth dome': { type: 'ninjutsu', subtype: 'trap', maxClass: 'B' },
  'earth spear': { type: 'ninjutsu', subtype: 'balanced', maxClass: 'B', sr: true, extraDmg: 0.10 },
  'gale palm': { type: 'ninjutsu', subtype: 'attack', maxClass: 'C', sr: false, weakTo: 'earth' },
  'gale shield': { type: 'ninjutsu', subtype: 'defense', maxClass: 'B', weakTo: 'fire' },
  'stone shuriken': { type: 'ninjutsu', subtype: 'attack', maxClass: 'C', sr: false, bleed: 0.10, weakTo: 'fire' },
  'wind scythe': { type: 'ninjutsu', subtype: 'attack', maxClass: 'C', sr: false, bleed: 0.10, weakTo: 'fire' },
  'wind devastation': { type: 'ninjutsu', subtype: 'attack', maxClass: 'C', sr: false, bleed: 0.10, weakTo: 'fire' },
  'phoenix flower': { type: 'ninjutsu', subtype: 'attack', maxClass: 'C', sr: false, burn: 0.10, weakTo: 'water' },
  'poison mist': { type: 'ninjutsu', subtype: 'attack', maxClass: 'B', sr: false, poison: true, weakTo: 'wind' },
  'flying thunder god': { type: 'ninjutsu', subtype: 'balanced', maxClass: 'S', instinct: true },
  'sexy jutsu': { type: 'ninjutsu', subtype: 'attack', maxClass: 'E', stunAll: true, oncePerMatch: true },
  'double rashumon': { type: 'ninjutsu', subtype: 'defense', maxClass: 'B' },
  'triple rashumon': { type: 'ninjutsu', subtype: 'defense', maxClass: 'A' },
  'quintriple rashumon': { type: 'ninjutsu', subtype: 'defense', maxClass: 'A' },
  'rock shelter': { type: 'ninjutsu', subtype: 'defense', maxClass: 'C' },
  // GENJUTSU
  'genjutsu': { type: 'genjutsu', subtype: 'illusion', breaksWithKai: true },
  'kotoamatsukami': { type: 'genjutsu', subtype: 'illusion', maxClass: 'SSS', kkgType: true },
  'tsukuyomi': { type: 'genjutsu', subtype: 'illusion', maxClass: 'SSS', kkgType: true },
  'izanami': { type: 'genjutsu', subtype: 'illusion', maxClass: 'SSS', kkgType: true },
  'mist servant': { type: 'genjutsu', subtype: 'illusion', maxClass: 'D' },
  'bringer of darkness': { type: 'genjutsu', subtype: 'illusion', maxClass: 'A', disablesAttack: true },
  'tree bind': { type: 'genjutsu', subtype: 'illusion', maxClass: 'B', stun: true },
  'hell viewing': { type: 'genjutsu', subtype: 'illusion', maxClass: 'D', hpDrain: 0.10 },
  'temple of nirvana': { type: 'genjutsu', subtype: 'illusion', maxClass: 'A', sleep: true },
  'mirror heaven': { type: 'genjutsu', subtype: 'kai', reflects: true, oncePerMatch: true },
  'sly mind': { type: 'genjutsu', subtype: 'illusion', maxClass: 'C' },
  'false surroundings': { type: 'genjutsu', subtype: 'illusion', maxClass: 'C', blindsCards: true },
  'reality is cruel': { type: 'skill', subtype: 'mech', swapsHP: true, genjutsuImmune: true, oncePerMatch: true },
  // BONUS SKILLS
  'negate': { type: 'skill', subtype: 'bonus', invalidates: 'utility', fa: 1 },
  'erase': { type: 'skill', subtype: 'bonus', removesCard: true, oncePerMatch: true },
  'bargain lord': { type: 'skill', subtype: 'pure', destroysCards: true, oncePerMatch: true },
  'king of luck': { type: 'skill', subtype: 'mech', overturns: true, fa: 3 },
  'adrenaline': { type: 'skill', subtype: 'mech', blocksHP: true, oncePerMatch: true },
  'bulletproof': { type: 'skill', subtype: 'bonus', invalidatesDmg: true },
  'merciful': { type: 'skill', subtype: 'pure', halvesIncoming: true },
  'merciless': { type: 'skill', subtype: 'pure', doublesDmg: true },
  'calculator': { type: 'skill', subtype: 'pure', doubleOrHalve: true },
  'willpower': { type: 'skill', subtype: 'pure', recoversOnDmg: true },
  'luck master': { type: 'skill', subtype: 'pure', winsSpeedTest: true },
  'reflex': { type: 'skill', subtype: 'pure', autoWinDefense: true },
  'switch clap': { type: 'skill', subtype: 'mech', redirectsDmg: true },
  'survivor': { type: 'skill', subtype: 'mech', heals: 0.50, oncePerMatch: true },
  'survivor perfect': { type: 'skill', subtype: 'mech', heals: 1.00, oncePerMatch: true },
  'time': { type: 'skill', subtype: 'mech', invalidatesTurn: true, oncePerMatch: true },
  'swordsman': { type: 'skill', subtype: 'mech', ko: true, oncePerMatch: true },
  'rage burst': { type: 'skill', subtype: 'special', ampsByClass: 2, genjutsuImmune: true, oncePerMatch: true },
  'heightened sense': { type: 'skill', subtype: 'bonus', autoBreaksGenjutsu: true },
  'old flame': { type: 'skill', subtype: 'bonus', reversesHP: true },
  // SAGE MODE
  'sage mode': { type: 'activation', subtype: 'sage', zClass: true, noRestPerTurn: true },
  'ems': { type: 'activation', subtype: 'kkg', boosts: true },
  'ems activate': { type: 'activation', subtype: 'kkg', boosts: true },
  'activate ems': { type: 'activation', subtype: 'kkg', boosts: true },
};

// ── HELPERS ───────────────────────────────────────────────────
function classIndex(cls) { return CLASS_ORDER.indexOf(cls ?? 'E'); }

function clamp(val, min = 0, max = 100) { return Math.max(min, Math.min(max, val)); }

function randomNumbers(count, min, max) {
  const nums = [];
  while (nums.length < count) {
    const n = Math.floor(Math.random() * (max - min + 1)) + min;
    if (!nums.includes(n)) nums.push(n);
  }
  return nums;
}

function coinToss() { return Math.random() < 0.5 ? 'HEADS' : 'TAILS'; }
function rollDice(sides = 6) { return Math.floor(Math.random() * sides) + 1; }

// Match move name to MOVE_DB
function lookupMove(name = '') {
  const lower = name.toLowerCase().trim();
  for (const [key, data] of Object.entries(MOVE_DB)) {
    if (lower.includes(key)) return { key, ...data };
  }
  return null;
}

// Detect class from a string like "SSS3", "S1", "A rank 2", "B class"
function extractClass(text = '') {
  const patterns = [
    /\b(SSS|SS|S|A|B|C|D|E)\s*(?:rank|class)?\s*\d*/i,
    /\b(Z)\s*(?:rank|class)?\s*\d*/i,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      const cls = m[1].toUpperCase();
      if (CLASS_ORDER.includes(cls)) return cls;
    }
  }
  return null;
}

// Extract rank number from "SSS3" → 3, "S rank 2" → 2
function extractRank(text = '') {
  const m = text.match(/(?:SSS|SS|S|A|B|C|D|E|Z)\s*(?:rank\s*)?(\d+)/i);
  return m ? parseInt(m[1]) : 1;
}

// Parse a full multi-move submission into individual sub-moves
function parseSubmission(actionText = '', cardsUsed = []) {
  const lines = actionText.split('\n').map(l => l.trim()).filter(Boolean);
  const moves = [];

  for (const line of lines) {
    // Skip pure activation lines as separate move entries but record them
    const activation = /^activate\s+(.+)/i.exec(line);
    if (activation) {
      moves.push({ raw: line, moveType: 'activation', name: activation[1].trim(), cls: null });
      continue;
    }
    const cls = extractClass(line);
    const rank = extractRank(line);
    const moveInfo = lookupMove(line);
    moves.push({
      raw: line,
      moveType: moveInfo?.subtype || 'attack',
      name: line,
      cls: cls || moveInfo?.maxClass || 'D',
      rank,
      meta: moveInfo
    });
  }

  // Also add cards used that weren't in text
  for (const card of cardsUsed) {
    const alreadyMentioned = moves.some(m => m.name.toLowerCase().includes((card.name || '').toLowerCase()));
    if (!alreadyMentioned) {
      moves.push({
        raw: card.name,
        moveType: 'card',
        name: card.name,
        cls: card.class || 'D',
        rank: 1,
        meta: lookupMove(card.name)
      });
    }
  }

  return moves;
}

// ── FA CHAIN RESOLVER ─────────────────────────────────────────
// FA = "follow-up action". 2FA = counter to a counter, 3FA = counter to a 2FA.
// The battle log tracks the pending FA chain. Each entry: { player, action, faLevel }
// Rules:
//   1FA  = first response to an attack
//   2FA  = counter to the 1FA (e.g. Negate on Erase)
//   3FA  = counter to 2FA (e.g. King of Luck beats a double Negate chain)
//   KoL (King of Luck) is a 3FA — it can overturn any situation
//   Negate invalidates utility skills (1 or 2FA)
//   Erase removes a card — can be responded to with Bargain Lord or Negate
//   Bargain Lord destroys 2 of opponent's cards to destroy 1 — 1FA
//   Reality is Cruel switches HP — utility, can be negated

function resolveFAChain(chain = []) {
  // chain = [{player, action, faLevel}, ...]
  // Returns verdict string
  if (chain.length === 0) return '';

  const last = chain[chain.length - 1];
  const secondLast = chain.length >= 2 ? chain[chain.length - 2] : null;

  // King of Luck at any level overturns — it's a 3FA trump
  if (last.action.toLowerCase().includes('king of luck') || last.action.toLowerCase().includes('kol')) {
    return `👑 KING OF LUCK (3FA) — ${last.player}'s situation is overturned. The previous counter/action against them is INVALIDATED.`;
  }

  // Negate chain resolution
  const negates = chain.filter(c => c.action.toLowerCase().includes('negate'));
  if (negates.length === 2) {
    // Double negate — both cancel each other, original move stands
    return `⚡ DOUBLE NEGATE — Both negates cancel out. The original move (${chain[0].action}) PROCEEDS normally.`;
  }
  if (negates.length === 1 && chain.length >= 2) {
    return `❌ NEGATE — ${last.player}'s ${secondLast?.action || 'move'} is INVALIDATED.`;
  }

  return `✅ FA CHAIN RESOLVED — ${last.player}'s ${last.action} is the final counter.`;
}

// ── DAMAGE CALCULATOR ─────────────────────────────────────────
function calcDamage(cls, rank = 1, modifiers = {}) {
  let baseDmg = HIT_VALUES[cls] || 10;

  // Rank modifiers (SSS3 = SSS base × 3, etc.)
  // NB4: SR=1, LR=class, Armor LR=class×class, Prime LR=class×class×class
  const { isLR = false, isArmor = false, isPrime = false } = modifiers;
  let multiplier = 1;
  if (isPrime && isLR) multiplier = classIndex(cls) + 1; // prime LR = class³ approx
  else if (isArmor && isLR) multiplier = Math.pow(classIndex(cls) + 1, 0.7); // armor LR ≈ class×class
  else if (isLR) multiplier = rank; // LR = class × rank number
  // SR = 1 (no multiplier)

  let dmg = Math.round(baseDmg * multiplier);

  // After-effects
  const afterDmg = Math.round(baseDmg * (modifiers.bleed || modifiers.burn || modifiers.linger || 0));

  return { dmg, afterDmg, afterType: modifiers.bleed ? 'bleed' : modifiers.burn ? 'burn' : modifiers.linger ? 'linger' : null };
}

// ── BOARD STATE TEMPLATE ──────────────────────────────────────
function buildBoardTemplate(battle, p1Name, p2Name) {
  const p1HP = battle.player1HP ?? 100;
  const p2HP = battle.player2HP ?? 100;

  const fmtList = (arr) => arr && arr.length > 0 ? arr.join(', ') : 'None';

  const p1State = battle.boardState?.player1 || {};
  const p2State = battle.boardState?.player2 || {};

  return `
╔══════════════════════════════╗
         ⚔️ BATTLE BOARD ⚔️
╚══════════════════════════════╝

*NIN_A* — ${p1Name}
*HP:* ${p1HP}/100
*Activated:* ${fmtList(p1State.activated)}
*Effects:* ${fmtList(p1State.effects)}
*Clones:* ${p1State.clones || 'None'}
*Summonings:* ${fmtList(p1State.summonings)}
*Traps:* ${fmtList(p1State.traps)}

       Vs

*NIN_B* — ${p2Name}
*HP:* ${p2HP}/100
*Activated:* ${fmtList(p2State.activated)}
*Effects:* ${fmtList(p2State.effects)}
*Clones:* ${p2State.clones || 'None'}
*Summonings:* ${fmtList(p2State.summonings)}
*Traps:* ${fmtList(p2State.traps)}

Turn ${battle.currentTurn} | Phase: ${(battle.phase || 'attack').toUpperCase()}
`.trim();
}

// ── MAIN MODERATION FUNCTION ──────────────────────────────────
const moderateTurn = async (battle, playerAction, actingPlayer, opposingPlayer) => {
  const turn = battle.currentTurn || 1;
  const phase = battle.phase || 'attack';
  const p1HP = battle.player1HP ?? 100;
  const p2HP = battle.player2HP ?? 100;
  const isP1Acting = actingPlayer._id.toString() === battle.player1.toString();
  const actingHP   = isP1Acting ? p1HP : p2HP;
  const opposingHP = isP1Acting ? p2HP : p1HP;

  // Parse the full submission
  const lastTurn   = battle.turns?.slice(-1)[0] || {};
  const cardsUsed  = lastTurn.cardsUsed || [];
  const subMoves   = parseSubmission(playerAction, cardsUsed);

  let newP1HP = p1HP;
  let newP2HP = p2HP;
  const lines = [];
  const boardUpdates = { actingPlayer: {}, opposingPlayer: {} };

  // ── TRAP TURNS (Turn 1 & 2) ───────────────────────────────
  if (turn <= 2 && phase === 'attack') {
    lines.push(`🪤 TRAP TURN ${turn} — ${actingPlayer.characterName} is setting traps.`);
    lines.push(`Traps are hidden. Max 3 traps active at once. Time limit applies.`);
    lines.push(``);
    lines.push(buildBoardTemplate(battle, battle.player1Name || 'P1', battle.player2Name || 'P2'));
    lines.push(`[NEXT ACTION] ${opposingPlayer.characterName} — set your traps.`);
    return lines.join('\n');
  }

  // ── FA CHAIN CHECK ────────────────────────────────────────
  // If this action contains negate / king of luck / bargain lord — it's a FA response
  const faKeywords = ['negate', 'king of luck', 'kol', 'bargain lord', 'erase', 'adrenaline', 'bulletproof'];
  const isFAResponse = faKeywords.some(kw => playerAction.toLowerCase().includes(kw));

  if (isFAResponse) {
    const chain = battle.faChain || [];
    chain.push({ player: actingPlayer.characterName, action: playerAction.trim(), faLevel: chain.length + 1 });
    const faVerdict = resolveFAChain(chain);
    lines.push(`⚡ ${chain.length}FA — ${actingPlayer.characterName}: "${playerAction.trim()}"`);
    lines.push(``);
    lines.push(faVerdict);
    lines.push(``);
    lines.push(`[HP UPDATE] P1: ${newP1HP} | P2: ${newP2HP}`);
    lines.push(buildBoardTemplate({ ...battle, player1HP: newP1HP, player2HP: newP2HP }, battle.player1Name || 'P1', battle.player2Name || 'P2'));
    lines.push(`[NEXT ACTION] Awaiting ${opposingPlayer.characterName} response OR MOD to proceed.`);
    return lines.join('\n');
  }

  // ── NUMBERED MOVE RESOLUTION ──────────────────────────────
  // Like Flames does: number each sub-move and resolve
  lines.push(`📋 MOVE BREAKDOWN — ${actingPlayer.characterName} (Turn ${turn}):`);
  lines.push(``);

  let moveNumber = 0;
  let totalDmgDealt = 0;
  const activations = [];
  const attackMoves = [];

  for (const move of subMoves) {
    if (move.moveType === 'activation') {
      activations.push(move.name);
      lines.push(`✅ ${move.name} — ACTIVATED. Board updated.`);
      continue;
    }

    moveNumber++;
    const meta = move.meta;
    const cls  = move.cls || 'D';
    const rank = move.rank || 1;

    // Detect LR
    const isLR = meta ? !meta.sr : playerAction.toLowerCase().includes('long range');
    const { dmg, afterDmg, afterType } = calcDamage(cls, rank, {
      isLR,
      bleed: meta?.bleed,
      burn:  meta?.burn,
      linger: meta?.linger
    });

    attackMoves.push({ number: moveNumber, name: move.name, cls, rank, dmg, afterDmg, afterType, meta });

    let moveDesc = `${moveNumber}) ${move.name} [${cls} class${rank > 1 ? ` rank ${rank}` : ''}]`;
    moveDesc += ` — ${isLR ? 'Long Range' : 'Short Range'}, ${dmg} dmg potential`;
    if (afterDmg > 0 && afterType) moveDesc += ` + ${afterDmg} after-dmg (${afterType})`;

    // Special flags
    if (meta?.invisible) moveDesc += ` ⚠️ INVISIBLE (evade & melee-counter disabled)`;
    if (meta?.stunAll)   moveDesc += ` ⚠️ STUN ALL (1 turn) unless in deck`;
    if (meta?.stun)      moveDesc += ` ⚠️ STUN on hit`;
    if (meta?.kkgType)   moveDesc += ` ⚠️ KKG Genjutsu — cannot be reflected by Mirror Heaven`;
    if (meta?.cloning)   lines.push(`   ↳ Clones active — indicate how many and which moves each clone plays`);

    lines.push(moveDesc);
  }

  lines.push(``);

  // ── RESPONSE PHASE ────────────────────────────────────────
  if (phase === 'response') {
    // Get last attack from turns for context
    const lastAttackEntry = battle.turns?.slice(-1)[0];
    const lastAttackText  = lastAttackEntry?.action || '';
    const lastAttackCls   = extractClass(lastAttackText) || 'D';
    const lastAttackHit   = HIT_VALUES[lastAttackCls] || 20;

    // Check if this is a defense
    const defenseKws = ['block', 'defend', 'evade', 'dodge', 'counter', 'rashumon', 'shield', 'gale shield', 'rock shelter', 'earth dome', 'water mirror'];
    const isDefense = defenseKws.some(kw => playerAction.toLowerCase().includes(kw));

    if (isDefense) {
      const defCls = attackMoves[0]?.cls || extractClass(playerAction) || 'D';
      const cmpResult = classIndex(defCls) - classIndex(lastAttackCls);

      if (cmpResult === 0) {
        // Total counter
        lines.push(`🛡️ TOTAL COUNTER — ${actingPlayer.characterName}'s ${defCls}-class defense perfectly matches the ${lastAttackCls}-class attack.`);
        lines.push(`No damage dealt. Turn advances.`);
      } else if (cmpResult > 0) {
        // Over-defense — counter damage
        const counterDmg = Math.round(lastAttackHit * 0.5);
        if (isP1Acting) newP2HP = clamp(opposingHP - counterDmg);
        else newP1HP = clamp(opposingHP - counterDmg);
        totalDmgDealt = counterDmg;
        lines.push(`💥 OVER-DEFENSE — ${actingPlayer.characterName}'s defense exceeds the attack. Counter-blow: ${counterDmg} dmg to ${opposingPlayer.characterName}!`);
      } else {
        // Under-defense — partial damage
        const diff = classIndex(lastAttackCls) - classIndex(defCls);
        const partialDmg = Math.round(lastAttackHit * (0.3 + diff * 0.1));
        if (isP1Acting) newP2HP = clamp(actingHP - partialDmg);
        else newP1HP = clamp(actingHP - partialDmg);
        totalDmgDealt = partialDmg;
        lines.push(`💢 PARTIAL BLOCK — ${actingPlayer.characterName}'s ${defCls}-class defense is outclassed by ${lastAttackCls}. ${partialDmg} dmg taken!`);
      }

      // 2FA prompt if attack has special properties
      const lastMeta = lookupMove(lastAttackText);
      if (lastMeta?.fa || lastMeta?.instinct || lastAttackText.toLowerCase().includes('negate')) {
        lines.push(`⚡ 2FA WINDOW — ${opposingPlayer.characterName} may respond with a counter skill.`);
        lines.push(`Time: 5 mins.`);
      }

    } else if (attackMoves.length > 0) {
      // Counter-attack — speed game
      const nums = randomNumbers(3, 1, 10);
      const atkMove = attackMoves[0];
      lines.push(`⚡ ATTACK-COUNTER — ${actingPlayer.characterName} fires back with ${atkMove.name} [${atkMove.cls}]!`);
      lines.push(`Both moves CLASH — SPEED GAME initiated!`);
      lines.push(``);
      lines.push(`Numbers: [${nums.join(', ')}]`);
      lines.push(`${actingPlayer.characterName} picks first. Highest number wins.`);
      lines.push(`Winner's move deals full damage. Loser takes damage.`);
    } else {
      // Hit taken — no response submitted
      const dmg = lastAttackHit;
      if (isP1Acting) newP1HP = clamp(actingHP - dmg);
      else newP2HP = clamp(actingHP - dmg);
      totalDmgDealt = dmg;
      lines.push(`💥 HIT CONFIRMED — ${actingPlayer.characterName} takes ${dmg} dmg from the ${lastAttackCls}-class attack!`);
    }

  } else {
    // ── ATTACK PHASE ────────────────────────────────────────
    if (attackMoves.length > 0) {
      lines.push(`⚔️ ${actingPlayer.characterName} commits to ${attackMoves.length} move(s).`);
      lines.push(``);
      lines.push(`${opposingPlayer.characterName} — RESPONSE PHASE. You have 10 mins.`);
      lines.push(`You may: defend, counter-attack, evade, use genjutsu kai, or take the hit.`);
      lines.push(`If you want a SUMMARY of the attack, your response time drops to 5 mins.`);

      // 2FA prompt for moves that allow it
      const hasFAMove = attackMoves.some(m => m.meta?.fa || m.meta?.instinct || m.meta?.oncePerMatch);
      if (hasFAMove) {
        lines.push(``);
        lines.push(`⚡ 2FA ENABLED — one or more moves allow a follow-up counter. ${actingPlayer.characterName} may respond after ${opposingPlayer.characterName}'s action.`);
        lines.push(`Time for 2FA: 5 mins.`);
      }

      // Genjutsu note
      const hasGenjutsu = subMoves.some(m => m.meta?.type === 'genjutsu' || m.name.toLowerCase().includes('genjutsu'));
      if (hasGenjutsu) {
        const gCls = attackMoves.find(m => m.meta?.type === 'genjutsu')?.cls || 'D';
        lines.push(``);
        lines.push(`🌀 GENJUTSU ACTIVE — Takes 1 turn to activate. ${opposingPlayer.characterName} may use Genjutsu Kai [${gCls} class or higher] to break out, OR take the hit next turn.`);
        if (subMoves.some(m => m.meta?.kkgType)) {
          lines.push(`⚠️ KKG Genjutsu (${subMoves.find(m => m.meta?.kkgType)?.name}) — Mirror Heaven CANNOT reflect this.`);
        }
      }
    }
  }

  // ── HP UPDATE ────────────────────────────────────────────
  lines.push(``);
  lines.push(`[HP UPDATE] P1: ${newP1HP} | P2: ${newP2HP}`);
  if (totalDmgDealt > 0) {
    // Check for after-effects
    const afterEffects = attackMoves.filter(m => m.afterDmg > 0);
    if (afterEffects.length > 0) {
      afterEffects.forEach(m => {
        lines.push(`⚠️ AFTER-EFFECT (${m.afterType}): ${m.afterDmg} dmg applies next turn from ${m.name}`);
      });
    }
  }

  // ── WIN CHECK ────────────────────────────────────────────
  if (newP1HP <= 0 || newP2HP <= 0) {
    const winner = newP1HP > 0 ? battle.player1Name : battle.player2Name;
    lines.push(``);
    lines.push(`🏁 KNOCKOUT — ${winner} WINS!`);
  }

  // ── BOARD TEMPLATE ───────────────────────────────────────
  lines.push(``);
  lines.push(buildBoardTemplate(
    { ...battle, player1HP: newP1HP, player2HP: newP2HP },
    battle.player1Name || 'P1',
    battle.player2Name || 'P2'
  ));

  return lines.join('\n');
};

// ── RULES Q&A ─────────────────────────────────────────────────
const getAIRuling = async (question, battleState) => {
  const q = question.toLowerCase();

  if (q.includes('fa') || q.includes('2fa') || q.includes('3fa') || q.includes('counter chain') || q.includes('negate') || q.includes('king of luck')) {
    return `[MOD RULING] FA CHAINS:
• 1FA = first response/counter to an attack.
• 2FA = a counter to the 1FA. E.g. if opponent uses Erase (1FA), you can Negate it (2FA). Time: 5 mins.
• 3FA = a counter to the 2FA. King of Luck (KoL) is a 3FA trump — it overturns ANY bad situation once activated.
• Negate vs Negate = Double Negate → both cancel, original move stands.
• Bargain Lord = 1FA utility (destroys 2 cards to remove 1 opponent card). Can be Negated.
• Erase = 1FA bonus skill (removes a guessed card). Can be Negated.
• KoL = 3FA mech skill. Overturns the situation. Cannot be followed by another FA.`;
  }
  if (q.includes('be') || q.includes('basic essential')) {
    return `[MOD RULING] B.E. (Basic Essentials): Punch, Kick, Block, Slash, Throw, Evade, Genjutsu Kai.
Usage limits: Genin(3), Chunin(4), Jounin(5), Kage(6), Sage(7), God(8). After limit, rest 3 turns.
Evade base: D rank, max S rank. Genjutsu Kai base: D rank, max S rank.
Punch/Kick/Block base: E rank, max A rank (S+ needs Sage/Gates/Jinchuriki mode).`;
  }
  if (q.includes('clone') || q.includes('shadow clone')) {
    return `[MOD RULING] CLONES:
• Shadow Clone = forbidden ninjutsu B class limit. Clones can use ALL user moves. Distinguish by Byakugan only.
• Cloning Jutsu = C class limit. Clones limited to 1 element of the user.
• Clone number set by trial/rank-up process.
• Each clone playing the same attack = 1 evade needed (collaborative evade). If you counter, you face full brunt of all clones combined.
• Mod needs: total clone count + which clone numbers played which moves (via DM).`;
  }
  if (q.includes('genjutsu') || q.includes('illusion') || q.includes('kai')) {
    return `[MOD RULING] GENJUTSU:
• Takes 1 turn to activate. Opponent must use Genjutsu Kai of equal or higher class to break out, OR take the hit.
• KKG Genjutsu (Kotoamatsukami, Tsukuyomi, Izanami, etc.) CANNOT be reflected by Mirror Heaven.
• Clones must also break out unless the owner is not under it.
• Genjutsu Kai is a Basic Essential (BE). Base D rank, max S rank.
• Same class genjutsu vs same class genjutsu = does not work on user.`;
  }
  if (q.includes('trap') || q.includes('traps')) {
    return `[MOD RULING] TRAPS:
• Turn 1 and Turn 2: both players set traps.
• Max 3 traps active simultaneously.
• Traps can only be changed on your next turn.
• Trap activates when opponent performs the guessed action at same rank or higher.
• Shadow Clone in trap mode = substitution (stuns close range, turns off evade long range).`;
  }
  if (q.includes('damage') || q.includes('hit value') || q.includes('hp')) {
    return `[MOD RULING] HIT VALUES: E=10, D=20, C=30, B=40, A=50, S=60, SS=70, SSS=80, Z=90.
Ranges: SR=1, LR=class×rank, Armor LR=class×class, Prime LR=class×class×class.
Against Armor/Prime beings: S=10, SS=20, SSS=30 (below S = no effect).
After-effects: Bleed/Burn/Linger = % of base damage applied next turn.`;
  }
  if (q.includes('sage mode') || q.includes('sage')) {
    return `[MOD RULING] SAGE MODE:
• Z class (1 above SSS). No rest time on any move while charges last.
• Charges: 2–4 (determined by guess quiz at unlock).
• Cannot be reactivated after charges are spent.
• User is NOT immune to Genjutsu in Sage Mode.
• Sage Mode moves cannot be affected by boost skills, but CAN be affected by other skill types.`;
  }
  if (q.includes('speed') || q.includes('speed game') || q.includes('speed test')) {
    return `[MOD RULING] SPEED GAME:
• Triggered on attack-counter clash (both players attack in same window).
• Mod generates 3 numbers (e.g. [2, 5, 9]). Both players pick a number privately.
• Highest number wins → winner's move deals full damage. Loser takes damage.
• STALEMATE (equal jutsu): wrong picker takes 10% damage. Luck-Master skill = auto-win.`;
  }
  if (q.includes('weapon') || q.includes('durability')) {
    return `[MOD RULING] WEAPON DURABILITY: D=4 uses, C=6, B=8, A=10, S=unbreakable.
Weapon bag reset: roll dice → number shown = weapons reclaimed.
Legendary weapons (Kyodai Sensu, Samehada, Kiba, etc.) are S class (unbreakable).`;
  }
  if (q.includes('cooldown') || q.includes('rest')) {
    return `[MOD RULING] COOLDOWNS: Apply when move class meets/exceeds your rank threshold.
Rookie=E, Genin=D, Chunin=C, Jounin=B, Kage=A, Sage=S, God=SS.
Sage Mode: no rest while charges active. After charges gone, cooldowns resume.`;
  }
  if (q.includes('sexy jutsu')) {
    return `[MOD RULING] SEXY JUTSU: E class, stuns all opponents 1 turn. Deals E class hit.
If opponent has this move in their deck, they are NOT stunned.
One-time use per match. 2FA opportunity applies after response.`;
  }
  if (q.includes('erase')) {
    return `[MOD RULING] ERASE (Bonus Skill): Removes a card from opponent's deck (guess required).
One-time use. Can be Negated (2FA). If guess is wrong, still used up.`;
  }
  if (q.includes('bargain lord')) {
    return `[MOD RULING] BARGAIN LORD (Pure Skill): Destroys 2 of your own deck cards to destroy 1 opponent deck card.
One-time use. Can be Negated. Can be played as a 2FA response to opponent's Bargain Lord.
NB: Must be in your trap for it to activate on opponent's Bargain Lord.`;
  }
  if (q.includes('reality is cruel')) {
    return `[MOD RULING] REALITY IS CRUEL (Mech Skill): Switches HP with opponent. Also grants Genjutsu immunity until hit.
One-time use. Can be Negated (utility). HP switch is immediate.`;
  }
  if (q.includes('king of luck') || q.includes('kol')) {
    return `[MOD RULING] KING OF LUCK (Mech Skill): 3FA trump card. Once used in a bad situation, it overturns it.
One-time use. Class counts as the move that went wrong. Cannot be countered further.`;
  }

  return `[MOD RULING] Rule not found in quick-reference. Turn ${battleState?.currentTurn || '?'}, Phase: ${battleState?.phase || '?'}. Refer to the full UNC 6.0 rulebook.`;
};

// ── SPIN / COIN / DICE ────────────────────────────────────────
const generateSpinResult = async (spinType, player) => {
  if (spinType === 'compatibility') {
    const result = coinToss();
    return `🪙 COIN TOSS — ${result}!\n${result === 'HEADS' ? '✅ COMPATIBLE — Move approved!' : '❌ INCOMPATIBLE — Move cannot be used this turn.'}`;
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
    return `🎲 MOMENTUM DICE — ${player.characterName} rolled [${roll}]!\n${effects[roll]}`;
  }
  if (spinType === 'stalemate') {
    const nums = randomNumbers(3, 1, 10);
    return `⚡ STALEMATE NUMBERS: [${nums.join(', ')}]\nBoth players pick a number. Wrong picker takes 10% damage of the move class.`;
  }
  if (spinType === 'speedGame') {
    const nums = randomNumbers(3, 1, 10);
    return `⚡ SPEED GAME: [${nums.join(', ')}]\nBoth players pick a number privately. Highest wins — winner's move deals full damage.`;
  }
  if (spinType === 'weaponBagReset') {
    const roll = rollDice(6);
    return `🎲 WEAPON BAG RESET — ${player.characterName} rolled [${roll}]. ${roll} weapon(s) reclaimed to hand.`;
  }
  const result = coinToss();
  return `🪙 COIN TOSS — ${result}!`;
};

module.exports = { moderateTurn, getAIRuling, generateSpinResult, buildBoardTemplate, parseSubmission, resolveFAChain };
