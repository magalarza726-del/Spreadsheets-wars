import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleMusic, TRACKS, shuffledPlaylist} from '../music.js';
class FakeAudio {
  constructor(){this.handlers={};this.volume=1;this.muted=false;this.paused=true;this.src='';this.events=[];}
  addEventListener(name,fn){this.handlers[name]=fn;}
  pause(){this.paused=true;this.events.push('pause');}
  play(){this.paused=false;this.events.push('play');return Promise.resolve();}
  load(){}
  removeAttribute(name){if(name==='src')this.src='';}
  end(){this.handlers.ended?.();}
  error(){this.handlers.error?.();}
}
test('seis archivos diferentes registrados y rutas locales',()=>{
  assert.equal(TRACKS.length,6);
  assert.equal(new Set(TRACKS.map(x=>x.src)).size,6);
  for(const track of TRACKS) assert.match(track.src, /^\.\/music\/[a-z0-9-]+\.mp3$/);
});
test('cada ciclo mezcla toda la lista y evita repetir canción inmediatamente',()=>{
  const tracks=[{id:'a'},{id:'b'},{id:'c'}];
  const first=shuffledPlaylist(tracks,null,()=>0);
  assert.deepEqual(new Set(first.map(x=>x.id)),new Set(['a','b','c']));
  const lastPlayed=first[0].id;
  const second=shuffledPlaylist(tracks,lastPlayed,()=>0);
  assert.notEqual(second.at(-1).id,lastPlayed);
});
test('inicia al abrir, cambia al finalizar, pausa/reanuda y se detiene al salir',async()=>{
  const audio=new FakeAudio(), states=[];
  const music=new BattleMusic({tracks:[{id:'1',title:'Uno',src:'1.mp3'},{id:'2',title:'Dos',src:'2.mp3'}],random:()=>0,audio,onChange:x=>states.push(x.status)});
  music.start();const first=music.current.id;
  await Promise.resolve();audio.end();
  assert.notEqual(first,music.current.id);
  music.pause();assert.equal(audio.paused,true);
  music.resume();await Promise.resolve();assert.equal(audio.paused,false);
  music.setVolume(.3);assert.equal(audio.volume,.3);
  music.setMuted(true);assert.equal(audio.muted,true);
  music.stop();assert.equal(music.active,false);assert.equal(audio.paused,true);assert.equal(audio.src,'');
  assert.ok(states.includes('playing'));
});
test('si falta audio pasa al siguiente y conserva el juego vivo al agotar la lista',()=>{
  const audio=new FakeAudio();let last;
  const music=new BattleMusic({tracks:[{id:'a',src:'a.mp3'},{id:'b',src:'b.mp3'}],audio,onChange:x=>last=x.status});
  music.start();audio.error();assert.equal(music.failed.size,1);
  audio.error();assert.equal(last,'missing');assert.equal(music.current,null);
});
