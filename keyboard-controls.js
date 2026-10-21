/** Reconfigurable web keyboard allocation; offline safe and independent of DOM. */
export const KEYBOARD_SWAP_STORAGE_KEY = 'sw-keyboard-swapped-v1';
const arrowKeys = Object.freeze(['ArrowUp','ArrowLeft','ArrowDown','ArrowRight']);
const wasdKeys = Object.freeze(['KeyW','KeyA','KeyS','KeyD']);
export const ARROW_LABEL = '↑ ← ↓ →';
export const WASD_LABEL = 'W A S D';

export function keyboardPlayer(code, swapped = true) {
  if (arrowKeys.includes(code)) return swapped ? 2 : 1;
  if (wasdKeys.includes(code)) return swapped ? 1 : 2;
  return 0;
}
export function keyboardLabel(playerId, swapped = true) {
  if (playerId !== 1 && playerId !== 2) return '';
  return (swapped ? playerId === 1 : playerId === 2) ? WASD_LABEL : ARROW_LABEL;
}
export function loadKeyboardSwap(storage = null) {
  try {
    const value=(storage ?? globalThis.localStorage)?.getItem(KEYBOARD_SWAP_STORAGE_KEY);
    return value !== 'false'; // Swapped by default, including first visit.
  } catch {return true;}
}
export function saveKeyboardSwap(swapped, storage = null) {
  const value=Boolean(swapped);
  try {(storage ?? globalThis.localStorage)?.setItem(KEYBOARD_SWAP_STORAGE_KEY,String(value));}
  catch {}
  return value;
}
