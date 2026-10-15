/** Pointer controls: one independently captured controller per player. */
export function attachTouchControls(pane, playerId, mode, onDirection) {
  const controller = document.createElement('div');
  controller.className = 'touch-controller touch-' + mode;
  controller.setAttribute('aria-label','Control táctil J' + playerId);
  const vectors = {up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
  if(mode === 'arrows') {
    for(const [key,glyph] of Object.entries({up:'▲',left:'◀',down:'▼',right:'▶'})) {
      const button=document.createElement('button');
      button.type='button';button.className='touch-arrow touch-' + key;
      button.textContent=glyph;
      button.setAttribute('aria-label',key + ' J' + playerId);
      button.addEventListener('pointerdown',event=>{
        event.preventDefault();button.setPointerCapture(event.pointerId);
        onDirection(vectors[key]);
      });
      const clear=()=>onDirection(null);
      button.addEventListener('pointerup',clear);
      button.addEventListener('pointercancel',clear);
      button.addEventListener('lostpointercapture',clear);
      controller.append(button);
    }
  } else if(mode === 'joystick') {
    const stick=document.createElement('div');
    stick.className='touch-stick';
    const handle=document.createElement('div');handle.className='touch-stick-handle';
    stick.append(handle);
    const aim=event=>{
      event.preventDefault();
      const rect=stick.getBoundingClientRect();
      const x=event.clientX-(rect.left+rect.width/2);
      const y=event.clientY-(rect.top+rect.height/2);
      const magnitude=Math.hypot(x,y);
      if(magnitude<10){handle.style.transform='translate(0,0)';onDirection(null);return;}
      const scale=Math.min(24,magnitude)/magnitude;
      handle.style.transform='translate(' + (x*scale) + 'px,' + (y*scale) + 'px)';
      onDirection(Math.abs(x)>Math.abs(y)?[Math.sign(x),0]:[0,Math.sign(y)]);
    };
    stick.addEventListener('pointerdown',event=>{stick.setPointerCapture(event.pointerId);aim(event);});
    stick.addEventListener('pointermove',event=>{if(stick.hasPointerCapture(event.pointerId))aim(event);});
    const clear=()=>{handle.style.transform='translate(0,0)';onDirection(null);};
    stick.addEventListener('pointerup',clear);
    stick.addEventListener('pointercancel',clear);
    stick.addEventListener('lostpointercapture',clear);
    controller.append(stick);
  }
  pane.append(controller);
  return controller;
}
