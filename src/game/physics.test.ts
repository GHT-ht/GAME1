import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialPlayer,
  rectIntersect,
  updatePlayerPhysics,
  calculateScoreAndStars,
  COYOTE_TIME,
  BOUNCE_PAD_VELOCITY,
  SUPER_BOUNCE_PAD_VELOCITY,
  JUMP_VELOCITY,
  DOUBLE_JUMP_VELOCITY,
  TRIPLE_JUMP_VELOCITY,
} from './physics.ts';
import type { Platform, Collectible, Hazard } from './types.ts';

test('createInitialPlayer creates valid defaults with full health', () => {
  const p = createInitialPlayer(100, 200);
  assert.equal(p.x, 100);
  assert.equal(p.y, 200);
  assert.equal(p.health, 3);
  assert.equal(p.maxHealth, 3);
  assert.equal(p.grounded, false);
  assert.equal(p.pearls, 0);
  assert.equal(p.canDoubleJump, true);
});

test('rectIntersect correctly detects overlapping and separate boxes', () => {
  const r1 = { x: 10, y: 10, w: 20, h: 20 };
  const r2 = { x: 25, y: 25, w: 20, h: 20 }; // overlaps
  const r3 = { x: 50, y: 50, w: 10, h: 10 }; // separate

  assert.equal(rectIntersect(r1, r2), true);
  assert.equal(rectIntersect(r1, r3), false);
});

test('player lands solid on top of ground platform and stops falling', () => {
  const p = createInitialPlayer(50, 80);
  p.vy = 200; // falling

  const platforms: Platform[] = [
    { x: 0, y: 120, w: 200, h: 40, type: 'solid' },
  ];

  const emptyInput = {
    left: false,
    right: false,
    jumpJustPressed: false,
    jumpHeld: false,
    dashJustPressed: false,
    down: false,
  };

  const { player, events } = updatePlayerPhysics(p, emptyInput, platforms, [], [], 0.05, 500, 500);

  assert.equal(player.grounded, true);
  assert.equal(player.vy, 0);
  assert.equal(player.y, 120 - player.h);
  assert.equal(events.landed, true);
});

test('coyote time allows jumping briefly after falling off ledge', () => {
  const p = createInitialPlayer(50, 100);
  p.grounded = false;
  p.coyoteTimer = COYOTE_TIME;

  const jumpInput = {
    left: false,
    right: false,
    jumpJustPressed: true,
    jumpHeld: true,
    dashJustPressed: false,
    down: false,
  };

  const { player, events } = updatePlayerPhysics(p, jumpInput, [], [], [], 0.016, 500, 500);

  assert.equal(events.jumped, true);
  assert.equal(player.vy, JUMP_VELOCITY);
  assert.equal(player.coyoteTimer, 0);
});

test('bouncy tiki platform launches player with high velocity', () => {
  const p = createInitialPlayer(50, 95);
  p.vy = 150;

  const platforms: Platform[] = [
    { x: 30, y: 130, w: 60, h: 20, type: 'bouncy' },
  ];

  const emptyInput = {
    left: false,
    right: false,
    jumpJustPressed: false,
    jumpHeld: false,
    dashJustPressed: false,
    down: false,
  };

  const { player, events } = updatePlayerPhysics(p, emptyInput, platforms, [], [], 0.05, 500, 500);

  assert.equal(events.bounced, true);
  assert.equal(player.vy, BOUNCE_PAD_VELOCITY);
});

test('collectible pearl increases pearls count and triggers event', () => {
  const p = createInitialPlayer(100, 100);
  p.grounded = true;

  const collectibles: Collectible[] = [
    { id: 'p1', type: 'pearl', x: 105, y: 105, w: 16, h: 16, value: 1, collected: false, bobOffset: 0 },
  ];

  const emptyInput = {
    left: false,
    right: false,
    jumpJustPressed: false,
    jumpHeld: false,
    dashJustPressed: false,
    down: false,
  };

  const { player, events } = updatePlayerPhysics(p, emptyInput, [], collectibles, [], 0.016, 500, 500);

  assert.equal(player.pearls, 1);
  assert.equal(collectibles[0].collected, true);
  assert.equal(events.collectedItem?.id, 'p1');
});

test('water hazard depletes 1 HP and safely respawns player at last grounded spot', () => {
  const p = createInitialPlayer(50, 80);
  p.lastSafeX = 50;
  p.lastSafeY = 80;
  p.x = 200; // midair over water
  p.y = 485; // falling into water at height 500

  const emptyInput = {
    left: false,
    right: false,
    jumpJustPressed: false,
    jumpHeld: false,
    dashJustPressed: false,
    down: false,
  };

  const { player, events } = updatePlayerPhysics(p, emptyInput, [], [], [], 0.05, 500, 500);

  assert.equal(events.waterHit, true);
  assert.equal(events.hurt, true);
  assert.equal(player.health, 2);
  assert.equal(player.x, 50); // safely back at last safe spot
  assert.equal(player.y, 80);
});

