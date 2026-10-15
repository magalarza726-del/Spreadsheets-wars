import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioLibrary, checkAudioFile, MAX_AUDIO_BYTES} from '../music-library.js';

const file=(name,size=8)=>({name,size});

test('el importador valida formatos, tamaño máximo y archivos vacíos',()=>{
  assert.equal(checkAudioFile(file('música.MP3')),null);
  assert.equal(checkAudioFile(file('tema.ogg')),null);
  assert.match(checkAudioFile(file('imagen.jpg')),/Formato no compatible/);
  assert.match(checkAudioFile(file('grande.mp3',MAX_AUDIO_BYTES+1)),/45 MB/);
  assert.match(checkAudioFile(file('vacío.mp3',0)),/vacío/);
});

test('sin IndexedDB funciona por sesión: no duplica canciones, libera URLs al quitar',async()=>{
  let next=0;
  const revoked=[];
  const urls={createObjectURL:()=>`blob:local/${++next}`,revokeObjectURL:x=>revoked.push(x)};
  const library=new AudioLibrary({indexedDB:null,urls});
  await library.initialize();
  assert.equal(library.persistent,false);
  const result=await library.addFiles([file('uno.mp3'),file('dos.mp3'),file('UNO.mp3')]);
  assert.equal(result.added.length,2);
  assert.deepEqual(result.skipped,['UNO.mp3']);
  const tracks=library.getTracks();
  assert.deepEqual(tracks.map(t=>t.src),['blob:local/1','blob:local/2']);
  assert.deepEqual(library.getTracks().map(t=>t.src),tracks.map(t=>t.src));
  await library.remove(tracks[0].id);
  assert.deepEqual(revoked,['blob:local/1']);
  library.dispose();
  assert.deepEqual(revoked,['blob:local/1','blob:local/2']);
});

test('IndexedDB conserva canciones entre sesiones y permite borrarlas',async()=>{
  const data=new Map();
  let exists=false;
  const db={
    objectStoreNames:{contains:()=>exists},
    createObjectStore(){exists=true;},
    close(){},
    transaction(){
      const tx={oncomplete:null,onerror:null,onabort:null,error:null};
      tx.objectStore=()=>({
        getAll(){
          const req={onsuccess:null,onerror:null,result:undefined};
          queueMicrotask(()=>{req.result=[...data.values()];req.onsuccess?.();});
          return req;
        },
        put(item){queueMicrotask(()=>{data.set(item.id,item);tx.oncomplete?.();});},
        delete(id){queueMicrotask(()=>{data.delete(id);tx.oncomplete?.();});}
      });
      return tx;
    }
  };
  const indexedDB={open(){
    const req={result:db,onsuccess:null,onupgradeneeded:null,onerror:null};
    queueMicrotask(()=>{if(!exists)req.onupgradeneeded?.();req.onsuccess?.();});
    return req;
  }};
  const urls={createObjectURL:()=>`blob:mock/${Math.random()}`,revokeObjectURL:()=>{}};
  const first=new AudioLibrary({indexedDB,urls});
  await first.initialize();
  assert.equal(first.persistent,true);
  await first.addFiles([file('música.mp3')]);
  assert.equal(data.size,1);
  const second=new AudioLibrary({indexedDB,urls});
  await second.initialize();
  assert.equal(second.items.length,1);
  assert.equal(second.items[0].name,'música.mp3');
  await second.remove(second.items[0].id);
  assert.equal(data.size,0);
  const third=new AudioLibrary({indexedDB,urls});
  await third.initialize();
  assert.equal(third.items.length,0);
});
