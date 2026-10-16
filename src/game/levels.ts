import type { BiomeConfig, LevelData, BiomeId } from './types.ts';

export const BIOMES: Record<BiomeId, BiomeConfig> = {
  beach: {
    id: 'beach',
    name: '蔚蓝浅滩',
    subname: 'Azure Shallows',
    description: '阳光沐浴下的细白沙滩与清澈蔚蓝海水，海风轻拂着摇曳的椰树。',
    skyTop: '#38bdf8',
    skyBottom: '#bae6fd',
    waterColor: 'rgba(14, 165, 233, 0.55)',
    waterFoamColor: '#f0f9ff',
    sunColor: '#fef08a',
    grassColor: '#4ade80',
    dirtColor: '#d97706',
    sandColor: '#fef08a',
    ambientType: 'seabirds',
    musicTheme: 'cheerful',
  },
  jungle: {
    id: 'jungle',
    name: '翡翠林泉',
    subname: 'Emerald Canopy',
    description: '浓郁繁茂的雨林树冠与奔腾的小瀑布，隐藏着远古图腾与弹力蘑菇。',
    skyTop: '#0d9488',
    skyBottom: '#99f6e4',
    waterColor: 'rgba(20, 184, 166, 0.5)',
    waterFoamColor: '#ccfbf1',
    sunColor: '#fef9c3',
    grassColor: '#22c55e',
    dirtColor: '#78350f',
    sandColor: '#fcd34d',
    ambientType: 'butterflies',
    musicTheme: 'mystic',
  },
  sunset: {
    id: 'sunset',
    name: '落日神殿',
    subname: 'Sunset Grotto',
    description: '壮丽的晚霞照亮海崖与荧光水晶海洞，远古海神祭坛在此静静伫立。',
    skyTop: '#4c1d95',
    skyBottom: '#fb923c',
    waterColor: 'rgba(99, 102, 241, 0.6)',
    waterFoamColor: '#fed7aa',
    sunColor: '#f43f5e',
    grassColor: '#15803d',
    dirtColor: '#451a03',
    sandColor: '#fdba74',
    ambientType: 'fireflies',
    musicTheme: 'twilight',
  },
};

export function getLevelData(id: BiomeId): LevelData {
  switch (id) {
    case 'beach':
      return createBeachLevel();
    case 'jungle':
      return createJungleLevel();
    case 'sunset':
      return createSunsetLevel();
    default:
      return createBeachLevel();
  }
}

