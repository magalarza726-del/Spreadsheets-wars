/** Local soundtrack library. Uploaded audio never leaves the user's browser. */
export const MAX_AUDIO_BYTES = 45 * 1024 * 1024;
const ACCEPTED_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|flac|webm)$/i;
const DB_NAME = 'spreadsheets-wars-audio';
const STORE_NAME = 'songs';

export function checkAudioFile(file) {
  if (!file || typeof file.name !== 'string' || !ACCEPTED_EXT.test(file.name))
    return 'Formato no compatible. Utiliza MP3, M4A, AAC, WAV, OGG, FLAC o WebM.';
  if (!(file.size > 0)) return 'El archivo de audio está vacío.';
  if (file.size > MAX_AUDIO_BYTES) return 'El audio supera los 45 MB permitidos por canción.';
  return null;
}

function openDatabase(indexedDB) {
  return new Promise((resolve, reject) => {
    if (!indexedDB) { reject(new Error('Almacenamiento local no disponible')); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, {keyPath:'id'});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir la biblioteca local'));
    request.onblocked = () => reject(new Error('La biblioteca está abierta en otra pestaña'));
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error ?? new Error('No se pudo guardar la canción'));
    tx.onerror = () => reject(tx.error ?? new Error('Error de almacenamiento'));
  });
}

export class AudioLibrary {
  constructor({indexedDB = globalThis.indexedDB, urls = globalThis.URL} = {}) {
    this.indexedDB = indexedDB;
    this.urls = urls;
    this.items = [];
    this.objectUrls = new Map();
    this.database = null;
    this.persistent = false;
    this.ready = false;
    this.initializing = null;
  }

  async initialize() {
    if (this.ready) return;
    if (this.initializing) return this.initializing;
    this.initializing = this.loadFromStorage();
    return this.initializing;
  }

  async loadFromStorage() {
    try {
      this.database = await openDatabase(this.indexedDB);
      this.persistent = true;
      const tx = this.database.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).getAll();
      const songs = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      this.items = songs.filter(item => item?.blob && !checkAudioFile(item.blob));
    } catch (error) {
      this.persistent = false;
      this.database = null;
    }
    this.ready = true;
  }

  createId() {
    return 'local-' + (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  }

  async addFiles(files) {
    await this.initialize();
    const report = {added: [], skipped: [], errors: []};
    for (const file of Array.from(files ?? [])) {
      const error = checkAudioFile(file);
      if (error) {report.errors.push(`${file?.name || 'Archivo'}: ${error}`); continue;}
      if (this.items.some(item => item.name.toLocaleLowerCase() === file.name.toLocaleLowerCase() && item.size === file.size)) {
        report.skipped.push(file.name); continue;
      }
      const item = {id:this.createId(), name:file.name, size:file.size, blob:file};
      if (this.database) {
        try {
          const tx = this.database.transaction(STORE_NAME,'readwrite');
          const done = transactionDone(tx);
          tx.objectStore(STORE_NAME).put(item);
          await done;
        } catch (error) {
          // Keep this track playable for this session, but explicitly tell the user it wasn't saved.
          this.persistent = false;
          report.errors.push(`No se pudo guardar permanentemente «${file.name}». Estará disponible en esta pestaña.`);
        }
      }
      this.items.push(item);
      report.added.push(item);
    }
    return report;
  }

  async remove(id) {
    await this.initialize();
    const existing = this.items.find(item => item.id === id);
    if (!existing) return false;
    if (this.database) {
      const tx = this.database.transaction(STORE_NAME,'readwrite');
      const done = transactionDone(tx);
      tx.objectStore(STORE_NAME).delete(id);
      await done;
    }
    this.items = this.items.filter(item=>item.id!==id);
    if(this.objectUrls.has(id)) {
      this.urls.revokeObjectURL(this.objectUrls.get(id));
      this.objectUrls.delete(id);
    }
    return true;
  }

  getTracks() {
    return this.items.map(item => {
      if (!this.objectUrls.has(item.id)) this.objectUrls.set(item.id, this.urls.createObjectURL(item.blob));
      return {id:item.id, title:item.name.replace(/\.[^.]+$/,''), src:this.objectUrls.get(item.id)};
    });
  }

  dispose() {
    for (const url of this.objectUrls.values()) this.urls.revokeObjectURL(url);
    this.objectUrls.clear();
    this.database?.close();
  }
}
