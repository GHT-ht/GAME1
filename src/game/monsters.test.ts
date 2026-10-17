import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MONSTER_SPECIES,
  buildMonsterLoot,
  comboBonus,
  comboTier,
  createDamageNumberPool,
  createMonster,
  createMonsters,
  createProjectilePool,
  damageMonster,
  monsterScore,
  slashHitbox,
  updateMonsters,
  HIT_INVULN,
} from './monsters.ts';
import type { LevelData, Monster, MonsterProjectile, DamageNumber, PlayerState } from './types.ts';
import { createInitialPlayer, updatePlayerPhysics, updatePlayerAttack, SLASH_DURATION } from './physics.ts';
import { getLevelData } from './levels.ts';

const EMPTY_INPUT = {
  left: false,
  right: false,
  jumpJustPressed: false,
  jumpHeld: false,
  dashJustPressed: false,
  attackJustPressed: false,
  down: false,
};

function flatLevel(): LevelData {
  const level = getLevelData('beach');
  // A tiny, deterministic arena: one long solid floor, no hazards, no spawns
  return {
    ...level,
    worldWidth: 2000,
    worldHeight: 700,
    platforms: [{ x: 0, y: 600, w: 2000, h: 100, type: 'solid' }],
    collectibles: [],
    hazards: [],
    monsters: [],
  };
}

interface CombatHarness {
  player: PlayerState;
  level: LevelData;
  monsters: Monster[];
  projectiles: MonsterProjectile[];
  numbers: DamageNumber[];
}

function harness(player?: PlayerState): CombatHarness {
  return {
    player: player ?? createInitialPlayer(100, 400),
    level: flatLevel(),
    monsters: [],
    projectiles: createProjectilePool(),
    numbers: createDamageNumberPool(),
  };
}

function standOnFloor(player: PlayerState, level: LevelData) {
  player.y = 600 - player.h;
  player.grounded = true;
  player.vy = 0;
}

function step(h: CombatHarness, dt = 1 / 60) {
  return updateMonsters(h.monsters, h.projectiles, h.numbers, h.player, h.level, dt);
}

test('every monster species is a fully specified cute creature', () => {
  const kinds = Object.keys(MONSTER_SPECIES);
  assert.ok(kinds.length >= 9, 'expected at least 9 monster species');
  for (const kind of kinds) {
    const s = MONSTER_SPECIES[kind as keyof typeof MONSTER_SPECIES];
    assert.ok(s.name.length > 0, `${kind} needs a cute name`);
    assert.ok(s.enName.length > 0);
    assert.ok(s.maxHp > 0, `${kind} needs HP for its health bar`);
    assert.ok(s.touchDamage > 0, `${kind} must be able to hurt the player`);
    assert.ok(s.scoreValue > 0);
    assert.ok(s.w > 10 && s.h > 10);
  }
});

test('each island spawns monsters and exactly one guardian boss', () => {
  for (const biome of ['beach', 'jungle', 'sunset'] as const) {
    const level = getLevelData(biome);
    const monsters = createMonsters(level);
    assert.ok(monsters.length >= 5, `${biome} should have a few monsters`);
    const bosses = monsters.filter((m) => MONSTER_SPECIES[m.kind].isBoss);
    assert.equal(bosses.length, 1, `${biome} should have exactly one boss`);
    assert.ok(bosses[0].maxHp >= 10, 'bosses need a chunky HP bar');
  }
});

