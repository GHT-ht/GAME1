import type { BiomeId } from './types.ts';

export type WeatherType = 'heatwave' | 'rain' | 'twilight_aurora';

export interface RainDrop {
  x: number;
  y: number;
  length: number;
  speed: number;
  alpha: number;
}

export interface WeatherState {
  currentType: WeatherType;
  biome: BiomeId;
  intensity: number; // 0 to 1
  windSpeed: number; // px/s
  windTarget: number;
  time: number;
  rainDrops: RainDrop[];
  mistOffset: number;
  heatPhase: number;
}

const MAX_RAINDROPS = 120;

export function getDefaultWeatherForBiome(biome: BiomeId): WeatherType {
  switch (biome) {
    case 'beach':
      return 'heatwave';
    case 'jungle':
      return 'rain';
    case 'sunset':
      return 'twilight_aurora';
    default:
      return 'heatwave';
  }
}

export function createWeatherState(biome: BiomeId): WeatherState {
  const rainDrops: RainDrop[] = [];
  for (let i = 0; i < MAX_RAINDROPS; i++) {
    rainDrops.push({
      x: Math.random() * 1600,
      y: Math.random() * 1000,
      length: 12 + Math.random() * 14,
      speed: 480 + Math.random() * 220,
      alpha: 0.25 + Math.random() * 0.45,
    });
  }

  return {
    currentType: getDefaultWeatherForBiome(biome),
    biome,
    intensity: 1.0,
    windSpeed: -40,
    windTarget: -40,
    time: 0,
    rainDrops,
    mistOffset: 0,
    heatPhase: 0,
  };
}

export function computeHeatWaveOffset(y: number, time: number, intensity: number): number {
  // Pure function for calculating horizontal heat ripple distortion
  const wave1 = Math.sin(y * 0.04 + time * 3.5);
  const wave2 = Math.cos(y * 0.08 - time * 2.2);
  return (wave1 * 2.8 + wave2 * 1.5) * intensity;
}

export function updateRainDrop(
  drop: RainDrop,
  windSpeed: number,
  dt: number,
  viewportW: number,
  viewportH: number
): void {
  drop.y += drop.speed * dt;
  drop.x += windSpeed * dt;

  if (drop.y > viewportH + 20) {
    drop.y = -20;
    drop.x = Math.random() * (viewportW + 300) - 150;
  }
  if (drop.x < -100) {
    drop.x = viewportW + 50;
  } else if (drop.x > viewportW + 100) {
    drop.x = -50;
  }
}

export function updateWeather(
  weather: WeatherState,
  biome: BiomeId,
  dt: number,
  viewportW: number,
  viewportH: number
): void {
  weather.time += dt;

  // Auto-sync with biome if biome changed
  if (weather.biome !== biome) {
    weather.biome = biome;
    weather.currentType = getDefaultWeatherForBiome(biome);
  }

  // Gentle wind gust dynamics
  if (Math.sin(weather.time * 0.2) > 0.8) {
    weather.windTarget = weather.currentType === 'rain' ? -70 : -25;
  } else if (Math.sin(weather.time * 0.2) < -0.8) {
    weather.windTarget = weather.currentType === 'rain' ? -20 : -50;
  }
  weather.windSpeed += (weather.windTarget - weather.windSpeed) * Math.min(1, dt * 1.5);

  // Update specific weather behaviors
  if (weather.currentType === 'rain') {
    for (let i = 0; i < weather.rainDrops.length; i++) {
      updateRainDrop(weather.rainDrops[i], weather.windSpeed, dt, viewportW, viewportH);
    }
    weather.mistOffset = (weather.mistOffset + dt * 25) % (viewportW + 400);
  } else if (weather.currentType === 'heatwave') {
    weather.heatPhase += dt * 3.0;
  } else if (weather.currentType === 'twilight_aurora') {
    weather.mistOffset = (weather.mistOffset + dt * 15) % (viewportW + 400);
  }
}

export function getWeatherLabel(type: WeatherType): { name: string; en: string; icon: string } {
  switch (type) {
    case 'heatwave':
      return { name: '热浪晴金', en: 'HEAT SHIMMER', icon: '☀️' };
    case 'rain':
      return { name: '林泉细雨', en: 'TROPICAL RAIN', icon: '🌧️' };
    case 'twilight_aurora':
      return { name: '晚霞极光', en: 'TWILIGHT AURORA', icon: '✨' };
  }
}
