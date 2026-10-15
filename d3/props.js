/* 3D mode: scenery. Voxel trees, rocks, crystals and bones, plus the battle arena built from them for each of the six lands.
   The node map and the town reuse the same props. */
(function(){
'use strict';
const D3=window.DS3D,T=window.THREE,{Vox,rng,shade,mix,hexNum,clamp,lerp}=D3;

/* ---------- prop builders: each returns a Vox with its base at y=0, centered on x=z=0 ---------- */
const P={};
P.pine=(seed,o)=>{o=o||{};const R=rng(seed),v=new Vox(),h=o.h||12+Math.floor(R()*5),leaf=o.leaf||0x2c5a3a,snow=o.snow;
  v.cyl(0,0,0,Math.floor(h*.3),1,1,0x5a3a22);
  const tiers=3+(h>13?1:0);
  for(let i=0;i<tiers;i++){const y0=Math.floor(h*.22+i*h*.2),r=Math.max(1.5,(tiers-i)*1.6+.4);
    v.cone(0,0,y0,y0+Math.round(h*.3),r,.3,(x,y,z)=>{const c=(x*7+y*3+z*5)&3?leaf:shade(leaf,.12);return snow&&y>y0+Math.round(h*.18)?mix(c,0xf0f6ff,.7):c})}
  v.set(0,Math.floor(h*.22+(tiers-1)*h*.2)+Math.round(h*.3)+1,0,snow?0xf0f6ff:shade(leaf,.2));
  return v};
P.oak=(seed,o)=>{o=o||{};const R=rng(seed),v=new Vox(),leaf=o.leaf||0x2f5a2a,h=8+Math.floor(R()*4);
  v.cyl(0,0,0,h-2,2,2,0x4a3220);v.cyl(0,0,0,2,3,3,0x4a3220);
  for(let k=0;k<4;k++){const a=k*1.7+R(),bx=Math.round(Math.cos(a)*5),bz=Math.round(Math.sin(a)*5),by=h-1+Math.floor(R()*3);v.line(0,h-3,0,bx,by,bz,0x4a3220,1);
    v.ell(bx,by+2,bz,3.5+R()*1.5,2.6,3.5+R()*1.5,(x,y,z)=>(x+y*2+z)&3?leaf:shade(leaf,.14))}
  v.ell(0,h+2,0,5,3.2,5,(x,y,z)=>(x*3+y+z*5)&3?leaf:shade(leaf,.14));
  return v};
P.dead=(seed,o)=>{o=o||{};const R=rng(seed),v=new Vox(),h=9+Math.floor(R()*5),c=o.c||0x4a3a30;
  v.cyl(0,0,0,h,1,1,c);v.cyl(0,0,0,2,2,2,c);
  for(let k=0;k<4;k++){const a=k*1.9+R()*.6,y=Math.floor(h*.45+k*1.4),L=3+Math.floor(R()*3);v.line(0,y,0,Math.round(Math.cos(a)*L),y+2+Math.floor(R()*3),Math.round(Math.sin(a)*L),c)}
  return v};
P.rock=(seed,o)=>{o=o||{};const R=rng(seed),v=new Vox(),c=o.c||0x6a6a74,r=o.r||3+R()*2.5;
  v.ell(0,r*.55,0,r,r*.7,r*.9,(x,y,z)=>{const t=D3.hash3(x,y,z);return t>.82?shade(c,.18):t<.2?shade(c,-.15):c});
  for(let i=0;i<3;i++){const a=R()*6.28,d=r*.8;v.ell(Math.cos(a)*d,r*.25,Math.sin(a)*d,r*.4,r*.3,r*.4,shade(c,-.08))}
  for(let x=-8;x<=8;x++)for(let z=-8;z<=8;z++)v.del(x,-1,z);
  return v};
P.crystal=(seed,o)=>{o=o||{};const R=rng(seed),v=new Vox(),c=o.c||0x9a6aff,n=3+Math.floor(R()*3);
  for(let i=0;i<n;i++){const a=i*2.2+R(),d=i?1.5+R()*2:0,h=5+Math.floor(R()*8)*(i?.7:1.3),x=Math.round(Math.cos(a)*d),z=Math.round(Math.sin(a)*d);
    v.cone(x,z,0,Math.floor(h),1.7,.2,(X,Y,Z)=>Y>h*.55?c:shade(c,-.25),0);
    v.set(x,Math.floor(h)+1,z,shade(c,.5),D3.EMIT)}
  v.cyl(0,0,0,0,3,3,0x2a2434);return v};
P.ribs=(seed,o)=>{const R=rng(seed),v=new Vox(),c=o.c||0xe0d6bc;
  v.line(-6,1,0,6,1,0,c,0);
  for(let i=-2;i<=2;i++){const x=i*2.2,L=5-Math.abs(i)*.6;for(let t=0;t<=1;t+=.06){const a=t*Math.PI*.95;const y=Math.sin(a)*L,z=Math.cos(a)*L*.9;v.set(x,1+y,z,c)}}
  return v};
P.skull=(seed,o)=>{const v=new Vox(),c=0xe0d6bc;v.ell(0,2.5,0,2.4,2.2,2.3,c);v.box(-1,0,0,1,0,1,c);v.set(-1,3,2,0x1a1218);v.set(1,3,2,0x1a1218);return v};
P.lava=(seed,o)=>{const R=rng(seed),v=new Vox(),r=3+R()*2;
  v.ell(0,r*.5,0,r,r*.6,r*.9,(x,y,z)=>D3.hash3(x,y,z)>.85?0x3a2a28:0x241816);
  for(let i=0;i<5;i++){const a=R()*6.28;v.line(0,Math.round(r*.9),0,Math.round(Math.cos(a)*r*.95),Math.round(r*.35),Math.round(Math.sin(a)*r*.8),0xff7a2a,0,D3.EMIT)}
  return v};
P.shard=(seed,o)=>{const R=rng(seed),v=new Vox(),c=o.c||0xa8d8ff,n=3;
  for(let i=0;i<n;i++){const a=i*2.1+R(),d=i?1.6:0,h=6+Math.floor(R()*7);v.cone(Math.round(Math.cos(a)*d),Math.round(Math.sin(a)*d),0,h,1.9,.2,(x,y)=>(x+y)&1?c:shade(c,.2))}return v};
P.floater=(seed,o)=>{const R=rng(seed),v=new Vox(),r=o.r||7,c=o.c||0x5a5a70;
  v.cyl(0,0,0,2,r,r*.8,(x,y,z)=>y===2?(D3.hash3(x,y,z)>.5?0x4a6a4a:0x56764e):c);
  v.cone(0,0,-r,-1,.4,r*.85,(x,y,z)=>D3.hash3(x,y,z)>.8?shade(c,-.25):shade(c,-.1));
  return v};
P.mush=(seed,o)=>{const R=rng(seed),v=new Vox(),c=o.c||0x7ad8a0,h=3+Math.floor(R()*4);
  v.cyl(0,0,0,h,1,1,0xd8cfb8);v.ell(0,h+1,0,3.2,1.8,3.2,(x,y,z)=>D3.hash3(x,y,z)>.8?0xf0f0e0:c);v.set(0,h+3,0,c,D3.EMIT);return v};
P.cactus=(seed,o)=>{const R=rng(seed),v=new Vox(),c=0x5a7a4a,h=7+Math.floor(R()*5);
  v.cyl(0,0,0,h,1,1,c);v.line(1,3,0,3,3,0,c);v.line(3,3,0,3,6,0,c);v.line(-1,4,0,-3,4,0,c);v.line(-3,4,0,-3,7,0,c);return v};
P.tent=(seed,o)=>{const v=new Vox(),c=o.c||0x8a4a3a;v.gable(-3,-3,3,3,0,c,{axis:'x',ov:0,c2:shade(c,-.2),steep:1});v.box(-3,0,-3,3,0,3,0x3a2a20);return v};
P.stonepillar=(seed,o)=>{const R=rng(seed),v=new Vox(),c=o.c||0x7a7a88,h=8+Math.floor(R()*8);
  v.cyl(0,0,0,h,2,2,(x,y,z)=>D3.hash3(x,y,z)>.8?shade(c,.15):c);v.box(-3,h+1,-3,3,h+1,3,shade(c,-.1));return v};
D3.props=P;

const cache=new Map();
// A mesh for one prop; geometry is built once per (kind, seed, options) and shared.
D3.prop=(kind,seed,o,sc)=>{
  o=o||{};const key=kind+'|'+seed+'|'+JSON.stringify(o);let g=cache.get(key);
  if(!g){const v=P[kind](seed,o);g=v.geometry({ao:true,jit:.08});cache.set(key,g)}
  const grp=new T.Group();
  if(g.lit)grp.add(new T.Mesh(g.lit,D3.mat.lit));
  if(g.glow)grp.add(new T.Mesh(g.glow,D3.mat.glow));
  grp.scale.setScalar(sc||.2);return grp};

/* ---------- biome look ---------- */
D3.BIOME3D={
  tundra:{ground:[0xc4d0dc,0xb2c0d0],fog:0x3b5068,hemi:[0xcfe0ff,0x5a6a82],sun:0xe8f0ff,sunI:1.5,trees:['pine'],treeO:{snow:true,leaf:0x2c4a44},rocks:[0x7a8694,'rock'],extra:'shard',extraO:{c:0xa8d8ff},fx:'snow',skyTop:'#0c1422',skyBot:'#4a6280'},
  island:{ground:[0x3a2824,0x2c1c18],fog:0x3a1810,hemi:[0xffb08a,0x3a1a14],sun:0xffa060,sunI:1.5,trees:['dead'],treeO:{c:0x241a18},rocks:[0x2a1c18,'lava'],extra:'lava',extraO:{},fx:'ember',skyTop:'#1a0a0c',skyBot:'#7a3020'},
  sky:{ground:[0x4a4a5c,0x56566a],fog:0x2c2c4c,hemi:[0xb8c0ff,0x30304a],sun:0xdde0ff,sunI:1.4,trees:['stonepillar'],treeO:{c:0x7a7a96},rocks:[0x6a6a82,'rock'],extra:'crystal',extraO:{c:0x6ab8ff},fx:'spark',skyTop:'#0a0c1a',skyBot:'#3a3a64'},
  forest:{ground:[0x2e3a22,0x263018],fog:0x16241a,hemi:[0x9ad0a0,0x1a2a18],sun:0xc8e8a8,sunI:1.2,trees:['oak','oak','pine'],treeO:{leaf:0x2a5226},rocks:[0x5a5a50,'rock'],extra:'mush',extraO:{c:0x7ad8a0},fx:'spore',skyTop:'#08100a',skyBot:'#2a3c24'},
  badlands:{ground:[0x7a5a3a,0x6a4a2e],fog:0x4a2e1c,hemi:[0xffd0a0,0x4a2e1c],sun:0xffd8a0,sunI:1.6,trees:['dead','cactus'],treeO:{c:0x6a5040},rocks:[0x8a5a3a,'rock'],extra:'ribs',extraO:{},fx:'dust',skyTop:'#1c120a',skyBot:'#8a5a34'},
  abyss:{ground:[0x1c1228,0x140c1c],fog:0x0a0612,hemi:[0x9a7ad8,0x120a1c],sun:0xb89aff,sunI:1.1,trees:['crystal'],treeO:{c:0x7a4ad8},rocks:[0x2a2038,'rock'],extra:'crystal',extraO:{c:0xd84a8a},fx:'void',skyTop:'#020104',skyBot:'#1e1030'},
};
D3.groundTex=function(biome){
  const B=D3.BIOME3D[biome]||D3.BIOME3D.forest,a=B.ground[0],b=B.ground[1],R=rng(D3.strSeed(biome));
  const t=D3.canvasTex(64,64,(x,w,h)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++){const n=R(),c=n>.93?D3.shade(a,.15):n>.5?a:b;x.fillStyle='#'+c.toString(16).padStart(6,'0');x.fillRect(i,j,1,1)}},{nearest:true});
  t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(30,30);return t};

