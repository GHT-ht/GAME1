/**
 * Cute Monster Combat System
 * ---------------------------------------------------------------------------
 * Adds hand-drawn little monsters with their own HP, AI, attacks, damage
 * numbers, loot drops and a multi-phase boss to every island.
 *
 * This module is intentionally free of DOM / canvas / audio dependencies so it
 * can be unit tested with plain `node --test`.
 */
import type {
  Collectible,
  LevelData,
  Monster,
  MonsterKind,
  MonsterProjectile,
  MonsterSpecies,
  MonsterSpawn,
  DamageNumber,
  PlayerState,
  Platform,
  Rect,
  CombatSnapshot,
} from './types.ts';

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------
export const SLASH_DAMAGE = 2;
export const SPIN_DAMAGE = 3;
export const DASH_DAMAGE = 2;
export const STOMP_DAMAGE = 3;
export const BOSS_STOMP_DAMAGE = 2;
/** Damage gate: how long a monster ignores further hits after being struck. */
export const HIT_INVULN = 0.18;
/** How long the player has to keep a combo alive. */
export const COMBO_WINDOW = 2.5;
export const STOMP_BOUNCE = -430;
export const STOMP_BOUNCE_SUPER = -540;
export const PLAYER_KNOCKBACK_X = 200;
export const PLAYER_KNOCKBACK_Y = -250;
export const MONSTER_GRAVITY = 900;
export const MONSTER_MAX_FALL = 640;
export const MONSTER_DROWN_Y = 60;
export const MAX_PROJECTILES = 48;
export const MAX_DAMAGE_NUMBERS = 28;

export const COMBO_TIERS = [3, 6, 10, 15, 21] as const;

// ---------------------------------------------------------------------------
// Species catalogue — every monster is a small, round, big-eyed cutie
// ---------------------------------------------------------------------------
export const MONSTER_SPECIES: Record<MonsterKind, MonsterSpecies> = {
  crabling: {
    kind: 'crabling',
    name: '沙沙蟹',
    enName: 'SANDY CRABLING',
    behavior: 'patrol',
    w: 34,
    h: 26,
    maxHp: 4,
    touchDamage: 1,
    speed: 52,
    aggroRange: 190,
    attackCooldown: 1.5,
    attackRange: 62,
    windup: 0.26,
    recover: 0.35,
    pearlDrops: 1,
    heartChance: 0.22,
    fruitChance: 0.18,
    stompBounce: STOMP_BOUNCE,
    scoreValue: 120,
    armour: 1,
    taunt: '钳钳！',
  },
  jellybub: {
    kind: 'jellybub',
    name: '果冻水母',
    enName: 'JELLY BUB',
    behavior: 'flyer',
    w: 34,
    h: 32,
    maxHp: 3,
    touchDamage: 1,
    speed: 42,
    aggroRange: 230,
    attackCooldown: 2.4,
    attackRange: 200,
    windup: 0.3,
    recover: 0.4,
    projectile: 'bubble',
    pearlDrops: 1,
    heartChance: 0.26,
    fruitChance: 0.14,
    stompBounce: STOMP_BOUNCE,
    scoreValue: 100,
    armour: 1,
    taunt: '啵…啵…',
  },
  shroomling: {
    kind: 'shroomling',
    name: '蘑菇小妖',
    enName: 'SHROOMLING',
    behavior: 'patrol',
    w: 32,
    h: 34,
    maxHp: 5,
    touchDamage: 1,
    speed: 44,
    aggroRange: 210,
    attackCooldown: 1.8,
    attackRange: 210,
    windup: 0.34,
    recover: 0.45,
    projectile: 'spore',
    pearlDrops: 2,
    heartChance: 0.3,
    fruitChance: 0.2,
    stompBounce: STOMP_BOUNCE,
    scoreValue: 150,
    armour: 1,
    taunt: '孢子孢子～',
  },
  budling: {
    kind: 'budling',
    name: '花苞炮手',
    enName: 'BUDSLINGER',
    behavior: 'turret',
    w: 34,
    h: 36,
    maxHp: 4,
    touchDamage: 1,
    speed: 0,
    aggroRange: 300,
    attackCooldown: 2.1,
    attackRange: 300,
    windup: 0.4,
    recover: 0.5,
    projectile: 'seed',
    pearlDrops: 2,
    heartChance: 0.28,
    fruitChance: 0.18,
    stompBounce: STOMP_BOUNCE,
    scoreValue: 150,
    armour: 1,
    taunt: '种子雨来啦',
  },
  crystimp: {
    kind: 'crystimp',
    name: '晶石小灵',
    enName: 'CRYSTAL IMP',
    behavior: 'diver',
    w: 30,
    h: 30,
    maxHp: 3,
    touchDamage: 1,
    speed: 60,
    aggroRange: 260,
    attackCooldown: 2.0,
    attackRange: 260,
    windup: 0.5,
    recover: 0.7,
    projectile: 'shard',
    pearlDrops: 2,
    heartChance: 0.3,
    fruitChance: 0.2,
    stompBounce: STOMP_BOUNCE,
    scoreValue: 180,
    armour: 1,
    taunt: '叮铃～',
  },
  emberpup: {
    kind: 'emberpup',
    name: '火苗犬',
    enName: 'EMBER PUP',
    behavior: 'charger',
    w: 40,
    h: 32,
    maxHp: 6,
    touchDamage: 1,
    speed: 70,
    aggroRange: 280,
    attackCooldown: 2.2,
    attackRange: 300,
    windup: 0.45,
    recover: 0.9,
    pearlDrops: 3,
    heartChance: 0.4,
    fruitChance: 0.25,
    stompBounce: STOMP_BOUNCE,
    scoreValue: 220,
    armour: 1,
    taunt: '汪！烫烫烫！',
  },
  crabking: {
    kind: 'crabking',
    name: '巨蟹王 · 钳钳',
    enName: 'CRAB KING PINCHY',
    behavior: 'boss',
    w: 84,
    h: 70,
    maxHp: 14,
    touchDamage: 1,
    speed: 46,
    aggroRange: 720,
    attackCooldown: 2.0,
    attackRange: 460,
    windup: 0.55,
    recover: 1.0,
    projectile: 'shockwave',
    minion: 'crabling',
    pearlDrops: 6,
    heartChance: 1,
    fruitChance: 0.8,
    stompBounce: STOMP_BOUNCE_SUPER,
    scoreValue: 1500,
    armour: 0.5,
    isBoss: true,
    taunt: '谁敢踩我的沙滩！',
  },
  shroomlord: {
    kind: 'shroomlord',
    name: '蘑菇大王 · 伞伞',
    enName: 'SHROOM LORD UMBRA',
    behavior: 'boss',
    w: 78,
    h: 78,
    maxHp: 16,
    touchDamage: 1,
    speed: 42,
    aggroRange: 760,
    attackCooldown: 1.9,
    attackRange: 480,
    windup: 0.6,
    recover: 1.05,
    projectile: 'spore',
    minion: 'shroomling',
    pearlDrops: 7,
    heartChance: 1,
    fruitChance: 0.8,
    stompBounce: STOMP_BOUNCE_SUPER,
    scoreValue: 1600,
    armour: 0.5,
    isBoss: true,
    taunt: '我的孢子最可爱！',
  },
  crystalsphinx: {
    kind: 'crystalsphinx',
    name: '晶石领主 · 闪闪',
    enName: 'CRYSTAL SPHINX SHIMMER',
    behavior: 'boss',
    w: 80,
    h: 74,
    maxHp: 18,
    touchDamage: 1,
    speed: 48,
    aggroRange: 800,
    attackCooldown: 1.8,
    attackRange: 500,
    windup: 0.55,
    recover: 1.0,
    projectile: 'shard',
    minion: 'crystimp',
    pearlDrops: 8,
    heartChance: 1,
    fruitChance: 0.9,
    stompBounce: STOMP_BOUNCE_SUPER,
    scoreValue: 1800,
    armour: 0.5,
    isBoss: true,
    taunt: '晚霞是我的宝石！',
  },
};

