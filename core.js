/** Spreadsheet Wars: deterministic, DOM-free battle rules (ES module). */
export const MAPS = Object.freeze({
  pequeno: { label: 'Pequeño', size: 30 },
  mediano: { label: 'Mediano', size: 50 },
  grande: { label: 'Grande', size: 70 }
});

export const DURATIONS = Object.freeze({
  bala: {label: 'Bala', seconds: 90}
});
export const TERRAINS = Object.freeze({
  normal: {label:'Normal', description:'Todas las celdas están disponibles.'},
  everest: {label:'Everest', description:'Cada 4 segundos caen celdas simétricas.'},
  crater: {label:'Cráter', description:'Una X de terreno caído ocupa el 10 % del mapa.'}
});

export const DIFFICULTIES = Object.freeze({
  principiante: {label: 'Fácil', cellsPerSecond: 10, description: 'Explora sin un plan fijo y deja oportunidades libres.'},
  normal: {label: 'Normal', cellsPerSecond: 15, description: 'Busca casillas disponibles y recoge poderes cercanos.'},
  dificil: {label: 'Difícil', cellsPerSecond: 20, description: 'Persigue objetivos valiosos y disputa tu territorio.'},
  experto: {label: 'Experto', cellsPerSecond: 25, description: 'Evalúa regiones, rutas y power-ups de forma agresiva.'}
});

export const POWERUPS = Object.freeze({
  insertar: { name: 'INSERTAR', duration: 0, icon: '✦', description: 'Explosión de pintura de 7 × 7 celdas.' },
  suma: { name: 'SUMA', duration: 10, icon: 'Σ', description: 'Pinta 3 celdas por movimiento.' },
  producto: { name: 'PRODUCTO', duration: 4, icon: '×', description: 'Pinta 5 celdas en cruz, a la mitad de velocidad.' },
  promedio: { name: 'PROMEDIO', duration: 6, icon: 'x̄', description: 'Duplica tu velocidad de movimiento.' },
  concatenar: { name: 'CONCATENAR', duration: 1, icon: '&', description: 'El rival pinta con tu color.' },
  buscarv: { name: 'BUSCARV', duration: 3, icon: '↗', description: 'Te transporta cerca del rival y te devuelve después.' }
});

export const DIRECTIONS = Object.freeze({
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0]
});

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const mirrorCell = (x, y, size) => ({ x: size - 1 - x, y: size - 1 - y });
export const selectRandomTerrain = (random = Math.random) => {
  const terrains=Object.keys(TERRAINS);
  const n=Number(random());
  const index=Number.isFinite(n)?Math.min(terrains.length-1,Math.max(0,Math.floor(n*terrains.length))):0;
  return terrains[index];
};
export const columnLabel = (index) => {
  let result = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) result = String.fromCharCode(65 + (n - 1) % 26) + result;
  return result;
};

export class SpreadsheetBattle {
  constructor({size = 30, seconds = 90, mode = 'bala', terrain = 'normal', againstComputer = false, difficulty = 'normal', random = Math.random} = {}) {
    if (!Number.isInteger(size) || size < 4 || !Number.isFinite(seconds) || seconds <= 0) throw new Error('Configuración de partida no válida');
    if (!DIFFICULTIES[difficulty]) throw new Error('Dificultad desconocida');
    if (mode !== 'bala' || seconds !== 90 || !TERRAINS[terrain]) throw new Error('Modo o mapa desconocido: la partida dura 90 segundos');
    this.size = size;
    this.seconds = seconds;
    this.mode = mode;
    this.terrain = terrain;
    this.blocked = new Uint8Array(size * size);
    this.nextCollapse = 4;
    this.againstComputer = againstComputer;
    this.difficulty = difficulty;
    this.random = random;
    this.elapsed = 0;
    this.running = true;
    this.paused = false;
    this.winner = null;
    this.owner = new Uint8Array(size * size);
    this.counts = [size * size, 0, 0];
    this.events = [];
    this.pickups = [];
    this.nextSpawn = 10;
    this.suddenDeath = false;
    this.pickupId = 0;
    this.players = [
      {id: 1, x: 1, y: 1, dx: 1, dy: 0, effects: Object.create(null), returnPosition: null},
      {id: 2, x: size - 2, y: size - 2, dx: -1, dy: 0, effects: Object.create(null), returnPosition: null}
    ];
    this.paint(1, 1, 1);
    this.paint(size - 2, size - 2, 2);
    if (terrain === 'crater') this.generateCrater();
  }

