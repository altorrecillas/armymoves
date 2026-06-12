'use strict';
/* =====================================================================
   entities.js — partículas, balas, granadas, pickups, enemigos
   y los tres tipos de jugador (soldado / jeep / helicóptero)
   Todas las coordenadas son de MUNDO.
   ===================================================================== */

/* ---------------- partículas ---------------- */
class Particle{
  constructor(x,y,vx,vy,life,color,size=2,grav=0.1){
    this.x=x;this.y=y;this.vx=vx;this.vy=vy;
    this.life=life;this.maxLife=life;this.color=color;this.size=size;this.grav=grav;
  }
  update(){this.x+=this.vx;this.y+=this.vy;this.vy+=this.grav;this.life--}
  draw(){
    ctx.globalAlpha=Math.max(0,this.life/this.maxLife);
    px(this.x,this.y,this.size,this.size,this.color);
    ctx.globalAlpha=1;
  }
}

function addParticle(p){
  if(world.particles.length>320)world.particles.shift();
  world.particles.push(p);
}

/* texto flotante (+puntos, power-ups) en coordenadas de mundo */
function addPopup(x,y,str,color='#fff'){
  if(!world.popups)return;
  if(world.popups.length>24)world.popups.shift();
  world.popups.push({x,y,vy:-0.55,life:45,maxLife:45,str,color});
}

class Explosion{
  constructor(x,y,big){
    this.x=x;this.y=y;this.frame=0;this.max=big?26:15;this.big=big;
    const count=big?20:10;
    for(let i=0;i<count;i++){
      const a=Math.random()*Math.PI*2;
      const sp=1+Math.random()*(big?4:2);
      addParticle(new Particle(
        x,y,Math.cos(a)*sp,Math.sin(a)*sp-1,
        15+Math.random()*15,
        pick(['#ff6600','#ffdd00','#ff3300','#ffaa00']),
        1+Math.random()*2|0||1
      ));
    }
    for(let i=0;i<(big?6:3);i++)
      addParticle(new Particle(x+rnd(-6,6),y+rnd(-6,2),rnd(-0.3,0.3),rnd(-1,-0.4),30+Math.random()*20,'#555',2,-0.015));
  }
  update(){this.frame++}
  draw(){
    const t=this.frame/this.max;
    const r=this.big?(8+t*26):(5+t*14);
    /* bola de fuego aditiva */
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    const g=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,r);
    g.addColorStop(0,`rgba(255,255,235,${(1-t)*0.95})`);
    g.addColorStop(0.35,`rgba(255,190,70,${(1-t)*0.75})`);
    g.addColorStop(0.75,`rgba(255,90,10,${(1-t)*0.45})`);
    g.addColorStop(1,'rgba(255,60,0,0)');
    ctx.fillStyle=g;
    ctx.beginPath();ctx.arc(this.x,this.y,r,0,Math.PI*2);ctx.fill();
    /* onda expansiva */
    const rr=r*1.3+t*(this.big?16:9);
    ctx.globalAlpha=(1-t)*0.45;
    ctx.strokeStyle='rgba(255,225,170,1)';
    ctx.lineWidth=Math.max(0.5,1.8-t*1.5);
    ctx.beginPath();ctx.arc(this.x,this.y,rr,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }
  done(){return this.frame>=this.max}
}

function spawnExplosion(x,y,big){
  world.explosions.push(new Explosion(x,y,big));
  world.cam.shake=Math.max(world.cam.shake,big?6:3);
}

/* ---------------- balas ---------------- */
function fireBullet(o){
  world.bullets.push(Object.assign(
    {vx:0,vy:0,w:4,h:2,life:100,from:'e',dmg:15,big:false,bomb:false,homing:0,grav:0},o
  ));
}

/* ---------------- granadas ---------------- */
class Grenade{
  constructor(x,y,vx,vy){
    this.x=x;this.y=y;this.vx=vx;this.vy=vy;this.timer=85;this.done=false;
  }
  update(){
    this.x+=this.vx;this.y+=this.vy;this.vy+=0.2;this.timer--;
    if(this.y>=GROUND-3){
      if(world.solidAt(this.x)){
        this.y=GROUND-3;this.vy=-this.vy*0.4;this.vx*=0.7;
      }else if(this.y>GROUND+12){
        for(let i=0;i<5;i++)addParticle(new Particle(this.x,GROUND+8,rnd(-1,1),rnd(-2,-0.5),18,'#7ab4e0',2));
        this.done=true;return;
      }
    }
    if(this.timer<=0){
      this.done=true;
      spawnExplosion(this.x,this.y,true);
      Sfx.explode(true,this.x);
      world.cam.shake=Math.max(world.cam.shake,6);
      for(const e of world.enemies){
        if(e.dead)continue;
        const d=Math.hypot(e.x+e.w/2-this.x,e.y+e.h/2-this.y);
        if(d<62)e.hit(85*(1-d/62));
      }
      for(const m of world.mines){
        if(m.live&&Math.abs(m.x+6-this.x)<50){
          m.live=false;
          spawnExplosion(m.x+6,GROUND-4,false);
        }
      }
    }
  }
  draw(){
    px(this.x-2,this.y-2,4,4,'#3a5a20');
    px(this.x-1,this.y-3,2,1,'#888');
    if(this.timer<30&&this.timer%6<3)px(this.x-1,this.y-3,2,1,'#f00');
  }
}

