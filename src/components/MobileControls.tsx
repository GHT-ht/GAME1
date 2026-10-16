import React from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, Zap, Swords } from 'lucide-react';

interface MobileControlsProps {
  onLeftDown: () => void;
  onLeftUp: () => void;
  onRightDown: () => void;
  onRightUp: () => void;
  onJumpDown: () => void;
  onJumpUp: () => void;
  onDash: () => void;
  onAttack: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onLeftDown,
  onLeftUp,
  onRightDown,
  onRightUp,
  onJumpDown,
  onJumpUp,
  onDash,
  onAttack,
}) => {
  return (
    <div className="fixed inset-x-0 bottom-3 sm:bottom-4 z-30 pointer-events-none flex justify-between px-3 sm:px-6 select-none">
      {/* Left / Right D-Pad */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onTouchStart={(e) => { e.preventDefault(); onLeftDown(); }}
          onTouchEnd={(e) => { e.preventDefault(); onLeftUp(); }}
          onMouseDown={onLeftDown}
          onMouseUp={onLeftUp}
          className="w-14 h-14 rounded-2xl bg-slate-900/70 active:bg-amber-400 active:text-slate-950 text-white flex items-center justify-center border border-white/20 shadow-lg active:scale-95 transition-transform"
          aria-label="向左走"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>

        <button
          onTouchStart={(e) => { e.preventDefault(); onRightDown(); }}
          onTouchEnd={(e) => { e.preventDefault(); onRightUp(); }}
          onMouseDown={onRightDown}
          onMouseUp={onRightUp}
          className="w-14 h-14 rounded-2xl bg-slate-900/70 active:bg-amber-400 active:text-slate-950 text-white flex items-center justify-center border border-white/20 shadow-lg active:scale-95 transition-transform"
          aria-label="向右走"
        >
          <ArrowRight className="w-7 h-7" />
        </button>
      </div>

      {/* Action Buttons: Jump & Dash & Slash */}
      <div className="pointer-events-auto flex items-center gap-3">
        {/* Slash */}
        <button
          onTouchStart={(e) => { e.preventDefault(); onAttack(); }}
          onClick={onAttack}
          className="w-13 h-13 rounded-full bg-emerald-500/85 active:bg-emerald-400 text-white flex flex-col items-center justify-center border border-white/30 shadow-lg active:scale-90 transition-transform"
          aria-label="挥叶斩"
          title="挥叶斩 (键盘 F)"
        >
          <Swords className="w-5 h-5" />
          <span className="text-[9px] font-black tracking-tight">挥击</span>
        </button>

        {/* Dash */}
        <button
          onTouchStart={(e) => { e.preventDefault(); onDash(); }}
          onClick={onDash}
          className="w-13 h-13 rounded-full bg-sky-500/80 active:bg-sky-400 text-white flex flex-col items-center justify-center border border-white/30 shadow-lg active:scale-90 transition-transform"
          aria-label="空中连冲"
          title="空中连冲"
        >
          <Zap className="w-5 h-5" />
          <span className="text-[9px] font-black tracking-tight">连冲</span>
        </button>

        {/* Jump / Glide */}
        <button
          onTouchStart={(e) => { e.preventDefault(); onJumpDown(); }}
          onTouchEnd={(e) => { e.preventDefault(); onJumpUp(); }}
          onMouseDown={onJumpDown}
          onMouseUp={onJumpUp}
          className="w-16 h-16 rounded-full bg-amber-400 active:bg-amber-300 text-slate-950 flex flex-col items-center justify-center border-2 border-amber-200 shadow-[0_4px_16px_rgba(245,158,11,0.5)] active:scale-90 transition-transform"
          aria-label="三段跳跃与滑翔"
          title="三段跳跃与滑翔"
        >
          <ArrowUp className="w-7 h-7 -mb-0.5" />
          <span className="text-[10px] font-black tracking-tighter">三段跳</span>
        </button>
      </div>
    </div>
  );
};
