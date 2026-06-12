/* Arnés de prueba sin navegador: stubs de DOM/canvas y simulación de partidas.
   Uso: node tools/smoke.js  */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');

/* ---------- stubs ---------- */
const noop=()=>{};
const grad={addColorStop:noop};
function makeCtx(){
  return new Proxy({},{
    get(t,k){
      if(k==='createLinearGradient'||k==='createRadialGradient')return()=>grad;
      if(k==='measureText')return()=>({width:10});
      if(k==='getImageData')return()=>({data:new Uint8ClampedArray(4)});
      if(typeof k==='string')return t[k]!==undefined?t[k]:noop;
      return undefined;
    },
    set(t,k,v){t[k]=v;return true}
  });
}
function makeEl(){
  return{
    classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},
    addEventListener:noop,style:{},textContent:'',
    width:480,height:270,
    getContext:()=>makeCtx(),
    getBoundingClientRect:()=>({left:0,top:0,width:480,height:270})
  };
}
const storage={_d:{},getItem(k){return k in this._d?this._d[k]:null},setItem(k,v){this._d[k]=String(v)},removeItem(k){delete this._d[k]}};

const sandbox={
  console,Math,Date,JSON,Object,Array,String,Number,Boolean,Promise,Uint8ClampedArray,
  setTimeout:()=>0,clearTimeout:noop,setInterval:()=>0,clearInterval:noop,
  performance:{now:()=>Date.now()},
  requestAnimationFrame:noop,
  localStorage:storage,
  navigator:{maxTouchPoints:0,getGamepads:()=>[]},
  document:{getElementById:()=>makeEl(),createElement:()=>makeEl(),addEventListener:noop},
};
sandbox.window=sandbox;
sandbox.window.addEventListener=noop;
sandbox.globalThis=sandbox;

/* ---------- código del juego ---------- */
const files=['core.js','audio.js','input.js','sprites.js','background.js','entities.js','game.js'];
let src='';
for(const f of files)src+=fs.readFileSync(path.join(__dirname,'..','js',f),'utf8')+'\n';

/* ---------- driver de pruebas ---------- */
src+=`
;(function(){
  let fails=0;
  const assert=(c,msg)=>{if(!c){fails++;console.error('FALLO:',msg)}else console.log('ok:',msg)};

  function press(key){Input.kb[key]=true;tick();Input.kb[key]=false;tick()}
  function runTicks(n,inp={}){
    for(let i=0;i<n;i++){
      Input.kb.right=!!inp.right;
      Input.kb.left=!!inp.left&&i%40<10;
      Input.kb.fire=!!inp.fire&&i%7<4;
      Input.kb.up=!!inp.up&&i%55===0;
      Input.kb.down=!!inp.down&&i%70<8;
      Input.kb.special=!!inp.special&&i%95===0;
      tick();
      if(i%9===0)render();
    }
    Input.kb={};
  }

  assert(state==='title','arranca en título');
  render();
  press('fire');
  assert(state==='briefing','título → briefing');
  for(let i=0;i<35;i++){tick();render()}
  press('fire');
  assert(state==='play'&&world.mode==='jeep','briefing → fase 1 (jeep)');

  /* fase jeep completa a toda velocidad */
  runTicks(2600,{right:true,fire:true,up:true,special:true});
  console.log('  tras fase jeep: state='+state+' stage='+run.stage+' score='+run.score+' lives='+run.lives);

  /* probar cada fase de forma aislada */
  for(let s=0;s<MISSIONS.length;s++){
    newRun();run.stage=s;
    startStage(s);
    assert(state==='play','fase '+(s+1)+' arranca');
    runTicks(1500,{right:true,fire:true,up:true,special:true,down:s>1});
    console.log('  fase '+(s+1)+': tras juego caótico → '+state+
      (world?(' (modo '+world.mode+', fase '+(run.stage+1)+')'):''));
    if(MISSIONS[s].boss){
      /* reinicio limpio para comprobar el jefe de forma determinista */
      newRun();run.stage=s;startStage(s);
      player.x=world.len-120;
      let guard=0;
      while(!world.bossActive&&guard++<600)tick();
      assert(world.bossActive,'fase '+(s+1)+': jefe aparece ('+MISSIONS[s].boss+')');
      runTicks(300,{fire:true,up:true});
      if(world.boss&&!world.boss.dead)world.boss.hit(1e6);
      let g2=0;
      while(state==='play'&&g2++<400){tick();if(g2%9===0)render()}
      assert(state==='clear','fase '+(s+1)+': jefe muerto → zona asegurada');
    }
    render();
  }

  /* victoria: fase 5 + avance */
  newRun();run.stage=4;startStage(4);
  player.x=world.len-120;
  let g=0;while(!world.bossActive&&g++<600)tick();
  if(world.boss)world.boss.hit(1e6);
  g=0;while(state==='play'&&g++<400)tick();
  assert(state==='clear','fortaleza destruida');
  for(let i=0;i<70;i++){tick();render()}
  press('fire');
  assert(state==='victory','clear final → victoria');
  for(let i=0;i<150;i++){tick();render()}
  press('fire');
  assert(state==='title','victoria → título');

  /* game over y continuar */
  newRun();run.stage=2;startStage(2);
  run.lives=1;player.hurt(1e6,true);
  assert(state==='gameover','muerte sin vidas → game over');
  for(let i=0;i<60;i++){tick();render()}
  press('fire');
  assert(state==='play'&&run.continues===1,'continuar reinicia la fase');

  /* pausa */
  press('pause');
  assert(paused===true,'pausa activada');
  press('pause');
  assert(paused===false,'pausa desactivada');

  /* abandonar desde game over */
  run.lives=1;player.hurt(1e6,true);
  for(let i=0;i<60;i++)tick();
  press('special');
  assert(state==='title','retirada → título');

  const sc=loadScores();
  assert(sc.length>0&&sc[0].s>=0,'récords guardados ('+sc.length+' entradas)');

  /* unidad: el director de oleadas genera SAMs visibles en fase heli */
  newRun();run.stage=1;startStage(1);
  world.cam.x=800;world.samNext=600;
  for(let i=0;i<300;i++)directSpawn();
  const sam=world.enemies.find(e=>e.type==='sam');
  assert(!!sam&&sam.x<world.cam.x+W+460,'SAM aparece dentro del rango visible');

  /* unidad: jeeps enemigos en la fase de puente */
  newRun();run.stage=0;startStage(0);
  world.cam.x=600;player.x=780;
  for(let i=0;i<1500;i++)directSpawn();
  assert(world.enemies.some(e=>e.type==='ejeep'),'jeeps enemigos aparecen en el puente');

  if(fails){console.error('\\n'+fails+' FALLOS');throw new Error('smoke test failed')}
  console.log('\\nTODO CORRECTO ✔');
})();
`;

vm.createContext(sandbox);
try{
  vm.runInContext(src,sandbox,{filename:'bundle.js'});
}catch(e){
  console.error('EXCEPCIÓN:',e.stack||e);
  process.exit(1);
}
