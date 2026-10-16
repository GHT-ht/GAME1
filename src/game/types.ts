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

export type CollectibleType = 'pearl' | 'coconut' | 'star_fruit' | 'sun_coin' | 'totem_relic';

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
}
