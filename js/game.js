'use strict';
/* =====================================================================
   game.js — máquina de estados, misiones, bucle principal,
   colisiones, cámara, HUD y menús
   ===================================================================== */

const MISSIONS=[
  {mode:'jeep',name:'EL PUENTE DEL DIABLO',theme:'sunset',len:3600,boss:null,
   brief:['Conduce el jeep blindado a través del',
          'puente. Salta los tramos derruidos,',
          'esquiva las minas y derriba a los',
          'helicópteros bombarderos.',
          '',
          'DISPARO: ametralladora  ·  ESPECIAL: antiaéreo']},
  {mode:'heli',name:'HALCÓN NOCTURNO',theme:'night',len:4200,boss:null,
   brief:['Pilota el helicóptero de asalto tras',
          'las líneas enemigas, al amparo de la',
          'noche. Esquiva cazas y misiles SAM.',
          '',
          'DISPARO: ametralladora  ·  ESPECIAL: bombas']},
  {mode:'foot',name:'SELVA HOSTIL',theme:'jungle',len:3400,boss:'bosstank',
   brief:['Continúa a pie por la selva. Cuidado',
          'con minas, trincheras y patrullas.',
          'Un super-tanque custodia la salida.',
          '',
          'DISPARO: rifle  ·  ESPECIAL: granada']},
  {mode:'foot',name:'PASO HELADO',theme:'snow',len:3600,boss:'bossheli',
   brief:['Cruza la cordillera bajo la ventisca.',
          'La visibilidad es escasa y el enemigo',
          'patrulla con helicópteros pesados.',
          '',
          'Derriba al APACHE ROJO para avanzar.']},
  {mode:'foot',name:'CUARTEL GENERAL',theme:'base',len:3200,boss:'fortress',
   brief:['Última misión: infíltrate en el cuartel',
          'general enemigo y roba los planes',
          'secretos. La fortaleza está fuertemente',
          'defendida.',
          '',
          '¡Buena suerte, soldado!']}
];

let state='title', stTime=0, frame=0, paused=false;
let run=null, world=null, player=null;

/* ---------------- gestión de partida ---------------- */
function newRun(){
  run={score:0,lives:3,grenades:5,stage:0,
       kills:0,shots:0,hits:0,combo:0,comboT:0,
       continues:2,saved:false};
}

function startStage(idx){
  const m=MISSIONS[idx];
  world={
    mission:m,mode:m.mode,theme:THEMES[m.theme],themeName:m.theme,len:m.len,
    time:0,cam:{x:0,shake:0},flash:0,
    enemies:[],bullets:[],grenades:[],particles:[],explosions:[],pickups:[],popups:[],
    gaps:[],rocks:[],mines:[],
    bossActive:false,bossDead:false,boss:null,bossRect:null,
    camLock:0,clearT:0,bonus:0,ended:false,
    spawnT:90,heliT:m.mode==='jeep'?240:420,tankT:900,
    planeT:100,jeepT:260,samNext:600,
    solidAt(x){
      for(const g of this.gaps)if(x>g.x&&x<g.x+g.w)return false;
      return true;
    }
  };
  generateTerrain(m);
  player=m.mode==='foot'?new FootPlayer():m.mode==='jeep'?new JeepPlayer():new HeliPlayer();
  paused=false;
  setState('play');
  Music.play('action');
}

function generateTerrain(m){
  const w=world;
  if(m.mode==='foot'){
    let x=340;
    while(x<m.len-420){
      const r=Math.random();
      if(r<0.24){const gw=irnd(36,60);w.gaps.push({x,w:gw});x+=gw+irnd(70,120)}
      else if(r<0.44){w.rocks.push({x,w:irnd(18,26),h:irnd(12,18)});x+=irnd(70,130)}
      else if(r<0.60){w.mines.push({x,live:true});x+=irnd(80,140)}
      else if(r<0.74){w.pickups.push(new Pickup(pick(['health','grenade','rapid','shield']),x,GROUND-17));x+=irnd(100,170)}
      else x+=irnd(50,110);
    }
  }else if(m.mode==='jeep'){
    let x=420;
    while(x<m.len-500){
      x+=irnd(170,330);
      const gw=irnd(34,76);
      w.gaps.push({x,w:gw});
      x+=gw;
      if(Math.random()<0.4)w.mines.push({x:x+irnd(60,120),live:true});
      if(Math.random()<0.35)w.pickups.push(new Pickup(pick(['health','rapid','shield']),x+irnd(40,100),GROUND-48));
    }
  }else{
    for(let x=500;x<m.len-300;x+=irnd(300,520))
      w.pickups.push(new Pickup(pick(['health','rapid','shield','life']),x,irnd(40,160)));
  }
  w.gaps.sort((a,b)=>a.x-b.x);
}

