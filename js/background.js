'use strict';
/* =====================================================================
   background.js — temas cinematográficos, parallax con niebla de
   profundidad, iluminación, clima, puente, agua y post-procesado
   ===================================================================== */

const THEMES={
  sunset:{
    sky:['#160b2e','#5b1f47','#c2452f','#f5a623'],
    haze:'245,166,80',
    sun:{x:W-80,y:62,r:17,c:'#ffd75e',glow:'#ff9a40'},
    cloud:'rgba(255,180,140,.28)',far:'#2e1c3c',mid:'#46261f',near:'poles',
    gTop:'#6b5a2a',gDeep:'#3a2c10',gLine:'#8a7340',gDot:'#4a3a14',grass:'#5a6a20',weather:null
  },
  night:{
    sky:['#020208','#070b24','#10173d','#1d2a55'],
    haze:'70,90,160',
    stars:true,moon:{x:W-70,y:42,r:13},
    cloud:'rgba(120,130,190,.13)',far:'#0d0d28',mid:'#15153a',near:'none',
    gTop:'#23233c',gDeep:'#101020',gLine:'#34345a',gDot:'#15152a',grass:'#2a2a4a',weather:null
  },
  jungle:{
    sky:['#4fa8cf','#8ed4dd','#c6eee0','#eafbe8'],
    haze:'200,240,225',
    sun:{x:W-70,y:38,r:15,c:'#fff6c0',glow:'#ffeC90'},
    cloud:'rgba(255,255,255,.42)',far:'#4a7a5c',mid:'#35603f',near:'jungle',
    gTop:'#62803a',gDeep:'#33491c',gLine:'#7a9a4a',gDot:'#41541f',grass:'#3f7a28',weather:null
  },
  snow:{
    sky:['#42566f','#7e94ad','#b9c8d8','#e8eef4'],
    haze:'225,235,245',
    cloud:'rgba(255,255,255,.32)',far:'#73849e',mid:'#9fb0c6',near:'pines',
    gTop:'#dde6f0',gDeep:'#aebdd0',gLine:'#f4f8fc',gDot:'#aebfd2',grass:'#c4d2e2',weather:'snow'
  },
  base:{
    sky:['#0d0507','#2a0d12','#531b10','#7a3414'],
    haze:'200,90,40',
    fires:true,
    cloud:'rgba(90,55,50,.25)',far:'#200d12',mid:'#301418',near:'bunkers',
    gTop:'#4c4c55',gDeep:'#26262e',gLine:'#5e5e68',gDot:'#33333c',grass:'#444444',weather:'ember'
  }
};

/* estrellas fijas precalculadas */
const STARS=[];
for(let i=0;i<70;i++)STARS.push([Math.random()*W,Math.random()*150,Math.random()<0.2?2:1,Math.random()*6.28]);

function skyGradient(theme){
  if(!theme._g){
    theme._g=ctx.createLinearGradient(0,0,0,H);
    const n=theme.sky.length;
    theme.sky.forEach((c,i)=>theme._g.addColorStop(i/(n-1),c));
  }
  return theme._g;
}

/* franja de niebla atmosférica entre capas de parallax (gradiente cacheado) */
function hazeBand(theme,y0,y1,alpha,slot){
  const key='_hz'+slot;
  if(!theme[key]){
    const g=ctx.createLinearGradient(0,y0,0,y1);
    g.addColorStop(0,`rgba(${theme.haze},0)`);
    g.addColorStop(1,`rgba(${theme.haze},${alpha})`);
    theme[key]=g;
  }
  ctx.fillStyle=theme[key];
  ctx.fillRect(0,y0,W,y1-y0);
}

