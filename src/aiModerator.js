// ============================================================
// UNC 6.0 AI MODERATOR — Complete Rules Engine
// Every move, skill, genjutsu and 2FA outcome coded explicitly
// ============================================================

const CLASS_ORDER = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'Z'];
const HIT_VALUES  = { E: 10, D: 20, C: 30, B: 40, A: 50, S: 60, SS: 70, SSS: 80, Z: 90 };

// ── MOVE DATABASE ─────────────────────────────────────────────
// Full details from UNC 6.0 rulebook
const MOVE_DB = {

  // ══ NINJUTSU ══════════════════════════════════════════════

  'animal cloning substitution': {
    type: 'ninjutsu', subtype: 'trap', maxClass: 'E',
    trapOnly: true, oncePerMatch: true,
    effect: 'substitution', stunOnSR: true, evadeOffOnLR: true,
    note: 'Only works with animal summoning. Trap mode only. Stuns SR, turns off evade LR.'
  },
  'burning ash explosion': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'B',
    attack: { base: 'B', rank: 2, range: 'LR' },
    burn: 0.10, twoStep: true,
    weakTo: ['water'], reducedBy: ['wind', 'fire'],
    note: '2-step jutsu. After use as counter, engulfs in gunpowder trap — target cannot evade once triggered.'
  },
  'chidori': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'A',
    attack: { base: 'A', rank: 4, range: 'SR' },
    weakTo: [], note: 'Packs a punch — no elemental reduction.'
  },
  'chidori nagashi': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'A',
    attack: { base: 'A', rank: 4, range: 'LR' },
    generates: { name: 'senbon', base: 5, perClass: 1 },
    weakTo: ['earth'],
    note: 'Generates 5 senbon. Each class increase adds 1 senbon. Reduced by earth jutsu.'
  },
  'cloning jutsu': {
    type: 'ninjutsu', subtype: 'balanced', maxClass: 'C',
    cloning: true, elementLimited: true,
    trapMode: true, stunOnSR: true, evadeOffOnLR: true,
    note: 'Clones limited to one element. Trap mode: substitution stuns SR, evade off LR.'
  },
  'double rashumon': {
    type: 'ninjutsu', subtype: 'defense', maxClass: 'B',
    defense: { base: 'B', rank: 2 },
    evadeOffIfBlockLR: true, stunIfBlockSR: true,
    partialBlockDiff: 2, partialBlockEffect: 'halve',
    validTrap2FA: true,
    note: 'Blocks diff up to 2 classes — incoming halved, user takes rest.'
  },
  'dragon flame bomb': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'C',
    attack: { base: 'C', rank: 2, range: 'LR' },
    burn: 0.10, linkedTo: 'kirin',
    weakTo: ['water'],
    note: 'Linked to Kirin. Class of DFB boosts Kirin rank. Must detonate to link.'
  },
  'earth dome': {
    type: 'ninjutsu', subtype: 'trap', maxClass: 'B',
    defense: { base: 'B', rank: 2 },
    trapSRCapture: true, captureHpPercent: 0.10,
    breakClass: 1, // 1 class higher to break
    validTrap2FA: true,
    note: 'SR attackers trapped inside. Lose 10% of move class HP. Break with 1 class higher jutsu.'
  },
  'earth spear': {
    type: 'ninjutsu', subtype: 'balanced', maxClass: 'B',
    attack: { base: 'A', rank: 2, range: 'SR' },
    armor: true, extraDmgMelee: 0.10,
    note: 'Armor + shield. Deals 10% extra on melee attacks and defense.'
  },
  'elemental rasenshuriken': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'S',
    attack: { base: 'S', rank: 3, range: 'SR' }, // LR with sage
    linger: 0.15, requiresSageForLR: true,
    backlash: 0.10, // without sage
    lockNinjutsuTurns: 3, lockUserNinjutsuTurns: 1,
    note: 'Without sage: SR, locks opponent ninjutsu 3 turns, user ninjutsu 1 turn, 10% backlash. With sage: LR, no backlash.'
  },
  'fire ball jutsu': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'C',
    attack: { base: 'C', rank: 2, range: 'LR' },
    burn: 0.10, weakTo: ['water'],
    note: 'Burn effect. Reduced by water.'
  },
  'fireball jutsu': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'C',
    attack: { base: 'C', rank: 2, range: 'LR' },
    burn: 0.10, weakTo: ['water'],
    note: 'Burn effect. Reduced by water.'
  },
  'fire storm': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'S',
    attack: { base: 'S', rank: 2, range: 'LR' },
    bleed: 0.10, burn: 0.10, // 15% total after damage
    note: 'Both bleed and burn — 15% total after damage. CANNOT be negated (direct attack).'
  },
  'flying thunder god': {
    type: 'ninjutsu', subtype: 'balanced', maxClass: 'S',
    instinct: true, teleport: true,
    attack: { base: 'S', rank: 2 },
    defense: { base: 'S', rank: 1 },
    note: 'Teleports user or moves at speed. Kunai marking required. All FTG moves use its rank.'
  },
  'gale palm': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'C',
    attack: { base: 'C', rank: 1, range: 'LR' },
    weaponBoost: true, // adds 3 ranks at C, 4 at B, etc
    weakTo: ['earth'],
    note: 'Boosts weapon throws. Rank boost: C=+3, B=+4, A=+5, S/SS/SSS=+6/7/8.'
  },
  'gale shield': {
    type: 'ninjutsu', subtype: 'defense', maxClass: 'B',
    defense: { base: 'B', rank: 2 },
    evadeOffIfBlockLR: true, stunIfBlockSR: true,
    weakTo: ['fire'], validTrap2FA: true,
    note: 'Evade off if blocks LR totally, stun if blocks SR. Reduced by fire.'
  },
  'hidden mist': {
    type: 'ninjutsu', subtype: 'balanced', maxClass: 'D',
    range: 'LR', turnsOffEvade: true, turnsOffGenjutsuSlot: true,
    blindsRanks: true, requiresIntermediary: true,
    note: 'Turns off evade and genjutsu slot unless sensory active. Blinds all ranks. Higher rank wins clash.'
  },
  'kirin': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'S',
    attack: { base: 'S', rank: 3, range: 'LR' },
    instinct: true, requiresDFB: true,
    stun: true, stunIfNotBlockedAbove: 'A',
    note: 'DFB class decides rank buff. C=+3, B=+4, A=+5, S=+6, SS=+7, SSS=+8. Stuns if not blocked to A rank.'
  },
  'lightning ball': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'C',
    attack: { base: 'C', rank: 1, range: 'LR' },
    generates: { name: 'lightning arrestor', base: 3, perClass: 1 },
    stun: true, weakTo: ['earth'],
    note: 'Generates 3 arrestors base. Stuns on hit. Reduced by earth.'
  },
  'lightning skin': {
    type: 'ninjutsu', subtype: 'balanced', maxClass: 'B',
    attack: { base: 'S', rank: 1, range: 'SR' }, // speed
    defense: { base: 'C', rank: 1 },
    instinct: true, extraDmg: 0.10,
    note: 'Instinct counter. 10% extra damage. No elemental weaknesses.'
  },
  'liquid bullet': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'C',
    attack: { base: 'C', rank: 1, range: 'LR' },
    generates: { name: 'hygrometer', base: 3, perClass: 1 },
    bleed: 0.10, weakTo: ['lightning'],
    note: 'Generates 3 hygrometers. Bleed effect. Reduced by lightning.'
  },
  'massive rasengan': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'A',
    attack: { base: 'S', rank: 1, range: 'SR' },
    requiresRasengan: true,
    note: 'Requires rasengan compatibility. No elemental reduction.'
  },
  'mud wave': {
    type: 'ninjutsu', subtype: 'balanced', maxClass: 'B',
    attack: { base: 'B', rank: 2 },
    defense: { base: 'B', rank: 1, range: 'LR' },
    stun: true, requiresGrounded: true,
    trapMode: true,
    note: 'All opponents must be grounded. Stuns caught opponents. Can be set in trap mode.'
  },
  'phoenix flower': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'C',
    attack: { base: 'C', rank: 1, range: 'LR' },
    generates: { name: 'fuel tank', base: 3, perClass: 1 },
    burn: 0.10, weakTo: ['water'],
    shurikenBoost: 2,
    note: 'Generates 3 fuel tanks. Burn effect. With shuriken: +2 throw rank.'
  },
  'poison mist': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'B',
    attack: { base: 'B', rank: 1, range: 'LR' },
    poisonOrStun: true, // user chooses
    immuneToPoison: true,
    weakTo: ['wind'],
    note: 'User chooses stun or poison damage. User immune to all poison.'
  },
  'purple lightning': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'A',
    attack: { base: 'A', rank: 5, range: 'LR' },
    noPenalty: true,
    note: 'No elemental reduction ever. Packs a punch.'
  },
  'quintriple rashumon': {
    type: 'ninjutsu', subtype: 'defense', maxClass: 'A',
    defense: { base: 'A', rank: 2 },
    evadeOffIfBlockLR: true, stunIfBlockSR: true,
    partialBlockDiff: 5, partialBlockEffect: 'halve',
    validTrap2FA: true,
    note: 'Partial block diff up to 5 classes halved. Best rashumon wall.'
  },
  'rasengan': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'A',
    attack: { base: 'A', rank: 5, range: 'SR' },
    noPenalty: true,
    note: 'No elemental reduction. Packs a punch.'
  },
  'rock shelter': {
    type: 'ninjutsu', subtype: 'defense', maxClass: 'C',
    defense: { base: 'C', rank: 2 },
    evadeOffIfBlockLR: true, stunIfBlockSR: true,
    partialBlockDiff: 1, partialBlockEffect: 'halve',
    weakTo: ['wind'], validTrap2FA: true,
    note: 'Halves damage if diff is 1 class. Weakened by wind.'
  },
  'sexy jutsu': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'E',
    attack: { base: 'E', rank: 1 }, // all ranks
    stunAll: true, oncePerMatch: true,
    immuneIfInDeck: true,
    note: 'Stuns all opponents 1 turn unless in their deck. E class damage. Once per match.'
  },
  'shadow clone': {
    type: 'ninjutsu', subtype: 'balanced', maxClass: 'B',
    cloning: true, allMovesAvailable: true,
    trapMode: true, stunOnSR: true, stunOnLR: true, // both SR and LR stun
    note: 'Clones can use all user moves. Trap mode stuns BOTH SR and LR (unlike cloning jutsu).'
  },
  'stone shuriken': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'C',
    attack: { base: 'C', rank: 2, range: 'LR' },
    bleed: 0.10, covers: { base: 3, perRank: 1 },
    weakTo: ['fire'],
    note: 'Bleed effect. Covers 3 people base, +1 per rank. Reduced by fire.'
  },
  'triple rashumon': {
    type: 'ninjutsu', subtype: 'defense', maxClass: 'A',
    defense: { base: 'A', rank: 2 },
    evadeOffIfBlockLR: true, stunIfBlockSR: true,
    partialBlockDiff: 3, partialBlockEffect: 'halve',
    validTrap2FA: true,
    note: 'Halves damage if diff up to 3 classes.'
  },
  'water dragon': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'B',
    attack: { base: 'B', rank: 2, range: 'LR' },
    bleed: 0.10, weakTo: ['lightning'],
    note: 'Bleed effect. Reduced by lightning.'
  },
  'water mirror': {
    type: 'ninjutsu', subtype: 'defense', maxClass: 'S',
    defense: { base: 'S', rank: 1 },
    reflects: true, partialBlockDiff: 5, partialBlockEffect: 'halve',
    noElementalWeakness: true, validTrap2FA: true,
    note: 'Reflects attack back with equal force. Not susceptible to any element. Halves if diff up to 5.'
  },
  'water prison': {
    type: 'ninjutsu', subtype: 'balanced', maxClass: 'C',
    range: 'SR', counterToSRCOrAfterStun: true,
    immobilize: true, deactivatesCards: true,
    hpPercent: 0.10,
    breakWith: 'body activation above move class',
    note: 'Counter to C class SR or after stun. Immobilizes + deactivates all active cards. 10% HP drain.'
  },
  'water vortex': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'A',
    attack: { base: 'A', rank: 2, range: 'LR' },
    bleed: 0.10, weakTo: ['lightning'],
    note: 'Bleed effect. Reduced by lightning.'
  },
  'wild water wave': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'C',
    attack: { base: 'C', rank: 2, range: 'LR' },
    bleed: 0.10, weakTo: ['lightning'],
    note: 'Bleed effect. Reduced by lightning.'
  },
  'wind blade': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'A',
    attack: { base: 'A', rank: 2, range: 'SR' },
    bleed: 0.10, invisible: true, weakTo: ['fire'],
    note: 'INVISIBLE — evade and melee-counter disabled. Bleed effect. Reduced by fire.'
  },
  'wind devastation': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'C',
    attack: { base: 'C', rank: 2, range: 'LR' },
    bleed: 0.10, weakTo: ['fire'],
    note: 'Bleed effect. Reduced by fire.'
  },
  'passing typhoon': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'A',
    attack: { base: 'A', rank: 4, range: 'LR' },
    environmentChange: true, weakTo: ['fire'],
    note: 'Can change environmental factors. Reduced by fire.'
  },
  'wind scythe': {
    type: 'ninjutsu', subtype: 'attack', maxClass: 'C',
    attack: { base: 'C', rank: 1, range: 'LR' },
    generates: { name: 'wind vane', base: 3, perClass: 1 },
    bleed: 0.10, weakTo: ['fire'],
    note: 'Generates 3 wind vanes. Bleed effect. Reduced by fire.'
  },

  // ══ GENJUTSU ══════════════════════════════════════════════
  // NB: Genjutsu only has illusion ranking — no separate attack/defense
  // Same class + rank genjutsu doesn't work on user
  // Stronger genjutsu wins when two clash
  // Breaks with Genjutsu Kai of equal or higher class

  'mist servant': {
    type: 'genjutsu', subtype: 'illusion', maxClass: 'D',
    illusion: { base: 'D', rank: 1 },
    requiresWaterClone: true, kunaiOnly: true,
    note: 'Dependent on water clone card. User can throw kunai/shuriken through clones (max 2).'
  },
  'bringer of darkness': {
    type: 'genjutsu', subtype: 'illusion', maxClass: 'A',
    illusion: { base: 'A', rank: 1 },
    disablesAttack: true, // defense and trap still work
    note: 'All attack moves turned off. Opponents can only defend or trap.'
  },
  'sly mind': {
    type: 'genjutsu', subtype: 'illusion', maxClass: 'C',
    illusion: { base: 'C', rank: 1 },
    loopEffect: true, directionConfusion: true,
    note: 'Opponent picks A or E for attack direction. Wrong = no damage. Ally can break.'
  },
  'tree bind': {
    type: 'genjutsu', subtype: 'illusion', maxClass: 'B',
    illusion: { base: 'B', rank: 1 },
    stun: true, disablesPhysicalMoves: true,
    note: 'Binds opponent (stun). All moves needing movement/signs disabled. Ally can break.'
  },
  'false surroundings': {
    type: 'genjutsu', subtype: 'illusion', maxClass: 'C',
    illusion: { base: 'C', rank: 1 },
    blindsCards: true,
    note: 'Blinds opponent to all cards (blurred). Ally can break.'
  },
  'mirror heaven': {
    type: 'genjutsu', subtype: 'kai', maxClass: 'SSS',
    reflects: true, oncePerMatch: true,
    cannotReflectKKG: true,
    note: 'Reverses non-KKG genjutsu back. Requires equal or higher genjutsu kai. Trap mode only.'
  },
  'hell viewing': {
    type: 'genjutsu', subtype: 'illusion', maxClass: 'D',
    illusion: { base: 'D', rank: 1 },
    hpDrainPerTurn: 0.10, // each failed breakout
    note: '10% HP drain each turn opponent fails to break out. Ally can break.'
  },
  'temple of nirvana': {
    type: 'genjutsu', subtype: 'illusion', maxClass: 'A',
    illusion: { base: 'A', rank: 1 },
    sleep: true,
    note: 'Puts opponent into deep sleep. Ally can break.'
  },
  'kotoamatsukami': {
    type: 'genjutsu', subtype: 'illusion', maxClass: 'SSS',
    illusion: { base: 'SSS', rank: 1 },
    kkgType: true, cannotBeReflected: true,
    note: 'KKG genjutsu. Cannot be reflected by Mirror Heaven.'
  },
  'tsukuyomi': {
    type: 'genjutsu', subtype: 'illusion', maxClass: 'SSS',
    illusion: { base: 'SSS', rank: 1 },
    kkgType: true, cannotBeReflected: true,
    note: 'KKG genjutsu. Cannot be reflected by Mirror Heaven.'
  },
  'izanami': {
    type: 'genjutsu', subtype: 'illusion', maxClass: 'SSS',
    illusion: { base: 'SSS', rank: 1 },
    kkgType: true, cannotBeReflected: true,
    note: 'KKG genjutsu. Cannot be reflected by Mirror Heaven.'
  },

  // ══ PURE SKILLS ═══════════════════════════════════════════

  'research sense': {
    type: 'skill', subtype: 'pure', category: 'trap',
    effect: 'guess_invalidate',
    note: 'Guess opponent move — if correct, that move is invalidated for the whole match.'
  },
  'willpower': {
    type: 'skill', subtype: 'pure', category: 'boost',
    effect: 'hp_recovery_on_hit',
    note: 'Every damage landed while active = same amount recovered as HP.'
  },
  'leadership prowess': {
    type: 'skill', subtype: 'pure', category: 'boost',
    rankBoost: 1, classBoostOnDodge: 1,
    note: '+1 rank to user move. If damage avoided: +1 class after rest.'
  },
  'falter': {
    type: 'skill', subtype: 'pure', category: 'trap',
    effect: 'next_attack_invalid_if_lands',
    note: 'If user lands attack with this in trap: opponent\'s next attack is auto-invalid.'
  },
  'money bag': {
    type: 'skill', subtype: 'pure', category: 'utility',
    oncePerMatch: true,
    effect: 'destroy_2_own_cards_get_1',
    note: 'Destroy 2 own deck cards to bring 1 card from full deck.'
  },
  'air force': {
    type: 'skill', subtype: 'pure', category: 'trap',
    effect: 'set_class_to_invalidate',
    note: 'Set a class of move to trap. If opponent plays that class: move invalidated.'
  },
  'mission complete': {
    type: 'skill', subtype: 'pure', category: 'trap',
    effect: 'double_damage_or_reflect',
    note: 'Attack mission + land = double damage. Defense mission + block = opponent takes own attack x2.'
  },
  'espionage': {
    type: 'skill', subtype: 'pure', category: 'trap',
    effect: 'hide_move_type',
    note: 'Hides move played — only attack/defense/illusion shown, not the actual move.'
  },
  'semi-worthy': {
    type: 'skill', subtype: 'pure', category: 'boost',
    effect: 'class_boost_or_reduce',
    note: 'Increase own move by a class OR reduce opponent move by a class.'
  },
  'goal-hitter': {
    type: 'skill', subtype: 'pure', category: 'trap',
    effect: 'disable_traps_on_damage_goal',
    note: 'Set damage goal. If achieved: opponent cannot use traps for a turn.'
  },
  'luck master': {
    type: 'skill', subtype: 'pure', category: 'boost',
    effect: 'auto_win_speed_test',
    note: 'Auto-wins any speed test/speed game if in trap when test occurs.'
  },
  'determination': {
    type: 'skill', subtype: 'pure', category: 'boost',
    hpGainOnDamage: 0.10,
    note: 'If user damages opponent with this in trap: gains 10% HP.'
  },
  'vigilance': {
    type: 'skill', subtype: 'pure', category: 'trap',
    effect: 'guess_move_reflect_damage',
    note: 'Guess opponent move. If correct: opponent takes their own attack damage.'
  },
  'merciful': {
    type: 'skill', subtype: 'pure', category: 'boost',
    halvesIncoming: true,
    note: 'Halves ALL damage received in the turn used. Valid as 2FA damage reducer.'
  },
  'devils luck': {
    type: 'skill', subtype: 'pure', category: 'boost',
    effect: 'copy_boost_skill',
    note: 'Copies any boost skill used against user before or during the turn.'
  },
  'conqueror': {
    type: 'skill', subtype: 'pure', category: 'boost',
    effect: 'reset_timers_or_recover_hp',
    note: 'Land damage: reset ninjutsu/genjutsu OR taijutsu timers, OR recover HP based on damage class.'
  },
  'calculator': {
    type: 'skill', subtype: 'pure', category: 'boost',
    doubleDamageOnHit: true, halveDamageOnReceive: true,
    note: 'Attack lands = double damage. Receive attack = halve incoming damage.'
  },
  'merciless': {
    type: 'skill', subtype: 'pure', category: 'boost',
    doublesDmg: true,
    note: 'Doubles ALL damage given in the turn used.'
  },
  'worthy': {
    type: 'skill', subtype: 'pure', category: 'boost',
    classBoostOrReduce: true, removesSkillPowers: true,
    note: 'Boost/reduce class OR remove all skill powers (until hit).'
  },
  'clean records': {
    type: 'skill', subtype: 'pure', category: 'boost',
    rewardBoost: 0.10,
    note: 'Increases rewards by 10%. Off-battle effect.'
  },
  'frustration': {
    type: 'skill', subtype: 'pure', category: 'trap',
    effect: 'class_boost_on_damage_received',
    note: 'If user takes damage with this in trap: next turn move increases by a class.'
  },
  'bargain lord': {
    type: 'skill', subtype: 'pure', category: 'utility',
    oncePerMatch: true, effect: 'destroy_2_for_1',
    canBeNegated: true,
    note: 'Destroy 2 own deck cards to destroy 1 opponent deck card. Can be Negated.'
  },
  'purge': {
    type: 'skill', subtype: 'pure', category: 'boost',
    effect: 'suspend_move_on_land',
    note: 'Land attack: suspend opponent move for turns depending on damage class.'
  },
  'controller': {
    type: 'skill', subtype: 'pure', category: 'trap',
    effect: 'destroy_guessed_move',
    note: 'Guess opponent move beforehand. If correct: destroy the move.'
  },
  'multi-tasker': {
    type: 'skill', subtype: 'pure', category: 'utility',
    oncePerMatch: true, effect: 'clone_move',
    note: 'Creates a clone of a deck move with separate cooldown. Until hit.'
  },
  'reflex': {
    type: 'skill', subtype: 'pure', category: 'boost',
    autoWinDefense: true, classDiffThreshold: 1,
    note: 'Paired with a defensive move — auto-wins if class difference is less than 1.'
  },
  'adrenaline': {
    type: 'skill', subtype: 'pure', category: 'utility',
    oncePerMatch: true, blocksAllHpDamage: true,
    note: 'Blocks ALL HP damage. Until hit. One-time use. Valid as 2FA to negate incoming damage.'
  },

  // ══ PURE-MECH SKILLS ══════════════════════════════════════

  'multiplier': {
    type: 'skill', subtype: 'pure-mech', category: 'weapon',
    uses: 2, note: 'Weapon usable twice before rest.'
  },
  'damaged': {
    type: 'skill', subtype: 'pure-mech', category: 'weapon',
    continuousDmg: 0.10, note: '10% continual damage permanently after landing.'
  },
  'evade trap': {
    type: 'skill', subtype: 'pure-mech', category: 'weapon',
    speedTestOnEvade: true, note: 'If opponent evades this weapon: speed test done.'
  },
  'counter trap': {
    type: 'skill', subtype: 'pure-mech', category: 'weapon',
    speedTestOnCounter: true, note: 'If user counters this weapon: speed test done.'
  },
  'deflection': {
    type: 'skill', subtype: 'pure-mech', category: 'weapon',
    reflects: true, requiresEqualRank: true,
    note: 'Back-to-sender for LR moves if rank is equal.'
  },
  'armored': {
    type: 'skill', subtype: 'pure-mech', category: 'weapon',
    classBoost: 1, note: 'Weapon boosted by 1 class.'
  },
  'duplication': {
    type: 'skill', subtype: 'pure-mech', category: 'weapon',
    reanimateAfterDamage: true, note: 'Weapon reanimated after damage.'
  },

  // ══ MECHANICAL SKILLS ═════════════════════════════════════

  'survivor': {
    type: 'skill', subtype: 'mech', category: 'utility',
    oncePerMatch: true, heals: 0.50, classBoostAll: 1,
    note: 'Heals 50% HP + boosts all moves by 1 class (until hit). One-time.'
  },
  'survivor perfect': {
    type: 'skill', subtype: 'mech', category: 'utility',
    oncePerMatch: true, heals: 1.00, classBoostAll: 2,
    note: 'Heals 100% HP + boosts all moves by 2 classes (until hit). One-time.'
  },
  'mech wings': {
    type: 'skill', subtype: 'mech', category: 'boost',
    autoEvade: true, doublesDmg: true,
    note: 'Auto-evade (defense) OR doubles damage (attack).'
  },
  'o+': {
    type: 'skill', subtype: 'mech', category: 'utility',
    oncePerMatch: true, healPerTurn: 0.15,
    note: 'Heals 15% HP per turn until hit. One-time.'
  },
  'time': {
    type: 'skill', subtype: 'mech', category: 'utility',
    oncePerMatch: true, invalidatesTurn: true,
    note: 'Invalidates a turn picked by user from existence. One-time. Valid as 2FA.'
  },
  'teleport': {
    type: 'skill', subtype: 'mech', category: 'boost',
    instantMove: true,
    note: 'Renders attack or defense move instant.'
  },
  'swordsman': {
    type: 'skill', subtype: 'mech', category: 'utility',
    oncePerMatch: true, ko: true,
    note: 'KO weapon if it lands. One-time.'
  },
  'switch clap': {
    type: 'skill', subtype: 'mech', category: 'trap',
    redirectsDmg: true,
    note: 'If user receives damage with this in trap: opponent takes the damage instead. Valid as 2FA.'
  },
  'reality is cruel': {
    type: 'skill', subtype: 'mech', category: 'utility',
    oncePerMatch: true, swapsHP: true, genjutsuImmune: true,
    canBeNegated: true,
    note: 'Swaps HP with opponent + genjutsu immunity until hit. Can be Negated (utility).'
  },
  'king of luck': {
    type: 'skill', subtype: 'mech', category: 'boost',
    overturns: true, fa: 3,
    note: '3FA trump. Overturns any bad situation. Cannot be countered.'
  },
  'time wraith': {
    type: 'skill', subtype: 'mech', category: 'utility',
    oncePerMatch: true, stopsTimeCards: true,
    note: 'Stops any time-related card from being used. Until hit.'
  },
  'degeneration': {
    type: 'skill', subtype: 'mech', category: 'utility',
    oncePerMatch: true, effect: 'card_or_hp_drain',
    note: 'Opponent chooses: lose a card OR 10% HP per turn.'
  },
  'full body armor': {
    type: 'skill', subtype: 'mech', category: 'utility',
    oncePerMatch: true, maxPhysicals: true,
    genjutsuImmune: true, limitToTaijutsu: true,
    note: 'Maxes physicals, invalidates genjutsu, but limits user to taijutsu only.'
  },
  'limiter': {
    type: 'skill', subtype: 'mech', category: 'utility',
    oncePerMatch: true, effect: 'reduce_power_level',
    note: 'Reduces power level of user AND opponent to desired level.'
  },

  // ══ SPECIAL SKILLS ════════════════════════════════════════

  'diamond edge': {
    type: 'skill', subtype: 'special', category: 'boost',
    slashClassBoost: 2, note: 'Adds 2 classes to slash.'
  },
  'rage burst': {
    type: 'skill', subtype: 'special', category: 'utility',
    oncePerMatch: true, ampsAllByClass: 2,
    genjutsuImmune: true, healsAllDamage: true,
    note: 'Amps all capabilities by 2 classes + genjutsu immunity + heals all damage received. Until hit.'
  },
  'mono-birth': {
    type: 'skill', subtype: 'special', category: 'utility',
    oncePerMatch: true, limitOneSkill: true,
    note: 'Limits both users to one skill per match.'
  },
  'spatial movement': {
    type: 'skill', subtype: 'special', category: 'utility',
    transport: true, note: 'Village transporter.'
  },
  'unique': {
    type: 'skill', subtype: 'special', category: 'utility',
    confirmsKKG: true, note: 'Confirms and ties user to their KKG.'
  },
  'heavenly sage': {
    type: 'activation', subtype: 'sage', category: 'special',
    zClass: true, noRestPerTurn: true, charges: '2-4',
    instantReaction: true, cannotReactivate: true,
    note: 'Z class (above SSS). No rest per turn while charges last. NOT genjutsu immune. Boost skills don\'t affect sage moves.'
  },
  'devil sage': {
    type: 'activation', subtype: 'sage', category: 'special',
    zClass: true, noRestPerTurn: true, charges: '2-4',
    instantReaction: true, cannotReactivate: true,
    note: 'Same as Heavenly Sage. Z class. No rest. NOT genjutsu immune.'
  },
  'rashu-master': {
    type: 'skill', subtype: 'special', category: 'boost',
    effect: '3fa_on_rashumon_fail',
    note: 'User gets access to 3FA when any Rashumon played fails.'
  },

  // ══ BONUS SKILLS (all one-time use, utility) ══════════════

  'trap skill': {
    type: 'skill', subtype: 'bonus', category: 'utility',
    invalidates: 'trap_skills', oncePerMatch: true,
    note: 'Invalidates trap skills.'
  },
  'shield': {
    type: 'skill', subtype: 'bonus', category: 'utility',
    invalidates: 'boost_skills', oncePerMatch: true,
    note: 'Invalidates boost skills.'
  },
  'negate': {
    type: 'skill', subtype: 'bonus', category: 'utility',
    invalidates: 'utility_skills', oncePerMatch: true,
    cannotNegateAttacks: true, cannotNegateIllusions: true,
    note: 'Invalidates utility skills ONLY. CANNOT negate direct attack moves or genjutsu illusions.'
  },
  'speed': {
    type: 'skill', subtype: 'bonus', category: 'utility',
    autoEvade: true, oncePerMatch: true,
    note: 'Auto-evade one incoming attack.'
  },
  'active': {
    type: 'skill', subtype: 'bonus', category: 'utility',
    rechargeOneCard: true, oncePerMatch: true,
    note: 'Recharges one card currently in rest.'
  },
  'time-time': {
    type: 'skill', subtype: 'bonus', category: 'utility',
    erasesLastTurn: true, oncePerMatch: true,
    note: 'Erases the last turn of play from existence.'
  },
  'heightened sense': {
    type: 'skill', subtype: 'bonus', category: 'utility',
    autoBreaksGenjutsu: true, oncePerMatch: true,
    note: 'Auto-breaks from genjutsu.'
  },
  'old flame': {
    type: 'skill', subtype: 'bonus', category: 'utility',
    reversesHP: true, oncePerMatch: true,
    note: 'Reverses HP to previous turn value.'
  },
  'nature': {
    type: 'skill', subtype: 'bonus', category: 'utility',
    useElementNotInDeck: true, oncePerMatch: true,
    note: 'Use one elemental move not in deck.'
  },
  'bulletproof': {
    type: 'skill', subtype: 'bonus', category: 'utility',
    invalidatesDamage: true, oncePerMatch: true,
    note: 'Invalidates ALL damage done in turn used. Valid as 2FA to block any attack damage.'
  },
  'erase': {
    type: 'skill', subtype: 'bonus', category: 'utility',
    removesCard: true, oncePerMatch: true,
    canBeNegated: true,
    note: 'Removes a guessed card from opponent deck. One-time. Can be Negated.'
  },
  'crystal': {
    type: 'skill', subtype: 'bonus', category: 'utility',
    noBreachDefense: true, oncePerMatch: true,
    note: 'Defensive move cannot be breached this turn.'
  },
  'health': {
    type: 'skill', subtype: 'bonus', category: 'utility',
    heals: 0.10, oncePerMatch: true,
    note: 'Heals 10% HP.'
  },
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