/* ---------------- pickups ---------------- */
class Pickup{
  constructor(type,x,y){this.type=type;this.x=x;this.y=y;this.w=14;this.h=14;this.t=irnd(0,60)}
  update(){this.t++}
  draw(){drawPickupBox(this.type,this.x,this.y,this.t)}
}

function applyPickup(p){
  Sfx.pickup();
  Sfx.vibrate(15);
  run.score+=50;
  let label='+50';
  switch(p.type){
    case'health':player.hp=Math.min(player.maxHp,player.hp+35);label='+SALUD';break;
    case'grenade':run.grenades=Math.min(9,run.grenades+2);label='+2 GRANADAS';break;
    case'rapid':player.rapid=600;label='¡FUEGO RÁPIDO!';break;
    case'shield':player.shield=480;label='¡ESCUDO!';break;
    case'life':
      if(run.lives<5){run.lives++;Sfx.oneUp();label='+1 VIDA'}
      else{run.score+=450;label='+500'}
      break;
  }
  addPopup(player.x+player.w/2,player.y-10,label,'#ffe060');
}

/* ---------------- enemigos ---------------- */
const ETYPES={
  foot:    {w:14,h:22,hp:25, pts:100},
  turret:  {w:16,h:16,hp:60, pts:200},
  heli:    {w:46,h:14,hp:80, pts:300},
  tank:    {w:44,h:22,hp:160,pts:500},
  ejeep:   {w:34,h:20,hp:55, pts:250},
  plane:   {w:34,h:10,hp:30, pts:200},
  sam:     {w:26,h:20,hp:70, pts:350},
  bosstank:{w:60,h:40,hp:560,pts:2500,boss:true},
  bossheli:{w:64,h:24,hp:640,pts:3000,boss:true},
  fortress:{w:70,h:90,hp:900,pts:5000,boss:true}
};

class Enemy{
  constructor(type,x,y,opts={}){
    const t=ETYPES[type];
    this.type=type;this.w=t.w;this.h=t.h;
    this.hp=t.hp+(run?run.stage*8:0);this.maxHp=this.hp;
    this.pts=t.pts;this.boss=!!t.boss;
    this.x=x;this.y=(y!==undefined)?y:GROUND-this.h;
    this.vx=0;this.vy=0;this.frame=irnd(0,80);this.dead=false;
    this.shootT=irnd(50,110);this.phase=0;this.charge=0;
    this.falling=false;this.facing=-1;this.burst=0;
    switch(type){
      case'foot':
        this.color=pick(['red','brown','blue']);
        this.spd=rnd(0.35,0.6)+(run?run.stage*0.04:0);
        break;
      case'heli':
        if(y===undefined)this.y=irnd(34,86);
        this.baseY=this.y;this.vx=-(1+rnd(0,0.5));this.bombT=40;
        break;
      case'tank':this.vx=-0.3;this.shootT=110;break;
      case'ejeep':
        this.dir=opts.dir||-1;
        this.vx=this.dir===-1?-2.3:3.4;
        break;
      case'plane':
        if(y===undefined)this.y=irnd(30,150);
        this.baseY=this.y;this.vx=-(3+rnd(0,0.8));this.fired=false;
        break;
      case'sam':this.shootT=70;break;
      case'bosstank':this.vx=-0.5;this.shootT=90;this.targetX=x;break;
      case'bossheli':this.y=52;this.anchor=x;this.shootT=70;this.bombT=90;break;
      case'fortress':this.shootT=70;this.spawnT=200;break;
    }
  }

