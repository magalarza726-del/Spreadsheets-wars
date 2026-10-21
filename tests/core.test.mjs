import test from 'node:test';
import assert from 'node:assert/strict';
import {SpreadsheetBattle, MAPS, DURATIONS, DIFFICULTIES, POWERUPS, mirrorCell, columnLabel, chooseComputerDirection, selectRandomTerrain} from '../core.js';

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

test('SUMA pinta tres celdas perpendiculares al recorrido',()=>{
  const b=create();b.activate(1,'suma');b.move(1,1,0);
  assert.deepEqual([b.at(2,0),b.at(2,1),b.at(2,2)],[1,1,1]);
});

test('velocidad base 25 celdas/s para ambos jugadores; PROMEDIO 50 celdas/s durante cinco segundos',()=>{
  const b=create();
  assert.equal(b.movementInterval(1),40);
  assert.equal(b.movementInterval(2),40);
  b.activate(1,'promedio');
  assert.equal(b.movementInterval(1),20);
  assert.equal(b.movementInterval(2),40);
  b.advance(5.1);
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
    b.advance(5.1);
    assert.ok(Math.abs(b.movementInterval(2)-(1000/speed))<1e-9);
  }
  const pvp = create({difficulty:'principiante'});
  assert.equal(pvp.movementInterval(1),40);
  assert.equal(pvp.movementInterval(2),40);
  assert.throws(()=>create({againstComputer:true,difficulty:'imposible'}),/Dificultad desconocida/);
});

test('sin PRODUCTO, PROMEDIO duplica la velocidad y termina a los 5 segundos',()=>{
 const b=create();assert.equal(b.movementInterval(1),40);
 b.activate(1,'promedio');assert.equal(b.movementInterval(1),20);
 b.advance(5.1);assert.equal(b.movementInterval(1),40);
});
test('repertorio de poderes renombrados, CONCATENAR un segundo y mapa aleatorio',async()=>{
 const {POWERUPS}=await import('../core.js');
 assert.equal(POWERUPS.concatenar.duration,1);
 assert.ok(POWERUPS.insertar && POWERUPS.buscarv);
 assert.equal(Object.keys(POWERUPS).length,5);
  assert.equal(POWERUPS.producto,undefined);
  assert.equal(POWERUPS.si_contar,undefined);
  assert.throws(()=>create().activate(1,'producto'),/Power-up desconocido/);
  assert.throws(()=>create().activate(1,'si_contar'),/Power-up desconocido/);
 assert.equal(selectRandomTerrain(()=>0),'normal');
 assert.equal(selectRandomTerrain(()=>.45),'everest');
 assert.equal(selectRandomTerrain(()=>.99),'crater');
});

test('aparecen solo los cinco power-ups permitidos',()=>{
 const b=create({random:()=>0.99999}); const [a,c]=b.spawnMirroredPair();
 assert.ok(POWERUPS[a.type]);assert.equal(a.type,c.type);
 assert.ok(!('producto' in POWERUPS)&&!('si_contar' in POWERUPS));
});
test('sin dash: se permite girar y se mantiene velocidad base',()=>{
 const b=create();assert.equal(b.movementInterval(1),40);
 assert.equal(b.move(1,0,1),true);
 assert.equal(b.players[0].x,1);assert.equal(b.players[0].y,2);
});

test('J1 y COM pueden compartir exactamente la misma celda sin cerrar partida ni corromper la conquista',()=>{
  const game=create({againstComputer:true});
  game.players[0].x=10; game.players[0].y=10;
  game.players[1].x=12; game.players[1].y=10;
  assert.equal(game.move(1,1,0),true);
  assert.equal(game.move(2,-1,0),true);
  assert.deepEqual([game.players[0].x,game.players[0].y],[11,10]);
  assert.deepEqual([game.players[1].x,game.players[1].y],[11,10]);
  assert.equal(game.at(11,10),2); // latest paint wins
  assert.equal(game.counts.reduce((a,b)=>a+b,0),game.playableCells);
  assert.equal(game.running,true);
  assert.equal(game.drainEvents().filter(e=>e.kind==='encounter').length,1);
  assert.equal(game.move(1,-1,0),true);
  assert.equal(game.move(2,-1,0),true);
  assert.equal(game.at(10,10),2);
  assert.equal(game.counts.reduce((a,b)=>a+b,0),game.playableCells);
});

test('cruce frontal y repetido en modos Normal, Everest y Cráter no produce excepciones',()=>{
  for(const terrain of ['normal','everest','crater']) {
    const game=create({terrain,againstComputer:true,random:()=>0.31});
    // Move players to two neighboring, nonblocked cells in a safe corner.
    game.players[0].x=5;game.players[0].y=4;
    game.players[1].x=6;game.players[1].y=4;
    for(let i=0;i<120;i++){
      assert.doesNotThrow(()=>game.move(1,1,0));
      assert.doesNotThrow(()=>game.move(2,-1,0));
      assert.doesNotThrow(()=>game.move(1,-1,0));
      assert.doesNotThrow(()=>game.move(2,1,0));
      assert.equal(game.counts.reduce((a,b)=>a+b,0),game.playableCells);
      assert.ok(game.players.every(p=>game.inBounds(p.x,p.y)));
    }
    assert.equal(game.running,true);
  }
});

test('encuentro con power-up sigue funcionando cuando J1 y COM pisan la misma casilla',()=>{
  const game=create({againstComputer:true});
  game.players[0].x=10; game.players[0].y=10;
  game.players[1].x=12; game.players[1].y=10;
  game.pickups=[{id:1,x:11,y:10,type:'promedio'}];
  assert.equal(game.move(1,1,0),true);
  assert.ok(game.hasEffect(1,'promedio'));
  assert.equal(game.move(2,-1,0),true);
  assert.equal(game.pickups.length,0);
  assert.equal(game.at(11,10),2);
  assert.equal(game.counts.reduce((a,b)=>a+b,0),game.playableCells);
});

test('SUMA dura cuatro segundos y puede refrescarse al recogerla de nuevo',()=>{
  const b=create();
  b.activate(1,'suma');
  assert.equal(POWERUPS.suma.duration,4);
  assert.equal(b.hasEffect(1,'suma'),true);
  b.advance(3.99);
  assert.equal(b.hasEffect(1,'suma'),true);
  b.advance(.02);
  assert.equal(b.hasEffect(1,'suma'),false);
  b.activate(1,'suma');
  assert.ok(Math.abs(b.effectRemaining(1,'suma')-4)<1e-8);
});

test('PROMEDIO dura cinco segundos y vuelve a velocidad base al expirar',()=>{
  const b=create();
  b.activate(1,'promedio');
  assert.equal(POWERUPS.promedio.duration,5);
  b.advance(4.99);
  assert.equal(b.hasEffect(1,'promedio'),true);
  assert.equal(b.movementInterval(1),20);
  b.advance(.02);
  assert.equal(b.hasEffect(1,'promedio'),false);
  assert.equal(b.movementInterval(1),40);
});
