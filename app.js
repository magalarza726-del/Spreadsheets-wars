import {SpreadsheetBattle, MAPS, DURATIONS, TERRAINS, DIFFICULTIES, POWERUPS, DIRECTIONS, columnLabel, clamp, chooseComputerDirection, selectRandomTerrain} from './core.js';
import {BattleMusic, TRACKS} from './music.js';
import {AudioLibrary} from './music-library.js';
import {attachTouchControls} from './touch-controls.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const home = $('#homeScreen');
const gameScreen = $('#gameScreen');
const playArea = $('#playArea');
const setup = $('#setupModal');
const help = $('#helpModal');
const pauseDialog = $('#pauseModal');
const results = $('#resultsModal');
const minimap = $('#minimapCanvas');
const minimapCtx = minimap.getContext('2d');
const audioLibrary = new AudioLibrary();
const music = new BattleMusic({ onChange: ({status, track, muted, volume}) => {
  const label = $('#musicTrack');
  label.textContent = status === 'missing' ? 'Añade música en configuración' : status === 'blocked' ? 'Pulsa para activar música' : track?.title ?? 'Música de partida';
  label.title = track?.title ?? label.textContent;
  $('#musicToggle').textContent = muted ? '🔇' : '♫';
  $('#musicToggle').setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar música');
  $('#musicVolume').value = String(Math.round(volume * 100));
  $('#musicNext').disabled = !music.active || status === 'missing';
}});

const PLAYER_COLORS = {1:'#3679e5',2:'#ef8838'};
const CELL_COLORS = {0:'#ffffff',1:'#c8dffc',2:'#f9dec7'};
const CELL_W = 83, CELL_H = 23, COL_HEADER = 22, ROW_HEADER = 39;

let selectedMatch = 'pvp';
let selectedMap = 'pequeno';
let selectedTerrain = 'random';
const MATCH_SECONDS = 90;

const mobileInput = window.matchMedia('(pointer: coarse)');
// Only the packaged Android APK uses touch controls; browser/PC uses keyboard.
const isAndroidApp = /SpreadsheetsWarsAndroid/.test(navigator.userAgent);
const selectedTouch = isAndroidApp ? 'joystick' : 'none';
let countdownRemainingMs = 0;
let pendingStartMusic = false;
let settingsPreviews = {};

const isCompactGame = () => mobileInput.matches || window.innerWidth <= 760;
const mapToggle = $('#minimapToggle');
const mapWidget = $('#minimapWidget');
function showMinimap(show) {
  mapWidget.classList.toggle('mini-collapsed', !show);
  mapToggle.setAttribute('aria-expanded', String(show));
  mapToggle.setAttribute('aria-label', show ? 'Ocultar minimapa' : 'Mostrar mapa completo');
  mapToggle.textContent = show ? '× Mapa' : '▦ Mapa';
}
mapToggle.addEventListener('click', () => showMinimap(mapWidget.classList.contains('mini-collapsed')));
let touchVectors = {1:null,2:null};
let touchControllers = {1:null,2:null};
let layoutEditing = false;
let selectedDifficulty = 'normal';
let session = null;
let zoom = 1;
let lastFrame = performance.now();
let lastUiDraw = 0;
let keys = new Set();
let keyOrder = {1:[],2:[]};
let toasts = [];
let importingMusic = false;

function toggle(element, show) { element.classList.toggle('hidden',!show); }
const formatTime = (time) => { const whole = Math.max(0,Math.ceil(time)); return `${String(Math.floor(whole/60)).padStart(2,'0')}:${String(whole%60).padStart(2,'0')}`; };

function setupMatch(kind) {
  selectedMatch = kind;
  $('#selectedMatchText').textContent = kind === 'ai' ? 'J1 vs COM · Un jugador contra la computadora' : 'J1 vs J2 · Dos jugadores locales';
  toggle($('#difficultySection'),kind==='ai');
  updateChoices();
  toggle(setup,true);
}
function getMatchSeconds() {return MATCH_SECONDS;}
function updateChoices() {
  for (const [name,selector] of [['sizeChoice','.size-choice'],['terrainChoice','.terrain-choice'],['difficultyChoice','.difficulty-choice']]) {
    $$(selector).forEach(label=>{
      const input=$('input[type="radio"]',label);
      label.classList.toggle('selected',input.checked);
      if(input.checked){
        if(name==='sizeChoice')selectedMap=input.value;
        if(name==='terrainChoice')selectedTerrain=input.value;
        if(name==='difficultyChoice')selectedDifficulty=input.value;
      }
    });
  }
  const map=MAPS[selectedMap];
  $('#startGame').disabled = false;
  $('#setupSummary').textContent=`${map.size} × ${map.size} · ${selectedTerrain==='random'?'Random':TERRAINS[selectedTerrain].label} · ${selectedMatch==='ai'?`COM ${DIFFICULTIES[selectedDifficulty].label} · ${DIFFICULTIES[selectedDifficulty].cellsPerSecond} c/s`:'J1 vs J2 · 25 c/s'}`;
}
$$('[data-match]').forEach(btn => btn.addEventListener('click',()=>setupMatch(btn.dataset.match)));
$('#closeSetup').addEventListener('click',()=>toggle(setup,false));
$('#cancelSetup').addEventListener('click',()=>toggle(setup,false));
$$('input[name="sizeChoice"], input[name="terrainChoice"], input[name="difficultyChoice"]').forEach(input=>input.addEventListener('change',updateChoices));