  update(){
    this.frame++;
    const p=player,cam=world.cam.x;
    const px0=p.x+p.w/2,py0=p.y+p.h/2;
    const cx=this.x+this.w/2,cy=this.y+this.h/2;
    const dx=px0-cx,dy=py0-cy;
    const dist=Math.hypot(dx,dy)||1;
    const onScreen=this.x>cam-40&&this.x<cam+W+40;

    switch(this.type){
      case'foot':{
        if(this.falling){
          this.vy+=GRAV;this.y+=this.vy;
          if(this.y>H+20)this.dead=true;
          return;
        }
        this.facing=dx<0?-1:1;
        if(Math.abs(dx)>90)this.x+=this.spd*this.facing;
        if(!world.solidAt(cx)&&this.y+this.h>=GROUND){this.falling=true;this.vy=0}
        if(onScreen&&--this.shootT<=0&&Math.abs(dy)<60){
          fireBullet({x:cx+this.facing*9,y:this.y+9,vx:3.4*this.facing,w:5,h:2,dmg:12+run.stage*2,life:110});
          this.shootT=Math.max(45,irnd(70,140)-run.stage*7);
        }
        break;
      }
      case'turret':{
        if(onScreen&&--this.shootT<=0&&dist<330){
          fireBullet({x:cx,y:this.y+4,vx:dx/dist*3,vy:dy/dist*3,w:4,h:3,dmg:16,life:130});
          this.shootT=Math.max(40,irnd(55,95)-run.stage*4);
        }
        break;
      }
      case'heli':{
        this.x+=this.vx;
        this.y=this.baseY+Math.sin(this.frame*0.04)*10;
        if(onScreen&&--this.shootT<=0){
          if(world.mode==='jeep'){
            if(Math.abs(dx)<70){
              fireBullet({x:cx,y:this.y+14,vx:this.vx*0.6,vy:1,grav:0.13,w:4,h:5,dmg:26,big:true,life:220});
              this.shootT=55;
            }else this.shootT=8;
          }else{
            fireBullet({x:cx,y:this.y+12,vx:dx/dist*3,vy:dy/dist*3,w:4,h:4,dmg:18,life:130});
            this.shootT=irnd(60,110);
          }
        }
        break;
      }
      case'tank':{
        if(Math.abs(dx)>190)this.x+=this.vx;
        if(onScreen&&--this.shootT<=0){
          fireBullet({x:this.x+2,y:this.y+3,vx:dx/dist*3.6,vy:dy/dist*3.6,w:6,h:6,dmg:30,big:true,life:150});
          Sfx.cannon(this.x);
          world.cam.shake=Math.max(world.cam.shake,3);
          this.shootT=irnd(110,160);
        }
        break;
      }
      case'ejeep':{
        this.x+=this.vx;
        if(this.falling||!world.solidAt(cx)){
          this.falling=true;this.vy+=GRAV;this.y+=this.vy;
          if(this.y>GROUND+14){
            this.dead=true;
            spawnExplosion(cx,GROUND+10,false);
            Sfx.splash(cx);
          }
          return;
        }
        if(onScreen&&--this.shootT<=0){
          fireBullet({x:cx,y:this.y+1,vx:(this.dir===-1?-1:1)*4.5,w:5,h:2,dmg:16,life:90});
          this.shootT=irnd(50,90);
        }
        break;
      }
      case'plane':{
        this.x+=this.vx;
        this.y=this.baseY+Math.sin(this.frame*0.05)*6;
        if(!this.fired&&dx<0&&dx>-250){
          this.fired=true;
          fireBullet({x:this.x,y:this.y+6,vx:-4.6,vy:clamp(dy*0.01,-0.6,0.6),w:6,h:2,dmg:18,life:110});
        }
        break;
      }
      case'sam':{
        if(onScreen&&Math.abs(dx)<280&&this.shootT>0)this.shootT--;
        if(this.shootT<=0){
          this.charge++;
          if(this.charge>45){
            this.charge=0;this.shootT=irnd(150,220);
            fireBullet({x:this.x+18,y:this.y-6,vx:0,vy:-2.4,homing:0.07,w:4,h:8,dmg:30,big:true,life:260});
            Sfx.missile(this.x);
          }
        }
        break;
      }
      case'bosstank':{
        if(this.x>this.targetX)this.x+=this.vx;
        else this.x+=Math.sin(this.frame*0.015)*0.35;
        if(this.hp<this.maxHp*0.6&&this.phase===0)this.phase=1;
        if(this.hp<this.maxHp*0.3&&this.phase===1)this.phase=2;
        if(--this.shootT<=0){
          if(this.phase===0){
            fireBullet({x:this.x-12,y:this.y+7,vx:dx/dist*3.4,vy:dy/dist*3.4,w:6,h:6,dmg:28,big:true,life:160});
          }else if(this.phase===1){
            for(let k=-1;k<=1;k++)
              fireBullet({x:this.x-12,y:this.y+7,vx:-3.4,vy:k*0.9,w:5,h:3,dmg:22,life:140});
          }else{
            fireBullet({x:this.x+44,y:this.y-6,vx:rnd(-2.4,-1),vy:-5,grav:0.16,w:5,h:5,dmg:30,big:true,life:240});
            fireBullet({x:this.x-12,y:this.y+7,vx:dx/dist*3.8,vy:dy/dist*3.8,w:6,h:6,dmg:28,big:true,life:160});
          }
          Sfx.cannon(this.x);
          world.cam.shake=Math.max(world.cam.shake,4);
          this.shootT=this.phase===2?irnd(40,60):this.phase===1?irnd(55,80):irnd(75,105);
        }
        break;
      }
      case'bossheli':{
        this.x=this.anchor+Math.sin(this.frame*0.018)*78;
        this.y=52+Math.sin(this.frame*0.031)*26;
        if(this.hp<this.maxHp*0.5)this.phase=1;
        if(--this.bombT<=0&&Math.abs(dx)<80){
          fireBullet({x:cx,y:this.y+22,vx:0,vy:1,grav:0.14,w:5,h:6,dmg:28,big:true,life:220});
          this.bombT=this.phase?45:75;
        }
        if(--this.shootT<=0){
          this.burst=3;
          this.shootT=this.phase?60:95;
        }
        if(this.burst>0&&this.frame%7===0){
          this.burst--;
          fireBullet({x:cx-10,y:this.y+16,vx:dx/dist*3.6,vy:dy/dist*3.6,w:4,h:4,dmg:18,life:140});
        }
        break;
      }
      case'fortress':{
        if(this.hp<this.maxHp*0.5)this.phase=1;
        if(--this.shootT<=0){
          for(const g of[[this.x-4,this.y+18],[this.x-4,this.y+44],[this.x-4,this.y+68]]){
            const gdx=px0-g[0],gdy=py0-g[1],gd=Math.hypot(gdx,gdy)||1;
            fireBullet({x:g[0],y:g[1],vx:gdx/gd*3.2,vy:gdy/gd*3.2,w:4,h:3,dmg:20,life:150});
          }
          this.shootT=this.phase?irnd(55,75):irnd(85,115);
        }
        if(--this.spawnT<=0){
          const minions=world.enemies.filter(e=>e!==this&&e.type==='foot'&&!e.dead).length;
          if(minions<3)world.enemies.push(new Enemy('foot',this.x-10));
          this.spawnT=this.phase?180:260;
        }
        if(this.hp<this.maxHp*0.35&&world.time%5===0)
          addParticle(new Particle(this.x+rnd(6,60),this.y+rnd(4,30),rnd(-0.2,0.2),rnd(-0.8,-0.3),34,'#666',2,-0.012));
        break;
      }
    }
  }