let monsterIdCounter = 0;

export function monsterBox(m: Monster): Rect {
  return { x: m.x, y: m.y, w: m.w, h: m.h };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------
export function createMonster(spawn: MonsterSpawn, index = 0): Monster {
  const species = MONSTER_SPECIES[spawn.kind];
  const phase = spawn.phase ?? index * 0.37;
  return {
    id: `mon_${spawn.kind}_${index}_${monsterIdCounter++}`,
    kind: spawn.kind,
    x: spawn.x,
    y: spawn.y,
    w: species.w,
    h: species.h,
    vx: 0,
    vy: 0,
    hp: species.maxHp,
    maxHp: species.maxHp,
    facing: 1,
    grounded: false,
    state: 'patrol',
    stateTimer: 0,
    attackCooldown: 0.6 + phase * 0.4,
    hurtTimer: 0,
    hitCooldown: 0,
    hitFlash: 0,
    invulnTimer: 0,
    animTime: phase,
    homeX: spawn.x,
    homeY: spawn.y,
    patrolRange: spawn.patrolRange ?? (species.isBoss ? 0 : 120),
    phase,
    aggro: false,
    barTrail: 1,
    squashX: 1,
    squashY: 1,
    defeated: false,
    deathTimer: 0,
    variant: spawn.variant ?? 0,
    blinkTimer: 1 + phase,
    isBoss: Boolean(species.isBoss),
    enraged: false,
    minionsSummoned: 0,
    damageTaken: 0,
    lastHitBy: 'none',
    pendingAttack: 'none',
  };
}

export function createMonsters(level: LevelData): Monster[] {
  const spawns = level.monsters ?? [];
  return spawns.map((spawn, i) => createMonster(spawn, i));
}

export function createProjectilePool(size = MAX_PROJECTILES): MonsterProjectile[] {
  const pool: MonsterProjectile[] = [];
  for (let i = 0; i < size; i++) {
    pool.push({
      active: false,
      kind: 'spore',
      x: 0,
      y: 0,
      w: 14,
      h: 14,
      vx: 0,
      vy: 0,
      gravity: 0,
      life: 0,
      maxLife: 1,
      damage: 1,
      spin: 0,
      variant: 0,
      grounded: false,
    });
  }
  return pool;
}

export function createDamageNumberPool(size = MAX_DAMAGE_NUMBERS): DamageNumber[] {
  const pool: DamageNumber[] = [];
  for (let i = 0; i < size; i++) {
    pool.push({
      active: false,
      x: 0,
      y: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      text: '',
      color: '#ffffff',
      scale: 1,
    });
  }
  return pool;
}

export function pushDamageNumber(
  pool: DamageNumber[],
  x: number,
  y: number,
  text: string,
  color = '#ffffff',
  scale = 1
): void {
  for (let i = 0; i < pool.length; i++) {
    const d = pool[i];
    if (!d.active) {
      d.active = true;
      d.x = x;
      d.y = y;
      d.vy = -46;
      d.life = 0.75;
      d.maxLife = 0.75;
      d.text = text;
      d.color = color;
      d.scale = scale;
      return;
    }
  }
}

export function activeProjectile(pool: MonsterProjectile[]): MonsterProjectile | null {
  for (let i = 0; i < pool.length; i++) {
    if (!pool[i].active) return pool[i];
  }
  return null;
}

function fireProjectile(
  pool: MonsterProjectile[],
  kind: MonsterProjectile['kind'],
  x: number,
  y: number,
  vx: number,
  vy: number,
  opts: { gravity?: number; life?: number; damage?: number; size?: number; variant?: number; grounded?: boolean } = {}
): boolean {
  const p = activeProjectile(pool);
  if (!p) return false;
  const size = opts.size ?? 14;
  p.active = true;
  p.kind = kind;
  p.x = x - size * 0.5;
  p.y = y - size * 0.5;
  p.w = size;
  p.h = size;
  p.vx = vx;
  p.vy = vy;
  p.gravity = opts.gravity ?? 0;
  p.life = opts.life ?? 3;
  p.maxLife = p.life;
  p.damage = opts.damage ?? 1;
  p.spin = 0;
  p.variant = opts.variant ?? 0;
  p.grounded = opts.grounded ?? false;
  return true;
}

// ---------------------------------------------------------------------------
// Physics helpers for monsters
// ---------------------------------------------------------------------------
function groundBelow(platforms: Platform[], rect: Rect, drop = 8): boolean {
  const probe: Rect = { x: rect.x + 3, y: rect.y + rect.h, w: rect.w - 6, h: drop };
  for (const plat of platforms) {
    if (plat.type === 'bouncy') continue;
    if (rectsOverlap(probe, plat)) return true;
  }
  return false;
}

function wallAhead(platforms: Platform[], rect: Rect, dir: number): boolean {
  const probe: Rect = { x: dir > 0 ? rect.x + rect.w : rect.x - 6, y: rect.y + 4, w: 6, h: rect.h - 8 };
  for (const plat of platforms) {
    if (plat.type !== 'solid') continue;
    if (rectsOverlap(probe, plat)) return true;
  }
  return false;
}

function moveWithPlatforms(m: Monster, level: LevelData, dt: number, useGravity: boolean): void {
  const platforms = level.platforms;

  // Horizontal integration with solid wall resolution
  m.x += m.vx * dt;
  const box: Rect = { x: m.x, y: m.y, w: m.w, h: m.h };
  for (const plat of platforms) {
    if (plat.type !== 'solid') continue;
    if (rectsOverlap(box, plat)) {
      if (m.vx > 0) m.x = plat.x - m.w;
      else if (m.vx < 0) m.x = plat.x + plat.w;
      m.vx = 0;
      box.x = m.x;
    }
  }

  if (m.x < 0) {
    m.x = 0;
    m.vx = Math.abs(m.vx);
  }
  if (m.x + m.w > level.worldWidth) {
    m.x = level.worldWidth - m.w;
    m.vx = -Math.abs(m.vx);
  }

  if (!useGravity) {
    m.y += m.vy * dt;
    if (m.y < 0) m.y = 0;
    return;
  }

  const prevY = m.y;
  m.vy = Math.min(m.vy + MONSTER_GRAVITY * dt, MONSTER_MAX_FALL);
  m.y += m.vy * dt;

  const wasGrounded = m.grounded;
  m.grounded = false;
  const boxY: Rect = { x: m.x, y: m.y, w: m.w, h: m.h };

  for (const plat of platforms) {
    if (plat.type === 'solid') {
      if (rectsOverlap(boxY, plat)) {
        if (m.vy > 0 && prevY + m.h <= plat.y + 14) {
          m.y = plat.y - m.h;
          m.vy = 0;
          m.grounded = true;
        } else if (m.vy < 0 && prevY >= plat.y + plat.h - 12) {
          m.y = plat.y + plat.h;
          m.vy = 0;
        }
      }
    } else if (plat.type === 'one-way' || plat.type === 'moving' || plat.type === 'sand') {
      if (
        m.vy >= 0 &&
        prevY + m.h <= plat.y + 14 &&
        m.y + m.h >= plat.y &&
        m.x + m.w > plat.x + 3 &&
        m.x < plat.x + plat.w - 3
      ) {
        m.y = plat.y - m.h;
        m.vy = 0;
        m.grounded = true;
      }
    }
  }

  if (!wasGrounded && m.grounded && m.vy === 0) {
    m.squashX = 1.18;
    m.squashY = 0.84;
  }
}

function hasGroundAhead(m: Monster, level: LevelData, dir: number): boolean {
  const probe: Rect = {
    x: dir > 0 ? m.x + m.w - 4 : m.x - 8,
    y: m.y + m.h - 2,
    w: 12,
    h: 4,
  };
  return groundBelow(level.platforms, probe, 14);
}

// ---------------------------------------------------------------------------
// Damage helpers
// ---------------------------------------------------------------------------
function barRatio(m: Monster): number {
  return m.maxHp > 0 ? Math.max(0, m.hp / m.maxHp) : 0;
}

export interface MonsterHitResult {
  damaged: boolean;
  defeated: boolean;
  damage: number;
}

export function damageMonster(
  m: Monster,
  amount: number,
  dirX: number,
  source: Monster['lastHitBy'],
  damageNumbers?: DamageNumber[]
): MonsterHitResult {
  if (m.defeated || m.hp <= 0) return { damaged: false, defeated: false, damage: 0 };
  if (m.hitCooldown > 0 || m.invulnTimer > 0) return { damaged: false, defeated: false, damage: 0 };

  const species = MONSTER_SPECIES[m.kind];
  const armoured = m.state === 'attacking' && species.armour < 1;
  const finalDamage = Math.max(1, Math.round(amount * (armoured ? species.armour : 1)));

  m.hp = Math.max(0, m.hp - finalDamage);
  m.damageTaken += finalDamage;
  m.hitCooldown = HIT_INVULN;
  m.hitFlash = 0.18;
  m.hurtTimer = 0.26;
  m.lastHitBy = source;
  m.barTrail = Math.max(m.barTrail, barRatio(m) + 0.12);
  m.squashX = 1.3;
  m.squashY = 0.72;

  // Knock-back, bosses only flinch a little
  const knock = species.isBoss ? 30 : 130;
  if (m.state !== 'attacking' || !species.isBoss) {
    m.vx += dirX * knock;
  }

  if (m.state === 'telegraph' && !species.isBoss) {
    // Interrupting a wind-up is rewarded
    m.state = 'recover';
    m.stateTimer = 0.4;
  }

  const defeated = m.hp <= 0;
  if (defeated) {
    m.defeated = true;
    m.state = 'dead';
    m.deathTimer = 0.55;
    m.vx = dirX * 40;
    m.vy = -120;
    m.squashX = 1.35;
    m.squashY = 0.7;
  }

  if (damageNumbers) {
    pushDamageNumber(
      damageNumbers,
      m.x + m.w * 0.5,
      m.y - 4,
      `${finalDamage}`,
      defeated ? '#fde047' : '#ffffff',
      defeated ? 1.35 : 1
    );
    if (armoured) {
      pushDamageNumber(damageNumbers, m.x + m.w * 0.5 + 12, m.y - 16, '护甲', '#a5b4fc', 0.8);
    }
  }

  return { damaged: true, defeated, damage: finalDamage };
}

// ---------------------------------------------------------------------------
// Main update
// ---------------------------------------------------------------------------
export interface CombatEvents {
  playerHurt: boolean;
  hurtSource: 'contact' | 'projectile' | 'slam' | 'none';
  monstersHit: Monster[];
  monstersDefeated: Monster[];
  bossEnraged: boolean;
  bossSlammed: boolean;
  /** World position of the boss slam impact, used for dust and decals. */
  slamX: number;
  slamY: number;
  bossSummoned: Monster[];
  projectilesFired: number;
  comboCount: number;
  comboUp: boolean;
  comboBroken: boolean;
  stomped: boolean;
  stompChain: number;
  slashed: boolean;
  spinAttack: boolean;
  dashHit: boolean;
  hitStop: number;
  shake: number;
}

function emptyEvents(): CombatEvents {
  return {
    playerHurt: false,
    hurtSource: 'none',
    monstersHit: [],
    monstersDefeated: [],
    bossEnraged: false,
    bossSlammed: false,
    slamX: 0,
    slamY: 0,
    bossSummoned: [],
    projectilesFired: 0,
    comboCount: 0,
    comboUp: false,
    comboBroken: false,
    stomped: false,
    stompChain: 0,
    slashed: false,
    spinAttack: false,
    dashHit: false,
    hitStop: 0,
    shake: 0,
  };
}

export function slashHitbox(player: PlayerState): Rect {
  const spinning = player.attackIndex === 2;
  if (spinning) {
    const w = player.w + 76;
    const h = player.h + 26;
    return { x: player.x + player.w * 0.5 - w * 0.5, y: player.y + player.h * 0.5 - h * 0.5, w, h };
  }
  const w = 44;
  const h = player.h + 12;
  return {
    x: player.facing > 0 ? player.x + player.w - 6 : player.x - w + 6,
    y: player.y - 6,
    w,
    h,
  };
}

export function dashHitbox(player: PlayerState): Rect {
  return { x: player.x - 8, y: player.y - 6, w: player.w + 16, h: player.h + 12 };
}

/** Public helper so the HUD can read the boss state without touching internals. */
export function buildCombatSnapshot(
  monsters: Monster[],
  player: PlayerState,
  bestCombo: number,
  hearts: number
): CombatSnapshot {
  let remaining = 0;
  let defeated = 0;
  let boss: Monster | null = null;
  for (const m of monsters) {
    if (MONSTER_SPECIES[m.kind].isBoss && !m.defeated) boss = m;
    if (m.defeated) defeated++;
    else remaining++;
  }
  const bossSpecies = boss ? MONSTER_SPECIES[boss.kind] : null;
  // The big bar only appears once the guardian notices you or takes damage
  const bossEngaged = Boolean(boss && (boss.aggro || boss.hp < boss.maxHp || boss.enraged));
  return {
    total: monsters.length,
    remaining,
    defeated,
    combo: player.comboCount,
    bestCombo,
    bossActive: bossEngaged,
    bossName: bossSpecies ? bossSpecies.name : '',
    bossEn: bossSpecies ? bossSpecies.enName : '',
    bossHp: boss ? boss.hp : 0,
    bossMaxHp: boss ? boss.maxHp : 0,
    bossTaunt: bossSpecies ? bossSpecies.taunt ?? '' : '',
    heartsDropped: hearts,
  };
}

/**
 * Advances every monster, projectile and floating damage number and resolves
 * all combat interactions with the player.
 *
 * Mutates `monsters`, `projectiles`, `damageNumbers`, `player` and `level`
 * (defeated monsters append loot to `level.collectibles`).
 */
export function updateMonsters(
  monsters: Monster[],
  projectiles: MonsterProjectile[],
  damageNumbers: DamageNumber[],
  player: PlayerState,
  level: LevelData,
  dt: number
): CombatEvents {
  const events = emptyEvents();
  const step = Math.min(dt, 0.05);
  const playerBox: Rect = { x: player.x, y: player.y, w: player.w, h: player.h };
  const playerCentreX = player.x + player.w * 0.5;
  const playerCentreY = player.y + player.h * 0.5;

  // --- Combo decay / passive timers ---------------------------------------
  if (player.comboTimer > 0) {
    player.comboTimer = Math.max(0, player.comboTimer - step);
    if (player.comboTimer === 0 && player.comboCount > 0) {
      player.comboCount = 0;
      events.comboBroken = true;
    }
  }

  // --- Player attack windows ---------------------------------------------
  const swingActive = player.attackTimer > 0;
  const slashBox = swingActive ? slashHitbox(player) : null;
  const dashBox = player.isDashing ? dashHitbox(player) : null;

  for (let i = 0; i < damageNumbers.length; i++) {
    const d = damageNumbers[i];
    if (!d.active) continue;
    d.life -= step;
    if (d.life <= 0) {
      d.active = false;
      continue;
    }
    d.y += d.vy * step;
    d.vy += 22 * step;
  }

  // --- Monsters -----------------------------------------------------------
  const spawnedMinions: Monster[] = [];

  for (const m of monsters) {
    const species = MONSTER_SPECIES[m.kind];
    m.animTime += step;
    if (m.blinkTimer > 0) m.blinkTimer -= step;
    else m.blinkTimer = 1.6 + Math.random() * 2.4;
    if (m.hitFlash > 0) m.hitFlash = Math.max(0, m.hitFlash - step);
    if (m.hurtTimer > 0) m.hurtTimer = Math.max(0, m.hurtTimer - step);
    if (m.hitCooldown > 0) m.hitCooldown = Math.max(0, m.hitCooldown - step);
    if (m.invulnTimer > 0) m.invulnTimer = Math.max(0, m.invulnTimer - step);
    if (m.attackCooldown > 0) m.attackCooldown = Math.max(0, m.attackCooldown - step);
    m.barTrail += (barRatio(m) - m.barTrail) * Math.min(1, step * 2.2);
    m.squashX += (1 - m.squashX) * Math.min(1, step * 10);
    m.squashY += (1 - m.squashY) * Math.min(1, step * 10);

    if (m.defeated) {
      m.deathTimer -= step;
      if (m.deathTimer <= 0) continue;
      // Little death tumble
      m.vy = Math.min(m.vy + MONSTER_GRAVITY * step, MONSTER_MAX_FALL);
      m.x += m.vx * step;
      m.y += m.vy * step;
      continue;
    }

    // Boss enrage at half health
    if (species.isBoss && !m.enraged && m.hp <= m.maxHp * 0.5) {
      m.enraged = true;
      m.attackCooldown = Math.min(m.attackCooldown, 0.4);
      m.squashX = 1.3;
      m.squashY = 1.3;
      events.bossEnraged = true;
      events.shake = Math.max(events.shake, 0.55);
    }

    const dx = playerCentreX - (m.x + m.w * 0.5);
    const dy = playerCentreY - (m.y + m.h * 0.5);
    const distX = Math.abs(dx);
    const distY = Math.abs(dy);
    const dist = Math.hypot(dx, dy);
    m.aggro = dist < species.aggroRange;

    // ---------------------------------------------------------------- AI
    switch (species.behavior) {
      case 'patrol':
      case 'charger': {
        const enragedBoost = m.enraged ? 1.25 : 1;
        if (m.state === 'hurt') {
          m.stateTimer -= step;
          m.vx *= 0.86;
          if (m.stateTimer <= 0) m.state = 'patrol';
        } else if (m.state === 'telegraph') {
          m.stateTimer -= step;
          m.vx *= 0.8;
          if (m.stateTimer <= 0) {
            m.state = 'attacking';
            m.stateTimer = species.behavior === 'charger' ? 1.15 : 0.3;
            m.squashX = 1.25;
            m.squashY = 0.8;
            if (species.behavior === 'charger') {
              m.vx = m.facing * species.speed * 3.1 * enragedBoost;
            } else {
              m.vx = m.facing * species.speed * 2.4;
              m.vy = -140;
            }
            if (species.projectile) {
              spitProjectile(m, species, player, projectiles, events);
            }
          }
        } else if (m.state === 'attacking') {
          m.stateTimer -= step;
          if (species.behavior === 'charger') {
            m.vy = Math.min(m.vy, 40);
            const blocked = wallAhead(level.platforms, monsterBox(m), m.facing > 0 ? 1 : -1);
            const ledge = m.grounded && !hasGroundAhead(m, level, m.facing > 0 ? 1 : -1);
            if (blocked || ledge || m.stateTimer <= 0) {
              m.state = 'recover';
              m.stateTimer = species.recover;
              m.vx = 0;
              m.squashX = 0.8;
              m.squashY = 1.3;
              if (m.stateTimer > 0.3) events.shake = Math.max(events.shake, 0.22);
            }
          } else if (m.stateTimer <= 0) {
            m.state = 'recover';
            m.stateTimer = species.recover;
          }
        } else if (m.state === 'recover') {
          m.stateTimer -= step;
          m.vx *= 0.8;
          if (m.stateTimer <= 0) {
            m.state = 'patrol';
            m.attackCooldown = species.attackCooldown;
          }
        } else {
          // patrol / chase
          if (m.aggro && distY < 110) {
            m.state = 'chase';
            m.facing = dx >= 0 ? 1 : -1;
            if (distX < species.attackRange && m.attackCooldown <= 0) {
              m.state = 'telegraph';
              m.stateTimer = species.windup;
              m.pendingAttack = species.projectile ? 'spit' : 'lunge';
            } else if (species.behavior === 'charger') {
              m.vx = m.facing * species.speed * 0.9 * enragedBoost;
            } else {
              m.vx = m.facing * species.speed * 1.15 * enragedBoost;
            }
            if (m.grounded && !hasGroundAhead(m, level, m.facing > 0 ? 1 : -1)) {
              m.vx *= 0.2;
              // Cute pause at the cliff edge
              m.state = 'recover';
              m.stateTimer = 0.35;
            }
          } else {
            m.state = 'patrol';
            if (m.vx === 0) m.vx = m.facing * species.speed;
            if (Math.abs(m.x - m.homeX) > m.patrolRange) {
              m.facing = m.x > m.homeX ? -1 : 1;
            }
            if (m.grounded && !hasGroundAhead(m, level, m.facing > 0 ? 1 : -1)) {
              m.facing = (m.facing * -1) as 1 | -1;
            }
            m.vx = m.facing * species.speed;
          }
        }
        break;
      }

      case 'flyer': {
        const bob = Math.sin(m.animTime * 2.1 + m.phase) * 12;
        const targetY = m.homeY + bob;
        if (m.aggro) {
          m.facing = dx >= 0 ? 1 : -1;
          m.vx += (Math.sign(dx) * species.speed - m.vx) * Math.min(1, step * 1.6);
          m.vy += ((playerCentreY - m.h * 0.5 - m.y) * 1.6 - m.vy) * Math.min(1, step * 1.4);
          if (m.attackCooldown <= 0 && dist < species.attackRange && species.projectile) {
            m.attackCooldown = species.attackCooldown;
            fireProjectile(
              projectiles,
              species.projectile,
              m.x + m.w * 0.5,
              m.y + m.h * 0.6,
              Math.sign(dx) * 90,
              40,
              { gravity: -30, life: 3.2, size: 14, variant: m.variant }
            );
            events.projectilesFired++;
          }
        } else {
          m.vx += (Math.sign(m.homeX - m.x) * species.speed * 0.4 - m.vx) * Math.min(1, step * 1.2);
          m.vy += ((targetY - m.y) * 1.6 - m.vy) * Math.min(1, step * 1.4);
        }
        m.x += m.vx * step;
        m.y += m.vy * step;
        m.x = Math.max(0, Math.min(m.x, level.worldWidth - m.w));
        break;
      }

      case 'turret': {
        m.vx = 0;
        m.vy = Math.min(m.vy + MONSTER_GRAVITY * step, MONSTER_MAX_FALL);
        if (m.aggro) {
          m.facing = dx >= 0 ? 1 : -1;
          if (m.attackCooldown <= 0) {
            m.state = 'telegraph';
            m.stateTimer = species.windup;
            m.attackCooldown = species.attackCooldown;
            m.pendingAttack = 'lob';
          }
        }
        if (m.state === 'telegraph') {
          m.stateTimer -= step;
          if (m.stateTimer <= 0) {
            m.state = 'patrol';
            lobProjectile(m, species, player, projectiles, events);
          }
        }
        break;
      }

      case 'diver': {
        if (m.state === 'telegraph') {
          m.stateTimer -= step;
          m.vx *= 0.8;
          m.vy = Math.min(m.vy, -30) + (m.homeY - 14 - m.y) * 0.02;
          if (m.stateTimer <= 0) {
            m.state = 'attacking';
            m.stateTimer = 0.68;
            const k = 190;
            const len = Math.max(1, Math.hypot(dx, dy));
            m.vx = (dx / len) * k;
            m.vy = (dy / len) * k;
            m.squashX = 0.78;
            m.squashY = 1.28;
          }
        } else if (m.state === 'attacking') {
          m.stateTimer -= step;
          if (m.stateTimer <= 0) {
            m.state = 'recover';
            m.stateTimer = species.recover;
          }
        } else if (m.state === 'recover') {
          m.stateTimer -= step;
          m.vx += ((m.homeX - m.x) * 1.5 - m.vx) * Math.min(1, step * 2);
          m.vy += ((m.homeY - m.y) * 1.5 - m.vy) * Math.min(1, step * 2);
          if (m.stateTimer <= 0) {
            m.state = 'patrol';
            m.attackCooldown = species.attackCooldown;
          }
        } else {
          const bob = Math.sin(m.animTime * 2.4 + m.phase) * 10;
          if (m.aggro && m.attackCooldown <= 0) {
            m.state = 'telegraph';
            m.stateTimer = species.windup;
            m.facing = dx >= 0 ? 1 : -1;
          } else if (m.aggro) {
            m.facing = dx >= 0 ? 1 : -1;
            m.vx += (Math.sign(dx) * species.speed * 0.5 - m.vx) * Math.min(1, step * 1.4);
            m.vy += ((playerCentreY - m.h * 0.5 - 40 - m.y) * 1.2 - m.vy) * Math.min(1, step * 1.2);
          } else {
            m.vx += ((m.homeX - m.x) * 1.2 - m.vx) * Math.min(1, step * 1.2);
            m.vy += ((m.homeY + bob - m.y) * 1.2 - m.vy) * Math.min(1, step * 1.2);
          }
        }
        m.x += m.vx * step;
        m.y += m.vy * step;
        m.x = Math.max(0, Math.min(m.x, level.worldWidth - m.w));
        m.y = Math.max(0, m.y);
        break;
      }

      case 'boss': {
        const boost = m.enraged ? 1.3 : 1;
        if (m.state === 'telegraph') {
          m.stateTimer -= step;
          m.vx *= 0.85;
          if (m.stateTimer <= 0) {
            m.state = 'attacking';
            m.stateTimer = m.pendingAttack === 'slam' ? 1.6 : m.pendingAttack === 'charge' ? 1.5 : 0.8;
            m.squashX = 1.28;
            m.squashY = 0.78;
            if (m.pendingAttack === 'slam') {
              m.vy = -520;
              m.vx = Math.sign(dx) * 130;
            } else if (m.pendingAttack === 'charge') {
              m.vx = (dx >= 0 ? 1 : -1) * species.speed * 3.4 * boost;
              events.shake = Math.max(events.shake, 0.3);
            } else if (m.pendingAttack === 'summon') {
              m.minionsSummoned++;
              const minionKind = species.minion ?? 'crabling';
              const fresh: Monster[] = [];
              for (let k = 0; k < 2; k++) {
                const child = createMonster(
                  {
                    kind: minionKind,
                    x: m.x + (k === 0 ? -70 : m.w + 36),
                    y: m.y + m.h - MONSTER_SPECIES[minionKind].h - 6,
                    patrolRange: 70,
                    variant: m.variant,
                  },
                  monsters.length + spawnedMinions.length + k
                );
                fresh.push(child);
                spawnedMinions.push(child);
              }
              events.bossSummoned.push(...fresh);
              events.shake = Math.max(events.shake, 0.45);
            } else if (m.pendingAttack === 'lob' || m.pendingAttack === 'spit') {
              spitProjectile(m, species, player, projectiles, events);
              lobProjectile(m, species, player, projectiles, events);
            }
          }
        } else if (m.state === 'attacking') {
          m.stateTimer -= step;
          if (m.pendingAttack === 'slam') {
            m.vx *= 0.985;
            if (m.grounded && m.vy >= 0 && m.stateTimer < 1.2) {
              // Landing shockwave
              fireProjectile(projectiles, 'shockwave', m.x + m.w * 0.5, m.y + m.h - 16, -230, 0, {
                gravity: 0,
                life: 1.5,
                size: 24,
                variant: m.variant,
                grounded: true,
              });
              fireProjectile(projectiles, 'shockwave', m.x + m.w * 0.5, m.y + m.h - 16, 230, 0, {
                gravity: 0,
                life: 1.5,
                size: 24,
                variant: m.variant,
                grounded: true,
              });
              events.projectilesFired += 2;
              events.bossSlammed = true;
              events.slamX = m.x + m.w * 0.5;
              events.slamY = m.y + m.h;
              events.shake = Math.max(events.shake, 0.6);
              m.state = 'recover';
              m.stateTimer = species.recover;
              m.squashX = 1.35;
              m.squashY = 0.7;
            }
          } else if (m.pendingAttack === 'charge') {
            const blocked = wallAhead(level.platforms, monsterBox(m), m.facing > 0 ? 1 : -1);
            const ledge = m.grounded && !hasGroundAhead(m, level, m.facing > 0 ? 1 : -1);
            if (blocked || ledge || m.stateTimer <= 0) {
              m.state = 'recover';
              m.stateTimer = species.recover;
              m.vx = 0;
              events.shake = Math.max(events.shake, 0.3);
            }
          } else if (m.stateTimer <= 0) {
            m.state = 'recover';
            m.stateTimer = species.recover;
          }
        } else if (m.state === 'recover') {
          m.stateTimer -= step;
          m.vx *= 0.86;
          if (m.stateTimer <= 0) {
            m.state = 'patrol';
            m.attackCooldown = species.attackCooldown * (m.enraged ? 0.65 : 1);
          }
        } else {
          m.facing = dx >= 0 ? 1 : -1;
          if (distX > 90) {
            m.vx = m.facing * species.speed * 0.75 * boost;
          } else {
            m.vx *= 0.85;
          }
          if (!hasGroundAhead(m, level, m.facing > 0 ? 1 : -1)) m.vx = 0;
          if (m.attackCooldown <= 0) {
            m.state = 'telegraph';
            m.stateTimer = species.windup;
            if (m.enraged && m.minionsSummoned < 2 && m.hp < m.maxHp * 0.5) {
              m.pendingAttack = 'summon';
            } else if (m.enraged && Math.random() < 0.5) {
              m.pendingAttack = 'charge';
            } else {
              m.pendingAttack = 'slam';
            }
          }
        }
        break;
      }
    }

    if (
      species.behavior === 'patrol' ||
      species.behavior === 'charger' ||
      species.behavior === 'boss' ||
      species.behavior === 'turret'
    ) {
      moveWithPlatforms(m, level, step, true);
    }

    // Drowning / falling out of the world
    if (m.y > level.worldHeight - MONSTER_DROWN_Y && !m.grounded) {
      m.defeated = true;
      m.state = 'dead';
      m.deathTimer = 0;
      m.lastHitBy = 'none';
      continue;
    }

    // ------------------------------------------------- Player interaction
    const box = monsterBox(m);
    const overlapping = rectsOverlap(playerBox, box);
    const playerBottom = player.y + player.h;
    const stomping =
      player.vy > 60 &&
      overlapping &&
      playerBottom <= m.y + m.h * 0.45 &&
      player.y + player.h * 0.5 < m.y + m.h * 0.5;

    // Track whether this monster was struck this frame: hitting first should
    // not punish the player with simultaneous contact damage.
    const hpBeforeSwing = m.hp;

    if (stomping && !m.defeated) {
      const dmg = species.isBoss ? BOSS_STOMP_DAMAGE : STOMP_DAMAGE;
      const result = damageMonster(m, dmg, 0, 'stomp', damageNumbers);
      if (result.damaged) {
        player.vy = species.stompBounce;
        player.jumpsLeft = player.maxJumps ?? 3;
        player.airDashesLeft = player.maxAirDashes ?? 3;
        player.dashCooldown = 0;
        player.stompChain += 1;
        player.squashX = 0.82;
        player.squashY = 1.22;
        events.stomped = true;
        events.stompChain = player.stompChain;
        events.monstersHit.push(m);
        events.hitStop = Math.max(events.hitStop, 0.055);
        events.shake = Math.max(events.shake, 0.16);
        registerCombo(player, events, 1);
        if (result.defeated) events.monstersDefeated.push(m);
      }
      continue;
    }

    // Slash / spin
    if (slashBox && rectsOverlap(slashBox, box)) {
      const spinning = player.attackIndex === 2;
      const dmg = spinning ? SPIN_DAMAGE : SLASH_DAMAGE;
      const dirX = player.facing;
      const result = damageMonster(m, dmg, dirX, 'slash', damageNumbers);
      if (result.damaged) {
        events.slashed = true;
        events.spinAttack = events.spinAttack || spinning;
        events.monstersHit.push(m);
        events.hitStop = Math.max(events.hitStop, spinning ? 0.07 : 0.035);
        events.shake = Math.max(events.shake, spinning ? 0.22 : 0.1);
        registerCombo(player, events, 1);
        if (result.defeated) events.monstersDefeated.push(m);
      }
    }

    // Dash strike
    if (dashBox && rectsOverlap(dashBox, box)) {
      const result = damageMonster(m, DASH_DAMAGE, player.facing, 'dash', damageNumbers);
      if (result.damaged) {
        events.dashHit = true;
        events.monstersHit.push(m);
        events.hitStop = Math.max(events.hitStop, 0.05);
        events.shake = Math.max(events.shake, 0.18);
        registerCombo(player, events, 1);
        if (result.defeated) events.monstersDefeated.push(m);
      }
    } else if (
      overlapping &&
      !player.isDashing &&
      player.invulnerableTimer <= 0 &&
      !m.defeated &&
      m.hp > 0 &&
      m.hp >= hpBeforeSwing // avoid double-punishing a trade the player won
    ) {
      // Contact damage
      hurtPlayer(player, species.touchDamage, m.x + m.w * 0.5 < playerCentreX ? 1 : -1, events, 'contact');
      m.squashX = 1.2;
      m.squashY = 0.85;
    }

    // Projectile-only monsters may also fire while chasing
  }

  if (spawnedMinions.length > 0) {
    monsters.push(...spawnedMinions);
  }

  // --- Projectiles --------------------------------------------------------
  for (const p of projectiles) {
    if (!p.active) continue;
    p.life -= step;
    if (p.life <= 0) {
      p.active = false;
      continue;
    }
    p.spin += step * 6;
    if (!p.grounded) p.vy += p.gravity * step;
    p.x += p.vx * step;
    p.y += p.vy * step;

    if (p.x < -80 || p.x > level.worldWidth + 80 || p.y > level.worldHeight + 40) {
      p.active = false;
      continue;
    }

    // Solid terrain stops projectiles (shockwaves glide over sand)
    let blocked = false;
    if (!p.grounded) {
      const pBox: Rect = { x: p.x, y: p.y, w: p.w, h: p.h };
      for (const plat of level.platforms) {
        if (plat.type !== 'solid') continue;
        if (rectsOverlap(pBox, plat)) {
          blocked = true;
          break;
        }
      }
    }
    if (blocked) {
      p.active = false;
      continue;
    }

    if (p.grounded) {
      // follow the ground height so shockwaves hug the terrain
      const pBox: Rect = { x: p.x, y: p.y + p.h, w: p.w, h: 10 };
      for (const plat of level.platforms) {
        if (rectsOverlap(pBox, plat) && (plat.type === 'solid' || plat.type === 'sand' || plat.type === 'one-way')) {
          p.y = plat.y - p.h;
          break;
        }
      }
    }

    if (player.invulnerableTimer <= 0 && !player.isDashing) {
      const pBox: Rect = { x: p.x, y: p.y, w: p.w, h: p.h };
      if (rectsOverlap(pBox, playerBox)) {
        p.active = false;
        hurtPlayer(player, p.damage, Math.sign(p.vx) || 1, events, p.grounded ? 'slam' : 'projectile');
      }
    }
  }

  events.comboCount = player.comboCount;
  return events;
}

function registerCombo(player: PlayerState, events: CombatEvents, amount: number) {
  player.comboCount += amount;
  player.comboTimer = COMBO_WINDOW;
  events.comboUp = true;
  events.comboCount = player.comboCount;
}

function hurtPlayer(
  player: PlayerState,
  damage: number,
  dirX: number,
  events: CombatEvents,
  source: CombatEvents['hurtSource']
) {
  if (player.invulnerableTimer > 0 || player.isDashing) return;
  player.health = Math.max(0, player.health - damage);
  player.invulnerableTimer = 1.2;
  player.vx = -dirX * PLAYER_KNOCKBACK_X;
  player.vy = PLAYER_KNOCKBACK_Y;
  player.grounded = false;
  player.stompChain = 0;
  if (player.comboCount > 0) {
    player.comboCount = 0;
    player.comboTimer = 0;
    events.comboBroken = true;
  }
  events.playerHurt = true;
  events.hurtSource = source;
  events.hitStop = Math.max(events.hitStop, 0.07);
  events.shake = Math.max(events.shake, 0.4);
}

function spitProjectile(
  m: Monster,
  species: MonsterSpecies,
  player: PlayerState,
  projectiles: MonsterProjectile[],
  events: CombatEvents
) {
  if (!species.projectile) return;
  const dx = player.x + player.w * 0.5 - (m.x + m.w * 0.5);
  const dy = player.y + player.h * 0.5 - (m.y + m.h * 0.4);
  const speed = 175;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ok = fireProjectile(
    projectiles,
    species.projectile,
    m.x + m.w * 0.5 + Math.sign(dx) * m.w * 0.4,
    m.y + m.h * 0.4,
    (dx / len) * speed,
    (dy / len) * speed - 20,
    { gravity: 120, life: 3, size: 15, variant: m.variant }
  );
  if (ok) events.projectilesFired++;
}

function lobProjectile(
  m: Monster,
  species: MonsterSpecies,
  player: PlayerState,
  projectiles: MonsterProjectile[],
  events: CombatEvents
) {
  const kind = species.projectile ?? 'seed';
  const startX = m.x + m.w * 0.5;
  const startY = m.y + m.h * 0.25;
  const targetX = player.x + player.w * 0.5;
  const targetY = player.y + player.h * 0.5;
  const flight = 0.9;
  const g = 520;
  const vx = (targetX - startX) / flight;
  const vy = (targetY - startY - 0.5 * g * flight * flight) / flight;
  const ok = fireProjectile(projectiles, kind, startX, startY, vx, vy, {
    gravity: g,
    life: 3.2,
    size: 16,
    variant: m.variant,
  });
  if (ok) events.projectilesFired++;
}

// ---------------------------------------------------------------------------
// Loot
// ---------------------------------------------------------------------------
let lootIdCounter = 0;

/**
 * Builds the collectible loot a defeated monster drops. `heartChance` is scaled
 * up when the player is in trouble so runs stay fair but still rewarding.
 */
export function buildMonsterLoot(m: Monster, player: PlayerState): Collectible[] {
  const species = MONSTER_SPECIES[m.kind];
  const drops: Collectible[] = [];
  const cx = m.x + m.w * 0.5;

  const pearls = species.pearlDrops;
  for (let i = 0; i < pearls; i++) {
    drops.push({
      id: `loot_p_${lootIdCounter++}`,
      type: 'pearl',
      x: cx - 10 + (i % 3) * 18 - 18,
      y: m.y + 4 + Math.floor(i / 3) * 18,
      w: 20,
      h: 20,
      value: 1,
      collected: false,
      bobOffset: i * 0.6,
    });
  }

  const hurtBonus = player.health < player.maxHealth ? 0.25 : 0;
  if (Math.random() < Math.min(1, species.heartChance + hurtBonus)) {
    drops.push({
      id: `loot_h_${lootIdCounter++}`,
      type: 'heart',
      x: cx - 11,
      y: m.y - 6,
      w: 22,
      h: 22,
      value: 1,
      collected: false,
      bobOffset: 0.3,
    });
  }
  if (species.isBoss) {
    // Bosses always leave a second heart to reward the long fight
    drops.push({
      id: `loot_h_${lootIdCounter++}`,
      type: 'heart',
      x: cx + 16,
      y: m.y - 6,
      w: 22,
      h: 22,
      value: 1,
      collected: false,
      bobOffset: 1.1,
    });
  }

  if (Math.random() < species.fruitChance) {
    drops.push({
      id: `loot_f_${lootIdCounter++}`,
      type: 'star_fruit',
      x: cx - 12,
      y: m.y - 26,
      w: 24,
      h: 24,
      value: 1,
      collected: false,
      bobOffset: 0.9,
    });
  }

  return drops;
}

export function monsterScore(monsters: Monster[]): number {
  let score = 0;
  for (const m of monsters) {
    if (!m.defeated) continue;
    if (m.lastHitBy === 'none') continue; // drowned, no reward
    score += MONSTER_SPECIES[m.kind].scoreValue;
  }
  return score;
}

export function comboBonus(combo: number): number {
  if (combo <= 1) return 0;
  return Math.min(1200, (combo - 1) * 60);
}

/** Tier label used by the HUD combo badge. */
export function comboTier(combo: number): { label: string; color: string } {
  if (combo >= 21) return { label: '传说连击 LEGENDARY', color: '#f472b6' };
  if (combo >= 15) return { label: '无双连击 UNSTOPPABLE', color: '#fb923c' };
  if (combo >= 10) return { label: '超神连击 AMAZING', color: '#facc15' };
  if (combo >= 6) return { label: '华丽连击 GREAT', color: '#38bdf8' };
  if (combo >= 3) return { label: '不错连击 NICE', color: '#4ade80' };
  return { label: '连击 COMBO', color: '#e2e8f0' };
}
