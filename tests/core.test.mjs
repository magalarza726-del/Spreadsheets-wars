import test from 'node:test';
import assert from 'node:assert/strict';
import {SpreadsheetBattle, MAPS, DURATIONS, DIFFICULTIES, mirrorCell, columnLabel, chooseComputerDirection, selectRandomTerrain} from '../core.js';

const create = (settings = {}) => new SpreadsheetBattle({size:30,seconds:90,random:()=>0,...settings});

test('modos, letras y simetría central',()=>{
  assert.deepEqual(Object.values(MAPS).map(m=>m.size), [30,50,70]);
  assert.deepEqual(Object.values(DURATIONS).map(m=>m.seconds), [90]);
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

test('INSERTAR afecta a 7×7 y se recorta en bordes',()=>{
  const b=create();
  b.players[0].x=10;b.players[0].y=10;
  b.activate(1,'insertar');
  assert.equal(b.counts[1],50);
  const b2=create();b2.players[0].x=0;b2.players[0].y=0;
  b2.activate(1,'insertar');assert.equal(b2.counts[1],16);
});

test('SUMA 3 celdas y PRODUCTO 5 celdas',()=>{
  const b=create();b.activate(1,'suma');b.move(1,1,0);
  assert.deepEqual([b.at(2,0),b.at(2,1),b.at(2,2)],[1,1,1]);
  b.activate(1,'producto');b.move(1,1,0);
  for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]])assert.equal(b.at(3+dx,1+dy),1);
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

test('CONCATENAR invierte el color durante un segundo',()=>{
  const b=create();b.activate(1,'concatenar');
  b.move(2,-1,0);assert.equal(b.at(27,28),1);
  b.advance(1.1);b.move(2,-1,0);assert.equal(b.at(26,28),2);
});

test('BUSCARV teletransporta cerca del rival y devuelve luego de tres segundos',()=>{
  const b=create();const first={x:b.players[0].x,y:b.players[0].y};
  b.activate(1,'buscarv');
  assert.ok(Math.abs(b.players[0].x-b.players[1].x)+Math.abs(b.players[0].y-b.players[1].y)<=1);
  b.advance(3.1);
  assert.deepEqual({x:b.players[0].x,y:b.players[0].y},first);
  assert.equal(b.players[0].returnPosition,null);
});

test('no cambia puntuación en repintado propio, sí al cambiar dueño, y termina según tanteador',()=>{
  const b=create();
  b.paint(4,4,1);const n=b.counts[1];b.paint(4,4,1);assert.equal(b.counts[1],n);
  b.paint(4,4,2);assert.equal(b.counts[1],n-1);
  b.paint(5,5,1);b.paint(6,6,1);
  b.advance(90);assert.equal(b.running,false);assert.equal(b.winner,1);
  assert.equal(b.move(1,1,0),false);
});

test('partida en pausa no hace avanzar el tiempo',()=>{
  const b=create();b.paused=true;b.advance(100);assert.equal(b.elapsed,0);
  assert.equal(b.move(1,1,0),false);
});


test('tres tamaños y duración fija de 90 segundos',()=>{
  for(const size of [30,50,70]){const b=create({size});assert.equal(b.owner.length,size*size);assert.equal(b.seconds,90);}
  assert.throws(()=>create({seconds:180}),/90 segundos/);
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

test('COM experto conserva su estrategia de prioridad a los power-ups',()=>{
  const b=create({size:30});
  b.players[1].x=10;b.players[1].y=10;
  b.players[1].dx=1;b.players[1].dy=0;
  b.pickups.push({id:1,x:11,y:10,type:'insertar'});
  assert.deepEqual(chooseComputerDirection(b,'experto',{},()=>0),[1,0]);
  assert.throws(()=>chooseComputerDirection(b,'imposible'),/Dificultad desconocida/);
});

test('COM utiliza 10, 15, 20 y 25 celdas/s según dificultad; sin alterar J1 ni PvP',()=>{
  const speeds = {principiante:10, normal:15, dificil:20, experto:25};
  for (const [difficulty, speed] of Object.entries(speeds)) {
    assert.equal(DIFFICULTIES[difficulty].cellsPerSecond, speed);
    const b = create({againstComputer:true, difficulty});
    assert.equal(b.movementInterval(1),40);
    assert.ok(Math.abs(b.movementInterval(2)-(1000/speed))<1e-9);
    b.activate(2,'promedio');
    assert.ok(Math.abs(b.movementInterval(2)-(500/speed))<1e-9);
    b.advance(6.1);
    assert.ok(Math.abs(b.movementInterval(2)-(1000/speed))<1e-9);
  }
  const pvp = create({difficulty:'principiante'});
  assert.equal(pvp.movementInterval(1),40);
  assert.equal(pvp.movementInterval(2),40);
  assert.throws(()=>create({againstComputer:true,difficulty:'imposible'}),/Dificultad desconocida/);
});

test('PRODUCTO: cinco celdas y mitad de velocidad, PROMEDIO compensa',()=>{
 const b=create();
 b.activate(1,'producto');assert.equal(b.movementInterval(1),80);
 b.activate(1,'promedio');assert.equal(b.movementInterval(1),40);
 b.advance(4.1);assert.equal(b.movementInterval(1),20);
});
test('repertorio de poderes renombrados, CONCATENAR un segundo y mapa aleatorio',async()=>{
 const {POWERUPS}=await import('../core.js');
 assert.equal(POWERUPS.concatenar.duration,1);
 assert.ok(POWERUPS.insertar && POWERUPS.buscarv);
 assert.equal(Object.keys(POWERUPS).length,6);
 assert.equal(selectRandomTerrain(()=>0),'normal');
 assert.equal(selectRandomTerrain(()=>.45),'everest');
 assert.equal(selectRandomTerrain(()=>.99),'crater');
});