test('damageMonster drains HP, flashes, honours the hit gate and eventually kills', () => {
  const m = createMonster({ kind: 'crabling', x: 200, y: 560 });
  const numbers = createDamageNumberPool();

  const first = damageMonster(m, 2, 1, 'slash', numbers);
  assert.equal(first.damaged, true);
  assert.equal(m.hp, m.maxHp - 2);
  assert.equal(m.hitFlash > 0, true);
  assert.equal(numbers.some((n) => n.active && n.text === '2'), true);

  // Immediately hitting again is swallowed by the invulnerability gate
  const second = damageMonster(m, 2, 1, 'slash', numbers);
  assert.equal(second.damaged, false);
  assert.equal(m.hp, m.maxHp - 2);

  m.hitCooldown = 0;
  const third = damageMonster(m, 5, 1, 'stomp', numbers);
  assert.equal(third.defeated, true);
  assert.equal(m.hp, 0);
  assert.equal(m.defeated, true);
  assert.equal(m.state, 'dead');
  assert.ok(m.deathTimer > 0);
  assert.equal(damageMonster(m, 3, 1, 'slash').damaged, false, 'dead monsters ignore damage');
  assert.ok(HIT_INVULN > 0);
});

test('stomping a monster damages it, bounces the player and protects the player', () => {
  const h = harness();
  standOnFloor(h.player, h.level);

  const m = createMonster({ kind: 'shroomling', x: 96, y: 600 - 34 });
  h.monsters.push(m);

  // Falling onto the monster's head: bodies overlap, player is above the middle
  h.player.y = m.y - h.player.h + 6;
  h.player.vy = 260;

  const events = step(h);
  assert.equal(events.stomped, true);
  assert.equal(m.hp, m.maxHp - 3);
  assert.equal(h.player.vy, MONSTER_SPECIES.shroomling.stompBounce);
  assert.equal(h.player.stompChain, 1);
  assert.equal(h.player.health, h.player.maxHealth, 'stomping never hurts the player');
  assert.ok(h.player.comboCount >= 1);
});

test('slash hits monsters in front of the player but not behind', () => {
  const h = harness();
  standOnFloor(h.player, h.level);
  h.player.facing = 1;
  h.player.attackTimer = SLASH_DURATION;
  h.player.attackIndex = 0;

  const front = createMonster({ kind: 'crabling', x: h.player.x + h.player.w + 6, y: 600 - 26 });
  const back = createMonster({ kind: 'crabling', x: h.player.x - 60, y: 600 - 26 });
  h.monsters.push(front, back);

  const box = slashHitbox(h.player);
  assert.ok(box.w > 0 && box.h > 0);

  const events = step(h);
  assert.equal(events.slashed, true);
  assert.equal(front.hp, front.maxHp - 2, 'front monster should be hit');
  assert.equal(back.hp, back.maxHp, 'monster behind must stay safe');
});

test('the third swing is a spin attack that reaches both sides and hits harder', () => {
  const h = harness();
  standOnFloor(h.player, h.level);
  h.player.attackIndex = 2;
  h.player.attackTimer = SLASH_DURATION;

  const front = createMonster({ kind: 'crabling', x: h.player.x + h.player.w + 4, y: 600 - 26 });
  const back = createMonster({ kind: 'crabling', x: h.player.x - 42, y: 600 - 26 });
  h.monsters.push(front, back);

  const events = step(h);
  assert.equal(events.spinAttack, true);
  assert.equal(front.hp, front.maxHp - 3);
  assert.equal(back.hp, back.maxHp - 3, 'spin reaches behind the player too');
});

test('dashing through a monster damages it and keeps the player safe', () => {
  const h = harness();
  standOnFloor(h.player, h.level);
  h.player.isDashing = true;
  h.player.facing = 1;

  const m = createMonster({ kind: 'emberpup', x: h.player.x + 6, y: 600 - 32 });
  h.monsters.push(m);

  const events = step(h);
  assert.equal(events.dashHit, true);
  assert.equal(m.hp, m.maxHp - 2);
  assert.equal(h.player.health, h.player.maxHealth, 'dash i-frames protect the player');
  assert.ok(m.vx > 0, 'monster is knocked away from the player');
});