  at(x, y) { return this.owner[y * this.size + x]; }
  isBlocked(x, y) { return this.inBounds(x,y) && this.blocked[y*this.size+x] === 1; }
  canEnter(x, y) { return this.inBounds(x,y) && !this.isBlocked(x,y); }
  get playableCells() {return this.size*this.size-this.blocked.reduce((n,v)=>n+v,0);}
  collapse(x,y) {
    if (!this.canEnter(x,y) || this.players.some(p=>p.x===x&&p.y===y || p.returnPosition?.x===x&&p.returnPosition?.y===y)) return false;
    const index=y*this.size+x,old=this.owner[index];
    this.counts[old]--;
    this.owner[index]=0;
    this.blocked[index]=1;
    this.pickups=this.pickups.filter(item=>item.x!==x||item.y!==y);
    return true;
  }
  generateCrater() {
    const limit=Math.round(this.size*this.size*.1);
    const half=Math.floor(this.size*.38);
    const mid=(this.size-1)/2;
    const candidates=[];
    for(let y=0;y<this.size;y++)for(let x=0;x<this.size;x++){
      const dx=Math.abs(x-mid),dy=Math.abs(y-mid);
      if(Math.max(dx,dy)>half)continue;
      if ((x<=3&&y<=3)||(x>=this.size-4&&y>=this.size-4)) continue;
      candidates.push({x,y,d:Math.abs(dx-dy),length:Math.max(dx,dy)});
    }
    candidates.sort((a,b)=>a.d-b.d||a.length-b.length||a.y-b.y||a.x-b.x);
    for(const c of candidates){
      if(this.size*this.size-this.playableCells>=limit)break;
      this.collapse(c.x,c.y);
    }
  }
  collapseEverest() {
    const available=[];
    for(let y=0;y<this.size;y++)for(let x=0;x<this.size;x++){
      const mirror=mirrorCell(x,y,this.size);
      if(y*this.size+x>=mirror.y*this.size+mirror.x)continue;
      if(!this.canEnter(x,y)||!this.canEnter(mirror.x,mirror.y))continue;
      const reserved=this.players.some(p=>[p, p.returnPosition].filter(Boolean).some(pos=>
        pos.x===x&&pos.y===y || pos.x===mirror.x&&pos.y===mirror.y));
      if(!reserved)available.push({x,y,mirror});
    }
    if(!available.length)return false;
    const target=available[Math.min(available.length-1,Math.floor(this.random()*available.length))];
    this.collapse(target.x,target.y);
    this.collapse(target.mirror.x,target.mirror.y);
    this.events.push({kind:'collapse',x:target.x,y:target.y,mirror:target.mirror});
    return true;
  }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.size && y < this.size; }
  paint(x, y, id) {
    if (!this.canEnter(x, y)) return false;
    const index = y * this.size + x;
    const previous = this.owner[index];
    if (previous === id) return false;
    this.counts[previous]--;
    this.counts[id]++;
    this.owner[index] = id;
    return true;
  }

  paintArea(x, y, radius, ownerId) {
    let changed = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) changed += Number(this.paint(x + dx, y + dy, ownerId));
    }
    return changed;
  }

  hasEffect(playerId, type) {
    const until = this.players[playerId - 1].effects[type];
    return typeof until === 'number' && until > this.elapsed + 1e-7;
  }

  effectRemaining(playerId, type) {
    return Math.max(0, (this.players[playerId - 1].effects[type] ?? 0) - this.elapsed);
  }

  movementInterval(playerId) {
    const cellsPerSecond = this.againstComputer && playerId === 2
      ? DIFFICULTIES[this.difficulty].cellsPerSecond
      : 25;
    const multiplier = (this.hasEffect(playerId, 'promedio') ? 2 : 1) * (this.hasEffect(playerId, 'producto') ? 0.5 : 1);
    return 1000 / (cellsPerSecond * multiplier);
  }

  paintingOwner(playerId) {
    return this.hasEffect(3 - playerId, 'concatenar') ? 3 - playerId : playerId;
  }

  paintMovement(playerId) {
    const player = this.players[playerId - 1];
    const color = this.paintingOwner(playerId);
    if (this.hasEffect(playerId, 'producto')) {
      // Cruz de cinco celdas: centro y cuatro vecinos ortogonales.
      this.paint(player.x, player.y, color);
      for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) this.paint(player.x+dx, player.y+dy, color);
    } else if (this.hasEffect(playerId, 'suma')) {
      this.paint(player.x, player.y, color);
      // SUMA: three consecutive cells perpendicular to travel.
      if (player.dx !== 0) {
        this.paint(player.x, player.y - 1, color);
        this.paint(player.x, player.y + 1, color);
      } else {
        this.paint(player.x - 1, player.y, color);
        this.paint(player.x + 1, player.y, color);
      }
    } else {
      this.paint(player.x, player.y, color);
    }
  }

  move(playerId, dx, dy) {
    if (!this.running || this.paused || ![1,2].includes(playerId) || Math.abs(dx) + Math.abs(dy) !== 1) return false;
    const player = this.players[playerId - 1];
    player.dx = dx; player.dy = dy;
    const x = player.x + dx, y = player.y + dy;
    if (!this.canEnter(x, y)) return false;
    player.x = x; player.y = y;
    this.paintMovement(playerId);
    this.collect(playerId);
    return true;
  }

  collect(playerId) {
    const player = this.players[playerId - 1];
    const index = this.pickups.findIndex(p => p.x === player.x && p.y === player.y);
    if (index < 0) return null;
    const [pickup] = this.pickups.splice(index, 1);
    this.activate(playerId, pickup.type);
    this.events.push({kind: 'pickup', playerId, type: pickup.type});
    return pickup.type;
  }

  activate(playerId, type) {
    if (!(type in POWERUPS)) throw new Error('Power-up desconocido');
    const player = this.players[playerId - 1];
    if (type === 'insertar') {
      const changed = this.paintArea(player.x, player.y, 3, this.paintingOwner(playerId));
      this.events.push({kind: 'bomb', playerId, x: player.x, y: player.y, changed});
      return;
    }
    if (type === 'buscarv') {
      // Only the first activation records a return location. Refreshing it extends the visit.
      if (!player.returnPosition) player.returnPosition = {x: player.x, y: player.y};
      const rival = this.players[2 - playerId];
      const candidates = [
        [rival.x + 1, rival.y], [rival.x - 1, rival.y],
        [rival.x, rival.y + 1], [rival.x, rival.y - 1]
      ].filter(([x, y]) => this.canEnter(x, y));
      const destination = candidates.sort((a,b) => this.at(a[0],a[1]) - this.at(b[0],b[1]))[0] ?? [player.x, player.y];
      player.x = destination[0]; player.y = destination[1];
      this.paintMovement(playerId);
      this.events.push({kind:'teleport', playerId, x: player.x, y: player.y});
    }
    player.effects[type] = this.elapsed + POWERUPS[type].duration;
  }

  spawnMirroredPair() {
    const available = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const mirror = mirrorCell(x, y, this.size);
        // One random candidate per mirrored pair; both sites must be free of players/pickups.
        if (y * this.size + x >= mirror.y * this.size + mirror.x) continue;
        if (!this.canEnter(x,y) || !this.canEnter(mirror.x,mirror.y)) continue;
        if (this.players.some(p => (p.x === x && p.y === y) || (p.x === mirror.x && p.y === mirror.y))) continue;
        if (this.pickups.some(p => (p.x === x && p.y === y) || (p.x === mirror.x && p.y === mirror.y))) continue;
        available.push({x, y, mirror});
      }
    }
    if (!available.length) return null;
    const chosen = available[Math.min(available.length - 1, Math.floor(this.random() * available.length))];
    const keys = Object.keys(POWERUPS);
    const type = keys[Math.min(keys.length - 1, Math.floor(this.random() * keys.length))];
    const a = {id: ++this.pickupId, x: chosen.x, y: chosen.y, type};
    const b = {id: ++this.pickupId, x: chosen.mirror.x, y: chosen.mirror.y, type};
    this.pickups.push(a, b);
    this.events.push({kind:'spawn', type, x:a.x, y:a.y, mirrorX:b.x, mirrorY:b.y});
    return [a, b];
  }

  advance(dt) {
    if (!this.running || this.paused || !Number.isFinite(dt) || dt <= 0) return;
    this.elapsed = Math.min(this.seconds, this.elapsed + dt);
    while (this.nextSpawn <= this.elapsed + 1e-8 && this.nextSpawn < this.seconds) {
      // Bala: una pareja cada 10 s, o cada 5 s en muerte súbita.
      this.spawnMirroredPair();
      this.nextSpawn += this.nextSpawn>=this.seconds-30?5:10;
    }
    if(this.mode==='bala' && !this.suddenDeath && this.remaining<=30){
      this.suddenDeath=true;
      this.events.push({kind:'suddenDeath'});
    }
    if(this.terrain==='everest') while(this.nextCollapse<=this.elapsed+1e-8 && this.nextCollapse<this.seconds){
      this.collapseEverest();this.nextCollapse+=4;
    }
    for (const p of this.players) {
      if (p.returnPosition && !this.hasEffect(p.id, 'buscarv')) {
        p.x = p.returnPosition.x;
        p.y = p.returnPosition.y;
        p.returnPosition = null;
        this.paintMovement(p.id);
        this.events.push({kind:'return',playerId:p.id,x:p.x,y:p.y});
      }
      for (const type of Object.keys(p.effects)) {
        if (p.effects[type] <= this.elapsed + 1e-8) delete p.effects[type];
      }
    }
    if (this.elapsed >= this.seconds) {
      this.running = false;
      this.winner = this.counts[1] === this.counts[2] ? 0 : this.counts[1] > this.counts[2] ? 1 : 2;
      this.events.push({kind:'end', winner:this.winner});
    }
  }

  get remaining() { return Math.max(0, this.seconds - this.elapsed); }
  get percentages() { const total = Math.max(1,this.playableCells); return this.counts.map(value => value * 100 / total); }
  drainEvents() { return this.events.splice(0); }
}