/* ---------------- director de oleadas ---------------- */
function directSpawn(){
  const w=world,cam=w.cam.x,st=run.stage;
  if(w.bossActive||w.ended)return;
  const prog=clamp(cam/(w.len-W),0,1);

  if(w.mode==='foot'){
    if(w.mission.boss&&prog>0.93){spawnBoss();return}
    if(--w.spawnT<=0){
      const x=cam+W+30;
      const r=Math.random();
      if(r<0.62)w.enemies.push(new Enemy('foot',x));
      else if(r<0.82){if(w.solidAt(x+8))w.enemies.push(new Enemy('turret',x))}
      else w.enemies.push(new Enemy('foot',cam-24)); // por la espalda
      w.spawnT=Math.max(34,86-st*6-prog*26)+irnd(0,18);
    }
    if(--w.heliT<=0){
      w.enemies.push(new Enemy('heli',cam+W+60));
      w.heliT=Math.max(220,430-st*36)+irnd(0,80);
    }
    if(--w.tankT<=0&&st>=2){
      w.enemies.push(new Enemy('tank',cam+W+70));
      w.tankT=Math.max(420,760-st*50);
    }
  }else if(w.mode==='jeep'){
    if(--w.jeepT<=0){
      const front=Math.random()<0.6;
      const x=front?cam+W+40:cam-50;
      if(w.solidAt(x)&&w.solidAt(x+34))w.enemies.push(new Enemy('ejeep',x,undefined,{dir:front?-1:1}));
      w.jeepT=170+irnd(0,140);
    }
    if(--w.heliT<=0){
      w.enemies.push(new Enemy('heli',cam+W+60));
      w.heliT=210+irnd(0,150);
    }
    if(--w.spawnT<=0){
      const x=cam+W+30;
      if(w.solidAt(x+8))w.enemies.push(new Enemy('foot',x));
      w.spawnT=140+irnd(0,90);
    }
  }else{ /* heli */
    if(--w.planeT<=0){
      w.enemies.push(new Enemy('plane',cam+W+40,irnd(24,150)));
      w.planeT=Math.max(50,110-prog*45)+irnd(0,50);
    }
    if(--w.heliT<=0){
      w.enemies.push(new Enemy('heli',cam+W+60,irnd(30,120)));
      w.heliT=270+irnd(0,140);
    }
    if(cam>w.samNext){
      w.enemies.push(new Enemy('sam',cam+W+40));
      w.samNext=cam+irnd(420,640);
    }
  }
}

function spawnBoss(){
  const w=world;
  w.bossActive=true;
  w.camLock=Math.min(w.cam.x,w.len-W);
  const kind=w.mission.boss;
  let b;
  if(kind==='bosstank'){
    b=new Enemy('bosstank',w.camLock+W+30);
    b.targetX=w.camLock+W-130;
  }else if(kind==='bossheli'){
    b=new Enemy('bossheli',w.camLock+W/2+60);
  }else{
    b=new Enemy('fortress',w.camLock+W-90);
  }
  w.boss=b;
  w.enemies.push(b);
  Sfx.alarm();
  Music.play('boss');
}

/* ---------------- actualización de la fase ---------------- */
function updatePlay(){
  const w=world;
  w.time++;

  player.update();
  if(state!=='play')return; // gameOver pudo dispararse

  if(!w.bossDead)directSpawn();

  /* enemigos */
  for(const e of w.enemies)if(!e.dead)e.update();
  w.enemies=w.enemies.filter(e=>!e.dead&&e.x>w.cam.x-280&&e.x<w.cam.x+W+460);

  updateBullets();

  for(const g of w.grenades)g.update();
  w.grenades=w.grenades.filter(g=>!g.done);

  updateFx();

  /* cámara */
  if(w.mode==='heli'){
    w.cam.x=Math.min(w.cam.x+HELI_SCROLL,w.len-W);
  }else{
    const camMax=w.bossActive?w.camLock:w.len-W;
    const target=clamp(player.x-W*0.38,0,camMax);
    w.cam.x+=(target-w.cam.x)*0.25;
  }
  if(w.cam.shake>0){w.cam.shake*=0.86;if(w.cam.shake<0.4)w.cam.shake=0}
  if(w.flash>0)w.flash--;

  handleCollisions();
  if(state!=='play')return;

  if(run.comboT>0){run.comboT--;if(run.comboT===0)run.combo=0}

  /* secuencia de muerte del jefe */
  if(w.bossDead&&!w.ended){
    w.clearT--;
    if(w.clearT>40&&w.clearT%9===0&&w.bossRect){
      spawnExplosion(w.bossRect.x+rnd(0,w.bossRect.w),w.bossRect.y+rnd(0,w.bossRect.h),Math.random()<0.3);
      Sfx.explode(false,w.bossRect.x+w.bossRect.w/2);
    }
    if(w.clearT<=0){stageClear();return}
  }

  /* fin de fase sin jefe */
  if(!w.mission.boss){
    if(w.mode==='heli'&&w.cam.x>=w.len-W-1){stageClear();return}
    if(w.mode==='jeep'&&player.x>=w.len-70){stageClear();return}
    if(w.mode==='foot'&&player.x>=w.len-40){stageClear();return}
  }
}