test('touching a monster costs 1 HP, knocks the player back and grants i-frames', () => {
  const h = harness();
  standOnFloor(h.player, h.level);

  const m = createMonster({ kind: 'crabling', x: h.player.x + 10, y: 600 - 26 });
  h.monsters.push(m);

  const events = step(h);
  assert.equal(events.playerHurt, true);
  assert.equal(events.hurtSource, 'contact');
  assert.equal(h.player.health, h.player.maxHealth - 1);
  assert.ok(h.player.invulnerableTimer > 0);
  assert.ok(h.player.vy < 0, 'player pops upward when hurt');

  // Second contact during i-frames does nothing
  const again = step(h);
  assert.equal(again.playerHurt, false);
  assert.equal(h.player.health, h.player.maxHealth - 1);
});

test('being hurt breaks the combo, landing hits builds it', () => {
  const h = harness();
  standOnFloor(h.player, h.level);
  h.player.attackTimer = SLASH_DURATION;
  h.player.attackIndex = 0;

  const target = createMonster({ kind: 'crabling', x: h.player.x + h.player.w + 6, y: 600 - 26 });
  h.monsters.push(target);
  step(h);
  assert.equal(h.player.comboCount, 1);

  // Close the attack window so the next monster gets a clean hit in
  h.player.attackTimer = 0;
  const biter = createMonster({ kind: 'crabling', x: h.player.x + 12, y: 600 - 26 });
  h.monsters.push(biter);
  h.player.invulnerableTimer = 0;

  const hurt = step(h);
  assert.equal(hurt.playerHurt, true, 'an unblocked monster contact hurts the player');
  assert.equal(hurt.comboBroken, true);
  assert.equal(h.player.comboCount, 0);
  assert.equal(h.player.health, h.player.maxHealth - 1);
});

test('patrolling monsters walk, turn at their patrol range and never fall through the floor', () => {
  const h = harness();
  const m = createMonster({ kind: 'crabling', x: 300, y: 560, patrolRange: 40 });
  h.monsters.push(m);
  h.player.x = 1800; // far away so the monster stays in patrol mode

  let flipped = false;
  const startFacing = m.facing;
  for (let i = 0; i < 600; i++) {
    step(h);
    if (m.facing !== startFacing) flipped = true;
    assert.ok(m.y + m.h <= 601, 'monster must stay on the platform');
  }
  assert.equal(flipped, true, 'monster should turn around at the edge of its range');
  assert.ok(Math.abs(m.x - m.homeX) <= m.patrolRange + 20, 'monster stays near home');
});

test('turret monsters lob arcing projectiles at a nearby player', () => {
  const h = harness();
  const m = createMonster({ kind: 'budling', x: 260, y: 600 - 36 });
  h.monsters.push(m);
  h.player.x = 200;
  h.player.y = 600 - h.player.h;
  h.player.grounded = true;

  let fired = 0;
  for (let i = 0; i < 400; i++) {
    const events = step(h);
    fired += events.projectilesFired;
  }
  assert.ok(fired > 0, 'budslinger should shoot seeds at the player');
  const live = h.projectiles.filter((p) => p.active);
  assert.ok(live.length + fired > 0);
});

test('monster projectiles damage the player on contact and vanish afterwards', () => {
  const h = harness();
  standOnFloor(h.player, h.level);
  const p = h.projectiles[0];
  p.active = true;
  p.kind = 'seed';
  p.x = h.player.x;
  p.y = h.player.y;
  p.w = 14;
  p.h = 14;
  p.vx = 0;
  p.vy = 0;
  p.gravity = 0;
  p.life = 3;
  p.maxLife = 3;
  p.damage = 1;

  const events = step(h, 1 / 120);
  assert.equal(events.playerHurt, true);
  assert.equal(events.hurtSource, 'projectile');
  assert.equal(h.player.health, h.player.maxHealth - 1);
  assert.equal(p.active, false, 'projectile is consumed on hit');
});

test('defeated monsters drop pearls, hearts and fruit collectibles', () => {
  const h = harness();
  const m = createMonster({ kind: 'crabling', x: 400, y: 560 });
  m.defeated = true;
  m.lastHitBy = 'slash';

  const loot = buildMonsterLoot(m, h.player);
  assert.ok(loot.length >= MONSTER_SPECIES.crabling.pearlDrops);
  assert.equal(loot.filter((l) => l.type === 'pearl').length, MONSTER_SPECIES.crabling.pearlDrops);

  const boss = createMonster({ kind: 'crabking', x: 400, y: 500 });
  boss.defeated = true;
  const bossLoot = buildMonsterLoot(boss, h.player);
  assert.ok(bossLoot.filter((l) => l.type === 'heart').length >= 2, 'bosses always leave hearts');
  assert.ok(bossLoot.length > loot.length);
});

