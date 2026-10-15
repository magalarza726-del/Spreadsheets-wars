/** Independent, persistent and repositionable mobile controllers (Pointer Events). */
export const TOUCH_LAYOUT_KEY = 'sw-touch-layout-v2';
export const TOUCH_SCALE_MIN = 0.7;
export const TOUCH_SCALE_MAX = 1.8;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export function defaultTouchLayout(playerId = 1) {
  return {x: playerId === 2 ? 0.94 : 0.06, y: 0.93, scale: 1};
}
export function normalizeTouchLayout(value, playerId = 1) {
  const fallback = defaultTouchLayout(playerId);
  const number = (key, min, max) =>
    typeof value?.[key] === 'number' && Number.isFinite(value[key])
      ? clamp(value[key], min, max) : fallback[key];
  return {x:number('x',0,1), y:number('y',0,1), scale:number('scale',TOUCH_SCALE_MIN,TOUCH_SCALE_MAX)};
}
export function touchLayoutKey(playerId, mode) {
  return `${TOUCH_LAYOUT_KEY}:${mode}:p${playerId}`;
}
export function loadTouchLayout(playerId, mode, storage = null) {
  try {
    const target = storage ?? globalThis.localStorage;
    const raw = target?.getItem(touchLayoutKey(playerId, mode));
    return normalizeTouchLayout(raw ? JSON.parse(raw) : null, playerId);
  } catch { return defaultTouchLayout(playerId); }
}
export function saveTouchLayout(playerId, mode, layout, storage = null) {
  const normalized = normalizeTouchLayout(layout, playerId);
  try { (storage ?? globalThis.localStorage)?.setItem(touchLayoutKey(playerId,mode),JSON.stringify(normalized)); }
  catch { /* Storage can be disabled in private mode; movement still works. */ }
  return normalized;
}
export function resetTouchLayout(playerId, mode, storage = null) {
  try { (storage ?? globalThis.localStorage)?.removeItem(touchLayoutKey(playerId,mode)); }
  catch {}
  return defaultTouchLayout(playerId);
}
export function touchPosition(layout, hostWidth, hostHeight, width, height) {
  const scale=normalizeTouchLayout(layout).scale;
  const freeX=Math.max(0,hostWidth-width*scale);
  const freeY=Math.max(0,hostHeight-height*scale);
  return {left: Math.round(freeX*clamp(layout.x,0,1)), top: Math.round(freeY*clamp(layout.y,0,1)), freeX, freeY};
}

/**
 * Controls are attached to the worksheet surface rather than to its header.
 * Editable mode stops player input; dragging adjusts position within the pane.
 */