function updateBullets(){
  const w=world,bs=w.bullets,cam=w.cam.x;
  for(let i=bs.length-1;i>=0;i--){
    const b=bs[i];
    b.x+=b.vx;b.y+=b.vy;
    if(b.grav)b.vy+=b.grav;
    b.life--;
    if(b.homing){
      const tx=player.x+player.w/2,ty=player.y+player.h/2;
      b.vx=clamp(b.vx+Math.sign(tx-b.x)*b.homing,-2.4,2.4);
      b.vy=clamp(b.vy+Math.sign(ty-b.y)*b.homing*0.7,-3.2,2.2);
      if(w.time%3===0)addParticle(new Particle(b.x,b.y+5,rnd(-0.3,0.3),rnd(0.4,0.9),18,'#aaa',2,-0.01));
    }
    if(b.bomb&&w.time%4===0)addParticle(new Particle(b.x,b.y-2,rnd(-0.2,0.2),rnd(-0.4,-0.1),12,'#888',1,0));
    /* impacto contra el suelo de proyectiles con gravedad */
    if(b.grav&&b.y>=GROUND-2){
      if(!w.solidAt(b.x)){
        if(b.y>GROUND+16){
          for(let k=0;k<4;k++)addParticle(new Particle(b.x,GROUND+10,rnd(-1,1),rnd(-2,-0.5),16,'#7ab4e0',2));
          bs.splice(i,1);
        }
        continue;
      }
      explodeBullet(b);
      bs.splice(i,1);
      continue;
    }
    if(b.life<=0||b.x<cam-70||b.x>cam+W+70||b.y<-40||b.y>H+40)bs.splice(i,1);
  }
}

function explodeBullet(b){
  spawnExplosion(b.x,b.y,false);
  Sfx.explode(false,b.x);
  if(b.from==='p'){
    for(const e of world.enemies){
      if(e.dead)continue;
      if(Math.abs(e.x+e.w/2-b.x)<42&&Math.abs(e.y+e.h/2-b.y)<34){run.hits++;e.hit(b.dmg)}
    }
  }else{
    if(Math.abs(player.x+player.w/2-b.x)<28&&Math.abs(player.y+player.h-b.y)<32)player.hurt(b.dmg);
  }
}

function handleCollisions(){
  const w=world;
  const pb={x:player.x,y:player.y,w:player.w,h:player.h};

  for(let i=w.bullets.length-1;i>=0;i--){
    const b=w.bullets[i];
    const bb={x:b.x-1,y:b.y-1,w:b.w+2,h:b.h+2};
    if(b.from==='p'){
      let hit=false;
      for(const e of w.enemies){
        if(e.dead)continue;
        if(aabb(bb,e)){
          run.hits++;
          if(b.bomb){explodeBullet(b)}else e.hit(b.dmg);
          for(let k=0;k<2;k++)addParticle(new Particle(b.x,b.y,rnd(-1,1),rnd(-1.5,0),10,'#ffdd66',2));
          hit=true;break;
        }
      }
      if(!hit){
        for(const m of w.mines){
          if(m.live&&aabb(bb,{x:m.x,y:GROUND-9,w:12,h:9})){
            m.live=false;
            spawnExplosion(m.x+6,GROUND-4,false);
            Sfx.explode(false,m.x);
            for(const e of w.enemies)if(!e.dead&&Math.abs(e.x-m.x)<46)e.hit(40);
            hit=true;break;
          }
        }
      }
      if(hit)w.bullets.splice(i,1);
    }else{
      if(player.dying>0)continue;
      if(aabb(bb,pb)){
        player.hurt(b.dmg);
        w.bullets.splice(i,1);
        continue;
      }
      let stopped=false;
      for(const r of w.rocks){
        if(aabb(bb,{x:r.x,y:GROUND-r.h,w:r.w,h:r.h})){stopped=true;break}
      }
      if(stopped){
        addParticle(new Particle(b.x,b.y,0,-1,10,'#aaa',2));
        w.bullets.splice(i,1);
      }
    }
  }

  /* contacto cuerpo a cuerpo */
  if(player.dying>0)return;
  for(const e of w.enemies){
    if(e.dead)continue;
    if(aabb(pb,e)){
      if(w.mode==='foot'&&e.type==='foot'&&player.vy>1&&player.y+player.h<e.y+12){
        run.hits++;e.hit(100);player.vy=-4.2;Sfx.stomp();
      }else if(w.mode==='heli'){
        run.hits++;e.hit(60);player.hurt(28);
      }else if(w.mode==='jeep'&&e.type==='ejeep'){
        run.hits++;e.hit(50);player.hurt(18);
        player.speed=Math.max(0.8,player.speed-1);
      }else{
        player.hurt(e.boss?35:22);
      }
    }
  }
}

function updateFx(){
  const w=world;
  for(const p of w.particles)p.update();
  w.particles=w.particles.filter(p=>p.life>0);
  for(const e of w.explosions)e.update();
  w.explosions=w.explosions.filter(e=>!e.done());
  for(const p of w.pickups)p.update();
  for(const p of w.popups){p.y+=p.vy;p.vy*=0.95;p.life--}
  w.popups=w.popups.filter(p=>p.life>0);
}

/* ---------------- transiciones ---------------- */
function stageClear(){
  if(state!=='play')return;
  world.ended=true;
  world.bonus=1000+run.lives*250;
  run.score+=world.bonus;
  run.grenades=Math.min(9,run.grenades+3);
  player.hp=player.maxHp;
  Music.stop();
  Music.jingle();
  Sfx.vibrate(80);
  setState('clear');
}

function gameOver(){
  if(state!=='play')return;
  world.ended=true;
  spawnExplosion(player.x+player.w/2,player.y+player.h/2,true);
  Sfx.explode(true);
  Sfx.vibrate([120,60,200]);
  Music.stop();
  if(!run.saved){saveScore(run.score,run.stage+1);run.saved=true}
  setState('gameover');
}