const libraryInput = $('#addMusicFiles');
const libraryList = $('#localMusicList');
const musicStatus = $('#localMusicStatus');
const chooseMusic = $('#musicSource');

function showMusicStatus(message, error = false) {
  musicStatus.textContent = message;
  musicStatus.classList.toggle('music-error', error);
}
function displayMusicLibrary() {
  libraryList.replaceChildren();
  $('#musicCount').textContent = `${audioLibrary.items.length} ${audioLibrary.items.length === 1 ? 'canción' : 'canciones'}`;
  for (const track of audioLibrary.items) {
    const row = document.createElement('li'); row.className = 'local-song';
    const label = document.createElement('span');
    label.textContent = `♫ ${track.name}`;
    label.title = track.name;
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'remove-song';
    remove.setAttribute('aria-label', `Quitar ${track.name}`);
    remove.textContent = '×';
    remove.addEventListener('click',async () => {
      remove.disabled = true;
      try {await audioLibrary.remove(track.id); displayMusicLibrary(); showMusicStatus('Canción eliminada de tu biblioteca.');}
      catch (error) {remove.disabled = false; showMusicStatus('No fue posible quitar la canción. Inténtalo nuevamente.',true);}
    });
    row.append(label,remove);libraryList.append(row);
  }
  chooseMusic.disabled = false;
  const details = audioLibrary.persistent
    ? 'Se guardan en este navegador y no necesitas subirlos a GitHub.'
    : 'Almacenamiento permanente no disponible: solo se conservarán durante esta sesión.';
  $('#musicStorageHint').textContent=details;
}
async function loadMusicLibrary() {
  try {await audioLibrary.initialize();displayMusicLibrary();}
  catch (error) {showMusicStatus('No se pudo leer la biblioteca musical local.',true);}
}
libraryInput.addEventListener('change',async () => {
  if(!libraryInput.files?.length || importingMusic) return;
  importingMusic = true;
  libraryInput.disabled = true;
  $('#addMusicButton').classList.add('music-loading');
  showMusicStatus('Agregando las canciones…');
  try {
    const report = await audioLibrary.addFiles(libraryInput.files);
    displayMusicLibrary();
    if(report.added.length) {chooseMusic.value = 'personal';persistMusicSource();showMusicStatus(`${report.added.length} ${report.added.length === 1 ? 'canción añadida' : 'canciones añadidas'}.${report.skipped.length ? ` ${report.skipped.length} repetidas.` : ''}${report.errors.length ? ' ' + report.errors.join(' ') : ''}`,!!report.errors.length);}
    else showMusicStatus([...report.errors, ...(report.skipped.length ? ['Esas canciones ya estaban añadidas.'] : [])].join(' ') || 'No se añadieron canciones.',true);
  } catch(error) {showMusicStatus('No se pudo agregar la música. Comprueba el espacio disponible.',true);}
  finally {importingMusic=false;libraryInput.disabled=false;$('#addMusicButton').classList.remove('music-loading');libraryInput.value='';}
});
function pickMatchTracks() {
  // Prefer uploaded tracks, preventing 404 attempts for built-in MP3s not deployed on GitHub Pages.
  const personal = audioLibrary.getTracks();
  return chooseMusic.value === 'default' || !personal.length ? TRACKS : personal;
}

function persistMusicSource() {
  try {localStorage.setItem('sw-music-source',chooseMusic.value);} catch {}
}
try {
  const source=localStorage.getItem('sw-music-source');
  if(['auto','personal','default'].includes(source)) chooseMusic.value=source;
  const volume=Number(localStorage.getItem('sw-music-volume'));
  if(Number.isFinite(volume) && volume>=0 && volume<=100 && localStorage.getItem('sw-music-volume')!==null) music.setVolume(volume/100);
} catch {}
chooseMusic.addEventListener('change',persistMusicSource);
function updateVolume(value) {
  const percent=Math.max(0,Math.min(100,Number(value)));
  music.setVolume(percent/100);
  $('#settingsMusicVolume').value=String(percent);
  $('#settingsVolumeLabel').textContent=percent+' %';
  $('#musicVolume').value=String(percent);
  try {localStorage.setItem('sw-music-volume',String(percent));} catch {}
}
$('#settingsMusicVolume').addEventListener('input',e=>updateVolume(e.target.value));
$('#settingsMusicVolume').value=String(Math.round(music.preferredVolume*100));
$('#settingsVolumeLabel').textContent=Math.round(music.preferredVolume*100)+' %';

