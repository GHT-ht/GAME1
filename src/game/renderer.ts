import type { LevelData, PlayerState, BiomeConfig, BiomeId } from './types.ts';
import type { ParticlePool } from './particles.ts';
import { type WeatherState, computeHeatWaveOffset } from './weather.ts';
import beachBgUrl from '../assets/images/beach_bg.jpg';
import jungleBgUrl from '../assets/images/jungle_bg.jpg';
import sunsetBgUrl from '../assets/images/sunset_bg.jpg';

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
    time: number
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

    // 7. Collectibles (Glowing Pearls, Fruits, Sun Coins, Relics)
    this.drawCollectibles(ctx, level.collectibles, time);

    // 8. Zero-GC Pooled Particles (Dust, Leaves, Sparkles, Water Splashes)
    this.drawParticles(ctx, particles);

    // 9. Animated Adventurer Character
    this.drawPlayer(ctx, player, time);

    // 10. Foreground Breaking Surf & Foam
    this.drawForeOceanWaves(ctx, biome, level.worldWidth, level.worldHeight, time);

    // Restore Camera Context
    ctx.restore();

    // 11. Atmospheric Lighting, Sun Rays & Vignette
    this.drawScreenAtmosphere(ctx, biome, player, viewportW, viewportH, time);

    // 12. Dynamic Biome Weather Overlay (Heat waves, Tropical rain, Twilight aurora)
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