function victory(){
  if(!run.saved){saveScore(run.score,MISSIONS.length);run.saved=true}
  Music.stop();
  Music.jingle();
  setState('victory');
}

function setState(s){
  state=s;stTime=0;
  if(s==='title')Music.play('title');
  /* visibilidad de la UI táctil */
  const show=isTouch&&s==='play';
  document.getElementById('touchUI').classList.toggle('hidden',!show);
  document.getElementById('touchLayer').classList.toggle('hidden',!show);
  document.getElementById('btnPause').classList.toggle('hidden',!show);
  /* botón de salida al menú principal: visible siempre que no estés en él */
  document.getElementById('btnHome').classList.toggle('hidden',s==='title');
  if(show)updateTouchUI();
  else TouchUI.reset();
}

function updateTouchUI(){
  if(world)TouchUI.setLayout(world.mode);
}

/* pantalla completa + bloqueo horizontal (solo móvil, requiere gesto) */
function goFullscreen(){
  if(!isTouch)return;
  try{
    const d=document.documentElement;
    if(!document.fullscreenElement&&d.requestFullscreen)
      d.requestFullscreen({navigationUI:'hide'}).catch(()=>{});
    if(screen.orientation&&screen.orientation.lock)
      screen.orientation.lock('landscape').catch(()=>{});
  }catch(e){}
}

function exitFullscreen(){
  try{
    if(document.fullscreenElement&&document.exitFullscreen)
      document.exitFullscreen().catch(()=>{});
    if(screen.orientation&&screen.orientation.unlock)
      screen.orientation.unlock();
  }catch(e){}
}

/* =====================================================================
   DIBUJO
   ===================================================================== */
function drawWorld(){
  const w=world;
  drawBackground(w.theme,w.cam.x,w.time,w.mode);

  ctx.save();
  const shx=w.cam.shake>0?((Math.random()-0.5)*w.cam.shake*2)|0:0;
  const shy=w.cam.shake>0?((Math.random()-0.5)*w.cam.shake*2)|0:0;
  ctx.translate(-(w.cam.x|0)+shx,shy);

  if(w.mode==='jeep')drawBridge(w.gaps,w.cam.x,w.time);
  if(w.mode==='foot')drawGapsWater(w.gaps,w.cam.x,w.time,w.themeName);

  for(const r of w.rocks){
    if(r.x<w.cam.x-50||r.x>w.cam.x+W+50)continue;
    px(r.x,GROUND-r.h,r.w,r.h,'#6a6a6a');
    px(r.x+1,GROUND-r.h+1,r.w-2,r.h-2,'#7a7a7a');
    px(r.x+3,GROUND-r.h+2,4,3,'#8a8a8a');
    px(r.x+r.w-5,GROUND-r.h+4,3,3,'#5a5a5a');
  }
  for(const m of w.mines)
    if(m.live&&m.x>w.cam.x-30&&m.x<w.cam.x+W+30)drawMine(m.x,GROUND-9);

  for(const p of w.pickups)
    if(p.x>w.cam.x-30&&p.x<w.cam.x+W+30)p.draw();

  /* bandera de meta en fases sin jefe */
  if(!w.mission.boss&&w.mode!=='heli')drawFlag(w.len-50,GROUND,w.time);

  /* sombras suaves (profundidad) */
  for(const e of w.enemies){
    if(e.dead||e.x<w.cam.x-90||e.x>w.cam.x+W+90)continue;
    const ecx=e.x+e.w/2;
    if(!w.solidAt(ecx))continue;
    const flying=e.type==='heli'||e.type==='plane'||e.type==='bossheli';
    softShadow(ecx,GROUND+3,e.w*(flying?0.3:0.46),flying?0.12:0.22);
  }
  {
    const pcx=player.x+player.w/2;
    if(w.solidAt(pcx)&&!(player.dying>0))
      softShadow(pcx,GROUND+3,player.w*0.5,w.mode==='heli'?0.12:0.22);
  }

  for(const e of w.enemies)
    if(!e.dead&&e.x>w.cam.x-90&&e.x<w.cam.x+W+90)e.draw();

  player.draw();

  for(const g of w.grenades)g.draw();

  for(const b of w.bullets){
    if(b.from==='p'){
      if(b.bomb){
        px(b.x,b.y,4,6,'#23282e');
        px(b.x+1,b.y-2,2,2,'#444');
        glowCircle(b.x+2,b.y+7,5,'#ff9a3c',0.35);
      }else{
        /* trazadora con halo */
        glowCircle(b.x+b.w/2,b.y+1,6.5,'#ffd24a',0.5);
        ctx.globalAlpha=0.5;
        px(b.x-b.vx*1.8,b.y,b.w,b.h,'#ffaa00');
        ctx.globalAlpha=1;
        px(b.x,b.y,b.w,b.h,'#fff3c0');
      }
    }else if(b.homing){
      px(b.x,b.y,3,8,'#dde2e8');
      px(b.x,b.y-2,3,2,'#f44');
      glowCircle(b.x+1,b.y+10,6,'#ff8a30',0.55);
    }else if(b.big){
      glowCircle(b.x+3,b.y+3,9,'#ff7a30',0.65);
      circle(b.x+3,b.y+3,3,'#ffd0a0');
    }else{
      glowCircle(b.x+b.w/2,b.y+1,5,'#ff5050',0.4);
      px(b.x,b.y,b.w,b.h,'#ffb0b0');
    }
  }

  for(const e of w.explosions)e.draw();
  for(const p of w.particles)p.draw();

  /* textos flotantes */
  for(const p of w.popups){
    ctx.globalAlpha=Math.min(1,p.life/20);
    text(p.str,p.x,p.y,7,p.color,'center');
    ctx.globalAlpha=1;
  }

  ctx.restore();

  drawWeather(w.theme,w.time);
  drawGrade();

  if(w.flash>0){
    ctx.fillStyle=`rgba(255,30,30,${w.flash/10*0.28})`;
    ctx.fillRect(0,0,W,H);
  }
  drawVignette();
  if(Settings.crt)drawScanlines();
}