function destroySettingsPreviews() {
  for(const ctrl of Object.values(settingsPreviews))ctrl?.destroy?.();
  settingsPreviews={};
  for(const i of [1,2])$('#touchPreview'+i).replaceChildren();
}
function mountSettingsPreviews() {
  if(!isAndroidApp)return;
  for(const i of [1,2]){
    const surface=$('#touchPreview'+i);
    // A live editable preview shares the same persisted layout used in matches.
    const ctrl=attachTouchControls({querySelector:()=>surface},i,'joystick',()=>{});
    ctrl.setEditing(true);
    settingsPreviews[i]=ctrl;
    const slider=$('#previewSize'+i),output=$('#previewValue'+i);
    slider.value=String(Math.round(ctrl.getLayout().scale*100));
    output.textContent=slider.value+' %';
    slider.oninput=()=>{output.textContent=Math.round(ctrl.setScale(Number(slider.value)/100)*100)+' %';};
    $('#previewReset'+i).onclick=()=>{
      const next=ctrl.resetPlacement();slider.value=String(Math.round(next.scale*100));output.textContent=slider.value+' %';
    };
  }
}
function openSettings() {
  toggle($('#settingsModal'),true);
  toggle($('#androidTouchSettings'),isAndroidApp);
  $('#settingsMusicVolume').value=String(Math.round(music.preferredVolume*100));
  $('#settingsVolumeLabel').textContent=Math.round(music.preferredVolume*100)+' %';
  void loadMusicLibrary();
  if(isAndroidApp)mountSettingsPreviews();
}
function closeSettings() {
  destroySettingsPreviews();
  toggle($('#settingsModal'),false);
}
$('#sidebarSettings').addEventListener('click',openSettings);
$('#homeSettingsBtn').addEventListener('click',openSettings);
$('#settingsDone').addEventListener('click',closeSettings);
$('#closeSettings').addEventListener('click',closeSettings);

$('#sidebarHelp')?.addEventListener('click',()=>toggle(help,true));
$('#sidebarPowerGuide')?.addEventListener('click',()=>toggle(help,true));
$('#closeHelp').addEventListener('click',()=>toggle(help,false));
$('#helpOk').addEventListener('click',()=>toggle(help,false));

function buildView(playerId) {
  const pane = document.createElement('div');
  pane.className = 'sheet-view';
  const isComputer = session.game.againstComputer && playerId === 2;
  const label = isComputer ? 'COM' : `J${playerId}`;
  pane.innerHTML = `<div class="player-bar"><div class="player-identity"><span class="player-chip ${playerId===2?'orange':''}">${label}</span><span class="player-controls">${playerId===1?'↑ ← ↓ →':isComputer?'Rival automático':'W A S D'}</span></div><div class="active-powerups" aria-label="Habilidades activas"></div></div><div class="sheet-surface"><canvas class="sheet-canvas" aria-label="Hoja de cálculo del jugador ${label}"></canvas><div class="sheet-scrollhint"><div class="scroll-marker"></div></div></div>`;
  playArea.appendChild(pane);
  if(selectedTouch!=='none')touchControllers[playerId]=attachTouchControls(pane,playerId,selectedTouch,vector=>{
    touchVectors[playerId]=vector;
    if(vector)attemptMove(playerId,performance.now());
    else if(session)session.lastMoved[playerId]=-Infinity;
  });
  const surface = $('.sheet-surface',pane);
  const canvas = $('.sheet-canvas',pane);
  const ctx = canvas.getContext('2d',{alpha:false});
  const view = {playerId,pane,surface,canvas,ctx,cameraX:0,cameraY:0,manualUntil:0,marker:$('.scroll-marker',pane),abilities:$('.active-powerups',pane),initialized:false};
  surface.addEventListener('wheel',event=>{
    if(!session || session.game.paused) return;
    event.preventDefault();
    const [w,h] = getCellDims();
    const width=Math.max(1,surface.clientWidth-ROW_HEADER),height=Math.max(1,surface.clientHeight-COL_HEADER);
    const maxX=Math.max(0,session.game.size*w-width),maxY=Math.max(0,session.game.size*h-height);
    if(event.shiftKey || Math.abs(event.deltaX)>Math.abs(event.deltaY)) view.cameraX=clamp(view.cameraX+(event.deltaX||event.deltaY),0,maxX);
    else view.cameraY=clamp(view.cameraY+event.deltaY,0,maxY);
    view.manualUntil=performance.now()+2200;
  },{passive:false});
  return view;
}

