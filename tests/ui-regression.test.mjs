import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('el formulario registra cambios en todos los radios sin lanzar TypeError', () => {
  // querySelector devuelve un elemento; los listeners de una lista exigen querySelectorAll.
  assert.match(app, /\$\$\('input\[name="sizeChoice"\], input\[name="durationChoice"\], input\[name="difficultyChoice"\], input\[name="terrainChoice"\]'\)\.forEach/);
  assert.doesNotMatch(app, /(?<!\$)\$\('input\[name="sizeChoice"\], input\[name="durationChoice"\], input\[name="difficultyChoice"\], input\[name="terrainChoice"\]'\)\.forEach/);
});

test('crear partida y revancha pasan por un manejador seguro', () => {
  assert.match(app, /function safeStartMatch\(\)/);
  assert.match(app, /\$\('#startGame'\)\.addEventListener\('click',safeStartMatch\)/);
  assert.match(app, /\$\('#playAgainBtn'\)\.addEventListener\('click',safeStartMatch\)/);
});

test('la página solicita el JavaScript corregido sin usar caché de versión anterior', () => {
  assert.match(html, /<script type="module" src="\.\/app\.js\?v=1\.9\.0"><\/script>/);
});

test('el editor táctil está conectado a la partida sin reemplazar sus controles',()=>{
  assert.match(html, /id="layoutEditBtn"/);
  assert.match(html, /id="layoutEditor"/);
  assert.match(app, /function toggleLayoutEditor\(force\)/);
  assert.match(app, /function renderLayoutSettings\(\)/);
  assert.match(app, /if\(game.running && !game.paused && !layoutEditing\)/);
  assert.match(app, /controller\.setScale\(Number\(slider.value\)\/100\)/);
});