function drawHUD(){
  const hi=Math.max(hiScore(),run.score);

  /* panel izquierdo: puntuación y vidas */
  panel(4,4,96,44,7);
  text('PUNTOS',11,8,6,'#8fb89a');
  text(pad(run.score,7),11,15,11,'#fff');
  text('RÉCORD '+pad(hi,7),11,28,6,'#f0b040');
  for(let i=0;i<run.lives;i++)drawPattern(HEART,11+i*10,37,'#ff4f6a');

  /* centro: salud + progreso */
  const hp=clamp(player.hp/player.maxHp,0,1);
  bar(W/2-34,6,68,7,hp,
      hp>0.6?'#8dff96':hp>0.3?'#ffd24a':'#ff7a6a',
      hp>0.6?'#2e9c40':hp>0.3?'#c08a10':'#b02020');
  if(hp<=0.3&&world.time%40<20){
    ctx.strokeStyle='rgba(255,70,70,0.75)';ctx.lineWidth=1;
    ctx.strokeRect(W/2-35.5,4.5,71,10);
  }
  const prog=world.mode==='heli'
    ?clamp(world.cam.x/(world.len-W),0,1)
    :clamp(player.x/world.len,0,1);
  bar(W/2-45,17,90,4,prog,'#ffe27a','#caa030');
  px(W/2-45+(88*prog|0),15,2,8,'#fff');

  /* panel derecho: misión y munición */
  panel(W-114,4,110,44,7);
  text('FASE '+(run.stage+1)+'/5',W-10,8,8,'#ffd24a','right');
  text(world.mission.name,W-10,18,6,'#9ab','right');
  if(world.mode==='foot')text('GRANADAS x'+run.grenades,W-10,27,7,'#ffaa40','right');
  else if(world.mode==='jeep')text('AA '+(player.acool<=0?'LISTO':'·····'),W-10,27,7,'#ffaa40','right');
  else text('BOMBAS '+(player.bcool<=0?'LISTO':'·····'),W-10,27,7,'#ffaa40','right');
  let st='';
  if(player.rapid>0)st+='⚡RÁPIDO ';
  if(player.shield>0)st+='◈ESCUDO';
  if(st)text(st.trim(),W-10,37,7,'#40dcf0','right');

  /* combo */
  if(run.combo>1&&run.comboT>0){
    const s=10+Math.min(6,run.combo);
    textGlow('COMBO x'+run.combo,W/2,40,s,'#ffe040','#ff8000');
  }

  /* barra del jefe */
  if(world.bossActive&&world.boss&&!world.bossDead){
    const b=world.boss;
    text('ENEMIGO',W/2,H-28,7,'#ff8070','center');
    bar(W/2-90,H-18,180,8,b.hp/b.maxHp,'#ff7a60','#a01010');
  }
}