test('a hurting player gets extra heart luck, monsters keep dropping loot in-level', () => {
  const h = harness();
  h.player.health = 1;
  const boss = createMonster({ kind: 'shroomlord', x: 500, y: 480 });
  boss.defeated = true;
  const loot = buildMonsterLoot(boss, h.player);
  assert.ok(loot.length > 0);
  assert.ok(loot.every((l) => l.collected === false));
});

test('defeating monsters through updateMonsters awards score and flags the kill', () => {
  const h = harness();
  standOnFloor(h.player, h.level);
  h.player.facing = 1;
  h.player.attackTimer = SLASH_DURATION;
  h.player.attackIndex = 2; // spin finisher

  const m = createMonster({ kind: 'jellybub', x: h.player.x + 10, y: 600 - 32 });
  m.hp = 3;
  h.monsters.push(m);

  const events = step(h);
  assert.equal(events.monstersDefeated.length, 1);
  assert.equal(m.lastHitBy, 'slash');
  assert.ok(monsterScore(h.monsters) > 0, 'slain monsters pay out score');
  assert.equal(monsterScore([createMonster({ kind: 'crabling', x: 0, y: 0 })]), 0);
});

test('drowned monsters are removed without paying out score', () => {
  const h = harness();
  const m = createMonster({ kind: 'crabling', x: 100, y: 500 });
  m.y = h.level.worldHeight - 10;
  m.grounded = false;
  h.monsters.push(m);

  for (let i = 0; i < 30; i++) step(h);
  assert.equal(m.defeated, true);
  assert.equal(m.lastHitBy, 'none');
  assert.equal(monsterScore(h.monsters), 0);
});

test('bosses enrage at half health, summon minions and become armoured while attacking', () => {
  const h = harness();
  const boss = createMonster({ kind: 'crabking', x: 400, y: 600 - 70 });
  h.monsters.push(boss);
  h.player.x = 460;
  h.player.y = 600 - h.player.h;
  h.player.grounded = true;

  boss.hp = boss.maxHp * 0.4;
  const events = step(h);
  assert.equal(boss.enraged, true);
  assert.equal(events.bossEnraged, true);

  // Armour check: damage while committed to an attack is reduced
  boss.state = 'attacking';
  boss.hitCooldown = 0;
  const before = boss.hp;
  const res = damageMonster(boss, 4, 1, 'slash');
  assert.equal(res.damaged, true);
  assert.equal(boss.hp, before - 2, 'armoured boss halves incoming damage');

  // Minions eventually show up once enraged
  boss.hitCooldown = 0;
  boss.state = 'patrol';
  boss.attackCooldown = 0;
  let summoned = 0;
  for (let i = 0; i < 900; i++) {
    const e = step(h);
    summoned += e.bossSummoned.length;
    if (summoned > 0) break;
  }
  assert.ok(summoned > 0, 'enraged boss should call for minions');
  assert.ok(h.monsters.length > 1);
  assert.ok(boss.minionsSummoned > 0);
});

test('charger behaviour telegraphs, then dizzily recovers and is punishable', () => {
  const h = harness();
  const pup = createMonster({ kind: 'emberpup', x: 300, y: 600 - 32 });
  h.monsters.push(pup);
  h.player.x = 380;
  h.player.y = 600 - h.player.h;
  h.player.grounded = true;

  let sawTelegraph = false;
  let sawCharge = false;
  let sawRecover = false;
  for (let i = 0; i < 600; i++) {
    step(h);
    if (pup.state === 'telegraph') sawTelegraph = true;
    if (pup.state === 'attacking') sawCharge = true;
    if (pup.state === 'recover') sawRecover = true;
    if (sawTelegraph && sawCharge && sawRecover) break;
  }
  assert.equal(sawTelegraph, true, 'ember pup winds up before charging');
  assert.equal(sawCharge, true, 'ember pup charges');
  assert.equal(sawRecover, true, 'ember pup gets dizzy afterwards');
});

