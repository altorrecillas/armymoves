'use strict';
/* =====================================================================
   audio.js — motor de sonido sintetizado con producción moderna:
   compresor maestro, reverberación por convolución, paneo estéreo
   posicional, capas de subgraves y secuenciador con batería.
   ===================================================================== */

const Sfx={
  ctx:null, master:null, comp:null, sfxBus:null, musBus:null,
  noiseBuf:null, verb:null, verbGain:null,

  unlock(){
    if(this.ctx){
      if(this.ctx.state==='suspended')this.ctx.resume();
      return;
    }
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    try{
      this.ctx=new AC();
      const c=this.ctx;

      /* cadena maestra: buses → compresor (cohesión y pegada) → salida */
      this.comp=c.createDynamicsCompressor();
      this.comp.threshold.value=-16;
      this.comp.knee.value=14;
      this.comp.ratio.value=4;
      this.comp.attack.value=0.003;
      this.comp.release.value=0.22;
      this.comp.connect(c.destination);
      this.master=c.createGain();
      this.master.gain.value=0.85;
      this.master.connect(this.comp);
      this.sfxBus=c.createGain();this.sfxBus.connect(this.master);
      this.musBus=c.createGain();this.musBus.connect(this.master);

      /* reverberación corta procedural (sensación de espacio) */
      this.verb=c.createConvolver();
      this.verb.buffer=this._makeIR(1.5,2.8);
      this.verbGain=c.createGain();
      this.verbGain.gain.value=0.3;
      this.verb.connect(this.verbGain);
      this.verbGain.connect(this.master);

      /* ruido blanco compartido */
      const len=c.sampleRate|0;
      this.noiseBuf=c.createBuffer(1,len,c.sampleRate);
      const d=this.noiseBuf.getChannelData(0);
      for(let i=0;i<len;i++)d[i]=Math.random()*2-1;

      this.applySettings();
      if(Music.pendingName)Music.play(Music.pendingName);
    }catch(e){}
  },

  /* impulso de reverberación: ruido con decaimiento exponencial */
  _makeIR(seconds,decay){
    const rate=this.ctx.sampleRate,n=(rate*seconds)|0;
    const buf=this.ctx.createBuffer(2,n,rate);
    for(let ch=0;ch<2;ch++){
      const d=buf.getChannelData(ch);
      for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay);
    }
    return buf;
  },

  applySettings(){
    if(!this.ctx)return;
    this.sfxBus.gain.value=Settings.sfx?1:0;
    this.musBus.gain.value=Settings.music?0.5:0;
  },

  /* pan estéreo según posición en el mundo (-izq … +dcha) */
  panAt(wx){
    if(wx===undefined||typeof world==='undefined'||!world)return 0;
    return clamp((wx-(world.cam.x+W/2))/(W*0.7),-1,1)*0.8;
  },

  /* enrutado común: pan opcional + envío a reverb */
  _route(node,pan,verb){
    let out=node;
    if(pan&&this.ctx.createStereoPanner){
      const p=this.ctx.createStereoPanner();
      p.pan.value=clamp(pan,-1,1);
      node.connect(p);out=p;
    }
    out.connect(this.sfxBus);
    if(verb>0){
      const vg=this.ctx.createGain();
      vg.gain.value=verb;
      out.connect(vg);vg.connect(this.verb);
    }
  },

  tone(f,dur,type='square',vol=0.05,slide=0,pan=0,verb=0){
    if(!this.ctx)return;
    try{
      const t=this.ctx.currentTime;
      const o=this.ctx.createOscillator(),g=this.ctx.createGain();
      o.type=type;
      o.frequency.setValueAtTime(Math.max(20,f),t);
      if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+dur);
      g.gain.setValueAtTime(0.0001,t);
      g.gain.linearRampToValueAtTime(vol,t+0.005);
      g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      o.connect(g);
      this._route(g,pan,verb);
      o.start(t);o.stop(t+dur+0.03);
    }catch(e){}
  },

  burst(dur,vol,fStart,fEnd,Q=0.7,pan=0,verb=0,ftype='lowpass'){
    if(!this.ctx)return;
    try{
      const t=this.ctx.currentTime;
      const src=this.ctx.createBufferSource();
      src.buffer=this.noiseBuf;
      src.playbackRate.value=0.7+Math.random()*0.6;
      const f=this.ctx.createBiquadFilter();
      f.type=ftype;f.Q.value=Q;
      f.frequency.setValueAtTime(fStart,t);
      f.frequency.exponentialRampToValueAtTime(Math.max(40,fEnd),t+dur);
      const g=this.ctx.createGain();
      g.gain.setValueAtTime(0.0001,t);
      g.gain.linearRampToValueAtTime(vol,t+0.004);
      g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      src.connect(f);f.connect(g);
      this._route(g,pan,verb);
      src.start(t,Math.random()*0.4);src.stop(t+dur+0.03);
    }catch(e){}
  },

  /* golpe de subgraves con caída de tono: la "pegada" física */
  thump(f0,f1,dur,vol,pan=0,verb=0){
    if(!this.ctx)return;
    try{
      const t=this.ctx.currentTime;
      const o=this.ctx.createOscillator(),g=this.ctx.createGain();
      o.type='sine';
      o.frequency.setValueAtTime(f0,t);
      o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
      g.gain.setValueAtTime(0.0001,t);
      g.gain.linearRampToValueAtTime(vol,t+0.003);
      g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      o.connect(g);
      this._route(g,pan,verb);
      o.start(t);o.stop(t+dur+0.03);
    }catch(e){}
  },

  /* campanita melódica con doble oscilador desafinado y cola de reverb */
  chime(f,delay,vol){
    setTimeout(()=>{
      this.tone(f,0.16,'sine',vol,0,0,0.5);
      this.tone(f*1.006,0.16,'sine',vol*0.55,0,0,0.5);
    },delay);
  },

  /* ---------------- efectos ---------------- */
  shoot(){
    this.burst(0.05,0.07,5200,1200,0.8,0,0,'bandpass');
    this.thump(190,80,0.05,0.05);
    this.tone(950+Math.random()*150,0.035,'square',0.012,260);
  },
  shootAA(){
    this.burst(0.1,0.09,2600,500,0.8);
    this.thump(240,90,0.07,0.05);
    this.tone(620,0.09,'sawtooth',0.018,180);
  },
  cannon(wx){
    const p=this.panAt(wx);
    this.thump(110,30,0.35,0.14,p,0.3);
    this.burst(0.3,0.16,900,90,1,p,0.4);
    this.burst(0.06,0.09,3500,800,0.7,p);
  },
  explode(big,wx){
    const p=this.panAt(wx);
    this.thump(big?95:120,26,big?0.8:0.45,big?0.18:0.11,p,0.35);
    this.burst(big?0.8:0.45,big?0.26:0.16,big?750:1000,50,1.1,p,0.5);
    this.burst(0.12,0.09,4200,900,0.8,p,0.15);
  },
  hit(){
    this.burst(0.12,0.12,1800,250,1);
    this.thump(160,60,0.12,0.07);
  },
  jump(){this.tone(230,0.12,'triangle',0.035,500)},
  stomp(){
    this.thump(220,70,0.09,0.08);
    this.burst(0.05,0.05,800,300,0.7);
  },
  land(){
    this.burst(0.06,0.04,420,140,0.6);
    this.thump(150,70,0.05,0.04);
  },
  pickup(){
    this.chime(660,0,0.045);
    this.chime(880,80,0.045);
    this.chime(1320,160,0.05);
  },
  oneUp(){
    [523,659,784,1047,1319].forEach((f,i)=>this.chime(f,i*90,0.045));
  },
  splash(wx){
    const p=this.panAt(wx);
    this.burst(0.5,0.16,1100,180,0.5,p,0.3);
    this.burst(0.14,0.07,3200,800,0.6,p);
  },
  alarm(){
    for(let i=0;i<3;i++)
      setTimeout(()=>this.tone(440,0.26,'square',0.035,330,0,0.4),i*330);
  },
  click(){this.tone(800,0.035,'square',0.025)},
  grenadePin(){this.tone(900,0.05,'square',0.025,1300)},
  missile(wx){
    const p=this.panAt(wx);
    this.burst(0.55,0.09,400,3000,0.6,p,0.3,'bandpass');
    this.tone(900,0.5,'sine',0.018,2200,p,0.2);
  },

  /* vibración háptica (móvil) */
  vibrate(pattern){
    if(!Settings.vibrate||!navigator.vibrate)return;
    try{navigator.vibrate(pattern)}catch(e){}
  }
};