function lookupMove(name = '') {
  const lower = name.toLowerCase().trim();
  for (const [key, data] of Object.entries(MOVE_DB)) {
    if (lower.includes(key)) return { key, ...data };
  }
  return null;
}

function extractClass(text = '') {
  const m = text.match(/\b(SSS|SS|S|A|B|C|D|E|Z)\s*(?:rank|class)?\s*\d*/i);
  if (m) {
    const cls = m[1].toUpperCase();
    if (CLASS_ORDER.includes(cls)) return cls;
  }
  return null;
}

function extractRank(text = '') {
  const m = text.match(/(?:SSS|SS|S|A|B|C|D|E|Z)\s*(?:rank\s*)?(\d+)/i);
  return m ? parseInt(m[1]) : 1;
}

function calcDamage(cls, rank = 1, modifiers = {}) {
  const baseDmg = HIT_VALUES[cls] || 10;
  const { isLR = false } = modifiers;
  const multiplier = isLR ? rank : 1;
  const dmg = Math.round(baseDmg * multiplier);
  const afterPct = (modifiers.bleed || 0) + (modifiers.burn || 0) + (modifiers.linger || 0);
  const afterDmg = Math.round(baseDmg * afterPct);
  const afterType = modifiers.bleed && modifiers.burn ? 'bleed+burn'
    : modifiers.bleed ? 'bleed'
    : modifiers.burn ? 'burn'
    : modifiers.linger ? 'linger' : null;
  return { dmg, afterDmg, afterType };
}