  hit(dmg){
    if(this.dead)return;
    this.hp-=dmg;
    for(let i=0;i<3;i++)
      addParticle(new Particle(this.x+this.w/2,this.y+this.h/2,rnd(-1.4,1.4),rnd(-2,0),14,'#ffb030',2));
    if(this.hp<=0)this.die();
  }

  die(){
    this.dead=true;
    run.kills++;
    run.combo++;run.comboT=130;
    const earned=this.pts+run.combo*25;
    run.score+=earned;
    addPopup(this.x+this.w/2,this.y-4,'+'+earned,run.combo>1?'#ffe060':'#e8f0ff');
    const big=this.boss||this.type==='tank'||this.type==='ejeep';
    spawnExplosion(this.x+this.w/2,this.y+this.h/2,big);
    Sfx.explode(big,this.x+this.w/2);
    if(big){
      world.cam.shake=Math.max(world.cam.shake,this.boss?12:6);
      Sfx.vibrate(this.boss?[80,40,160]:35);
    }
    if(world.mode==='foot'&&!this.boss&&['foot','turret','tank'].includes(this.type)&&Math.random()<0.16){
      const t=Math.random()<0.07?'life':pick(['health','grenade','rapid','shield']);
      world.pickups.push(new Pickup(t,this.x+this.w/2-7,GROUND-17));
    }
    if(this.boss){
      world.bossDead=true;
      world.clearT=130;
      world.bossRect={x:this.x,y:this.y,w:this.w,h:this.h};
      Music.stop();
    }
  }

  draw(){
    const sx=this.x,sy=this.y;
    switch(this.type){
      case'foot':drawEnemySoldier(sx,sy,this.frame,this.facing,this.color);break;
      case'turret':drawTurret(sx,sy,this.frame);break;
      case'heli':drawHeli(sx,sy,this.frame,-1,false);break;
      case'tank':drawTank(sx,sy,this.frame);break;
      case'ejeep':drawEnemyJeep(sx,sy,this.frame,this.dir);break;
      case'plane':drawPlane(sx,sy,this.frame);break;
      case'sam':drawSam(sx,sy,this.frame,this.charge>0&&this.frame%6<3);break;
      case'bosstank':drawBossTank(sx,sy,this.frame);break;
      case'bossheli':drawBossHeli(sx,sy,this.frame);break;
      case'fortress':drawFortress(sx,sy,this.frame,this.phase);break;
    }
    if(!this.boss&&this.hp<this.maxHp&&this.maxHp>40){
      px(sx,sy-5,this.w,2,'#222');
      px(sx,sy-5,this.w*this.hp/this.maxHp|0,2,'#f80');
    }
  }
}

