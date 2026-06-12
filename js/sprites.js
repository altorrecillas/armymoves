'use strict';
/* =====================================================================
   sprites.js — dibujo de sprites pixel-art y texto
   ===================================================================== */

function px(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x|0,y|0,w|0,h|0)}
function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x|0,y|0,r,0,Math.PI*2);ctx.fill()}

/* halo luminoso aditivo (iluminación moderna) */
function glowCircle(x,y,r,color,alpha=0.6){
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,color);
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.globalCompositeOperation='lighter';
  ctx.fillStyle=g;
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

/* panel translúcido redondeado (HUD/menús) */
function panel(x,y,w,h,r=6,fill='rgba(8,14,18,0.55)',stroke='rgba(150,255,170,0.16)'){
  ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);
  else ctx.rect(x,y,w,h);
  ctx.fillStyle=fill;ctx.fill();
  ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();
}

/* barra con degradado y cantos redondeados */
function bar(x,y,w,h,pct,c1,c2){
  panel(x,y,w,h,h/2,'rgba(0,0,0,0.5)','rgba(255,255,255,0.12)');
  const ww=Math.max(0,(w-2)*clamp(pct,0,1));
  if(ww>1){
    const g=ctx.createLinearGradient(0,y,0,y+h);
    g.addColorStop(0,c1);g.addColorStop(1,c2);
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(x+1,y+1,ww,h-2,(h-2)/2);
    else ctx.rect(x+1,y+1,ww,h-2);
    ctx.fillStyle=g;ctx.fill();
  }
}