function drawBackground(theme,camX,t,mode){
  ctx.fillStyle=skyGradient(theme);
  ctx.fillRect(0,0,W,H);

  if(theme.stars){
    for(const[sx,sy,sr,ph]of STARS){
      ctx.globalAlpha=0.4+Math.sin(t*0.03+ph)*0.35;
      px(sx,sy,sr,sr,'#dde6ff');
    }
    ctx.globalAlpha=1;
  }
  if(theme.moon){
    glowCircle(theme.moon.x,theme.moon.y,theme.moon.r*3.2,'#9fb8ff',0.4);
    circle(theme.moon.x,theme.moon.y,theme.moon.r,'#e8f1ff');
    circle(theme.moon.x-4,theme.moon.y-2,theme.moon.r-3,'#cfdef2');
    circle(theme.moon.x+4,theme.moon.y+3,2,'#b6c8e0');
  }
  if(theme.sun){
    glowCircle(theme.sun.x,theme.sun.y,theme.sun.r*4,theme.sun.glow,0.55);
    glowCircle(theme.sun.x,theme.sun.y,theme.sun.r*1.7,theme.sun.c,0.8);
    circle(theme.sun.x,theme.sun.y,theme.sun.r,theme.sun.c);
  }

  /* nubes suaves (un solo trazado por capa) */
  ctx.fillStyle=theme.cloud;
  ctx.beginPath();
  for(let i=0;i<5;i++){
    const cx=((i*123-camX*0.05)%(W+140)+W+140)%(W+140)-70;
    const cy=18+i*16;
    ctx.moveTo(cx+12+i*3,cy);ctx.arc(cx,cy,12+i*3,0,Math.PI*2);
    ctx.moveTo(cx+20+i*2,cy-4);ctx.arc(cx+12,cy-4,8+i*2,0,Math.PI*2);
    ctx.moveTo(cx+33+i*2,cy+1);ctx.arc(cx+24,cy+1,9+i*2,0,Math.PI*2);
    ctx.moveTo(cx+41+i,cy+4);ctx.arc(cx+34,cy+4,7+i,0,Math.PI*2);
  }
  ctx.fill();

  /* sierra lejana */
  const farOff=((camX*0.08)%180+180)%180;
  ctx.fillStyle=theme.far;
  for(let i=-1;i<4;i++){
    const ox=i*180-farOff;
    ctx.beginPath();
    ctx.moveTo(ox,192);ctx.lineTo(ox+40,118);ctx.lineTo(ox+80,160);
    ctx.lineTo(ox+120,98);ctx.lineTo(ox+160,150);ctx.lineTo(ox+180,192);
    ctx.closePath();ctx.fill();
  }
  hazeBand(theme,120,195,0.3,1);

  /* colinas medias */
  const midOff=((camX*0.22)%200+200)%200;
  ctx.fillStyle=theme.mid;
  for(let i=-1;i<4;i++){
    const ox=i*200-midOff;
    ctx.beginPath();
    ctx.moveTo(ox,212);ctx.lineTo(ox+60,158);ctx.lineTo(ox+120,188);
    ctx.lineTo(ox+160,148);ctx.lineTo(ox+200,212);
    ctx.closePath();ctx.fill();
  }
  hazeBand(theme,170,218,0.2,2);

  /* hogueras en el horizonte (cuartel general) */
  if(theme.fires){
    for(let i=0;i<4;i++){
      const fx=((i*150-camX*0.22)%(W+120)+W+120)%(W+120)-60;
      const fl=0.4+Math.sin(t*0.12+i*2.1)*0.2;
      glowCircle(fx,206,18+Math.sin(t*0.09+i)*4,'#ff6a20',fl);
    }
  }

  /* elementos cercanos */
  drawNearLayer(theme,camX);

  /* suelo (en fase de jeep el suelo es el río; el puente va aparte) */
  if(mode==='jeep')drawRiver(t);
  else drawGroundStrip(theme,camX);
}