// Falling or drifting particles for a land's weather.
D3.weather=function(kind,area){
  const N=kind==='void'?110:160,pt=new D3.Particles(N,{grav:0,drag:0,additive:kind!=='dust'&&kind!=='snow',px:230}),R=Math.random;
  const spec={snow:{c:'#ffffff',s:.42,vy:-1.6,vx:.5,life:9,a:.9},ember:{c:'#ff8a3a',s:.34,vy:1.6,vx:.3,life:7,a:.95},spark:{c:'#aee0ff',s:.3,vy:-.4,vx:1.2,life:5,a:.8},
    spore:{c:'#9ae8a8',s:.32,vy:.5,vx:.2,life:9,a:.65},dust:{c:'#d8b080',s:.6,vy:0,vx:3,life:7,a:.3},void:{c:'#b48aff',s:.34,vy:.7,vx:.1,life:10,a:.8}}[kind]||{c:'#ffffff',s:.3,vy:0,vx:0,life:6,a:.5};
  let acc=0;
  return {points:pt.points,update(dt,t){acc+=dt*N/spec.life;while(acc>=1){acc--;
      pt.emit((R()-.5)*area*1.4,(kind==='snow'||kind==='spark')?18+R()*6:R()*10,(R()-.5)*area*1.4,spec.vx*(R()-.3)*(1+R()),spec.vy*(.6+R()*.8),(R()-.5)*.6,spec.life*(.6+R()*.5),spec.c,spec.s*(.6+R()),spec.a)}
    pt.update(dt)}};
};