/* sombra suave elíptica en el suelo */
function softShadow(cx,gy,wd,alpha){
  ctx.fillStyle=`rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(cx,gy,wd,Math.max(1.5,wd*0.22),0,0,Math.PI*2);
  ctx.fill();
}

function drawPattern(pat,x,y,color,scale=1){
  for(let r=0;r<pat.length;r++)
    for(let c=0;c<pat[r].length;c++)
      if(pat[r][c]==='1')px(x+c*scale,y+r*scale,scale,scale,color);
}

const HEART=['0110110','1111111','1111111','0111110','0011100','0001000'];

function text(s,x,y,size=8,color='#fff',align='left',weight='bold'){
  ctx.font=`${weight} ${size}px "Courier New",monospace`;
  ctx.textAlign=align;ctx.textBaseline='top';
  ctx.fillStyle='#000';ctx.fillText(s,x+1,y+1);
  ctx.fillStyle=color;ctx.fillText(s,x,y);
  ctx.textAlign='left';
}

function textGlow(s,x,y,size,color,glow,align='center'){
  ctx.save();
  ctx.shadowColor=glow;ctx.shadowBlur=10;
  ctx.font=`bold ${size}px "Courier New",monospace`;
  ctx.textAlign=align;ctx.textBaseline='top';
  ctx.fillStyle='#000';ctx.fillText(s,x+2,y+2);
  ctx.fillStyle=color;ctx.fillText(s,x,y);
  ctx.restore();
  ctx.textAlign='left';
}

/* ---------- soldado jugador ---------- */
function drawSoldier(x,y,frame,facing,crouching){
  ctx.save();
  if(facing<0){ctx.translate(2*x+16,0);ctx.scale(-1,1)}
  if(crouching){
    px(x+3,y+1,10,4,'#2d5016');
    px(x+4,y+5,6,3,'#d4a574');
    px(x+7,y+6,1,1,'#000');
    px(x+2,y+8,12,5,'#4a5d23');
    px(x+3,y+9,3,2,'#2d5016');
    px(x+14,y+8,5,2,'#1a1a1a');
    px(x+3,y+13,4,3,'#3a4a1e');
    px(x+9,y+13,4,3,'#3a4a1e');
    ctx.restore();return;
  }
  const legPhase=Math.sin(frame*0.5);
  px(x+4,y,8,4,'#2d5016');
  px(x+4,y+1,8,3,'#3a6b1e');
  px(x+3,y+2,1,2,'#2d5016');
  px(x+4,y+3,8,1,'#5d4016');
  px(x+5,y+4,6,4,'#d4a574');
  px(x+5,y+4,6,1,'#b8865f');
  px(x+8,y+5,1,1,'#000');
  px(x+7,y+7,3,1,'#a0704a');
  px(x+3,y+8,10,7,'#4a5d23');
  px(x+4,y+9,2,2,'#2d5016');
  px(x+8,y+10,3,2,'#5d7a30');
  px(x+5,y+12,2,2,'#2d5016');
  px(x+9,y+8,2,1,'#5d7a30');
  px(x+3,y+14,10,1,'#3a2a10');
  px(x+1,y+8,2,5,'#4a5d23');
  px(x+1,y+13,2,2,'#d4a574');
  px(x+12,y+8,3,4,'#4a5d23');
  px(x+13,y+9,7,2,'#2a2a2a');
  px(x+18,y+8,2,1,'#444');
  px(x+19,y+10,1,2,'#333');
  px(x+13,y+12,2,2,'#d4a574');
  const l1=legPhase*1.5|0, l2=-legPhase*1.5|0;
  px(x+4,y+15+l1,4,6,'#3a4a1e');
  px(x+8,y+15+l2,4,6,'#3a4a1e');
  px(x+5,y+18+l1,2,2,'#2d3a16');
  px(x+9,y+18+l2,2,2,'#2d3a16');
  px(x+3,y+21+l1,5,2,'#1a1a1a');
  px(x+8,y+21+l2,5,2,'#1a1a1a');
  ctx.restore();
}

/* ---------- soldado enemigo ---------- */
function drawEnemySoldier(x,y,frame,facing,type){
  ctx.save();
  if(facing>0){ctx.translate(2*x+14,0);ctx.scale(-1,1)}
  let col,colL;
  if(type==='red'){col='#6b1a1a';colL='#a02020'}
  else if(type==='brown'){col='#5d4016';colL='#8b6016'}
  else{col='#1a1a4a';colL='#3030a0'}
  px(x+3,y,8,3,col);
  px(x+2,y+1,10,2,colL);
  px(x+3,y,8,1,'#333');
  px(x+4,y+3,6,3,'#c49464');
  px(x+5,y+4,1,1,'#000');
  px(x+2,y+6,10,8,col);
  px(x+3,y+7,4,2,colL);
  px(x+7,y+9,3,2,colL);
  px(x+3,y+6,8,1,'#333');
  px(x-4,y+8,7,2,'#222');
  px(x-5,y+7,1,1,'#333');
  const lf=Math.sin(frame*0.15)*1|0;
  px(x+3,y+14,3,6+lf,col);
  px(x+7,y+14,3,6-lf,col);
  px(x+2,y+20+lf,4,2,'#111');
  px(x+7,y+20-lf,4,2,'#111');
  ctx.restore();
}

/* ---------- helicóptero (enemigo mira a la izq; amigo a la dcha) ---------- */
function drawHeli(x,y,frame,facing=-1,friendly=false){
  ctx.save();
  if(facing>0){ctx.translate(2*x+48,0);ctx.scale(-1,1)}
  const rot=Math.sin(frame*0.9)>0;
  const body=friendly?'#2a4016':'#3a2424';
  const body2=friendly?'#3a5525':'#4d3030';
  const body3=friendly?'#4a6535':'#5d3a3a';
  ctx.globalAlpha=0.3;px(x+5,y-3,36,3,'#000');ctx.globalAlpha=1;
  if(rot)px(x+5,y-2,36,2,'#999');
  else px(x+15,y-2,16,2,'#777');
  px(x+22,y-2,2,3,'#444');
  px(x+10,y,26,12,body);
  px(x+11,y+1,24,10,body2);
  px(x+12,y+2,22,8,body3);
  px(x+12,y+2,8,6,'#66aadd');
  px(x+12,y+2,8,1,'#88ccff');
  px(x+13,y+3,2,1,'#fff');
  const star=friendly?'#ffcc00':'#dd2222';
  px(x+24,y+4,3,1,star);
  px(x+25,y+3,1,3,star);
  px(x+36,y+3,12,4,body);
  px(x+36,y+4,12,2,body2);
  px(x+46,y+1,3,10,rot?'#777':'#444');
  px(x+47,y+4,1,4,'#555');
  px(x+8,y+12,28,2,'#222');
  px(x+12,y+11,2,2,'#222');
  px(x+30,y+11,2,2,'#222');
  px(x+18,y+12,2,3,'#333');
  ctx.restore();
}

/* ---------- tanque enemigo ---------- */
function drawTank(x,y,frame){
  px(x,y+14,40,8,'#222');
  px(x+1,y+15,38,6,'#333');
  for(let i=0;i<5;i++){
    circle(x+5+i*8,y+18,3,'#444');
    circle(x+5+i*8,y+18,1.5,'#222');
  }
  px(x+3,y+6,34,9,'#4a5020');
  px(x+4,y+7,32,7,'#5a6530');
  px(x+12,y,16,7,'#3a4518');
  px(x+13,y+1,14,5,'#4a5528');
  px(x-4,y+2,16,3,'#2a2a2a');
  px(x-5,y+1,2,5,'#333');
  px(x+18,y-1,4,2,'#333');
  px(x+33,y+8,2,2,'#ffcc00');
}

/* ---------- torreta ---------- */
function drawTurret(x,y,frame){
  px(x-3,y+12,22,4,'#7a6a3a');
  px(x-2,y+9,6,4,'#8a7a4a');
  px(x+12,y+9,6,4,'#8a7a4a');
  px(x,y+5,16,8,'#4a4a4a');
  px(x+1,y+6,14,6,'#5a5a5a');
  px(x+3,y+1,10,5,'#666');
  px(x+4,y+2,8,3,'#777');
  px(x-7,y+3,9,3,'#333');
  px(x+6,y+3,5,2,'#aaccee');
}

/* ---------- jeep del jugador (mira a la derecha) ---------- */
function drawPlayerJeep(x,y,frame){
  const rot=(frame>>2)%2;
  px(x+2,y-6,2,6,'#333');
  px(x,y-7,9,2,'#222');
  px(x+9,y-7,2,2,'#444');
  px(x+7,y-4,6,4,'#2d5016');
  px(x+8,y,4,3,'#d4a574');
  px(x+7,y+3,6,4,'#4a5d23');
  px(x,y+6,34,8,'#3f5220');
  px(x+1,y+7,32,6,'#55702c');
  px(x+26,y+8,8,4,'#33451a');
  px(x+20,y+1,2,6,'#222');
  px(x+14,y+1,7,6,'#9fd4f0');
  px(x+14,y+1,2,6,'#cfeeff');
  px(x+5,y+8,3,2,'#2d5016');
  px(x+33,y+9,1,2,'#ffee88');
  px(x+15,y+13,2,1,'#ffcc00');
  circle(x+7,y+15,4.5,'#1a1a1a');
  circle(x+7,y+15,2.5,rot?'#555':'#3a3a3a');
  circle(x+7,y+15,1,'#777');
  circle(x+27,y+15,4.5,'#1a1a1a');
  circle(x+27,y+15,2.5,rot?'#3a3a3a':'#555');
  circle(x+27,y+15,1,'#777');
}

/* ---------- jeep enemigo (mira a la izquierda) ---------- */
function drawEnemyJeep(x,y,frame,dir=-1){
  ctx.save();
  if(dir>0){ctx.translate(2*x+34,0);ctx.scale(-1,1)}
  const rot=(frame>>2)%2;
  px(x+23,y-4,6,4,'#5d1a1a');
  px(x+24,y,4,3,'#c49464');
  px(x+25,y-6,2,6,'#333');
  px(x+18,y-7,9,2,'#222');
  px(x,y+6,34,8,'#4d2020');
  px(x+1,y+7,32,6,'#6b2a2a');
  px(x,y+8,8,4,'#3a1414');
  px(x+12,y+1,2,6,'#222');
  px(x+13,y+1,7,6,'#9fb4c0');
  px(x,y+9,1,2,'#ffee88');
  circle(x+7,y+15,4.5,'#1a1a1a');
  circle(x+7,y+15,2.5,rot?'#555':'#3a3a3a');
  circle(x+27,y+15,4.5,'#1a1a1a');
  circle(x+27,y+15,2.5,rot?'#3a3a3a':'#555');
  ctx.restore();
}

/* ---------- caza enemigo (vuela hacia la izquierda) ---------- */
function drawPlane(x,y,frame){
  px(x+4,y+3,26,4,'#5a5a6a');
  px(x+5,y+4,24,2,'#7a7a8a');
  px(x,y+4,4,2,'#3a3a4a');
  px(x+8,y+1,6,3,'#88ccee');
  px(x+14,y+5,10,3,'#4a4a5a');
  px(x+16,y,8,3,'#4a4a5a');
  px(x+28,y,4,4,'#4a4a5a');
  const fl=frame%4<2;
  px(x+30,y+4,fl?6:4,2,fl?'#ffaa33':'#ff6633');
  px(x+30,y+4,2,2,'#ffee88');
  glowCircle(x+33,y+5,7,'#ff9a40',fl?0.5:0.35);
  px(x+18,y+6,3,1,'#cc3333');
}

/* ---------- lanzamisiles SAM ---------- */
function drawSam(x,y,frame,charging){
  px(x,y+14,26,6,'#2a2a2a');
  for(let i=0;i<4;i++)circle(x+4+i*6,y+17,2.5,'#444');
  px(x+2,y+8,18,7,'#3a4518');
  px(x+3,y+9,16,5,'#4a5528');
  px(x+8,y+6,6,2,'#555');
  px(x+12,y+4,6,2,'#555');
  px(x+16,y+2,6,2,'#555');
  px(x+14,y,8,2,charging?'#ff5533':'#888');
  px(x+22,y,2,2,'#ccc');
  if(charging)px(x+12,y-2,4,2,'#ffaa00');
}

/* ---------- mina ---------- */
function drawMine(x,y){
  px(x+2,y+4,8,4,'#3a3a3a');
  px(x+3,y+3,6,1,'#4a4a4a');
  px(x+4,y+2,4,1,'#555');
  px(x+5,y+1,2,1,'#f00');
}

/* ---------- caja de power-up ---------- */
function drawPickupBox(type,x,y,t){
  const bob=Math.sin(t*0.08)*2;
  const py=y+bob;
  px(x,py,14,14,'#caa520');
  px(x+1,py+1,12,12,'#ffdd44');
  px(x+1,py+1,12,2,'#ffeeaa');
  if(type==='health'){px(x+5,py+3,4,8,'#dd1111');px(x+3,py+5,8,4,'#dd1111')}
  else if(type==='grenade'){px(x+4,py+5,6,6,'#3a5a20');px(x+5,py+3,4,2,'#888')}
  else if(type==='rapid'){px(x+3,py+6,8,3,'#0088dd');px(x+9,py+4,3,3,'#00ccff');px(x+3,py+4,2,2,'#00ccff')}
  else if(type==='shield'){circle(x+7,py+7,5,'#0099aa');circle(x+7,py+7,3,'#66ffff')}
  else if(type==='life'){drawPattern(HEART,x+4,py+4,'#ff3355')}
  glowCircle(x+7,py+7,13,'#ffe9a0',0.35+Math.sin(t*0.1)*0.18);
}

/* ---------- JEFE: super-tanque ---------- */
function drawBossTank(x,y,frame){
  px(x,y+22,60,18,'#2c1a1a');
  px(x+2,y+24,56,14,'#3e2626');
  for(let i=0;i<7;i++){
    circle(x+6+i*8,y+34,4,'#4a4a4a');
    circle(x+6+i*8,y+34,2,'#2a2a2a');
  }
  px(x+4,y+12,52,12,'#4e2020');
  px(x+6,y+14,48,8,'#5e2c2c');
  px(x+14,y,28,14,'#5a2020');
  px(x+16,y+2,24,10,'#6a3030');
  px(x-14,y+6,30,4,'#2a2a2a');
  px(x-16,y+5,3,6,'#383838');
  px(x+20,y+4,9,6,'#ff3333');
  px(x+22,y+6,5,2,'#ffaaaa');
  px(x+44,y-4,3,6,'#444');
  px(x+43,y-6,5,2,'#666');
  if(frame%30<6)px(x+45,y-8,2,2,'#f00');
}

/* ---------- JEFE: helicóptero pesado ---------- */
function drawBossHeli(x,y,frame){
  const rot=Math.sin(frame*0.9)>0;
  ctx.globalAlpha=0.3;px(x+2,y-4,58,3,'#000');ctx.globalAlpha=1;
  if(rot)px(x+2,y-3,58,2,'#999');else px(x+18,y-3,26,2,'#777');
  px(x+30,y-3,2,4,'#444');
  px(x+6,y,50,18,'#3a2030');
  px(x+8,y+2,46,14,'#4c2a40');
  px(x+10,y+4,42,10,'#5e3450');
  px(x+8,y+3,12,8,'#ff8866');
  px(x+9,y+4,10,3,'#ffbbaa');
  px(x+30,y+6,5,5,'#dd2222');
  px(x+54,y+4,10,6,'#3a2030');
  px(x+62,y,3,14,rot?'#777':'#444');
  px(x+4,y+18,52,3,'#222');
  px(x+10,y+16,4,4,'#333');
  px(x+44,y+16,4,4,'#333');
  px(x+2,y+10,6,4,'#222');
  px(x+0,y+11,4,2,'#333');
  if(frame%24<5){px(x+30,y+20,3,3,'#ffaa00')}
}

/* ---------- JEFE FINAL: fortaleza ---------- */
function drawFortress(x,y,frame,phase){
  const h=90;
  px(x,y,70,h,'#3c3c44');
  px(x+3,y+3,64,h-6,'#4a4a54');
  for(let r=0;r<8;r++)
    for(let c=0;c<4;c++)
      px(x+6+c*16,y+6+r*10,13,7,(r+c)%2?'#52525e':'#444450');
  for(let i=0;i<9;i++)px(x+i*8,y+h-6,4,6,'#c8a000');
  px(x+24,y+h-28,22,28,'#1c1c22');
  px(x+26,y+h-26,18,26,'#26262e');
  px(x+26,y+h-26,18,3,'#3a3a44');
  px(x-6,y+14,10,8,'#333');
  px(x-10,y+16,6,4,'#222');
  px(x-6,y+40,10,8,'#333');
  px(x-10,y+42,6,4,'#222');
  px(x-6,y+64,10,8,'#333');
  px(x-10,y+66,6,4,'#222');
  const blink=(frame%(phase?16:30))<((phase?8:6));
  px(x+28,y+26,14,12,'#222');
  circle(x+35,y+32,5,blink?'#ff2222':'#771111');
  circle(x+35,y+32,2,blink?'#ffaaaa':'#aa4444');
  px(x+33,y-12,3,12,'#666');
  px(x+30,y-14,9,2,'#777');
  if(frame%20<10)px(x+34,y-17,2,2,'#f00');
}

/* ---------- bandera de meta ---------- */
function drawFlag(x,y,t){
  px(x,y-46,3,46,'#888');
  px(x-1,y-48,5,3,'#aaa');
  for(let c=0;c<22;c++){
    const wave=Math.sin(t*0.15+c*0.4)*2;
    px(x+3+c,y-44+wave,1,12,c%8<4?'#ddc010':'#cc2020');
  }
}
