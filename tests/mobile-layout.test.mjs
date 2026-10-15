import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file = name => readFileSync(new URL('../'+name, import.meta.url),'utf8');
const html=file('index.html'),app=file('app.js'),css=file('styles.css');

test('minimapa plegable accesible para móvil',()=>{
  assert.match(html,/id="minimapToggle"[^>]*aria-controls="minimapWidget"/);
  assert.match(app,/mapWidget\.classList\.toggle\('mini-collapsed'/);
  assert.match(app,/mapToggle\.addEventListener\('click'/);
});
test('joystick predeterminado en móvil y opción persistida',()=>{
  assert.match(app,/window\.matchMedia\('\(pointer: coarse\)'\)/);
  assert.match(app,/mobileInput\.matches \? 'joystick' : 'none'/);
  assert.match(app,/localStorage\.setItem\('sw-touch-choice'/);
});
test('diseño adaptable en horizontal y vertical',()=>{
  assert.match(css,/@media \(pointer:coarse\) and \(orientation:landscape\)/);
  assert.match(css,/@media \(pointer:coarse\) and \(orientation:portrait\)/);
  assert.match(css,/\.play-area\.split\{flex-direction:column\}/);
  assert.match(css,/\.minimap-widget\.mini-collapsed\{display:none!important\}/);
});