function createBeachLevel(): LevelData {
  const worldWidth = 3000;
  const worldHeight = 800;

  return {
    id: 'beach',
    title: '蔚蓝浅滩',
    subtitle: '第一幕 · 海风与金沙',
    worldWidth,
    worldHeight,
    spawnPoint: { x: 120, y: 550 },
    goalPoint: { x: 2800, y: 530, w: 70, h: 90 },
    targetPearls: 15,
    totemAltar: {
      x: 2780,
      y: 520,
      w: 80,
      h: 100,
      activated: false,
      biome: 'beach',
    },
    platforms: [
      // Starting Beach Shore
      { x: 0, y: 620, w: 460, h: 180, type: 'solid', label: 'Start Beach' },
      // First gap with wooden dock pier
      { x: 520, y: 580, w: 180, h: 28, type: 'one-way', label: 'Pier 1' },
      // Floating Sand dune
      { x: 760, y: 520, w: 220, h: 32, type: 'sand' },
      // Elevated Palm Hill
      { x: 1040, y: 460, w: 320, h: 160, type: 'solid' },
      // Bouncy Drum on Hill
      { x: 1260, y: 440, w: 60, h: 20, type: 'bouncy', label: 'Tiki Drum' },
      // High Sky Cloud Palm platform (reached via bouncy drum)
      { x: 1280, y: 260, w: 180, h: 24, type: 'one-way' },
      // Glide Over Big Sea Gap
      { x: 1540, y: 380, w: 160, h: 26, type: 'moving', moveAxis: 'x', moveRange: 120, moveSpeed: 45, initialX: 1540 },
      { x: 1780, y: 450, w: 200, h: 28, type: 'sand' },
      // Second Bouncy pad
      { x: 1920, y: 430, w: 50, h: 20, type: 'bouncy' },
      // High Coral Rock
      { x: 2050, y: 320, w: 180, h: 30, type: 'solid' },
      // Lower sandy reef
      { x: 2180, y: 540, w: 240, h: 40, type: 'sand' },
      // Final Sanctuary Island
      { x: 2500, y: 600, w: 500, h: 200, type: 'solid' },
    ],
    collectibles: [
      // Pearls along starting shore
      { id: 'p1', type: 'pearl', x: 220, y: 570, w: 20, h: 20, value: 1, collected: false, bobOffset: 0 },
      { id: 'p2', type: 'pearl', x: 340, y: 560, w: 20, h: 20, value: 1, collected: false, bobOffset: 0.5 },
      // Fruit on palm tree
      { id: 'f1', type: 'coconut', x: 400, y: 490, w: 22, h: 22, value: 1, collected: false, bobOffset: 1 },
      // On pier
      { id: 'p3', type: 'pearl', x: 600, y: 530, w: 20, h: 20, value: 1, collected: false, bobOffset: 1.5 },
      // On sand dune
      { id: 'p4', type: 'pearl', x: 860, y: 470, w: 20, h: 20, value: 1, collected: false, bobOffset: 2 },
      { id: 'p5', type: 'pearl', x: 910, y: 470, w: 20, h: 20, value: 1, collected: false, bobOffset: 2.5 },
      // High bonus on sky platform
      { id: 'c1', type: 'sun_coin', x: 1360, y: 200, w: 26, h: 26, value: 5, collected: false, bobOffset: 3 },
      { id: 'f2', type: 'star_fruit', x: 1400, y: 200, w: 24, h: 24, value: 1, collected: false, bobOffset: 3.5 },
      // In glide corridor
      { id: 'p6', type: 'pearl', x: 1600, y: 320, w: 20, h: 20, value: 1, collected: false, bobOffset: 4 },
      { id: 'p7', type: 'pearl', x: 1700, y: 340, w: 20, h: 20, value: 1, collected: false, bobOffset: 4.5 },
      { id: 'p8', type: 'pearl', x: 1840, y: 400, w: 20, h: 20, value: 1, collected: false, bobOffset: 5 },
      // On high coral rock
      { id: 'p9', type: 'pearl', x: 2120, y: 270, w: 20, h: 20, value: 1, collected: false, bobOffset: 5.5 },
      { id: 'r1', type: 'totem_relic', x: 2150, y: 260, w: 30, h: 30, value: 10, collected: false, bobOffset: 6 },
      // On lower reef
      { id: 'p10', type: 'pearl', x: 2280, y: 490, w: 20, h: 20, value: 1, collected: false, bobOffset: 0.2 },
      { id: 'p11', type: 'pearl', x: 2360, y: 490, w: 20, h: 20, value: 1, collected: false, bobOffset: 0.8 },
      // Sanctuary entrance pearls
      { id: 'p12', type: 'pearl', x: 2600, y: 550, w: 20, h: 20, value: 1, collected: false, bobOffset: 1.2 },
      { id: 'p13', type: 'pearl', x: 2680, y: 550, w: 20, h: 20, value: 1, collected: false, bobOffset: 1.8 },
      { id: 'p14', type: 'pearl', x: 2740, y: 540, w: 20, h: 20, value: 1, collected: false, bobOffset: 2.2 },
      { id: 'p15', type: 'pearl', x: 2770, y: 480, w: 20, h: 20, value: 1, collected: false, bobOffset: 2.8 },
    ],
    hazards: [
      // Spiky Sea Urchin between gap
      { x: 480, y: 690, w: 34, h: 28, type: 'urchin', harmValue: 1 },
      // Puffer fish swimming in sea
      { x: 1470, y: 700, w: 36, h: 30, type: 'puffer', harmValue: 1 },
      { x: 2000, y: 680, w: 36, h: 30, type: 'puffer', harmValue: 1 },
    ],
    wildlife: [
      { id: 'crab1', type: 'crab', x: 280, y: 602, initialX: 280, vx: 20, range: 60, facing: 1, animFrame: 0 },
      { id: 'crab2', type: 'crab', x: 800, y: 502, initialX: 800, vx: 18, range: 50, facing: 1, animFrame: 0 },
      { id: 'bird1', type: 'bird', x: 600, y: 180, initialX: 600, vx: 55, range: 200, facing: 1, animFrame: 0 },
      { id: 'bird2', type: 'bird', x: 1800, y: 140, initialX: 1800, vx: 60, range: 250, facing: 1, animFrame: 0 },
      { id: 'fish1', type: 'fish', x: 500, y: 670, initialX: 500, vx: 30, range: 80, facing: 1, animFrame: 0 },
    ],
  };
}