/* ---------------- pantallas ---------------- */
function drawTitle(){
  drawBackground(THEMES.jungle,frame*0.45,frame,'foot');
  /* desfile */
  const sx=(frame*0.7)%(W+80)-40;
  drawSoldier(sx,GROUND-23,frame,1,false);
  const jx=(frame*1.7+260)%(W+260)-130;
  drawPlayerJeep(jx,GROUND-20,frame);
  const hx=W-((frame*0.9)%(W+160))+60;
  drawHeli(hx,38+Math.sin(frame*0.04)*6,frame,-1,false);

  ctx.fillStyle='rgba(0,0,0,0.38)';ctx.fillRect(0,0,W,H);

  /* logo con degradado, glow y pulso sutil */
  ctx.save();
  const pulse=1+Math.sin(frame*0.045)*0.012;
  ctx.translate(W/2,52);
  ctx.scale(pulse,pulse);
  ctx.font='bold 44px "Courier New",monospace';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='rgba(0,22,6,0.85)';
  ctx.fillText('ARMY MOVES',3,4);
  const lg=ctx.createLinearGradient(0,-22,0,22);
  lg.addColorStop(0,'#f2ffd9');
  lg.addColorStop(0.5,'#a8e35a');
  lg.addColorStop(1,'#3f8f2f');
  ctx.shadowColor='rgba(100,255,140,0.55)';
  ctx.shadowBlur=22;
  ctx.fillStyle=lg;
  ctx.fillText('ARMY MOVES',0,0);
  ctx.restore();
  ctx.textAlign='left';

  textGlow('★ OPERACIÓN DELTA ★',W/2,76,13,'#ffd700','#aa6600');

  panel(W/2-160,100,320,96,9);
  if(Math.floor(frame/30)%2===0)
    text(isTouch?'TOCA LA PANTALLA PARA EMPEZAR':'PULSA DISPARO (X) PARA EMPEZAR',W/2,108,10,'#fff','center');

  const sc=loadScores();
  if(sc.length===0){
    text('SIN RÉCORDS — ¡SÉ EL PRIMERO, SOLDADO!',W/2,130,8,'#f0b040','center');
  }else{
    text('— MEJORES SOLDADOS —',W/2,126,8,'#f0b040','center');
    for(let i=0;i<Math.min(3,sc.length);i++)
      text((i+1)+'.  '+pad(sc[i].s,7)+'   FASE '+sc[i].st,W/2,138+i*10,8,i===0?'#ffe060':'#ccc','center');
  }
  if(isTouch){
    text('JOYSTICK VIRTUAL: pulgar izquierdo en pantalla',W/2,172,7,'#8fd080','center');
    text('BOTONES: pulgar derecho · MANDO COMPATIBLE',W/2,182,7,'#8fd080','center');
  }else{
    text('←→ MOVER   ↑ SALTAR   ↓ AGACHARSE',W/2,172,7,'#8fd080','center');
    text('X DISPARO   C ESPECIAL   P PAUSA   MANDO COMPATIBLE',W/2,182,7,'#8fd080','center');
  }
  text('v2.1 · HOMENAJE A DINAMIC (1986)',W/2,194,7,'#667','center');

  /* opciones como píldoras táctiles */
  TITLE_OPTS.forEach((o,i)=>{
    const zx=OPTX+i*93,zy=H-36,zw=89,zh=20;
    const on=Settings[o.key];
    ctx.fillStyle=on?'rgba(50,140,70,0.4)':'rgba(60,60,60,0.4)';
    ctx.fillRect(zx,zy,zw,zh);
    ctx.strokeStyle=on?'rgba(140,255,160,0.55)':'rgba(150,150,150,0.3)';
    ctx.lineWidth=1;
    ctx.strokeRect(zx+0.5,zy+0.5,zw-1,zh-1);
    text(o.label,zx+zw/2,zy+3,7,on?'#bdf5c2':'#999','center');
    text(on?'SÍ':'NO',zx+zw/2,zy+11,7,on?'#9fdc6a':'#777','center');
  });

  drawVignette();
  if(Settings.crt)drawScanlines();
}

function drawBriefing(){
  const m=MISSIONS[run.stage];
  ctx.fillStyle='#04070a';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(40,120,60,0.25)';ctx.lineWidth=1;
  ctx.beginPath();
  for(let x=0;x<W;x+=24){ctx.moveTo(x,0);ctx.lineTo(x,H)}
  for(let y=0;y<H;y+=24){ctx.moveTo(0,y);ctx.lineTo(W,y)}
  ctx.stroke();
  const sweep=(stTime*2)%(W+200)-100;
  const g=ctx.createLinearGradient(sweep-60,0,sweep+60,0);
  g.addColorStop(0,'rgba(60,255,120,0)');
  g.addColorStop(0.5,'rgba(60,255,120,0.06)');
  g.addColorStop(1,'rgba(60,255,120,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

  text('TRANSMISIÓN ENTRANTE...',24,18,8,'#5a9');
  textGlow('MISIÓN '+(run.stage+1)+' / 5',W/2,40,16,'#ffd24a','#aa6600');
  textGlow(m.name,W/2,64,22,'#9fdc46','#2f9f20');

  /* texto máquina de escribir */
  let chars=Math.floor(stTime*1.4);
  let yy=104;
  for(const line of m.brief){
    if(chars<=0)break;
    text(line.slice(0,chars),W/2,yy,9,'#cde','center');
    chars-=line.length;
    yy+=13;
  }

  /* vista previa de la unidad */
  const pvx=W/2-20,pvy=H-66;
  if(m.mode==='jeep')drawPlayerJeep(pvx,pvy,stTime);
  else if(m.mode==='heli')drawHeli(pvx-8,pvy,stTime,1,true);
  else drawSoldier(pvx+6,pvy-2,stTime,1,false);

  if(stTime>50&&Math.floor(stTime/26)%2===0)
    text(isTouch?'TOCA PARA DESPLEGAR':'PULSA DISPARO PARA DESPLEGAR',W/2,H-26,9,'#fff','center');

  drawVignette();
  if(Settings.crt)drawScanlines();
}

function drawClear(){
  drawWorld();
  drawHUD();
  const bg=ctx.createLinearGradient(0,H/2-46,0,H/2+46);
  bg.addColorStop(0,'rgba(0,0,0,0)');
  bg.addColorStop(0.25,'rgba(4,12,8,0.72)');
  bg.addColorStop(0.75,'rgba(4,12,8,0.72)');
  bg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=bg;
  ctx.fillRect(0,H/2-46,W,92);
  textGlow('¡ZONA ASEGURADA!',W/2,H/2-36,22,'#9fdc46','#2f9f20');
  text('BONUS DE MISIÓN: +'+world.bonus,W/2,H/2-4,10,'#ffd24a','center');
  if(run.stage+1<MISSIONS.length)
    text('PREPARANDO SIGUIENTE DESPLIEGUE...',W/2,H/2+14,8,'#9aa','center');
  if(stTime>60&&Math.floor(stTime/24)%2===0)
    text('PULSA DISPARO PARA CONTINUAR',W/2,H/2+30,8,'#fff','center');
}

function drawGameOver(){
  drawWorld();
  ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,W,H);
  textGlow('MISIÓN FALLIDA',W/2,40,26,'#ff4040','#800000');
  const acc=run.shots>0?Math.min(99,Math.round(run.hits/run.shots*100)):0;
  const newRec=run.score>0&&run.score>=hiScore();
  text('PUNTUACIÓN FINAL: '+pad(run.score,7),W/2,84,11,newRec?'#ffe060':'#fff','center');
  if(newRec)textGlow('¡NUEVO RÉCORD!',W/2,100,11,'#ffe060','#aa6600');
  text('FASE ALCANZADA: '+(run.stage+1)+'/5   ·   BAJAS: '+run.kills+'   ·   PRECISIÓN: '+acc+'%',W/2,120,8,'#9aa','center');

  if(stTime>50){
    if(run.continues>0){
      panel(W/2-150,150,140,26,9,'rgba(30,90,50,0.4)','rgba(150,255,170,0.35)');
      text('CONTINUAR ('+run.continues+')',W/2-80,156,9,'#9fdc6a','center');
      text(isTouch?'(toca aquí)':'[X / DISPARO]',W/2-80,168,6,'#7a9','center');
    }
    panel(W/2+10,150,140,26,9,'rgba(100,30,30,0.4)','rgba(255,150,150,0.3)');
    text('RETIRADA',W/2+80,156,9,'#ff8080','center');
    text(isTouch?'(toca aquí)':'[C / ESPECIAL]',W/2+80,168,6,'#a77','center');
  }
  drawVignette();
  if(Settings.crt)drawScanlines();
}