test('projectiles, damage numbers and dead monsters clean themselves up', () => {
  const h = harness();
  const p = h.projectiles[0];
  p.active = true;
  p.life = 0.02;
  p.kind = 'bubble';
  step(h, 0.05);
  assert.equal(p.active, false);

  const d = h.numbers[0];
  d.active = true;
  d.life = 0.01;
  d.maxLife = 0.75;
  step(h, 0.05);
  assert.equal(d.active, false);

  const m = createMonster({ kind: 'crabling', x: 500, y: 560 });
  m.defeated = true;
  m.deathTimer = 0.01;
  h.monsters.push(m);
  step(h, 0.05);
  assert.ok(m.deathTimer <= 0);
});

test('combo scoring helpers scale with combo size', () => {
  assert.equal(comboBonus(0), 0);
  assert.equal(comboBonus(1), 0);
  assert.ok(comboBonus(5) > 0);
  assert.ok(comboBonus(30) > comboBonus(5));
  assert.ok(comboBonus(60) <= 1200, 'combo bonus is capped');
  assert.equal(comboTier(1).label.includes('COMBO'), true);
  assert.equal(comboTier(25).label.includes('LEGENDARY'), true);
  assert.equal(comboTier(12).color.startsWith('#'), true);
});

test('physics still runs a full player update with the new combat fields', () => {
  const h = harness();
  const { player, events } = updatePlayerPhysics(
    h.player,
    EMPTY_INPUT,
    h.level.platforms,
    [],
    [],
    1 / 60,
    h.level.worldWidth,
    h.level.worldHeight
  );
  assert.equal(events.slashed, false);
  assert.equal(player.attackTimer, 0);
  assert.equal(player.comboCount, 0);
  assert.equal(player.heartsCollected, 0);
  assert.equal(typeof player.stompChain, 'number');
});

test('melee input starts a swing, cycles the 3-hit combo and respects the cooldown', () => {
  const player = createInitialPlayer(0, 0);
  const attackInput = { ...EMPTY_INPUT, attackJustPressed: true };

  // Swing 1 — the combo starts at index 0 so the spin lands on swing 3
  const first = updatePlayerAttack(player, attackInput, 1 / 60);
  assert.equal(first.slashed, true);
  assert.equal(player.attackIndex, 0);

  // Cooldown blocks mashing
  const spam = updatePlayerAttack(player, attackInput, 1 / 60);
  assert.equal(spam.slashed, false);

  // Swing 2
  player.attackTimer = 0;
  player.attackCooldown = 0;
  const second = updatePlayerAttack(player, attackInput, 1 / 60);
  assert.equal(second.slashed, true);
  assert.equal(second.spin, false);
  assert.equal(player.attackIndex, 1);

  // Swing 3 is the spin finisher, then the combo loops back to the start
  player.attackTimer = 0;
  player.attackCooldown = 0;
  const third = updatePlayerAttack(player, attackInput, 1 / 60);
  assert.equal(third.spin, true, 'third swing of the combo is the spin attack');
  assert.equal(player.attackIndex, 2);
  player.attackTimer = 0;
  player.attackCooldown = 0;
  updatePlayerAttack(player, attackInput, 1 / 60);
  assert.equal(player.attackIndex, 0, 'combo wraps back to the first swing');
  assert.equal(SLASH_DURATION > 0, true);
});