/* =====================================================================
   JUGADORES
   ===================================================================== */

class FootPlayer{
  constructor(){
    this.x=40;this.y=GROUND-23;this.w=14;this.h=23;
    this.vy=0;this.onGround=true;this.facing=1;this.frame=0;
    this.hp=100;this.maxHp=100;this.invuln=80;
    this.cool=0;this.gcool=0;this.crouch=false;
    this.rapid=0;this.shield=0;this.dying=0;this.lastSafeX=40;
    this.coyote=0;this.jbuf=0;this.muzzle=0;
  }

  update(){
    if(this.dying>0){
      this.dying--;this.y+=1.6;this.frame++;
      if(this.dying===0){
        this.hurt(34,true);
        if(state==='play'&&run.lives>0)this.respawn();
      }
      return;
    }

    let mv=0;
    if(Input.down('left')){mv=-1.8;this.facing=-1}
    if(Input.down('right')){mv=1.8;this.facing=1}

    const wasCrouch=this.crouch;
    this.crouch=Input.down('down')&&this.onGround;
    if(this.crouch&&!wasCrouch){this.y+=7;this.h=16}
    else if(!this.crouch&&wasCrouch){this.y-=7;this.h=23}
    if(this.crouch)mv*=0.35;

    const maxX=world.bossActive?world.camLock+W-this.w-6:world.len-this.w-4;
    this.x=clamp(this.x+mv,world.cam.x+2,maxX);

    /* salto con coyote time + buffer + altura variable */
    if(Input.pressed('up'))this.jbuf=7;else if(this.jbuf>0)this.jbuf--;
    if(this.onGround)this.coyote=7;else if(this.coyote>0)this.coyote--;
    if(this.jbuf>0&&this.coyote>0&&!this.crouch){
      this.vy=-6.1;this.onGround=false;
      this.coyote=0;this.jbuf=0;
      Sfx.jump();
    }
    if(Input.released('up')&&this.vy<-2.4)this.vy=-2.4;

    this.vy+=GRAV;
    if(this.vy>6.5)this.vy=6.5;
    this.y+=this.vy;

    /* suelo y plataformas */
    const wasAir=!this.onGround;
    const fallV=this.vy;
    this.onGround=false;
    const feet=this.y+this.h;
    if(this.vy>=0){
      for(const r of world.rocks){
        const top=GROUND-r.h;
        if(this.x+this.w>r.x&&this.x<r.x+r.w&&feet>=top&&feet-this.vy<=top+4){
          this.y=top-this.h;this.vy=0;this.onGround=true;
        }
      }
      if(!this.onGround&&feet>=GROUND){
        if(world.solidAt(this.x+3)||world.solidAt(this.x+this.w-3)){
          this.y=GROUND-this.h;this.vy=0;this.onGround=true;
        }
      }
    }
    if(this.onGround&&world.solidAt(this.x+this.w/2))this.lastSafeX=this.x;

    /* polvo al aterrizar */
    if(this.onGround&&wasAir&&fallV>2.2){
      for(let i=0;i<4;i++)
        addParticle(new Particle(this.x+this.w/2+rnd(-5,5),GROUND-1,rnd(-0.8,0.8),rnd(-1.2,-0.3),14,world.theme.gLine,2,0.05));
      Sfx.land();
    }

    /* choque lateral con rocas */
    for(const r of world.rocks){
      const top=GROUND-r.h;
      if(this.y+this.h>top+5&&this.y<GROUND){
        if(this.x+this.w>r.x&&this.x+this.w<r.x+10&&mv>0)this.x=r.x-this.w;
        else if(this.x<r.x+r.w&&this.x>r.x+r.w-10&&mv<0)this.x=r.x+r.w;
      }
    }

    /* caída al agua */
    if(this.y>GROUND+8){this.drown();return}

    /* minas */
    for(const m of world.mines){
      if(m.live&&Math.abs(this.x+this.w/2-(m.x+6))<10&&this.y+this.h>GROUND-6){
        m.live=false;
        spawnExplosion(m.x+6,GROUND-4,true);
        Sfx.explode(true,m.x);
        this.hurt(35);
      }
    }

    this.collectPickups();

    /* disparo */
    if(this.cool>0)this.cool--;
    if(Input.down('fire')&&this.cool<=0){
      const by=this.y+(this.crouch?7:9);
      fireBullet({x:this.x+(this.facing>0?this.w:-6),y:by,vx:7*this.facing,w:6,h:2,from:'p',dmg:25,life:70});
      run.shots++;
      addParticle(new Particle(this.x+(this.facing>0?this.w+2:-4),by,this.facing*2,0,5,'#ffff00',3,0));
      this.cool=this.rapid>0?5:11;
      this.muzzle=3;
      Sfx.shoot();
      world.cam.shake=Math.max(world.cam.shake,1.2);
    }

    /* granada */
    if(this.gcool>0)this.gcool--;
    if(Input.pressed('special')&&run.grenades>0&&this.gcool<=0){
      run.grenades--;this.gcool=20;
      world.grenades.push(new Grenade(this.x+this.w/2,this.y+4,2.8*this.facing+(mv!==0?0.6*this.facing:0),-4.2));
      Sfx.grenadePin();
    }

    if(mv!==0&&this.onGround&&!this.crouch)this.frame++;
    else if(this.onGround)this.frame=0;
    if(this.invuln>0)this.invuln--;
    if(this.rapid>0)this.rapid--;
    if(this.shield>0)this.shield--;
    if(this.muzzle>0)this.muzzle--;
  }

