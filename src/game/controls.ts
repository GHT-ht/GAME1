/** Remappable keyboard layout, stored locally. Use KeyboardEvent.code for stable keys. */
export const ACTIONS = [
  'left', 'right', 'up', 'down', 'jump', 'attack', 'dash',
  'heavy', 'skill', 'ultimate', 'guard', 'pause', 'restart', 'mute'
] as const;
export type Action = typeof ACTIONS[number];
export type KeyBindings = Record<Action, string>;
export const DEFAULT_BINDINGS: KeyBindings = {
  left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS',
  jump: 'Space', attack: 'KeyJ', dash: 'KeyK', heavy: 'KeyL',
  skill: 'KeyU', ultimate: 'KeyI', guard: 'KeyO',
  pause: 'Escape', restart: 'KeyR', mute: 'KeyM'
};
export const ACTION_LABELS: Record<Action, string> = {
  left:'向左', right:'向右', up:'向上 / 跳台蓄力', down:'向下', jump:'跳跃 / 蓄力',
  attack:'普通攻击', dash:'冲刺', heavy:'重击', skill:'范围技能',
  ultimate:'能量大招', guard:'格挡', pause:'暂停', restart:'重开', mute:'静音'
};
export const CONTROL_STORAGE_KEY = 'island-odyssey-controls-v2';
export function prettyKey(code: string) {
  if (code === 'Space') return '空格';
  if (code === 'Escape') return 'Esc';
  if (code.startsWith('Arrow')) return ({ArrowUp:'↑', ArrowDown:'↓', ArrowLeft:'←', ArrowRight:'→'} as Record<string,string>)[code] || code;
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return ({ShiftLeft:'左Shift', ShiftRight:'右Shift', ControlLeft:'左Ctrl', ControlRight:'右Ctrl'} as Record<string,string>)[code] || code;
}
export function loadBindings(): KeyBindings {
  try {
    const saved = JSON.parse(localStorage.getItem(CONTROL_STORAGE_KEY) || '{}');
    const candidate = { ...DEFAULT_BINDINGS };
    for (const action of ACTIONS) {
      if (typeof saved[action] === 'string' && saved[action].length < 32) candidate[action] = saved[action];
    }
    if (new Set(Object.values(candidate)).size === ACTIONS.length) return candidate;
  } catch {}
  return { ...DEFAULT_BINDINGS };
}
export function saveBindings(bindings: KeyBindings) {
  try { localStorage.setItem(CONTROL_STORAGE_KEY, JSON.stringify(bindings)); } catch {}
}
