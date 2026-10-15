/* 3D battle: heroes stand bottom-left, monsters top-right, seen from behind the party, like a monster-trainer battle.
   The game's own DOM (health plates, targeting, damage numbers, skill effects) stays on top of the 3D picture: each
   `.unit` element is moved every frame to sit on its 3D model. The game decides what happens; this file only shows it. */
(function(){
'use strict';
const D3=window.DS3D,T=window.THREE,{clamp,lerp,easeOut}=D3;
const G=()=>D3.G;
const HERO_W=4.4,CAM_POS=new T.Vector3(-4,6.4,12.5),CAM_LOOK=new T.Vector3(.8,1.3,.2);
const S={built:false,biome:null,heroes:new Map(),foes:new Map(),tasks:[],t:0,shake:0,punch:0,pend:[],ringH:null,ringF:null,camLook:new T.Vector3(),lay:{asp:0,h:0},FWD:new T.Vector3(.5,0,-.86),RGT:new T.Vector3(.86,0,.5),Ph:new T.Vector3(),Pf:new T.Vector3()};

function build(){
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1.8,.5,400);
  S.scene=scene;S.camera=camera;S.fx=new D3.Particles(700,{grav:2,drag:.6,px:300});scene.add(S.fx.points);
  // rings under the active hero and the targeted monster
  const mk=(c)=>{const m=new T.Mesh(new T.RingGeometry(.9,1.15,28),new T.MeshBasicMaterial({color:c,transparent:true,opacity:.9,side:T.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.12;m.renderOrder=2;m.visible=false;scene.add(m);return m};
  S.ringH=mk(0xe3b341);S.ringF=mk(0xe0736c);
  S.built=true;
}
function setBiome(biome){
  if(S.biome===biome&&S.arena)return;
  if(S.arena){S.scene.remove(S.arena.group)}
  S.biome=biome;S.arena=D3.buildArena(biome);S.scene.add(S.arena.group);
  S.scene.background=D3.skyTex(S.arena.B.skyTop,S.arena.B.skyBot);
  S.scene.fog=new T.Fog(S.arena.fog,40,120);
  for(const [,m] of S.heroes)S.scene.remove(m.H.root);S.heroes.clear();
  for(const [,m] of S.foes)S.scene.remove(m.F.root);S.foes.clear();
}

/* ---------- formation ----------
   Where things stand is worked out from the screen: the party gathers in the lower left, the monsters in the upper
   right, whatever shape the battle stage has. Positions are found by aiming the camera at the floor. */
const _g=new T.Vector3();
function ground(nx,ny){const c=S.camera;_g.set(nx,ny,.5).unproject(c);const d=_g.sub(c.position).normalize(),t=-c.position.y/d.y;return new T.Vector3().copy(c.position).addScaledVector(d,t)}
function restCamera(){const c=S.camera;c.position.copy(CAM_POS);c.lookAt(CAM_LOOK);c.updateMatrixWorld(true);c.updateProjectionMatrix()}
function layout(){
  const c=S.camera,asp=c.aspect||1.8;
  restCamera();
  const nar=Math.min(1,asp/2.3),spread=clamp(3.5/asp,.5,1)*(.55+.45*nar),hx=-.5*spread*.92,fx=.56*spread;
  S.Ph=ground(hx,-.5);S.Pf=ground(fx,0);
  const fw=new T.Vector3().subVectors(S.Pf,S.Ph).setY(0).normalize();
  S.FWD.copy(fw);S.RGT.set(-fw.z,0,fw.x).multiplyScalar(-1).normalize();
  // the camera's own right-hand direction on the floor, so rows run across the screen
  const r=new T.Vector3().crossVectors(new T.Vector3().subVectors(CAM_LOOK,CAM_POS).setY(0).normalize(),new T.Vector3(0,1,0)).normalize();
  S.RGT.copy(r);
  S.lay.asp=asp;S.lay.h=S.slotH=c.aspect;
  S.sp=nar;
}
const heroSlot=(i,n)=>{const m=(n-1)/2,k=(m-i)*S.sp;return S.Ph.clone().addScaledVector(S.RGT,k*3.9).addScaledVector(S.FWD,k*1.3)}   // i = 0 is the front hero
function foeSlot(i,n,big){const m=(n-1)/2,k=(i-m)*S.sp;return S.Pf.clone().addScaledVector(S.RGT,k*5).addScaledVector(S.FWD,k*1.8-(big?3:0))}
function foeHeight(e){return e.kind==='king'?9:(e.kind==='boss'||e.kind==='warden')?7.2:e.kind==='elite'?5:e.mutation==='colossal'?6:4.2}
const faceHero=(from)=>Math.atan2(S.FWD.x,S.FWD.z)+1.1;
const faceFoe=(p)=>Math.atan2(CAM_POS.x-p.x,CAM_POS.z-p.z)-.35;

/* ---------- syncing models with the game's state ---------- */
function gearSig(h){const g=h.gear||{};return ['weapon','helmet','chest','pants','ring1','ring2','amulet'].map(k=>g[k]?(g[k].id||g[k].name||'x')+(g[k].rarity||''):'-').join('|')+(h.look?JSON.stringify(h.look):'')}
function syncHeroes(){
  const run=G().state.run,P=G().partyAll(),seen=new Set();
  P.forEach((h,i)=>{
    seen.add(h.id);let m=S.heroes.get(h.id);const sig=gearSig(h);
    if(m&&m.sig!==sig){S.scene.remove(m.H.root);m=null;S.heroes.delete(h.id)}
    if(!m){const H=D3.buildHero(h,{scale:.2});S.scene.add(H.root);
      const box=new T.Box3().setFromObject(H.root),k=HERO_W/5;H.root.scale.setScalar(.2*k);
      m={H,sig,h:Math.max(3,box.max.y*k),dead:false,off:new T.Vector3(),cast:0};S.heroes.set(h.id,m)}
    m.hero=h;m.slot=i;m.base=heroSlot(i,P.length);m.H.baseY=0;m.H.root.rotation.y=faceHero();
    const dead=h.hp<=0;
    if(dead&&!m.dead){D3.setPose(m.H,'dead');m.dead=true}
    else if(!dead&&m.dead){D3.setPose(m.H,'idle');m.dead=false}
    else if(!dead&&!m.pose)D3.setPose(m.H,'idle');
    if(!m.moving)m.H.root.position.copy(m.base).add(m.off);
  });
  for(const [id,m] of [...S.heroes])if(!seen.has(id)){S.scene.remove(m.H.root);S.heroes.delete(id)}
}
function syncFoes(){
  const b=G().state.run.battle,E=b.enemies,seen=new Set();
  E.forEach((e,i)=>{
    seen.add(e);let m=S.foes.get(e);
    const sig=(e.base||e.name)+'|'+(e.kind==='king'?kphOf(e):'');
    if(m&&m.sig!==sig){S.scene.remove(m.F.root);S.foes.delete(e);m=null}
    if(!m){const F=D3.buildFoe(e,{height:foeHeight(e)});S.scene.add(F.root);
      m={F,sig,dead:false,gone:false,off:new T.Vector3()};S.foes.set(e,m);
      if(e.hp<=0){m.dead=true;m.gone=true;F.root.visible=false}}
    m.e=e;m.idx=i;m.base=foeSlot(i,E.length,e.kind==='boss'||e.kind==='warden'||e.kind==='king');m.F.root.rotation.y=faceFoe(m.base);m.yaw=m.F.root.rotation.y;
    if(e.hp<=0&&!m.dead){m.dead=true;F_pose(m,'dead',.9);m.deadAt=S.t}
    else if(e.hp>0&&m.dead){m.dead=false;m.gone=false;m.F.root.visible=true;F_pose(m,'idle')}
    if(m.dead&&!m.gone&&m.deadAt!=null&&S.t-m.deadAt>1.1){m.gone=true;m.F.root.visible=false}
    if(!m.moving)m.F.root.position.copy(m.base).add(m.off);
    if(e.stun>0&&!m.dead&&m.F.pose==='idle')m.F.pose='idle';
  });
  for(const [e,m] of [...S.foes])if(!seen.has(e)){S.scene.remove(m.F.root);S.foes.delete(e)}
}
const kphOf=e=>e&&e.kind==='king'&&e.maxHp?(e.hp<=0?4:Math.min(4,Math.floor((1-e.hp/e.maxHp)*5))):0;
function F_pose(m,p,d){m.F.setPose(p,d)}

/* ---------- tasks: small timed animations ---------- */
function task(dur,fn,done,delay){S.tasks.push({t:-(delay||0),dur,fn,done})}
function stepTasks(dt){
  for(let i=S.tasks.length-1;i>=0;i--){const k=S.tasks[i];k.t+=dt;if(k.t<0)continue;const p=clamp(k.t/k.dur,0,1);k.fn&&k.fn(p,dt);if(p>=1){k.done&&k.done();S.tasks.splice(i,1)}}
}
const elCol=el=>(G().EL_COL&&G().EL_COL[el])||null;
function burst(pos,color,n,spd,size,up){
  for(let i=0;i<n;i++){const a=Math.random()*6.28,e=Math.random()*3.14-1.2,s=spd*(.4+Math.random());
    S.fx.emit(pos.x,pos.y,pos.z,Math.cos(a)*Math.cos(e)*s,Math.sin(e)*s+(up||0),Math.sin(a)*Math.cos(e)*s,.5+Math.random()*.5,color,size*(.6+Math.random()*.8),1)}
}
function flash(pos,color,size){const h=D3.halo(color,size,.9);h.position.copy(pos);S.scene.add(h);task(.28,p=>{h.material.opacity=.9*(1-p);h.scale.setScalar(size*(1+p*.8))},()=>{S.scene.remove(h);h.material.dispose()})}
function chest(m,isFoe){const y=isFoe?m.F.h*.5:m.h*.55,v=(isFoe?m.F.root:m.H.root).position;return new T.Vector3(v.x,y,v.z)}
function hitFoe(m,col,crit){
  if(!m)return;m.F.setFlash(1);m.F.setPose('hurt',.4);
  const c=chest(m,true);burst(c,col||'#ffffff',crit?26:14,crit?7:4.5,.5);flash(c,col||'#ffffff',crit?5:3);
}
function hitHero(m,crit){
  if(!m)return;m.H.setFlash(1);D3.setPose(m.H,'hurt');
  const c=chest(m,false);burst(c,'#ff9a8a',crit?20:10,crit?6:4,.45);flash(c,'#ff6a5a',crit?4.5:3);
}
function fly(from,to,color,dur,opts,done){
  opts=opts||{};
  const grp=new T.Group(),core=D3.halo(color,opts.size||1.4,1);grp.add(core);
  let arrow=null;
  if(opts.arrow){const v=new D3.Vox();v.box(0,0,-5,0,0,5,0xd8c8a0);v.box(0,0,5,0,0,6,0xffffff);v.box(-1,0,-5,1,0,-4,0xe8e0d0);v.box(0,-1,-5,0,1,-4,0xe8e0d0);arrow=v.mesh({jit:0});arrow.scale.setScalar(.13);grp.add(arrow)}
  grp.position.copy(from);S.scene.add(grp);
  const mid=from.clone().lerp(to,.5);mid.y+=opts.arc==null?1.6:opts.arc;
  const q=new T.Vector3();
  task(dur,p=>{
    const a=from,b=mid,c=to,u=1-p;q.set(u*u*a.x+2*u*p*b.x+p*p*c.x,u*u*a.y+2*u*p*b.y+p*p*c.y,u*u*a.z+2*u*p*b.z+p*p*c.z);
    if(arrow){const nx=Math.min(1,p+.03),w=1-nx;const nxp=new T.Vector3(w*w*a.x+2*w*nx*b.x+nx*nx*c.x,w*w*a.y+2*w*nx*b.y+nx*nx*c.y,w*w*a.z+2*w*nx*b.z+nx*nx*c.z);arrow.lookAt(nxp.sub(q).add(q).clone());arrow.position.set(0,0,0);grp.lookAt(nxp)}
    grp.position.copy(q);
    if(opts.trail&&Math.random()<.8)S.fx.emit(q.x,q.y,q.z,(Math.random()-.5)*.8,(Math.random()-.5)*.8,(Math.random()-.5)*.8,.4,color,.5,.8)
  },()=>{S.scene.remove(grp);core.material.dispose();done&&done()});
}

/* ---------- reacting to what the game just did (called by battleScreen with the fx flags) ---------- */
D3.battleFx=function(fx,b){S.pend.push({fx:Object.assign({},fx),b})};
function runFx(){
  if(!S.pend.length)return;
  const list=S.pend.splice(0);
  for(const {fx,b} of list)runOne(fx,b);
}
function heroOf(id){return S.heroes.get(id)||S.heroes.get(String(id))||[...S.heroes.values()].find(m=>String(m.hero.id)===String(id))}
function foeAt(i){const e=G().state.run.battle.enemies[i];return e&&S.foes.get(e)}
function poseFor(cls,sk){
  if(sk){const f=String(sk.id);if(/slash|cleave|crush|titan|coup|execute|assassin|sunder|stunblow|killshot|combo|quake|double|cripple/.test(f)&&cls==='warrior')return 'attack'}
  return cls==='warrior'?'attack':cls==='archer'?'shoot':'cast'}
function runOne(fx,b){
  const col=fx.sk&&fx.sk.c?fx.sk.c:null;
  // who acts
  if(fx.act&&fx.act[0]==='h'){
    const m=heroOf(fx.act.slice(2));
    if(m&&!m.dead){
      const cls=m.hero.cls,tg=(fx.atk?fx.atk.tg:fx.sk?fx.sk.tg:[]).map(foeAt).filter(Boolean),pose=poseFor(cls,fx.sk),c=col||(cls==='mage'?elCol(b.attune&&b.attune[m.hero.id])||'#a8d8ff':cls==='archer'?'#ffe9a0':'#ffffff');
      const crit=!!fx.crit;
      D3.setPose(m.H,pose,.6);
      const t0=tg[0];
      if(pose==='attack'&&t0){ // run up, hit, run back
        m.moving=true;const from=m.base.clone(),to=t0.base.clone().sub(from);const dist=Math.max(0,to.length()-2.8);to.normalize();
        task(.7,p=>{const q=p<.35?easeOut(p/.35):p<.6?1:1-easeOut((p-.6)/.4);m.H.root.position.copy(from).addScaledVector(to,dist*q)},()=>{m.moving=false;m.H.root.position.copy(m.base)});
        for(const t of tg)task(.01,null,()=>{hitFoe(t,c,crit);if(crit){S.shake=.5}},.28);
      }else if(pose==='shoot'||pose==='cast'){
        const src=chest(m,false);src.y=m.h*.7;
        if(!tg.length&&fx.sk&&fx.sk.al&&fx.sk.al.length){ // support spell: sparkles over allies
          for(const id of fx.sk.al){const a=heroOf(id);if(a){const cc=chest(a,false);task(.5,p=>{if(Math.random()<.9)S.fx.emit(cc.x+(Math.random()-.5)*2,.2+p*m.h,cc.z+(Math.random()-.5)*2,0,2.2,0,.8,c||'#9aff9a',.5,.9)});flash(cc,c||'#9aff9a',4.5)}}
          flash(src,c||'#ffffff',3);
        }
        tg.forEach((t,j)=>{fly(src,chest(t,true),c,.34,{arrow:pose==='shoot'&&!fx.sk,trail:pose==='cast',size:pose==='cast'?2:1.1},()=>hitFoe(t,c,crit));
          if(pose==='cast')flash(src,c,2.5)},0);
        if(!tg.length&&!(fx.sk&&fx.sk.al&&fx.sk.al.length))flash(src,c,3);
      }
      if(fx.sk&&!tg.length&&pose==='attack'){flash(chest(m,false),c,4)}
      S.punch=.35;
    }
  }else if(fx.act&&fx.act[0]==='e'){
    const m=foeAt(+fx.act.slice(2));
    if(m&&!m.dead){
      const victims=[...S.heroes.values()].filter(x=>fx['h'+x.hero.id]);
      const v0=victims[0];m.F.setPose('attack',.55);
      if(v0){const from=m.base.clone(),to=v0.base.clone().sub(from),dist=Math.max(0,to.length()-3);
        // lunge toward the victim in world space (the foe's body group is turned, so convert)
        const dir=to.clone().normalize();const th=m.yaw||0,lx=dir.x*Math.cos(th)-dir.z*Math.sin(th),lz=dir.x*Math.sin(th)+dir.z*Math.cos(th);m.F.dir.set(lx,0,lz);m.F.w=Math.max(m.F.w,dist*.5/.9)}
      S.punch=.25;
    }
  }
  // damage taken
  for(const k in fx){
    if(k[0]==='h'&&k.length>1&&k!=='h'&&/^h\d+$/.test(k)){const m=heroOf(k.slice(1));if(m&&m.hero.hp>0)task(.01,null,()=>hitHero(m,!!fx.crit),fx.act&&fx.act[0]==='e'?.3:.05)}
    else if(/^burst\d+$/.test(k)){const m=foeAt(+k.slice(5));if(m)task(.01,null,()=>{burst(chest(m,true),fx[k],18,5,.55);flash(chest(m,true),fx[k],4)},.3)}
    else if(/^die\d+$/.test(k)){const m=foeAt(+k.slice(3));if(m){task(.01,null,()=>{m.dead=true;m.deadAt=S.t;m.F.setPose('dead',.9);const c=chest(m,true);burst(c,elCol(m.e.type)||'#d8cfc0',40,7,.7,2);S.shake=Math.max(S.shake,.35)},.32)}}
    else if(/^frz\d+$/.test(k)){const m=foeAt(+k.slice(3));if(m){const c=chest(m,true);burst(c,'#bfe9ff',24,3,.6);flash(c,'#bfe9ff',5)}}
    else if(/^refl\d+$/.test(k)){const m=foeAt(+k.slice(4));if(m)flash(chest(m,true),'#ffffff',4)}
  }
  if(fx.shake)S.shake=Math.max(S.shake,fx.crit?.8:.4);
}

/* ---------- the scene ---------- */
function enter(){if(!S.built)build();S.t=0}
function leave(){S.tasks.length=0;S.pend.length=0}
function update(dt,t){
  S.t=t;
  const run=G().state.run;if(!run||!run.battle)return;
  const b=run.battle;if(!S.arena)return;
  // keep the models in step with the game (cheap: a few dozen comparisons)
  if(Math.abs((S.camera.aspect||1.8)-S.lay.asp)>.01){layout();S.relay=true}
  syncHeroes();syncFoes();
  if(b.over==='win'){for(const m of S.heroes.values())if(!m.dead&&m.H.pose==='idle'&&!m.moving){D3.setPose(m.H,'cheer')}}
  else for(const m of S.heroes.values())if(m.H.pose==='cheer')D3.setPose(m.H,'idle');
  stepTasks(dt);
  for(const m of S.heroes.values()){
    // pose returns to idle after one-shot poses
    const H=m.H;if((H.pose==='attack'||H.pose==='shoot'||H.pose==='cast')&&H.pt>(H.pd||.6)+.25)D3.setPose(H,'idle');
    if(H.pose==='hurt'&&H.pt>.5)D3.setPose(H,m.dead?'dead':'idle');
    H.update(dt,t);
  }
  for(const m of S.foes.values())if(!m.gone)m.F.update(dt,t);
  S.fx.update(dt);S.arena.update(dt,t);
  // rings
  const cur=!b.over?G().currentActor():null,cm=cur&&heroOf(cur.id);
  S.ringH.visible=!!(cm&&!cm.dead);if(S.ringH.visible){S.ringH.position.x=cm.H.root.position.x;S.ringH.position.z=cm.H.root.position.z;const s=1.55+Math.sin(t*4)*.08;S.ringH.scale.set(s,s,s)}
  const tm=!b.over&&b.enemies[b.target]&&S.foes.get(b.enemies[b.target]);
  S.ringF.visible=!!(tm&&!tm.dead&&b.enemies[b.target].hp>0);if(S.ringF.visible){const w=Math.max(1.9,tm.F.w*.55);S.ringF.position.x=tm.F.root.position.x;S.ringF.position.z=tm.F.root.position.z;S.ringF.scale.set(w,w,w);S.ringF.material.opacity=.6+Math.sin(t*6)*.3}
  // active hero steps forward a little
  for(const m of S.heroes.values()){const want=cm===m&&!m.dead?.55:0;m.step=D3.smooth(m.step||0,want,8,dt);m.off.copy(S.FWD).multiplyScalar(m.step);if(!m.moving)m.H.root.position.copy(m.base).add(m.off)}
  // camera: slow drift, a push-in on attacks, a shake on crits
  S.punch=D3.smooth(S.punch,0,5,dt);S.shake=Math.max(0,S.shake-dt*1.6);
  const cam=S.camera,sway=Math.sin(t*.35)*.5,asp=cam.aspect||1.8;
  const fov=asp>=2?35:35+(2-asp)*14;if(Math.abs(cam.fov-fov)>.01){cam.fov=fov;cam.updateProjectionMatrix()}
  cam.position.set(CAM_POS.x+sway*.6,CAM_POS.y-S.punch*.3,CAM_POS.z).addScaledVector(new T.Vector3().subVectors(CAM_LOOK,CAM_POS).normalize(),S.punch*1.4);
  if(S.shake>0){cam.position.x+=(Math.random()-.5)*S.shake*.6;cam.position.y+=(Math.random()-.5)*S.shake*.6}
  cam.lookAt(CAM_LOOK);
}
function overlay(){
  const stage=D3.slot&&D3.slot.parentElement;if(!stage)return;
  const units=stage.querySelectorAll('.unit[data-u]');
  const wide=document.body.classList.contains('lay-wide');
  for(const el of units){
    const u=el.dataset.u;let m,isFoe=u[0]==='e';
    if(isFoe){const e=G().state.run.battle.enemies[+u.slice(1)];m=e&&S.foes.get(e)}else m=heroOf(u.slice(1));
    if(!m){el.style.visibility='hidden';continue}
    const root=isFoe?m.F.root:m.H.root,h=isFoe?m.F.h:m.h,base=root.position;
    const p0=D3.toScreen(new T.Vector3(base.x,0,base.z)),p1=D3.toScreen(new T.Vector3(base.x,h,base.z));
    const fh=Math.max(20,p0.y-p1.y),fw=Math.max(24,isFoe?fh*(m.F.w/m.F.h):fh*.7);
    el.style.visibility='visible';
    el.style.setProperty('--fh',fh.toFixed(1)+'px');el.style.setProperty('--fw',fw.toFixed(1)+'px');
    el.style.transform=`translate(calc(${p0.x.toFixed(1)}px - 50%),${p1.y.toFixed(1)}px)`;
    el.style.zIndex=String(Math.round(p0.y));
  }
}
D3.scenes.battle={scene:null,camera:null,enter,leave,update,overlay,resize(){}};
// scene/camera are created lazily; expose them once built
Object.defineProperty(D3.scenes.battle,'scene',{get(){if(!S.built)build();return S.scene}});
Object.defineProperty(D3.scenes.battle,'camera',{get(){if(!S.built)build();return S.camera}});
(D3.after=D3.after||{}).battle=function(slot){
  if(!S.built)build();
  const run=G().state.run;if(!run||!run.battle)return;
  setBiome(run.biome);if(Math.abs((S.camera.aspect||1.8)-S.lay.asp)>.01)layout();syncHeroes();syncFoes();runFx();
};
D3.battleState=S;
})();
