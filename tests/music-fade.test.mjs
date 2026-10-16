import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleMusic} from '../music.js';
class FakeAudio {
 constructor(){this.volume=1;this.muted=false;this.paused=true;this.handlers={};}
 addEventListener(name,fn){this.handlers[name]=fn;}
 pause(){this.paused=true;}
 play(){this.paused=false;return Promise.resolve();}
 removeAttribute(){}
 load(){}
}
test('la victoria difumina la música y recupera el volumen original',async()=>{
 const audio=new FakeAudio();
 const oldRaf=globalThis.requestAnimationFrame,oldCancel=globalThis.cancelAnimationFrame;
 let frame=null;
 globalThis.requestAnimationFrame=(fn)=>{frame=fn;return 1;};
 globalThis.cancelAnimationFrame=()=>{};
 try {
  const music=new BattleMusic({audio,tracks:[{id:'a',src:'a.mp3',title:'A'}]});
  music.setVolume(.6);music.start();await Promise.resolve();
  music.fadeOut(1000);assert.equal(music.fading,true);
  frame(performance.now()+1200);
  assert.equal(music.active,false);assert.equal(audio.paused,true);assert.equal(audio.volume,.6);
  music.start();assert.equal(audio.volume,.6);
 } finally {
  globalThis.requestAnimationFrame=oldRaf;globalThis.cancelAnimationFrame=oldCancel;
 }
});
