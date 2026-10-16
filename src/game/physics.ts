import type { PlayerState, Platform, Rect, Collectible, Hazard } from './types.ts';

export const GRAVITY = 850; // px/s^2
export const GLIDE_GRAVITY = 160; // slow float when gliding
export const MAX_FALL_SPEED = 650;
export const MAX_GLIDE_FALL_SPEED = 140;
export const MOVE_ACCEL = 1800;
export const MAX_SPEED = 240;
export const FRICTION = 0.82;
export const AIR_RESISTANCE = 0.94;
export const JUMP_VELOCITY = -410;
export const DOUBLE_JUMP_VELOCITY = -380;
export const TRIPLE_JUMP_VELOCITY = -410;
export const BOUNCE_PAD_VELOCITY = -740;
export const SUPER_BOUNCE_PAD_VELOCITY = -860;
export const DASH_SPEED = 540;
export const DASH_DURATION = 0.16; // seconds
export const DASH_COOLDOWN = 0.14; // seconds (fast cooldown for fluid air chaining)
export const MAX_AIR_DASHES = 3;
export const MAX_JUMPS = 3;
export const COYOTE_TIME = 0.12; // seconds
export const JUMP_BUFFER_TIME = 0.12; // seconds
export const INVULNERABLE_TIME = 1.2; // seconds

export function createInitialPlayer(spawnX: number, spawnY: number): PlayerState {
  return {
    x: spawnX,
    y: spawnY,
    w: 28,
    h: 44,
    vx: 0,
    vy: 0,
    grounded: false,
    facing: 1,
    isGliding: false,
    isDashing: false,
    dashTimer: 0,
    dashCooldown: 0,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    canDoubleJump: true,
    jumpsLeft: 3,
    maxJumps: 3,
    airDashesLeft: 3,
    maxAirDashes: 3,
    dashChainCount: 0,
    health: 3,
    maxHealth: 3,
    invulnerableTimer: 0,
    pearls: 0,
    fruits: 0,
    sunCoins: 0,
    relicsFound: 0,
    walkCycle: 0,
    squashX: 1,
    squashY: 1,
    distanceTraveled: 0,
    lastSafeX: spawnX,
    lastSafeY: spawnY,
  };
}

export function rectIntersect(r1: Rect, r2: Rect): boolean {
  return (
    r1.x < r2.x + r2.w &&
    r1.x + r1.w > r2.x &&
    r1.y < r2.y + r2.h &&
    r1.y + r1.h > r2.y
  );
}

export interface InputState {
  left: boolean;
  right: boolean;
  up?: boolean;
  down: boolean;
  jumpJustPressed: boolean;
  jumpHeld: boolean;
  dashJustPressed: boolean;
}

export interface PhysicsEvents {
  jumped: boolean;
  doubleJumped: boolean;
  tripleJumped: boolean;
  bounced: boolean;
  superBounced: boolean;
  landed: boolean;
  dashed: boolean;
  chainDashCount: number;
  glidingStarted: boolean;
  hurt: boolean;
  collectedItem?: Collectible;
  waterHit: boolean;
}

