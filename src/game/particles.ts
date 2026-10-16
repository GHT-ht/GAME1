import type { Particle } from './types.ts';

const MAX_PARTICLES = 160;

export class ParticlePool {
  public particles: Particle[];

  constructor() {
    this.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 3,
        alpha: 1,
        color: '#ffffff',
        life: 0,
        maxLife: 1,
        type: 'sparkle',
      });
    }
  }

  public spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    color: string,
    maxLife: number,
    type: Particle['type'] = 'sparkle'
  ) {
    // Find first inactive or oldest particle
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.size = size;
        p.color = color;
        p.life = maxLife;
        p.maxLife = maxLife;
        p.alpha = 1;
        p.type = type;
        return;
      }
    }
  }

  public emitDust(x: number, y: number, count: number = 4) {
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 80;
      const vy = -Math.random() * 50 - 10;
      this.spawn(x + (Math.random() - 0.5) * 16, y, vx, vy, Math.random() * 3 + 2, '#fef08a', 0.35, 'dust');
    }
  }

  public emitLeafBurst(x: number, y: number, count: number = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 120 + 40;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 30;
      const leafColors = ['#4ade80', '#22c55e', '#86efac'];
      const color = leafColors[Math.floor(Math.random() * leafColors.length)];
      this.spawn(x, y, vx, vy, Math.random() * 4 + 3, color, 0.55, 'leaf');
    }
  }

  public emitSparkles(x: number, y: number, count: number = 8, color: string = '#fef08a') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 140 + 30;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.spawn(x, y, vx, vy, Math.random() * 4 + 2, color, 0.6, 'sparkle');
    }
  }

  public emitWaterSplash(x: number, y: number, count: number = 10) {
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 140;
      const vy = -Math.random() * 180 - 60;
      const waterColors = ['#bae6fd', '#7dd3fc', '#ffffff'];
      const color = waterColors[Math.floor(Math.random() * waterColors.length)];
      this.spawn(x, y, vx, vy, Math.random() * 4 + 2, color, 0.45, 'bubble');
    }
  }

  public emitTripleJumpBurst(x: number, y: number) {
    // Halo of ethereal wind feathers and ascending crystalline sparkles
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const speed = Math.random() * 160 + 60;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * (speed * 0.5) + 30; // downward cloud ring
      const colors = ['#fef08a', '#38bdf8', '#c084fc', '#ffffff'];
      const color = colors[i % colors.length];
      this.spawn(x, y + 14, vx, vy, Math.random() * 4 + 3, color, 0.55, 'feather');
    }
  }

  public emitDashContrail(x: number, y: number, facing: number, chainCount: number = 1) {
    // Aerodynamic wind contrails and speed sparkles streaming behind character
    const count = 4 + chainCount * 2;
    const colors = chainCount > 1 
      ? ['#38bdf8', '#818cf8', '#c084fc', '#ffffff'] 
      : ['#bae6fd', '#38bdf8', '#ffffff'];

    for (let i = 0; i < count; i++) {
      const vx = -facing * (Math.random() * 180 + 80);
      const vy = (Math.random() - 0.5) * 40;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.spawn(x - facing * 12, y + (Math.random() - 0.5) * 16, vx, vy, Math.random() * 3 + 2, color, 0.35, 'sparkle');
    }
  }

  public emitBounceBurst(x: number, y: number, isSuper: boolean = false) {
    const count = isSuper ? 20 : 12;
    const colors = isSuper 
      ? ['#facc15', '#f59e0b', '#fb923c', '#ffffff', '#38bdf8'] 
      : ['#f59e0b', '#fbbf24', '#fef08a'];

    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * (isSuper ? 2.4 : 1.8);
      const speed = Math.random() * (isSuper ? 260 : 180) + 70;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.spawn(x, y, vx, vy, Math.random() * 4 + (isSuper ? 3 : 2), color, isSuper ? 0.7 : 0.5, 'sparkle');
    }
  }

  public update(dt: number) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.alpha = Math.max(0, p.life / p.maxLife);
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Gravity based on type
      if (p.type === 'leaf') {
        p.vy += 60 * dt; // light fluttering
        p.vx += Math.sin(p.life * 10) * 15 * dt;
      } else if (p.type === 'bubble' || p.type === 'dust') {
        p.vy += 300 * dt;
      } else if (p.type === 'sparkle') {
        p.vx *= 0.95;
        p.vy *= 0.95;
      }
    }
  }

  public clear() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles[i].active = false;
    }
  }
}