export function attachTouchControls(pane, playerId, mode, onDirection) {
  const host=pane.querySelector('.sheet-surface') ?? pane;
  const controller=document.createElement('div');
  controller.className='touch-controller touch-'+mode;
  controller.setAttribute('aria-label','Control táctil J'+playerId);
  controller.setAttribute('role','group');
  controller.style.transformOrigin='top left';
  const vectors={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
  let layout=loadTouchLayout(playerId,mode);
  let editing=false;
  let drag=null;
  let cleanupDirection=()=>onDirection(null);
  if(mode==='arrows') {
    for(const [key,glyph] of Object.entries({up:'▲',left:'◀',down:'▼',right:'▶'})) {
      const button=document.createElement('button');
      button.type='button';button.className='touch-arrow touch-'+key;
      button.textContent=glyph;button.setAttribute('aria-label',key+' J'+playerId);
      button.addEventListener('pointerdown',event=>{
        if(editing)return;
        event.preventDefault();button.setPointerCapture(event.pointerId);
        onDirection(vectors[key]);
      });
      button.addEventListener('pointerup',cleanupDirection);
      button.addEventListener('pointercancel',cleanupDirection);
      button.addEventListener('lostpointercapture',cleanupDirection);
      controller.append(button);
    }
  } else if(mode==='joystick') {
    const stick=document.createElement('div');stick.className='touch-stick';
    const handle=document.createElement('div');handle.className='touch-stick-handle';
    stick.append(handle);
    const aim=event=>{
      if(editing)return;
      event.preventDefault();
      const rect=stick.getBoundingClientRect();
      const x=event.clientX-(rect.left+rect.width/2);
      const y=event.clientY-(rect.top+rect.height/2);
      const magnitude=Math.hypot(x,y);
      if(magnitude<10){handle.style.transform='translate(0,0)';onDirection(null);return;}
      const maxTravel=stick.offsetWidth*layout.scale*.28;
      const scale=Math.min(maxTravel,magnitude)/magnitude;
      handle.style.transform=`translate(${x*scale/layout.scale}px,${y*scale/layout.scale}px)`;
      onDirection(Math.abs(x)>Math.abs(y)?[Math.sign(x),0]:[0,Math.sign(y)]);
    };
    stick.addEventListener('pointerdown',event=>{
      if(editing)return;
      event.preventDefault();stick.setPointerCapture(event.pointerId);aim(event);
    });
    stick.addEventListener('pointermove',event=>{if(!editing&&stick.hasPointerCapture(event.pointerId))aim(event);});
    cleanupDirection=()=>{handle.style.transform='translate(0,0)';onDirection(null);};
    stick.addEventListener('pointerup',cleanupDirection);
    stick.addEventListener('pointercancel',cleanupDirection);
    stick.addEventListener('lostpointercapture',cleanupDirection);
    controller.append(stick);
  }

  function position() {
    controller.style.transform=`scale(${layout.scale})`;
    const point=touchPosition(layout,host.clientWidth,host.clientHeight,controller.offsetWidth,controller.offsetHeight);
    controller.style.left=point.left+'px';
    controller.style.top=point.top+'px';
    controller.style.bottom='auto';
    controller.style.right='auto';
    return point;
  }
  function setScale(scale) {
    layout=saveTouchLayout(playerId,mode,{...layout,scale});
    position();
    return layout.scale;
  }
  function setEditing(value) {
    editing=Boolean(value);
    drag=null;cleanupDirection();
    controller.classList.toggle('touch-editing',editing);
    controller.style.cursor=editing?'grab':'';
    controller.setAttribute('aria-label',editing?`Mover control táctil J${playerId}. Arrastra para cambiar su posición`:`Control táctil J${playerId}`);
  }
  function reset() {
    layout=resetTouchLayout(playerId,mode);
    position();
    return {...layout};
  }
  // Capture-phase editing prevents underlying direction handlers from firing.
  controller.addEventListener('pointerdown',event=>{
    if(!editing)return;
    event.preventDefault();event.stopImmediatePropagation();
    const point=position();
    drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,left:point.left,top:point.top};
    controller.setPointerCapture(event.pointerId);
    controller.style.cursor='grabbing';
  },true);
  controller.addEventListener('pointermove',event=>{
    if(!editing)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(!drag||drag.id!==event.pointerId)return;
    const point=touchPosition(layout,host.clientWidth,host.clientHeight,controller.offsetWidth,controller.offsetHeight);
    const x=clamp(drag.left+event.clientX-drag.startX,0,point.freeX);
    const y=clamp(drag.top+event.clientY-drag.startY,0,point.freeY);
    layout=normalizeTouchLayout({...layout,x:point.freeX?x/point.freeX:0,y:point.freeY?y/point.freeY:0},playerId);
    position();
  },true);
  function endDrag(event) {
    if(!drag || drag.id!==event.pointerId)return;
    drag=null;controller.style.cursor='grab';
    layout=saveTouchLayout(playerId,mode,layout);
  }
  controller.addEventListener('pointerup',endDrag,true);
  controller.addEventListener('pointercancel',endDrag,true);
  controller.addEventListener('lostpointercapture',endDrag,true);
  host.append(controller);
  position();
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(position):null;
  observer?.observe(host);
  return Object.assign(controller,{
    setEditing,setScale,resetPlacement:reset,updatePlacement:position,
    getLayout:()=>({...layout}),destroy:()=>{observer?.disconnect();cleanupDirection();}
  });
}
