import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('la configuración permite los cuatro mapas pero no cambiar tiempo ni joystick',()=>{
 assert.match(html,/id="settingsModal"/);
 assert.match(html,/id="touchPreview1"/);
 assert.match(html,/id="settingsMusicVolume"/);
 assert.doesNotMatch(html,/name="durationChoice"|name="touchChoice"/);
 assert.match(html,/name="terrainChoice" value="normal"/);
 assert.match(html,/name="terrainChoice" value="everest"/);
 assert.match(html,/name="terrainChoice" value="crater"/);
 assert.match(html,/name="terrainChoice" value="random" checked/);
 assert.match(app,/input\[name="sizeChoice"\], input\[name="terrainChoice"\], input\[name="difficultyChoice"\]/);
});
test('inicio con cuenta atrás, aleatoriedad de mapa y versión web actual',()=>{
 assert.match(app,/function safeStartMatch\(\)/);
 assert.match(app,/countdownRemainingMs=3000/);
 assert.match(app,/terrain=selectedTerrain==='random'\?selectRandomTerrain\(\):selectedTerrain/);
 assert.match(html,/app\.js\?v=2\.5\.0/);
});
test('la música se difumina al terminar y no se interrumpe de golpe',()=>{
 assert.match(app,/music\.fadeOut\(2700\)/);
 assert.match(html,/id="countdownOverlay"/);
});

test('menú simplificado y nombre del mapa durante la cuenta atrás',()=>{
 assert.doesNotMatch(html,/id="sidebarHelp"|id="sidebarPowerGuide"|INSPIRADO EN UNA HOJA DE CÁLCULO/);
 assert.match(html,/Se <em>conquista<\/em> celda por celda/);
 assert.ok(html.indexOf('id="difficultySection"') < html.indexOf('class="fixed-rules"'));
 assert.match(html,/id="countdownMapName"/);
 assert.match(app,/countdownMapName/);
 assert.doesNotMatch(html,/PRODUCTO|SI\.CONTAR/);
 assert.doesNotMatch(app,/si_contar|producto/);
});

test('la representación de cruce muestra ambos jugadores desplazados visualmente',()=>{
  assert.match(app,/const playersOverlap =/);
  assert.match(app,/const offset=playersOverlap/);
  assert.match(app,/ctx\.arc\(markerX,markerY/);
});

test('victory dialog scrolls vertically and retains access to the scores and buttons on short phones',()=>{
  const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
  assert.match(html,/id="resultsModal"/);
  assert.match(html,/id="resultsHomeBtn"/);
  assert.match(html,/id="playAgainBtn"/);
  assert.match(css,/#resultsModal\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css,/#resultsModal\s*\.results-dialog\s*\{[^}]*margin:\s*auto/s);
  assert.match(css,/@media \(max-height: 520px\)/);
});

test('la configuración web intercambia J1 WASD y J2 flechas y actualiza los rótulos',()=>{
 assert.match(html,/id="keyboardSettings"/);
 assert.match(html,/id="swapKeyboardBtn"/);
 assert.match(html,/id="keyboardPlayerOne">W A S D/);
 assert.match(html,/id="keyboardPlayerTwo">↑ ← ↓ →/);
 assert.match(app,/let keyboardSwapped = isAndroidApp \? false : loadKeyboardSwap\(\)/);
 assert.match(app,/keyboardSwapped=saveKeyboardSwap\(!keyboardSwapped\)/);
 assert.match(app,/keyboardPlayer\(code,keyboardSwapped\)/);
 assert.match(app,/toggle\(\$\('#keyboardSettings'\),!isAndroidApp\)/);
 assert.match(app,/keyboardLabel\(playerId,keyboardSwapped\)/);
});