function getCellDims() {return [Math.round(CELL_W*zoom),Math.round(CELL_H*zoom)];}
function startMatch() {
  const map=MAPS[selectedMap], seconds=getMatchSeconds(), terrain=selectedTerrain==='random'?selectRandomTerrain():selectedTerrain;
  if(!Number.isFinite(seconds)||seconds<=0)return;
  toggleLayoutEditor(false);
  for(const control of Object.values(touchControllers))control?.destroy?.();
  touchControllers={1:null,2:null};
  const battle=new SpreadsheetBattle({size:map.size,seconds,mode:'bala',terrain,againstComputer:selectedMatch==='ai',difficulty:selectedDifficulty});
  session={game:battle,map:selectedMap,terrain,duration:'bala',difficulty:selectedDifficulty,match:selectedMatch,views:[],lastMoved:{1:-Infinity,2:-Infinity},aiMemory:{}};
  zoom=isCompactGame() ? .75 : 1;
  $('#zoomRange').value=String(Math.round(zoom*100));$('#zoomLabel').textContent=Math.round(zoom*100)+'%';
  showMinimap(!isCompactGame());
  keys.clear();keyOrder={1:[],2:[]};touchVectors={1:null,2:null};
  toasts.forEach(clearTimeout);toasts=[];$('#toastContainer').replaceChildren();
  playArea.replaceChildren();
  playArea.classList.toggle('split',selectedMatch==='pvp');
  session.views.push(buildView(1));
  if(selectedMatch==='pvp') session.views.push(buildView(2));
  toggle($('#layoutEditBtn'), selectedTouch!=='none');
  $('#opponentTag').textContent=selectedMatch==='ai'?'COM':'J2';
  $('#miniOpponent').textContent=selectedMatch==='ai'?'COM':'J2';
  $('#miniSize').textContent=`${map.size} × ${map.size}`;
  $('#currentMode').textContent=`${TERRAINS[terrain].label.toUpperCase()} · ${map.size} × ${map.size} · BALA · ${formatTime(seconds)}`;
  $('#countdownMapName').textContent=`MAPA: ${TERRAINS[terrain].label.toUpperCase()}`;
  $('#matchFormat').textContent=selectedMatch==='ai'?`J1 vs COM · ${DIFFICULTIES[selectedDifficulty].label} · ${DIFFICULTIES[selectedDifficulty].cellsPerSecond} c/s`:'J1 vs J2';
  $('#bottomStatus').textContent='Listo · Mueve tu selección para pintar';
  $('.excel-tab.active')?.classList.remove('active');
  $('[data-tab="Inicio"]').classList.add('active');
  toggle(setup,false);toggle(pauseDialog,false);toggle(results,false);toggle(home,false);toggle(gameScreen,true);
  $('#pauseBtn').textContent='Ⅱ Pausa';
  lastFrame=performance.now();lastUiDraw=0;
  showToast('Nuevo libro',`${map.label} · ${map.size} × ${map.size} · ${formatTime(seconds)}`);
  updateHUD();
  music.stop();
  music.tracks = pickMatchTracks();
  countdownRemainingMs=3000;pendingStartMusic=false;
  music.start(); // play in the user's click gesture: browser autoplay stays permitted.
  toggle($('#countdownOverlay'),true);$('#countdownNumber').textContent='3';
}
function safeStartMatch() {
  try {
    startMatch();
  } catch (error) {
    console.error('Error al crear la partida:', error);
    music.stop();
    session = null;
    $('#setupSummary').textContent = 'No se pudo iniciar la partida. Recarga la página y vuelve a intentarlo.';
    $('#setupSummary').setAttribute('role', 'alert');
    toggle(gameScreen, false);
    toggle(home, true);
    toggle(setup, true);
  }
}
$('#startGame').addEventListener('click',safeStartMatch);
$('#playAgainBtn').addEventListener('click',safeStartMatch);
$('#exitBtn').addEventListener('click',returnHome);
$('#pauseExitBtn').addEventListener('click',returnHome);
$('#resultsHomeBtn').addEventListener('click',returnHome);
$('#pauseBtn').addEventListener('click',switchPause);
$('#layoutEditBtn').addEventListener('click',()=>toggleLayoutEditor());
$('#layoutClose').addEventListener('click',()=>toggleLayoutEditor(false));
$('#resumeBtn').addEventListener('click',switchPause);
$('#musicToggle').addEventListener('click',()=>{ music.setMuted(!music.audio.muted); if (music.active && music.audio.paused && !session?.game.paused) music.resume(); });
$('#musicNext').addEventListener('click',()=>{ if (session?.game.running && !session.game.paused) music.next(); });
$('#musicVolume').addEventListener('input',event=>updateVolume(event.target.value));
$$('.excel-tab').forEach(tab=>tab.addEventListener('click',()=>{$$('.excel-tab').forEach(b=>b.classList.toggle('active',b===tab));}));
$('#zoomRange').addEventListener('input',event=>{zoom=Number(event.target.value)/100;$('#zoomLabel').textContent=event.target.value+'%';});

window.addEventListener('resize', () => {
  if (session && isCompactGame() && window.innerHeight < 700 && !mapWidget.classList.contains('mini-collapsed')) showMinimap(false);
});

