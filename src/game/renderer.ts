import type {
  LevelData,
  PlayerState,
  BiomeConfig,
  BiomeId,
  Monster,
  MonsterKind,
  MonsterProjectile,
  DamageNumber,
} from './types.ts';
import type { ParticlePool } from './particles.ts';
import { MONSTER_SPECIES } from './monsters.ts';
import { type WeatherState, computeHeatWaveOffset } from './weather.ts';
import beachBgUrl from '../assets/images/beach_bg.jpg';
import jungleBgUrl from '../assets/images/jungle_bg.jpg';
import sunsetBgUrl from '../assets/images/sunset_bg.jpg';

export interface CombatRenderData {
  monsters: Monster[];
  projectiles: MonsterProjectile[];
  damageNumbers: DamageNumber[];
}

interface MonsterPalette {
  body: string;
  bodyDark: string;
  bodyLight: string;
  accent: string;
  cheek: string;
}

/**
 * Per-biome tinting keeps the same cuties but makes each island feel different.
 * Index: kind -> [beach, jungle, sunset, bonus].
 */
const MONSTER_PALETTES: Record<MonsterKind, MonsterPalette[]> = {
  crabling: [
    { body: '#fb7185', bodyDark: '#be123c', bodyLight: '#fecdd3', accent: '#fbbf24', cheek: '#fb7185' },
    { body: '#f97316', bodyDark: '#c2410c', bodyLight: '#fed7aa', accent: '#4ade80', cheek: '#fb923c' },
    { body: '#c084fc', bodyDark: '#7e22ce', bodyLight: '#e9d5ff', accent: '#facc15', cheek: '#d8b4fe' },
  ],
  jellybub: [
    { body: '#a5b4fc', bodyDark: '#4f46e5', bodyLight: '#e0e7ff', accent: '#f0abfc', cheek: '#f9a8d4' },
    { body: '#5eead4', bodyDark: '#0f766e', bodyLight: '#ccfbf1', accent: '#a7f3d0', cheek: '#99f6e4' },
    { body: '#f0abfc', bodyDark: '#a21caf', bodyLight: '#fae8ff', accent: '#c4b5fd', cheek: '#f5d0fe' },
  ],
  shroomling: [
    { body: '#f87171', bodyDark: '#b91c1c', bodyLight: '#fee2e2', accent: '#fef3c7', cheek: '#fca5a5' },
    { body: '#ef4444', bodyDark: '#991b1b', bodyLight: '#fee2e2', accent: '#fef9c3', cheek: '#fca5a5' },
    { body: '#f59e0b', bodyDark: '#b45309', bodyLight: '#fef3c7', accent: '#fde68a', cheek: '#fcd34d' },
  ],
  budling: [
    { body: '#4ade80', bodyDark: '#15803d', bodyLight: '#dcfce7', accent: '#f472b6', cheek: '#f9a8d4' },
    { body: '#22c55e', bodyDark: '#166534', bodyLight: '#dcfce7', accent: '#fb923c', cheek: '#fdba74' },
    { body: '#2dd4bf', bodyDark: '#0f766e', bodyLight: '#ccfbf1', accent: '#c084fc', cheek: '#a5f3fc' },
  ],
  crystimp: [
    { body: '#67e8f9', bodyDark: '#0e7490', bodyLight: '#cffafe', accent: '#c084fc', cheek: '#a5f3fc' },
    { body: '#a78bfa', bodyDark: '#5b21b6', bodyLight: '#ede9fe', accent: '#38bdf8', cheek: '#ddd6fe' },
    { body: '#f0abfc', bodyDark: '#a21caf', bodyLight: '#fae8ff', accent: '#67e8f9', cheek: '#f5d0fe' },
  ],
  emberpup: [
    { body: '#fb923c', bodyDark: '#c2410c', bodyLight: '#fed7aa', accent: '#fde047', cheek: '#fdba74' },
    { body: '#fb7185', bodyDark: '#9f1239', bodyLight: '#ffe4e6', accent: '#fca5a5', cheek: '#fda4af' },
    { body: '#f97316', bodyDark: '#9a3412', bodyLight: '#ffedd5', accent: '#facc15', cheek: '#fdba74' },
  ],
  crabking: [
    { body: '#f43f5e', bodyDark: '#9f1239', bodyLight: '#fecdd3', accent: '#facc15', cheek: '#fb7185' },
    { body: '#ea580c', bodyDark: '#9a3412', bodyLight: '#fed7aa', accent: '#fde047', cheek: '#fb923c' },
    { body: '#a855f7', bodyDark: '#6b21a8', bodyLight: '#e9d5ff', accent: '#facc15', cheek: '#c084fc' },
  ],
  shroomlord: [
    { body: '#dc2626', bodyDark: '#7f1d1d', bodyLight: '#fee2e2', accent: '#fde047', cheek: '#fca5a5' },
    { body: '#b91c1c', bodyDark: '#7f1d1d', bodyLight: '#fee2e2', accent: '#fef9c3', cheek: '#fca5a5' },
    { body: '#d97706', bodyDark: '#92400e', bodyLight: '#fef3c7', accent: '#fde68a', cheek: '#fcd34d' },
  ],
  crystalsphinx: [
    { body: '#818cf8', bodyDark: '#3730a3', bodyLight: '#e0e7ff', accent: '#f0abfc', cheek: '#c7d2fe' },
    { body: '#22d3ee', bodyDark: '#0e7490', bodyLight: '#cffafe', accent: '#c084fc', cheek: '#a5f3fc' },
    { body: '#e879f9', bodyDark: '#86198f', bodyLight: '#fae8ff', accent: '#67e8f9', cheek: '#f5d0fe' },
  ],
};