function drawVictory(){
  drawWorld();
  ctx.fillStyle='rgba(0,0,10,0.6)';ctx.fillRect(0,0,W,H);
  textGlow('¡MISIÓN CUMPLIDA!',W/2,34,26,'#9fdc46','#2f9f20');
  text('Los planes secretos han sido recuperados.',W/2,72,9,'#cde','center');
  text('El general enemigo se ha rendido.',W/2,86,9,'#cde','center');
  textGlow('CÓDIGO DE ACCESO: 15315',W/2,108,13,'#ffd700','#aa6600');
  text('(los veteranos de 1986 lo reconocerán)',W/2,126,7,'#778','center');
  const acc=run.shots>0?Math.min(99,Math.round(run.hits/run.shots*100)):0;
  text('PUNTUACIÓN: '+pad(run.score,7),W/2,148,11,'#ffe060','center');
  text('BAJAS: '+run.kills+'   ·   PRECISIÓN: '+acc+'%   ·   VIDAS RESTANTES: '+run.lives,W/2,166,8,'#9aa','center');
  if(stTime>120&&Math.floor(stTime/26)%2===0)
    text('PULSA DISPARO PARA VOLVER AL CUARTEL',W/2,196,9,'#fff','center');
  drawVignette();
  if(Settings.crt)drawScanlines();
}

/* opciones del título: tecla + zona táctil */
const TITLE_OPTS=[
  {label:'MÚSICA',key:'music',code:'KeyM',after:()=>Sfx.applySettings()},
  {label:'SONIDO',key:'sfx',code:'KeyS',after:()=>Sfx.applySettings()},
  {label:'VIBRACIÓN',key:'vibrate',code:'KeyV',after:()=>Sfx.vibrate(40)},
  {label:'CRT',key:'crt',code:'KeyC'}
];
const OPTX=(W-(TITLE_OPTS.length*89+(TITLE_OPTS.length-1)*4))/2;

const PZONES={
  resume:[W/2-70,112,140,20],
  restart:[W/2-70,138,140,20],
  quit:[W/2-70,164,140,20]
};
function drawPause(){
  ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(0,0,W,H);
  textGlow('PAUSA',W/2,70,24,'#9fdc46','#2f9f20');
  const items=[
    ['REANUDAR  [P]',PZONES.resume],
    ['REINICIAR FASE  [R]',PZONES.restart],
    ['ABANDONAR  [Q]',PZONES.quit]
  ];
  for(const[label,z]of items){
    panel(z[0],z[1],z[2],z[3],9,'rgba(30,90,50,0.35)','rgba(150,255,170,0.3)');
    text(label,W/2,z[1]+6,9,'#cfe','center');
  }
}

/* =====================================================================
   LÓGICA POR ESTADO
   ===================================================================== */