function createJungleLevel(): LevelData {
  const worldWidth = 3400;
  const worldHeight = 850;

  return {
    id: 'jungle',
    title: '翡翠林泉',
    subtitle: '第二幕 · 远古古木与巨瀑',
    worldWidth,
    worldHeight,
    spawnPoint: { x: 100, y: 580 },
    goalPoint: { x: 3200, y: 480, w: 70, h: 90 },
    targetPearls: 18,
    totemAltar: {
      x: 3180,
      y: 470,
      w: 80,
      h: 100,
      activated: false,
      biome: 'jungle',
    },
    platforms: [
      // Starting mossy bank
      { x: 0, y: 650, w: 380, h: 200, type: 'solid' },
      // Giant Jungle Mushroom (Bouncy!)
      { x: 340, y: 620, w: 64, h: 24, type: 'bouncy' },
      // Elevated ancient stone branch
      { x: 420, y: 480, w: 200, h: 32, type: 'solid' },
      // Hanging vine bridge
      { x: 660, y: 420, w: 180, h: 22, type: 'one-way' },
      // Moving canopy leaves
      { x: 890, y: 380, w: 140, h: 24, type: 'moving', moveAxis: 'y', moveRange: 90, moveSpeed: 40, initialY: 380 },
      // Giant Stone Tiki Pillar
      { x: 1080, y: 300, w: 180, h: 400, type: 'solid' },
      // Second Bouncy pad on top of pillar
      { x: 1140, y: 280, w: 56, h: 20, type: 'bouncy' },
      // Waterfall crossing logs
      { x: 1320, y: 220, w: 180, h: 24, type: 'one-way' },
      { x: 1560, y: 310, w: 160, h: 24, type: 'one-way' },
      // Deep valley ground
      { x: 1760, y: 620, w: 320, h: 180, type: 'solid' },
      // Bouncy flower
      { x: 1940, y: 600, w: 60, h: 20, type: 'bouncy' },
      // Cliff overhang
      { x: 2060, y: 440, w: 220, h: 32, type: 'solid' },
      // Gliding canopy stretch
      { x: 2340, y: 360, w: 150, h: 24, type: 'moving', moveAxis: 'x', moveRange: 140, moveSpeed: 50, initialX: 2340 },
      { x: 2600, y: 420, w: 200, h: 28, type: 'one-way' },
      // Ancient Sanctuary
      { x: 2880, y: 560, w: 520, h: 290, type: 'solid' },
    ],
    collectibles: [
      { id: 'jp1', type: 'pearl', x: 180, y: 600, w: 20, h: 20, value: 1, collected: false, bobOffset: 0 },
      { id: 'jp2', type: 'star_fruit', x: 280, y: 590, w: 24, h: 24, value: 1, collected: false, bobOffset: 0.5 },
      { id: 'jp3', type: 'pearl', x: 480, y: 430, w: 20, h: 20, value: 1, collected: false, bobOffset: 1 },
      { id: 'jp4', type: 'pearl', x: 720, y: 370, w: 20, h: 20, value: 1, collected: false, bobOffset: 1.5 },
      { id: 'jp5', type: 'pearl', x: 940, y: 330, w: 20, h: 20, value: 1, collected: false, bobOffset: 2 },
      // Hidden Sun coin above the waterfall
      { id: 'jc1', type: 'sun_coin', x: 1220, y: 150, w: 26, h: 26, value: 5, collected: false, bobOffset: 2.5 },
      { id: 'jr1', type: 'totem_relic', x: 1410, y: 160, w: 30, h: 30, value: 10, collected: false, bobOffset: 3 },
      { id: 'jp6', type: 'pearl', x: 1630, y: 260, w: 20, h: 20, value: 1, collected: false, bobOffset: 3.5 },
      // Valley collectibles
      { id: 'jp7', type: 'pearl', x: 1820, y: 570, w: 20, h: 20, value: 1, collected: false, bobOffset: 4 },
      { id: 'jf1', type: 'coconut', x: 1890, y: 570, w: 22, h: 22, value: 1, collected: false, bobOffset: 4.5 },
      { id: 'jp8', type: 'pearl', x: 2130, y: 390, w: 20, h: 20, value: 1, collected: false, bobOffset: 5 },
      { id: 'jp9', type: 'pearl', x: 2210, y: 390, w: 20, h: 20, value: 1, collected: false, bobOffset: 5.5 },
      // Glide corridor pearls
      { id: 'jp10', type: 'pearl', x: 2420, y: 310, w: 20, h: 20, value: 1, collected: false, bobOffset: 0.3 },
      { id: 'jp11', type: 'pearl', x: 2510, y: 330, w: 20, h: 20, value: 1, collected: false, bobOffset: 0.9 },
      { id: 'jp12', type: 'pearl', x: 2680, y: 370, w: 20, h: 20, value: 1, collected: false, bobOffset: 1.4 },
      // Sanctuary entrance
      { id: 'jp13', type: 'pearl', x: 2950, y: 510, w: 20, h: 20, value: 1, collected: false, bobOffset: 2 },
      { id: 'jp14', type: 'pearl', x: 3030, y: 510, w: 20, h: 20, value: 1, collected: false, bobOffset: 2.6 },
      { id: 'jp15', type: 'pearl', x: 3100, y: 500, w: 20, h: 20, value: 1, collected: false, bobOffset: 3.2 },
      { id: 'jp16', type: 'pearl', x: 3150, y: 440, w: 20, h: 20, value: 1, collected: false, bobOffset: 3.8 },
      { id: 'jp17', type: 'pearl', x: 3180, y: 400, w: 20, h: 20, value: 1, collected: false, bobOffset: 4.2 },
      { id: 'jp18', type: 'star_fruit', x: 3230, y: 430, w: 24, h: 24, value: 1, collected: false, bobOffset: 4.8 },
    ],
    hazards: [
      { x: 800, y: 720, w: 40, h: 32, type: 'thorn_vine', harmValue: 1 },
      { x: 1680, y: 710, w: 40, h: 32, type: 'thorn_vine', harmValue: 1 },
      { x: 2260, y: 720, w: 40, h: 32, type: 'thorn_vine', harmValue: 1 },
    ],
    wildlife: [
      { id: 'bf1', type: 'butterfly', x: 300, y: 550, initialX: 300, vx: 35, range: 80, facing: 1, animFrame: 0 },
      { id: 'bf2', type: 'butterfly', x: 740, y: 360, initialX: 740, vx: 40, range: 90, facing: 1, animFrame: 0 },
      { id: 'bf3', type: 'butterfly', x: 2150, y: 380, initialX: 2150, vx: 30, range: 60, facing: 1, animFrame: 0 },
      { id: 'jbird1', type: 'bird', x: 1200, y: 120, initialX: 1200, vx: 50, range: 180, facing: 1, animFrame: 0 },
    ],
  };
}

