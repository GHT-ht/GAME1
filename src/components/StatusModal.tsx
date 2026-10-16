import React from 'react';
import type { GameState, RunStats, BiomeId } from '../game/types.ts';
import { BIOMES } from '../game/levels.ts';
import { RotateCcw, Play, Home, ArrowRight, Award, Trophy, AlertTriangle } from 'lucide-react';

interface StatusModalProps {
  state: GameState;
  stats: RunStats | null;
  currentBiome: BiomeId;
  onResume: () => void;
  onRestart: () => void;
  onNextStage: () => void;
  onHome: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  state,
  stats,
  currentBiome,
  onResume,
  onRestart,
  onNextStage,
  onHome,
}) => {
  if (state !== 'paused' && state !== 'victory' && state !== 'gameover') {
    return null;
  }

  const biomeConfig = BIOMES[currentBiome];
  const isLastStage = currentBiome === 'sunset';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/70 select-none">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-amber-500/40 p-6 sm:p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-white">
        {/* Victory Screen */}
        {state === 'victory' && stats && (
          <div className="flex flex-col items-center">
            {/* Victory Badge */}
            <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center mb-3 shadow-[0_0_24px_rgba(251,191,36,0.5)]">
              <Trophy className="w-9 h-9 text-amber-300" />
            </div>

            <h2 className="text-3xl font-black text-amber-300 tracking-tight mb-0.5">
              海岛探险大胜利！
            </h2>
            <div className="text-xs uppercase font-extrabold tracking-widest text-amber-200/80 mb-2">
              ISLAND EXPEDITION VICTORY
            </div>
            <p className="text-xs text-slate-300 mb-5">
              成功唤醒了 {biomeConfig.name} ({biomeConfig.subname}) 的海神图腾祭坛！
            </p>

            {/* Star Rating */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3].map((starIdx) => (
                <span
                  key={starIdx}
                  className={`text-3xl transition-transform ${
                    starIdx <= stats.stars
                      ? 'scale-110 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]'
                      : 'opacity-25 text-slate-600'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>

            {/* Run Stats Grid */}
            <div className="grid grid-cols-2 gap-3 w-full mb-6 text-left">
              <div className="bg-slate-800/80 rounded-2xl p-3 border border-white/10">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  PEARLS 收集珍珠
                </div>
                <div className="text-xl font-black text-sky-300 font-mono tabular-nums">
                  {stats.pearlsCollected} <span className="text-xs text-slate-400">/ {stats.totalPearls}</span>
                </div>
              </div>

              <div className="bg-slate-800/80 rounded-2xl p-3 border border-white/10">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  TIME 耗费时间
                </div>
                <div className="text-xl font-black text-emerald-300 font-mono tabular-nums">
                  {stats.timeSpent.toFixed(1)} <span className="text-xs text-slate-400">秒</span>
                </div>
              </div>

              <div className="bg-slate-800/80 rounded-2xl p-3 border border-white/10">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  RELIC 神秘圣物
                </div>
                <div className="text-sm sm:text-base font-black text-purple-300">
                  {stats.relicFound ? '✨ 已发掘 FOUND' : '未寻获 NONE'}
                </div>
              </div>

              <div className="bg-slate-800/80 rounded-2xl p-3 border border-white/10">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  SCORE 探险积分
                </div>
                <div className="text-xl font-black text-amber-300 font-mono tabular-nums">
                  {stats.score}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5 w-full">
              {!isLastStage ? (
                <button
                  data-start="true"
                  onClick={onNextStage}
                  className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-base shadow-lg transition-all cursor-pointer"
                >
                  <span>启程下一海岛 NEXT ISLAND</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  data-start="true"
                  onClick={onRestart}
                  className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-base shadow-lg transition-all cursor-pointer"
                >
                  <Award className="w-5 h-5" />
                  <span>重游群岛 · 冲击三星 PLAY AGAIN</span>
                </button>
              )}

              <div className="flex gap-2 w-full">
                <button
                  onClick={onRestart}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-all cursor-pointer border border-white/10"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>重玩本关 RETRY</span>
                </button>
                <button
                  onClick={onHome}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-all cursor-pointer border border-white/10"
                >
                  <Home className="w-4 h-4" />
                  <span>主界面 MENU</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {state === 'gameover' && stats && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center mb-3">
              <AlertTriangle className="w-9 h-9 text-rose-400" />
            </div>

            <h2 className="text-2xl font-black text-rose-400 tracking-tight mb-0.5">
              探险受阻 · 体力耗尽
            </h2>
            <div className="text-xs uppercase font-extrabold tracking-widest text-rose-300/80 mb-2">
              OUT OF ENERGY
            </div>
            <p className="text-xs text-slate-300 mb-6">
              不小心跌入深海或触碰了尖刺海胆，深呼吸后再次启程吧！
            </p>

            <div className="bg-slate-800/80 rounded-2xl p-4 border border-white/10 w-full mb-6 flex justify-around">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">PEARLS 珍珠</div>
                <div className="text-xl font-bold text-sky-300 font-mono">{stats.pearlsCollected}</div>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase">TIME 时长</div>
                <div className="text-xl font-bold text-slate-200 font-mono">{stats.timeSpent.toFixed(0)}s</div>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full">
              <button
                data-start="true"
                onClick={onRestart}
                className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-base shadow-lg transition-all cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
                <span>立即重新挑战 RETRY</span>
              </button>
              <button
                onClick={onHome}
                className="flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>返回主岛 MENU</span>
              </button>
            </div>
          </div>
        )}

        {/* Paused Screen */}
        {state === 'paused' && (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-black text-white tracking-tight mb-0.5">
              游戏已暂停
            </h2>
            <div className="text-xs uppercase font-extrabold tracking-widest text-slate-400 mb-4">
              GAME PAUSED
            </div>
            <p className="text-xs text-slate-400 mb-6">
              吹着海风稍作歇息，随时继续探索
            </p>

            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={onResume}
                className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-base shadow-lg transition-all cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>继续冒险 RESUME (ESC)</span>
              </button>

              <button
                onClick={onRestart}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-all cursor-pointer border border-white/10"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重新开始本关 RESTART (R)</span>
              </button>

              <button
                onClick={onHome}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-all cursor-pointer border border-white/10"
              >
                <Home className="w-4 h-4" />
                <span>返回关卡选择 MENU</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