// ── 2FA OUTCOME RESOLVER ─────────────────────────────────────
// This resolves EVERY possible 2FA response against an incoming action.
// Returns { verdict, dmgBlocked, dmgReflected, dmgPartial, effect }
function resolve2FA(responderName, responseText, incomingText, responderDeck = null, responderTraps = []) {
  const respMeta = lookupMove(responseText);
  const incomingMeta = lookupMove(incomingText);
  const incomingCls = extractClass(incomingText) || incomingMeta?.maxClass || 'D';
  const incomingHit = HIT_VALUES[incomingCls] || 20;
  const incomingIsAttack = incomingMeta?.subtype === 'attack' || incomingMeta?.subtype === 'balanced';
  const incomingIsIllusion = incomingMeta?.subtype === 'illusion';
  const incomingIsUtility = incomingMeta?.category === 'utility' || incomingMeta?.subtype === 'utility';
  const incomingIsBoost = incomingMeta?.category === 'boost';
  const incomingIsTrap = incomingMeta?.category === 'trap';

  const lower = responseText.toLowerCase();

  // ── KING OF LUCK (3FA trump — overturns anything) ─────────
  if (lower.includes('king of luck') || lower.includes('kol')) {
    return { verdict: `👑 KING OF LUCK — ${responderName}'s situation is OVERTURNED. All previous actions against them this chain are INVALIDATED. Proceeds as if the bad situation never happened.`, dmgBlocked: incomingHit };
  }

  // ── TIME (invalidates a full turn) ─────────────────────────
  if (lower.includes('time') && !lower.includes('time-time') && !lower.includes('time wraith') && respMeta?.invalidatesTurn) {
    return { verdict: `⏱️ TIME — ${responderName} invalidates the entire turn. All actions this turn are erased from existence. One-time use.`, dmgBlocked: incomingHit };
  }

  // ── TIME-TIME (erases last turn) ──────────────────────────
  if (lower.includes('time-time')) {
    return { verdict: `⏱️ TIME-TIME — ${responderName} erases the last turn of play. All HP changes and effects from last turn are reversed.`, dmgBlocked: incomingHit };
  }

  // ── ADRENALINE (blocks all HP damage) ─────────────────────
  if (lower.includes('adrenaline')) {
    return { verdict: `💉 ADRENALINE — ${responderName} blocks ALL HP damage this turn. The attack lands but zero HP is lost. One-time use. Adrenaline is now spent.`, dmgBlocked: incomingHit };
  }

  // ── BULLETPROOF (invalidates all damage) ──────────────────
  if (lower.includes('bulletproof')) {
    return { verdict: `🛡️ BULLETPROOF — ${responderName} invalidates ALL damage dealt this turn. Zero HP lost. One-time use.`, dmgBlocked: incomingHit };
  }

  // ── SWITCH CLAP (redirects damage to opponent) ───────────
  if (lower.includes('switch clap')) {
    return { verdict: `🔄 SWITCH CLAP — ${responderName} redirects the incoming damage back to the attacker! The attacker takes ${incomingHit} damage instead. One-time use.`, dmgBlocked: incomingHit, dmgReflected: incomingHit };
  }

  // ── MERCIFUL (halves incoming damage) ─────────────────────
  if (lower.includes('merciful')) {
    const halved = Math.round(incomingHit / 2);
    return { verdict: `🕊️ MERCIFUL — ${responderName} halves all incoming damage. Takes ${halved} damage instead of ${incomingHit} this turn.`, dmgPartial: halved };
  }

  // ── CALCULATOR (halves damage if receiving) ───────────────
  if (lower.includes('calculator') && !incomingIsUtility) {
    const halved = Math.round(incomingHit / 2);
    return { verdict: `🧮 CALCULATOR — ${responderName} divides incoming damage by 2. Takes ${halved} instead of ${incomingHit}.`, dmgPartial: halved };
  }

  // ── SURVIVOR (heals + boosts) ─────────────────────────────
  if (lower.includes('survivor perfect')) {
    return { verdict: `💚 SURVIVOR PERFECT — ${responderName} activates! Heals 100% HP and boosts ALL moves by 2 classes until hit. Attack still lands but user recovers fully after.`, dmgPartial: incomingHit };
  }
  if (lower.includes('survivor') && !lower.includes('perfect')) {
    return { verdict: `💚 SURVIVOR — ${responderName} activates! Heals 50% HP and boosts ALL moves by 1 class until hit.`, dmgPartial: incomingHit };
  }

  // ── NEGATE (utility moves only) ───────────────────────────
  if (lower.includes('negate')) {
    if (incomingIsAttack) {
      return { verdict: `❌ NEGATE INVALID — Negate only works on utility skills. "${incomingText.substring(0,40)}" is a DIRECT ATTACK — it cannot be negated. Attack deals full ${incomingHit} damage.` };
    }
    if (incomingIsIllusion) {
      return { verdict: `❌ NEGATE INVALID — Negate cannot stop genjutsu illusions. Use Genjutsu Kai or Heightened Sense instead. Illusion activates.` };
    }
    if (incomingIsBoost) {
      return { verdict: `❌ NEGATE INVALID — Negate cannot stop boost skills. Use "Shield" bonus skill instead.` };
    }
    if (incomingIsTrap) {
      return { verdict: `❌ NEGATE INVALID — Negate cannot stop trap skills. Use "Trap Skill" bonus skill instead.` };
    }
    // Valid — utility/mech/pure utility
    return { verdict: `✅ NEGATE — ${responderName} invalidates the utility move "${incomingText.substring(0,40)}". The effect is cancelled. One-time use.`, dmgBlocked: incomingHit };
  }

  // ── SHIELD (invalidates boost skills) ────────────────────
  if (lower.includes('shield') && respMeta?.invalidates === 'boost_skills') {
    if (!incomingIsBoost) {
      return { verdict: `❌ SHIELD INVALID — Shield only invalidates boost skills. "${incomingText.substring(0,40)}" is not a boost skill.` };
    }
    return { verdict: `🛡️ SHIELD — ${responderName} invalidates the boost skill. Effect cancelled. One-time use.`, dmgBlocked: 0 };
  }

  // ── TRAP BONUS SKILL (invalidates trap skills) ────────────
  if (lower.includes('trap skill') || (lower.includes('trap') && respMeta?.invalidates === 'trap_skills')) {
    if (!incomingIsTrap) {
      return { verdict: `❌ TRAP SKILL INVALID — This only invalidates trap skills. "${incomingText.substring(0,40)}" is not a trap skill.` };
    }
    return { verdict: `✅ TRAP SKILL — ${responderName} invalidates the trap skill. Effect cancelled. One-time use.`, dmgBlocked: 0 };
  }

  // ── HEIGHTENED SENSE (auto-breaks genjutsu) ───────────────
  if (lower.includes('heightened sense')) {
    if (!incomingIsIllusion) {
      return { verdict: `❌ HEIGHTENED SENSE — Only works against genjutsu illusions. Not applicable here.` };
    }
    return { verdict: `👁️ HEIGHTENED SENSE — ${responderName} automatically breaks free from the genjutsu! Illusion has no effect.`, dmgBlocked: 0 };
  }

  // ── MIRROR HEAVEN (reflects non-KKG genjutsu) ─────────────
  if (lower.includes('mirror heaven')) {
    if (!incomingIsIllusion) {
      return { verdict: `❌ MIRROR HEAVEN INVALID — Only works against genjutsu illusions.` };
    }
    if (incomingMeta?.kkgType || incomingMeta?.cannotBeReflected) {
      return { verdict: `❌ MIRROR HEAVEN FAILS — KKG-type genjutsu (${incomingText.substring(0,30)}) CANNOT be reflected by Mirror Heaven. The illusion activates normally.` };
    }
    return { verdict: `🪞 MIRROR HEAVEN — ${responderName} reverses the genjutsu back to the attacker! Attacker is now caught in their own illusion. One-time use.`, dmgBlocked: 0 };
  }

  // ── WATER MIRROR (reflects equal rank attack) ─────────────
  if (lower.includes('water mirror')) {
    const mirrorCls = extractClass(responseText) || 'S';
    const mirrorRank = extractRank(responseText) || 1;
    const mirrorDef = HIT_VALUES[mirrorCls] || 60;
    const diff = classIndex(incomingCls) - classIndex(mirrorCls);
    if (diff <= 0) {
      return { verdict: `💧 WATER MIRROR — ${responderName} records and reflects the attack back with equal force! Attacker takes ${mirrorDef} damage. No elemental weakness.`, dmgBlocked: incomingHit, dmgReflected: mirrorDef };
    } else if (diff <= 5) {
      const partial = Math.round(incomingHit / 2);
      return { verdict: `💧 WATER MIRROR (PARTIAL) — Attack outclasses the mirror by ${diff}. Incoming halved: ${partial} damage taken. Rest reflected.`, dmgPartial: partial };
    } else {
      return { verdict: `💧 WATER MIRROR OVERWHELMED — Attack is too powerful. Mirror shatters. Full ${incomingHit} damage taken.` };
    }
  }

  // ── RASHUMON WALLS ────────────────────────────────────────
  const rashumonMap = {
    'double rashumon': { cls: 'B', rank: 2, diff: 2 },
    'triple rashumon': { cls: 'A', rank: 2, diff: 3 },
    'quintriple rashumon': { cls: 'A', rank: 2, diff: 5 },
  };
  for (const [name, stats] of Object.entries(rashumonMap)) {
    if (lower.includes(name)) {
      const defCls = extractClass(responseText) || stats.cls;
      const diff = classIndex(incomingCls) - classIndex(defCls);
      const isLRIncoming = incomingText.toLowerCase().includes('long range') || incomingMeta?.attack?.range === 'LR';
      if (diff <= 0) {
        const bonus = diff < 0 ? (isLRIncoming ? ' Opponent\'s evade is OFF next turn.' : ' Opponent is STUNNED.') : '';
        return { verdict: `🏯 ${name.toUpperCase()} — Total block! Incoming ${incomingCls}-class attack fully stopped.${bonus}`, dmgBlocked: incomingHit };
      } else if (diff <= stats.diff) {
        const partial = Math.round(incomingHit / 2);
        return { verdict: `🏯 ${name.toUpperCase()} (PARTIAL) — Outclassed by ${diff}. Incoming halved: takes ${partial} damage.`, dmgPartial: partial };
      } else {
        return { verdict: `🏯 ${name.toUpperCase()} OVERWHELMED — Diff too large (${diff}). Full ${incomingHit} damage breaks through.` };
      }
    }
  }

  // ── ROCK SHELTER ──────────────────────────────────────────
  if (lower.includes('rock shelter')) {
    const defCls = extractClass(responseText) || 'C';
    const diff = classIndex(incomingCls) - classIndex(defCls);
    const isLRIncoming = incomingMeta?.attack?.range === 'LR';
    const hasWind = incomingText.toLowerCase().includes('wind');
    const effectiveDiff = hasWind ? diff + 1 : diff;
    if (effectiveDiff <= 0) {
      const bonus = isLRIncoming ? ' Evade OFF next turn.' : ' Opponent STUNNED.';
      return { verdict: `🪨 ROCK SHELTER — Full block!${bonus}${hasWind ? ' (Wind reduces defense by 1.)' : ''}`, dmgBlocked: incomingHit };
    } else if (effectiveDiff === 1) {
      const partial = Math.round(incomingHit / 2);
      return { verdict: `🪨 ROCK SHELTER (PARTIAL) — 1 class difference. Takes ${partial} damage.`, dmgPartial: partial };
    } else {
      return { verdict: `🪨 ROCK SHELTER BROKEN — Too powerful. Full ${incomingHit} damage.` };
    }
  }

  // ── EARTH DOME (trap 2FA) ─────────────────────────────────
  if (lower.includes('earth dome')) {
    if (!incomingIsAttack) {
      return { verdict: `🌍 EARTH DOME INVALID — Only traps short range attackers.` };
    }
    const isLRIncoming = incomingMeta?.attack?.range === 'LR' || incomingText.toLowerCase().includes('long range');
    if (isLRIncoming) {
      return { verdict: `🌍 EARTH DOME INVALID — Earth Dome only works against SHORT RANGE attacks. This was long range.` };
    }
    const trapDmg = Math.round(incomingHit * 0.10);
    return { verdict: `🌍 EARTH DOME — Attacker is trapped inside! Takes ${trapDmg} HP (10% of ${incomingCls} class). Can only break out with 1 class higher jutsu.`, dmgBlocked: incomingHit - trapDmg };
  }

  // ── GALE SHIELD ───────────────────────────────────────────
  if (lower.includes('gale shield')) {
    const defCls = extractClass(responseText) || 'B';
    const hasFire = incomingText.toLowerCase().includes('fire');
    const effectiveDef = hasFire ? CLASS_ORDER[Math.max(0, classIndex(defCls) - 1)] : defCls;
    const diff = classIndex(incomingCls) - classIndex(effectiveDef);
    if (diff <= 0) {
      const isLR = incomingMeta?.attack?.range === 'LR';
      const bonus = isLR ? ' Evade OFF next turn.' : ' Opponent STUNNED.';
      return { verdict: `💨 GALE SHIELD — Full block!${bonus}${hasFire ? ' (Fire reduces shield by 1 rank.)' : ''}`, dmgBlocked: incomingHit };
    } else {
      return { verdict: `💨 GALE SHIELD OVERWHELMED — Takes full ${incomingHit} damage.` };
    }
  }

  // ── GENJUTSU KAI (break genjutsu) ─────────────────────────
  if (lower.includes('genjutsu kai') || lower.includes('kai')) {
    if (!incomingIsIllusion) {
      return { verdict: `❌ GENJUTSU KAI INVALID — No active genjutsu to break out of.` };
    }
    const kaiCls = extractClass(responseText) || 'D';
    const genjuCls = incomingMeta?.maxClass || incomingCls;
    if (classIndex(kaiCls) >= classIndex(genjuCls)) {
      return { verdict: `🌀 GENJUTSU KAI — ${responderName} breaks free! ${kaiCls}-class kai matches/exceeds ${genjuCls}-class illusion. No damage taken.`, dmgBlocked: 0 };
    } else {
      return { verdict: `🌀 GENJUTSU KAI FAILS — Kai class (${kaiCls}) is lower than illusion class (${genjuCls}). ${responderName} takes the genjutsu hit.` };
    }
  }

  // ── REFLEX (auto-wins defense if diff < 1) ────────────────
  if (lower.includes('reflex')) {
    const defMeta = lookupMove(responseText);
    if (!defMeta || defMeta.subtype !== 'defense') {
      return { verdict: `❌ REFLEX — Must be paired with a defensive move.` };
    }
    const defCls = extractClass(responseText) || 'D';
    const diff = classIndex(incomingCls) - classIndex(defCls);
    if (diff < 1) {
      return { verdict: `⚡ REFLEX — Auto-wins the defense! Class difference is less than 1. Full block. ${responderName} takes no damage.`, dmgBlocked: incomingHit };
    } else {
      return { verdict: `⚡ REFLEX — Class difference is ${diff} (needs less than 1). Reflex does not activate. Takes full damage.` };
    }
  }

  // ── OLD FLAME (reverses HP) ───────────────────────────────
  if (lower.includes('old flame')) {
    return { verdict: `🔥 OLD FLAME — ${responderName} reverses HP to its value from the previous turn. All damage from this turn's incoming attack is undone.`, dmgBlocked: incomingHit };
  }

  // ── RAGE BURST (amps all + genjutsu immune) ───────────────
  if (lower.includes('rage burst')) {
    return { verdict: `💢 RAGE BURST — ${responderName} amplifies ALL capabilities by 2 classes and becomes genjutsu immune until hit! Also heals all damage received. One-time use.`, dmgBlocked: incomingHit };
  }

  // ── FULL BODY ARMOR ───────────────────────────────────────
  if (lower.includes('full body armor')) {
    if (incomingIsIllusion) {
      return { verdict: `🛡️ FULL BODY ARMOR — Genjutsu INVALIDATED. ${responderName} is immune to genjutsu while active. But limited to taijutsu moves only.`, dmgBlocked: 0 };
    }
    return { verdict: `🛡️ FULL BODY ARMOR — Active! Physicals maxed, genjutsu immune, but limited to taijutsu. Physical attack still dealt normally.` };
  }

  // ── SPEED BONUS SKILL (auto-evade) ───────────────────────
  if (lower === 'speed' || (lower.includes('speed') && respMeta?.autoEvade)) {
    if (incomingMeta?.invisible) {
      return { verdict: `❌ SPEED/EVADE FAILS — "${incomingText.substring(0,30)}" is an INVISIBLE move. Evade does not work against invisible attacks. Takes full ${incomingHit} damage.` };
    }
    return { verdict: `💨 SPEED (AUTO-EVADE) — ${responderName} automatically evades the incoming attack. No damage taken. One-time use.`, dmgBlocked: incomingHit };
  }

  // ── CRYSTAL (no breach to defense) ───────────────────────
  if (lower.includes('crystal')) {
    return { verdict: `💎 CRYSTAL — ${responderName}'s defensive move cannot be breached this turn. The defense holds regardless of class difference. No damage taken.`, dmgBlocked: incomingHit };
  }

  // ── HEALTH (10% heal) ─────────────────────────────────────
  if (lower.includes('health') && respMeta?.heals === 0.10) {
    return { verdict: `💚 HEALTH — ${responderName} heals 10% HP. (Incoming damage still applies.)`, effect: 'heal_10' };
  }

  // ── ERASE (remove guessed card) ───────────────────────────
  if (lower.includes('erase')) {
    return { verdict: `🗑️ ERASE — ${responderName} attempts to remove a guessed card from opponent's deck. If the guess is correct: card removed permanently. One-time use. Can be Negated.` };
  }

  // ── REALITY IS CRUEL (swap HP) ────────────────────────────
  if (lower.includes('reality is cruel')) {
    return { verdict: `😈 REALITY IS CRUEL — HP values swapped between both players! ${responderName} also gains genjutsu immunity until hit. Can be Negated (utility).`, dmgBlocked: 0 };
  }

  // ── EVADE / DODGE / BLOCK (basic essentials) ─────────────
  if (lower.includes('evade') || lower.includes('dodge')) {
    if (incomingMeta?.invisible) {
      return { verdict: `❌ EVADE FAILS — "${incomingText.substring(0,30)}" is an INVISIBLE attack (e.g. Wind Blade). Evade does not work. Takes full ${incomingHit} damage.` };
    }
    return { verdict: `🏃 EVADE — ${responderName} attempts to dodge. Evade class determines success vs incoming attack class.` };
  }

  // ── WATER PRISON (counter to C SR or after stun) ─────────
  if (lower.includes('water prison')) {
    const isValidTrigger = incomingCls === 'C' && (incomingMeta?.attack?.range === 'SR' || incomingText.toLowerCase().includes('short range'));
    if (!isValidTrigger) {
      return { verdict: `💧 WATER PRISON INVALID — Can only counter C-class short range attacks or after a stun. Conditions not met.` };
    }
    const prisonDmg = Math.round(HIT_VALUES['C'] * 0.10);
    return { verdict: `💧 WATER PRISON — Activated! Opponent immobilized. Takes ${prisonDmg} damage. All opponent active cards DEACTIVATED and returned to deck. Break out with body activation above C class.` };
  }

  // ── FALLBACK — unknown 2FA ────────────────────────────────
  return {
    verdict: `⚠️ 2FA RULING — "${responseText.substring(0,50)}" used as 2FA. No specific rule matched. MOD ruling: resolve based on class comparison (${extractClass(responseText) || '?'} vs ${incomingCls}).`
  };
}