function createSunsetLevel(): LevelData {
  const worldWidth = 3600;
  const worldHeight = 850;

  return {
    id: 'sunset',
    title: '落日神殿',
    subtitle: '第三幕 · 海崖晚霞与海神图腾',
    worldWidth,
    worldHeight,
    spawnPoint: { x: 100, y: 540 },
    goalPoint: { x: 3400, y: 440, w: 70, h: 90 },
    targetPearls: 20,
    totemAltar: {
      x: 3380,
      y: 430,
      w: 80,
      h: 100,
      activated: false,
      biome: 'sunset',
    },
    platforms: [
      // Starting sunset cliff
      { x: 0, y: 620, w: 360, h: 230, type: 'solid' },
      // Crystal ledge 1
      { x: 420, y: 540, w: 180, h: 28, type: 'sand' },
      // Floating volcanic rock
      { x: 670, y: 470, w: 160, h: 30, type: 'moving', moveAxis: 'x', moveRange: 130, moveSpeed: 55, initialX: 670 },
      // Bouncy crystal mushroom
      { x: 880, y: 450, w: 60, h: 20, type: 'bouncy' },
      // High Archway
      { x: 960, y: 280, w: 220, h: 32, type: 'solid' },
      // Moving vertical rock
      { x: 1250, y: 340, w: 140, h: 26, type: 'moving', moveAxis: 'y', moveRange: 110, moveSpeed: 45, initialY: 340 },
      // Middle sea cavern entrance
      { x: 1470, y: 500, w: 260, h: 300, type: 'solid' },
      // Bouncy Tiki pad inside cavern
      { x: 1660, y: 480, w: 56, h: 20, type: 'bouncy' },
      // Cave ceiling platform
      { x: 1780, y: 320, w: 190, h: 26, type: 'one-way' },
      // Sunset Cliff Glide
      { x: 2050, y: 260, w: 170, h: 28, type: 'solid' },
      { x: 2300, y: 360, w: 150, h: 24, type: 'one-way' },
      { x: 2520, y: 450, w: 180, h: 26, type: 'moving', moveAxis: 'x', moveRange: 120, moveSpeed: 50, initialX: 2520 },
      // Lower reef
      { x: 2780, y: 580, w: 240, h: 40, type: 'sand' },
      // Bouncy drum to Grand Totem
      { x: 2950, y: 560, w: 60, h: 20, type: 'bouncy' },
      // Grand Sun & Moon Sanctuary
      { x: 3100, y: 520, w: 500, h: 330, type: 'solid' },
    ],
    collectibles: [
      { id: 'sp1', type: 'pearl', x: 180, y: 570, w: 20, h: 20, value: 1, collected: false, bobOffset: 0 },
      { id: 'sp2', type: 'coconut', x: 260, y: 560, w: 22, h: 22, value: 1, collected: false, bobOffset: 0.4 },
      { id: 'sp3', type: 'pearl', x: 480, y: 490, w: 20, h: 20, value: 1, collected: false, bobOffset: 0.8 },
      { id: 'sp4', type: 'pearl', x: 740, y: 420, w: 20, h: 20, value: 1, collected: false, bobOffset: 1.2 },
      { id: 'sc1', type: 'sun_coin', x: 1040, y: 220, w: 26, h: 26, value: 5, collected: false, bobOffset: 1.6 },
      { id: 'sp5', type: 'pearl', x: 1100, y: 230, w: 20, h: 20, value: 1, collected: false, bobOffset: 2.0 },
      { id: 'sp6', type: 'pearl', x: 1310, y: 280, w: 20, h: 20, value: 1, collected: false, bobOffset: 2.4 },
      { id: 'sp7', type: 'pearl', x: 1540, y: 450, w: 20, h: 20, value: 1, collected: false, bobOffset: 2.8 },
      // High Relic in cave
      { id: 'sr1', type: 'totem_relic', x: 1870, y: 260, w: 30, h: 30, value: 10, collected: false, bobOffset: 3.2 },
      { id: 'sp8', type: 'pearl', x: 2110, y: 210, w: 20, h: 20, value: 1, collected: false, bobOffset: 3.6 },
      { id: 'sf1', type: 'star_fruit', x: 2170, y: 210, w: 24, h: 24, value: 1, collected: false, bobOffset: 4.0 },
      { id: 'sp9', type: 'pearl', x: 2360, y: 310, w: 20, h: 20, value: 1, collected: false, bobOffset: 4.4 },
      { id: 'sp10', type: 'pearl', x: 2580, y: 400, w: 20, h: 20, value: 1, collected: false, bobOffset: 4.8 },
      { id: 'sp11', type: 'pearl', x: 2830, y: 530, w: 20, h: 20, value: 1, collected: false, bobOffset: 5.2 },
      { id: 'sp12', type: 'pearl', x: 2890, y: 530, w: 20, h: 20, value: 1, collected: false, bobOffset: 5.6 },
      // Sanctuary treasure
      { id: 'sc2', type: 'sun_coin', x: 3180, y: 450, w: 26, h: 26, value: 5, collected: false, bobOffset: 0.5 },
      { id: 'sp13', type: 'pearl', x: 3230, y: 470, w: 20, h: 20, value: 1, collected: false, bobOffset: 1.0 },
      { id: 'sp14', type: 'pearl', x: 3280, y: 470, w: 20, h: 20, value: 1, collected: false, bobOffset: 1.5 },
      { id: 'sp15', type: 'pearl', x: 3320, y: 460, w: 20, h: 20, value: 1, collected: false, bobOffset: 2.0 },
      { id: 'sp16', type: 'pearl', x: 3350, y: 410, w: 20, h: 20, value: 1, collected: false, bobOffset: 2.5 },
      { id: 'sp17', type: 'pearl', x: 3370, y: 370, w: 20, h: 20, value: 1, collected: false, bobOffset: 3.0 },
    ],
    hazards: [
      { x: 380, y: 720, w: 36, h: 30, type: 'urchin', harmValue: 1 },
      { x: 1400, y: 720, w: 38, h: 32, type: 'puffer', harmValue: 1 },
      { x: 2240, y: 720, w: 36, h: 30, type: 'urchin', harmValue: 1 },
      { x: 2720, y: 720, w: 38, h: 32, type: 'puffer', harmValue: 1 },
    ],
    wildlife: [
      { id: 'ff1', type: 'bird', x: 500, y: 150, initialX: 500, vx: 45, range: 180, facing: 1, animFrame: 0 },
      { id: 'ff2', type: 'bird', x: 2100, y: 120, initialX: 2100, vx: 50, range: 220, facing: 1, animFrame: 0 },
      { id: 'scrab1', type: 'crab', x: 2820, y: 562, initialX: 2820, vx: 18, range: 60, facing: 1, animFrame: 0 },
    ],
  };
}
