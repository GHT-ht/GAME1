export type GameState = 'title' | 'playing' | 'paused' | 'gameover' | 'victory';

export type BiomeId = 'beach' | 'jungle' | 'sunset';

export interface BiomeConfig {
  id: BiomeId;
  name: string;
  subname: string;
  description: string;
  skyTop: string;
  skyBottom: string;
  waterColor: string;
  waterFoamColor: string;
  sunColor: string;
  grassColor: string;
  dirtColor: string;
  sandColor: string;
  ambientType: 'seabirds' | 'fireflies' | 'butterflies';
  musicTheme: 'cheerful' | 'mystic' | 'twilight';
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PlatformType = 'solid' | 'one-way' | 'bouncy' | 'moving' | 'sand';

export interface Platform extends Rect {
  type: PlatformType;
  color?: string;
  label?: string;
  // For moving platforms
  moveAxis?: 'x' | 'y';
  moveRange?: number;
  moveSpeed?: number;
  initialX?: number;
  initialY?: number;
}

export type CollectibleType =
  | 'pearl'
  | 'coconut'
  | 'star_fruit'
  | 'sun_coin'
  | 'totem_relic'
  | 'heart';

export interface Collectible {
  id: string;
  type: CollectibleType;
  x: number;
  y: number;
  w: number;
  h: number;
  value: number;
  collected: boolean;
  bobOffset: number;
}

export type HazardType = 'urchin' | 'puffer' | 'thorn_vine' | 'water_deep';

export interface Hazard extends Rect {
  type: HazardType;
  harmValue: number;
}

export interface Wildlife {
  id: string;
  type: 'crab' | 'fish' | 'bird' | 'butterfly';
  x: number;
  y: number;
  initialX: number;
  vx: number;
  range: number;
  facing: 1 | -1;
  animFrame: number;
}

// ---------------------------------------------------------------------------
// Cute Monster Combat System
// ---------------------------------------------------------------------------

export type MonsterKind =
  | 'crabling'
  | 'jellybub'
  | 'shroomling'
  | 'budling'
  | 'crystimp'
  | 'emberpup'
  | 'crabking'
  | 'shroomlord'
  | 'crystalsphinx';

export type MonsterBehavior =
  | 'patrol' // walks back and forth on a platform, lunges when close
  | 'flyer' // hovers and drifts, contact damage only
  | 'turret' // rooted in place, lobs projectiles
  | 'diver' // hovers, telegraphs then dives at the player
  | 'charger' // telegraphs a crouch then sprints; dizzy afterwards
  | 'boss'; // multi-phase boss with slam / charge / minion summon

export type MonsterState =
  | 'patrol'
  | 'chase'
  | 'telegraph'
  | 'attacking'
  | 'recover'
  | 'hurt'
  | 'dead';

export type ProjectileKind = 'spore' | 'seed' | 'shard' | 'bubble' | 'shockwave';

export interface MonsterSpecies {
  kind: MonsterKind;
  name: string;
  enName: string;
  behavior: MonsterBehavior;
  /** Body size in world pixels. */
  w: number;
  h: number;
  maxHp: number;
  /** Damage dealt to the player on contact / attack. */
  touchDamage: number;
  /** Horizontal movement speed (patrol / chase / charge multiplier). */
  speed: number;
  /** Distance at which the monster notices the player. */
  aggroRange: number;
  /** Seconds between attacks. */
  attackCooldown: number;
  /** Horizontal distance in which the attack is triggered. */
  attackRange: number;
  /** Delay between the telegraph pose and the actual attack. */
  windup: number;
  /** How long the monster stays vulnerable / dizzy after committing. */
  recover: number;
  projectile?: ProjectileKind;
  /** Minion summoned by a boss once per health threshold. */
  minion?: MonsterKind;
  /** Loot behaviour when defeated. */
  pearlDrops: number;
  heartChance: number;
  fruitChance: number;
  /** Bounce impulse applied to the player when stomping this monster. */
  stompBounce: number;
  /** Score awarded when defeated. */
  scoreValue: number;
  /** Damage multiplier applied while the monster is armoured (telegraphing). */
  armour: number;
  isBoss?: boolean;
  /** Flavour text shown under the boss health bar. */
  taunt?: string;
}

export interface MonsterSpawn {
  kind: MonsterKind;
  x: number;
  y: number;
  /** Half-width of the patrol walk, defaults to species based value. */
  patrolRange?: number;
  /** Palette variant index (0-3) for per-level tinting. */
  variant?: number;
  /** Optional patrol delay so a row of monsters does not move in lockstep. */
  phase?: number;
}

export interface Monster {
  id: string;
  kind: MonsterKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1;
  grounded: boolean;
  state: MonsterState;
  stateTimer: number;
  attackCooldown: number;
  hurtTimer: number;
  /** Short immunity after being hit so a single swing cannot multi-hit. */
  hitCooldown: number;
  /** Damage flash timer (white overlay + shake). */
  hitFlash: number;
  invulnTimer: number;
  animTime: number;
  /** Home position for patrol clamping and respawn logic. */
  homeX: number;
  homeY: number;
  patrolRange: number;
  phase: number;
  /** Player is inside the aggro radius. */
  aggro: boolean;
  /** Delayed white chunk of the HP bar for juicy damage feedback. */
  barTrail: number;
  squashX: number;
  squashY: number;
  defeated: boolean;
  /** Seconds spent in the death animation before it is removed. */
  deathTimer: number;
  variant: number;
  blinkTimer: number;
  isBoss: boolean;
  /** Boss only: enraged second phase flag. */
  enraged: boolean;
  /** Boss only: minions already summoned. */
  minionsSummoned: number;
  /** Boss only: the attack that is about to be executed after the telegraph. */
  pendingAttack: 'none' | 'slam' | 'charge' | 'summon' | 'lunge' | 'dive' | 'spit' | 'lob';
  /** Accumulated damage, useful for scoring and feedback. */
  damageTaken: number;
  /** Which client last damaged the monster (for drop ownership / duplication guards). */
  lastHitBy: 'slash' | 'dash' | 'stomp' | 'none';
}

export interface MonsterProjectile {
  active: boolean;
  kind: ProjectileKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  maxLife: number;
  damage: number;
  spin: number;
  variant: number;
  /** Shockwaves travel along the ground and never fall. */
  grounded: boolean;
}

export interface DamageNumber {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  scale: number;
}

export interface CombatSnapshot {
  total: number;
  remaining: number;
  defeated: number;
  combo: number;
  bestCombo: number;
  bossActive: boolean;
  bossName: string;
  bossEn: string;
  bossHp: number;
  bossMaxHp: number;
  bossTaunt: string;
  heartsDropped: number;
}

export interface TotemAltar {
  x: number;
  y: number;
  w: number;
  h: number;
  activated: boolean;
  biome: BiomeId;
}

export interface LevelData {
  id: BiomeId;
  title: string;
  subtitle: string;
  worldWidth: number;
  worldHeight: number;
  spawnPoint: { x: number; y: number };
  goalPoint: { x: number; y: number; w: number; h: number };
  platforms: Platform[];
  collectibles: Collectible[];
  hazards: Hazard[];
  wildlife: Wildlife[];
  monsters: MonsterSpawn[];
  totemAltar: TotemAltar;
  targetPearls: number;
}

export interface PlayerState {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  grounded: boolean;
  facing: 1 | -1;
  isGliding: boolean;
  isDashing: boolean;
  dashTimer: number;
  dashCooldown: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  canDoubleJump: boolean;
  jumpsLeft: number;
  maxJumps: number;
  airDashesLeft: number;
  maxAirDashes: number;
  dashChainCount: number;
  health: number;
  maxHealth: number;
  invulnerableTimer: number;
  pearls: number;
  fruits: number;
  sunCoins: number;
  relicsFound: number;
  // --- Cute monster combat ---
  /** Seconds left of the current melee swing hitbox. */
  attackTimer: number;
  /** Seconds until the next melee swing is allowed. */
  attackCooldown: number;
  /** Index of the current swing inside the 3-hit combo (-1 = no swing yet, 2 = spin finisher). */
  attackIndex: number;
  /** Straight-swing combo counter plus how long it stays alive. */
  comboCount: number;
  comboTimer: number;
  /** Consecutive stomps without touching the ground. */
  stompChain: number;
  /** Monsters defeated during this run. */
  monstersDefeated: number;
  /** Hearts picked up during this run. */
  heartsCollected: number;
  /** Heaviest combo reached during this run. */
  bestCombo: number;
  walkCycle: number;
  squashX: number;
  squashY: number;
  distanceTraveled: number;
  lastSafeX: number;
  lastSafeY: number;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'sparkle' | 'leaf' | 'bubble' | 'dust' | 'feather' | 'sunray';
}

export interface RunStats {
  levelId: BiomeId;
  timeSpent: number;
  pearlsCollected: number;
  totalPearls: number;
  relicFound: boolean;
  stars: number;
  score: number;
  monstersDefeated?: number;
  bestCombo?: number;
  heartsCollected?: number;
}
