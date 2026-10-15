/** Game soundtrack: a shuffled rotation without immediate repeats. */
export const TRACKS = Object.freeze([
  { id: 'garra', title: 'Garra de Acero', src: './music/garra-de-acero.mp3' },
  { id: 'garra-alt', title: 'Garra de Acero (versión 2)', src: './music/garra-de-acero-2.mp3' },
  { id: 'laboratorio', title: 'Laboratorio X', src: './music/laboratorio-x.mp3' },
  { id: 'marcha', title: 'Marcha de Cero', src: './music/marcha-de-cero.mp3' },
  { id: 'ceniza', title: 'Ceniza y Rayo', src: './music/ceniza-y-rayo.mp3' },
  { id: 'pulso', title: 'Pulso de Acero', src: './music/pulso-de-acero.mp3' }
]);

export function shuffledPlaylist(tracks, previousId = null, random = Math.random) {
  const bag = [...tracks];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  if (bag.length > 1 && bag[bag.length - 1].id === previousId) {
    const candidate = bag.findIndex(item => item.id !== previousId);
    [bag[candidate], bag[bag.length - 1]] = [bag[bag.length - 1], bag[candidate]];
  }
  return bag;
}

export class BattleMusic {
  constructor({ tracks = TRACKS, random = Math.random, audio = null, onChange = () => {} } = {}) {
    this.tracks = [...tracks];
    this.random = random;
    this.audio = audio ?? new Audio();
    this.audio.preload = 'auto';
    this.audio.volume = 0.38;
    this.onChange = onChange;
    this.active = false;
    this.current = null;
    this.previous = null;
    this.queue = [];
    this.failed = new Set();
    this.serial = 0;
    this.audio.addEventListener('ended', () => { if (this.active) this.next(); });
    this.audio.addEventListener('error', () => { if (this.active) this.failCurrent(this.serial); });
  }

  publish(status) {
    this.onChange({ status, track: this.current, muted: this.audio.muted, volume: this.audio.volume });
  }

  start() {
    this.stop();
    this.active = true;
    this.next();
  }

  next() {
    if (!this.active) return;
    if (!this.queue.length) {
      const available = this.tracks.filter(track => !this.failed.has(track.id));
      if (!available.length) {
        this.audio.pause();
        this.current = null;
        this.publish('missing');
        return;
      }
      this.queue = shuffledPlaylist(available, this.previous, this.random);
    }
    const track = this.queue.pop();
    this.current = track;
    this.previous = track.id;
    const serial = ++this.serial;
    this.audio.pause();
    this.audio.src = track.src;
    this.publish('loading');
    this.play(serial);
  }

  play(serial = this.serial) {
    if (!this.active || !this.current || serial !== this.serial) return;
    let promise;
    try { promise = this.audio.play(); }
    catch (error) { this.handlePlayFailure(error, serial); return; }
    if (promise && typeof promise.then === 'function') {
      promise.then(() => {
        if (this.active && serial === this.serial) this.publish('playing');
      }).catch(error => this.handlePlayFailure(error, serial));
    } else this.publish('playing');
  }

  handlePlayFailure(error, serial) {
    if (!this.active || serial !== this.serial) return;
    if (error?.name === 'NotAllowedError') { this.publish('blocked'); return; }
    if (error?.name === 'AbortError') return;
    this.failCurrent(serial);
  }

  failCurrent(serial) {
    if (!this.active || serial !== this.serial || !this.current) return;
    this.failed.add(this.current.id);
    this.queue = this.queue.filter(track => !this.failed.has(track.id));
    this.next();
  }

  pause() {
    if (!this.active) return;
    this.audio.pause();
    this.publish('paused');
  }

  resume() {
    if (this.active && this.current) this.play();
  }

  stop() {
    this.active = false;
    this.serial++;
    this.audio.pause();
    this.audio.removeAttribute?.('src');
    this.audio.load?.();
    this.current = null;
    this.previous = null;
    this.queue = [];
    this.failed.clear();
    this.publish('stopped');
  }

  setMuted(value) {
    this.audio.muted = Boolean(value);
    this.publish(this.active ? 'playing' : 'stopped');
  }

  setVolume(value) {
    this.audio.volume = Math.min(1, Math.max(0, Number(value) || 0));
    this.publish(this.active ? 'playing' : 'stopped');
  }
}
