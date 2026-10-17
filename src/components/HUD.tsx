import React from 'react';
import type { PlayerState, BiomeConfig, CombatSnapshot } from '../game/types.ts';
import { getWeatherLabel, type WeatherState } from '../game/weather.ts';
import { comboTier } from '../game/monsters.ts';
import { type KeyBindings, prettyKey } from '../game/controls.ts';
import { Volume2, VolumeX, Pause, RotateCcw, Compass, Swords, Heart, Skull } from 'lucide-react';

interface HUDProps {
  player: PlayerState;
  biome: BiomeConfig;
  weather?: WeatherState;
  combat?: CombatSnapshot;
  targetPearls: number;
  timeSpent: number;
  isMuted: boolean;
  bindings: KeyBindings;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onOpenStageSelect: () => void;
  onCycleWeather?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  biome,
  weather,
  combat,
  targetPearls,
  timeSpent,
  isMuted,
  bindings,
  onToggleMute,
  onPause,
  onRestart,
  onOpenStageSelect,
  onCycleWeather,
}) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const weatherLabel = weather ? getWeatherLabel(weather.currentType) : null;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-6 select-none font-sans">
      {/* Boss health bar — appears while a stage guardian is alive */}
      {combat && combat.bossActive && combat.bossMaxHp > 0 && (
        <div className="pointer-events-none absolute left-1/2 top-24 sm:top-28 -translate-x-1/2 w-[85vw] max-w-2xl">
          <div className="flex items-end justify-between px-1 mb-1">
            <span className="text-xs sm:text-sm font-black text-rose-200 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] tracking-wide">
              👑 {combat.bossName}
            </span>
            <span className="text-[10px] sm:text-xs font-black text-rose-300/90 font-mono tabular-nums drop-shadow">
              {combat.bossHp} / {combat.bossMaxHp}
            </span>
          </div>
          <div className="h-3.5 sm:h-4 w-full rounded-full bg-slate-950/85 border-2 border-rose-400/60 shadow-[0_0_20px_rgba(244,63,94,0.5)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 via-red-400 to-amber-300 transition-all duration-200"
              style={{ width: `${Math.max(0, (combat.bossHp / combat.bossMaxHp) * 100)}%` }}
            />
          </div>
          {combat.bossTaunt && (
            <div className="mt-1 text-center text-[10px] sm:text-[11px] font-bold text-amber-200/90 drop-shadow">
              「{combat.bossTaunt}」 · 冲刺与踩头可以破防，蓄力时它会变硬！
            </div>
          )}
        </div>
      )}

      {/* Top Header Bar */}
      <header className="flex items-start justify-between gap-2 flex-wrap">
        {/* Left: Biome Info + Health */}
        <div className="pointer-events-auto flex flex-col gap-1.5 sm:gap-2">
          {/* Biome Badge & Timer & Dynamic Weather Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={onOpenStageSelect}
              className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-amber-300 text-[11px] sm:text-xs font-bold tracking-wide border border-amber-400/40 shadow-md cursor-pointer transition-transform active:scale-95"
              aria-label="选择海岛关卡"
              tabIndex={-1}
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>{biome.subname}</span>
              <span className="text-slate-400 font-medium hidden sm:inline">· {biome.name}</span>
            </button>

            {/* Weather Overlay Badge / Cycle Button */}
            {weatherLabel && (
              <button
                onClick={onCycleWeather}
                className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-sky-200 hover:text-white text-[11px] sm:text-xs font-bold border border-sky-400/35 shadow-md cursor-pointer transition-all active:scale-95"
                title="当前生态气候视觉叠加层，点击切换天气 (Click to cycle weather)"
                aria-label={`天气: ${weatherLabel.name}`}
                tabIndex={-1}
              >
                <span className="text-sm">{weatherLabel.icon}</span>
                <span>{weatherLabel.en}</span>
                <span className="text-[10px] text-sky-300/80 hidden md:inline">({weatherLabel.name})</span>
              </button>
            )}

            {/* Timer readout */}
            <div className="px-2.5 py-1 rounded-full bg-slate-900/70 text-slate-200 text-[11px] sm:text-xs font-mono font-bold tracking-wider border border-white/10 shadow">
              ⏱ {formatTime(timeSpent)}
            </div>
          </div>

          {/* Vitality Coconuts / Hearts Socket & Action Gauges */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-900/85 px-3 py-1.5 rounded-2xl border border-amber-500/30 shadow-lg w-fit">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                HP
              </span>
              <div className="flex items-center gap-1" aria-label={`HP: ${player.health}/${player.maxHealth}`}>
                {Array.from({ length: player.maxHealth }).map((_, idx) => {
                  const isFull = idx < player.health;
                  return (
                    <svg
                      key={idx}
                      viewBox="0 0 24 24"
                      className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 ${
                        isFull
                          ? 'scale-100 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]'
                          : 'scale-90 opacity-30 text-slate-600'
                      }`}
                    >
                      <circle cx="12" cy="12" r="9" fill={isFull ? '#78350f' : '#1e293b'} stroke={isFull ? '#fbbf24' : '#475569'} strokeWidth="2" />
                      {isFull && (
                        <>
                          <circle cx="9" cy="10" r="1.5" fill="#fef08a" />
                          <circle cx="15" cy="10" r="1.5" fill="#fef08a" />
                          <circle cx="12" cy="15" r="1.5" fill="#fef08a" />
                          <path d="M12 3 C12 0, 16 0, 15 3" fill="#22c55e" stroke="#16a34a" strokeWidth="1" />
                        </>
                      )}
                    </svg>
                  );
                })}
              </div>
            </div>

            {/* Jump & Dash Action Energy Gauge */}
            <div className="hidden sm:flex items-center gap-2.5 bg-slate-900/85 px-3 py-1.5 rounded-2xl border border-sky-400/30 shadow-lg text-[10px] font-bold">
              {/* Triple Jump Pips */}
              <div className="flex items-center gap-1" title="三段跳可用次数">
                <span className="text-amber-300 font-black">🪶 JUMP:</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: player.maxJumps ?? 3 }).map((_, idx) => {
                    const active = idx < (player.jumpsLeft ?? 3);
                    return (
                      <span
                        key={idx}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          active
                            ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)] scale-100'
                            : 'bg-slate-700 opacity-40 scale-75'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="w-px h-3 bg-white/20" />

              {/* Air Dash Pips */}
              <div className="flex items-center gap-1" title="空中连冲可用次数">
                <span className="text-sky-300 font-black">⚡ DASH:</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: player.maxAirDashes ?? 3 }).map((_, idx) => {
                    const active = idx < (player.airDashesLeft ?? 3);
                    return (
                      <span
                        key={idx}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          active
                            ? 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)] scale-100'
                            : 'bg-slate-700 opacity-40 scale-75'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Combat energy and booster charge — real gameplay values. */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="rounded-xl bg-slate-950/85 border border-fuchsia-400/30 px-3 py-1.5 w-40">
              <div className="flex justify-between font-black text-[10px] text-fuchsia-200"><span>⚡ 大招能量 [{prettyKey(bindings.ultimate)}]</span><span>{Math.round(player.ultimateMeter)}%</span></div>
              <div className="h-2 rounded-full bg-slate-800 mt-1 overflow-hidden"><div className="h-full bg-gradient-to-r from-fuchsia-600 to-amber-300" style={{width:`${player.ultimateMeter}%`,background:'linear-gradient(90deg,#9333ea,#fcd34d)'}} /></div>
            </div>
            {player.boosterPadIndex >= 0 && <div className="rounded-xl bg-amber-950/90 border border-amber-400/70 px-3 py-1.5 w-44">
              <div className="flex justify-between font-black text-[10px] text-amber-100"><span>⬆️ 蓄力跳台</span><span>{Math.round(player.boosterCharge * 100)}%</span></div>
              <div className="h-2 bg-amber-950 rounded-full mt-1 overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-500 to-yellow-200" style={{width:`${player.boosterCharge * 100}%`,background:'linear-gradient(90deg,#f59e0b,#fef08a)'}} /></div>
              <div className="text-[10px] text-amber-200">按住 {prettyKey(bindings.up)} / ↑ / {prettyKey(bindings.jump)}，松手发射</div>
            </div>}
          </div>

          {/* Player HP bar + monster combat readout */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Smooth HP bar for precise health reading */}
            <div className="bg-slate-900/85 px-3 py-1.5 rounded-2xl border border-rose-400/30 shadow-lg w-40 sm:w-48">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider mb-1">
                <span className="text-rose-300 flex items-center gap-1">
                  <Heart className="w-3 h-3 fill-current" /> 生命 HP
                </span>
                <span className="text-white font-mono tabular-nums">
                  {player.health}/{player.maxHealth}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden border border-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    player.health <= 1
                      ? 'bg-gradient-to-r from-rose-500 to-red-400 animate-pulse'
                      : 'bg-gradient-to-r from-rose-400 to-amber-300'
                  }`}
                  style={{ width: `${Math.max(0, (player.health / Math.max(1, player.maxHealth)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Cute monster counter */}
            {combat && (
              <div
                className="flex items-center gap-1.5 bg-slate-900/85 px-3 py-1.5 rounded-2xl border border-violet-400/30 shadow-lg text-[10px] font-black"
                title="本关剩余小怪物 / 已击败数量"
              >
                <Skull className="w-3.5 h-3.5 text-violet-300" />
                <span className="text-violet-300 uppercase tracking-wider">怪物</span>
                <span className="text-white font-mono tabular-nums">
                  {combat.remaining}
                  <span className="text-slate-400 font-normal">/{combat.total}</span>
                </span>
                <span className="w-px h-3 bg-white/20" />
                <span className="text-emerald-300 font-mono tabular-nums">击败 {combat.defeated}</span>
              </div>
            )}

            {/* Combo meter */}
            {combat && combat.combo >= 2 && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border shadow-lg text-[11px] font-black animate-pulse"
                style={{
                  borderColor: comboTier(combat.combo).color,
                  color: comboTier(combat.combo).color,
                  background: 'rgba(2, 6, 23, 0.85)',
                }}
              >
                <Swords className="w-3.5 h-3.5" />
                <span className="font-mono tabular-nums">x{combat.combo}</span>
                <span className="tracking-wider">{comboTier(combat.combo).label}</span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Live Pearls & Fruit Collectibles */}
        <div className="pointer-events-auto flex items-center gap-3 sm:gap-4 bg-slate-900/85 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl border border-sky-400/40 shadow-lg">
          {/* Pearl Counter */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-sky-300 via-white to-sky-100 shadow-[0_0_10px_rgba(56,189,248,0.8)] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white opacity-90 -mt-0.5 -ml-0.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-black text-sky-300 tracking-wider">
                PEARLS 珍珠
              </span>
              <span className="text-sm sm:text-base font-black text-white font-mono tabular-nums leading-none">
                {player.pearls} <span className="text-[10px] sm:text-xs text-sky-300/80 font-normal">/ {targetPearls}</span>
              </span>
            </div>
          </div>

          <div className="h-5 sm:h-6 w-px bg-white/20" />

          {/* Tropical Fruits */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-lg sm:text-xl leading-none">🥥</span>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-black text-amber-300 tracking-wider">
                FRUITS 果实
              </span>
              <span className="text-sm sm:text-base font-black text-amber-300 font-mono tabular-nums leading-none">
                {player.fruits}
              </span>
            </div>
          </div>

          {/* Sun Coin / Relic */}
          {player.relicsFound > 0 && (
            <>
              <div className="h-5 sm:h-6 w-px bg-white/20" />
              <div className="flex items-center gap-1.5 animate-pulse">
                <span className="text-lg sm:text-xl leading-none">🗿</span>
                <span className="text-[10px] sm:text-xs font-black text-purple-300">RELIC 圣物</span>
              </div>
            </>
          )}
        </div>

        {/* Right: Quick Action Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 ml-auto sm:ml-0">
          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-slate-200 hover:text-white flex items-center justify-center border border-white/15 shadow-md active:scale-95 cursor-pointer"
            aria-label={isMuted ? '取消静音' : '静音 (按 M)'}
            title={isMuted ? '取消静音 (M)' : '静音 (M)'}
            tabIndex={-1}
          >
            {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />}
          </button>

          {/* Restart */}
          <button
            onClick={onRestart}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-slate-200 hover:text-white flex items-center justify-center border border-white/15 shadow-md active:scale-95 cursor-pointer"
            aria-label="重新开始本关 (按 R)"
            title="重新开始 (R)"
            tabIndex={-1}
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Pause */}
          <button
            onClick={onPause}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-slate-200 hover:text-white flex items-center justify-center border border-white/15 shadow-md active:scale-95 cursor-pointer"
            aria-label="暂停游戏 (按 P 或 ESC)"
            title="暂停游戏 (P / ESC)"
            tabIndex={-1}
          >
            <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* Bottom Control Clue Line */}
      <footer className="flex items-center justify-between text-xs text-slate-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
        <div className="hidden sm:flex items-center gap-2 bg-slate-950/75 px-4 py-2 rounded-full border border-white/15 shadow flex-wrap max-w-[78vw]">
          <span><b className="text-white">{prettyKey(bindings.left)}/{prettyKey(bindings.right)} ←/→</b> 移动</span><span>·</span>
          <span><b className="text-amber-300">{prettyKey(bindings.jump)}</b> 三段跳</span><span>·</span>
          <span><b className="text-emerald-300">{prettyKey(bindings.attack)}</b> 连斩</span><span>·</span>
          <span><b className="text-sky-300">{prettyKey(bindings.dash)}</b> 冲刺</span><span>·</span>
          <span><b className="text-orange-300">{prettyKey(bindings.heavy)}</b> 重击</span><span>·</span>
          <span><b className="text-violet-300">{prettyKey(bindings.skill)}</b> 技能</span><span>·</span>
          <span><b className="text-pink-300">{prettyKey(bindings.ultimate)}</b> 大招</span><span>·</span>
          <span><b className="text-teal-300">{prettyKey(bindings.guard)}</b> 格挡</span><span>·</span>
          <span className="text-amber-300">跳台：按住 ↑/{prettyKey(bindings.jump)} 蓄力，松开发射</span>
        </div>
        <div className="text-right ml-auto text-[11px] sm:text-xs text-amber-300 font-bold bg-slate-950/70 px-3 py-1.5 rounded-full border border-amber-400/30">
          {combat && combat.bossActive
            ? `⚠️ 守关 Boss「${combat.bossName}」已出现，击败它可拿珍珠与爱心 👑`
            : 'Reach Ancient Altar 激活远古祭坛 🗿'}
        </div>
      </footer>
    </div>
  );
};
