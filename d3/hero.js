/* 3D mode: heroes and equipment.
   A chibi hero built from voxels in separate parts (legs, body, head, arms) so it can walk, swing and flinch.
   Every piece of gear has its own model, styled by its type, rarity and element, and is shown on the hero. */
(function(){
'use strict';
const D3=window.DS3D,T=D3.T,Vox=D3.Vox,EMIT=D3.EMIT,FLAT=D3.FLAT,hexNum=D3.hexNum,shade=D3.shade,mix=D3.mix;

const RARC={common:0xb9b1a3,rare:0x5f97e3,epic:0xb56fe3,godlike:0xf2a83a,perfect:0xff5c7a};
const ELC={fire:0xe0643a,grass:0x6fb35a,fighting:0xc98b5c,thunder:0xe6d55a,ice:0x8fd0ea,dark:0x9b6bd8};
D3.RARC=RARC;D3.ELC=ELC;

/* ---------- gear palette: what a piece of gear is made of, by rarity ---------- */
function gearPal(it){
  const r=(it&&it.rarity)||'common',steel=0xb4b8c4;let P;
  if(r==='common')P={metal:steel,leather:0x7a5a38,accent:0x8c8f9c,glow:null};
  else if(r==='rare')P={metal:mix(steel,RARC.rare,.5),leather:0x5a4a3a,accent:RARC.rare,glow:null};
  else if(r==='epic')P={metal:mix(0x9a8ab8,RARC.epic,.45),leather:0x4a3a5a,accent:RARC.epic,glow:RARC.epic};
  else if(r==='godlike')P={metal:mix(0xe3b341,0xf6c860,.4),leather:0x6a4a22,accent:0xfff0a8,glow:0xffc850};
  else{const pl=it&&it.pid&&D3.G&&D3.G.perfLook&&D3.G.perfLook(it.pid);const c=pl?hexNum(pl.c):RARC.perfect;P={metal:mix(0xe8e4ee,c,.5),leather:0x5a3a3a,accent:c,glow:c}}
  P.dark=shade(P.metal,-.38);P.light=shade(P.metal,.32);P.r=r;P.el=it&&it.el&&ELC[it.el]?ELC[it.el]:null;P.dk=shade(P.leather,-.35);
  return P;
}
D3.gearPal=gearPal;

/* ---------- weapons: each faces up (+Y) from the grip at the origin, flat side toward +Z ---------- */
const BASE_OF=it=>{ // base type from the item name (the last word), or the perfect weapon's own base
  if(!it)return '';if(it.pid&&D3.G&&D3.G.perfBase)return D3.G.perfBase(it.pid);
  const w=String(it.name||'').trim().split(/\s+/);return w[w.length-1];
};
function wLongsword(P,v){
  v.box(0,-3,0,0,-1,0,P.leather);v.set(0,-4,0,P.accent);v.set(0,-4,0,P.accent);
  v.box(-4,0,-1,4,0,1,P.accent);v.box(-4,1,0,-4,1,0,P.accent);v.box(4,1,0,4,1,0,P.accent);v.set(0,0,1,P.glow||P.light,P.glow?EMIT:0);
  for(let y=1;y<=15;y++){const w=y>12?(y>14?0:1):1;v.box(-w,y,0,w,y,0,y%5===0?P.light:P.metal);if(w>0)v.set(0,y,0,P.light);else v.set(0,y,0,P.light)}
  v.set(0,16,0,P.light);if(P.glow){for(let y=3;y<=14;y+=2)v.set(0,y,1,P.glow,EMIT)}
  if(P.el)v.box(0,12,1,0,15,1,P.el,EMIT);return 17}
function wWarhammer(P,v){
  v.box(0,-4,0,0,15,0,P.leather);v.box(1,-4,0,1,15,0,P.dk);for(let y=-3;y<=14;y+=4)v.box(-1,y,-1,1,y,1,P.dk);
  v.box(-5,11,-2,5,16,2,P.metal);v.box(-5,11,-2,5,11,2,P.dark);v.box(-5,16,-2,5,16,2,P.light);v.box(-6,12,-1,-6,15,1,P.accent);v.box(6,12,-1,6,15,1,P.accent);
  v.box(-1,17,-1,1,19,1,P.accent);v.box(-1,10,-1,1,10,1,P.accent);
  if(P.glow){v.box(-3,13,2,3,14,2,P.glow,EMIT)}if(P.el){v.box(-4,13,3,4,14,3,P.el,EMIT)}return 20}
function wFalchion(P,v){
  v.box(0,-3,0,0,-1,0,P.leather);v.set(0,-4,0,P.accent);v.box(-2,0,-1,2,0,1,P.accent);v.box(-2,1,-1,-2,2,1,P.accent);
  for(let y=1;y<=14;y++){const cz=Math.round(Math.pow(y/14,2)*3),w=y<4?1:2;v.box(0,y,cz,w,y,cz,y%4===0?P.light:P.metal);v.set(w,y,cz,P.light);v.set(0,y,cz,P.dark)}
  v.set(1,15,3,P.light);v.set(1,16,4,P.light);if(P.glow){for(let y=4;y<=13;y+=3)v.set(0,y,Math.round(Math.pow(y/14,2)*3)+1,P.glow,EMIT)}
  if(P.el)v.box(1,10,2,1,14,4,P.el,EMIT);return 17}
function bowShape(P,v,h,bend,tip,thick,wood){
  const n=h*2;
  for(let i=0;i<=n;i++){const t=i/n*2-1,y=Math.round(t*h),z=Math.round((1-t*t)*bend);
    v.box(0,y,z,thick-1,y,z+(thick>1?1:0),Math.abs(t)>.86?P.metal:wood)}
  v.box(0,-2,Math.round(bend)+0,thick,2,Math.round(bend)+1,P.leather);
  // string
  for(let y=-h;y<=h;y++)v.set(0,y,-tip,0xf2ead8,FLAT);
  v.set(0,-h-1,-tip,P.metal);v.set(0,h+1,-tip,P.metal)}
function wShortbow(P,v){const w=0x9a6a3a;bowShape(P,v,7,3,0,1,w);if(P.glow)for(let y=-5;y<=5;y+=2)v.set(1,y,Math.round((1-Math.pow(y/7,2))*3),P.glow,EMIT);if(P.el)v.set(0,0,5,P.el,EMIT);return 9}
function wLongbow(P,v){const w=0x7a5028;bowShape(P,v,10,4,0,1,w);for(let y=-9;y<=9;y+=3)v.box(0,y,Math.round((1-Math.pow(y/10,2))*4)+1,0,y,Math.round((1-Math.pow(y/10,2))*4)+1,P.accent);if(P.glow)v.set(0,0,6,P.glow,EMIT);if(P.el)v.set(0,3,6,P.el,EMIT);return 12}
function wRecurve(P,v){
  const h=8;for(let i=0;i<=h*2;i++){const t=i/(h*2)*2-1,y=Math.round(t*h),a=Math.abs(t),z=Math.round(a<.55?(1-a/.55*a/.55)*3.5:-(a-.55)*5);
    v.box(0,y,z,1,y,z,a>.8?P.metal:0x8a5a30)}
  v.box(0,-2,3,1,2,4,P.leather);for(let y=-h-2;y<=h+2;y++)v.set(0,y,-2,0xf2ead8,FLAT);
  if(P.glow)for(let y=-6;y<=6;y+=3)v.set(1,y,3,P.glow,EMIT);if(P.el)v.set(0,0,5,P.el,EMIT);return 11}
function wStaff(P,v){
  v.box(0,-6,0,0,15,0,0x7a5230);v.box(1,-6,0,1,15,0,0x5a3a20);for(let y=-4;y<=12;y+=4)v.box(-1,y,-1,1,y,1,P.accent);
  v.box(-2,16,0,2,16,0,P.metal);v.box(-2,17,0,-2,19,0,P.metal);v.box(2,17,0,2,19,0,P.metal);
  const oc=P.el||P.glow||0x9fd6ff;v.ell(0,18,0,2.1,2.1,2.1,oc,EMIT);v.set(0,18,2,0xffffff,EMIT);return 21}
function wRod(P,v){
  v.box(0,-5,0,1,10,1,P.metal);v.box(0,-5,0,0,10,0,P.light);for(let y=-3;y<=9;y+=4)v.box(-1,y,-1,2,y,2,P.accent);
  const oc=P.el||P.glow||0x9fd6ff;
  // faceted crystal
  v.box(0,11,0,1,12,1,oc,EMIT);v.box(-1,12,-1,2,14,2,oc,EMIT);v.box(0,15,0,1,17,1,oc,EMIT);v.set(0,18,0,0xffffff,EMIT);
  v.set(-2,13,0,P.metal);v.set(3,13,1,P.metal);return 20}
function wCrook(P,v){
  v.box(0,-6,0,0,12,0,0x6a4a28);v.box(1,-6,0,1,12,0,0x4a3018);
  // hooked top: a curl bending forward and down
  const pts=[[0,13],[0,14],[1,15],[2,15],[3,14],[3,13],[3,12]];for(const [z,y] of pts){v.box(0,y,z,1,y,z,0x6a4a28)}
  for(let y=-4;y<=10;y+=5)v.box(-1,y,-1,1,y,1,P.accent);
  const oc=P.el||P.glow||0x8fe08a;v.ell(0,11,3,1.4,1.4,1.4,oc,EMIT);v.set(-1,15,2,0x4a9a4a);v.set(2,16,1,0x6fb35a);v.set(-1,13,-1,0x4a9a4a);return 18}
const WEAPONS={Longsword:wLongsword,Warhammer:wWarhammer,Falchion:wFalchion,Shortbow:wShortbow,Longbow:wLongbow,Recurve:wRecurve,Staff:wStaff,Rod:wRod,Crook:wCrook};
const WDEF={warrior:'Longsword',archer:'Longbow',mage:'Staff'};
function weaponVox(it,cls){
  const P=gearPal(it),v=new Vox();let base=BASE_OF(it);if(!WEAPONS[base])base=WDEF[(it&&it.cls)||cls]||'Longsword';
  const len=WEAPONS[base](P,v);return {v,len,base,P};
}
D3.weaponVox=weaponVox;

/* ---------- armor pieces, built in hero space (the hero stands at the origin: head y 11-18, torso y 5-10, legs y 0-4) ---------- */
function helmetVox(it,cls,hair){
  const P=gearPal(it),v=new Vox();
  if(cls==='warrior'){ // Greathelm: closed helm, visor slit, crest
    v.ell(0,14.6,0,5.2,4.9,5.1,P.metal);for(let x=-5;x<=5;x++)for(let z=-5;z<=5;z++)for(let y=9;y<=11;y++)v.del(x,y,z);
    v.box(-5,11,-5,5,11,5,P.dark,0);for(let x=-5;x<=5;x++)for(let y=11;y<=19;y++)for(let z=-5;z<=5;z++){const k=v.get(x,y,z);if(k==null)continue;if(y===14&&z>=3&&Math.abs(x)<=3)v.set(x,y,z,0x0a0810);}
    v.box(-3,15,5,3,15,5,0x0a0810);v.box(-3,14,5,3,14,5,0x0a0810);v.box(0,11,5,0,13,5,P.dark);
    v.box(0,19,-4,0,20,4,P.dark);v.box(0,21,-3,0,22,3,P.accent);v.box(0,23,-2,0,23,1,P.accent);
    if(P.r!=='common'){v.box(-6,15,-1,-6,17,1,P.accent);v.box(6,15,-1,6,17,1,P.accent)}
    if(P.r==='epic'||P.r==='godlike'||P.r==='perfect'){v.box(-7,17,0,-7,19,0,P.light);v.box(7,17,0,7,19,0,P.light);v.box(-8,19,0,-8,21,0,P.light);v.box(8,19,0,8,21,0,P.light)}
    if(P.glow){v.set(-2,14,5,P.glow,EMIT);v.set(2,14,5,P.glow,EMIT)}
  }else if(cls==='archer'){ // Hood: studded leather hood
    v.ell(0,14.8,-.5,5.4,5.1,5.3,P.leather);for(let x=-6;x<=6;x++)for(let y=9;y<=22;y++)for(let z=1;z<=7;z++){const dx=x/3.3,dy=(y-14.2)/3.6;if(dx*dx+dy*dy<1)v.del(x,y,z)}
    for(let x=-6;x<=6;x++)for(let z=-6;z<=6;z++)v.del(x,10,z),v.del(x,9,z);
    v.cone(0,-5,18,23,3,0,P.leather);v.set(0,24,-6,P.leather);
    v.box(-4,17,3,4,17,3,P.accent);for(let x=-4;x<=4;x+=2)v.set(x,16,3,P.metal);
    if(P.r!=='common'){v.box(-6,13,-1,-6,15,-1,P.accent);v.box(6,13,-1,6,15,-1,P.accent)}
    if(P.glow)v.set(0,18,4,P.glow,EMIT);
  }else{ // Circlet over the hat brim or hair
    for(let a=0;a<28;a++){const t=a/28*Math.PI*2,x=Math.round(Math.cos(t)*5.2),z=Math.round(Math.sin(t)*5.0);v.box(x,16,z,x,16,z,P.metal)}
    v.box(0,17,5,0,18,5,P.light);v.ell(0,17,5.6,1.3,1.5,.8,P.glow||P.accent,EMIT);
    if(P.r!=='common'){v.box(-4,17,4,-4,18,4,P.light);v.box(4,17,4,4,18,4,P.light)}
    if(P.r==='epic'||P.r==='godlike'||P.r==='perfect'){v.set(-6,17,0,P.light);v.set(6,17,0,P.light);v.set(-6,18,0,P.light,EMIT);v.set(6,18,0,P.light,EMIT)}
  }
  return v;
}
function chestVox(it,cls){
  const P=gearPal(it),v=new Vox();
  if(cls==='warrior'){ // Cuirass with pauldrons
    v.box(-4,5,-3,4,10,3,P.metal);v.box(-4,5,3,4,5,3,P.dark);v.box(-4,5,-3,4,5,-3,P.dark);
    v.box(0,6,3,0,10,3,P.light);v.box(-3,8,3,3,8,3,P.dark);v.box(-3,10,3,3,10,3,P.light);
    v.box(-4,6,3,-4,6,3,P.accent);v.box(4,6,3,4,6,3,P.accent);v.box(-1,7,4,1,7,4,P.accent);
    for(const s of [-1,1]){v.ell(s*5.6,10.2,0,2.7,2.1,3,P.metal);v.ell(s*5.9,11,0,1.8,1,2.2,P.light);v.box(s*5.6,9,0,s*5.6,9,0,P.accent)}
    if(P.glow){v.box(-1,8,4,1,9,4,P.glow,EMIT)}
  }else if(cls==='archer'){ // Jerkin: leather vest with straps
    v.box(-4,5,-3,4,10,3,P.leather);v.box(-4,5,3,4,5,3,P.dk);
    for(let i=0;i<6;i++){v.set(-3+i,10-i,3,P.accent);v.set(-3+i,9-i,3,P.accent)}
    v.box(-4,9,3,4,9,3,P.dk,0);v.box(-4,5,3,4,5,3,P.accent);for(let x=-3;x<=3;x+=2)v.set(x,6,4,P.metal);
    v.box(-5,10,-2,-5,10,2,P.leather);v.box(5,10,-2,5,10,2,P.leather);
    if(P.glow)v.set(0,8,4,P.glow,EMIT);
  }else{ // Robe: layered robe with sash and mantle
    v.cone(0,0,0,7,5.6,3.6,P.accent);v.box(-4,5,-3,4,10,3,P.accent);
    for(let y=0;y<=2;y++)v.cone(0,0,y,y,5.8-y*.05,5.8-y*.05,y%2?P.metal:shade(P.accent,-.2));
    v.box(-4,5,3,4,6,3,P.metal);v.box(0,0,5,0,10,5,P.light);
    v.ell(0,10.5,0,5.6,1.6,3.8,P.light);v.ell(0,10,0,6,1.3,4,P.metal);
    if(P.glow){v.set(0,2,5,P.glow,EMIT);v.set(0,5,5,P.glow,EMIT);v.set(0,8,5,P.glow,EMIT)}
  }
  return v;
}
function pantsVox(it,cls){ // returns {l,r} for each leg, centered on the leg's own column
  const P=gearPal(it),L=new Vox(),R=new Vox();
  const leg=(v,s)=>{
    const x0=s<0?-3:1,x1=s<0?-1:3;
    if(cls==='warrior'){v.box(x0-1,1,-2,x1+1,4,2,P.metal);v.box(x0-1,0,-2,x1+1,1,2,P.dark);v.box(x0-1,1,2,x1+1,4,2,P.metal);v.box(x0,3,3,x1,3,3,P.light);v.box(x0-1,4,-2,x1+1,4,2,P.light);v.box(x0-1,0,2,x1+1,0,3,P.dark);if(P.glow)v.set((x0+x1)/2,3,3,P.glow,EMIT)}
    else if(cls==='archer'){v.box(x0,0,-1,x1,4,1,P.leather);v.box(x0-1,0,-1,x1+1,1,2,P.dk);for(const y of [2,4])v.box(x0,y,-2,x1,y,2,P.accent);if(P.glow)v.set((x0+x1)/2,2,2,P.glow,EMIT)}
    else{v.box(x0-1,0,-2,x1+1,1,2,P.metal);v.box(x0,2,-1,x1,3,1,P.accent);if(P.glow)v.set((x0+x1)/2,1,3,P.glow,EMIT)}
  };
  leg(L,-1);leg(R,1);return {l:L,r:R,P};
}
function ringVox(it){
  const P=gearPal(it),v=new Vox(),base=String((it&&it.name)||'Ring').trim().split(/\s+/).pop(),gem=P.glow||P.accent;
  const N=16;for(let a=0;a<N;a++){const t=a/N*Math.PI*2,x=Math.round(Math.cos(t)*3.4),y=Math.round(Math.sin(t)*3.4);v.box(x,y,0,x,y,base==='Band'?1:0,P.metal)}
  if(base==='Band'){for(let a=0;a<N;a+=2){const t=a/N*Math.PI*2,x=Math.round(Math.cos(t)*3.4),y=Math.round(Math.sin(t)*3.4);v.set(x,y,2,P.accent)}}
  else if(base==='Signet'){v.box(-1,3,0,1,5,1,P.light);v.box(-1,3,2,1,5,2,P.metal);v.set(0,4,2,P.accent)}
  else{v.ell(0,4.5,0,1.5,1.5,1.2,gem,EMIT);v.set(0,6,0,P.light)}
  return v;
}
function amuletVox(it){
  const P=gearPal(it),v=new Vox(),base=String((it&&it.name)||'Amulet').trim().split(/\s+/).pop(),gem=P.glow||P.accent;
  // chain loop above, charm below
  for(let a=0;a<18;a++){const t=a/18*Math.PI*2,x=Math.round(Math.cos(t)*4),y=Math.round(Math.sin(t)*5)+7;v.set(x,y,0,P.metal)}
  v.box(-1,0,0,1,1,0,P.metal);
  if(base==='Pendant'){v.box(-1,-1,0,1,-1,0,P.metal);v.ell(0,-3,0,1.6,2.6,1.2,gem,EMIT);v.set(0,-5,0,P.light)}
  else if(base==='Talisman'){v.ell(0,-2,0,3,3,1,P.metal);v.ell(0,-2,1,1.6,1.6,.6,gem,EMIT);for(const [x,y] of [[0,-6],[4,-2],[-4,-2],[0,2]])v.set(x,y,0,P.light)}
  else{v.ell(0,-2,0,2.6,2.6,1.2,P.metal);v.ell(0,-2,1,1.5,1.5,.6,gem,EMIT);v.set(0,-5,0,P.light)}
  return v;
}

/* ---------- the hero ---------- */
const SKIN0=0xe0b08a,HAIR0=0x5a3a24;
function look(h){
  const G=D3.G;let L=null;try{L=G&&G.heroLook?G.heroLook(h):null}catch(e){}
  const cw=(L&&L.cw)||{A:'#a83838',p:'#4a3a30',b:'#6a4a2a'};
  return {A:hexNum(cw.A),p:hexNum(cw.p),b:hexNum(cw.b),skin:L&&L.skin?hexNum(L.skin):SKIN0,hair:L&&L.hair?hexNum(L.hair):HAIR0};
}
function gearKey(h){const g=(h&&h.gear)||{};return ['weapon','helmet','chest','pants','ring1','ring2','amulet'].map(s=>{const it=g[s];return it?[it.rarity,it.name,it.el||'',it.pid||''].join(':'):'-'}).join('|')}
function lookKey(h,L){return [h.cls,L.A,L.skin,L.hair].join('/')}

function buildParts(h){
  const cls=h.cls,L=look(h),g=h.gear||{},A=L.A,Ad=shade(A,-.3),Al=shade(A,.22),skin=L.skin,skinD=shade(skin,-.18),hair=L.hair,hairL=shade(hair,.2),belt=L.b,pc=L.p;
  const P={};
  const front=(v,x,y,z0)=>{for(let z=z0||8;z>=-8;z--)if(v.has(x,y,z))return z;return 0};
  /* head */
  const head=new Vox();
  head.ell(0,14.6,0,4.7,4.4,4.5,skin);
  const fz=x=>front(head,x,14);
  head.set(-2,14,fz(-2)+1,0x14101a,FLAT);head.set(2,14,fz(2)+1,0x14101a,FLAT);head.set(-2,15,fz(-2)+1,0x14101a,FLAT);head.set(2,15,fz(2)+1,0x14101a,FLAT);
  head.set(-3,12,fz(-3)+1,mix(skin,0xe08070,.4),FLAT);head.set(3,12,fz(3)+1,mix(skin,0xe08070,.4),FLAT);head.set(0,12,fz(0)+1,skinD,FLAT);
  head.box(-5,14,0,-5,14,0,skin);head.box(5,14,0,5,14,0,skin); // ears
  const hasHelm=!!g.helmet;
  // hair / hat by class (hidden or reshaped under a helmet)
  if(cls==='warrior'){ if(!hasHelm){head.ell(0,16.3,-.8,5,3.2,5.1,hair);for(let x=-5;x<=5;x++)for(let y=11;y<=14;y++)for(let z=1;z<=5;z++)head.del(x,y,z);
      for(let x=-4;x<=4;x++)if(x%2===0)head.set(x,16,5,hair);head.set(-1,17,6,hair);head.set(1,17,6,hairL);head.box(-4,15,5,4,15,5,belt)} }
  else if(cls==='archer'){ if(!hasHelm){ // cowl hood in outfit color
      head.ell(0,15.4,-1,5.2,4.1,5.2,A);for(let x=-6;x<=6;x++)for(let y=10;y<=22;y++)for(let z=1;z<=7;z++){const dx=x/3.5,dy=(y-14.2)/3.6;if(dx*dx+dy*dy<1)head.del(x,y,z)}
      for(let x=-6;x<=6;x++)for(let z=-6;z<=6;z++){head.del(x,10,z);head.del(x,9,z)}
      head.cone(0,-5,19,23,3,0,A);head.set(0,24,-7,Ad);head.box(-4,17,4,4,17,4,Al);head.set(-3,14,fz(-3)+1,skin);head.set(3,14,fz(3)+1,skin)} }
  else if(cls==='monk'){ if(!hasHelm){ // shaved head, headband and a short knot
      head.ell(0,15.6,-1.2,4.6,2.6,4.8,hair);for(let x=-5;x<=5;x++)for(let y=11;y<=15;y++)for(let z=-5;z<=5;z++)head.del(x,y,z);
      head.box(-5,16,-5,5,17,5,A);head.set(0,17,-6,0xe3b341,FLAT);head.ell(0,15.2,-5.4,1.6,1.4,1.4,hair)} }
  else{ if(!hasHelm||true){ // wizard hat
      head.ell(0,15.8,-1.2,4.9,3.4,5,hair);for(let x=-5;x<=5;x++)for(let y=11;y<=14;y++)for(let z=2;z<=5;z++)head.del(x,y,z);
      head.ell(0,18.5,0,7.6,.9,7.6,Ad);head.cyl(0,0,19,20,4.2,4.2,A);head.cone(0,0,21,24,3.6,2.2,A);head.cone(-1,-1,25,27,2,1,A);head.cone(-2,-2,28,29,1,0,A);head.set(-3,29,-3,A);
      head.box(-4,19,-4,4,19,4,(x,y,z)=>belt);head.set(0,19,5,0xe3b341,FLAT);head.set(0,20,5,0xffe08a,EMIT);head.ell(0,15.2,3.4,2.6,1.2,1.2,hair)} }
  if(hasHelm)head.add(helmetVox(g.helmet,cls,hair),0,0,0);
  P.head=head;
  /* body */
  const body=new Vox();
  body.box(-3,5,-2,3,10,2,A);body.box(-3,10,-2,3,10,2,Al);body.box(-3,5,-2,3,5,2,belt);body.set(0,5,3,0xe3b341,FLAT);body.set(0,5,2,0xe3b341,FLAT);body.box(-3,9,-3,3,9,-3,Ad);
  if(cls==='mage'){body.cone(0,0,0,6,5,3.3,A);body.box(-3,5,-2,3,5,2,0x6a4a2a);for(let y=0;y<=1;y++)body.cone(0,0,y,y,5.2,5.2,Ad);body.set(0,5,3,0xe3b341,FLAT);body.box(0,1,4,0,5,4,Al)}
  if(cls==='archer'){body.box(-1,5,-4,1,11,-3,0x6a4a2a);body.box(-1,12,-4,0,12,-3,0x6a4a2a);for(const x of [-1,0,1])body.set(x,13,-3,0xe8e0d0,FLAT),body.set(x,14,-3,0xb83a3a,FLAT);body.box(-3,5,-1,-3,10,-1,pc)}
  if(cls==='warrior'){body.box(-3,9,3,3,9,3,Ad);body.box(-3,6,2,3,6,2,belt)}
  if(g.chest)body.add(chestVox(g.chest,cls),0,0,0);
  if(g.amulet){const am=amuletVox(g.amulet);const s=new Vox();s.add(am,0,0,0);
    // scaled down onto the chest: keep the charm and a short chain
    const gp=gearPal(g.amulet);for(let a=0;a<10;a++){const t=a/10*Math.PI;body.set(Math.round(Math.cos(t)*3),Math.round(9.4-Math.sin(t)*2),3,gp.metal)}
    body.ell(0,6.8,3.6,1.2,1.5,.9,gp.glow||gp.accent,EMIT);body.set(0,8,4,gp.light)}
  P.body=body;
  /* legs */
  const legs={l:new Vox(),r:new Vox()};
  for(const [v,x0,x1] of [[legs.l,-3,-1],[legs.r,1,3]]){v.box(x0,2,-1,x1,4,1,pc);v.box(x0,0,-1,x1,1,2,0x2a1e18)}
  if(cls==='mage'){for(const v of [legs.l,legs.r]){v.m.clear()}for(const [v,x0,x1] of [[legs.l,-3,-1],[legs.r,1,3]]){v.box(x0,0,0,x1,1,3,0x2a1e18)}}
  if(g.pants){const pv=pantsVox(g.pants,cls);legs.l.add(pv.l,0,0,0);legs.r.add(pv.r,0,0,0)}
  P.legL=legs.l;P.legR=legs.r;
  /* arms (shoulder pivot at y=10): sleeve + hand */
  const arm=(s)=>{const v=new Vox(),x0=s<0?-5:4,x1=s<0?-4:5;
    v.box(x0,6,-1,x1,10,0,cls==='archer'?A:A);v.box(x0,5,-1,x1,5,0,skin);v.box(x0,9,-1,x1,10,0,Al);v.box(x0,6,-1,x1,6,0,belt);return v};
  const armL=arm(-1),armR=arm(1);
  if(cls==='warrior'){ // round shield on the far arm
    armL.ell(-6.4,7,.5,1.3,4,4,Ad);armL.ell(-7,7,.5,1,3.4,3.4,A);armL.ell(-7.6,7,.5,.8,1.3,1.3,0xe3b341);armL.box(-7,10,.5,-7,10,.5,0xe3b341);armL.box(-7,4,.5,-7,4,.5,0xe3b341);}
  if(g.chest&&cls==='warrior'){/* pauldrons are on the body piece */}
  // rings on the hands
  const ringBit=(v,x,it)=>{if(!it)return;const gp=gearPal(it);v.box(x-1,5,-2,x+1,5,1,gp.metal);v.set(x,6,1,gp.glow||gp.accent,EMIT)};
  ringBit(armR,4.5,g.ring1);ringBit(armL,-4.5,g.ring2);
  P.armL=armL;P.armR=armR;
  return P;
}

/* Build a hero as a Group. Returns {root,parts,setPose(...),update(dt,t),weapon:{len,base}} */
D3.buildHero=function(h,opts){
  opts=opts||{};
  const key=lookKey(h,look(h))+'#'+gearKey(h),cache=(D3._heroCache=D3._heroCache||new Map());
  let geo=cache.get(key);
  if(!geo){
    const P=buildParts(h),g=h.gear||{},W=g.weapon?weaponVox(g.weapon,h.cls):null;
    const gm=(v,px,py,pz)=>({g:v.geometry({ox:px,oy:py,oz:pz}),pos:[px,py,pz]});
    geo={legL:gm(P.legL,-2,5,0),legR:gm(P.legR,2,5,0),body:gm(P.body,0,5,0),head:gm(P.head,0,11,0),armL:gm(P.armL,-4.5,10,0),armR:gm(P.armR,4.5,10,0)};
    if(W){const wv=W.v;geo.weapon={g:wv.geometry({ox:0,oy:0,oz:0}),len:W.len,base:W.base,P:W.P}}
    cache.set(key,geo);
  }
  const root=new T.Group(),parts={},mats=[];
  const mk=(name,G)=>{const gr=new T.Group();gr.position.set(G.pos[0],G.pos[1],G.pos[2]);
    if(G.g.lit){const m=D3.mat.lit.clone();mats.push(m);const me=new T.Mesh(G.g.lit,m);gr.add(me)}
    if(G.g.glow){const me=new T.Mesh(G.g.glow,D3.mat.glow);gr.add(me)}
    root.add(gr);parts[name]=gr;return gr};
  mk('legL',geo.legL);mk('legR',geo.legR);const body=mk('body',geo.body);mk('head',geo.head);mk('armL',geo.armL);const armR=mk('armR',geo.armR);
  let weapon=null;
  if(geo.weapon){const W=new T.Group();
    if(geo.weapon.g.lit){const m=D3.mat.lit.clone();mats.push(m);W.add(new T.Mesh(geo.weapon.g.lit,m))}
    if(geo.weapon.g.glow)W.add(new T.Mesh(geo.weapon.g.glow,D3.mat.glow));
    armR.add(W);W.position.set(0.5,-4.5,1.5); // in the fist, relative to the shoulder pivot
    parts.weapon=W;weapon={len:geo.weapon.len,base:geo.weapon.base,P:geo.weapon.P}}
  if(!opts.noShadow){const b=D3.blob(7,.55);root.add(b);parts.shadow=b}
  root.scale.setScalar(opts.scale||.2);
  const H={root,parts,mats,weapon,h,pose:'idle',pt:0,flash:0,walk:0,faceYaw:0,baseY:0,seed:Math.random()*10,
    setFlash(v){H.flash=v},
    update(dt,t){animateHero(H,dt,t)}};
  rest(H);return H;
};
function rest(H){const p=H.parts;for(const k of ['legL','legR','armL','armR','body','head']){p[k].rotation.set(0,0,0)}p.body.position.y=5;p.head.position.y=11}
// Poses: idle, walk, attack (melee), shoot, cast, hurt, dead, cheer. pose time H.pt counts up from 0 when the pose is set.
D3.setPose=function(H,pose,dur){if(H.pose===pose&&dur==null)return;H.pose=pose;H.pt=0;H.pd=dur||0};
function animateHero(H,dt,t){
  const p=H.parts,cls=H.h.cls;H.pt+=dt;
  rest(H);
  const idle=Math.sin(t*2.2+H.seed)*.5+.5;
  let bodyY=0,lean=0,headR=0,spin=0;
  const pose=H.pose,pt=H.pt;
  if(pose==='idle'||pose==='cheer'){
    p.body.position.y=5+idle*.35;p.head.position.y=11+idle*.35;p.head.rotation.y=Math.sin(t*.8+H.seed)*.18;
    p.armL.rotation.z=.08+idle*.05;p.armR.rotation.z=-.08-idle*.05;
    if(cls==='archer'){p.armR.rotation.x=-.25;p.armL.rotation.x=-.6;p.armL.rotation.z=-.3}
    if(cls==='mage'){p.armR.rotation.x=-.2}
    if(pose==='cheer'){p.armR.rotation.x=-2.8+Math.sin(t*9)*.25;p.armL.rotation.x=-2.8-Math.sin(t*9)*.25;p.root&&0}
  }else if(pose==='walk'){
    const s=Math.sin(t*11),c=Math.cos(t*11);
    p.legL.rotation.x=s*.7;p.legR.rotation.x=-s*.7;p.armL.rotation.x=-s*.6;p.armR.rotation.x=s*.6-.15;
    p.body.position.y=5+Math.abs(c)*.8;p.head.position.y=11+Math.abs(c)*.8;p.body.rotation.z=s*.05;p.head.rotation.z=-s*.05;
  }else if(pose==='attack'||pose==='shoot'||pose==='cast'){
    const k=Math.min(1,pt/(H.pd||.55));
    if(pose==='attack'){ // wind up, then swing down through the target
      const a=k<.3?-(k/.3)*2.6:-2.6+((k-.3)/.7)*3.4;p.armR.rotation.x=a;p.body.rotation.x=k<.3?-k*.4:(-.12+((k-.3)/.7)*.45);p.body.position.y=5-(k>.3?Math.sin((k-.3)/.7*Math.PI)*.8:0);p.legL.rotation.x=.4*k;p.legR.rotation.x=-.5*k;p.armL.rotation.x=-.8}
    else if(pose==='shoot'){p.armR.rotation.x=-1.45;p.armL.rotation.x=-1.5+Math.sin(k*Math.PI)*.2;p.armL.rotation.z=-.05;p.armR.rotation.z=0;p.body.rotation.y=.35;p.head.rotation.y=-.35}
    else{p.armR.rotation.x=-2.2+Math.sin(k*Math.PI)*.4;p.armL.rotation.x=-1.4;p.armL.rotation.z=-.4;p.head.rotation.x=-.2;p.body.position.y=5+Math.sin(k*Math.PI)*1.2;p.head.position.y=11+Math.sin(k*Math.PI)*1.2}
  }else if(pose==='hurt'){
    const k=Math.min(1,pt/.45),sh=Math.sin(k*Math.PI);
    p.body.rotation.x=-sh*.5;p.head.rotation.x=-sh*.6;p.armL.rotation.x=-sh*.9;p.armR.rotation.x=-sh*.9;p.armL.rotation.z=sh*.7;p.armR.rotation.z=-sh*.7;p.body.position.y=5-sh*.8;
  }else if(pose==='dead'){
    // handled on the root (falls over)
  }
  // root-level motions
  const R=H.root;
  if(pose==='dead'){const k=D3.easeOut(Math.min(1,pt/.7));R.rotation.x=-k*Math.PI/2*.98;R.position.y=H.baseY+k*1.2*R.scale.x*4}
  else{R.rotation.x=0;R.position.y=H.baseY}
  if(H.mats.length){const f=H.flash;for(const m of H.mats)m.emissive.setRGB(f,f*.9,f*.8)}
  if(H.flash>0)H.flash=Math.max(0,H.flash-dt*4);
}

/* ---------- item models, standalone (for thumbnails and previews) ---------- */
D3.buildItem=function(it){
  const g=new T.Group(),slot=it.slot==='ring1'||it.slot==='ring2'?'ring':it.slot,cls=it.cls||'warrior';
  let v=null,opt={};
  if(slot==='weapon'){const W=weaponVox(it,cls);v=W.v;const m=v.mesh(opt);m.rotation.z=-Math.PI/5;g.add(m)}
  else if(slot==='helmet'){v=helmetVox(it,cls);const m=v.mesh();g.add(m)}
  else if(slot==='chest'){v=chestVox(it,cls);const m=v.mesh();g.add(m)}
  else if(slot==='pants'){const p=pantsVox(it,cls);v=p.l.add(p.r,0,0,0);const m=v.mesh();g.add(m)}
  else if(slot==='ring'){v=ringVox(it);const m=v.mesh();g.add(m)}
  else{v=amuletVox(it);const m=v.mesh();g.add(m)}
  return g;
};
const itemKey=it=>['I',it.slot==='ring1'||it.slot==='ring2'?'ring':it.slot,it.cls||'',it.rarity,it.el||'',it.pid||'',String(it.name||'').split(/\s+/).pop()].join('|');
D3.itemThumb=function(it){return D3.thumb(itemKey(it),()=>D3.buildItem(it),{yaw:-.5,pitch:.28,pad:1.12})};
// A portrait of a hero (head and shoulders) for lists, or full body.
D3.heroThumb=function(h,full){
  const L=look(h),key='H|'+lookKey(h,L)+'#'+gearKey(h)+(full?'|f':'|b');
  return D3.thumb(key,()=>{const H=D3.buildHero(h,{scale:1,noShadow:true});H.update(0,0);const g=new T.Group();g.add(H.root);return g},{yaw:-.35,pitch:.12,pad:full?1.05:.8,lookY:full?0:6});
};
D3.heroGearKey=gearKey;
})();
