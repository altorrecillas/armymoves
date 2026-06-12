'use strict';
/* =====================================================================
   input.js — teclado + gamepad + sistema táctil de calidad móvil:
   joystick virtual flotante, botones multitáctiles con área de
   pulsación generosa y ejes analógicos compartidos con el mando.
   Acciones: left right up down fire special pause confirm
   ===================================================================== */

const Input={
  KEYS:['left','right','up','down','fire','special','pause','confirm'],
  kb:{}, touch:{}, gp:{},
  held:{}, prev:{},
  codes:{}, _codeQueue:[],
  tap:null, _tapQueue:null,
  axisX:0, axisY:0, _gpAX:0, _gpAY:0,

  _map(code){
    switch(code){
      case'ArrowLeft':case'KeyA':return'left';
      case'ArrowRight':case'KeyD':return'right';
      case'ArrowUp':case'KeyW':return'up';
      case'ArrowDown':case'KeyS':return'down';
      case'KeyX':case'KeyJ':case'ControlLeft':case'ControlRight':return'fire';
      case'KeyC':case'KeyZ':case'KeyK':case'ShiftLeft':return'special';
      case'KeyP':case'Escape':return'pause';
      case'Enter':return'confirm';
      default:return null;
    }
  },

  init(canvasEl){
    window.addEventListener('keydown',e=>{
      Sfx.unlock();
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();
      if(e.code==='Space'){this.kb.up=true;this.kb.confirm=true;return}
      const k=this._map(e.code);
      if(k)this.kb[k]=true;
      if(!e.repeat)this._codeQueue.push(e.code);
    });
    window.addEventListener('keyup',e=>{
      if(e.code==='Space'){this.kb.up=false;this.kb.confirm=false;return}
      const k=this._map(e.code);
      if(k)this.kb[k]=false;
    });

    /* taps sobre el canvas (menús; en partida los captura touchLayer) */
    canvasEl.addEventListener('pointerdown',e=>{
      Sfx.unlock();
      const r=canvasEl.getBoundingClientRect();
      this._tapQueue={
        x:(e.clientX-r.left)/r.width*W,
        y:(e.clientY-r.top)/r.height*H
      };
    });

    TouchUI.init();

    document.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
    document.addEventListener('gesturestart',e=>e.preventDefault());
    document.addEventListener('contextmenu',e=>e.preventDefault());
  },

  pollGamepad(){
    this.gp={};
    this._gpAX=0;this._gpAY=0;
    const pads=navigator.getGamepads?navigator.getGamepads():null;
    if(!pads)return;
    const g=pads[0]||pads[1];
    if(!g)return;
    const b=i=>!!(g.buttons[i]&&g.buttons[i].pressed);
    const ax=g.axes[0]||0, ay=g.axes[1]||0;
    this._gpAX=ax;this._gpAY=ay;
    if(ax<-0.35||b(14))this.gp.left=true;
    if(ax>0.35||b(15))this.gp.right=true;
    if(ay<-0.5||b(12)||b(0))this.gp.up=true;
    if(ay>0.5||b(13))this.gp.down=true;
    if(b(2)||b(7))this.gp.fire=true;
    if(b(1)||b(5)||b(6))this.gp.special=true;
    if(b(9))this.gp.pause=true;
    if(b(0)||b(9))this.gp.confirm=true;
  },

  /* llamar una vez por frame, al principio del tick */
  update(){
    this.pollGamepad();
    this.prev=this.held;
    this.held={};
    for(const k of this.KEYS)this.held[k]=!!(this.kb[k]||this.touch[k]||this.gp[k]);
    if(!TouchUI.stickActive){
      this.axisX=Math.abs(this._gpAX)>0.3?this._gpAX:0;
      this.axisY=Math.abs(this._gpAY)>0.3?this._gpAY:0;
    }
    this.codes={};
    for(const c of this._codeQueue)this.codes[c]=true;
    this._codeQueue.length=0;
    this.tap=this._tapQueue;
    this._tapQueue=null;
  },

  down(k){return!!this.held[k]},
  pressed(k){return!!this.held[k]&&!this.prev[k]},
  released(k){return!!this.prev[k]&&!this.held[k]},
  codePressed(c){return!!this.codes[c]},
  tapIn(x,y,w,h){return this.tap&&this.tap.x>=x&&this.tap.x<=x+w&&this.tap.y>=y&&this.tap.y<=y+h}
};

/* =====================================================================
   TouchUI — joystick flotante + botones de acción
   El joystick aparece donde apoyes el pulgar (mitad izquierda).
   Los botones tienen radio de acierto inflado y, si tocas en la zona
   derecha sin acertar a ninguno, se activa la acción primaria.
   ===================================================================== */