// Each player gets an independent draggable controller and size preference.
// Gameplay does not advance while the layout editor is open.
function renderLayoutSettings() {
  const target=$('#layoutSettings');
  target.replaceChildren();
  for(const [idString, controller] of Object.entries(touchControllers)){
    if(!controller)continue;
    const id=Number(idString);
    const line=document.createElement('div');line.className='layout-setting';
    const label=document.createElement('label');
    label.textContent='J'+id+' · Tamaño';
    const slider=document.createElement('input');slider.type='range';
    slider.min='70';slider.max='180';slider.step='5';
    slider.value=String(Math.round(controller.getLayout().scale*100));
    slider.id='layoutSlider'+id;
    label.htmlFor=slider.id;
    const number=document.createElement('output');number.className='layout-percent';
    number.htmlFor=slider.id;number.textContent=slider.value+'%';
    slider.setAttribute('aria-label','Tamaño del control J'+id);
    slider.addEventListener('input',()=>{
      number.textContent=Math.round(controller.setScale(Number(slider.value)/100)*100)+'%';
    });
    const reset=document.createElement('button');reset.type='button';
    reset.className='layout-reset';reset.textContent='Restablecer J'+id;
    reset.addEventListener('click',()=>{
      const initial=controller.resetPlacement();
      slider.value=String(Math.round(initial.scale*100));
      number.textContent=slider.value+'%';
    });
    line.append(label,slider,number,reset);
    target.append(line);
  }
}
function toggleLayoutEditor(force){
  const next=typeof force==='boolean'?force:!layoutEditing;
  if(next && (!session?.game.running || session.game.paused || selectedTouch==='none'))return;
  layoutEditing=next;
  toggle($('#layoutEditor'),next);
  const button=$('#layoutEditBtn');
  button.classList.toggle('editing',next);
  button.setAttribute('aria-expanded',String(next));
  button.setAttribute('aria-pressed',String(next));
  button.textContent=next?'✓ Listo':'🎮 Ajustar';
  touchVectors={1:null,2:null};
  keys.clear();keyOrder={1:[],2:[]};
  if(session)session.lastMoved={1:-Infinity,2:-Infinity};
  for(const control of Object.values(touchControllers))control?.setEditing?.(next);
  if(next){renderLayoutSettings();showMinimap(false);}
  lastFrame=performance.now();
}

function returnHome() {
  countdownRemainingMs=0;pendingStartMusic=false;toggle($('#countdownOverlay'),false);
  toggleLayoutEditor(false);
  for(const control of Object.values(touchControllers))control?.destroy?.();
  touchControllers={1:null,2:null};
  music.stop();
  session=null;keys.clear();keyOrder={1:[],2:[]};touchVectors={1:null,2:null};
  toggle(results,false);toggle(pauseDialog,false);toggle(gameScreen,false);toggle(home,true);
}
function switchPause() {
  if(!session || !session.game.running) return;
  if(layoutEditing)toggleLayoutEditor(false);
  session.game.paused=!session.game.paused;
  if (session.game.paused) music.pause(); else music.resume();
  toggle(pauseDialog,session.game.paused);
  $('#pauseBtn').textContent=session.game.paused?'▶ Continuar':'Ⅱ Pausa';
  keys.clear();keyOrder={1:[],2:[]};touchVectors={1:null,2:null};
  lastFrame=performance.now();
}
function pauseOnBlur() {
  if(session?.game.running && !session.game.paused) switchPause();
}
window.addEventListener('blur',pauseOnBlur);
document.addEventListener('visibilitychange',()=>{if(document.hidden) pauseOnBlur();});
function showToast(title,sub='',type='') {
  const wrapper=document.createElement('div');
  wrapper.className=`toast ${type ? type+'-border':''}`;
  const b=document.createElement('strong');b.textContent=title;
  const span=document.createElement('span');span.textContent=sub;
  wrapper.append(b,span);$('#toastContainer').appendChild(wrapper);
  const timeout=setTimeout(()=>wrapper.remove(),3100);toasts.push(timeout);
}

const keyToPlayer = code => code.startsWith('Arrow') ? 1 : ['KeyW','KeyA','KeyS','KeyD'].includes(code) ? 2 : 0;
window.addEventListener('keydown',event=>{
  if(event.code==='Escape') {
    if(!help.classList.contains('hidden')) toggle(help,false);
    else if(!$('#settingsModal').classList.contains('hidden')) closeSettings();
    else if(!setup.classList.contains('hidden')) toggle(setup,false);
    else if(session?.game.running) switchPause();
    event.preventDefault();return;
  }
  if(!(event.code in DIRECTIONS) || !session || !session.game.running || session.game.paused || countdownRemainingMs>0) return;
  event.preventDefault();
  const id=keyToPlayer(event.code);
  if(id===2 && session.match==='ai') return;
  if(!keys.has(event.code)) {
    keys.add(event.code);
    keyOrder[id]=keyOrder[id].filter(key=>key!==event.code);
    keyOrder[id].push(event.code);
    attemptMove(id,performance.now());
  }
});
window.addEventListener('keyup',event=>{
  keys.delete(event.code);
  const id=keyToPlayer(event.code);
  if(id){
    keyOrder[id]=keyOrder[id].filter(key=>key!==event.code);
    if(!keyOrder[id].length && session)session.lastMoved[id]=-Infinity;
  }
});

function attemptMove(playerId,time) {
  if(!session?.game.running || session.game.paused || layoutEditing || countdownRemainingMs>0) return;
  const game=session.game;
  const isAI=playerId===2 && session.match==='ai';
  if(!isAI && !keyOrder[playerId].length && !touchVectors[playerId]) {
    session.lastMoved[playerId]=-Infinity;
    return;
  }
  const interval=game.movementInterval(playerId);
  if(!Number.isFinite(session.lastMoved[playerId]))session.lastMoved[playerId]=time-interval;
  // Handle sub-frame steps (especially PROMEDIO: 20 ms) without skipping any cell.
  let steps=0;
  while(time-session.lastMoved[playerId]>=interval-0.5 && steps<12){
    const direction=isAI?computerDirection(game):(touchVectors[playerId]||DIRECTIONS[keyOrder[playerId].at(-1)]);
    if(!direction)break;
    const didMove=game.move(playerId,...direction);
    session.lastMoved[playerId]+=interval;
    steps++;
    if(isAI && didMove){
      const cpu=game.players[1];
      const idx=cpu.y*game.size+cpu.x;
      session.aiMemory.visits[idx]=Math.min(65535,session.aiMemory.visits[idx]+1);
    }
    if(didMove && playerId===1)$('#selectedCell').innerHTML=`${columnLabel(game.players[0].x)}${game.players[0].y+1} <span>⌄</span>`;
  }
  // Avoid a burst of stale movements if the tab/main thread stalls.
  if(steps===12)session.lastMoved[playerId]=time;
}

