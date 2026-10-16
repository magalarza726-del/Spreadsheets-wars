import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('la configuración de partida no ofrece mapa, tiempo ni joystick',()=>{
 assert.match(html,/id="settingsModal"/);
 assert.match(html,/id="touchPreview1"/);
 assert.match(html,/id="settingsMusicVolume"/);
 assert.doesNotMatch(html,/name="durationChoice"|name="terrainChoice"|name="touchChoice"/);
 assert.match(app,/input\[name="sizeChoice"\], input\[name="difficultyChoice"\]/);
});
test('inicio con cuenta atrás, aleatoriedad de mapa y versión web actual',()=>{
 assert.match(app,/function safeStartMatch\(\)/);
 assert.match(app,/countdownRemainingMs=3000/);
 assert.match(app,/terrain=selectRandomTerrain\(\)/);
 assert.match(html,/app\.js\?v=2\.1\.0/);
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
 assert.match(html,/SI\.CONTAR/);
 assert.match(app,/game\.hasEffect\(playerId,'si_contar'\)/);
});