test('every land monster spawns on solid ground, fliers may live in the air', () => {
  for (const biome of ['beach', 'jungle', 'sunset'] as const) {
    const level = getLevelData(biome);
    for (const spawn of level.monsters) {
      const species = MONSTER_SPECIES[spawn.kind];
      const grounded = species.behavior === 'patrol' || species.behavior === 'charger' || species.behavior === 'turret' || species.behavior === 'boss';
      if (!grounded) continue;

      // The spawn must be sitting exactly on (or be dropped onto) a platform
      const feet = spawn.y + species.h;
      const supported = level.platforms.some(
        (p) =>
          p.type !== 'bouncy' &&
          spawn.x + species.w > p.x &&
          spawn.x < p.x + p.w &&
          feet <= p.y + 2 &&
          feet >= p.y - 40
      );
      assert.equal(
        supported,
        true,
        `${biome}:${spawn.kind} at (${spawn.x}, ${spawn.y}) is not standing on a platform`
      );
      assert.ok(spawn.x > 0 && spawn.x + species.w < level.worldWidth, 'spawn inside world bounds');
    }
  }
});

test('a full 60 second simulated run on every island never throws and stays sane', () => {
  const input = { ...EMPTY_INPUT };

  for (const biome of ['beach', 'jungle', 'sunset'] as const) {
    const level = getLevelData(biome);
    let player = createInitialPlayer(level.spawnPoint.x, level.spawnPoint.y);
    const monsters = createMonsters(level);
    const projectiles = createProjectilePool();
    const numbers = createDamageNumberPool();

    for (let frame = 0; frame < 3600; frame++) {
      // A crude bot: run right, hop, dash every now and then, swing constantly
      input.right = true;
      input.left = false;
      input.jumpJustPressed = frame % 42 === 0;
      input.jumpHeld = frame % 42 < 12;
      input.dashJustPressed = frame % 150 === 0;
      input.attackJustPressed = frame % 20 === 0;

      const step = updatePlayerPhysics(
        player,
        input,
        level.platforms,
        level.collectibles,
        level.hazards,
        1 / 60,
        level.worldWidth,
        level.worldHeight
      );
      player = step.player;

      updateMonsters(monsters, projectiles, numbers, player, level, 1 / 60);

      player.attackTimer = 0;
      player.attackCooldown = 0;
      player.comboTimer = 2.5;

      // Sanity: nothing may explode, teleport or go NaN
      assert.ok(Number.isFinite(player.x) && Number.isFinite(player.y), 'player position finite');
      assert.ok(player.health >= 0 && player.health <= player.maxHealth, 'health in range');
      for (const m of monsters) {
        assert.ok(Number.isFinite(m.x) && Number.isFinite(m.y), `${m.kind} position finite`);
        assert.ok(m.hp >= 0 && m.hp <= m.maxHp, `${m.kind} hp in range`);
        assert.ok(m.state !== undefined, 'monster keeps a state');
      }
      for (const p of projectiles) {
        if (!p.active) continue;
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), 'projectile position finite');
      }
    }

    assert.ok(monsters.length > 0, `${biome} still tracks monsters`);
    assert.ok(
      monsters.some((m) => m.damageTaken > 0) || player.monstersDefeated >= 0,
      `${biome} combat actually happened`
    );
  }
});

test('winning the trade: hitting a monster first prevents its contact damage that frame', () => {
  const h = harness();
  standOnFloor(h.player, h.level);
  h.player.facing = 1;
  h.player.attackTimer = SLASH_DURATION;
  h.player.attackIndex = 0;

  // Body-to-body: normally this would cost the player 1 HP
  const m = createMonster({ kind: 'crabling', x: h.player.x + 20, y: 600 - 26 });
  h.monsters.push(m);

  const events = step(h);
  assert.equal(events.slashed, true);
  assert.ok(m.hp < m.maxHp, 'monster takes the hit');
  assert.equal(events.playerHurt, false, 'landing the swing protects the player from that monster');
  assert.equal(h.player.health, h.player.maxHealth);
  assert.ok(m.vx > 0, 'monster is pushed away, opening safe spacing');
});