test('calculateScoreAndStars accurately calculates score and 3-star conditions', () => {
  const full = calculateScoreAndStars(30, 20, 20, true);
  assert.equal(full.stars, 3);
  assert.ok(full.score >= 3500);

  const partial = calculateScoreAndStars(50, 10, 20, false);
  assert.equal(partial.stars, 1);
});

test('triple jump allows 3 sequential jumps with distinct velocity', () => {
  const p = createInitialPlayer(50, 100);
  p.grounded = true;

  // Jump 1: Ground Jump
  const jumpInput = {
    left: false,
    right: false,
    jumpJustPressed: true,
    jumpHeld: true,
    dashJustPressed: false,
    down: false,
  };
  const step1 = updatePlayerPhysics(p, jumpInput, [], [], [], 0.016, 500, 500);
  assert.equal(step1.events.jumped, true);
  assert.equal(step1.player.vy, JUMP_VELOCITY);
  assert.equal(step1.player.jumpsLeft, 2);

  // Jump 2: Double Jump
  const step2 = updatePlayerPhysics(step1.player, jumpInput, [], [], [], 0.016, 500, 500);
  assert.equal(step2.events.doubleJumped, true);
  assert.equal(step2.player.vy, DOUBLE_JUMP_VELOCITY);
  assert.equal(step2.player.jumpsLeft, 1);

  // Jump 3: Triple Jump!
  const step3 = updatePlayerPhysics(step2.player, jumpInput, [], [], [], 0.016, 500, 500);
  assert.equal(step3.events.tripleJumped, true);
  assert.equal(step3.player.vy, TRIPLE_JUMP_VELOCITY);
  assert.equal(step3.player.jumpsLeft, 0);

  // 4th Jump attempt should fail (no more jumps left)
  const step4 = updatePlayerPhysics(step3.player, jumpInput, [], [], [], 0.016, 500, 500);
  assert.equal(step4.events.jumped, false);
  assert.equal(step4.events.doubleJumped, false);
  assert.equal(step4.events.tripleJumped, false);
});

test('air dash allows consecutive chaining in mid-air', () => {
  const p = createInitialPlayer(100, 200);
  p.grounded = false;
  p.airDashesLeft = 3;

  const dashInput = {
    left: false,
    right: true,
    jumpJustPressed: false,
    jumpHeld: false,
    dashJustPressed: true,
    down: false,
  };

  // Dash 1
  const step1 = updatePlayerPhysics(p, dashInput, [], [], [], 0.016, 500, 500);
  assert.equal(step1.events.dashed, true);
  assert.equal(step1.player.isDashing, true);
  assert.equal(step1.player.airDashesLeft, 2);
  assert.equal(step1.player.dashChainCount, 1);

  // Advance past dash duration to cooldown end
  step1.player.isDashing = false;
  step1.player.dashCooldown = 0;

  // Dash 2 (chained air dash!)
  const step2 = updatePlayerPhysics(step1.player, dashInput, [], [], [], 0.016, 500, 500);
  assert.equal(step2.events.dashed, true);
  assert.equal(step2.player.airDashesLeft, 1);
  assert.equal(step2.player.dashChainCount, 2);
});

test('spring booster pad automatically launches player and super-bounces when jumping', () => {
  const p = createInitialPlayer(50, 120);
  p.vy = 20;

  const platforms: Platform[] = [
    { x: 30, y: 130, w: 60, h: 20, type: 'bouncy' },
  ];

  // Walking or landing on booster pad automatically triggers launch
  const emptyInput = {
    left: false,
    right: false,
    jumpJustPressed: false,
    jumpHeld: false,
    dashJustPressed: false,
    down: false,
  };

  const autoBounce = updatePlayerPhysics(p, emptyInput, platforms, [], [], 0.05, 500, 500);
  assert.equal(autoBounce.events.bounced, true);
  assert.equal(autoBounce.player.vy, BOUNCE_PAD_VELOCITY);
  assert.equal(autoBounce.player.jumpsLeft, 3); // Fully resets jumps!

  // Super bounce with Jump key held
  const p2 = createInitialPlayer(50, 120);
  const jumpInput = {
    left: false,
    right: false,
    jumpJustPressed: true,
    jumpHeld: true,
    dashJustPressed: false,
    down: false,
  };
  const superBounce = updatePlayerPhysics(p2, jumpInput, platforms, [], [], 0.05, 500, 500);
  assert.equal(superBounce.events.bounced, true);
  assert.equal(superBounce.events.superBounced, true);
  assert.equal(superBounce.player.vy, SUPER_BOUNCE_PAD_VELOCITY);
});
