import test from 'node:test';
import assert from 'node:assert/strict';
import {keyboardPlayer,keyboardLabel,loadKeyboardSwap,saveKeyboardSwap,KEYBOARD_SWAP_STORAGE_KEY} from '../keyboard-controls.js';

const storage=()=>{
 const data=new Map();
 return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
};
test('por defecto los controles están intercambiados: J1 WASD, J2 flechas',()=>{
 const store=storage();
 assert.equal(loadKeyboardSwap(store),true);
 assert.equal(keyboardLabel(1,true),'W A S D');
 assert.equal(keyboardLabel(2,true),'↑ ← ↓ →');
 for(const code of ['KeyW','KeyA','KeyS','KeyD'])assert.equal(keyboardPlayer(code,true),1);
 for(const code of ['ArrowUp','ArrowLeft','ArrowDown','ArrowRight'])assert.equal(keyboardPlayer(code,true),2);
});
test('botón devuelve esquema clásico y persiste tras recarga',()=>{
 const store=storage();
 assert.equal(saveKeyboardSwap(false,store),false);
 assert.equal(store.getItem(KEYBOARD_SWAP_STORAGE_KEY),'false');
 assert.equal(loadKeyboardSwap(store),false);
 assert.equal(keyboardLabel(1,false),'↑ ← ↓ →');
 assert.equal(keyboardLabel(2,false),'W A S D');
 for(const code of ['ArrowUp','ArrowLeft','ArrowDown','ArrowRight'])assert.equal(keyboardPlayer(code,false),1);
 for(const code of ['KeyW','KeyA','KeyS','KeyD'])assert.equal(keyboardPlayer(code,false),2);
 saveKeyboardSwap(true,store);
 assert.equal(loadKeyboardSwap(store),true);
});
test('teclas ajenas no mueven a ningún jugador y almacenamiento bloqueado funciona',()=>{
 for(const code of ['Space','Escape','Enter','KeyQ','Digit1',''])assert.equal(keyboardPlayer(code,true),0);
 const unavailable={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
 assert.equal(loadKeyboardSwap(unavailable),true);
 assert.doesNotThrow(()=>saveKeyboardSwap(false,unavailable));
});
