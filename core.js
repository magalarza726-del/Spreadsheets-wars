/** Spreadsheet Wars: deterministic, DOM-free battle rules (ES module). */
export const MODES = Object.freeze({
  bala: { label: 'Bala', size: 20, seconds: 60 },
  blitz: { label: 'Blitz', size: 30, seconds: 120 },
  rapida: { label: 'Rápida', size: 60, seconds: 180 }
});

export const POWERUPS = Object.freeze({
  bomba: { name: 'Bomba de pintura', duration: 0, icon: '✦', description: 'Conquista un área de 7 × 7 celdas.' },
  suma: { name: 'SUMA', duration: 10, icon: 'Σ', description: 'Pinta 3 celdas por movimiento.' },
  producto: { name: 'PRODUCTO', duration: 4, icon: '×', description: 'Pinta 9 celdas por movimiento.' },
  promedio: { name: 'PROMEDIO', duration: 6, icon: 'x̄', description: 'Duplica tu velocidad de movimiento.' },
  concatenar: { name: 'CONCATENAR', duration: 2, icon: '&', description: 'El rival pinta con tu color.' },
  indice: { name: 'ÍNDICE', duration: 3, icon: '↗', description: 'Te transporta cerca del rival y te devuelve después.' }
});

export const DIRECTIONS = Object.freeze({
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0]
});

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const mirrorCell = (x, y, size) => ({ x: size - 1 - x, y: size - 1 - y });
export const columnLabel = (index) => {
  let result = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) result = String.fromCharCode(65 + (n - 1) % 26) + result;
  return result;
};

export class SpreadsheetBattle {
  constructor({size = 30, seconds = 120, againstComputer = false, random = Math.random} = {}) {
    if (!Number.isInteger(size) || size < 4 || !Number.isFinite(seconds) || seconds <= 0) throw new Error('Configuración de partida no válida');
    this.size = size;
    this.seconds = seconds;
    this.againstComputer = againstComputer;
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
    this.pickupId = 0;
    this.players = [
      {id: 1, x: 1, y: 1, dx: 1, dy: 0, effects: Object.create(null), returnPosition: null},
      {id: 2, x: size - 2, y: size - 2, dx: -1, dy: 0, effects: Object.create(null), returnPosition: null}
    ];
    this.paint(1, 1, 1);
    this.paint(size - 2, size - 2, 2);
  }

  at(x, y) { return this.owner[y * this.size + x]; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.size && y < this.size; }
  paint(x, y, id) {
    if (!this.inBounds(x, y)) return false;
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

  movementInterval(playerId) { return this.hasEffect(playerId, 'promedio') ? 50 : 100; }

  paintingOwner(playerId) {
    return this.hasEffect(3 - playerId, 'concatenar') ? 3 - playerId : playerId;
  }

  paintMovement(playerId) {
    const player = this.players[playerId - 1];
    const color = this.paintingOwner(playerId);
    if (this.hasEffect(playerId, 'producto')) {
      this.paintArea(player.x, player.y, 1, color);
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
    if (!this.inBounds(x, y)) return false;
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
    if (type === 'bomba') {
      const changed = this.paintArea(player.x, player.y, 3, this.paintingOwner(playerId));
      this.events.push({kind: 'bomb', playerId, x: player.x, y: player.y, changed});
      return;
    }
    if (type === 'indice') {
      // Only the first activation records a return location. Refreshing it extends the visit.
      if (!player.returnPosition) player.returnPosition = {x: player.x, y: player.y};
      const rival = this.players[2 - playerId];
      const candidates = [
        [rival.x + 1, rival.y], [rival.x - 1, rival.y],
        [rival.x, rival.y + 1], [rival.x, rival.y - 1]
      ].filter(([x, y]) => this.inBounds(x, y));
      const destination = candidates.sort((a,b) => this.at(a[0],a[1]) - this.at(b[0],b[1]))[0] ?? [rival.x, rival.y];
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
    while (this.nextSpawn <= this.elapsed + 1e-8) {
      this.spawnMirroredPair();
      this.nextSpawn += 10;
    }
    for (const p of this.players) {
      if (p.returnPosition && !this.hasEffect(p.id, 'indice')) {
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
  get percentages() { const total = this.size * this.size; return this.counts.map(value => value * 100 / total); }
  drainEvents() { return this.events.splice(0); }
}
