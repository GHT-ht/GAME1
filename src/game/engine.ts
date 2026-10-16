import type {
  GameState,
  BiomeId,
  PlayerState,
  LevelData,
  RunStats,
  Monster,
  MonsterProjectile,
  DamageNumber,
  CombatSnapshot,
} from './types.ts';
import { BIOMES, getLevelData } from './levels.ts';
import {
  createInitialPlayer,
  updatePlayerPhysics,
  calculateScoreAndStars,
  rectIntersect,
  type InputState,
} from './physics.ts';
import {
  updateMonsters,
  createMonsters,
  createProjectilePool,
  createDamageNumberPool,
  buildMonsterLoot,
  monsterScore,
  comboBonus,
  MONSTER_SPECIES,
  buildCombatSnapshot,
} from './monsters.ts';
import { ParticlePool } from './particles.ts';
import { GameRenderer } from './renderer.ts';
import { sound } from './audio.ts';
import {
  createWeatherState,
  updateWeather,
  type WeatherState,
  type WeatherType,
} from './weather.ts';

export interface GameEngineCallbacks {
  onStateChange: (state: GameState) => void;
  onPlayerUpdate: (player: PlayerState) => void;
  onStatsReady: (stats: RunStats) => void;
  onTimeUpdate: (seconds: number) => void;
  onWeatherUpdate?: (weather: WeatherState) => void;
  onCombatUpdate?: (combat: CombatSnapshot) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: GameRenderer;
  private particles: ParticlePool;
  private callbacks: GameEngineCallbacks;

  public state: GameState = 'title';
  public currentBiome: BiomeId = 'beach';
  public level: LevelData;
  public player: PlayerState;
  public weather: WeatherState;
  public monsters: Monster[] = [];
  public projectiles: MonsterProjectile[] = createProjectilePool();
  public damageNumbers: DamageNumber[] = createDamageNumberPool();

  private cameraX: number = 0;
  private cameraY: number = 0;
  private viewportW: number = 800;
  private viewportH: number = 600;

  private timeSpent: number = 0;
  private lastTime: number = 0;
  private rafId: number | null = null;
  private secondTimer: number = 0;
  private combatTimer: number = 0;

  // Juice: hit-stop + screen shake
  private hitStop: number = 0;
  private shakeTime: number = 0;
  private shakeDuration: number = 1;
  private shakeMagnitude: number = 0;
  private shakeSeed: number = 0;

  private input: InputState = {
    left: false,
    right: false,
    jumpJustPressed: false,
    jumpHeld: false,
    dashJustPressed: false,
    attackJustPressed: false,
    down: false,
  };

  private keysHeld = new Set<string>();

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    this.canvas.tabIndex = 0;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2d canvas context');
    this.ctx = ctx;
    this.renderer = new GameRenderer(ctx);
    this.particles = new ParticlePool();
    this.callbacks = callbacks;

    this.level = getLevelData(this.currentBiome);
    this.player = createInitialPlayer(this.level.spawnPoint.x, this.level.spawnPoint.y);
    this.weather = createWeatherState(this.currentBiome);
    this.monsters = createMonsters(this.level);
    this.clearProjectiles();

