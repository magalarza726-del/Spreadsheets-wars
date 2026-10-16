import test from 'node:test';
import assert from 'node:assert/strict';
import {SpreadsheetBattle, TERRAINS, DURATIONS, mirrorCell, chooseComputerDirection} from '../core.js';

const make=(opts={})=>new SpreadsheetBattle({size:30,seconds:90,random:()=>0.45,...opts});

test('Bala de 90s y tres escenarios',()=>{
  assert.deepEqual(Object.values(DURATIONS).map(v=>v.seconds),[90]);
  assert.deepEqual(Object.keys(TERRAINS),['normal','everest','crater']);
});

test('Everest derrumba parejas simétricas cada cuatro segundos',()=>{
  const b=make({terrain:'everest'});
  b.advance(3.99);assert.equal(b.playableCells,900);
  b.advance(.01);assert.equal(b.playableCells,898);
  const fallen=[];for(let y=0;y<30;y++)for(let x=0;x<30;x++)if(b.isBlocked(x,y))fallen.push({x,y});
  assert.deepEqual(fallen[1],mirrorCell(fallen[0].x,fallen[0].y,30));
  b.advance(4);assert.equal(b.playableCells,896);
});

test('Cráter bloquea el diez por ciento en todos los tamaños',()=>{
  for(const size of [30,50,70]){
    const b=make({size,terrain:'crater'});
    assert.equal(b.playableCells,size*size*.9);
    assert.equal(b.canEnter(1,1),true);
    assert.equal(b.canEnter(size-2,size-2),true);
    assert.equal(b.isBlocked(Math.floor(size/2),Math.floor(size/2)),true);
  }
});

test('No se atraviesan ni pintan las celdas caídas con bomba o fórmulas',()=>{
  const b=make();b.players[0].x=14;b.players[0].y=14;
  assert.equal(b.collapse(15,14),true);
  assert.equal(b.move(1,1,0),false);
  assert.equal(b.paint(15,14,1),false);
  b.activate(1,'insertar');b.activate(1,'suma');b.activate(1,'producto');
  b.paintMovement(1);
  assert.equal(b.at(15,14),0);
  assert.equal(b.playableCells,899);
  assert.ok(Math.abs(b.percentages.reduce((a,v)=>a+v,0)-100)<1e-8);
});

test('COM y power-ups respetan celdas bloqueadas',()=>{
  const b=make({terrain:'crater',againstComputer:true});
  for(let i=0;i<8;i++)b.spawnMirroredPair();
  for(const p of b.pickups)assert.equal(b.isBlocked(p.x,p.y),false);
  const d=chooseComputerDirection(b,'experto',{},()=>0.34);
  assert.equal(b.canEnter(b.players[1].x+d[0],b.players[1].y+d[1]),true);
});

test('Bala entra en muerte súbita a los 60s y duplica la frecuencia',()=>{
  const b=make();
  b.advance(50);assert.equal(b.pickups.length,10);
  b.advance(10);assert.equal(b.suddenDeath,true);
  assert.equal(b.nextSpawn,65);
  b.advance(5);assert.equal(b.pickups.length,14);
  b.advance(25);assert.equal(b.running,false);
});


test('Rápida y duración diferente de 1:30 están deshabilitados',()=>{
 assert.throws(()=>make({mode:'rapida',seconds:180}),/90 segundos/);
 assert.throws(()=>make({seconds:120}),/90 segundos/);
});