export function updatePlayerPhysics(
  player: PlayerState,
  input: InputState,
  platforms: Platform[],
  collectibles: Collectible[],
  hazards: Hazard[],
  dt: number,
  worldWidth: number,
  worldHeight: number
): { player: PlayerState; events: PhysicsEvents } {
  const events: PhysicsEvents = {
    jumped: false,
    doubleJumped: false,
    tripleJumped: false,
    bounced: false,
    superBounced: false,
    landed: false,
    dashed: false,
    chainDashCount: player.dashChainCount ?? 0,
    glidingStarted: false,
    hurt: false,
    waterHit: false,
  };

  // Clamp dt to avoid physics tunnelling
  const stepDt = Math.min(dt, 0.05);

  // Timers
  if (player.dashCooldown > 0) player.dashCooldown = Math.max(0, player.dashCooldown - stepDt);
  if (player.invulnerableTimer > 0) player.invulnerableTimer = Math.max(0, player.invulnerableTimer - stepDt);

  if (player.grounded) {
    player.coyoteTimer = COYOTE_TIME;
    player.jumpsLeft = player.maxJumps ?? 3;
    player.canDoubleJump = true;
    player.airDashesLeft = player.maxAirDashes ?? 3;
    player.dashChainCount = 0;
  } else {
    player.coyoteTimer = Math.max(0, player.coyoteTimer - stepDt);
  }

  if (input.jumpJustPressed) {
    player.jumpBufferTimer = JUMP_BUFFER_TIME;
  } else {
    player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - stepDt);
  }

  // Dash initiation: can dash on ground or in air with continuous chained bursts
  const canDash = player.dashCooldown <= 0 && !player.isDashing && (player.grounded || (player.airDashesLeft ?? 3) > 0);
  if (input.dashJustPressed && canDash) {
    player.isDashing = true;
    player.dashTimer = DASH_DURATION;
    player.dashCooldown = DASH_COOLDOWN;

    // Direction calculation
    const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const dirX = moveX !== 0 ? moveX : player.facing;
    player.facing = dirX as 1 | -1;

    // Upward angle lift if holding up
    const hasUp = Boolean(input.up);
    if (hasUp) {
      player.vx = dirX * DASH_SPEED * 0.9;
      player.vy = -180;
    } else {
      player.vx = dirX * DASH_SPEED;
      player.vy = -20; // slight aerodynamic lift, negating gravity during dash
    }

    if (!player.grounded) {
      player.airDashesLeft = Math.max(0, (player.airDashesLeft ?? 3) - 1);
      player.dashChainCount = (player.dashChainCount ?? 0) + 1;
    } else {
      player.dashChainCount = 1;
    }

    events.dashed = true;
    events.chainDashCount = player.dashChainCount;
    player.squashX = 1.35;
    player.squashY = 0.75;
  }

  // Handle Dash active
  if (player.isDashing) {
    player.dashTimer -= stepDt;
    if (player.dashTimer <= 0) {
      player.isDashing = false;
      // Physical intuition: smooth momentum preservation!
      // Velocity glides smoothly from dash burst with natural aerodynamic drag,
      // allowing the player to carry forward momentum or chain into the next dash!
      player.vx = player.facing * Math.min(DASH_SPEED * 0.75, Math.abs(player.vx));
    }
  } else {
    // Normal Horizontal movement
    const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (moveDir !== 0) {
      player.facing = moveDir as 1 | -1;
      player.vx += moveDir * MOVE_ACCEL * stepDt;
      if (Math.abs(player.vx) > MAX_SPEED) {
        player.vx = Math.sign(player.vx) * MAX_SPEED;
      }
      player.distanceTraveled += Math.abs(player.vx) * stepDt;
      player.walkCycle += stepDt * 10;
    } else {
      player.vx *= player.grounded ? FRICTION : AIR_RESISTANCE;
      if (Math.abs(player.vx) < 5) player.vx = 0;
    }

    // Gliding check: in air, falling, holding jump
    const canGlide = !player.grounded && player.vy > 0 && input.jumpHeld;
    if (canGlide && !player.isGliding) {
      events.glidingStarted = true;
    }
    player.isGliding = canGlide;

    // Vertical physics: Gravity
    const currentGravity = player.isGliding ? GLIDE_GRAVITY : GRAVITY;
    player.vy += currentGravity * stepDt;

    const maxFall = player.isGliding ? MAX_GLIDE_FALL_SPEED : MAX_FALL_SPEED;
    if (player.vy > maxFall) {
      player.vy = maxFall;
    }

    // Variable jump cut: release jump while ascending
    if (!input.jumpHeld && player.vy < -50) {
      player.vy *= 0.55;
    }

    // Jump handling with Coyote Time, Buffering, and Triple Jump
    if (player.jumpBufferTimer > 0) {
      if (player.coyoteTimer > 0) {
        // 1st Stage: Ground / Coyote Jump
        player.vy = JUMP_VELOCITY;
        player.jumpBufferTimer = 0;
        player.coyoteTimer = 0;
        player.grounded = false;
        player.jumpsLeft = 2; // 2 air jumps left
        player.canDoubleJump = true;
        player.squashX = 0.8;
        player.squashY = 1.25;
        events.jumped = true;
      } else if (player.jumpsLeft >= 2 || (player.canDoubleJump && player.jumpsLeft > 1)) {
        // 2nd Stage: Double Jump with leaf gust
        player.vy = DOUBLE_JUMP_VELOCITY;
        player.jumpBufferTimer = 0;
        player.jumpsLeft = 1; // 1 air jump left (triple jump ready!)
        player.canDoubleJump = true;
        player.squashX = 0.85;
        player.squashY = 1.2;
        events.doubleJumped = true;
      } else if (player.jumpsLeft === 1) {
        // 3rd Stage: TRIPLE JUMP! Ethereal soaring leap
        player.vy = TRIPLE_JUMP_VELOCITY;
        player.jumpBufferTimer = 0;
        player.jumpsLeft = 0;
        player.canDoubleJump = false;
        player.squashX = 0.75;
        player.squashY = 1.35;
        events.tripleJumped = true;
      }
    }
  }

  // Integrate movement X
  player.x += player.vx * stepDt;

  // Collision with boundaries
  if (player.x < 0) {
    player.x = 0;
    player.vx = 0;
  }
  if (player.x + player.w > worldWidth) {
    player.x = worldWidth - player.w;
    player.vx = 0;
  }

  // Solid Platform Collision X
  const playerBox: Rect = { x: player.x, y: player.y, w: player.w, h: player.h };
  for (const plat of platforms) {
    if (plat.type === 'solid' && rectIntersect(playerBox, plat)) {
      if (player.vx > 0) {
        player.x = plat.x - player.w;
      } else if (player.vx < 0) {
        player.x = plat.x + plat.w;
      }
      player.vx = 0;
      break;
    }
  }

  // Integrate movement Y
  const prevY = player.y;
  player.y += player.vy * stepDt;

  const wasGrounded = player.grounded;
  player.grounded = false;

  // Platform Collision Y
  for (const plat of platforms) {
    // Check moving platform movement
    const platBox: Rect = { x: plat.x, y: plat.y, w: plat.w, h: plat.h };

    if (plat.type === 'solid') {
      if (rectIntersect({ x: player.x, y: player.y, w: player.w, h: player.h }, platBox)) {
        if (player.vy > 0 && prevY + player.h <= plat.y + 12) {
          // Landing on top
          player.y = plat.y - player.h;
          player.vy = 0;
          player.grounded = true;
          if (!wasGrounded) {
            events.landed = true;
            player.squashX = 1.25;
            player.squashY = 0.8;
          }
        } else if (player.vy < 0 && prevY >= plat.y + plat.h - 10) {
          // Hitting ceiling
          player.y = plat.y + plat.h;
          player.vy = 0;
        }
      }
    } else if (plat.type === 'one-way' || plat.type === 'moving' || plat.type === 'sand') {
      // Land on top only when falling through top boundary
      if (
        player.vy >= 0 &&
        prevY + player.h <= plat.y + 14 &&
        player.y + player.h >= plat.y &&
        player.x + player.w > plat.x + 4 &&
        player.x < plat.x + plat.w - 4
      ) {
        player.y = plat.y - player.h;
        player.vy = 0;
        player.grounded = true;
        if (!wasGrounded) {
          events.landed = true;
          player.squashX = 1.2;
          player.squashY = 0.82;
        }
      }
    } else if (plat.type === 'bouncy') {
      // Spring Booster Pad (Tiki Drum / Trampoline): Effortless, reliable launch!
      // Generous bounding box detection: whether walking, falling, or landing onto the pad
      const overPadX = (player.x + player.w >= plat.x - 6) && (player.x <= plat.x + plat.w + 6);
      const touchingPadY = (player.y + player.h >= plat.y - 10) && (player.y <= plat.y + plat.h + 16);

      if (overPadX && touchingPadY) {
        // Generous super boost if jump is pressed or held
        const isSuperBounce = input.jumpJustPressed || input.jumpHeld;
        const launchVelocity = isSuperBounce ? SUPER_BOUNCE_PAD_VELOCITY : BOUNCE_PAD_VELOCITY;

        player.y = plat.y - player.h;
        player.vy = launchVelocity;
        player.grounded = false;
        player.jumpsLeft = player.maxJumps ?? 3;
        player.canDoubleJump = true;
        player.airDashesLeft = player.maxAirDashes ?? 3;
        player.dashCooldown = 0;
        events.bounced = true;
        events.superBounced = isSuperBounce;
        player.squashX = isSuperBounce ? 0.6 : 0.72;
        player.squashY = isSuperBounce ? 1.45 : 1.35;
      }
    }
  }

  // Damping squash and stretch back to 1.0
  player.squashX += (1 - player.squashX) * Math.min(1, stepDt * 12);
  player.squashY += (1 - player.squashY) * Math.min(1, stepDt * 12);

  // Track safe platform position when grounded
  if (player.grounded) {
    player.lastSafeX = player.x;
    player.lastSafeY = player.y;
  }

  // Bottom world hazard check (falling into ocean depths)
  if (player.y + player.h >= worldHeight - 20) {
    events.waterHit = true;
    player.health = Math.max(0, player.health - 1);
    events.hurt = true;
    player.invulnerableTimer = INVULNERABLE_TIME;
    // Respawn safely at last grounded platform
    player.x = player.lastSafeX;
    player.y = player.lastSafeY;
    player.vx = 0;
    player.vy = -180;
    player.grounded = true;
  }

  // Hazard interactions
  if (player.invulnerableTimer <= 0) {
    const currentBox: Rect = { x: player.x, y: player.y, w: player.w, h: player.h };
    for (const haz of hazards) {
      if (rectIntersect(currentBox, haz)) {
        player.health = Math.max(0, player.health - haz.harmValue);
        player.invulnerableTimer = INVULNERABLE_TIME;
        player.vy = -260;
        player.vx = -player.facing * 180;
        events.hurt = true;
        break;
      }
    }
  }

  // Collectibles collection check
  const playerCollectBox: Rect = {
    x: player.x - 4,
    y: player.y - 4,
    w: player.w + 8,
    h: player.h + 8,
  };

  for (const item of collectibles) {
    if (!item.collected && rectIntersect(playerCollectBox, item)) {
      item.collected = true;
      if (item.type === 'pearl') {
        player.pearls += 1;
      } else if (item.type === 'coconut' || item.type === 'star_fruit') {
        player.fruits += 1;
        // Fruits heal 1 HP if damaged
        if (player.health < player.maxHealth) {
          player.health += 1;
        }
      } else if (item.type === 'sun_coin') {
        player.sunCoins += 1;
        player.pearls += 5; // sun coins give 5 pearls equivalent
      } else if (item.type === 'totem_relic') {
        player.relicsFound += 1;
      }
      events.collectedItem = item;
      break;
    }
  }

  return { player, events };
}

export function calculateScoreAndStars(
  timeSeconds: number,
  collectedPearls: number,
  targetPearls: number,
  relicFound: boolean
): { score: number; stars: number } {
  // Score formula: Pearls * 100 + Relic bonus (1500) + Time bonus
  const pearlScore = collectedPearls * 100;
  const relicScore = relicFound ? 1500 : 0;
  const timeBonus = Math.max(0, Math.floor(3000 - timeSeconds * 25));
  const totalScore = pearlScore + relicScore + timeBonus;

  // Star calculation
  let stars = 1;
  const pearlRatio = targetPearls > 0 ? collectedPearls / targetPearls : 1;
  if (pearlRatio >= 0.7) stars = 2;
  if (pearlRatio >= 0.95 && relicFound) stars = 3;

  return { score: totalScore, stars };
}