    this.handleResize();
    this.bindEvents();
  }

  private clearProjectiles() {
    for (const p of this.projectiles) p.active = false;
    for (const d of this.damageNumbers) d.active = false;
  }

  private resetCombat() {
    this.monsters = createMonsters(this.level);
    this.clearProjectiles();
    this.hitStop = 0;
    this.shakeTime = 0;
    this.shakeMagnitude = 0;
    this.combatTimer = 0;
    this.emitCombat();
  }

  private addShake(strength: number) {
    if (strength <= 0) return;
    this.shakeMagnitude = Math.max(this.shakeMagnitude, Math.min(22, strength * 16));
    this.shakeDuration = Math.max(this.shakeDuration, 0.22 + strength * 0.25);
    this.shakeTime = this.shakeDuration;
  }

  private addHitStop(seconds: number) {
    this.hitStop = Math.max(this.hitStop, Math.min(0.12, seconds));
  }

  private emitCombat() {
    if (!this.callbacks.onCombatUpdate) return;
    const best = Math.max(this.player.bestCombo, this.player.comboCount);
    this.callbacks.onCombatUpdate(
      buildCombatSnapshot(this.monsters, this.player, best, this.player.heartsCollected)
    );
  }

  private handleResize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;

    this.viewportW = w;
    this.viewportH = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
  };

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);

    // Canvas click to gain focus
    this.canvas.addEventListener('pointerdown', (e) => {
      this.canvas.focus();
      if (this.state === 'playing') {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        // Right side: walk right + jump; Left side: walk left
        if (clickX > rect.width * 0.5) {
          this.input.right = true;
          this.input.jumpJustPressed = true;
          this.input.jumpHeld = true;
        } else {
          this.input.left = true;
        }
      }
    });

    this.canvas.addEventListener('pointerup', () => {
      if (this.state === 'playing') {
        this.input.left = false;
        this.input.right = false;
        this.input.jumpHeld = false;
      }
    });

    window.addEventListener('keydown', (e) => {
      // Prevent browser scroll inside iframe on arrow and space keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.repeat) return;
      this.keysHeld.add(e.code);

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        this.input.left = true;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        this.input.right = true;
      }
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.input.up = true;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.input.down = true;
      }
      if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyC' || e.code === 'KeyZ') {
        this.input.jumpJustPressed = true;
        this.input.jumpHeld = true;

        if (this.state === 'title') {
          this.startGame();
          return;
        }
      }
      if (e.code === 'Enter') {
        if (this.state === 'title') {
          this.startGame();
          return;
        }
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK' || e.code === 'KeyX' || e.code === 'KeyJ') {
        this.input.dashJustPressed = true;
      }
      if (e.code === 'KeyF' || e.code === 'KeyE') {
        this.input.attackJustPressed = true;
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.state === 'playing') {
          this.pauseGame();
        } else if (this.state === 'paused') {
          this.resumeGame();
        }
      }
      if (e.code === 'KeyM') {
        const nextMute = !sound.getMuted();
        sound.setMuted(nextMute);
      }
      if (e.code === 'KeyR') {
        if (this.state === 'playing' || this.state === 'paused' || this.state === 'gameover') {
          this.restartLevel();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      this.keysHeld.delete(e.code);

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        this.input.left = false;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        this.input.right = false;
      }
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.input.up = false;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        this.input.down = false;
      }
      if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyC' || e.code === 'KeyZ') {
        this.input.jumpHeld = false;
      }
    });

    // Reset input on window blur
    window.addEventListener('blur', () => {
      this.keysHeld.clear();
      this.input.left = false;
      this.input.right = false;
      this.input.jumpHeld = false;
      this.input.jumpJustPressed = false;
      this.input.dashJustPressed = false;
      this.input.attackJustPressed = false;
    });
  }

  // Mobile virtual button methods
  public setMobileLeft(down: boolean) {
    this.input.left = down;
  }
  public setMobileRight(down: boolean) {
    this.input.right = down;
  }
  public setMobileJump(down: boolean) {
    if (down && !this.input.jumpHeld) {
      this.input.jumpJustPressed = true;
      if (this.state === 'title') {
        this.startGame();
        return;
      }
    }
    this.input.jumpHeld = down;
  }
  public setMobileDash() {
    this.input.dashJustPressed = true;
  }
  public setMobileAttack() {
    this.input.attackJustPressed = true;
  }

  public setBiome(biomeId: BiomeId) {
    this.currentBiome = biomeId;
    this.level = getLevelData(biomeId);
    this.player = createInitialPlayer(this.level.spawnPoint.x, this.level.spawnPoint.y);
    this.weather = createWeatherState(biomeId);
    this.cameraX = this.player.x - this.viewportW * 0.3;
    this.cameraY = this.player.y - this.viewportH * 0.6;
    this.particles.clear();
    this.timeSpent = 0;
    this.resetCombat();
    this.callbacks.onPlayerUpdate(this.player);
    this.callbacks.onWeatherUpdate?.(this.weather);
  }

  public cycleWeather() {
    const types: WeatherType[] = ['heatwave', 'rain', 'twilight_aurora'];
    const idx = types.indexOf(this.weather.currentType);
    const nextType = types[(idx + 1) % types.length];
    this.weather.currentType = nextType;
    this.callbacks.onWeatherUpdate?.(this.weather);
  }

  public startGame() {
    document.body.dataset.state = 'playing';
    this.state = 'playing';
    this.timeSpent = 0;
    this.secondTimer = 0;
    this.callbacks.onStateChange('playing');
    this.canvas.focus();
    window.focus();
    sound.startBGM(BIOMES[this.currentBiome].musicTheme);
    this.emitCombat();
  }

  public pauseGame() {
    document.body.dataset.state = 'paused';
    this.state = 'paused';
    this.callbacks.onStateChange('paused');
  }

  public resumeGame() {
    document.body.dataset.state = 'playing';
    this.state = 'playing';
    this.callbacks.onStateChange('playing');
  }

  public restartLevel() {
    this.level = getLevelData(this.currentBiome);
    this.player = createInitialPlayer(this.level.spawnPoint.x, this.level.spawnPoint.y);
    this.particles.clear();
    this.timeSpent = 0;
    this.secondTimer = 0;
    this.resetCombat();
    this.startGame();
  }

  public nextStage() {
    const sequence: BiomeId[] = ['beach', 'jungle', 'sunset'];
    const curIdx = sequence.indexOf(this.currentBiome);
    const nextBiome = sequence[(curIdx + 1) % sequence.length];
    this.setBiome(nextBiome);
    this.startGame();
  }

  public goToTitle() {
    document.body.dataset.state = 'title';
    this.state = 'title';
    sound.stopBGM();
    this.callbacks.onStateChange('title');
  }

  public start() {
    this.lastTime = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;

      this.tick(dt, now / 1000);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  public destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.handleResize);
    sound.stopBGM();
  }

  private tick(dt: number, timeSeconds: number) {
    const biome = BIOMES[this.currentBiome];

    // Hit-stop: briefly slow the simulation for crunchy impact feedback
    let simDt = dt;
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      simDt = dt * 0.18;
    }

    if (this.state === 'playing') {
      this.timeSpent += dt;
      this.secondTimer += dt;
      if (this.secondTimer >= 0.5) {
        this.secondTimer = 0;
        this.callbacks.onTimeUpdate(this.timeSpent);
        this.callbacks.onPlayerUpdate(this.player);
      }
      this.combatTimer += dt;
      if (this.combatTimer >= 0.1) {
        this.combatTimer = 0;
        this.emitCombat();
      }

      // Physics update
      const { player, events } = updatePlayerPhysics(
        this.player,
        this.input,
        this.level.platforms,
        this.level.collectibles,
        this.level.hazards,
        simDt,
        this.level.worldWidth,
        this.level.worldHeight
      );
      this.player = player;

      if (events.slashed) {
        sound.playSlash(events.spinAttack);
        this.particles.emitDashContrail(
          player.x + player.w * 0.5,
          player.y + player.h * 0.5,
          player.facing,
          events.spinAttack ? 3 : 1
        );
      }
      if (events.healed) {
        sound.playHeartPickup();
        this.particles.emitSparkles(player.x + player.w * 0.5, player.y + player.h * 0.5, 12, '#fb7185');
      }

      // Handle sound & particle reactions
      if (events.jumped) {
        sound.playJump();
        this.particles.emitDust(player.x + player.w * 0.5, player.y + player.h, 5);
      }
      if (events.doubleJumped) {
        sound.playDoubleJump();
        this.particles.emitLeafBurst(player.x + player.w * 0.5, player.y + player.h * 0.5, 8);
      }
      if (events.tripleJumped) {
        sound.playTripleJump();
        this.particles.emitTripleJumpBurst(player.x + player.w * 0.5, player.y + player.h * 0.5);
      }
      if (events.bounced) {
        sound.playBounce(events.superBounced);
        this.particles.emitBounceBurst(player.x + player.w * 0.5, player.y + player.h, events.superBounced);
      }
      if (events.dashed) {
        sound.playDash(events.chainDashCount);
        this.particles.emitDashContrail(player.x + player.w * 0.5, player.y + player.h * 0.5, player.facing, events.chainDashCount);
      }
      if (events.landed) {
        this.particles.emitDust(player.x + player.w * 0.5, player.y + player.h, 4);
      }
      if (events.hurt) {
        sound.playHurt();
        this.particles.emitSparkles(player.x + player.w * 0.5, player.y + player.h * 0.5, 12, '#ef4444');
      }
      if (events.waterHit) {
        sound.playWaterSplash();
        this.particles.emitWaterSplash(player.x + player.w * 0.5, this.level.worldHeight - 40, 16);
      }
      if (events.collectedItem) {
        const item = events.collectedItem;
        if (item.type === 'pearl') {
          sound.playCollectPearl(player.pearls);
          this.particles.emitSparkles(item.x + 10, item.y + 10, 8, '#7dd3fc');
        } else if (item.type === 'coconut' || item.type === 'star_fruit') {
          sound.playCollectFruit();
          this.particles.emitLeafBurst(item.x + 10, item.y + 10, 6);
        } else if (item.type === 'sun_coin' || item.type === 'totem_relic') {
          sound.playTotemActivate();
          this.particles.emitSparkles(item.x + 15, item.y + 15, 16, '#facc15');
        } else if (item.type === 'heart') {
          sound.playHeartPickup();
          this.particles.emitSparkles(item.x + 11, item.y + 11, 10, '#fb7185');
        }
        this.callbacks.onPlayerUpdate(this.player);
      }

      // ---------------------------------------------------------------------
      // Cute monster combat resolution
      // ---------------------------------------------------------------------
      const combat = updateMonsters(
        this.monsters,
        this.projectiles,
        this.damageNumbers,
        this.player,
        this.level,
        simDt
      );

      if (combat.playerHurt) {
        sound.playHurt();
        this.particles.emitSparkles(
          this.player.x + this.player.w * 0.5,
          this.player.y + this.player.h * 0.5,
          12,
          '#ef4444'
        );
        this.addShake(0.45);
        this.addHitStop(0.07);
        this.callbacks.onPlayerUpdate(this.player);
      }

      for (const hit of combat.monstersHit) {
        if (hit.defeated) continue;
        sound.playMonsterHurt();
        this.particles.emitSparkles(hit.x + hit.w * 0.5, hit.y + hit.h * 0.5, 6, '#fef08a');
      }

      if (combat.stomped) {
        sound.playStomp();
        this.particles.emitDust(this.player.x + this.player.w * 0.5, this.player.y + this.player.h, 6);
      }

      for (const defeated of combat.monstersDefeated) {
        const species = MONSTER_SPECIES[defeated.kind];
        sound.playMonsterDefeat(species.isBoss);
        this.particles.emitSparkles(
          defeated.x + defeated.w * 0.5,
          defeated.y + defeated.h * 0.5,
          species.isBoss ? 34 : 16,
          species.isBoss ? '#fda4af' : '#fcd34d'
        );
        this.particles.emitDust(defeated.x + defeated.w * 0.5, defeated.y + defeated.h, species.isBoss ? 12 : 6);

        if (defeated.lastHitBy !== 'none') {
          this.player.monstersDefeated += 1;
          const loot = buildMonsterLoot(defeated, this.player);
          for (const drop of loot) this.level.collectibles.push(drop);
          this.addShake(species.isBoss ? 0.8 : 0.22);
          this.addHitStop(species.isBoss ? 0.12 : 0.05);
        }
        this.emitCombat();
      }

      if (combat.bossSummoned.length > 0) {
        for (const minion of combat.bossSummoned) {
          this.particles.emitSparkles(minion.x + minion.w * 0.5, minion.y + minion.h * 0.5, 8, '#c084fc');
        }
      }
      if (combat.bossSlammed) {
        this.addShake(0.7);
        this.addHitStop(0.06);
        this.particles.emitDust(combat.slamX, combat.slamY, 10);
      }
      if (combat.bossEnraged) {
        sound.playBossRoar();
        this.addShake(0.75);
      }
      if (combat.projectilesFired > 0) {
        sound.playProjectile();
      }
      if (combat.comboUp) {
        this.player.bestCombo = Math.max(this.player.bestCombo, this.player.comboCount);
        if (this.player.comboCount >= 3) sound.playComboUp(this.player.comboCount);
        this.callbacks.onPlayerUpdate(this.player);
      }
      if (combat.hitStop > 0) this.addHitStop(combat.hitStop);
      if (combat.shake > 0) this.addShake(combat.shake);

      // Check Victory Condition: Totem Altar reached
      const playerBox = { x: player.x, y: player.y, w: player.w, h: player.h };
      if (!this.level.totemAltar.activated && rectIntersect(playerBox, this.level.totemAltar)) {
        this.level.totemAltar.activated = true;
        sound.playTotemActivate();
        sound.playVictory();
        this.particles.emitSparkles(
          this.level.totemAltar.x + this.level.totemAltar.w * 0.5,
          this.level.totemAltar.y,
          30,
          '#fbbf24'
        );

        const { score, stars } = calculateScoreAndStars(
          this.timeSpent,
          player.pearls,
          this.level.targetPearls,
          player.relicsFound > 0,
          monsterScore(this.monsters),
          player.bestCombo
        );

        const stats: RunStats = {
          levelId: this.currentBiome,
          timeSpent: this.timeSpent,
          pearlsCollected: player.pearls,
          totalPearls: this.level.targetPearls,
          relicFound: player.relicsFound > 0,
          stars,
          score,
          monstersDefeated: player.monstersDefeated,
          bestCombo: player.bestCombo,
          heartsCollected: player.heartsCollected,
        };

        this.state = 'victory';
        document.body.dataset.state = 'gameover';
        this.callbacks.onStatsReady(stats);
        this.callbacks.onStateChange('victory');
      }

      // Check Game Over Condition
      if (player.health <= 0) {
        sound.playHurt();
        this.state = 'gameover';
        document.body.dataset.state = 'gameover';
        const stats: RunStats = {
          levelId: this.currentBiome,
          timeSpent: this.timeSpent,
          pearlsCollected: player.pearls,
          totalPearls: this.level.targetPearls,
          relicFound: player.relicsFound > 0,
          stars: 0,
          score: player.pearls * 50 + monsterScore(this.monsters) + comboBonus(player.bestCombo),
          monstersDefeated: player.monstersDefeated,
          bestCombo: player.bestCombo,
          heartsCollected: player.heartsCollected,
        };
        this.callbacks.onStatsReady(stats);
        this.callbacks.onStateChange('gameover');
      }

      // Camera Tracking
      const targetCamX = player.x - this.viewportW * 0.35 + player.facing * 40;
      const targetCamY = player.y - this.viewportH * 0.6;
      this.cameraX += (targetCamX - this.cameraX) * Math.min(1, dt * 6);
      this.cameraY += (targetCamY - this.cameraY) * Math.min(1, dt * 5);

      // Clamp camera within world bounds
      this.cameraX = Math.max(0, Math.min(this.cameraX, this.level.worldWidth - this.viewportW));
      this.cameraY = Math.max(0, Math.min(this.cameraY, this.level.worldHeight - this.viewportH));
    } else if (this.state === 'title') {
      // Gentle camera tour pan during title screen
      const tourX = (Math.sin(timeSeconds * 0.2) * 0.5 + 0.5) * (this.level.worldWidth - this.viewportW);
      this.cameraX = Math.max(0, Math.min(tourX, this.level.worldWidth - this.viewportW));
      this.cameraY = this.level.worldHeight - this.viewportH - 40;
    }

    // Reset single-frame edge triggers
    this.input.jumpJustPressed = false;
    this.input.dashJustPressed = false;
    this.input.attackJustPressed = false;

    // Update Particles & Dynamic Weather
    this.particles.update(dt);
    updateWeather(this.weather, this.currentBiome, dt, this.viewportW, this.viewportH);

    // Screen shake (decaying, cheap trig noise)
    this.shakeSeed += dt * 60;
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      const falloff = this.shakeTime / this.shakeDuration;
      const amp = this.shakeMagnitude * falloff * falloff;
      shakeX = Math.sin(this.shakeSeed * 1.7) * amp;
      shakeY = Math.cos(this.shakeSeed * 2.3) * amp * 0.7;
      if (this.shakeTime === 0) this.shakeMagnitude = 0;
    }

    // Render Scene with safety catch
    try {
      this.renderer.render(
        this.level,
        biome,
        this.player,
        this.particles,
        this.weather,
        this.cameraX + shakeX,
        this.cameraY + shakeY,
        this.viewportW,
        this.viewportH,
        timeSeconds,
        {
          monsters: this.monsters,
          projectiles: this.projectiles,
          damageNumbers: this.damageNumbers,
        }
      );
    } catch (err) {
      console.warn('Render frame warning:', err);
    }
  }
}