const TouchUI={
  mode:'foot', primary:'fire', stickActive:false,
  layer:null, stickEl:null, baseEl:null, knobEl:null, btns:null,
  pointers:new Map(), sx:0, sy:0, ax:0, ay:0,

  init(){
    this.layer=document.getElementById('touchLayer');
    this.stickEl=document.getElementById('stick');
    this.baseEl=document.getElementById('stickBase');
    this.knobEl=document.getElementById('stickKnob');
    this.btns={
      fire:document.getElementById('btnFire'),
      jump:document.getElementById('btnJump'),
      special:document.getElementById('btnSpecial')
    };
    if(!this.layer)return;
    const opt={passive:false};
    this.layer.addEventListener('pointerdown',e=>this.down(e),opt);
    this.layer.addEventListener('pointermove',e=>this.move(e),opt);
    this.layer.addEventListener('pointerup',e=>this.up(e),opt);
    this.layer.addEventListener('pointercancel',e=>this.up(e),opt);
  },

  keyOf(btn){return btn==='fire'?'fire':btn==='special'?'special':'up'},

  /* recoloca los botones según el modo de juego (disparo siempre manual) */
  setLayout(mode){
    this.mode=mode;
    if(!this.btns)return;
    const B=this.btns;
    const place=(el,slot,label)=>{
      el.classList.remove('hidden','slot1','slot2','slot3');
      el.classList.add(slot);
      el.textContent=label;
    };
    for(const el of Object.values(B))el.classList.add('hidden');
    const spLabel=mode==='jeep'?'🚀':mode==='heli'?'💥':'💣';
    place(B.fire,'slot1','◉');
    this.primary='fire';
    if(mode==='heli'){
      place(B.special,'slot2',spLabel);
    }else{
      place(B.jump,'slot2','⬆');
      place(B.special,'slot3',spLabel);
    }
    this.reset();
  },

  reset(){
    this.pointers.clear();
    this.stickActive=false;this.ax=0;this.ay=0;
    if(this.stickEl)this.stickEl.classList.add('hidden');
    if(this.btns)for(const el of Object.values(this.btns))el.classList.remove('on');
    Input.touch={};
    Input.axisX=0;Input.axisY=0;
  },

  down(e){
    e.preventDefault();
    Sfx.unlock();
    /* registrar tap en coordenadas de canvas (menú de pausa) */
    if(canvas){
      const r=canvas.getBoundingClientRect();
      Input._tapQueue={x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};
    }
    /* en pausa solo interesa el tap para el menú */
    if(typeof paused!=='undefined'&&paused)return;
    const x=e.clientX,y=e.clientY;

    /* mitad izquierda (fuera de la franja superior) → joystick */
    if(x<innerWidth*0.45&&y>innerHeight*0.16&&!this.stickActive){
      this.pointers.set(e.pointerId,{type:'stick'});
      this.stickActive=true;
      this.sx=x;this.sy=y;this.ax=0;this.ay=0;
      this.showStick(x,y,x,y);
      this.sync();
      return;
    }

    /* botón más cercano dentro de su radio inflado */
    let best=null,bd=1e9;
    for(const[name,el]of Object.entries(this.btns)){
      if(el.classList.contains('hidden'))continue;
      const r=el.getBoundingClientRect();
      const d=Math.hypot(x-(r.left+r.width/2),y-(r.top+r.height/2));
      if(d<r.width*0.95&&d<bd){bd=d;best=name}
    }
    /* toque libre en la zona derecha → acción primaria */
    if(!best&&x>innerWidth*0.55)best=this.primary;
    if(best){
      this.pointers.set(e.pointerId,{type:'btn',btn:best});
      this.btns[best].classList.add('on');
      Sfx.vibrate(8);
      this.sync();
    }
  },

  move(e){
    const p=this.pointers.get(e.pointerId);
    if(!p||p.type!=='stick')return;
    e.preventDefault();
    const R=Math.max(30,Math.min(innerWidth,innerHeight)*0.085);
    let dx=e.clientX-this.sx,dy=e.clientY-this.sy;
    const d=Math.hypot(dx,dy);
    if(d>R){dx*=R/d;dy*=R/d}
    this.ax=dx/R;this.ay=dy/R;
    this.showStick(this.sx,this.sy,this.sx+dx,this.sy+dy);
    this.sync();
  },

  up(e){
    const p=this.pointers.get(e.pointerId);
    if(!p)return;
    this.pointers.delete(e.pointerId);
    if(p.type==='stick'){
      this.stickActive=false;this.ax=0;this.ay=0;
      this.stickEl.classList.add('hidden');
    }else{
      let still=false;
      for(const q of this.pointers.values())
        if(q.type==='btn'&&q.btn===p.btn)still=true;
      if(!still)this.btns[p.btn].classList.remove('on');
    }
    this.sync();
  },

  showStick(bx,by,kx,ky){
    this.stickEl.classList.remove('hidden');
    this.baseEl.style.left=bx+'px';this.baseEl.style.top=by+'px';
    this.knobEl.style.left=kx+'px';this.knobEl.style.top=ky+'px';
  },

  /* vuelca el estado táctil en Input */
  sync(){
    const t=Input.touch={};
    const dz=0.3;
    if(this.stickActive){
      t.left=this.ax<-dz;
      t.right=this.ax>dz;
      if(this.mode==='heli'){t.up=this.ay<-dz;t.down=this.ay>dz}
      else if(this.mode==='jeep'){t.up=this.ay<-0.45}
      else if(this.mode==='foot'){t.up=this.ay<-0.6;t.down=this.ay>0.55}
    }
    for(const p of this.pointers.values())
      if(p.type==='btn')t[this.keyOf(p.btn)]=true;
    Input.axisX=this.stickActive?this.ax:0;
    Input.axisY=this.stickActive?this.ay:0;
  }
};