function drawNearLayer(theme,camX){
  const off=((camX*0.5)%96+96)%96;
  if(theme.near==='jungle'){
    for(let i=-1;i<7;i++){
      const ox=i*96-off;
      px(ox+38,202,5,21,'#2a1a08');
      ctx.fillStyle='#1a3a10';ctx.beginPath();ctx.arc(ox+40,198,12,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#2a5a20';ctx.beginPath();ctx.arc(ox+35,194,8,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#3a6a30';ctx.beginPath();ctx.arc(ox+44,192,5,0,Math.PI*2);ctx.fill();
      px(ox+70,214,2,9,'#2a4a18');
      px(ox+68,210,6,5,'#3a6a28');
    }
  }else if(theme.near==='pines'){
    for(let i=-1;i<7;i++){
      const ox=i*96-off;
      px(ox+40,212,4,11,'#3a2a18');
      ctx.fillStyle='#2c4438';
      ctx.beginPath();ctx.moveTo(ox+42,178);ctx.lineTo(ox+28,214);ctx.lineTo(ox+56,214);ctx.closePath();ctx.fill();
      ctx.fillStyle='#e8eef6';
      ctx.beginPath();ctx.moveTo(ox+42,178);ctx.lineTo(ox+34,196);ctx.lineTo(ox+50,196);ctx.closePath();ctx.fill();
    }
  }else if(theme.near==='poles'){
    for(let i=-1;i<7;i++){
      const ox=i*96-off;
      px(ox+50,188,3,37,'#241810');
      px(ox+42,192,19,2,'#241810');
      px(ox+44,190,2,2,'#3a2a1a');px(ox+58,190,2,2,'#3a2a1a');
    }
  }else if(theme.near==='bunkers'){
    for(let i=-1;i<7;i++){
      const ox=i*96-off;
      px(ox+20,196,52,29,'#22141a');
      px(ox+24,202,8,6,(i%2)?'#ffb030':'#4a2a20');
      px(ox+44,202,8,6,(i%3)?'#4a2a20':'#ff5030');
      if(i%2)glowCircle(ox+28,205,8,'#ffb030',0.3);
      px(ox+30,188,6,8,'#1a0e12');
      px(ox+60,192,3,33,'#1a0e12');
    }
  }
}

function drawGroundStrip(theme,camX){
  if(!theme._gg){
    theme._gg=ctx.createLinearGradient(0,GROUND,0,H);
    theme._gg.addColorStop(0,theme.gTop);
    theme._gg.addColorStop(1,theme.gDeep);
  }
  ctx.fillStyle=theme._gg;
  ctx.fillRect(0,GROUND,W,H-GROUND);
  px(0,GROUND,W,2,theme.gLine);
  const gOff=((camX)%24+24)%24;
  for(let i=0;i<W/24+2;i++){
    px(i*24-gOff,GROUND+6,5,2,theme.gDot);
    px(i*24-gOff+12,GROUND+14,4,2,theme.gDot);
    px(i*24-gOff+6,GROUND+22,6,2,theme.gDot);
    px(i*24-gOff+16,GROUND+30,5,2,theme.gDot);
  }
  for(let i=0;i<W/12+1;i++){
    const gx=i*12-(gOff%12);
    px(gx,GROUND-2,2,3,theme.grass);
    px(gx+5,GROUND-1,1,2,theme.grass);
  }
}

/* río bajo el puente (fase jeep) */
let _riverG=null;
function drawRiver(t){
  const top=GROUND+10;
  if(!_riverG){
    _riverG=ctx.createLinearGradient(0,top,0,H);
    _riverG.addColorStop(0,'#1d5d86');
    _riverG.addColorStop(0.45,'#0e3a57');
    _riverG.addColorStop(1,'#061f30');
  }
  ctx.fillStyle=_riverG;
  ctx.fillRect(0,top,W,H-top);
  ctx.strokeStyle='rgba(120,190,255,0.3)';ctx.lineWidth=1;
  for(let r=0;r<4;r++){
    ctx.beginPath();
    const wy=top+6+r*9;
    ctx.moveTo(0,wy);
    for(let x=0;x<=W;x+=10)
      ctx.lineTo(x,wy+Math.sin((x+t*1.6)*0.08+r*2)*1.8);
    ctx.stroke();
  }
  /* destellos especulares */
  ctx.save();
  ctx.globalCompositeOperation='lighter';
  for(let i=0;i<9;i++){
    const gx=((i*57+t*0.9)%(W+30))-15;
    const gy=top+5+(i*37)%26;
    ctx.globalAlpha=0.05+0.05*Math.sin(t*0.06+i*1.7);
    px(gx,gy,10+i%5,1,'#bfe4ff');
  }
  ctx.restore();
}

/* puente de madera (coordenadas de mundo) */
function drawBridge(gaps,camX,t){
  const a=camX-30,b=camX+W+30;
  const solids=[];
  let cur=a;
  for(const g of gaps){
    if(g.x+g.w<a)continue;
    if(g.x>b)break;
    if(g.x>cur)solids.push([cur,Math.min(g.x,b)]);
    cur=Math.max(cur,g.x+g.w);
  }
  if(cur<b)solids.push([cur,b]);
  for(const[s0,s1]of solids){
    const w=s1-s0;
    px(s0,GROUND-9,w,2,'#5d4322');
    for(let x=Math.floor(s0/26)*26;x<s1;x+=26)px(x,GROUND-9,2,9,'#4a3014');
    px(s0,GROUND,w,3,'#8a6a38');
    px(s0,GROUND+3,w,4,'#6a4a22');
    for(let x=Math.floor(s0/12)*12;x<s1;x+=12)px(x,GROUND,1,7,'#4a3014');
    for(let x=Math.floor(s0/52)*52;x<s1;x+=52){
      px(x+2,GROUND+7,4,34,'#3c2810');
      px(x-6,GROUND+22,20,3,'#3c2810');
    }
    /* sombra del puente sobre el agua */
    ctx.fillStyle='rgba(0,10,20,0.25)';
    ctx.fillRect(s0,GROUND+10,w,5);
  }
  for(const g of gaps){
    if(g.x+g.w<a||g.x>b)continue;
    px(g.x-3,GROUND-2,3,9,'#221610');
    px(g.x+g.w,GROUND-2,3,9,'#221610');
    px(g.x,GROUND+2,2,8,'#332014');
    px(g.x+g.w-2,GROUND+3,2,6,'#332014');
  }
}

/* agua en los huecos (fases a pie) — coordenadas de mundo */
let _gwN=null,_gwS=null;
function _gapGrad(snow){
  let g=snow?_gwS:_gwN;
  if(!g){
    g=ctx.createLinearGradient(0,GROUND,0,H);
    if(snow){
      g.addColorStop(0,'rgba(170,210,245,.9)');
      g.addColorStop(1,'rgba(70,110,160,.95)');
      _gwS=g;
    }else{
      g.addColorStop(0,'rgba(40,105,170,.85)');
      g.addColorStop(1,'rgba(8,35,65,.95)');
      _gwN=g;
    }
  }
  return g;
}
function drawGapsWater(gaps,camX,t,themeName){
  for(const g of gaps){
    if(g.x+g.w<camX-40||g.x>camX+W+40)continue;
    const grad=_gapGrad(themeName==='snow');
    px(g.x,GROUND,g.w,H-GROUND,'#0a1410');
    ctx.fillStyle=grad;
    ctx.fillRect(g.x,GROUND+5,g.w,H-GROUND-5);
    ctx.strokeStyle='rgba(150,210,255,.4)';ctx.lineWidth=1;
    for(let r=0;r<2;r++){
      ctx.beginPath();
      const wy=GROUND+9+r*9;
      ctx.moveTo(g.x,wy);
      for(let x=0;x<=g.w;x+=8)
        ctx.lineTo(g.x+x,wy+Math.sin((x+t*2)*0.25+r)*1.5);
      ctx.stroke();
    }
    /* destello */
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=0.08+0.05*Math.sin(t*0.07+g.x);
    px(g.x+4,GROUND+7,g.w-8,1,'#cfeaff');
    ctx.restore();
    px(g.x-1,GROUND,2,5,'#3a2a14');
    px(g.x+g.w-1,GROUND,2,5,'#3a2a14');
  }
}

/* clima (espacio de pantalla) */
function drawWeather(theme,t){
  if(!theme.weather)return;
  if(theme.weather==='snow'){
    ctx.fillStyle='rgba(255,255,255,0.85)';
    for(let i=0;i<55;i++){
      const sp=0.4+(i%5)*0.14;
      const x=(((i*53+Math.sin(t*0.01+i)*14+t*sp*0.6)%W)+W)%W;
      const y=(i*97+t*sp)%H;
      const s=i%4===0?2:1;
      ctx.fillRect(x,y,s,s);
    }
  }else if(theme.weather==='ember'){
    for(let i=0;i<26;i++){
      const sp=0.3+(i%5)*0.12;
      const x=(((i*71+Math.sin(t*0.02+i)*10)%W)+W)%W;
      const y=H-((i*53+t*sp)%(H+20));
      ctx.globalAlpha=0.35+Math.sin(t*0.1+i)*0.25;
      ctx.fillStyle=i%3?'#ff7733':'#ffbb44';
      ctx.fillRect(x,y,i%4===0?2:1,i%4===0?2:1);
    }
    ctx.globalAlpha=1;
  }
}

/* gradación de color cinematográfica (teal & orange sutil) */
let _gradeG=null;
function drawGrade(){
  if(!_gradeG){
    _gradeG=ctx.createLinearGradient(0,0,0,H);
    _gradeG.addColorStop(0,'rgba(70,150,255,0.06)');
    _gradeG.addColorStop(0.55,'rgba(0,0,0,0)');
    _gradeG.addColorStop(1,'rgba(255,140,40,0.05)');
  }
  ctx.fillStyle=_gradeG;
  ctx.fillRect(0,0,W,H);
}

/* viñeta y scanlines cacheadas */
let _vigCv=null,_scanCv=null;
function drawVignette(){
  if(!_vigCv){
    /* renderizada a resolución nativa para evitar bandeado al escalar */
    _vigCv=document.createElement('canvas');
    _vigCv.width=W*RES;_vigCv.height=H*RES;
    const c=_vigCv.getContext('2d');
    const g=c.createRadialGradient(W*RES/2,H*RES/2,W*RES*0.38,W*RES/2,H*RES/2,W*RES*0.74);
    g.addColorStop(0,'rgba(0,0,0,0)');
    g.addColorStop(1,'rgba(0,0,0,0.22)');
    c.fillStyle=g;c.fillRect(0,0,W*RES,H*RES);
  }
  ctx.drawImage(_vigCv,0,0,W,H);
}
function drawScanlines(){
  if(!_scanCv){
    _scanCv=document.createElement('canvas');
    _scanCv.width=W*RES;_scanCv.height=H*RES;
    const c=_scanCv.getContext('2d');
    c.fillStyle='rgba(0,0,0,0.09)';
    for(let y=0;y<H*RES;y+=3)c.fillRect(0,y,W*RES,1);
    c.fillStyle='rgba(120,255,150,0.016)';
    for(let y=1;y<H*RES;y+=3)c.fillRect(0,y,W*RES,1);
  }
  ctx.drawImage(_scanCv,0,0,W,H);
}