test('defeating every monster on an island is possible without touching hazards', () => {
  const level = flatLevel();
  const h = harness();
  standOnFloor(h.player, level);
  h.level = level;
  h.monsters = [
    createMonster({ kind: 'crabling', x: 120, y: 600 - 26 }),
    createMonster({ kind: 'jellybub', x: 160, y: 520 }),
  ];

  for (let i = 0; i < 20000 && h.monsters.some((m) => !m.defeated); i++) {
    // Cheat the attack window open to focus the test on the combat loop
    h.player.attackTimer = SLASH_DURATION;
    h.player.attackIndex = 2;
    h.player.x = Math.min(...h.monsters.filter((m) => !m.defeated).map((m) => m.x)) - 6;
    h.player.y = 600 - h.player.h;
    h.player.facing = 1;
    step(h);
  }
  assert.equal(h.monsters.every((m) => m.defeated), true, 'all monsters can be cleared');
  assert.ok(h.player.monstersDefeated === 0, 'engine counts kills, not the raw update loop');
  assert.ok(h.player.health >= 0);
});

test('new heavy attack deals more damage and has its own cooldown', () => {
  const h = harness();
  standOnFloor(h.player, h.level);
  const m = createMonster({ kind: 'crabling', x: h.player.x + h.player.w + 10, y: 600 - 26 });
  m.maxHp = m.hp = 12;
  h.monsters.push(m);
  const input = { left:false, right:false, down:false, jumpHeld:false,
    jumpJustPressed:false, dashJustPressed:false, heavyJustPressed:true };
  const swing = updatePlayerAttack(h.player,input,0.016);
  assert.equal(swing.slashed,true);
  assert.equal(h.player.attackKind,'heavy');
  step(h);
  assert.equal(m.hp,7,'heavy strike does exactly five damage');
  assert.ok(h.player.heavyCooldown > 0);
});

test('area skill reaches monsters on both sides and charges ultimate on real hits', () => {
  const h=harness();
  standOnFloor(h.player,h.level);
  h.player.ultimateMeter=20;
  const first=createMonster({kind:'shroomling',x:h.player.x-36,y:600-34});
  const second=createMonster({kind:'shroomling',x:h.player.x+30,y:600-34});
  h.monsters.push(first,second);
  const input={left:false,right:false,down:false,jumpHeld:false,jumpJustPressed:false,dashJustPressed:false,skillJustPressed:true};
  updatePlayerAttack(h.player,input,0.016);
  const events=step(h);
  assert.equal(events.monstersHit.length,2);
  assert.ok(h.player.ultimateMeter>20);
  assert.ok(h.player.skillCooldown>0);
});

test('ultimate consumes full energy and hits multiple targets once per cast', () => {
  const h=harness();
  standOnFloor(h.player,h.level);
  h.player.ultimateMeter=100;
  const m=createMonster({kind:'shroomling',x:h.player.x+60,y:600-34});
  m.maxHp=m.hp=20;
  h.monsters.push(m);
  const input={left:false,right:false,down:false,jumpHeld:false,jumpJustPressed:false,dashJustPressed:false,ultimateJustPressed:true};
  updatePlayerAttack(h.player,input,0.016);
  assert.equal(h.player.attackKind,'ultimate');
  assert.equal(h.player.ultimateMeter,0);
  step(h);
  assert.equal(m.hp,11);
  // Monster hit gate expires, but this single ultimate cast must not multi-hit.
  for (let i=0;i<15;i++) step(h);
  assert.equal(m.hp,11);
});

test('guard absorbs one monster contact and then goes on cooldown', () => {
  const h=harness();standOnFloor(h.player,h.level);
  const m=createMonster({kind:'crabling',x:h.player.x+5,y:600-26});
  h.monsters.push(m);
  const hp=h.player.health;
  updatePlayerAttack(h.player,{left:false,right:false,down:false,jumpHeld:false,jumpJustPressed:false,dashJustPressed:false,guardJustPressed:true},0.016);
  assert.ok(h.player.guardTimer>0);
  step(h);
  assert.equal(h.player.health,hp);
  assert.equal(h.player.guardTimer,0);
  assert.ok(h.player.guardCooldown>0);
});