  collectPickups(){
    for(let i=world.pickups.length-1;i>=0;i--){
      const p=world.pickups[i];
      if(aabb(this,p)){applyPickup(p);world.pickups.splice(i,1)}
    }
  }

  drown(){
    if(this.dying>0)return;
    Sfx.splash();
    for(let i=0;i<8;i++)
      addParticle(new Particle(this.x+7,GROUND+6,rnd(-1.5,1.5),rnd(-3,-1),22,'#7ab4e0',2));
    this.dying=36;
  }

  respawn(){
    this.x=Math.max(world.cam.x+12,this.lastSafeX-10);
    this.y=GROUND-23-26;this.h=23;this.crouch=false;
    this.vy=0;this.invuln=110;this.dying=0;
  }

  hurt(dmg,force=false){
    if(!force&&(this.invuln>0||world.ended))return;
    if(this.shield>0)dmg=Math.ceil(dmg*0.25);
    this.hp-=dmg;
    world.flash=8;
    world.cam.shake=Math.max(world.cam.shake,5);
    Sfx.hit();
    for(let i=0;i<5;i++)
      addParticle(new Particle(this.x+7,this.y+10,rnd(-1,1),rnd(-3,-1),20,'#cc0000',2));
    if(this.hp<=0){
      run.lives--;
      Sfx.vibrate(160);
      if(run.lives<=0){gameOver();return}
      this.hp=this.maxHp;this.invuln=130;
      world.cam.shake=9;
    }else{
      Sfx.vibrate(50);
      if(!force)this.invuln=45;
    }
  }

  draw(){
    if(this.dying>0){
      ctx.globalAlpha=Math.max(0.2,this.dying/36);
      drawSoldier(this.x,this.y,0,this.facing,true);
      ctx.globalAlpha=1;return;
    }
    if(this.invuln>0&&Math.floor(this.invuln/3)%2===0)return;
    if(this.shield>0){
      ctx.globalAlpha=0.3+Math.sin(world.time*0.15)*0.12;
      circle(this.x+this.w/2,this.y+this.h/2,15,'#00ffff');
      ctx.globalAlpha=1;
    }
    drawSoldier(this.x,this.y,this.frame,this.facing,this.crouch);
    if(this.muzzle>0){
      const mx=this.facing>0?this.x+this.w+5:this.x-5;
      glowCircle(mx,this.y+(this.crouch?8:10),7,'#ffd24a',0.65);
    }
  }
}

class JeepPlayer{
  constructor(){
    this.x=40;this.w=34;this.h=20;this.y=GROUND-this.h;
    this.vy=0;this.onGround=true;this.speed=2;this.frame=0;
    this.hp=100;this.maxHp=100;this.invuln=80;
    this.cool=0;this.acool=0;this.dying=0;
    this.rapid=0;this.shield=0;this.facing=1;
    this.coyote=0;this.jbuf=0;this.muzzle=0;
  }