function paletteFor(kind: MonsterKind, variant: number): MonsterPalette {
  const list = MONSTER_PALETTES[kind];
  return list[Math.abs(variant) % list.length];
}

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private bgImages: Record<BiomeId, HTMLImageElement> = {
    beach: new Image(),
    jungle: new Image(),
    sunset: new Image(),
  };
  private bgLoaded: Record<BiomeId, boolean> = {
    beach: false,
    jungle: false,
    sunset: false,
  };

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;

    // Preload background images
    this.bgImages.beach.src = beachBgUrl;
    this.bgImages.beach.onload = () => { this.bgLoaded.beach = true; };

    this.bgImages.jungle.src = jungleBgUrl;
    this.bgImages.jungle.onload = () => { this.bgLoaded.jungle = true; };

    this.bgImages.sunset.src = sunsetBgUrl;
    this.bgImages.sunset.onload = () => { this.bgLoaded.sunset = true; };
  }

  public render(
    level: LevelData,
    biome: BiomeConfig,
    player: PlayerState,
    particles: ParticlePool,
    weather: WeatherState,
    cameraX: number,
    cameraY: number,
    viewportW: number,
    viewportH: number,
    time: number,
    combat?: CombatRenderData
  ) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, viewportW, viewportH);

    // 1. Draw High-Quality Illustrated Background with Parallax
    this.drawIllustratedBackdrop(ctx, biome.id, cameraX, cameraY, viewportW, viewportH, time);

    // 2. Save Context for Camera Space
    ctx.save();
    ctx.translate(-Math.round(cameraX), -Math.round(cameraY));

    // 3. Environmental Mid-Ocean & Water Reflection
    this.drawMidOcean(ctx, biome, level.worldWidth, level.worldHeight, time);

    // 4. Detailed Painterly Platforms & Structures
    this.drawPlatforms(ctx, level, biome, time);

    // 5. Ancient Stone Totem Shrine with Volumetric Glyphs
    this.drawTotemAltar(ctx, level.totemAltar, time);

    // 6. Hazards & Wildlife
    this.drawHazards(ctx, level.hazards, time);
    this.drawWildlife(ctx, level.wildlife, time);

    // 7. Collectibles (Glowing Pearls, Fruits, Sun Coins, Relics, Monster hearts)
    this.drawCollectibles(ctx, level.collectibles, time);

    // 8. Cute little monsters, their HP bars and attack telegraphs
    if (combat) {
      this.drawMonsters(ctx, combat.monsters, time);
      this.drawMonsterProjectiles(ctx, combat.projectiles, time);
    }

    // 9. Zero-GC Pooled Particles (Dust, Leaves, Sparkles, Water Splashes)
    this.drawParticles(ctx, particles);

    // 10. Animated Adventurer Character + melee swing VFX
    this.drawPlayer(ctx, player, time);
    this.drawPlayerAttackVfx(ctx, player, time);

    // 11. Floating damage numbers on top of the action
    if (combat) {
      this.drawDamageNumbers(ctx, combat.damageNumbers);
    }

    // 12. Foreground Breaking Surf & Foam
    this.drawForeOceanWaves(ctx, biome, level.worldWidth, level.worldHeight, time);

    // Restore Camera Context
    ctx.restore();

    // 13. Atmospheric Lighting, Sun Rays & Vignette
    this.drawScreenAtmosphere(ctx, biome, player, viewportW, viewportH, time);

    // 14. Dynamic Biome Weather Overlay (Heat waves, Tropical rain, Twilight aurora)
    this.drawWeatherOverlay(ctx, weather, viewportW, viewportH, time);
  }

  private drawIllustratedBackdrop(
    ctx: CanvasRenderingContext2D,
    biomeId: BiomeId,
    camX: number,
    _camY: number,
    w: number,
    h: number,
    time: number
  ) {
    const img = this.bgImages[biomeId];
    const isLoaded = this.bgLoaded[biomeId];

    if (isLoaded && img.naturalWidth > 0) {
      // Parallax scroll calculation: slower scroll for distant cinematic landscape
      const parallaxFactor = 0.14;
      const scrollX = (camX * parallaxFactor) % w;

      // Draw repeating wide seamless panorama
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const targetH = Math.max(h, w / imgAspect);
      const targetW = targetH * imgAspect;

      const drawX = -scrollX;
      ctx.drawImage(img, drawX, 0, targetW, targetH);
      if (drawX + targetW < w) {
        ctx.drawImage(img, drawX + targetW - 2, 0, targetW, targetH);
      }
    } else {
      // Fallback painterly gradient if image is buffering
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, biomeId === 'sunset' ? '#4c1d95' : biomeId === 'jungle' ? '#0f766e' : '#0284c7');
      grad.addColorStop(1, biomeId === 'sunset' ? '#ea580c' : biomeId === 'jungle' ? '#99f6e4' : '#bae6fd');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // Dynamic volumetric God-Rays / Sunbeams
    ctx.save();
    ctx.globalAlpha = biomeId === 'sunset' ? 0.09 : 0.14;
    ctx.fillStyle = biomeId === 'sunset' ? '#fed7aa' : '#fef08a';
    const sunOriginX = w * 0.72 - (camX * 0.03) % (w * 1.5);
    const sunOriginY = h * 0.2;

    for (let i = 0; i < 6; i++) {
      const angle = (i * 0.28) + Math.sin(time * 0.4 + i) * 0.04 + 0.7;
      ctx.beginPath();
      ctx.moveTo(sunOriginX, sunOriginY);
      ctx.lineTo(sunOriginX + Math.cos(angle) * w * 1.3, sunOriginY + Math.sin(angle) * h * 1.4);
      ctx.lineTo(sunOriginX + Math.cos(angle + 0.12) * w * 1.3, sunOriginY + Math.sin(angle + 0.12) * h * 1.4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Floating ambient motes / spores / fireflies
    ctx.save();
    for (let i = 0; i < 20; i++) {
      const moteX = ((i * 137.5 + time * 18 - camX * 0.08) % (w + 100)) - 50;
      const moteY = ((i * 93.7 + Math.sin(time * 1.5 + i) * 35) % (h * 0.8));
      const size = 1.5 + (i % 3);
      const alpha = 0.3 + Math.sin(time * 2 + i) * 0.3;

      ctx.fillStyle = biomeId === 'sunset'
        ? `rgba(253, 224, 71, ${alpha})`
        : biomeId === 'jungle'
        ? `rgba(94, 234, 212, ${alpha})`
        : `rgba(254, 240, 138, ${alpha})`;
      ctx.beginPath();
      ctx.arc(moteX, moteY, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawMidOcean(
    ctx: CanvasRenderingContext2D,
    biome: BiomeConfig,
    worldW: number,
    worldH: number,
    time: number
  ) {
    const oceanTop = worldH - 65;

    // Soft translucent surf gradient at bottom hazard line
    const seaGrad = ctx.createLinearGradient(0, oceanTop, 0, worldH);
    seaGrad.addColorStop(0, 'rgba(14, 165, 233, 0.4)');
    seaGrad.addColorStop(0.5, 'rgba(3, 105, 161, 0.8)');
    seaGrad.addColorStop(1, '#082f49');

    ctx.fillStyle = seaGrad;
    ctx.beginPath();
    ctx.moveTo(0, worldH);
    ctx.lineTo(0, oceanTop);

    // Dynamic wave curvature
    for (let x = 0; x <= worldW; x += 35) {
      const wave = Math.sin(x * 0.02 + time * 2.8) * 6 + Math.cos(x * 0.04 - time * 1.8) * 3;
      ctx.lineTo(x, oceanTop + wave);
    }
    ctx.lineTo(worldW, worldH);
    ctx.closePath();
    ctx.fill();

    // Sunlight caustics ripples
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (let x = 40; x < worldW; x += 140) {
      const ripX = x + Math.sin(time * 1.2 + x) * 15;
      const ripY = oceanTop + 15 + ((x * 13) % 40);
      const ripLen = 22 + Math.sin(time * 3 + x) * 10;
      ctx.fillRect(ripX, ripY, ripLen, 2.5);
    }
  }

  private drawPlatforms(
    ctx: CanvasRenderingContext2D,
    level: LevelData,
    biome: BiomeConfig,
    time: number
  ) {
    for (const plat of level.platforms) {
      let curX = plat.x;
      let curY = plat.y;
      if (plat.type === 'moving') {
        const speed = plat.moveSpeed || 40;
        const range = plat.moveRange || 100;
        const offset = Math.sin(time * (speed / 40)) * range;
        if (plat.moveAxis === 'y') {
          curY = (plat.initialY ?? plat.y) + offset;
          plat.y = curY;
        } else {
          curX = (plat.initialX ?? plat.x) + offset;
          plat.x = curX;
        }
      }

      switch (plat.type) {
        case 'solid':
          this.drawAncientCliffPlatform(ctx, curX, curY, plat.w, plat.h, biome, time);
          break;
        case 'sand':
          this.drawGoldenSandDune(ctx, curX, curY, plat.w, plat.h, biome);
          break;
        case 'one-way':
          this.drawRusticWoodenPier(ctx, curX, curY, plat.w, plat.h);
          break;
        case 'bouncy':
          this.drawCarvedTikiDrum(ctx, curX, curY, plat.w, plat.h, time);
          break;
        case 'moving':
          this.drawFloatingMossRaft(ctx, curX, curY, plat.w, plat.h, time);
          break;
      }
    }
  }

  private drawAncientCliffPlatform(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    biome: BiomeConfig,
    time: number
  ) {
    ctx.save();

    // Warm weathered stone cliff shading matching the painted scenery
    const rockGrad = ctx.createLinearGradient(x, y, x, y + h);
    rockGrad.addColorStop(0, '#574136');
    rockGrad.addColorStop(0.3, '#3b2b24');
    rockGrad.addColorStop(1, '#241a15');
    ctx.fillStyle = rockGrad;

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, [14, 14, 0, 0]);
    ctx.fill();

    // Mossy stone rim highlight
    ctx.fillStyle = '#8c6b58';
    ctx.fillRect(x + 2, y, w - 4, 3);

    // Natural rock strata lines & cracks
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 28);
    ctx.lineTo(x + w * 0.45, y + 36);
    ctx.lineTo(x + w - 18, y + 32);
    ctx.moveTo(x + 26, y + 64);
    ctx.lineTo(x + w * 0.7, y + 70);
    ctx.stroke();

    // Lush organic moss & hanging tropical ivy
    ctx.fillStyle = biome.grassColor;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 12, [14, 14, 4, 4]);
    ctx.fill();

    // Hanging vine fronds
    ctx.fillStyle = biome.grassColor;
    for (let vx = x + 12; vx < x + w - 12; vx += 20) {
      const vineLen = 8 + ((vx * 17) % 18);
      ctx.beginPath();
      ctx.moveTo(vx, y + 10);
      ctx.quadraticCurveTo(vx + 4, y + 10 + vineLen * 0.5, vx + 2, y + 10 + vineLen);
      ctx.quadraticCurveTo(vx - 2, y + 10 + vineLen * 0.5, vx, y + 10);
      ctx.fill();
    }

    // Wild tropical flowers along the rim
    for (let fx = x + 24; fx < x + w - 24; fx += 55) {
      const flowerColor = fx % 2 === 0 ? '#f43f5e' : '#fbbf24';
      ctx.fillStyle = flowerColor;
      ctx.beginPath();
      ctx.arc(fx, y + 3, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(fx, y + 3, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Palm tree decoration on wide platforms
    if (w >= 320) {
      this.drawArtisticPalmTree(ctx, x + w * 0.35, y, 95, time);
    }
    if (w >= 480) {
      this.drawArtisticPalmTree(ctx, x + w * 0.78, y, 115, time + 1.5);
    }

    ctx.restore();
  }

  private drawGoldenSandDune(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    biome: BiomeConfig
  ) {
    ctx.save();
    // Warm golden sand dune with soft gradient
    const sandGrad = ctx.createLinearGradient(x, y, x, y + h);
    sandGrad.addColorStop(0, biome.sandColor);
    sandGrad.addColorStop(0.5, '#d97706');
    sandGrad.addColorStop(1, '#92400e');
    ctx.fillStyle = sandGrad;

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, [16, 16, 10, 10]);
    ctx.fill();

    // Top sand highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 2, w - 8, 4, 3);
    ctx.fill();

    // Scattered beach seashells
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + 20, y + 7, 3, 0, Math.PI * 2);
    ctx.arc(x + w - 25, y + 8, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawRusticWoodenPier(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    ctx.save();
    // Warm weathered wood planks
    ctx.fillStyle = '#854d0e';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();

    // Plank gaps
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    for (let px = x + 18; px < x + w; px += 22) {
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px, y + h);
      ctx.stroke();
    }

    // Support pylons going down into water
    ctx.fillStyle = '#451a03';
    ctx.fillRect(x + 12, y + h, 12, 180);
    ctx.fillRect(x + w - 24, y + h, 12, 180);

    // Weathered rope bindings
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(x + 10, y + h + 6, 16, 4);
    ctx.fillRect(x + w - 26, y + h + 6, 16, 4);

    // Warm nautical lantern
    const lanternX = x + 18;
    const lanternY = y - 18;
    ctx.fillStyle = '#78350f';
    ctx.fillRect(lanternX - 1, lanternY, 2, 18);
    // Lantern glow
    const lanternGlow = ctx.createRadialGradient(lanternX, lanternY, 2, lanternX, lanternY, 16);
    lanternGlow.addColorStop(0, '#fde047');
    lanternGlow.addColorStop(0.5, 'rgba(251, 191, 36, 0.6)');
    lanternGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = lanternGlow;
    ctx.beginPath();
    ctx.arc(lanternX, lanternY, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawCarvedTikiDrum(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    time: number
  ) {
    ctx.save();
    const bounceOsc = Math.sin(time * 5);
    const pulse = bounceOsc * 2;
    const cx = x + w * 0.5;

    // 1. Heavy carved stone plinth base with tribal grooves
    const baseGrad = ctx.createLinearGradient(x, y + 6, x, y + h + 12);
    baseGrad.addColorStop(0, '#78350f');
    baseGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 6, w - 4, h + 8, [6, 6, 8, 8]);
    ctx.fill();

    // 2. High-tension golden coiled spring beneath the trampoline head
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const springTurns = 3;
    const springTop = y + 8 + pulse;
    const springBottom = y + h + 6;
    const stepH = (springBottom - springTop) / springTurns;
    ctx.moveTo(cx - 10, springTop);
    for (let i = 0; i < springTurns; i++) {
      const curY = springTop + i * stepH;
      ctx.lineTo(cx + 10, curY + stepH * 0.5);
      ctx.lineTo(cx - 10, curY + stepH);
    }
    ctx.stroke();

    // 3. Elastic trampoline bouncy drum head
    const membraneGrad = ctx.createLinearGradient(x, y, x, y + 10);
    membraneGrad.addColorStop(0, '#fef08a');
    membraneGrad.addColorStop(0.5, '#f59e0b');
    membraneGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = membraneGrad;
    ctx.beginPath();
    ctx.ellipse(cx, y + 6 + pulse, w * 0.48, h * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Golden rim highlight
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Glowing sun glyph & upward boost arrows
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, y + 6 + pulse, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 5. Rising animated launch chevrons (▲ ▲ ▲)
    for (let i = 0; i < 3; i++) {
      const arrowPhase = ((time * 3 + i * 0.33) % 1);
      const arrowY = y - 6 - arrowPhase * 24;
      const arrowAlpha = Math.sin(arrowPhase * Math.PI);
      const arrowSize = 5 + (1 - arrowPhase) * 2;

      ctx.fillStyle = `rgba(254, 240, 138, ${arrowAlpha * 0.9})`;
      ctx.beginPath();
      ctx.moveTo(cx - arrowSize, arrowY);
      ctx.lineTo(cx, arrowY - arrowSize * 1.1);
      ctx.lineTo(cx + arrowSize, arrowY);
      ctx.closePath();
      ctx.fill();
    }

    // 6. Floating clear indicator pill "⬆️ BOOSTER 助力跳台"
    const badgeY = y - 26 + Math.sin(time * 4) * 2;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(cx - 42, badgeY - 8, 84, 17, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⬆️ BOOSTER', cx, badgeY);

    ctx.restore();
  }

  private drawFloatingMossRaft(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    time: number
  ) {
    ctx.save();
    // Ancient stone slab with lush moss covering
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();

    // Stone core
    ctx.fillStyle = '#3f6212';
    ctx.fillRect(x + 4, y + 6, w - 8, h - 8);

    // Trailing roots in water
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 2.5;
    for (let rx = x + 16; rx < x + w - 16; rx += 22) {
      const rootBob = Math.sin(time * 3 + rx) * 5;
      ctx.beginPath();
      ctx.moveTo(rx, y + h);
      ctx.lineTo(rx + rootBob, y + h + 22);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawArtisticPalmTree(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    height: number,
    time: number
  ) {
    ctx.save();
    const wind = Math.sin(time * 1.8) * 14;

    // Curved trunk with depth shading
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + wind * 0.4, y - height * 0.5, x + wind, y - height);
    ctx.stroke();

    // Highlights on trunk
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 3, y);
    ctx.quadraticCurveTo(x + wind * 0.4 + 3, y - height * 0.5, x + wind + 2, y - height);
    ctx.stroke();

    const topX = x + wind;
    const topY = y - height;

    // Coconuts
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(topX - 5, topY + 4, 6, 0, Math.PI * 2);
    ctx.arc(topX + 5, topY + 4, 6, 0, Math.PI * 2);
    ctx.arc(topX, topY + 8, 6, 0, Math.PI * 2);
    ctx.fill();

    // Lush layered palm fronds
    const angles = [-1.4, -0.85, -0.25, 0.35, 0.95, 1.55];
    ctx.lineWidth = 6;
    for (const a of angles) {
      const frondSway = Math.sin(time * 2.2 + a) * 0.16;
      const angle = a + frondSway;
      const endX = topX + Math.cos(angle) * 60;
      const endY = topY + Math.sin(angle) * 38;

      // Dark underleaf
      ctx.strokeStyle = '#14532d';
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(topX + Math.cos(angle) * 35, topY - 14, endX, endY);
      ctx.stroke();

      // Bright top leaf
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(topX + Math.cos(angle) * 32, topY - 16, endX, endY - 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawTotemAltar(
    ctx: CanvasRenderingContext2D,
    totem: LevelData['totemAltar'],
    time: number
  ) {
    const { x, y, w, h, activated } = totem;
    ctx.save();

    // Weathered ancient stone Tiki shrine
    const stoneGrad = ctx.createLinearGradient(x, y, x, y + h);
    stoneGrad.addColorStop(0, '#57534e');
    stoneGrad.addColorStop(1, '#1c1917');
    ctx.fillStyle = stoneGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, [18, 18, 6, 6]);
    ctx.fill();

    // Stone borders & stepped plinth
    ctx.fillStyle = '#78716c';
    ctx.fillRect(x - 8, y + h - 18, w + 16, 18);
    ctx.fillRect(x - 4, y, w + 8, 14);

    // Glowing ancient Tiki runes
    const glow = activated ? 1.0 : Math.sin(time * 3) * 0.25 + 0.75;
    ctx.fillStyle = `rgba(56, 189, 248, ${glow})`;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 18;

    // Expressive carved Tiki eyes
    ctx.beginPath();
    ctx.arc(x + w * 0.32, y + h * 0.34, 7, 0, Math.PI * 2);
    ctx.arc(x + w * 0.68, y + h * 0.34, 7, 0, Math.PI * 2);
    ctx.fill();

    // Sacred ancient glyph
    ctx.beginPath();
    ctx.roundRect(x + w * 0.26, y + h * 0.54, w * 0.48, 9, 3);
    ctx.fill();

    // Crown Sun Crystal
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(x + w * 0.5, y - 10, 16, 0, Math.PI * 2);
    ctx.fill();

    // Radiant vertical light beam reaching into clouds
    ctx.shadowBlur = 0;
    const beamGrad = ctx.createLinearGradient(x + w * 0.5, y - 10, x + w * 0.5, 0);
    beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
    beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(x + w * 0.5 - 24, 0, 48, y - 10);

    ctx.restore();
  }

  private drawCollectibles(
    ctx: CanvasRenderingContext2D,
    collectibles: LevelData['collectibles'],
    time: number
  ) {
    for (const item of collectibles) {
      if (item.collected) continue;

      const bob = Math.sin(time * 3.2 + item.bobOffset) * 6;
      const cy = item.y + bob;
      const cx = item.x + item.w * 0.5;

      ctx.save();
      if (item.type === 'pearl') {
        // Glowing Clam Shell + Iridescent Pearl
        ctx.fillStyle = '#bae6fd';
        ctx.beginPath();
        ctx.arc(cx, cy + 4, 11, Math.PI, 0);
        ctx.fill();

        // Glowing Pearl with radiant bloom
        const pearlGrad = ctx.createRadialGradient(cx - 2, cy - 2, 2, cx, cy, 8);
        pearlGrad.addColorStop(0, '#ffffff');
        pearlGrad.addColorStop(0.6, '#f0f9ff');
        pearlGrad.addColorStop(1, '#38bdf8');
        ctx.fillStyle = pearlGrad;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (item.type === 'coconut') {
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 11, 4, 8, 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (item.type === 'star_fruit') {
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 16;
        this.drawStar(ctx, cx, cy, 5, 12, 6);
      } else if (item.type === 'sun_coin') {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(cx, cy, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (item.type === 'totem_relic') {
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.roundRect(cx - 13, cy - 15, 26, 30, 6);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(cx - 7, cy - 7, 4, 4);
        ctx.fillRect(cx + 3, cy - 7, 4, 4);
      } else if (item.type === 'heart') {
        // Monster drop: a plump blushing heart that begs to be picked up
        const pulse = 1 + Math.sin(time * 6 + item.bobOffset) * 0.08;
        ctx.shadowColor = '#fb7185';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#f43f5e';
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(pulse, pulse);
        ctx.beginPath();
        ctx.moveTo(0, 9);
        ctx.bezierCurveTo(-13, -1, -9, -12, 0, -5.5);
        ctx.bezierCurveTo(9, -12, 13, -1, 0, 9);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(-3.5, -3.5, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(254, 205, 211, 0.9)';
        ctx.beginPath();
        ctx.arc(4, 1, 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerR: number,
    innerR: number
  ) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerR;
      y = cy + Math.sin(rot) * outerR;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerR;
      y = cy + Math.sin(rot) * innerR;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
    ctx.fill();
  }

  private drawHazards(ctx: CanvasRenderingContext2D, hazards: LevelData['hazards'], time: number) {
    for (const haz of hazards) {
      ctx.save();
      const cx = haz.x + haz.w * 0.5;
      const cy = haz.y + haz.h * 0.5;

      if (haz.type === 'urchin') {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx, cy, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4 + Math.sin(time * 4) * 0.1;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * 17, cy + Math.sin(angle) * 17);
          ctx.stroke();
        }
      } else if (haz.type === 'puffer') {
        const puff = Math.sin(time * 3) * 2;
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.arc(cx, cy, 12 + puff, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx - 4, cy - 3, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (haz.type === 'thorn_vine') {
        ctx.fillStyle = '#3f6212';
        ctx.fillRect(haz.x, haz.y + haz.h - 8, haz.w, 8);
        ctx.fillStyle = '#ef4444';
        for (let tx = haz.x + 6; tx < haz.x + haz.w; tx += 12) {
          ctx.beginPath();
          ctx.moveTo(tx, haz.y + haz.h);
          ctx.lineTo(tx + 4, haz.y);
          ctx.lineTo(tx + 8, haz.y + haz.h);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  private drawWildlife(ctx: CanvasRenderingContext2D, wildlife: LevelData['wildlife'], time: number) {
    for (const animal of wildlife) {
      ctx.save();
      const wander = Math.sin(time * 1.5 + (animal.initialX % 10)) * animal.range;
      const currentX = animal.initialX + wander;
      const facing = wander > 0 ? 1 : -1;

      if (animal.type === 'crab') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.ellipse(currentX, animal.y, 10, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#b91c1c';
        ctx.lineWidth = 2.5;
        const clawOffset = Math.sin(time * 8) * 3;
        ctx.beginPath();
        ctx.moveTo(currentX - 7, animal.y - 2);
        ctx.lineTo(currentX - 12, animal.y - 6 + clawOffset);
        ctx.moveTo(currentX + 7, animal.y - 2);
        ctx.lineTo(currentX + 12, animal.y - 6 - clawOffset);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(currentX - 3, animal.y - 7, 2, 0, Math.PI * 2);
        ctx.arc(currentX + 3, animal.y - 7, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (animal.type === 'bird') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        const wingFlap = Math.sin(time * 8) * 8;
        ctx.beginPath();
        ctx.moveTo(currentX - 13, animal.y + wingFlap);
        ctx.quadraticCurveTo(currentX - 6, animal.y - 5, currentX, animal.y);
        ctx.quadraticCurveTo(currentX + 6, animal.y - 5, currentX + 13, animal.y + wingFlap);
        ctx.stroke();
      } else if (animal.type === 'butterfly') {
        const flapRadius = Math.max(1, Math.abs(Math.sin(time * 12)) * 6 + 1);
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(currentX - 4, animal.y, 5, flapRadius, 0.4, 0, Math.PI * 2);
        ctx.ellipse(currentX + 4, animal.y, 5, flapRadius, -0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (animal.type === 'fish') {
        const jumpY = animal.y + Math.sin(time * 3) * 16;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(currentX, jumpY, 9, 4.5, facing * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // =========================================================================
  // Cute Monster Combat rendering
  // =========================================================================

  private drawMonsters(ctx: CanvasRenderingContext2D, monsters: Monster[], time: number) {
    for (const m of monsters) {
      if (m.defeated && m.deathTimer <= 0) continue;

      const dying = m.defeated;
      const deathProgress = dying ? 1 - Math.max(0, m.deathTimer / 0.55) : 0;

      ctx.save();
      const cx = m.x + m.w * 0.5;
      const baseY = m.y + m.h;

      if (dying) {
        ctx.globalAlpha = Math.max(0, 1 - deathProgress);
        ctx.translate(cx, baseY);
        ctx.rotate(deathProgress * 1.4 * m.facing);
        ctx.scale(1 + deathProgress * 0.4, Math.max(0.15, 1 - deathProgress * 0.7));
        ctx.translate(-cx, -baseY);
      }

      const flash = m.hitFlash > 0;

      // Ground contact shadow for a bouncy, readable silhouette
      ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
      ctx.beginPath();
      ctx.ellipse(cx, m.y + m.h + 3, m.w * 0.44, m.w * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();

      this.drawMonsterBody(ctx, m, time, flash);

      if (!dying) {
        this.drawMonsterHpBar(ctx, m);
        this.drawMonsterMoodBubble(ctx, m, time);
      }
      ctx.restore();
    }
  }

  private drawMonsterBody(
    ctx: CanvasRenderingContext2D,
    m: Monster,
    time: number,
    flash: boolean
  ) {
    const species = MONSTER_SPECIES[m.kind];
    const pal = paletteFor(m.kind, m.variant);
    const body = flash ? '#ffffff' : pal.body;
    const dark = flash ? '#f1f5f9' : pal.bodyDark;
    const light = flash ? '#ffffff' : pal.bodyLight;

    const cx = m.x + m.w * 0.5;
    const cy = m.y + m.h * 0.5;
    const wobble = Math.sin(time * 6 + m.phase) * 0.06;
    const moving = Math.abs(m.vx) > 12;
    const hopBob = moving && m.grounded ? Math.abs(Math.sin(time * 9 + m.phase)) * 2.4 : 0;

    ctx.save();
    // squash & stretch + facing, plus a tiny idle breathing wobble
    ctx.translate(cx, m.y + m.h - hopBob);
    const sx = m.squashX * (1 + wobble);
    const sy = m.squashY * (1 - wobble);
    ctx.scale(m.facing * sx, sy);
    ctx.translate(-cx, -(m.y + m.h));

    const mouthOpen = m.state === 'telegraph' || m.state === 'attacking';
    const dizzy = m.state === 'recover';
    const hurt = m.hurtTimer > 0;
    const mood: 'happy' | 'hurt' | 'angry' | 'dizzy' =
      dizzy ? 'dizzy' : hurt ? 'hurt' : mouthOpen ? 'angry' : 'happy';
    const blink = m.blinkTimer < 0.12;

    switch (m.kind) {
      case 'crabling':
      case 'crabking': {
        const boss = m.kind === 'crabking';
        const bw = m.w * 0.5;
        const bh = m.h * 0.42;
        // Legs
        ctx.strokeStyle = dark;
        ctx.lineWidth = boss ? 5 : 3;
        ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          const legSwing = moving ? Math.sin(time * 12 + i) * 3 : 0;
          ctx.beginPath();
          ctx.moveTo(cx + i * bw * 0.5, cy + bh * 0.4);
          ctx.lineTo(cx + i * bw * 0.5 + legSwing, cy + bh + 7);
          ctx.stroke();
        }
        // Claws
        const clawLift = mouthOpen ? -7 : 0;
        for (const side of [-1, 1] as const) {
          ctx.fillStyle = side === -1 ? light : pal.body;
          ctx.beginPath();
          ctx.ellipse(
            cx + side * (bw + (boss ? 12 : 8)),
            cy - clawLift + (moving ? Math.sin(time * 10 + side) * 1.5 : 0),
            boss ? 13 : 8,
            boss ? 12 : 7,
            side * 0.3,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.strokeStyle = dark;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
        // Body
        const grad = ctx.createLinearGradient(cx, cy - bh, cx, cy + bh);
        grad.addColorStop(0, light);
        grad.addColorStop(0.45, body);
        grad.addColorStop(1, dark);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, bw, bh, 0, 0, Math.PI * 2);
        ctx.fill();
        // Belly plate
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + bh * 0.35, bw * 0.6, bh * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        // Crown for the king
        if (boss) this.drawCrown(ctx, cx, cy - bh - 8, 20, pal.accent, time);
        this.drawCuteEyes(ctx, cx, cy - bh * 0.25, boss ? 5.4 : 4, boss ? 9 : 7, blink, mood, 1);
        this.drawBlush(ctx, cx - bw * 0.55, cy + bh * 0.1, boss ? 4 : 3, pal.cheek);
        this.drawBlush(ctx, cx + bw * 0.55, cy + bh * 0.1, boss ? 4 : 3, pal.cheek);
        this.drawMouth(ctx, cx, cy + bh * 0.35, boss ? 6 : 4.5, mouthOpen, mood);
        break;
      }

      case 'jellybub': {
        const bw = m.w * 0.5;
        const bh = m.h * 0.42;
        const pulse = Math.sin(time * 2.6 + m.phase) * 2;
        // Tentacles
        ctx.strokeStyle = flash ? '#ffffff' : pal.accent;
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          const sway = Math.sin(time * 4 + i * 1.4 + m.phase) * 3.5;
          ctx.beginPath();
          ctx.moveTo(cx + i * bw * 0.5, cy + bh * 0.2);
          ctx.quadraticCurveTo(
            cx + i * bw * 0.7 + sway,
            cy + bh * 1.1,
            cx + i * bw * 0.7 - sway,
            cy + bh * 1.7
          );
          ctx.stroke();
        }
        // Glow
        ctx.shadowColor = pal.body;
        ctx.shadowBlur = 18;
        const bellGrad = ctx.createLinearGradient(cx, cy - bh, cx, cy + bh);
        bellGrad.addColorStop(0, '#ffffff');
        bellGrad.addColorStop(0.4, body);
        bellGrad.addColorStop(1, dark);
        ctx.fillStyle = bellGrad;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.ellipse(cx, cy, bw + pulse * 0.4, bh + pulse, 0, Math.PI, Math.PI * 2);
        ctx.lineTo(cx + bw + pulse * 0.4, cy + 2);
        ctx.quadraticCurveTo(cx, cy + 9, cx - bw - pulse * 0.4, cy + 2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        // Bell highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.ellipse(cx - bw * 0.35, cy - bh * 0.4, bw * 0.24, bh * 0.3, -0.4, 0, Math.PI * 2);
        ctx.fill();
        this.drawCuteEyes(ctx, cx, cy - bh * 0.1, 4, 7, blink, mood, 1);
        this.drawBlush(ctx, cx - bw * 0.6, cy + 1, 3.2, pal.cheek);
        this.drawBlush(ctx, cx + bw * 0.6, cy + 1, 3.2, pal.cheek);
        this.drawMouth(ctx, cx, cy + 4, 3.6, mouthOpen, mood);
        break;
      }

      case 'shroomling':
      case 'shroomlord': {
        const boss = m.kind === 'shroomlord';
        const bw = m.w * 0.5;
        const capH = m.h * (boss ? 0.5 : 0.46);
        const stemW = bw * (boss ? 0.5 : 0.44);
        // Stubby legs
        ctx.fillStyle = flash ? '#ffffff' : '#fde68a';
        ctx.beginPath();
        ctx.roundRect(cx - stemW * 0.8, m.y + m.h - 8, stemW * 0.7, 8, 3);
        ctx.roundRect(cx + stemW * 0.1, m.y + m.h - 8, stemW * 0.7, 8, 3);
        ctx.fill();
        // Stem / face
        ctx.fillStyle = flash ? '#ffffff' : '#fef3c7';
        ctx.beginPath();
        ctx.roundRect(cx - stemW, m.y + capH - 2, stemW * 2, m.h - capH - 2, [4, 4, 8, 8]);
        ctx.fill();
        ctx.strokeStyle = flash ? '#e2e8f0' : '#fcd34d';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        // Cap
        const capGrad = ctx.createLinearGradient(cx, m.y, cx, m.y + capH + 4);
        capGrad.addColorStop(0, light);
        capGrad.addColorStop(0.35, body);
        capGrad.addColorStop(1, dark);
        ctx.fillStyle = capGrad;
        ctx.beginPath();
        ctx.ellipse(cx, m.y + capH * 0.72, bw, capH * 0.78, 0, Math.PI, Math.PI * 2);
        ctx.lineTo(cx + bw, m.y + capH * 0.78);
        ctx.quadraticCurveTo(cx, m.y + capH * 1.15, cx - bw, m.y + capH * 0.78);
        ctx.closePath();
        ctx.fill();
        // Dots
        ctx.fillStyle = flash ? '#f8fafc' : pal.accent;
        const dots = boss ? 7 : 4;
        for (let i = 0; i < dots; i++) {
          const a = (i / dots) * Math.PI - Math.PI * 0.02;
          const dx = Math.cos(a) * bw * 0.62;
          const dy = Math.sin(a) * capH * 0.5;
          ctx.beginPath();
          ctx.arc(cx + dx, m.y + capH * 0.8 - dy * 0.6, boss ? 4.5 : 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        if (boss) this.drawCrown(ctx, cx, m.y - 2, 22, pal.accent, time);
        // Eyes + blush on the stem
        const faceY = m.y + capH + (m.h - capH) * 0.32;
        this.drawCuteEyes(ctx, cx, faceY, boss ? 4.6 : 3.6, boss ? 8 : 6.4, blink, mood, 1);
        this.drawBlush(ctx, cx - stemW * 0.72, faceY + 4, boss ? 3.4 : 2.6, pal.cheek);
        this.drawBlush(ctx, cx + stemW * 0.72, faceY + 4, boss ? 3.4 : 2.6, pal.cheek);
        this.drawMouth(ctx, cx, faceY + 7, boss ? 4.4 : 3.2, mouthOpen, mood);
        break;
      }

      case 'budling': {
        const bw = m.w * 0.5;
        // Root / stem into the ground
        ctx.strokeStyle = flash ? '#e2e8f0' : '#15803d';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx, m.y + m.h);
        ctx.lineTo(cx, m.y + m.h - 6);
        ctx.stroke();
        // Leaves
        ctx.fillStyle = flash ? '#ffffff' : '#22c55e';
        for (const side of [-1, 1] as const) {
          ctx.beginPath();
          ctx.ellipse(cx + side * bw * 0.85, m.y + m.h - 6, 8, 4, side * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Petals that open when firing
        const open = mouthOpen ? 1 : 0.55;
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI * 0.5 + (i - 2) * 0.5 * open;
          const px = cx + Math.cos(a) * bw * 0.72;
          const py = m.y + m.h * 0.52 + Math.sin(a) * 10 * open;
          ctx.fillStyle = flash ? '#ffffff' : pal.accent;
          ctx.beginPath();
          ctx.ellipse(px, py, 8, 6, a, 0, Math.PI * 2);
          ctx.fill();
        }
        // Bud head
        const grad = ctx.createRadialGradient(cx - bw * 0.3, m.y + m.h * 0.4, 2, cx, m.y + m.h * 0.5, bw);
        grad.addColorStop(0, light);
        grad.addColorStop(0.6, body);
        grad.addColorStop(1, dark);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, m.y + m.h * 0.52, bw * 0.85, m.h * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawCuteEyes(ctx, cx, m.y + m.h * 0.44, 4, 7, blink, mood, 1);
        this.drawBlush(ctx, cx - bw * 0.62, m.y + m.h * 0.56, 3, pal.cheek);
        this.drawBlush(ctx, cx + bw * 0.62, m.y + m.h * 0.56, 3, pal.cheek);
        if (!mouthOpen) this.drawMouth(ctx, cx, m.y + m.h * 0.62, 3, false, mood);
        break;
      }

      case 'crystimp': {
        const bw = m.w * 0.5;
        const bh = m.h * 0.5;
        // Flapping wings
        const flap = Math.abs(Math.sin(time * 14 + m.phase)) * 8 + 3;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        for (const side of [-1, 1] as const) {
          ctx.beginPath();
          ctx.ellipse(cx + side * (bw + 4), cy - 2, 7, flap, side * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Crystal body (diamond)
        ctx.shadowColor = pal.body;
        ctx.shadowBlur = 16;
        const grad = ctx.createLinearGradient(cx, cy - bh, cx, cy + bh);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, body);
        grad.addColorStop(1, dark);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx, cy - bh);
        ctx.lineTo(cx + bw, cy);
        ctx.lineTo(cx, cy + bh);
        ctx.lineTo(cx - bw, cy);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        // Inner sparkle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.moveTo(cx - bw * 0.2, cy - bh * 0.4);
        ctx.lineTo(cx + bw * 0.25, cy - bh * 0.05);
        ctx.lineTo(cx - bw * 0.05, cy + bh * 0.45);
        ctx.lineTo(cx - bw * 0.35, cy + bh * 0.05);
        ctx.closePath();
        ctx.fill();
        this.drawCuteEyes(ctx, cx, cy - 1, 3.8, 6.6, blink, mood, 1);
        this.drawBlush(ctx, cx - bw * 0.72, cy + 3, 2.6, pal.cheek);
        this.drawBlush(ctx, cx + bw * 0.72, cy + 3, 2.6, pal.cheek);
        if (mouthOpen) this.drawMouth(ctx, cx, cy + 5, 3, true, mood);
        break;
      }

      case 'emberpup': {
        const bw = m.w * 0.5;
        const bh = m.h * 0.44;
        const charging = m.state === 'attacking';
        // Flame tail
        const flameH = charging ? 26 : 16;
        const flick = Math.sin(time * 16) * 2;
        const flameGrad = ctx.createLinearGradient(cx, cy, cx + 18, cy - flameH);
        flameGrad.addColorStop(0, '#f97316');
        flameGrad.addColorStop(0.6, '#fbbf24');
        flameGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(cx + bw * 0.85, cy - 2);
        ctx.quadraticCurveTo(cx + bw * 1.6 + flick, cy - flameH * 0.45, cx + bw * 1.1, cy - flameH);
        ctx.quadraticCurveTo(cx + bw * 1.15, cy - flameH * 0.35, cx + bw * 0.6, cy + 4);
        ctx.closePath();
        ctx.fill();
        // Paws
        ctx.fillStyle = flash ? '#ffffff' : dark;
        for (const side of [-1, 1] as const) {
          ctx.beginPath();
          ctx.ellipse(cx + side * bw * 0.5, cy + bh + 4, 5, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Body
        const grad = ctx.createLinearGradient(cx, cy - bh, cx, cy + bh);
        grad.addColorStop(0, light);
        grad.addColorStop(0.5, body);
        grad.addColorStop(1, dark);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, bw, bh, 0, 0, Math.PI * 2);
        ctx.fill();
        // Ears
        ctx.fillStyle = flash ? '#ffffff' : body;
        for (const side of [-1, 1] as const) {
          ctx.beginPath();
          ctx.ellipse(cx + side * bw * 0.52, cy - bh * 0.92, 5, 8, side * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
        // Muzzle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + bh * 0.42, bw * 0.5, bh * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawCuteEyes(ctx, cx, cy - bh * 0.15, 4, 7, blink, mood, 1);
        this.drawBlush(ctx, cx - bw * 0.66, cy + bh * 0.25, 3, pal.cheek);
        this.drawBlush(ctx, cx + bw * 0.66, cy + bh * 0.25, 3, pal.cheek);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(cx, cy + bh * 0.3, 3, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tongue out when charging — maximum cuteness, minimum mercy
        if (charging) {
          ctx.fillStyle = '#fb7185';
          ctx.beginPath();
          ctx.ellipse(cx + 1, cy + bh * 0.62, 3, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'crystalsphinx': {
        const bw = m.w * 0.5;
        const bh = m.h * 0.5;
        // Cape
        ctx.fillStyle = flash ? '#e2e8f0' : 'rgba(88, 28, 135, 0.85)';
        ctx.beginPath();
        ctx.moveTo(cx - bw * 0.8, cy - bh * 0.4);
        ctx.quadraticCurveTo(cx - bw * 2.1, cy + bh * 0.6, cx - bw * 0.3, cy + bh * 1.25);
        ctx.lineTo(cx + bw * 0.3, cy + bh * 1.25);
        ctx.quadraticCurveTo(cx + bw * 2.1, cy + bh * 0.6, cx + bw * 0.8, cy - bh * 0.4);
        ctx.closePath();
        ctx.fill();
        // Floating crystal body
        const float = Math.sin(time * 2.2 + m.phase) * 3;
        const grad = ctx.createLinearGradient(cx, cy - bh + float, cx, cy + bh + float);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, body);
        grad.addColorStop(1, dark);
        ctx.shadowColor = pal.body;
        ctx.shadowBlur = 22;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx, cy - bh + float);
        ctx.lineTo(cx + bw, cy + float);
        ctx.lineTo(cx + bw * 0.55, cy + bh + float);
        ctx.lineTo(cx - bw * 0.55, cy + bh + float);
        ctx.lineTo(cx - bw, cy + float);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        this.drawCrown(ctx, cx, cy - bh + float - 6, 24, pal.accent, time);
        // Three glowing eyes
        this.drawCuteEyes(ctx, cx, cy - 4 + float, 6, 10, blink, mood, 1);
        ctx.fillStyle = flash ? '#ffffff' : pal.accent;
        ctx.shadowColor = pal.accent;
        ctx.shadowBlur = 10;
        for (const side of [-1, 1] as const) {
          ctx.beginPath();
          ctx.arc(cx + side * bw * 0.52, cy - bh * 0.42 + float, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        this.drawMouth(ctx, cx, cy + 10 + float, 4.5, mouthOpen, mood);
        break;
      }
    }
    ctx.restore();

    // Enraged boss aura
    if (species.isBoss && m.enraged) {
      ctx.save();
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.75)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -time * 30;
      ctx.beginPath();
      ctx.ellipse(cx, cy, m.w * 0.72, m.h * 0.72, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /** Big glossy eyes shared by every monster: the cuteness core. */
  private drawCuteEyes(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    spacing: number,
    blink: boolean,
    mood: 'happy' | 'hurt' | 'angry' | 'dizzy',
    facing: 1 | -1
  ) {
    ctx.save();
    if (mood === 'dizzy') {
      // Swirly X eyes
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.8;
      for (const side of [-1, 1] as const) {
        const ex = cx + side * spacing * 0.5;
        ctx.beginPath();
        ctx.moveTo(ex - r * 0.6, cy - r * 0.6);
        ctx.lineTo(ex + r * 0.6, cy + r * 0.6);
        ctx.moveTo(ex + r * 0.6, cy - r * 0.6);
        ctx.lineTo(ex - r * 0.6, cy + r * 0.6);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    for (const side of [-1, 1] as const) {
      const ex = cx + side * spacing * 0.5;
      if (blink) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(ex - r * 0.7, cy);
        ctx.quadraticCurveTo(ex, cy + r * 0.5, ex + r * 0.7, cy);
        ctx.stroke();
        continue;
      }
      // White
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, cy, r * 0.82, r, 0, 0, Math.PI * 2);
      ctx.fill();
      // Iris
      ctx.fillStyle = mood === 'angry' ? '#7f1d1d' : '#1e293b';
      const pupilShift = facing > 0 ? r * 0.16 : -r * 0.16;
      ctx.beginPath();
      ctx.arc(ex + pupilShift, cy + r * 0.08, r * 0.56, 0, Math.PI * 2);
      ctx.fill();
      // Glossy highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(ex + pupilShift - r * 0.22, cy - r * 0.32, r * 0.24, 0, Math.PI * 2);
      ctx.fill();
      // Angry brows / teary eyes
      if (mood === 'angry') {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(ex - r * 0.8, cy - r * 1.05);
        ctx.lineTo(ex + r * 0.7 * side, cy - r * 0.45);
        ctx.stroke();
      } else if (mood === 'hurt') {
        ctx.fillStyle = '#7dd3fc';
        ctx.beginPath();
        ctx.arc(ex + r * 0.55, cy + r * 0.5, r * 0.26, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawBlush(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawMouth(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    open: boolean,
    mood: 'happy' | 'hurt' | 'angry' | 'dizzy'
  ) {
    ctx.save();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = '#7f1d1d';
    if (mood === 'dizzy') {
      // Wavy dizzy mouth
      ctx.beginPath();
      ctx.moveTo(cx - size, cy);
      ctx.quadraticCurveTo(cx - size * 0.4, cy - size * 0.7, cx, cy);
      ctx.quadraticCurveTo(cx + size * 0.4, cy + size * 0.7, cx + size, cy);
      ctx.stroke();
    } else if (open) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, size, size * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (mood === 'hurt') {
      ctx.beginPath();
      ctx.arc(cx, cy + size * 0.6, size, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else {
      // Happy little "w" smile
      ctx.beginPath();
      ctx.moveTo(cx - size, cy);
      ctx.quadraticCurveTo(cx - size * 0.4, cy + size * 0.8, cx, cy);
      ctx.quadraticCurveTo(cx + size * 0.4, cy + size * 0.8, cx + size, cy);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawCrown(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    width: number,
    color: string,
    time: number
  ) {
    ctx.save();
    const bob = Math.sin(time * 2.5) * 1.5;
    ctx.translate(cx, cy + bob);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(-width * 0.5, 0);
    ctx.lineTo(-width * 0.5, -width * 0.34);
    ctx.lineTo(-width * 0.22, -width * 0.1);
    ctx.lineTo(0, -width * 0.46);
    ctx.lineTo(width * 0.22, -width * 0.1);
    ctx.lineTo(width * 0.5, -width * 0.34);
    ctx.lineTo(width * 0.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(0, -width * 0.12, width * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Floating HP bar that only appears once a monster has been damaged. */
  private drawMonsterHpBar(ctx: CanvasRenderingContext2D, m: Monster) {
    const species = MONSTER_SPECIES[m.kind];
    if (species.isBoss) return; // bosses use the big screen-space bar
    const ratio = m.maxHp > 0 ? Math.max(0, m.hp / m.maxHp) : 0;
    const trail = Math.max(ratio, Math.min(1, m.barTrail));
    const damaged = ratio < 1;
    const recentlyHit = m.hitFlash > 0;
    if (!damaged && !recentlyHit) return;

    const w = Math.max(30, m.w * 1.05);
    const h = 5.5;
    const x = m.x + m.w * 0.5 - w * 0.5;
    const y = m.y - 13;

    ctx.save();
    // Backing plate
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.beginPath();
    ctx.roundRect(x - 2, y - 2, w + 4, h + 4, 4);
    ctx.fill();

    // Delayed white trail (juicy damage feedback)
    if (trail > ratio) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.roundRect(x, y, w * trail, h, 3);
      ctx.fill();
    }

    // Live bar, colour coded by remaining health
    const color = ratio > 0.6 ? '#4ade80' : ratio > 0.3 ? '#facc15' : '#f87171';
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, color);
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(0, w * ratio), h, 3);
    ctx.fill();

    // Cute heart pip at the left edge
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.arc(x - 0.5, y + h * 0.5, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // HP text on hover-ish moments
    if (recentlyHit || m.hurtTimer > 0) {
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.lineWidth = 2.5;
      const label = `${m.hp}/${m.maxHp}`;
      ctx.strokeText(label, m.x + m.w * 0.5, y - 3);
      ctx.fillText(label, m.x + m.w * 0.5, y - 3);
    }
    ctx.restore();
  }

  /** "!" telegraph, "zzz" dizzy stars and love bubbles above a monster. */
  private drawMonsterMoodBubble(ctx: CanvasRenderingContext2D, m: Monster, time: number) {
    const species = MONSTER_SPECIES[m.kind];
    const topY = m.y - (species.isBoss ? 40 : 26);
    const cx = m.x + m.w * 0.5;

    if (m.state === 'telegraph') {
      const bounce = Math.sin(time * 14) * 3;
      ctx.save();
      ctx.fillStyle = 'rgba(254, 240, 138, 0.95)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx, topY + bounce, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', cx, topY + bounce + 0.5);
      ctx.restore();
    } else if (m.state === 'recover' && m.hurtTimer <= 0) {
      // Dizzy stars orbiting the head
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const a = time * 4 + (i / 3) * Math.PI * 2;
        const sx = cx + Math.cos(a) * 14;
        const sy = topY + Math.sin(a) * 5;
        ctx.fillStyle = i % 2 === 0 ? '#fde047' : '#fbbf24';
        this.drawStar(ctx, sx, sy, 5, 4, 1.8);
      }
      ctx.restore();
    } else if (m.state === 'attacking' && MONSTER_SPECIES[m.kind].behavior === 'charger') {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#fb923c';
      for (let i = 0; i < 3; i++) {
        const phase = ((time * 3 + i * 0.33) % 1);
        const lx = cx - m.facing * (10 + phase * 26);
        ctx.globalAlpha = 0.85 * (1 - phase);
        ctx.beginPath();
        ctx.moveTo(lx, m.y + m.h * 0.4);
        ctx.lineTo(lx - m.facing * 10, m.y + m.h * 0.5);
        ctx.lineTo(lx, m.y + m.h * 0.6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawMonsterProjectiles(
    ctx: CanvasRenderingContext2D,
    projectiles: MonsterProjectile[],
    time: number
  ) {
    for (const p of projectiles) {
      if (!p.active) continue;
      const cx = p.x + p.w * 0.5;
      const cy = p.y + p.h * 0.5;
      const fade = Math.min(1, p.life / 0.35);

      ctx.save();
      ctx.globalAlpha = Math.max(0.15, fade);

      if (p.kind === 'spore') {
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(cx, cy, p.w * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        for (let i = 0; i < 3; i++) {
          const a = p.spin + (i / 3) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * 3.5, cy + Math.sin(a) * 3.5, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (p.kind === 'seed') {
        ctx.fillStyle = '#65a30d';
        ctx.beginPath();
        ctx.ellipse(cx, cy, p.w * 0.42, p.w * 0.3, p.spin, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#bef264';
        ctx.beginPath();
        ctx.ellipse(cx - 2, cy - 3, 4, 2.4, p.spin + 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'shard') {
        ctx.shadowColor = '#67e8f9';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.moveTo(cx, cy - p.w * 0.5);
        ctx.lineTo(cx + p.w * 0.32, cy);
        ctx.lineTo(cx, cy + p.w * 0.5);
        ctx.lineTo(cx - p.w * 0.32, cy);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (p.kind === 'bubble') {
        const grad = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, p.w * 0.5);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(0.55, 'rgba(244, 114, 182, 0.55)');
        grad.addColorStop(1, 'rgba(192, 132, 252, 0.35)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, p.w * 0.46, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (p.kind === 'shockwave') {
        // Ground-hugging shockwave with dust plume
        const dir = Math.sign(p.vx) || 1;
        const height = 16 + Math.sin(time * 30) * 3;
        const grad = ctx.createLinearGradient(0, cy - height, 0, cy + p.h * 0.5);
        grad.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
        grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx - dir * p.w * 0.5, cy + p.h * 0.4);
        ctx.quadraticCurveTo(cx, cy - height, cx + dir * p.w * 0.5, cy + p.h * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy + p.h * 0.3, p.w * 0.42, Math.PI, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawDamageNumbers(ctx: CanvasRenderingContext2D, numbers: DamageNumber[]) {
    for (const d of numbers) {
      if (!d.active) continue;
      const progress = 1 - d.life / d.maxLife;
      const alpha = Math.min(1, d.life / (d.maxLife * 0.55));
      const scale = d.scale * (1 + (1 - Math.max(0, progress - 0.15)) * 0.12);

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.translate(d.x, d.y);
      ctx.scale(scale, scale);
      ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeText(d.text, 0, 0);
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, 0, 0);
      ctx.restore();
    }
  }

  /** Melee swing arcs: a crescent palm-leaf slash, or a full spin ring. */
  private drawPlayerAttackVfx(ctx: CanvasRenderingContext2D, p: PlayerState, time: number) {
    if (p.attackTimer <= 0) return;
    const spinning = p.attackIndex === 2;
    const total = spinning ? 0.22 : 0.18;
    const progress = 1 - Math.min(1, p.attackTimer / total);
    const cx = p.x + p.w * 0.5;
    const cy = p.y + p.h * 0.5;

    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress) * 0.95;
    ctx.translate(cx, cy);

    if (spinning) {
      const r = 46;
      ctx.rotate(progress * Math.PI * 2);
      const grad = ctx.createRadialGradient(0, 0, r * 0.45, 0, 0, r);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(0.7, 'rgba(125, 211, 252, 0.45)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.85)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.55, 0, -0.4, 2.2);
      ctx.stroke();
      // Little leaf flecks flying off
      for (let i = 0; i < 5; i++) {
        const a = progress * 6 + i * 1.3;
        ctx.fillStyle = i % 2 === 0 ? '#86efac' : '#fef08a';
        this.drawStar(ctx, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.5, 4, 4, 1.6);
      }
    } else {
      const dir = p.facing;
      ctx.scale(dir, 1);
      const sweep = -0.9 + progress * 1.9;
      ctx.rotate(sweep);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(14, 0, 26, -1.05, 1.05);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.85)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(14, 0, 33, -0.85, 0.85);
      ctx.stroke();
      ctx.fillStyle = 'rgba(254, 240, 138, 0.95)';
      this.drawStar(ctx, 38, Math.sin(progress * 6) * 6, 4, 5, 2);
    }

    // Wind-up shimmer on the 3rd swing
    ctx.restore();

    if (p.attackIndex === 2) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 52 + Math.sin(time * 22) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, p: PlayerState, time: number) {
    ctx.save();
    const cx = p.x + p.w * 0.5;
    const cy = p.y + p.h * 0.5;

    if (p.invulnerableTimer > 0 && Math.floor(time * 20) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    ctx.translate(cx, cy);
    ctx.scale(p.facing * p.squashX, p.squashY);

    // Motion ghost trails & wind streamers when dashing
    if (p.isDashing) {
      const chain = p.dashChainCount ?? 1;
      // Primary ghost echo
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-16, 0, p.w * 0.65, p.h * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      // Secondary chromatic echo for chained air dashes
      if (chain > 1) {
        ctx.fillStyle = 'rgba(192, 132, 252, 0.35)';
        ctx.beginPath();
        ctx.ellipse(-28, 0, p.w * 0.55, p.h * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dynamic wind streamline speed trails
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.lineTo(-32, -8);
      ctx.moveTo(-6, 2);
      ctx.lineTo(-38, 2);
      ctx.moveTo(-12, 12);
      ctx.lineTo(-28, 12);
      ctx.stroke();
    }

    // Palm Leaf Glider umbrella
    if (p.isGliding) {
      ctx.save();
      const glideSway = Math.sin(time * 8) * 0.08;
      ctx.rotate(glideSway);

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(0, -p.h * 0.82, 30, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-26, -p.h * 0.82);
      ctx.lineTo(26, -p.h * 0.82);
      ctx.stroke();

      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -p.h * 0.82);
      ctx.lineTo(2, -p.h * 0.3);
      ctx.stroke();

      ctx.restore();
    }

    // Explorer Character Animation
    const isMoving = Math.abs(p.vx) > 10;
    const walkBob = p.grounded && isMoving ? Math.sin(p.walkCycle) * 3 : 0;
    const legSwing = p.grounded && isMoving ? Math.sin(p.walkCycle) * 8 : 0;

    // Boots
    ctx.fillStyle = '#78350f';
    if (!p.grounded) {
      ctx.fillRect(-6, p.h * 0.28, 5, 8);
      ctx.fillRect(2, p.h * 0.28, 5, 8);
    } else {
      ctx.fillRect(-6 - legSwing, p.h * 0.25, 5, 10);
      ctx.fillRect(2 + legSwing, p.h * 0.25, 5, 10);
    }

    // White Linen Tunic
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(-8, -p.h * 0.15 + walkBob, 16, 20, 4);
    ctx.fill();

    // Satchel Strap & Pouch
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -p.h * 0.1 + walkBob);
    ctx.lineTo(6, p.h * 0.15 + walkBob);
    ctx.stroke();

    ctx.fillStyle = '#b45309';
    ctx.fillRect(3, p.h * 0.08 + walkBob, 7, 7);

    // Fluttering Crimson Scarf
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(-7, -p.h * 0.2 + walkBob, 14, 5, 2);
    ctx.fill();

    const scarfTail = Math.sin(time * 10) * 4 - (p.vx * 0.03);
    ctx.beginPath();
    ctx.moveTo(-6, -p.h * 0.18 + walkBob);
    ctx.quadraticCurveTo(-14, -p.h * 0.16 + scarfTail, -18, -p.h * 0.08 + scarfTail);
    ctx.lineTo(-15, -p.h * 0.02 + scarfTail);
    ctx.closePath();
    ctx.fill();

    // Explorer Head & Face
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(0, -p.h * 0.32 + walkBob, 8.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(2, -p.h * 0.35 + walkBob, 2.5, 3);

    // Straw Explorer Hat
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(0, -p.h * 0.42 + walkBob, 15, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-6, -p.h * 0.52 + walkBob, 12, 6, [4, 4, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-6, -p.h * 0.44 + walkBob, 12, 2);

    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D, pool: ParticlePool) {
    for (const p of pool.particles) {
      if (!p.active) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.type === 'leaf') {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, Math.max(0.5, p.size), Math.max(0.5, p.size * 0.5), p.life * 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'bubble') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (p.type === 'sparkle') {
        this.drawStar(ctx, p.x, p.y, 4, p.size, p.size * 0.4);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawForeOceanWaves(
    ctx: CanvasRenderingContext2D,
    biome: BiomeConfig,
    worldW: number,
    worldH: number,
    time: number
  ) {
    const waveY = worldH - 42;
    ctx.save();

    // Translucent turquoise breaking surf
    ctx.fillStyle = biome.waterColor;
    ctx.beginPath();
    ctx.moveTo(0, worldH);
    ctx.lineTo(0, waveY);
    for (let x = 0; x <= worldW; x += 30) {
      const foam = Math.sin(x * 0.03 + time * 3.2) * 8 + Math.cos(x * 0.05 - time * 2.2) * 4;
      ctx.lineTo(x, waveY + foam);
    }
    ctx.lineTo(worldW, worldH);
    ctx.closePath();
    ctx.fill();

    // Luminous sea foam crest line
    ctx.strokeStyle = biome.waterFoamColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let x = 0; x <= worldW; x += 30) {
      const foam = Math.sin(x * 0.03 + time * 3.2) * 8 + Math.cos(x * 0.05 - time * 2.2) * 4;
      if (x === 0) ctx.moveTo(x, waveY + foam);
      else ctx.lineTo(x, waveY + foam);
    }
    ctx.stroke();

    ctx.restore();
  }

  private drawScreenAtmosphere(
    ctx: CanvasRenderingContext2D,
    biome: BiomeConfig,
    player: PlayerState,
    w: number,
    h: number,
    _time: number
  ) {
    ctx.save();
    if (player.health === 1) {
      const vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.3, w * 0.5, h * 0.5, w * 0.75);
      vignette.addColorStop(0, 'rgba(239, 68, 68, 0)');
      vignette.addColorStop(1, 'rgba(239, 68, 68, 0.35)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    }

    const cineVignette = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.5, w * 0.5, h * 0.5, w * 0.9);
    cineVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    cineVignette.addColorStop(1, biome.id === 'sunset' ? 'rgba(46, 16, 101, 0.25)' : 'rgba(12, 74, 110, 0.18)');
    ctx.fillStyle = cineVignette;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  private drawWeatherOverlay(
    ctx: CanvasRenderingContext2D,
    weather: WeatherState,
    w: number,
    h: number,
    time: number
  ) {
    if (weather.currentType === 'heatwave') {
      this.drawHeatWaveOverlay(ctx, weather, w, h, time);
    } else if (weather.currentType === 'rain') {
      this.drawRainOverlay(ctx, weather, w, h, time);
    } else if (weather.currentType === 'twilight_aurora') {
      this.drawTwilightAuroraOverlay(ctx, weather, w, h, time);
    }
  }

  private drawHeatWaveOverlay(
    ctx: CanvasRenderingContext2D,
    weather: WeatherState,
    w: number,
    h: number,
    time: number
  ) {
    ctx.save();

    // 1. Warm shimmering mirage bands across lower screen / sand level
    const startY = h * 0.45;
    const bandHeight = 12;

    for (let y = startY; y < h; y += bandHeight * 1.5) {
      const offset = computeHeatWaveOffset(y, time, weather.intensity);
      const alpha = 0.04 + Math.sin(time * 2 + y * 0.05) * 0.025;

      const grad = ctx.createLinearGradient(0, y, w, y);
      grad.addColorStop(0, `rgba(254, 240, 138, ${alpha * 0.4})`);
      grad.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.8})`);
      grad.addColorStop(1, `rgba(254, 240, 138, ${alpha * 0.4})`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, y + offset);
      ctx.bezierCurveTo(
        w * 0.33,
        y - offset * 1.8,
        w * 0.66,
        y + offset * 1.8,
        w,
        y - offset
      );
      ctx.lineTo(w, y + bandHeight);
      ctx.lineTo(0, y + bandHeight);
      ctx.closePath();
      ctx.fill();
    }

    // 2. Rising heat sparkle motes
    ctx.fillStyle = '#fef08a';
    for (let i = 0; i < 14; i++) {
      const sparkX = ((i * 123.4 + time * 30) % (w + 40)) - 20;
      const progress = ((time * 0.6 + i * 0.15) % 1);
      const sparkY = h - progress * (h * 0.45);
      const sparkAlpha = Math.sin(progress * Math.PI) * 0.55;
      const size = 1.5 + (i % 2.5);

      ctx.globalAlpha = Math.max(0, Math.min(1, sparkAlpha));
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Ambient warm golden solar shimmer
    const sunPulse = Math.sin(time * 2.5) * 0.02 + 0.04;
    const solarGlow = ctx.createRadialGradient(w * 0.75, h * 0.25, 20, w * 0.75, h * 0.25, w * 0.6);
    solarGlow.addColorStop(0, `rgba(254, 240, 138, ${sunPulse})`);
    solarGlow.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = solarGlow;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  private drawRainOverlay(
    ctx: CanvasRenderingContext2D,
    weather: WeatherState,
    w: number,
    h: number,
    time: number
  ) {
    ctx.save();

    // 1. Drifting tropical rain mist bands
    const mistGrad = ctx.createLinearGradient(0, h * 0.4, 0, h);
    mistGrad.addColorStop(0, 'rgba(204, 251, 241, 0)');
    mistGrad.addColorStop(0.5, 'rgba(204, 251, 241, 0.08)');
    mistGrad.addColorStop(1, 'rgba(204, 251, 241, 0.16)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, h * 0.4, w, h * 0.6);

    // Drifting canopy mist clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    for (let i = 0; i < 3; i++) {
      const mistX = ((weather.mistOffset + i * (w / 3)) % (w + 300)) - 150;
      const mistY = h * 0.35 + Math.sin(time * 0.8 + i) * 20;
      ctx.beginPath();
      ctx.ellipse(mistX, mistY, 180, 45, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Light falling tropical rain streaks
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.42)';
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    const slant = (weather.windSpeed / 100) * 18;

    ctx.beginPath();
    for (let i = 0; i < weather.rainDrops.length; i++) {
      const drop = weather.rainDrops[i];
      // Only draw drops within visible viewport bounds
      if (drop.x >= -50 && drop.x <= w + 50 && drop.y >= -20 && drop.y <= h + 20) {
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + slant, drop.y + drop.length);
      }
    }
    ctx.stroke();

    // 3. Small water ripple splashes on bottom water line
    ctx.strokeStyle = 'rgba(240, 253, 250, 0.35)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 8; i++) {
      const ripplePhase = ((time * 3 + i * 0.35) % 1);
      const rx = ((i * 187 + 50) % (w - 100)) + 50;
      const ry = h - 35 + ((i * 7) % 20);
      const rSize = Math.max(1, ripplePhase * 16);
      const alpha = (1 - ripplePhase) * 0.4;

      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.beginPath();
      ctx.ellipse(rx, ry, rSize, Math.max(0.5, rSize * 0.35), 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawTwilightAuroraOverlay(
    ctx: CanvasRenderingContext2D,
    weather: WeatherState,
    w: number,
    h: number,
    time: number
  ) {
    ctx.save();

    // 1. Ethereal twilight auroral wave ribbons
    const ribbonCount = 2;
    for (let r = 0; r < ribbonCount; r++) {
      const wavePhase = time * 0.6 + r * 1.5;
      const startY = h * 0.18 + r * 60;
      const sway = Math.sin(wavePhase) * 35;

      const auroraGrad = ctx.createLinearGradient(0, startY - 40, 0, startY + 80);
      auroraGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      auroraGrad.addColorStop(0.4, r === 0 ? 'rgba(45, 212, 191, 0.12)' : 'rgba(236, 72, 153, 0.1)');
      auroraGrad.addColorStop(0.7, r === 0 ? 'rgba(168, 85, 247, 0.08)' : 'rgba(251, 146, 60, 0.08)');
      auroraGrad.addColorStop(1, 'rgba(147, 51, 234, 0)');

      ctx.fillStyle = auroraGrad;
      ctx.beginPath();
      ctx.moveTo(0, startY);
      ctx.bezierCurveTo(
        w * 0.3,
        startY + sway,
        w * 0.7,
        startY - sway,
        w,
        startY + sway * 0.5
      );
      ctx.lineTo(w, startY + 90);
      ctx.bezierCurveTo(
        w * 0.7,
        startY + 90 - sway,
        w * 0.3,
        startY + 90 + sway,
        0,
        startY + 90
      );
      ctx.closePath();
      ctx.fill();
    }

    // 2. Bioluminescent floating firefly embers drifting upward
    for (let i = 0; i < 16; i++) {
      const emberX = ((i * 98.7 + time * 12) % (w + 50)) - 25;
      const progress = ((time * 0.4 + i * 0.2) % 1);
      const emberY = h - progress * (h * 0.75);
      const emberSway = Math.sin(time * 2 + i) * 12;
      const alpha = Math.sin(progress * Math.PI) * 0.65;
      const size = 1.5 + (i % 2.5);

      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = i % 2 === 0 ? '#67e8f9' : '#f472b6';
      ctx.shadowColor = i % 2 === 0 ? '#38bdf8' : '#ec4899';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(emberX + emberSway, emberY, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