function tick(){
  Input.update();
  frame++;

  switch(state){
    case'title':{
      let toggled=false;
      TITLE_OPTS.forEach((o,i)=>{
        const zx=OPTX+i*93,zy=H-36;
        if(Input.codePressed(o.code)||Input.tapIn(zx-2,zy-8,93,34)){
          Settings[o.key]=!Settings[o.key];
          Settings.save();
          if(o.after)o.after();
          Sfx.click();
          toggled=true;
        }
      });
      if(!toggled&&(Input.pressed('fire')||Input.pressed('confirm')||(Input.tap&&Input.tap.y<H-46))){
        Sfx.click();
        goFullscreen();
        newRun();
        setState('briefing');
      }
      if(!Music.timer&&Sfx.ctx&&Settings.music)Music.play('title');
      break;
    }
    case'briefing':{
      stTime++;
      if(stTime>30&&(Input.pressed('fire')||Input.pressed('confirm')||Input.tap))startStage(run.stage);
      else if(stTime>700)startStage(run.stage);
      break;
    }
    case'play':{
      if(Input.pressed('pause'))paused=!paused;
      if(paused){
        if(Input.codePressed('KeyR')||Input.tapIn(...PZONES.restart)){paused=false;startStage(run.stage)}
        else if(Input.codePressed('KeyQ')||Input.tapIn(...PZONES.quit)){paused=false;setState('title')}
        else if(Input.pressed('confirm')||Input.tapIn(...PZONES.resume))paused=false;
        break;
      }
      updatePlay();
      break;
    }
    case'clear':{
      stTime++;
      world.time++;
      updateFx();
      if(world.cam.shake>0){world.cam.shake*=0.86;if(world.cam.shake<0.4)world.cam.shake=0}
      if(world.flash>0)world.flash--;
      const advance=(stTime>60&&(Input.pressed('fire')||Input.pressed('confirm')||Input.tap))||stTime>240;
      if(advance){
        run.stage++;
        if(run.stage>=MISSIONS.length)victory();
        else setState('briefing');
      }
      break;
    }
    case'gameover':{
      stTime++;
      world.time++;
      updateFx();
      if(world.cam.shake>0){world.cam.shake*=0.86;if(world.cam.shake<0.4)world.cam.shake=0}
      if(stTime>50){
        const cont=run.continues>0&&(Input.pressed('fire')||Input.tapIn(W/2-150,150,140,26));
        const quit=Input.pressed('special')||Input.tapIn(W/2+10,150,140,26);
        if(cont){
          run.continues--;run.lives=3;run.saved=false;run.combo=0;run.comboT=0;
          startStage(run.stage);
        }else if(quit||stTime>1500){
          setState('title');
        }
      }
      break;
    }
    case'victory':{
      stTime++;
      world.time++;
      if(stTime%26===0){
        world.explosions.push(new Explosion(world.cam.x+rnd(40,W-40),rnd(26,120),Math.random()<0.3));
        if(stTime%78===0)Sfx.explode(false,world.cam.x+rnd(60,W-60));
      }
      updateFx();
      if(stTime>120&&(Input.pressed('fire')||Input.pressed('confirm')||Input.tap))setState('title');
      break;
    }
  }
}

function render(){
  ctx.setTransform(RES,0,0,RES,0,0);
  switch(state){
    case'title':drawTitle();break;
    case'briefing':drawBriefing();break;
    case'play':
      drawWorld();
      drawHUD();
      if(paused)drawPause();
      break;
    case'clear':drawClear();break;
    case'gameover':drawGameOver();break;
    case'victory':drawVictory();break;
  }
}

/* =====================================================================
   ARRANQUE
   ===================================================================== */
function boot(){
  canvas=document.getElementById('game');
  ctx=canvas.getContext('2d');
  canvas.width=W*RES;canvas.height=H*RES;
  ctx.imageSmoothingEnabled=false;

  Input.init(canvas);

  if(isTouch&&document.body){
    document.body.classList.add('touch');
    /* la pantalla completa se activa al iniciar misión (goFullscreen
       en el título) y se abandona con el botón ⌂ */
  }

  document.getElementById('btnPause').addEventListener('click',()=>{
    if(state==='play')paused=!paused;
  });
  document.getElementById('btnHome').addEventListener('click',()=>{
    if(state==='title')return;
    Sfx.click();
    paused=false;
    exitFullscreen();
    setState('title');
  });
  window.addEventListener('blur',()=>{if(state==='play')paused=true});

  /* orientación: vertical en partida → pausa; girar a horizontal
     mientras juegas → pantalla completa */
  const onOrient=()=>{
    if(!isTouch)return;
    if(innerHeight>innerWidth){
      if(state==='play')paused=true;
    }else if(state!=='title'){
      goFullscreen();
    }
  };
  window.addEventListener('resize',onOrient);
  window.addEventListener('orientationchange',onOrient);
  try{
    if(typeof screen!=='undefined'&&screen.orientation&&screen.orientation.addEventListener)
      screen.orientation.addEventListener('change',onOrient);
  }catch(e){}

  /* si el navegador bloqueó la pantalla completa al girar (exige un
     gesto), el siguiente toque durante la partida la activa */
  document.addEventListener('pointerdown',()=>{
    if(isTouch&&state!=='title'&&innerWidth>innerHeight)goFullscreen();
  },{passive:true});

  setState('title');

  let last=performance.now(),acc=0;
  const STEP=1000/60;
  function loop(ts){
    requestAnimationFrame(loop);
    acc+=Math.min(60,ts-last);
    last=ts;
    let n=0;
    while(acc>=STEP&&n<4){tick();acc-=STEP;n++}
    if(n===4)acc=0;
    render();
  }
  requestAnimationFrame(loop);
}

boot();