/* ---------------- música ---------------- */
const NN=null;
const SONGS={
  /* notas en números MIDI; 16avos; kick/snare = pasos donde golpean */
  title:{bpm:96,len:32,hat:false,
    kick:[0,16],snare:[8,24],
    bass:[40,NN,NN,NN,40,NN,NN,NN,43,NN,NN,NN,43,NN,NN,NN,
          45,NN,NN,NN,45,NN,NN,NN,47,NN,45,NN,35,NN,NN,NN],
    lead:[64,NN,NN,62,64,NN,NN,NN,67,NN,NN,NN,64,NN,NN,NN,
          69,NN,67,NN,64,NN,NN,NN,66,NN,NN,NN,59,NN,NN,NN]},
  action:{bpm:144,len:32,hat:true,
    kick:[0,8,16,24],snare:[8,24],
    bass:[40,NN,52,NN,40,NN,52,NN,38,NN,50,NN,38,NN,50,NN,
          36,NN,48,NN,36,NN,48,NN,43,NN,55,NN,47,NN,46,NN],
    lead:[64,NN,NN,64,NN,62,64,NN,NN,NN,62,NN,60,NN,62,NN,
          60,NN,NN,60,NN,59,60,NN,NN,NN,62,NN,64,NN,66,NN]},
  boss:{bpm:152,len:32,hat:true,
    kick:[0,6,8,16,22,24],snare:[8,24,30],
    bass:[38,38,NN,38,NN,38,44,NN,38,38,NN,38,NN,38,44,NN,
          37,37,NN,37,NN,37,43,NN,37,37,NN,37,45,NN,46,NN],
    lead:[62,NN,NN,NN,65,NN,62,NN,NN,NN,68,NN,67,NN,65,NN,
          61,NN,NN,NN,64,NN,61,NN,NN,NN,67,NN,68,NN,69,NN]}
};

