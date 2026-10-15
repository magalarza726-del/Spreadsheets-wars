import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOUCH_SCALE_MIN, TOUCH_SCALE_MAX, defaultTouchLayout, normalizeTouchLayout,
  touchLayoutKey, loadTouchLayout, saveTouchLayout, resetTouchLayout,
  touchPosition, attachTouchControls
} from '../touch-controls.js';

function storage() {
  const map=new Map();
  return {
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>map.set(key,value),
    removeItem:key=>map.delete(key)
  };
}

test('tamaño regulable de 70 a 180%, coordenadas normalizadas seguras',()=>{
  assert.equal(TOUCH_SCALE_MIN,.7);
  assert.equal(TOUCH_SCALE_MAX,1.8);
  assert.deepEqual(normalizeTouchLayout({x:-5,y:4,scale:9}),{x:0,y:1,scale:1.8});
  assert.deepEqual(normalizeTouchLayout({x:NaN,y:null,scale:Infinity}),defaultTouchLayout(1));
  assert.deepEqual(touchPosition({x:.5,y:1,scale:1.5},200,120,60,60),{left:55,top:30,freeX:110,freeY:30});
});

test('posiciones individuales J1/J2 y joystick/flechas persisten y se restauran por separado',()=>{
  const data=storage();
  assert.notEqual(touchLayoutKey(1,'joystick'),touchLayoutKey(2,'joystick'));
  assert.notEqual(touchLayoutKey(1,'joystick'),touchLayoutKey(1,'arrows'));
  saveTouchLayout(1,'joystick',{x:.8,y:.25,scale:1.6},data);
  saveTouchLayout(2,'arrows',{x:.12,y:.72,scale:.75},data);
  assert.equal(loadTouchLayout(1,'joystick',data).scale,1.6);
  assert.equal(loadTouchLayout(2,'arrows',data).y,.72);
  assert.deepEqual(loadTouchLayout(1,'arrows',data),defaultTouchLayout(1));
  assert.deepEqual(resetTouchLayout(1,'joystick',data),defaultTouchLayout(1));
  assert.equal(loadTouchLayout(2,'arrows',data).scale,.75);
});

test('almacenamiento bloqueado o inválido no impide crear controles',()=>{
  const bad={getItem:()=>{throw Error('denied')},setItem:()=>{throw Error('denied')},removeItem:()=>{throw Error('denied')}};
  assert.deepEqual(loadTouchLayout(1,'arrows',bad),defaultTouchLayout(1));
  assert.equal(saveTouchLayout(1,'arrows',{x:.4,y:.4,scale:1.25},bad).scale,1.25);
  assert.deepEqual(resetTouchLayout(1,'arrows',bad),defaultTouchLayout(1));
  const malformed=storage();malformed.setItem(touchLayoutKey(1,'joystick'),'{');
  assert.deepEqual(loadTouchLayout(1,'joystick',malformed),defaultTouchLayout(1));
});

test('arrastrar el controlador en modo edición cambia su posición y el reset la restaura',()=>{
  const previousDocument=globalThis.document,previousStorage=globalThis.localStorage,previousObserver=globalThis.ResizeObserver;
  class Node {
    constructor(){
      this.style={};this.listeners={};this.children=[];this.offsetWidth=80;this.offsetHeight=80;
      this.classList={toggle:()=>{}};this.captured=new Set();
    }
    setAttribute(){}
    append(node){this.children.push(node);}
    querySelector(){return null;}
    addEventListener(type,listener){(this.listeners[type]??=[]).push(listener);}
    emit(type,event){for(const fn of this.listeners[type]??[])fn(event);}
    setPointerCapture(id){this.captured.add(id);}
    hasPointerCapture(id){return this.captured.has(id);}
  }
  const host=new Node();host.clientWidth=360;host.clientHeight=480;
  const pane={querySelector:()=>host};
  globalThis.document={createElement:()=>new Node()};
  globalThis.localStorage=storage();
  globalThis.ResizeObserver=class{observe(){} disconnect(){}};
  try{
    for(const mode of ['joystick','arrows']){
      const controller=attachTouchControls(pane,1,mode,()=>{});
      assert.ok(controller.style.top.endsWith('px'));
      assert.ok(controller.style.left.endsWith('px'));
      controller.setEditing(true);
      controller.setScale(1.5);
      assert.equal(controller.getLayout().scale,1.5);
      const make=(x,y)=>({pointerId:7,clientX:x,clientY:y,preventDefault(){},stopImmediatePropagation(){}});
      const first=controller.getLayout();
      controller.emit('pointerdown',make(50,50));
      controller.emit('pointermove',make(125,10));
      controller.emit('pointerup',make(125,10));
      const next=controller.getLayout();
      assert.ok(next.x>first.x || next.y<first.y);
      const initial=controller.resetPlacement();
      assert.deepEqual(initial,defaultTouchLayout(1));
      controller.setEditing(false);
      controller.destroy();
    }
  }finally{
    globalThis.document=previousDocument;
    globalThis.localStorage=previousStorage;
    globalThis.ResizeObserver=previousObserver;
  }
});
