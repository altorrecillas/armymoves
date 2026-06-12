'use strict';
/* =====================================================================
   ARMY MOVES — Operación Delta v2.0
   core.js — constantes, utilidades, guardado y ajustes
   ===================================================================== */

const W=480, H=270;          // resolución lógica (16:9)
const RES=2;                 // escala de render: 960×540 (texto y curvas suaves)
const GROUND=225;            // línea de suelo
const GRAV=0.28;             // gravedad

let canvas=null, ctx=null;   // asignados en game.js

const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const rnd=(a,b)=>a+Math.random()*(b-a);
const irnd=(a,b)=>(a+Math.random()*(b-a+1))|0;
const pick=a=>a[(Math.random()*a.length)|0];
const aabb=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const pad=(n,l)=>String(Math.max(0,n|0)).padStart(l,'0');

const Save={
  get(k,d){
    try{const v=localStorage.getItem('am2_'+k);return v===null?d:JSON.parse(v)}
    catch(e){return d}
  },
  set(k,v){
    try{localStorage.setItem('am2_'+k,JSON.stringify(v))}catch(e){}
  }
};

const Settings={
  music:Save.get('music',true),
  sfx:Save.get('sfx',true),
  crt:Save.get('crt2',false),
  vibrate:Save.get('vibrate',true),
  save(){
    Save.set('music',this.music);Save.set('sfx',this.sfx);Save.set('crt2',this.crt);
    Save.set('vibrate',this.vibrate);
  }
};

const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;

/* tabla de récords: [{s:puntos, st:fase, d:fecha}] */
function loadScores(){return Save.get('scores',[])}
function saveScore(s,st){
  const sc=loadScores();
  sc.push({s,st,d:Date.now()});
  sc.sort((a,b)=>b.s-a.s);
  Save.set('scores',sc.slice(0,5));
}
function hiScore(){const sc=loadScores();return sc.length?sc[0].s:0}