/** Decisions are pure with respect to the board. Pass a per-match memory object to avoid repeated paths. */
export function chooseComputerDirection(game, level = 'normal', memory = {}, random = Math.random) {
  if (!DIFFICULTIES[level]) throw new Error('Dificultad desconocida');
  const cpu = game.players[1];
  const options = [[1,0],[-1,0],[0,1],[0,-1]]
    .filter(([dx,dy]) => game.canEnter(cpu.x + dx, cpu.y + dy));
  if (options.length === 0) return [0,0];
  const rand = () => Math.min(0.999999, Math.max(0, random()));
  if (!memory.visits || memory.visits.length !== game.size * game.size) {
    memory.visits = new Uint16Array(game.size * game.size);
  }
  const visit = (x,y) => memory.visits[y * game.size + x];
  const nonOwned = (x,y) => game.at(x,y) === 1 ? 2 : game.at(x,y) === 0 ? 1 : 0;
  const reverse = ([dx,dy]) => dx === -cpu.dx && dy === -cpu.dy;
  if (level === 'principiante' && rand() < 0.65) {
    const viable = options.filter(d => !reverse(d));
    const candidates = viable.length ? viable : options;
    return candidates[Math.floor(rand() * candidates.length)];
  }

  // Target selection ranges from nearby uncovered cells to region-aware scoring.
  let target = null, best = -Infinity;
  const pickupWeight = {principiante: 2, normal: 12, dificil: 27, experto: 42}[level];
  const clusterWeight = {principiante: 0, normal: 0.12, dificil: 0.5, experto: 1.1}[level];
  const visitWeight = {principiante: 0.05, normal: 0.2, dificil: 0.5, experto: 0.8}[level];
  const range = {principiante: 5, normal: 14, dificil: 24, experto: game.size * 2}[level];
  const pickupAt = new Set(game.pickups.map(p => p.y * game.size + p.x));

  for (let y = 0; y < game.size; y++) for (let x = 0; x < game.size; x++) {
    if(game.isBlocked(x,y))continue;
    const dist = Math.abs(x-cpu.x) + Math.abs(y-cpu.y);
    if (dist === 0 || dist > range) continue;
    const power = pickupAt.has(y*game.size+x);
    const ownGain = nonOwned(x,y);
    if (!ownGain && !power) continue;
    let nearby = 0;
    if (clusterWeight) {
      for (let oy=-1;oy<=1;oy++) for(let ox=-1;ox<=1;ox++) {
        if ((ox || oy) && game.canEnter(x+ox,y+oy)) nearby += nonOwned(x+ox,y+oy);
      }
    }
    const value = ownGain * 3 + nearby * clusterWeight + (power ? pickupWeight : 0);
    const score = value / (dist + 1) ** (level === 'experto' ? 0.83 : 1)
      - visit(x,y) * visitWeight / (dist+1);
    if (score > best) {best=score;target={x,y};}
  }

  const scored = options.map(([dx,dy]) => {
    const x=cpu.x+dx,y=cpu.y+dy;
    const toward = target ? Math.abs(cpu.x-target.x)+Math.abs(cpu.y-target.y)-Math.abs(x-target.x)-Math.abs(y-target.y) : 0;
    let local = nonOwned(x,y)*2 - visit(x,y)*visitWeight;
    if (level === 'dificil' || level === 'experto') {
      for(const [sx,sy] of [[1,0],[-1,0],[0,1],[0,-1]])
        if(game.canEnter(x+sx,y+sy)) local+=nonOwned(x+sx,y+sy)*clusterWeight*0.4;
    }
    const score = toward * (level === 'principiante' ? 2.5 : 8) + local
      - (reverse([dx,dy]) ? 3 : 0) + (pickupAt.has(y*game.size+x) ? pickupWeight : 0)
      + rand() * (level==='normal'?1.2:level==='principiante'?4:0.5);
    return {dx,dy,score};
  });
  scored.sort((a,b)=>b.score-a.score);
  return [scored[0].dx, scored[0].dy];
}