const Music={
  cur:null, step:0, nextT:0, timer:null, pendingName:null,

  midi(m){return 440*Math.pow(2,(m-69)/12)},

  play(name){
    this.pendingName=name;
    if(!Sfx.ctx||!SONGS[name])return;
    this._stopTimer();
    this.cur=SONGS[name];
    this.step=0;
    this.nextT=Sfx.ctx.currentTime+0.06;
    this.timer=setInterval(()=>this.tick(),25);
  },

  stop(){this._stopTimer();this.cur=null;this.pendingName=null},
  _stopTimer(){if(this.timer){clearInterval(this.timer);this.timer=null}},

  tick(){
    const c=Sfx.ctx;
    if(!c||!this.cur){this._stopTimer();return}
    const spb=60/this.cur.bpm/4;
    while(this.nextT<c.currentTime+0.12){
      const s=this.step%this.cur.len;
      const b=this.cur.bass[s];
      if(b!=null)this.note(b,spb*0.95,'triangle',0.06,this.nextT);
      const l=this.cur.lead[s];
      if(l!=null)this.note(l,spb*0.88,'square',0.017,this.nextT,0.004,0.35);
      if(this.cur.kick&&this.cur.kick.includes(s))this.kick(this.nextT);
      if(this.cur.snare&&this.cur.snare.includes(s))this.snare(this.nextT);
      if(this.cur.hat&&s%2===0)this.hat(this.nextT,s%8===4?0.011:0.006);
      this.step++;
      this.nextT+=spb;
    }
  },

  /* nota con ataque suave; detune crea un chorus sutil en el lead */
  note(m,dur,type,vol,when,detune=0,verb=0){
    try{
      const f=this.midi(m);
      const g=Sfx.ctx.createGain();
      g.gain.setValueAtTime(0.0001,when);
      g.gain.linearRampToValueAtTime(vol,when+0.008);
      g.gain.exponentialRampToValueAtTime(0.0001,when+dur);
      const mk=ff=>{
        const o=Sfx.ctx.createOscillator();
        o.type=type;o.frequency.value=ff;
        o.connect(g);o.start(when);o.stop(when+dur+0.03);
      };
      mk(f);
      if(detune)mk(f*(1+detune));
      g.connect(Sfx.musBus);
      if(verb>0){
        const vg=Sfx.ctx.createGain();
        vg.gain.value=verb;
        g.connect(vg);vg.connect(Sfx.verb);
      }
    }catch(e){}
  },

  kick(when,vol=0.1){
    try{
      const o=Sfx.ctx.createOscillator(),g=Sfx.ctx.createGain();
      o.type='sine';
      o.frequency.setValueAtTime(130,when);
      o.frequency.exponentialRampToValueAtTime(42,when+0.11);
      g.gain.setValueAtTime(0.0001,when);
      g.gain.linearRampToValueAtTime(vol,when+0.004);
      g.gain.exponentialRampToValueAtTime(0.0001,when+0.13);
      o.connect(g);g.connect(Sfx.musBus);
      o.start(when);o.stop(when+0.16);
    }catch(e){}
  },

  snare(when,vol=0.045){
    try{
      const src=Sfx.ctx.createBufferSource();
      src.buffer=Sfx.noiseBuf;
      const f=Sfx.ctx.createBiquadFilter();
      f.type='highpass';f.frequency.value=1700;
      const g=Sfx.ctx.createGain();
      g.gain.setValueAtTime(0.0001,when);
      g.gain.linearRampToValueAtTime(vol,when+0.003);
      g.gain.exponentialRampToValueAtTime(0.0001,when+0.09);
      src.connect(f);f.connect(g);g.connect(Sfx.musBus);
      const vg=Sfx.ctx.createGain();vg.gain.value=0.25;
      g.connect(vg);vg.connect(Sfx.verb);
      src.start(when,Math.random()*0.4);src.stop(when+0.11);
    }catch(e){}
  },

  hat(when,vol){
    try{
      const src=Sfx.ctx.createBufferSource();
      src.buffer=Sfx.noiseBuf;
      const f=Sfx.ctx.createBiquadFilter();
      f.type='highpass';f.frequency.value=6500;
      const g=Sfx.ctx.createGain();
      g.gain.setValueAtTime(vol,when);
      g.gain.exponentialRampToValueAtTime(0.0001,when+0.035);
      src.connect(f);f.connect(g);g.connect(Sfx.musBus);
      src.start(when,Math.random()*0.4);src.stop(when+0.05);
    }catch(e){}
  },

  /* fanfarria de victoria (one-shot) */
  jingle(){
    if(!Sfx.ctx)return;
    const t0=Sfx.ctx.currentTime+0.05;
    const seq=[[64,0],[67,0.14],[71,0.28],[76,0.42],[79,0.6],[76,0.78],[79,0.92]];
    for(const[m,dt]of seq)this.note(m,0.24,'square',0.05,t0+dt,0.004,0.5);
    for(const[m,dt]of[[40,0],[47,0.42],[52,0.92]])this.note(m,0.42,'triangle',0.07,t0+dt);
  }
};
