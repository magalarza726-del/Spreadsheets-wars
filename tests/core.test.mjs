import test from 'node:test';
import assert from 'node:assert/strict';
import {SpreadsheetBattle, MAPS, DURATIONS, DIFFICULTIES, mirrorCell, columnLabel, chooseComputerDirection} from '../core.js';

const create = (settings = {}) => new SpreadsheetBattle({size:30,seconds:120,random:()=>0,...settings});

test('modos, letras y simetría central',()=>{
  assert.deepEqual(Object.values(MAPS).map(m=>m.size), [30,50,70]);
  assert.deepEqual(Object.values(DURATIONS).map(m=>m.seconds), [60,120,180]);
  assert.equal(Object.keys(DIFFICULTIES).length,4);
  assert.equal(columnLabel(0),'A'); assert.equal(columnLabel(25),'Z'); assert.equal(columnLabel(26),'AA');
  assert.deepEqual(mirrorCell(0,0,30),{x:29,y:29});
  assert.deepEqual(mirrorCell(5,11,60),{x:54,y:48});
});

test('el movimiento pinta y arrebata territorio; no sale del tablero',()=>{
  const b=create({size:20});
  assert.equal(b.counts[1],1);
  assert.equal(b.move(1,1,0),true);
  assert.equal(b.at(2,1),1);
  b.players[1].x=3;b.players[1].y=1;
  b.move(2,-1,0);
  assert.equal(b.at(2,1),2);
  assert.equal(b.counts[1],1);
  b.players[0].x=0;
  assert.equal(b.move(1,-1,0),false);
});

test('parejas de power-ups cada 10 s, misma habilidad y reflejadas',()=>{
  const b=create();
  b.advance(9.9);assert.equal(b.pickups.length,0);
  b.advance(.1);assert.equal(b.pickups.length,2);
  const [a,c]=b.pickups;
  assert.equal(a.type,c.type);
  assert.deepEqual({x:c.x,y:c.y},mirrorCell(a.x,a.y,b.size));
  b.advance(20);
  assert.equal(b.pickups.length,6);
});

test('bomba afecta a 7×7 y se recorta en bordes',()=>{
  const b=create();
  b.players[0].x=10;b.players[0].y=10;
  b.activate(1,'bomba');
  assert.equal(b.counts[1],50);
  const b2=create();b2.players[0].x=0;b2.players[0].y=0;
  b2.activate(1,'bomba');assert.equal(b2.counts[1],16);
});

test('SUMA 3 celdas y PRODUCTO 9 celdas',()=>{
  const b=create();b.activate(1,'suma');b.move(1,1,0);
  assert.deepEqual([b.at(2,0),b.at(2,1),b.at(2,2)],[1,1,1]);
  b.activate(1,'producto');b.move(1,1,0);
  for(let y=0;y<=2;y++)for(let x=2;x<=4;x++)assert.equal(b.at(x,y),1);
  b.advance(4.1);assert.equal(b.hasEffect(1,'producto'),false);
  assert.equal(b.hasEffect(1,'suma'),true);
});

test('velocidad base 25 celdas/s para ambos jugadores; PROMEDIO 50 celdas/s durante seis segundos',()=>{
  const b=create();
  assert.equal(b.movementInterval(1),40);
  assert.equal(b.movementInterval(2),40);
  b.activate(1,'promedio');
  assert.equal(b.movementInterval(1),20);
  assert.equal(b.movementInterval(2),40);
  b.advance(6.1);
  assert.equal(b.movementInterval(1),40);
});

test('CONCATENAR invierte el propietario de la pintura enemiga por dos segundos',()=>{
  const b=create();b.activate(1,'concatenar');
  b.move(2,-1,0);assert.equal(b.at(27,28),1);
  b.advance(2.1);b.move(2,-1,0);assert.equal(b.at(26,28),2);
});

test('ÍNDICE teletransporta cerca del rival y devuelve luego de tres segundos',()=>{
  const b=create();const first={x:b.players[0].x,y:b.players[0].y};
  b.activate(1,'indice');
  assert.ok(Math.abs(b.players[0].x-b.players[1].x)+Math.abs(b.players[0].y-b.players[1].y)<=1);
  b.advance(3.1);
  assert.deepEqual({x:b.players[0].x,y:b.players[0].y},first);
  assert.equal(b.players[0].returnPosition,null);
});

test('no cambia puntuación en repintado propio, sí al cambiar dueño, y termina según tanteador',()=>{
  const b=create({seconds:1});
  b.paint(4,4,1);const n=b.counts[1];b.paint(4,4,1);assert.equal(b.counts[1],n);
  b.paint(4,4,2);assert.equal(b.counts[1],n-1);
  b.paint(5,5,1);b.paint(6,6,1);
  b.advance(1);assert.equal(b.running,false);assert.equal(b.winner,1);
  assert.equal(b.move(1,1,0),false);
});

test('partida en pausa no hace avanzar el tiempo',()=>{
  const b=create();b.paused=true;b.advance(100);assert.equal(b.elapsed,0);
  assert.equal(b.move(1,1,0),false);
});


test('tres tamaños independientes de la duración, también 70 x 70',()=>{
  for (const size of Object.values(MAPS).map(m=>m.size)) {
    for (const seconds of [30,60,120,180,270,900]) {
      const b=create({size,seconds});
      assert.equal(b.owner.length,size*size);
      assert.equal(b.seconds,seconds);
      b.advance(10);
      assert.equal(b.pickups.length,2);
      assert.deepEqual(mirrorCell(b.pickups[0].x,b.pickups[0].y,size),{x:b.pickups[1].x,y:b.pickups[1].y});
    }
  }
});

test('cuatro dificultades de COM generan movimientos cardinales legales',()=>{
  const game=create({size:30});
  for(const difficulty of Object.keys(DIFFICULTIES)){
    const memory={};
    for(let i=0;i<15;i++){
      const d=chooseComputerDirection(game,difficulty,memory,()=>0.34);
      assert.equal(Math.abs(d[0])+Math.abs(d[1]),1);
      const cpu=game.players[1];
      assert.equal(game.inBounds(cpu.x+d[0],cpu.y+d[1]),true);
      game.move(2,...d);
      const index=cpu.y*game.size+cpu.x;
      memory.visits[index]++;
    }
  }
});

test('COM experto prioriza el power-up cercano y la dificultad no cambia la velocidad base',()=>{
  const b=create({size:30});
  b.players[1].x=10;b.players[1].y=10;
  b.players[1].dx=1;b.players[1].dy=0;
  b.pickups.push({id:1,x:11,y:10,type:'bomba'});
  assert.deepEqual(chooseComputerDirection(b,'experto',{},()=>0),[1,0]);
  assert.equal(b.movementInterval(2),40);
  assert.throws(()=>chooseComputerDirection(b,'imposible'),/Dificultad desconocida/);
});
