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
 assert.match(app,/input\[name="sizeChoice"\], input\[name="difficultyChoice"\]/);
});
test('inicio con cuenta atrás, aleatoriedad de mapa y versión web actual',()=>{
 assert.match(app,/function safeStartMatch\(\)/);
 assert.match(app,/countdownRemainingMs=3000/);
 assert.match(app,/terrain=selectedTerrain==='random'\?selectRandomTerrain\(\):selectedTerrain/);
 assert.match(html,/app\.js\?v=2\.2\.0/);
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