function computerDirection(game) {
  return chooseComputerDirection(game, session.difficulty, session.aiMemory);
}

function syncCanvas(view) {
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const width=Math.max(1,Math.round(view.surface.clientWidth));
  const height=Math.max(1,Math.round(view.surface.clientHeight));
  const deviceW=Math.round(width*dpr),deviceH=Math.round(height*dpr);
  if(view.canvas.width!==deviceW || view.canvas.height!==deviceH){view.canvas.width=deviceW;view.canvas.height=deviceH;}
  view.ctx.setTransform(dpr,0,0,dpr,0,0);
  return {width,height};
}

function drawSheet(view,dt,time) {
  const game=session.game,ctx=view.ctx,{width,height}=syncCanvas(view);
  const [cellW,cellH]=getCellDims();
  const bodyW=Math.max(1,width-ROW_HEADER-10),bodyH=Math.max(1,height-COL_HEADER);
  const maxX=Math.max(0,game.size*cellW-bodyW),maxY=Math.max(0,game.size*cellH-bodyH);
  if(time>view.manualUntil) {
    const p=game.players[view.playerId-1];
    const targetX=clamp(p.x*cellW+cellW/2-bodyW/2,0,maxX);
    const targetY=clamp(p.y*cellH+cellH/2-bodyH/2,0,maxY);
    const easing=view.initialized?Math.min(1,dt*8+.035):1;
    view.cameraX+=(targetX-view.cameraX)*easing;
    view.cameraY+=(targetY-view.cameraY)*easing;
    view.initialized=true;
  }
  view.cameraX=clamp(view.cameraX,0,maxX);view.cameraY=clamp(view.cameraY,0,maxY);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
  // Scrollable worksheet body.
  ctx.save();ctx.beginPath();ctx.rect(ROW_HEADER,COL_HEADER,bodyW,bodyH);ctx.clip();
  const firstCol=Math.max(0,Math.floor(view.cameraX/cellW));
  const lastCol=Math.min(game.size,Math.ceil((view.cameraX+bodyW)/cellW)+1);
  const firstRow=Math.max(0,Math.floor(view.cameraY/cellH));
  const lastRow=Math.min(game.size,Math.ceil((view.cameraY+bodyH)/cellH)+1);
  for(let row=firstRow;row<lastRow;row++){
    for(let col=firstCol;col<lastCol;col++){
      const x=Math.round(ROW_HEADER+col*cellW-view.cameraX),y=Math.round(COL_HEADER+row*cellH-view.cameraY);
      const owner=game.at(col,row);
      ctx.fillStyle=game.isBlocked(col,row)?'#484f56':CELL_COLORS[owner];ctx.fillRect(x,y,cellW,cellH);
      if(game.isBlocked(col,row)){
        ctx.strokeStyle='#717b83';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(x+4,y+3);ctx.lineTo(x+cellW-4,y+cellH-3);
        ctx.moveTo(x+cellW-4,y+3);ctx.lineTo(x+4,y+cellH-3);ctx.stroke();
      }
      ctx.strokeStyle='#e3e5e7';ctx.lineWidth=.65;ctx.strokeRect(x+.5,y+.5,cellW,cellH);
    }
  }
  for(const pickup of game.pickups){
    if(pickup.x<firstCol || pickup.x>=lastCol || pickup.y<firstRow || pickup.y>=lastRow)continue;
    const x=ROW_HEADER+pickup.x*cellW-view.cameraX,y=COL_HEADER+pickup.y*cellH-view.cameraY;
    ctx.save();ctx.shadowColor='#6bd887';ctx.shadowBlur=12;ctx.fillStyle='#5dca7b';ctx.fillRect(x+3,y+2,cellW-6,cellH-4);ctx.restore();
    ctx.strokeStyle='#18a755';ctx.lineWidth=1.7;ctx.strokeRect(x+3.5,y+2.5,cellW-7,cellH-5);
    ctx.fillStyle='#eaffef';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`bold ${Math.max(11,Math.min(18,cellH-6))}px Segoe UI`;
    ctx.fillText(POWERUPS[pickup.type].icon,x+cellW/2,y+cellH/2+1);
  }
  const playersOverlap = game.players.length > 1
    && game.players[0].x === game.players[1].x
    && game.players[0].y === game.players[1].y;
  for(const player of game.players){
    const x=ROW_HEADER+player.x*cellW-view.cameraX,y=COL_HEADER+player.y*cellH-view.cameraY;
    if(x+cellW<ROW_HEADER || x>width || y+cellH<COL_HEADER || y>height)continue;
    const mine=player.id===view.playerId;
    ctx.save();
    ctx.lineWidth=mine?3:2.2;ctx.strokeStyle=mine?'#107c41':PLAYER_COLORS[player.id];
    ctx.strokeRect(Math.round(x)+1.5,Math.round(y)+1.5,cellW-3,cellH-3);
    if(mine){ctx.fillStyle='#107c41';ctx.fillRect(x+cellW-4,y+cellH-4,6,6);}
    // When players meet, show two distinct markers instead of drawing
    // them on top of each other (especially important on a tiny phone).
    const offset=playersOverlap?(player.id===1?-Math.min(10,cellW*.17):Math.min(10,cellW*.17)):0;
    const markerX=x+cellW/2+offset,markerY=y+cellH/2;
    const circleRadius=Math.min(playersOverlap?6:8,cellH*.36);
    ctx.beginPath();ctx.fillStyle=PLAYER_COLORS[player.id];ctx.arc(markerX,markerY,circleRadius,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='bold 8px Segoe UI';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(player.id===1?'1':'2',markerX,markerY+.5);
    ctx.restore();
  }
  ctx.restore();
  // Excel-style fixed row/column headers, matching the active cell.
  ctx.fillStyle='#f0f2f3';ctx.fillRect(0,0,width,COL_HEADER);ctx.fillRect(0,0,ROW_HEADER,height);
  ctx.strokeStyle='#ccd4d6';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(ROW_HEADER+.5,0);ctx.lineTo(ROW_HEADER+.5,height);ctx.moveTo(0,COL_HEADER+.5);ctx.lineTo(width,COL_HEADER+.5);ctx.stroke();
  ctx.save();ctx.beginPath();ctx.rect(ROW_HEADER,0,bodyW,COL_HEADER);ctx.clip();
  const my=game.players[view.playerId-1];
  for(let col=firstCol;col<lastCol;col++){
    const x=ROW_HEADER+col*cellW-view.cameraX;
    if(col===my.x){ctx.fillStyle='#e2efe6';ctx.fillRect(x,0,cellW,COL_HEADER);ctx.fillStyle='#107c41';ctx.fillRect(x,COL_HEADER-2,cellW,2);}
    ctx.strokeStyle='#d8dddf';ctx.strokeRect(Math.round(x)+.5,0,cellW,COL_HEADER);
    ctx.fillStyle=col===my.x?'#0d663b':'#536068';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='12px Segoe UI';ctx.fillText(columnLabel(col),x+cellW/2,COL_HEADER/2+1);
  }
  ctx.restore();ctx.save();ctx.beginPath();ctx.rect(0,COL_HEADER,ROW_HEADER,bodyH);ctx.clip();
  for(let row=firstRow;row<lastRow;row++){
    const y=COL_HEADER+row*cellH-view.cameraY;
    if(row===my.y){ctx.fillStyle='#e2efe6';ctx.fillRect(0,y,ROW_HEADER,cellH);ctx.fillStyle='#107c41';ctx.fillRect(ROW_HEADER-2,y,2,cellH);}
    ctx.strokeStyle='#d8dddf';ctx.strokeRect(0,Math.round(y)+.5,ROW_HEADER,cellH);
    ctx.fillStyle=row===my.y?'#0d663b':'#536068';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='12px Segoe UI';ctx.fillText(String(row+1),ROW_HEADER/2,y+cellH/2);
  }
  ctx.restore();ctx.fillStyle='#e5e9eb';ctx.fillRect(0,0,ROW_HEADER,COL_HEADER);
  ctx.fillStyle='#c3cbcd';ctx.beginPath();ctx.moveTo(ROW_HEADER-4,4);ctx.lineTo(ROW_HEADER-4,COL_HEADER-4);ctx.lineTo(4,COL_HEADER-4);ctx.fill();
  const scrollFraction=maxY===0?0:view.cameraY/maxY;
  view.marker.style.top=`${Math.round(scrollFraction*77)}%`;
}

function drawMinimap() {
  if(!session)return;
  const game=session.game,ctx=minimapCtx,size=190,n=game.size,step=size/n;
  ctx.clearRect(0,0,size,size);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const owner=game.at(x,y);
    ctx.fillStyle=game.isBlocked(x,y)?'#484f56':owner===0?'#f2f4f3':PLAYER_COLORS[owner];
    ctx.fillRect(x*step,y*step,Math.ceil(step+.05),Math.ceil(step+.05));
  }
  for(const pickup of game.pickups){
    ctx.fillStyle='#29c967';ctx.fillRect(pickup.x*step,pickup.y*step,Math.max(3,step),Math.max(3,step));
  }
  for(const view of session.views){
    const [cellW,cellH]=getCellDims();
    const visibleWidth=Math.max(0,view.surface.clientWidth-ROW_HEADER-10)/cellW;
    const visibleHeight=Math.max(0,view.surface.clientHeight-COL_HEADER)/cellH;
    ctx.strokeStyle=view.playerId===1?'#1256bc':'#c25a11';ctx.lineWidth=1.7;
    ctx.strokeRect(view.cameraX/cellW*step+.8,view.cameraY/cellH*step+.8,Math.min(n*step-2,visibleWidth*step),Math.min(n*step-2,visibleHeight*step));
  }
  game.players.forEach(p=>{
    ctx.beginPath();ctx.fillStyle='#fff';ctx.arc((p.x+.5)*step,(p.y+.5)*step,Math.max(3,step*.65),0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.fillStyle=PLAYER_COLORS[p.id];ctx.arc((p.x+.5)*step,(p.y+.5)*step,Math.max(2,step*.42),0,Math.PI*2);ctx.fill();
  });
}

function updateHUD() {
  if(!session)return;
  const game=session.game,[neutral,j1,j2]=game.percentages;
  $('#scoreOne').textContent=`${j1.toFixed(1)}%`;
  $('#scoreTwo').textContent=`${j2.toFixed(1)}%`;
  $('#fillOne').style.width=`${j1}%`;
  $('#fillNeutral').style.width=`${neutral}%`;
  $('#fillTwo').style.width=`${j2}%`;
  $('#gameTimer').textContent=formatTime(game.remaining);
  $('.timer-display').classList.toggle('urgent',game.remaining<=15);
  $('.timer-display').classList.toggle('sudden-death',game.suddenDeath);
  $('#bottomStatus').textContent=game.suddenDeath?'⚡ MUERTE SÚBITA · ¡Power-ups cada 5 segundos!':game.terrain==='everest'?'▥ Everest: el terreno se desploma':'Listo · Conquista las celdas';
  $('#spawnCountdown').textContent=game.running?`${Math.max(0,Math.ceil(game.nextSpawn-game.elapsed))} s`:'—';
  for(const view of session.views){
    const current=Object.keys(POWERUPS).filter(k=>game.hasEffect(view.playerId,k));
    view.abilities.replaceChildren();
    if(!current.length){const em=document.createElement('span');em.className='no-powerups';em.textContent='✦ Sin habilidades activas';view.abilities.appendChild(em);}
    for(const type of current){
      const pill=document.createElement('span');pill.className='active-powerup';
      const short=type==='concatenar'?'CONCAT.':type==='promedio'?'PROM.':type==='buscarv'?'BUSCARV':'SUMA';
      pill.innerHTML=`${POWERUPS[type].icon} ${short} <strong>${game.effectRemaining(view.playerId,type).toFixed(1)}s</strong>`;
      view.abilities.append(pill);
    }
  }
}

function handleEvents() {
  if(!session)return;
  for(const event of session.game.drainEvents()) {
    if(event.kind==='spawn')showToast('✦ Power-ups',`${POWERUPS[event.type].name} en espejo`);
    if(event.kind==='suddenDeath')showToast('⚡ Muerte súbita','¡Doble frecuencia de poderes!');
    if(event.kind==='collapse')showToast('▥ Everest','Dos celdas han caído');
    if(event.kind==='pickup')showToast(event.playerId===1?'J1 obtuvo':'J2 obtuvo',POWERUPS[event.type].name,event.playerId===1?'blue':'orange');
    if(event.kind==='end')displayResults();
  }
}
function displayResults() {
  if(!session)return;
  music.fadeOut(2700);
  const g=session.game;
  const opponent=session.match==='ai'?'COM':'J2';
  $('#resultsHeading').textContent=g.winner===0?'¡Empate territorial!':g.winner===1?'¡Jugador 1 gana!':session.match==='ai'?'¡Gana la computadora!':'¡Jugador 2 gana!';
  $('#resultsSubtitle').textContent=g.winner===0?'Ambos jugadores conquistaron exactamente el mismo número de casillas.':'La partida terminó. Aquí está la conquista definitiva.';
  $('#resultScore1').textContent=String(g.counts[1]);
  $('#resultScore2').textContent=String(g.counts[2]);
  $('#resultOpponent').textContent=`${opponent} · celdas`;
  toggle(results,true);
  keys.clear();
}

function loop(time) {
  requestAnimationFrame(loop);
  const delta=Math.max(0,Math.min(1,(time-lastFrame)/1000));lastFrame=time;
  if(!session)return;
  const game=session.game;
  if(game.running && !game.paused && !layoutEditing){
    if(countdownRemainingMs>0){
      countdownRemainingMs=Math.max(0,countdownRemainingMs-delta*1000);
      if(countdownRemainingMs>0)$('#countdownNumber').textContent=String(Math.ceil(countdownRemainingMs/1000));
      else {
        toggle($('#countdownOverlay'),false);
        session.lastMoved={1:-Infinity,2:-Infinity};
        touchVectors={1:null,2:null};keys.clear();keyOrder={1:[],2:[]};
        if(pendingStartMusic){pendingStartMusic=false;music.start();}
      }
    } else {
    game.advance(delta);
    if(game.running){
      attemptMove(1,time);
      if(session.match==='ai'||keyOrder[2].length||touchVectors[2])attemptMove(2,time);
    }
    handleEvents();
    }
  }
  if(!game.paused){
    for(const view of session.views)drawSheet(view,delta,time);
    if(time-lastUiDraw>90){drawMinimap();updateHUD();lastUiDraw=time;}
  }
}
requestAnimationFrame(loop);