// ── TRAP 2FA VALIDATION ───────────────────────────────────────
function validateTrapAs2FA(trapMoveName, incomingText, playerTraps = []) {
  const trapMeta = lookupMove(trapMoveName);
  const incomingMeta = lookupMove(incomingText);
  const incomingCls = extractClass(incomingText) || incomingMeta?.maxClass || 'D';
  const incomingIsAttack = incomingMeta?.subtype === 'attack' || incomingMeta?.subtype === 'balanced';

  const submittedTrap = playerTraps.find(t =>
    t.name && t.name.toLowerCase().includes(trapMoveName.toLowerCase().trim())
  );

  if (!submittedTrap) {
    return { valid: false, reason: `❌ TRAP INVALID — "${trapMoveName}" was NOT in your submitted traps. Cannot activate.` };
  }

  // Use the full 2FA resolver for trap moves too
  const result = resolve2FA('Trap user', trapMoveName, incomingText, null, playerTraps);
  if (result.verdict.startsWith('❌')) {
    return { valid: false, reason: result.verdict };
  }

  return { valid: true, reason: `🪤 TRAP ACTIVATED: ${result.verdict}`, dmgBlocked: result.dmgBlocked, dmgPartial: result.dmgPartial, dmgReflected: result.dmgReflected };
}

