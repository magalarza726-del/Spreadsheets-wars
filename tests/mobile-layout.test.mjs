import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=n=>readFileSync(new URL('../'+n,import.meta.url),'utf8');
const app=file('app.js'),html=file('index.html'),css=file('styles.css');
test('la web se juega con teclado y solo el APK fuerza joystick',()=>{
 assert.match(app,/SpreadsheetsWarsAndroid/);
 assert.match(app,/isAndroidApp \? 'joystick' : 'none'/);
 assert.doesNotMatch(html,/name="touchChoice"/);
 assert.match(html,/id="androidTouchSettings"/);
});
test('mapa plegable, orientación móvil y tamaño/posición ajustables',()=>{
 assert.match(html,/id="minimapToggle"/);
 assert.match(css,/@media \(pointer:coarse\) and \(orientation:portrait\)/);
 assert.match(css,/touch-preview-surface/);
});
