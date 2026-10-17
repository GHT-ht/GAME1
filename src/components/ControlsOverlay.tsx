import { useEffect, useState } from 'react';
import { ACTIONS, ACTION_LABELS, DEFAULT_BINDINGS, prettyKey, type Action, type KeyBindings } from '../game/controls.ts';

interface Props {
  bindings: KeyBindings;
  onChange: (next: KeyBindings) => void;
  onClose: () => void;
}
export function ControlsOverlay({ bindings, onChange, onClose }: Props) {
  const [listening, setListening] = useState<Action | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!listening) return;
    const capture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.repeat) return;
      if (e.code === 'Escape') { setListening(null); return; }
      if (['Tab', 'CapsLock', 'MetaLeft', 'MetaRight'].includes(e.code) ||
          (e.code.startsWith('Arrow') && !(e.code === 'ArrowLeft' && listening === 'left') &&
            !(e.code === 'ArrowRight' && listening === 'right') &&
            !(e.code === 'ArrowUp' && listening === 'up') &&
            !(e.code === 'ArrowDown' && listening === 'down'))) {
        setError('该按键不能用于操作，请选择其他键'); return;
      }
      const conflict = ACTIONS.find(a => a !== listening && bindings[a] === e.code);
      if (conflict) { setError(`「${prettyKey(e.code)}」已分配给「${ACTION_LABELS[conflict]}」，请先更换那个功能的按键`); return; }
      onChange({ ...bindings, [listening]: e.code });
      setListening(null); setError('');
    };
    window.addEventListener('keydown', capture, true);
    return () => window.removeEventListener('keydown', capture, true);
  }, [listening, bindings, onChange]);

  return <div className="fixed inset-0 flex items-center justify-center p-4" style={{zIndex:110, background:'rgba(6,15,31,.78)', backdropFilter:'blur(10px)'}} onMouseDown={e => {if (e.target===e.currentTarget) onClose();}}>
    <section role="dialog" aria-modal="true" aria-label="自定义按键" style={{width:'min(94vw,650px)',maxHeight:'min(90vh,760px)',overflowY:'auto',background:'linear-gradient(140deg,#142d42,#111a34 72%)',border:'1px solid #56c9d777',borderRadius:24,boxShadow:'0 25px 80px #0009',padding:22,color:'#f2faff'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
        <div><div style={{color:'#a9e8f0',fontSize:12,letterSpacing:3,fontWeight:900}}>CONTROL STUDIO</div><h2 style={{fontSize:25,fontWeight:900,marginTop:2}}>⚙️ 自定义键位</h2></div>
        <button onClick={onClose} aria-label="关闭设置" style={{border:'1px solid #94a3b866',background:'#1e293b',color:'#fff',borderRadius:12,padding:'9px 14px',cursor:'pointer'}}>完成 ✕</button>
      </div>
      <p style={{fontSize:13,color:'#cbd5e1',marginTop:10,lineHeight:1.7}}>点击要修改的按键，再按下新键。支持自定义并自动保存；方向键始终可辅助移动。跳台上按住 <b style={{color:'#fde68a'}}>向上 / 跳跃</b> 蓄力，松手弹射。</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8,marginTop:18}}>
        {ACTIONS.map(action => <button key={action} onClick={() => {setListening(action);setError('');}} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:5,textAlign:'left',background:listening===action?'#115e59':'#ffffff0e',border:listening===action?'1px solid #5eead4':'1px solid #ffffff21',borderRadius:12,padding:'11px 10px',color:'#f8fafc',cursor:'pointer'}}>
          <span style={{fontSize:13,fontWeight:650}}>{ACTION_LABELS[action]}</span>
          <kbd style={{padding:'6px 9px',fontSize:13,fontWeight:900,fontFamily:'monospace',color:listening===action?'#fef08a':'#fff',border:'1px solid #ffffff43',background:'#02061780',borderRadius:7,whiteSpace:'nowrap'}}>{listening===action?'按键…':prettyKey(bindings[action])}</kbd>
        </button>)}
      </div>
      {error && <p role="alert" style={{color:'#fecaca',background:'#7f1d1d80',padding:10,borderRadius:8,marginTop:12,fontSize:13}}>{error}</p>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:18,gap:12}}>
        <span style={{fontSize:12,color:'#94a3b8'}}>Esc 取消按键捕获 · 键位保存到本机浏览器</span>
        <button onClick={() => {onChange({...DEFAULT_BINDINGS});setListening(null);setError('已恢复默认键位')}} style={{padding:'10px 14px',color:'#fef08a',border:'1px solid #fde68a88',borderRadius:12,background:'#78350f77',whiteSpace:'nowrap',cursor:'pointer'}}>↺ 恢复默认</button>
      </div>
    </section>
  </div>;
}