/* ---------- the battle arena ---------- */
// center at the origin; the playing area is ~±14. Scenery stays clear of the middle.
D3.buildArena=function(biome,extra){
  const B=D3.BIOME3D[biome]||D3.BIOME3D.forest,g=new T.Group(),R=rng(D3.strSeed(biome)+7);
  const gt=D3.groundTex(biome),gm=new T.MeshLambertMaterial({map:gt,color:0xffffff}),pl=new T.Mesh(new T.PlaneGeometry(160,160),gm);pl.rotation.x=-Math.PI/2;g.add(pl);
  // the fighting floor: a slightly raised, lighter oval so the battle reads clearly
  const fl=new T.Mesh(new T.CylinderGeometry(15,16,.5,28),new T.MeshLambertMaterial({color:D3.shade(B.ground[0],.12)}));fl.position.y=.15;fl.scale.z=.8;g.add(fl);
  const rim=new T.Mesh(new T.TorusGeometry(15.3,.12,5,40),new T.MeshBasicMaterial({color:D3.shade(B.ground[0],.35)}));rim.rotation.x=Math.PI/2;rim.position.y=.45;rim.scale.y=.8;g.add(rim);
  // scenery in a ring around the arena
  const place=(kind,o,sc,min,max,n)=>{for(let i=0;i<n;i++){const a=R()*Math.PI*2,d=min+R()*(max-min),x=Math.cos(a)*d,z=Math.sin(a)*d*.85;
      const m=D3.prop(kind,Math.floor(R()*5),o,sc*(.8+R()*.5));m.position.set(x,0,z);m.rotation.y=R()*6.28;g.add(m)}};
  for(const k of B.trees)place(k,B.treeO,.2,20,52,k===B.trees[0]?22:12);
  place(B.rocks[1],{c:B.rocks[0]},.2,17,40,10);
  place(B.extra,B.extraO,.2,19,45,9);
  // a few things on the floor rim
  place(B.rocks[1],{c:B.rocks[0],r:2},.14,15,17,5);
  if(biome==='sky'){for(let i=0;i<7;i++){const m=D3.prop('floater',i,{r:5+R()*5},.2);const a=R()*6.28,d=30+R()*28;m.position.set(Math.cos(a)*d,-2+R()*14,Math.sin(a)*d);g.add(m)}}
  if(biome==='island'){const sea=new T.Mesh(new T.PlaneGeometry(400,400),new T.MeshBasicMaterial({color:0xff6a2a}));sea.rotation.x=-Math.PI/2;sea.position.y=-.4;g.add(sea);pl.position.y=0;
    const ring=new T.Mesh(new T.RingGeometry(34,200,40),new T.MeshBasicMaterial({color:0x7a2410}));ring.rotation.x=-Math.PI/2;ring.position.y=-.2;g.add(ring);pl.scale.set(.5,.5,1)}
  if(biome==='abyss'){pl.material.color.setHex(0x8a78a8)}
  const hemi=new T.HemisphereLight(B.hemi[0],B.hemi[1],1.15),sun=new T.DirectionalLight(B.sun,B.sunI);sun.position.set(-8,14,10);g.add(hemi,sun);
  const wx=D3.weather(B.fx,60);g.add(wx.points);
  return {group:g,fog:B.fog,skyTop:B.skyTop,skyBot:B.skyBot,update(dt,t){wx.update(dt,t)},B};
};
})();
