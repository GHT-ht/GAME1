import React from 'react';
import type { BiomeId } from '../game/types.ts';
import { BIOMES } from '../game/levels.ts';
import { getDefaultWeatherForBiome, getWeatherLabel } from '../game/weather.ts';
import { Play, Sparkles, MapPin } from 'lucide-react';

interface TitleScreenProps {
  currentBiome: BiomeId;
  onSelectBiome: (biome: BiomeId) => void;
  onStartGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  currentBiome,
  onSelectBiome,
  onStartGame,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 select-none bg-slate-950/30">
      {/* Top Brand Tag */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-sky-400/40 text-sky-200 text-xs font-semibold tracking-widest uppercase shadow-lg">
        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        <span>精美海岛奇遇 · TROPICAL ISLAND ODYSSEY</span>
      </div>

      {/* Main Title Emblem & Actions */}
      <div className="flex flex-col items-center max-w-xl text-center my-auto">
        {/* Custom SVG Island Crest */}
        <div className="w-20 h-20 mb-3 drop-shadow-[0_0_24px_rgba(56,189,248,0.6)]">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="crestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="46" fill="rgba(15, 23, 42, 0.85)" stroke="url(#crestGrad)" strokeWidth="3" />
            <circle cx="50" cy="38" r="14" fill="#fef08a" opacity="0.95" />
            <path d="M40 76 Q50 56 50 42" stroke="#78350f" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M50 42 Q32 36 28 48" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M50 42 Q68 36 72 48" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M50 42 Q50 24 58 26" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M20 74 Q35 68 50 74 T80 74" stroke="#38bdf8" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </svg>
        </div>

        {/* Game Title */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
          海岛奇旅
        </h1>
        <div className="text-base sm:text-xl font-extrabold tracking-wider text-amber-300 mt-1 mb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          蔚蓝之夏 · AZURE SHORE
        </div>

        <p className="text-sm text-slate-100 max-w-md drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] mb-6 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-white/10">
          漫步于清澈蔚蓝的热带沙滩，采摘椰果、寻觅深海珍珠，乘着巨大棕榈叶御风滑翔，唤醒沉睡的远古海神图腾！
          <br />
          <span className="text-violet-200">
            沿途会遇到超可爱的果冻水母、沙沙蟹、蘑菇小妖……用踩头、冲刺和挥叶斩把挡路的它们变成珍珠与爱心吧！
          </span>
        </p>

        {/* Biome Selection Cards */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 w-full mb-8">
          {(['beach', 'jungle', 'sunset'] as BiomeId[]).map((id) => {
            const b = BIOMES[id];
            const isSelected = currentBiome === id;
            const wType = getDefaultWeatherForBiome(id);
            const wLabel = getWeatherLabel(wType);
            return (
              <button
                key={id}
                onClick={() => onSelectBiome(id)}
                className={`relative flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer text-center ${
                  isSelected
                    ? 'bg-slate-900/90 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)] scale-105'
                    : 'bg-slate-950/70 border-white/15 hover:border-white/35 hover:bg-slate-900/80'
                }`}
                aria-label={`选择关卡 ${b.name}`}
              >
                {isSelected && (
                  <span className="absolute -top-2.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
                    当前 · SELECTED
                  </span>
                )}
                <div className="flex items-center gap-1 text-sm font-bold text-white mb-0.5">
                  <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{b.name}</span>
                </div>
                <span className="text-[11px] text-amber-200/90 font-medium">{b.subname}</span>
                <span className="mt-1.5 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-sky-200 font-medium flex items-center gap-1">
                  <span>{wLabel.icon}</span>
                  <span>{wLabel.name}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Primary Start Action */}
        <button
          data-start="true"
          onClick={onStartGame}
          className="group relative flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 active:scale-95 text-slate-950 font-black text-lg sm:text-xl shadow-[0_10px_35px_rgba(245,158,11,0.6)] transition-all cursor-pointer border border-amber-200"
          aria-label="开始海岛探险"
        >
          <Play className="w-6 h-6 fill-current transition-transform group-hover:scale-110" />
          <span>启航探险 START JOURNEY</span>
          <span className="text-xs font-mono font-bold opacity-75 ml-1 px-2 py-0.5 bg-black/15 rounded-md">
            Enter / Space
          </span>
        </button>
      </div>

      {/* Control Hint Line */}
      <div className="text-xs text-slate-200 font-medium px-4 py-2 rounded-full bg-slate-950/70 border border-white/10 shadow-lg drop-shadow text-center">
        🎮 A/D 或 方向键移动 · Space 跳跃与滑翔 · Shift 冲刺 · <span className="text-emerald-300 font-bold">F 挥叶斩</span> · 踩头 / 冲刺 / 挥击打小怪物 · P 暂停 · M 静音
      </div>
    </div>
  );
};