  update(){
    if(this.dying>0){
      this.dying--;this.y+=1.8;
      if(world.time%5===0)addParticle(new Particle(this.x+rnd(0,30),this.y,rnd(-0.5,0.5),rnd(-1.5,-0.5),20,'#888',2,-0.01));
      if(this.dying===0){
        this.hurt(40,true);
        if(state==='play'&&run.lives>0)this.respawn();
      }
      return;
    }

    if(Input.down('right'))this.speed=Math.min(3.8,this.speed+0.06);
    else if(Input.down('left'))this.speed=Math.max(0.7,this.speed-0.09);
    else this.speed+=(2-this.speed)*0.02;

    this.x=Math.min(this.x+this.speed,world.len-40);
    this.frame+=Math.max(1,this.speed|0);

    /* salto con coyote time + buffer (clave al borde de los huecos) */
    if(Input.pressed('up'))this.jbuf=8;else if(this.jbuf>0)this.jbuf--;
    if(this.onGround)this.coyote=7;else if(this.coyote>0)this.coyote--;
    if(this.jbuf>0&&this.coyote>0){
      this.vy=-6.3;this.onGround=false;
      this.coyote=0;this.jbuf=0;
      Sfx.jump();
    }
    this.vy+=0.26;
    this.y+=this.vy;

    const wasAir=!this.onGround;
    const fallV=this.vy;
    this.onGround=false;
    const feet=this.y+this.h;
    if(this.vy>=0&&feet>=GROUND){
      if(world.solidAt(this.x+6)||world.solidAt(this.x+this.w-6)){
        this.y=GROUND-this.h;this.vy=0;this.onGround=true;
      }
    }
    if(this.onGround&&wasAir&&fallV>2.5){
      for(let i=0;i<5;i++)
        addParticle(new Particle(this.x+rnd(2,32),GROUND-1,rnd(-1,0.4),rnd(-1.4,-0.4),16,'#9a8a6a',2,0.05));
      Sfx.land();
      world.cam.shake=Math.max(world.cam.shake,2);
    }
    if(this.y>GROUND+6){this.crash();return}

    for(const m of world.mines){
      if(m.live&&Math.abs(this.x+this.w/2-(m.x+6))<16&&this.onGround){
        m.live=false;
        spawnExplosion(m.x+6,GROUND-4,true);
        Sfx.explode(true,m.x);
        this.hurt(30);
      }
    }

    for(let i=world.pickups.length-1;i>=0;i--){
      const p=world.pickups[i];
      if(aabb(this,p)){applyPickup(p);world.pickups.splice(i,1)}
    }

    /* ametralladora frontal */
    if(this.cool>0)this.cool--;
    if(Input.down('fire')&&this.cool<=0){
      fireBullet({x:this.x+this.w+2,y:this.y+8,vx:8,w:6,h:2,from:'p',dmg:25,life:70});
      run.shots++;
      addParticle(new Particle(this.x+this.w+4,this.y+8,2,0,5,'#ffff00',3,0));
      this.cool=this.rapid>0?5:9;
      this.muzzle=3;
      Sfx.shoot();
    }

    /* cañón antiaéreo */
    if(this.acool>0)this.acool--;
    if(Input.down('special')&&this.acool<=0){
      fireBullet({x:this.x+4,y:this.y-8,vx:1.5,vy:-6,from:'p',dmg:30,w:3,h:7,life:70});
      run.shots++;
      this.acool=14;
      Sfx.shootAA();
    }

    /* humo del motor */
    if(world.time%6===0)
      addParticle(new Particle(this.x-2,this.y+12,rnd(-0.8,-0.3),rnd(-0.5,-0.1),16,'#99a',1,-0.01));

    if(this.invuln>0)this.invuln--;
    if(this.rapid>0)this.rapid--;
    if(this.shield>0)this.shield--;
    if(this.muzzle>0)this.muzzle--;
  }

  crash(){
    if(this.dying>0)return;
    spawnExplosion(this.x+17,GROUND+6,true);
    Sfx.splash();Sfx.explode(false);
    this.dying=44;
  }

  respawn(){
    const g=world.gaps.find(g=>this.x+this.w>g.x&&this.x<g.x+g.w+20);
    this.x=Math.max(20,(g?g.x:this.x)-80);
    this.y=GROUND-this.h;this.vy=0;this.speed=1.4;
    this.invuln=110;this.dying=0;
  }

  hurt(dmg,force=false){
    if(!force&&(this.invuln>0||world.ended))return;
    if(this.shield>0)dmg=Math.ceil(dmg*0.25);
    this.hp-=dmg;
    world.flash=8;
    world.cam.shake=Math.max(world.cam.shake,5);
    Sfx.hit();
    if(this.hp<=0){
      run.lives--;
      Sfx.vibrate(160);
      if(run.lives<=0){gameOver();return}
      this.hp=this.maxHp;this.invuln=140;
      world.cam.shake=9;
    }else{
      Sfx.vibrate(50);
      if(!force)this.invuln=50;
    }
  }

