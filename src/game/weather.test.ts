import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWeatherState,
  getDefaultWeatherForBiome,
  computeHeatWaveOffset,
  updateRainDrop,
  updateWeather,
  getWeatherLabel,
} from './weather.ts';

test('getDefaultWeatherForBiome assigns correct weather per biome', () => {
  assert.equal(getDefaultWeatherForBiome('beach'), 'heatwave');
  assert.equal(getDefaultWeatherForBiome('jungle'), 'rain');
  assert.equal(getDefaultWeatherForBiome('sunset'), 'twilight_aurora');
});

test('createWeatherState initializes valid rain pool and defaults', () => {
  const w = createWeatherState('beach');
  assert.equal(w.currentType, 'heatwave');
  assert.ok(w.rainDrops.length > 50);
  assert.equal(w.intensity, 1.0);
});

test('computeHeatWaveOffset produces bounded smooth sine distortion', () => {
  const offset1 = computeHeatWaveOffset(100, 0, 1.0);
  const offset2 = computeHeatWaveOffset(200, 1.5, 0.5);

  assert.ok(Math.abs(offset1) <= 5.0);
  assert.ok(Math.abs(offset2) <= 2.5);
});

test('updateRainDrop advances drop downward and wraps around viewport', () => {
  const drop = { x: 100, y: 590, length: 20, speed: 500, alpha: 0.5 };
  updateRainDrop(drop, -30, 0.1, 800, 600);

  // 590 + 50 = 640 > 620, so drop resets above top
  assert.equal(drop.y, -20);
});

test('updateWeather updates time and syncs biome changes', () => {
  const w = createWeatherState('beach');
  assert.equal(w.currentType, 'heatwave');

  updateWeather(w, 'jungle', 0.05, 800, 600);
  assert.equal(w.biome, 'jungle');
  assert.equal(w.currentType, 'rain');
  assert.ok(w.time > 0);
});

test('getWeatherLabel provides readable labels', () => {
  const label = getWeatherLabel('rain');
  assert.equal(label.icon, '🌧️');
  assert.ok(label.name.includes('雨'));
});