// ── FA CHAIN RESOLVER ─────────────────────────────────────────
function resolveFAChain(chain = [], playerTraps = [], incomingAttackText = '') {
  if (chain.length === 0) return '';
  const last = chain[chain.length - 1];
  const secondLast = chain.length >= 2 ? chain[chain.length - 2] : null;

  // Trap 2FA
  const trapTrigger = /(?:trap|activate trap)[:\s]+(.+)/i.exec(last.action);
  if (trapTrigger) {
    const trapName = trapTrigger[1].trim();
    const result = validateTrapAs2FA(trapName, incomingAttackText || secondLast?.action || '', playerTraps);
    return result.reason;
  }

  // Full 2FA resolution
  const result = resolve2FA(last.player, last.action, incomingAttackText || secondLast?.action || '', null, playerTraps);
  return result.verdict;
}

// ── PARSE SUBMISSION ──────────────────────────────────────────
function parseSubmission(actionText = '', cardsUsed = []) {
  const lines = actionText.split('\n').map(l => l.trim()).filter(Boolean);
  const moves = [];

  for (const line of lines) {
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

  for (const card of cardsUsed) {
    const already = moves.some(m => m.name.toLowerCase().includes((card.name || '').toLowerCase()));
    if (!already) {
      moves.push({ raw: card.name, moveType: 'card', name: card.name, cls: card.class || 'D', rank: 1, meta: lookupMove(card.name) });
    }
  }

  return moves;
}

// ── BOARD STATE TEMPLATE ──────────────────────────────────────
function buildBoardTemplate(battle, p1Name, p2Name) {
  const p1HP = battle.player1HP ?? 100;
  const p2HP = battle.player2HP ?? 100;
  const fmtList = arr => arr?.length > 0 ? arr.join(', ') : 'None';
  const p1State = battle.boardState?.player1 || {};
  const p2State = battle.boardState?.player2 || {};
  const p1TrapCount = (battle.player1Traps || []).length;
  const p2TrapCount = (battle.player2Traps || []).length;

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
*Traps:* ${p1TrapCount > 0 ? `🔒 Hidden (${p1TrapCount} set)` : 'None'}

       Vs

*NIN_B* — ${p2Name}
*HP:* ${p2HP}/100
*Activated:* ${fmtList(p2State.activated)}
*Effects:* ${fmtList(p2State.effects)}
*Clones:* ${p2State.clones || 'None'}
*Summonings:* ${fmtList(p2State.summonings)}
*Traps:* ${p2TrapCount > 0 ? `🔒 Hidden (${p2TrapCount} set)` : 'None'}

Turn ${battle.currentTurn || 1} | Phase: ${(battle.phase || 'attack').toUpperCase()}
`.trim();
}


// ── DECK VALIDATOR (used inside moderator to inline-flag violations) ──────
function validateMovesAgainstDeck(playerAction, actingPlayerDeck, actingPlayerName) {
  if (!actingPlayerDeck) return null;

  const allowedNames = new Set();
  (actingPlayerDeck.ninjutsuGenjutsu || []).forEach(c => c.name && allowedNames.add(c.name.toLowerCase().trim()));
  (actingPlayerDeck.skills || []).forEach(c => c.name && allowedNames.add(c.name.toLowerCase().trim()));
  (actingPlayerDeck.weaponBag || []).forEach(c => c.name && allowedNames.add(c.name.toLowerCase().trim()));
  if (actingPlayerDeck.kkgCard?.name) allowedNames.add(actingPlayerDeck.kkgCard.name.toLowerCase().trim());
  if (actingPlayerDeck.tailedBeast?.name) allowedNames.add(actingPlayerDeck.tailedBeast.name.toLowerCase().trim());
  if (actingPlayerDeck.summoningBeast?.name) allowedNames.add(actingPlayerDeck.summoningBeast.name.toLowerCase().trim());

  // Always-allowed: bonus skills and basic essentials
  ['negate','shield','bulletproof','speed','active','time-time','heightened sense','old flame',
   'nature','erase','crystal','health','king of luck','punch','kick','block','slash','throw',
   'evade','dodge','genjutsu kai','substitution jutsu','clone sub','skip','counter',
   '2fa','3fa','no 2fa','set trap','activate','heads','tails'].forEach(b => allowedNames.add(b));

  const lines = playerAction.split(/[\n,]+/).map(l => l.trim().toLowerCase()).filter(Boolean);
  const violations = [];

  for (const line of lines) {
    // Strip prefixes to isolate the move name
    let stripped = line
      .replace(/^activate\s+/i, '')
      .replace(/^summon\s+/i, '')
      .replace(/^instant\s+/i, '')
      .replace(/^all\s+.*?clones?\s*:\s*/i, '')
      .replace(/^create\s+\d+\s+.*?clones?\s*/i, '')
      .replace(/^\d+fa\s+/i, '')
      .replace(/\s+(SSS|SS|S|A|B|C|D|E|Z)\d*$/i, '')
      .trim();

    if (!stripped || stripped.length < 3) continue;

    // Check if it matches any allowed card
    const isAllowed = [...allowedNames].some(allowed => {
      return stripped === allowed || stripped.startsWith(allowed) || allowed.startsWith(stripped);
    });

    // Only flag lines that look like specific move names
    const looksLikeMove = /(jutsu|mode|rasengan|chidori|tbb|hvt|chakra|bijuu|sage|manda|zephyr|arm|bomb|kirin|dragon|shadow|cloning|rashumon|shelter|prison|vortex|blade|burst|typhoon)/.test(stripped);

    if (looksLikeMove && !isAllowed) {
      violations.push(stripped);
    }
  }

  if (violations.length > 0) {
    return `⚠️ DECK VIOLATION — ${actingPlayerName} used move(s) NOT in their deck:\n${violations.map(v => `• ${v} ❌ INVALID`).join('\n')}\nThese moves do NOT count this turn.`;
  }
  return null;
}

// ── BATTLE FLOW UNDERSTANDING ────────────────────────────────
// How a UNC battle works (from real battle log analysis):
//
// TURN STRUCTURE:
// Each turn has an ATTACKER and a DEFENDER (who responds).
// On odd-numbered turns (1,3,5,7,9): Player who won coin toss attacks; other player sets traps then responds.
// On even-numbered turns (2,4,6,8,10): The OTHER player attacks; original attacker responds.
// BUT this can change if "skip" is played or Benitez-style delays happen.
//
// PHASE FLOW within a turn:
// 1. TRAP PHASE — both players secretly update traps (submitted via /submit-traps)
// 2. ATTACK PHASE — attacker submits their full move (activate X, summon Y, use Z SSS5, instant Z1, etc.)
// 3. SUMMARY — mod reads out the play components and asks opponent to respond
// 4. RESPONSE PHASE — defender responds: counter / evade / trap: X / 2FA / no 2fa / take the hit
// 5. 2FA CHAIN — attacker may 2FA the defense. Defender may 2FA back. 3FA = King of Luck (overturns all).
// 6. DAMAGE / RESOLUTION — mod calculates damage, updates HP and board state
// 7. NEXT TURN
//
// KEY RULES:
// - A player CANNOT respond to their own attack (the /action route now enforces this)
// - "counter" in the response means a counter-attack (not the same as 2FA)
// - "activate X" in an attack means turning on a power-up or mode for the turn
// - "summon X" brings a beast/creature onto the field with its own HP
// - "Z5", "SSS2", "A3" etc. = class + rank of the move
// - "instant Z5" = move is instant (cannot be evaded/countered by speed)
// - "HVT" = High-Value Target (a beast attack that creates a follow-on damage mini-game)
// - "skip" = player passes their turn (still sets traps)
// - "clone sub" = substitution using a clone (reduces damage by putting a clone in the way)
// - "trap: X" or "activate trap" = triggering a pre-set trap as a 2FA defense
// - Traps must be IN the player's submitted trap list to be valid
// - "2fa" / "no 2fa" = whether the player uses their second chance after opponent's 1FA
// - "3fa King of Luck" = ultimate trump — overturns any previous bad outcome, cannot be countered
// - Sage Mode / Bijuu Mode = power activation with limited charges (2-4 per match)
// - "SB wheel", "TB wheel" etc. refer to spin results from the opening meter card rolls
//
// DECK VALIDATION:
// Every named jutsu, skill, summoning, or activation MUST be in the player's submitted deck.
// Bonus skills (negate, shield, bulletproof, speed, KoL, etc.) are universal.
// Basic Essentials (punch, kick, block, slash, throw, evade, genjutsu kai) are always valid.
// If a player uses a card not in their deck: the move is INVALID that turn.
//
// COOLDOWNS (from real battle):
// - Sage Mode: available after 2 charges spent, goes on cooldown (usually turn+4)
// - teleport: turn+4 cooldown after use
// - Negate, bulletproof, shield, etc.: once per match (struck-through after use)
// - KoL (King of Luck): turn+4 cooldown (seen as "KoL(turn 5)" in cooldown list)
// - HVT: turn+4 cooldown after use
//
// BOARD STATE FORMAT (matches the WhatsApp format):
// NIN_A/NIN_B, HP, Activated, Effects, Clones, Summonings, Traps (count/3)
// HT = Hit Taken (damage accumulated this turn before it's subtracted from HP display)

// ── MAIN MODERATION FUNCTION ──────────────────────────────────
const moderateTurn = async (battle, playerAction, actingPlayer, opposingPlayer, actingPlayerRole = 'player1', actingPlayerDeck = null) => {
  const turn = battle.currentTurn || 1;
  const phase = battle.phase || 'attack';
  const p1HP = battle.player1HP ?? 100;
  const p2HP = battle.player2HP ?? 100;
  const isP1Acting = actingPlayerRole === 'player1';
  const actingHP   = isP1Acting ? p1HP : p2HP;
  const opposingHP = isP1Acting ? p2HP : p1HP;
  const actingTraps   = isP1Acting ? (battle.player1Traps || []) : (battle.player2Traps || []);
  const opposingTraps = isP1Acting ? (battle.player2Traps || []) : (battle.player1Traps || []);

  // ── SKIP HANDLING ──────────────────────────────────────────
  // "skip" = player passes their attack turn (no action taken, still sets traps)
  if (/^\s*skip\s*$/i.test(playerAction.trim())) {
    return [
      `⏭️ ${actingPlayer.characterName} SKIPS their turn.`,
      ``,
      `No attack this turn. ${opposingPlayer.characterName} may set traps.`,
      `Turn ${turn} | Next: ${opposingPlayer.characterName} to attack.`,
      ``,
      `[HP UPDATE] P1: ${p1HP} | P2: ${p2HP}`,
      buildBoardTemplate(battle, battle.player1Name || 'P1', battle.player2Name || 'P2')
    ].join('\n');
  }

  const lastTurn  = battle.turns?.slice(-1)[0] || {};
  const cardsUsed = lastTurn.cardsUsed || [];
  const subMoves  = parseSubmission(playerAction, cardsUsed);

  let newP1HP = p1HP;
  let newP2HP = p2HP;
  const lines = [];

  // ── INLINE DECK VIOLATION CHECK ────────────────────────────
  const deckViolation = validateMovesAgainstDeck(playerAction, actingPlayerDeck, actingPlayer.characterName);

  // ── TRAP 2FA DETECTION ────────────────────────────────────
  const trapTriggerMatch = /(?:trap|activate trap|i use my trap|triggering trap)[:\s]+(.+)/i.exec(playerAction);
  if (trapTriggerMatch) {
    const trapName = trapTriggerMatch[1].trim();
    const lastAttackEntry = battle.turns?.slice(-1)[0];
    const incomingText = lastAttackEntry?.action || '';
    const result = validateTrapAs2FA(trapName, incomingText, actingTraps);

    lines.push(`🪤 TRAP 2FA — ${actingPlayer.characterName} triggers: "${trapName}"`);
    lines.push(``);
    lines.push(result.reason);

    if (result.valid && result.dmgPartial) {
      if (isP1Acting) newP1HP = clamp(actingHP - result.dmgPartial);
      else newP2HP = clamp(actingHP - result.dmgPartial);
    }
    if (result.dmgReflected) {
      if (isP1Acting) newP2HP = clamp(opposingHP - result.dmgReflected);
      else newP1HP = clamp(opposingHP - result.dmgReflected);
    }

    lines.push(``);
    lines.push(`[HP UPDATE] P1: ${newP1HP} | P2: ${newP2HP}`);
    lines.push(buildBoardTemplate({ ...battle, player1HP: newP1HP, player2HP: newP2HP }, battle.player1Name || 'P1', battle.player2Name || 'P2'));
    return lines.join('\n');
  }

  // ── FA/2FA RESPONSE DETECTION ─────────────────────────────
  const faKeywords = [
    'negate', 'king of luck', 'kol', 'bargain lord', 'erase', 'adrenaline',
    'bulletproof', 'merciful', 'switch clap', 'time', 'reality is cruel',
    'survivor', 'reflex', 'old flame', 'rage burst', 'full body armor',
    'mirror heaven', 'water mirror', 'heightened sense', 'shield', 'speed',
    'calculator', 'crystal', 'genjutsu kai', 'evade', 'rashumon',
    'rock shelter', 'earth dome', 'gale shield', 'water prison'
  ];
  const isFAResponse = faKeywords.some(kw => playerAction.toLowerCase().includes(kw)) && phase === 'response';

  if (isFAResponse) {
    const chain = battle.faChain || [];
    chain.push({ player: actingPlayer.characterName, action: playerAction.trim(), faLevel: chain.length + 1 });
    const lastAttackEntry = battle.turns?.slice(-2)[0];
    const incomingText = lastAttackEntry?.action || '';
    const result = resolve2FA(actingPlayer.characterName, playerAction.trim(), incomingText, null, actingTraps);

    lines.push(`⚡ ${chain.length}FA — ${actingPlayer.characterName}: "${playerAction.trim()}"`);
    lines.push(``);
    lines.push(result.verdict);

    if (result.dmgPartial) {
      if (isP1Acting) newP1HP = clamp(actingHP - result.dmgPartial);
      else newP2HP = clamp(actingHP - result.dmgPartial);
    }
    if (result.dmgReflected) {
      if (isP1Acting) newP2HP = clamp(opposingHP - result.dmgReflected);
      else newP1HP = clamp(opposingHP - result.dmgReflected);
    }

    lines.push(``);
    lines.push(`[HP UPDATE] P1: ${newP1HP} | P2: ${newP2HP}`);
    lines.push(buildBoardTemplate({ ...battle, player1HP: newP1HP, player2HP: newP2HP }, battle.player1Name || 'P1', battle.player2Name || 'P2'));
    lines.push(`[NEXT ACTION] Awaiting ${opposingPlayer.characterName} OR MOD to proceed.`);
    return lines.join('\n');
  }

  // ── MOVE BREAKDOWN (attack phase) ────────────────────────
  lines.push(`📋 MOVE BREAKDOWN — ${actingPlayer.characterName} (Turn ${turn}):`);
  lines.push(``);

  let moveNumber = 0;
  let totalDmgDealt = 0;
  const attackMoves = [];

  for (const move of subMoves) {
    if (move.moveType === 'activation') {
      lines.push(`✅ ${move.name} — ACTIVATED.`);
      continue;
    }

    moveNumber++;
    const meta = move.meta;
    const cls  = move.cls || 'D';
    const rank = move.rank || 1;
    const isLR = meta?.attack?.range === 'LR' || playerAction.toLowerCase().includes('long range');
    const { dmg, afterDmg, afterType } = calcDamage(cls, rank, {
      isLR,
      bleed: meta?.bleed,
      burn: meta?.burn,
      linger: meta?.linger
    });

    attackMoves.push({ number: moveNumber, name: move.name, cls, rank, dmg, afterDmg, afterType, meta });

    let desc = `${moveNumber}) ${move.name} [${cls}${rank > 1 ? ` rank ${rank}` : ''}] — ${isLR ? 'LR' : 'SR'}, ${dmg} dmg`;
    if (afterDmg > 0 && afterType) desc += ` + ${afterDmg} after-dmg (${afterType})`;
    if (meta?.invisible) desc += ` ⚠️ INVISIBLE — evade & melee-counter disabled`;
    if (meta?.stunAll) desc += ` ⚠️ STUN ALL (unless in deck)`;
    if (meta?.stun) desc += ` ⚠️ STUN on hit`;
    if (meta?.kkgType) desc += ` ⚠️ KKG Genjutsu — Mirror Heaven cannot reflect`;
    if (meta?.cloning) lines.push(`   ↳ Clones active — state how many and which moves each plays`);
    if (meta?.note) lines.push(`   ℹ️ ${meta.note}`);
    lines.push(desc);
  }

  lines.push(``);

  // ── TRAP TURN RULES ───────────────────────────────────────
  // P1 sets traps on turns: 1,2,3,5,7,9
  // P2 sets traps on turns: 1,2,4,6,8,10
  const currentTurnNum = battle.currentTurn || 1;
  const p1TrapTurns = [1, 2, 3, 5, 7, 9];
  const p2TrapTurns = [1, 2, 4, 6, 8, 10];

  // ── RESPONSE PHASE ────────────────────────────────────────
  if (phase === 'response') {
    const lastAttackEntry = battle.turns?.slice(-2)[0];
    const lastAttackText  = lastAttackEntry?.action || '';
    const lastAttackCls   = extractClass(lastAttackText) || 'D';
    const lastAttackHit   = HIT_VALUES[lastAttackCls] || 20;
    const lastAttackMeta  = lookupMove(lastAttackText);

    if (attackMoves.length === 0) {
      // Taking the hit
      if (isP1Acting) newP1HP = clamp(actingHP - lastAttackHit);
      else newP2HP = clamp(actingHP - lastAttackHit);
      totalDmgDealt = lastAttackHit;
      lines.push(`💥 HIT CONFIRMED — ${actingPlayer.characterName} takes ${lastAttackHit} damage!`);
    } else {
      // Counter-attack — speed game ONLY on equal class
      const counterCls = attackMoves[0]?.cls || 'D';
      const isEqualClash = counterCls === lastAttackCls;
      const counterHit = HIT_VALUES[counterCls] || 20;

      if (isEqualClash) {
        const nums = randomNumbers(3, 1, 10);
        lines.push(`⚡ EQUAL CLASH — Both moves are ${counterCls} class! SPEED GAME triggered.`);
        lines.push(`Numbers: [${nums.join(', ')}]`);
        lines.push(`Both players pick privately. Highest wins — deals full ${counterHit} damage. Luck Master = auto-win.`);
      } else {
        const diff = classIndex(counterCls) - classIndex(lastAttackCls);
        if (diff > 0) {
          const counterDmg = counterHit;
          const reducedDmg = Math.round(lastAttackHit * 0.3);
          if (isP1Acting) { newP1HP = clamp(actingHP - reducedDmg); newP2HP = clamp(opposingHP - counterDmg); }
          else { newP2HP = clamp(actingHP - reducedDmg); newP1HP = clamp(opposingHP - counterDmg); }
          totalDmgDealt = counterDmg;
          lines.push(`💥 COUNTER OUTCLASSES ATTACK — ${counterCls} > ${lastAttackCls}!`);
          lines.push(`${actingPlayer.characterName} takes reduced ${reducedDmg} dmg. ${opposingPlayer.characterName} takes ${counterDmg} counter dmg!`);
        } else {
          const partialDmg = Math.round(lastAttackHit * (0.4 + Math.abs(diff) * 0.1));
          if (isP1Acting) newP1HP = clamp(actingHP - partialDmg);
          else newP2HP = clamp(actingHP - partialDmg);
          totalDmgDealt = partialDmg;
          lines.push(`💢 ATTACK OUTCLASSES COUNTER — ${lastAttackCls} > ${counterCls}.`);
          lines.push(`${actingPlayer.characterName} takes ${partialDmg} damage (reduced from ${lastAttackHit}).`);
        }
      }
    }

    if (lastAttackMeta?.instinct || lastAttackMeta?.fa) {
      lines.push(``);
      lines.push(`⚡ 2FA WINDOW — ${opposingPlayer.characterName} may respond. Time: 5 mins.`);
      lines.push(`Type "trap: [name]" to trigger a submitted trap.`);
    }

    // Trap turn reminder for acting player
    const actingCanTrap = isP1Acting ? p1TrapTurns.includes(currentTurnNum) : p2TrapTurns.includes(currentTurnNum);
    if (actingCanTrap) {
      lines.push(``);
      lines.push(`🪤 Turn ${currentTurnNum} — ${actingPlayer.characterName} CAN update traps this turn (TRAPS tab).`);
    }

  } else {
    // ── ATTACK PHASE ──────────────────────────────────────

    // ── CLONE DAMAGE CALCULATION ──────────────────────────
    const cloneMatch = playerAction.match(/(\d+)\s*(?:shadow\s*)?clones?\s*(?:all\s*)?(?:use|attack|play|cast)/i)
      || playerAction.match(/(?:use|deploy|send)\s*(\d+)\s*clones?/i);
    const cloneCount = cloneMatch ? parseInt(cloneMatch[1]) : 0;

    if (attackMoves.length > 0) {
      if (cloneCount > 0) {
        lines.push(`👥 CLONE ATTACK — ${actingPlayer.characterName} deploys ${cloneCount} clone(s)!`);
        lines.push(``);
        attackMoves.forEach(m => {
          const totalDmg = m.dmg * cloneCount;
          const totalAfter = m.afterDmg * cloneCount;
          lines.push(`📊 ${m.name} [${m.cls}] × ${cloneCount} clones = ${totalDmg} total dmg${totalAfter > 0 ? ` + ${totalAfter} after-dmg (${m.afterType})` : ''}`);
        });
        lines.push(``);
        lines.push(`⚠️ 1 evade covers ALL clones (collaborative evade). Countering = face COMBINED damage.`);
        lines.push(``);
      }

      lines.push(`⚔️ ${actingPlayer.characterName} commits ${attackMoves.length} move(s)${cloneCount > 0 ? ` with ${cloneCount} clones` : ''}.`);
      lines.push(``);

      const oppCanTrap = isP1Acting ? p2TrapTurns.includes(currentTurnNum) : p1TrapTurns.includes(currentTurnNum);
      lines.push(`${opposingPlayer.characterName} — RESPONSE PHASE (10 mins). Options:`);
      lines.push(`• Defend with a deck move`);
      lines.push(`• Counter of EQUAL class = SPEED GAME | Different class = class comparison`);
      lines.push(`• Evade (disabled if invisible attack or Hidden Mist)`);
      lines.push(`• 2FA skill: negate, bulletproof, merciful, switch clap, adrenaline, time, etc.`);
      if (oppCanTrap) lines.push(`• 🪤 Turn ${currentTurnNum} — you CAN set/update traps this turn (TRAPS tab)`);
      lines.push(`• No deck counter? Type "trap: [move name]" to trigger a TRAP as 2FA`);
      lines.push(`• Take the hit`);

      const hasFAMove = attackMoves.some(m => m.meta?.instinct || m.meta?.fa);
      if (hasFAMove) {
        lines.push(``);
        lines.push(`⚡ 2FA ENABLED — ${actingPlayer.characterName} may respond after. Time: 5 mins.`);
      }

      const hasGenjutsu = subMoves.some(m => m.meta?.type === 'genjutsu');
      if (hasGenjutsu) {
        const gMove = subMoves.find(m => m.meta?.type === 'genjutsu');
        lines.push(``);
        lines.push(`🌀 GENJUTSU ACTIVE — Activates next turn. Break with Genjutsu Kai (equal/higher class).`);
        if (gMove?.meta?.kkgType) lines.push(`⚠️ KKG Genjutsu — Mirror Heaven CANNOT reflect.`);
      }

      if (opposingTraps.length > 0) {
        lines.push(``);
        lines.push(`🪤 ${opposingPlayer.characterName} has ${opposingTraps.length} trap(s) set.`);
      }
    }
  }

  lines.push(``);
  lines.push(`[HP UPDATE] P1: ${newP1HP} | P2: ${newP2HP}`);

  if (totalDmgDealt > 0) {
    attackMoves.filter(m => m.afterDmg > 0).forEach(m => {
      lines.push(`⚠️ AFTER-EFFECT (${m.afterType}): ${m.afterDmg} next turn from ${m.name}`);
    });
  }

  if (newP1HP <= 0 || newP2HP <= 0) {
    const winner = newP1HP > 0 ? battle.player1Name : battle.player2Name;
    lines.push(``);
    lines.push(`🏁 KNOCKOUT — ${winner} WINS!`);
  }

  lines.push(``);
  lines.push(buildBoardTemplate(
    { ...battle, player1HP: newP1HP, player2HP: newP2HP },
    battle.player1Name || 'P1',
    battle.player2Name || 'P2'
  ));

  if (deckViolation) {
    lines.push(``);
    lines.push(deckViolation);
  }

  return lines.join('\n');
};

// ── RULES Q&A ─────────────────────────────────────────────────
const getAIRuling = async (question, battleState) => {
  const q = question.toLowerCase();

  // Look up specific move
  const moveMeta = lookupMove(question);
  if (moveMeta && moveMeta.note) {
    return `[MOD RULING] ${moveMeta.key?.toUpperCase()}:\n${moveMeta.note}\n${moveMeta.maxClass ? `Max class: ${moveMeta.maxClass}` : ''}\n${moveMeta.oncePerMatch ? 'One-time use per match.' : ''}`;
  }

  if (q.includes('trap')) {
    return `[MOD RULING] TRAPS:
• Submit privately via TRAPS tab before each turn. Max 3 active. Can change every turn.
• Hidden from opponent — they see count only.
• Can ONLY be used as 2FA — when you have no valid deck counter.
• Trigger with: "trap: [move name]"
• Trap must be in submitted traps or it's flagged invalid.
• NEGATE trap: cannot stop direct attacks or genjutsu illusions.
• Defense traps (Rashumon, Rock Shelter, Earth Dome, Gale Shield) are valid 2FA.
• Class must match or exceed incoming attack for full block. Under-class = partial damage.`;
  }

  if (q.includes('negate')) {
    return `[MOD RULING] NEGATE: Invalidates UTILITY skills only.
❌ Cannot negate: direct attacks (Fire Storm, Chidori, etc.), genjutsu illusions, boost skills, trap skills.
✅ Can negate: Time, Adrenaline, Reality is Cruel, Erase, Bargain Lord, Money Bag, Multi-tasker, etc.
Double Negate = both cancel, original move stands. One-time use.`;
  }

  if (q.includes('2fa') || q.includes('fa chain')) {
    return `[MOD RULING] FA CHAINS:
• 1FA = first response to an attack (defense, counter, skill).
• 2FA = counter to the 1FA. Time: 5 mins.
• 3FA = King of Luck — overturns any bad situation. Cannot be countered.
• Trap 2FA: "trap: [name]" if no deck counter available.
• Each 2FA must be a valid counter to what preceded it.`;
  }

  if (q.includes('damage') || q.includes('hit value')) {
    return `[MOD RULING] HIT VALUES: E=10, D=20, C=30, B=40, A=50, S=60, SS=70, SSS=80, Z=90.
SR = base damage. LR = base × rank. Armor LR = class × class. Prime/Sage LR = class × class × class.
After-effects apply next turn: Bleed/Burn = % of base. Fire Storm = 15% (both bleed+burn).`;
  }

  if (q.includes('genjutsu') || q.includes('kai')) {
    return `[MOD RULING] GENJUTSU:
• Illusion ranking only — no separate attack/defense.
• Same class + rank genjutsu = doesn't affect the user.
• Stronger genjutsu wins when two clash.
• Break out with Genjutsu Kai (equal or higher class).
• KKG genjutsu (Kotoamatsukami, Tsukuyomi, Izanami) CANNOT be reflected by Mirror Heaven.
• Bringer of Darkness: disables attack moves, defense/trap still work.
• Tree Bind: stuns, disables movement-based moves.`;
  }

  if (q.includes('clone') || q.includes('shadow clone')) {
    return `[MOD RULING] CLONES:
• Shadow Clone: B class. All user moves. Trap: stuns BOTH SR and LR.
• Cloning Jutsu: C class. Clones limited to 1 element. Trap: stuns SR, evade off LR.
• Clone limit set by trial/rank-up.
• Same attack from clones = 1 evade needed. Counter = face all clones combined.`;
  }

  if (q.includes('sage mode') || q.includes('sage')) {
    return `[MOD RULING] SAGE MODE (Heavenly/Devil): Z class (above SSS). Charges 2-4.
No rest per turn while charges last. NOT genjutsu immune. Boost skills don't affect sage moves.
Cannot reactivate after charges spent.`;
  }

  if (q.includes('speed') || q.includes('speed game')) {
    return `[MOD RULING] SPEED GAME: Triggered when both players attack simultaneously.
MOD generates 3 numbers. Both pick privately. Highest wins — deals full damage.
Stalemate (equal jutsu): wrong picker takes 10%. Luck Master in trap = auto-win.`;
  }

  if (q.includes('be') || q.includes('basic essential')) {
    return `[MOD RULING] BASIC ESSENTIALS: Punch, Kick, Block, Slash, Throw, Evade, Genjutsu Kai.
Limits: Genin=3, Chunin=4, Jounin=5, Kage=6, Sage=7, God=8. After limit: rest 3 turns.
Evade/Genjutsu Kai: D base, max S. Punch/Kick/Block: E base, max A.`;
  }

  if (q.includes('weapon') || q.includes('durability')) {
    return `[MOD RULING] WEAPONS: D=4 uses, C=6, B=8, A=10, S=unbreakable.
Bag reset: roll dice → number shown = weapons reclaimed.`;
  }

  return `[MOD RULING] Turn ${battleState?.currentTurn || '?'} | Phase: ${battleState?.phase || '?'}.
Ask about a specific move, skill, genjutsu, trap, FA chain, damage, clones, sage mode, or speed game.`;
};

// ── SPIN / COIN / DICE ────────────────────────────────────────
const generateSpinResult = async (spinType, player) => {
  if (spinType === 'compatibility') {
    const r = coinToss();
    return `🪙 COIN TOSS — ${r}!\n${r === 'HEADS' ? '✅ COMPATIBLE' : '❌ INCOMPATIBLE — cannot use this turn.'}`;
  }
  if (spinType === 'momentum') {
    const roll = rollDice(6);
    const fx = { 1: 'KKG weakened — -1 class to auto-on effects.', 2: 'Minor disruption — normal power.', 3: 'Stable — no change.', 4: 'Chakra surge — +1 rank to KKG.', 5: 'Power boost — auto-on +1 class.', 6: '🌟 MOMENTUM PEAK — max power!' };
    return `🎲 MOMENTUM DICE — ${player.characterName} rolled [${roll}]!\n${fx[roll]}`;
  }
  if (spinType === 'stalemate') {
    const nums = randomNumbers(3, 1, 10);
    return `⚡ STALEMATE: [${nums.join(', ')}]\nBoth pick a number. Wrong picker takes 10% damage.`;
  }
  if (spinType === 'speedGame') {
    const nums = randomNumbers(3, 1, 10);
    return `⚡ SPEED GAME: [${nums.join(', ')}]\nBoth pick privately. Highest wins — full damage dealt.`;
  }
  if (spinType === 'weaponBagReset') {
    const roll = rollDice(6);
    return `🎲 WEAPON BAG RESET — ${player.characterName} rolled [${roll}]. ${roll} weapon(s) reclaimed.`;
  }
  return `🪙 COIN TOSS — ${coinToss()}!`;
};

// ── OPENING ROLLS ─────────────────────────────────────────────
// Generated once at match start. Determines key values for the whole match.
const TERRAINS = ['Fire', 'Water', 'Wind', 'Earth', 'Lightning', 'Vacuum', 'Neutral'];

const generateOpeningRolls = () => {
  return {
    AA: rollDice(6),           // Attack Ability roll (1-6)
    TB: rollDice(6),           // Tailed Beast roll
    SSS_prime: rollDice(6),    // SSS Prime roll
    SB: rollDice(6),           // Sage Boost roll
    armourAA: rollDice(6),     // Armour AA roll
    zClass: rollDice(6),       // Z Class roll
    terrain: TERRAINS[Math.floor(Math.random() * TERRAINS.length)], // Random terrain
  };
};

module.exports = { moderateTurn, getAIRuling, generateSpinResult, generateOpeningRolls, buildBoardTemplate, parseSubmission, resolveFAChain, validateTrapAs2FA, resolve2FA, validateMovesAgainstDeck };