  draw(){
    if(this.dying>0){
      ctx.globalAlpha=Math.max(0.2,this.dying/44);
      drawPlayerJeep(this.x,this.y,0);
      ctx.globalAlpha=1;return;
    }
    if(this.invuln>0&&Math.floor(this.invuln/3)%2===0)return;
    if(this.shield>0){
      ctx.globalAlpha=0.3+Math.sin(world.time*0.15)*0.12;
      circle(this.x+17,this.y+8,22,'#00ffff');
      ctx.globalAlpha=1;
    }
    drawPlayerJeep(this.x,this.y,this.frame);
    if(this.muzzle>0)glowCircle(this.x+this.w+6,this.y+9,8,'#ffd24a',0.65);
    if(this.speed>3){
      ctx.globalAlpha=0.4;
      px(this.x-8,this.y+8,6,1,'#fff');
      px(this.x-12,this.y+12,8,1,'#fff');
      ctx.globalAlpha=1;
    }
  }
}

const HELI_SCROLL=1.3;

class HeliPlayer{
  constructor(){
    this.x=60;this.y=120;this.w=40;this.h=16;
    this.vx=0;this.vy=0;this.frame=0;
    this.hp=100;this.maxHp=100;this.invuln=80;
    this.cool=0;this.bcool=0;this.alt=0;
    this.rapid=0;this.shield=0;this.facing=1;
    this.muzzle=0;
  }

  update(){
    this.frame++;
    /* control analógico (joystick táctil o stick del mando) con
       respaldo digital de teclado */
    const axx=Input.axisX||((Input.down('right')?1:0)-(Input.down('left')?1:0));
    const axy=Input.axisY||((Input.down('down')?1:0)-(Input.down('up')?1:0));
    this.vx+=0.22*axx;
    this.vy+=0.2*axy;
    this.vx=clamp(this.vx*0.92,-2.4,2.4);
    this.vy=clamp(this.vy*0.92,-2.2,2.2);

    this.x=clamp(this.x+this.vx+HELI_SCROLL,world.cam.x+6,world.cam.x+W-54);
    this.y=clamp(this.y+this.vy,12,GROUND-26);

    /* ametralladora de morro */
    if(this.cool>0)this.cool--;
    if(Input.down('fire')&&this.cool<=0){
      this.alt=!this.alt;
      fireBullet({x:this.x+this.w+4,y:this.y+(this.alt?6:10),vx:8,w:6,h:2,from:'p',dmg:22,life:70});
      run.shots++;
      this.cool=this.rapid>0?4:7;
      this.muzzle=2;
      Sfx.shoot();
    }

    /* bombas */
    if(this.bcool>0)this.bcool--;
    if(Input.pressed('special')&&this.bcool<=0){
      fireBullet({x:this.x+16,y:this.y+16,vx:1.5+this.vx,vy:1,grav:0.15,from:'p',dmg:55,w:4,h:6,big:true,bomb:true,life:220});
      run.shots++;
      this.bcool=32;
      Sfx.click();
    }

    for(let i=world.pickups.length-1;i>=0;i--){
      const p=world.pickups[i];
      if(aabb(this,p)){applyPickup(p);world.pickups.splice(i,1)}
    }

    if(this.hp<this.maxHp*0.4&&world.time%6===0)
      addParticle(new Particle(this.x+12,this.y+2,rnd(-0.5,0.2),rnd(-1,-0.4),22,'#555',2,-0.01));

    if(this.invuln>0)this.invuln--;
    if(this.rapid>0)this.rapid--;
    if(this.shield>0)this.shield--;
    if(this.muzzle>0)this.muzzle--;
  }

  hurt(dmg,force=false){
    if(!force&&(this.invuln>0||world.ended))return;
    if(this.shield>0)dmg=Math.ceil(dmg*0.25);
    this.hp-=dmg;
    world.flash=8;
    world.cam.shake=Math.max(world.cam.shake,5);
    Sfx.hit();
    for(let i=0;i<4;i++)
      addParticle(new Particle(this.x+20,this.y+8,rnd(-1.5,1.5),rnd(-1.5,0.5),16,'#ffaa00',2));
    if(this.hp<=0){
      run.lives--;
      spawnExplosion(this.x+20,this.y+8,true);
      Sfx.explode(true);
      Sfx.vibrate(160);
      if(run.lives<=0){gameOver();return}
      this.hp=this.maxHp;this.invuln=150;
      this.y=120;this.vy=0;
      world.cam.shake=10;
    }else{
      Sfx.vibrate(50);
      if(!force)this.invuln=50;
    }
  }

  draw(){
    if(this.invuln>0&&Math.floor(this.invuln/3)%2===0)return;
    if(this.shield>0){
      ctx.globalAlpha=0.3+Math.sin(world.time*0.15)*0.12;
      circle(this.x+22,this.y+7,24,'#00ffff');
      ctx.globalAlpha=1;
    }
    drawHeli(this.x-4,this.y,this.frame,1,true);
    if(this.muzzle>0)glowCircle(this.x+this.w+6,this.y+8,7,'#ffd24a',0.6);
  }
}
