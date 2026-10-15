/* 3D town: the same layout as the pixel town (same buildings in the same places, same square, paths, graveyard and
   moon) rebuilt out of voxels and seen from the same corner. The game's buttons (buildings, heroes, the moon) are laid
   over the 3D picture and follow it, so everything in town still works the way it did. */
(function(){
'use strict';
const D3=window.DS3D,T=window.THREE,{Vox,EMIT,FLAT,shade,mix,hexNum,hash3,rng,clamp,lerp}=D3;
const G=()=>D3.G;
const Q=.7,TILE=4,TS=Q*TILE;   // voxel size, voxels per tile, world size of a tile
const S={built:false,sig:'',bld:{},t:0,heroM:new Map(),folk:[],graves:null};

/* ---------- shared bits ---------- */
const noise=(x,y,z)=>hash3(x,y,z);
const brick=(c,k)=>(x,y,z)=>{const n=noise(x,y,z);let f=n>.85?.12:n<.15?-.12:0;if(y%3===0)f-=.08;if((x+z+(y>>1))%4===0)f-=.04;return shade(c,f+(k||0))};
const planks=(c)=>(x,y,z)=>shade(c,(x+z)%3===0?-.1:noise(x,y,z)>.8?.08:0);
function win(v,x,y,z,col,face){ // 1x2 glowing window on a wall voxel; face: 'x' (+x wall at x) or 'z' (+z wall at z)
  v.set(x,y,z,col,EMIT);v.set(x,y+1,z,col,EMIT);if(face==='z'){v.set(x+1,y,z,col,EMIT);v.set(x+1,y+1,z,col,EMIT)}else{v.set(x,y,z+1,col,EMIT);v.set(x,y+1,z+1,col,EMIT)}}
function door(v,x,z0,h,col){for(let y=1;y<=h;y++)for(let z=z0;z<z0+2;z++)v.set(x,y,z,col);for(let z=z0;z<z0+2;z++)v.set(x,h+1,z,shade(col,.1));v.set(x,2,z0+1,0xe3b341)}
function shellBox(v,w,d,h,wall){for(let x=0;x<w;x++)for(let z=0;z<d;z++)for(let y=0;y<=h;y++){if(x===0||z===0||x===w-1||z===d-1||y===0||y===h)v.set(x,y,z,typeof wall==='function'?wall(x,y,z):wall)}}
function solidBox(v,w,d,h,wall){v.box(0,0,0,w-1,h,d-1,wall)}
// growth stages 1-3: an upper row of windows, a pennant, then gold trim and lanterns
function grow(v,B,st,D){
  if(st>=1){const n=B.w>=12?3:2;for(let i=0;i<n;i++){const z=Math.round((i+.5)*B.d/n);win(v,B.w-1,B.h-3,z,D.win,'x')}for(let i=0;i<n;i++){const x=Math.round((i+.5)*B.w/n);win(v,x,B.h-3,B.d-1,D.win,'z')}}
  if(st>=2&&B.flag!==false){const x=B.fx!=null?B.fx:Math.floor(B.w/2),z=B.fz!=null?B.fz:Math.floor(B.d/2),y=B.top;v.line(x,y,z,x,y+6,z,0x4a3a30,0);
    for(let i=1;i<5;i++)for(let j=0;j<3-(i>3?1:0);j++)v.set(x+i,y+6-j,z,mix(D.roof,0xffffff,.3))}
  if(st>=3){for(let x=0;x<B.w;x++){v.set(x,B.h,0,0xe3b341);v.set(x,B.h,B.d-1,0xe3b341)}for(let z=0;z<B.d;z++){v.set(0,B.h,z,0xe3b341);v.set(B.w-1,B.h,z,0xe3b341)}
    for(const z of [Math.floor(B.d*.25),Math.floor(B.d*.75)]){v.set(B.w,B.h-2,z,0x4a3a30);v.set(B.w,B.h-3,z,0xffd060,EMIT)}}
}

/* ---------- the buildings ---------- */
const BUILD={};
// each returns {v, w, d, h (wall height), top (roof peak), door:[x,z], smoke:[x,y,z]|null, lights:[[x,y,z,color,size]]}
BUILD.hall=(D,st)=>{const v=new Vox(),w=12,d=12,h=12,B={w,d,h};
  shellBox(v,w,d,h,brick(0x7a6856));v.box(1,1,1,w-2,h-1,d-2,0x2a2230);
  v.hip(0,0,w-1,d-1,h+1,0x7a2e2e,{ov:1,c2:0x8a3a36,steep:1});B.top=h+7;
  // clock tower on the front corner
  v.box(w-1,0,4,w+3,h+8,8,brick(0x8a7864));v.hip(w-1,4,w+3,8,h+9,0x6a2428,{ov:0,c2:0x7a2e2e,steep:1});
  for(const [x,z] of [[w+4,6]])v.box(x-1,h+3,z-1,x,h+6,z+1,0xfff0b0,EMIT);
  v.box(w+3,h+3,5,w+3,h+6,7,0xffe8a0,EMIT);v.box(w+3,h+4,6,w+3,h+4,6,0x2a2230);
  door(v,w,5,4,0x4a2e1c);
  for(let i=0;i<3;i++){win(v,w-1,5,1+i*4,D.win,'x')}for(let i=0;i<3;i++)win(v,1+i*4,5,d-1,D.win,'z');
  for(let i=0;i<2;i++)win(v,w-1,9,2+i*7,D.win,'x');
  const B2={w,d,h,top:h+8,fx:w+1,fz:6};grow(v,B2,st,D);B.top=h+8;
  return {v,w:w+4,d,h:h+10,door:[w,6],B,lights:[[w+1,5,6,'#ffcf6a',7]]}};
BUILD.heroes=(D,st)=>{const v=new Vox(),w=12,d=8,h=6,B={w,d,h};
  shellBox(v,w,d,h,planks(0x5c4a38));v.box(1,1,1,w-2,h-1,d-2,0x2a2018);
  v.gable(0,0,w-1,d-1,h+1,0x566a3a,{axis:'x',ov:1,c2:0x4a5c32,steep:1});B.top=h+6;
  door(v,w-1,3,4,0x3a2418);for(let i=0;i<3;i++)win(v,w-1,3,[0,5,6][i]?[1,6][i%2]:1,D.win,'x');
  for(let i=0;i<3;i++)win(v,2+i*4,3,d-1,D.win,'z');
  // training dummy and weapon rack out front
  v.line(w+3,1,1,w+3,5,1,0x6a4a2a,0);v.box(w+2,4,1,w+4,4,1,0x6a4a2a);v.ell(w+3,6,1,1,1,1,0xc9b27a);
  v.box(w+2,1,6,w+4,1,7,0x5a4028);for(let i=0;i<3;i++)v.line(w+2+i,2,6,w+2+i,5,6,0xb8bcc8,0);
  const B2={w,d,h,top:h+6};grow(v,B2,st,D);
  return {v,w:w+5,d:d,h:h+8,door:[w-1,3],B,lights:[[w,4,4,'#ffb45a',6]]}};
BUILD.smith=(D,st)=>{const v=new Vox(),w=8,d=8,h=7,B={w,d,h};
  shellBox(v,w,d,h,brick(0x58585f));v.box(1,1,1,w-2,h-1,d-2,0x201a1a);
  v.box(-1,h+1,-1,w,h+1,d,0x35353e);v.box(0,h+2,0,w-1,h+2,d-1,0x3d3d46);
  v.box(1,h+3,1,2,h+8,2,0x4a4a54);B.top=h+8;
  door(v,w-1,3,4,0x2a1c14);
  // glowing forge window and anvil
  v.box(w-1,3,6,w-1,5,6,0xff8a2a,EMIT);v.box(w,1,1,w+2,2,3,0x2a2a30);v.box(w,3,1,w+2,3,3,0x4a4a54);
  v.box(w+1,0,5,w+2,1,6,0x3a2a1a);v.box(w+1,2,5,w+2,2,6,0xff6a2a,EMIT);
  win(v,3,3,d-1,D.win,'z');
  const B2={w,d,h,top:h+3,fx:3,fz:3};grow(v,B2,st,D);
  return {v,w:w+4,d,h:h+10,door:[w-1,3],B,smoke:[1.5,h+9,1.5],lights:[[w,3,5,'#ff8a3a',6]]}};
BUILD.bank=(D,st)=>{const v=new Vox(),w=8,d=12,h=8,B={w,d,h};
  shellBox(v,w,d,h,brick(0x80808a));v.box(1,1,1,w-2,h-1,d-2,0x24242c);
  v.box(-1,h+1,-1,w,h+1,d,0x5c5c68);v.box(0,h+2,1,w-1,h+3,d-2,0x6a6a76);
  // columns on the front
  for(let i=0;i<4;i++){const z=1+i*3;v.cyl(w+1,z+.5,1,h,.9,.9,0xb8b8c4);v.box(w,h+1,z-1,w+2,h+1,z+1,0x9a9aa6)}
  v.box(w,0,0,w+2,0,d-1,0x6a6a76);v.box(w+3,0,0,w+3,0,d-1,0x5a5a66);
  v.box(w-1,1,4,w-1,5,7,0xd8b040);v.box(w-1,2,5,w-1,4,6,0xe3b341,EMIT);
  v.box(w-1,6,4,w-1,6,7,0xffe08a,EMIT);
  for(let i=0;i<3;i++)win(v,2+i*2,4,d-1,D.win,'z');
  const B2={w:w+2,d,h,top:h+3,fx:3,fz:6};grow(v,B2,st,D);
  return {v,w:w+4,d,h:h+6,door:[w-1,5],B,lights:[[w+1,4,6,'#ffe08a',6]]}};
BUILD.witch=(D,st)=>{const v=new Vox(),w=8,d=8,h=9,B={w,d,h};
  shellBox(v,w,d,h,brick(0x3e3248));v.box(1,1,1,w-2,h-1,d-2,0x181220);
  // crooked pointed roof
  for(let y=0;y<15;y++){const r=Math.max(.5,4.8-y*.34),cx=w/2-.5+Math.sin(y*.35)*.8*(y/14),cz=d/2-.5;v.cyl(Math.round(cx),Math.round(cz),h+1+y,h+1+y,r,r,(x,yy,z)=>(x+yy)&1?0x4a2458:0x3a1c48)}
  B.top=h+16;v.box(w/2-1,h+16,d/2-1,w/2,h+17,d/2,0xb07cff,EMIT);
  door(v,w-1,3,4,0x241830);
  v.box(w-1,5,0,w-1,7,0,0xb07cff,EMIT);win(v,w-1,5,6,D.win,'x');win(v,3,5,d-1,D.win,'z');win(v,1,h-2,d-1,0xb07cff,'z');
  // cauldron
  v.cyl(w+2,5,0,2,1.7,1.7,0x2a2a2e);v.cyl(w+2,5,3,3,1.4,1.4,0x7aff9a,EMIT);v.line(w+1,0,4,w+3,0,6,0x3a2a1a,0);
  // crescent sign over the door
  for(let i=0;i<4;i++)v.set(w,h-1+(i===0||i===3?0:1),1+i,0xd8c0ff,EMIT);
  const B2={w,d,h,top:h+17,flag:false};grow(v,B2,st,D);
  return {v,w:w+4,d,h:h+18,door:[w-1,3],B,lights:[[w+2,3,5,'#7aff9a',6],[w,6,0,'#b07cff',4]]}};
BUILD.farm=(D,st)=>{const v=new Vox(),w=8,d=8,h=5,B={w,d,h};
  shellBox(v,w,d,h,planks(0x7a5236));v.box(1,1,1,w-2,h-1,d-2,0x2a1e14);
  v.gable(0,0,w-1,d-1,h+1,0x8a2e2e,{axis:'x',ov:1,c2:0x7a2828,steep:1});B.top=h+5;
  door(v,w-1,2,4,0x3a2418);v.box(w-1,1,2,w-1,5,3,0x4a2e1c);
  // hay bales, fence, a patch of crops
  v.box(w+1,1,5,w+2,2,7,0xd8b848);v.box(w+3,1,6,w+4,2,7,0xc8a838);
  for(let z=0;z<8;z++){v.set(w+6,1,z,0x6a4a2a);v.set(w+6,2,z,0x6a4a2a)}v.line(w+6,2,0,w+6,2,7,0x7a5a36,0);
  for(let r=0;r<3;r++)for(let z=0;z<6;z++)v.set(w+2+r*1,0,z,0x3a2a1a),v.set(w+2+r,1,z,(z+r)&1?0x5ab050:0x6ac060);
  win(v,w-1,3,6,D.win,'x');win(v,2,3,d-1,D.win,'z');
  const B2={w,d,h,top:h+5};grow(v,B2,st,D);
  return {v,w:w+7,d,h:h+8,door:[w-1,2],B,lights:[[w,3,3,'#ffcf6a',5]]}};
BUILD.adventure=(D,st)=>{const v=new Vox(),w=4,d=12,h=14;
  v.box(0,0,0,w-1,h,d-1,brick(0x6a6470));
  for(let z=0;z<d;z+=2)v.box(0,h+1,z,w-1,h+2,z,brick(0x7a7482));
  // the arch: a glowing gateway facing the square
  const cz=d/2;for(let y=0;y<10;y++){const hw=y>7?5-(y-7)*1.6:3.5;for(let z=Math.ceil(cz-hw);z<=Math.floor(cz+hw-1);z++){const t=y/10;v.box(w-1,y,z,w-1,y,z,mix(0x20305a,0x96aad2,t),EMIT)}}
  v.box(w,0,Math.floor(cz-3),w+2,0,Math.floor(cz+2),0x6a6050);
  for(const z of [1,d-2]){v.box(w,6,z,w,7,z,0x4a3a30);v.box(w,8,z,w,9,z,0xffd060,EMIT)}
  v.box(w-2,h+3,2,w-2,h+7,2,0x4a4a54);
  return {v,w:w+3,d,h:h+8,door:[w-1,Math.floor(cz)],B:{w,d,h,top:h+3,flag:false},lights:[[w+1,6,cz,'#9aaee8',10],[w,8,1,'#ff9a3a',5],[w,8,d-2,'#ff9a3a',5]]}};
// under construction: boarded walls, scaffolding, a tarp
function constructionOf(k,D){const v=new Vox(),sz={hall:[12,12,12],heroes:[12,8,6],smith:[8,8,7],bank:[8,12,8],witch:[8,8,9],farm:[8,8,5]}[k]||[8,8,6],[w,d,h]=sz;
  shellBox(v,w,d,h,planks(0x4a3a2e));v.box(0,h+1,0,w-1,h+1,d-1,0x3a342e);
  for(const x of [-1,w/2,w]){for(const z of [-1,d]){v.line(x,0,z,x,h+5,z,0xa08a64,0)}}
  for(let y=3;y<=h+4;y+=4){v.line(-1,y,-1,w,y,-1,0xb0986a,0);v.line(-1,y,d,w,y,d,0xb0986a,0);v.line(w,y,-1,w,y,d,0xb0986a,0);v.line(-1,y,-1,-1,y,d,0xb0986a,0)}
  for(let i=0;i<3;i++)v.box(w+2,i,2,w+4,i,6,0x8a6a3a);
  for(let x=0;x<4;x++)v.box(w+1+x,0,0,w+1+x,0,0,x&1?0xe6be28:0x1e1a14);
  return {v,w:w+5,d,h:h+6,door:[w,d/2],B:{w,d,h,top:h+5,flag:false},lights:[]}}

/* ---------- people ---------- */
const villCache=new Map();
function villagerMesh(coat,skin,hair){
  const key=coat+skin+hair;let g=villCache.get(key);
  if(!g){const v=new Vox(),c=D3.hexNum(coat);
    v.box(-1,3,-1,1,3,0,0x2a2018);v.box(-1,0,-1,-1,2,-1,0x3a2a20);v.box(1,0,-1,1,2,-1,0x3a2a20);
    v.box(-2,3,-1,2,7,0,c);v.box(-3,4,-1,-3,6,-1,c);v.box(3,4,-1,3,6,-1,c);
    v.box(-2,8,-1,2,11,1,D3.hexNum(skin));v.box(-2,11,-1,2,12,1,D3.hexNum(hair));v.set(-1,9,1,0x1a1018);v.set(1,9,1,0x1a1018);
    g=v.geometry({ao:true,jit:.06});villCache.set(key,g)}
  const m=new T.Group();m.add(new T.Mesh(g.lit,D3.mat.lit));m.scale.setScalar(.17);return m;
}

/* ---------- scene ---------- */
const TOWN_C=new T.Vector3();
function w(gx,gy,y){return new T.Vector3(gx*TS,y||0,gy*TS)}
function build(){
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(28,1.6,1,600);
  S.scene=scene;S.camera=camera;
  S.world=new T.Group();scene.add(S.world);
  scene.background=D3.skyTex('#05040c','#2a1e3c','#16102a');
  scene.fog=new T.Fog(0x1a1428,120,330);
  const sky=D3.stars(420,300,11);scene.add(sky);S.stars=sky;
  const hemi=new T.HemisphereLight(0x8a96d8,0x2a2438,1.15),moon=new T.DirectionalLight(0xc8d0ff,1.25);moon.position.set(-60,90,40);scene.add(hemi,moon);
  S.fire=new D3.Particles(240,{grav:-.4,drag:.5,px:260});scene.add(S.fire.points);
  S.glow=new D3.Particles(120,{grav:0,drag:.1,px:230});scene.add(S.glow.points);
  S.built=true;
}
function groundVox(info){
  const v=new Vox();
  const tiles=info.tiles.T;
  for(const t of tiles.values()){
    const base=t.kind==='stone'?(((t.gx+t.gy)&1)?0x4a4254:0x3e384a):t.kind==='path'?0x6a5a48:0x2a4a30;
    for(let i=0;i<TILE;i++)for(let j=0;j<TILE;j++){const X=t.gx*TILE+i,Z=t.gy*TILE+j,n=noise(X,Z,4);
      let c=t.kind==='grass'?(n<.2?shade(base,.18):n>.9?shade(base,-.2):base):(n<.12?shade(base,-.22):n>.93?shade(base,.16):base);
      if(t.kind==='stone'&&(i===0||j===0))c=shade(c,-.18);
      v.set(X,-1,Z,c)}}
  return v}
function buildTown(info){
  const st=G().state;
  for(const c of [...S.world.children]){S.world.remove(c);c.traverse(o=>{if(o.geometry&&o.userData.own)o.geometry.dispose()})}
  S.bld={};S.lights=[];S.smokes=[];S.lanterns=[];
  // ground
  const gv=groundVox(info),gg=gv.geometry({ao:false,jit:0,sc:Q}),gm=new T.Group();if(gg.lit)gm.add(new T.Mesh(gg.lit,D3.mat.lit));gm.position.y=0;S.world.add(gm);
  const far=new T.Mesh(new T.PlaneGeometry(900,900),new T.MeshLambertMaterial({color:0x1e3a26}));far.rotation.x=-Math.PI/2;far.position.set(60,-.75,40);S.world.add(far);
  // buildings
  const busy=[];
  for(const [k,gx,gy] of info.layout){
    const D=info.def[k]||{a:1,b:3,win:'#9aaee8',roof:'#444'},open=k==='adventure'||info.open(k),stg=k==='adventure'?0:info.stage(k);
    const rec=open?BUILD[k](D,stg):constructionOf(k,D);
    const geo=rec.v.geometry({ao:true,jit:.06,sc:Q}),grp=new T.Group();
    if(geo.lit)grp.add(new T.Mesh(geo.lit,D3.mat.lit));if(geo.glow)grp.add(new T.Mesh(geo.glow,D3.mat.glow));
    grp.position.set(gx*TS,0,gy*TS);S.world.add(grp);
    const bw=rec.w*Q,bd=rec.d*Q,bh=rec.h*Q;
    S.bld[k]={grp,gx,gy,w:bw,d:bd,h:bh,door:rec.door,rec};
    for(let x=gx-1;x<=gx+Math.ceil(rec.w/4)+1;x++)for(let y=gy-1;y<=gy+Math.ceil(rec.d/4)+1;y++)busy.push(x+','+y);
    for(const L of rec.lights||[]){const h=D3.halo(L[3],L[4]*Q*3,.5);h.position.set(gx*TS+L[0]*Q,L[1]*Q,gy*TS+L[2]*Q);h.userData.base=.5;h.userData.ph=Math.random()*6;S.world.add(h);S.lights.push(h)}
    if(rec.smoke)S.smokes.push(new T.Vector3(gx*TS+rec.smoke[0]*Q,rec.smoke[1]*Q,gy*TS+rec.smoke[2]*Q));
    if(!open&&D3.hash3(1,1,1)>-1){} // construction sites get no lights
  }
  S.busy=new Set(busy);
  // lamp posts
  for(const [gx,gy] of info.lamps){const g=new Vox();g.line(0,0,0,0,10,0,0x2a2430,0);g.box(-1,10,-1,1,11,1,0xffe8a0,EMIT);g.box(-1,12,-1,1,12,1,0x2a2430);
    const m=g.mesh({jit:0});m.scale.setScalar(Q*.9);m.position.set((gx+.5)*TS,0,(gy+.5)*TS);S.world.add(m);
    const h=D3.halo('#ffd58a',6,.55);h.position.set((gx+.5)*TS,10*Q,(gy+.5)*TS);h.userData.base=.55;h.userData.ph=Math.random()*6;S.world.add(h);S.lights.push(h)}
  // the square: a well in the middle
  {const [sx,sy]=info.square,g=new Vox();g.cyl(0,0,0,3,4,4,0x6a6470);g.cyl(0,0,3,3,3,3,0x1a2a4a);g.box(-4,4,-4,-3,9,-3,0x5a4028);g.box(3,4,3,4,9,4,0x5a4028);g.gable(-4,-4,4,4,10,0x6a3a2a,{axis:'x',ov:0,c2:0x5a3022,steep:1});
    const m=g.mesh({jit:.05});m.scale.setScalar(Q*.9);m.position.set(sx*TS,0,sy*TS);S.world.add(m);S.well=m.position.clone()}
  // trees on the grass, kept off the buildings, paths and the square
  const R=rng(77),trees=new T.Group();
  for(const t of info.tiles.T.values()){if(t.kind!=='grass'||S.busy.has(t.gx+','+t.gy))continue;if(hash3(t.gx*5+3,t.gy*11+1,2)>.17)continue;
    const m=D3.prop('pine',Math.floor(R()*4),{leaf:0x1f4a2e},.2*(.7+R()*.5));m.position.set((t.gx+.5)*TS,0,(t.gy+.5)*TS);m.rotation.y=R()*6;trees.add(m)}
  // a forest ring beyond the village
  for(let i=0;i<150;i++){const a=R()*6.28,d=42+R()*70,m=D3.prop(R()<.8?'pine':'oak',Math.floor(R()*4),{leaf:R()<.5?0x1f4a2e:0x2a4a28},.24*(.8+R()*.7));m.position.set(S.cx+Math.cos(a)*d*1.5,0,S.cz+Math.sin(a)*d);m.rotation.y=R()*6;trees.add(m)}
  S.world.add(trees);
  // graveyard
  {const gr=new T.Group(),list=info.graves;
    list.forEach((pt,i)=>{const g=new Vox();g.box(-2,0,-1,2,1,1,0x4a4852);g.box(-1,2,-1,1,5,0,0x6a6a76);g.ell(0,6,-.5,1.6,1.4,.8,0x6a6a76);if(i%3===0){g.box(0,2,0,0,4,0,0xffffff,0)}
      const m=g.mesh({jit:.05});m.scale.setScalar(Q*.9);m.position.set(pt[0]*TS,0,pt[1]*TS);m.rotation.y=.2;m.userData.grave=i;gr.add(m)});
    if(list.length){const c=info.graveBox;const fence=new Vox();for(let x=0;x<=c.w*TILE;x+=2){for(const z of [0,c.d*TILE]){fence.line(x,0,z,x,3,z,0x4a4048,0)}}fence.line(0,3,0,c.w*TILE,3,0,0x4a4048,0);fence.line(0,3,c.d*TILE,c.w*TILE,3,c.d*TILE,0x4a4048,0);
      const fm=fence.mesh({jit:0});fm.scale.setScalar(Q);fm.position.set(c.x*TS,0,c.y*TS);gr.add(fm)}
    S.world.add(gr);S.graveG=gr}
  // moon
  S.moonM&&S.scene.remove(S.moonM);
  const mt=D3.moonTex(info.moon),mm=new T.Mesh(new T.PlaneGeometry(34,34),new T.MeshBasicMaterial({map:mt,transparent:true,fog:false,depthWrite:false}));
  S.moonM=mm;S.scene.add(mm);const mh=D3.halo('#d9cfb8',90,.35);S.moonM.add(mh);mh.position.z=-1;
  S.moonPct=info.moon;
  // festival lanterns, merchant wagon and so on
  const ev=info.event;
  if(ev){const [sx,sy]=info.square;
    if(ev==='festival'){for(let k=0;k<13;k++){const t=k/12,x=(sx-9+t*18)*TS*.5,z=(sy-6+Math.sin(t*3.14)*2)*TS*.5;const h=D3.halo(['#ffcf6a','#ff8a5a','#b07cff','#7fe0ff'][k%4],5,.9);h.position.set(sx*TS+x-9*TS*.5+9*TS*.5,5+Math.sin(t*3.14)*-1,sy*TS+z-3);h.userData.base=.9;h.userData.ph=k;S.world.add(h);S.lights.push(h)}}
    if(ev==='merchant'){const g=new Vox();g.box(-5,2,-3,5,5,3,0x7a5a3a);g.box(-5,6,-3,5,6,3,0xd8cfb8);g.cyl(-4,3,0,1,1.5,1.5,0x3a2a1a);g.cyl(4,3,0,1,1.5,1.5,0x3a2a1a);const m=g.mesh({jit:.05});m.scale.setScalar(Q);m.position.set((sx+6)*TS,0,(sy+3)*TS);S.world.add(m)}
  }
}

/* ---------- heroes and villagers ---------- */
function syncHeroes(info){
  const st=G().state,hs=st.heroes.slice(0,info.heroSpots.length),seen=new Set();
  hs.forEach((h,i)=>{
    seen.add(h.id);let m=S.heroM.get(h.id);
    const sig=D3.heroGearKey(h)+'|'+JSON.stringify(h.look);
    if(m&&m.sig!==sig){S.world.remove(m.H.root);S.heroM.delete(h.id);m=null}
    if(!m){const H=D3.buildHero(h,{scale:.2*.56});S.world.add(H.root);m={H,sig,h:2.9};S.heroM.set(h.id,m)}
    const [gx,gy]=info.heroSpots[i];m.H.root.position.set((gx+.5)*TS,0,(gy+.5)*TS);m.spot=i;
    m.H.root.rotation.y=Math.PI*.25+.2*Math.sin(i*2.3);m.hero=h;
  });
  for(const [id,m] of [...S.heroM])if(!seen.has(id)){S.world.remove(m.H.root);S.heroM.delete(id)}
}
function folkInit(info){
  for(const f of S.folk)S.world.remove(f.m);S.folk=[];
  const R=rng(st_week()*97+3),open=Object.entries(S.bld).filter(([k])=>k!=='adventure'&&info.open(k)).map(([k,b])=>b);
  const n=Math.min(9,2+open.length+Math.floor(st_week()/3));
  const coats=['#7a5a3a','#5a6a8a','#8a3a3a','#4a6a3a','#6a4a6a','#8a7a4a'],skins=['#e8c09a','#d6a47e','#b9835a','#8a5a3a'],hairs=['#5a3a24','#2a1e18','#c8a050','#d8d0c0'];
  const [sx,sy]=info.square;
  for(let i=0;i<n;i++){
    const pts=[new T.Vector3((sx+(R()-.5)*7)*TS,0,(sy+(R()-.5)*5)*TS)];
    for(let k=0;k<2+Math.floor(R()*2);k++){const b=open[Math.floor(R()*open.length)];if(b){pts.push(new T.Vector3(b.grp.position.x+(b.door[0]+3)*Q,0,b.grp.position.z+(b.door[1]+.5)*Q+(R()-.5)*2));pts.push(new T.Vector3((sx+(R()-.5)*8)*TS,0,(sy+(R()-.5)*6)*TS))}}
    const m=villagerMesh(coats[Math.floor(R()*coats.length)],skins[Math.floor(R()*skins.length)],hairs[Math.floor(R()*hairs.length)]);m.position.copy(pts[0]);S.world.add(m);
    S.folk.push({m,pts,seg:0,t:R()*3,speed:2+R()*.8,wait:0,sh:null})}
}
const st_week=()=>G().state.week||1;
function stepFolk(dt,t){
  for(const f of S.folk){
    if(f.wait>0){f.wait-=dt;f.m.position.y=0;continue}
    const a=f.pts[f.seg],b=f.pts[(f.seg+1)%f.pts.length],d=a.distanceTo(b),adv=f.speed*dt/Math.max(.1,d);
    f.t+=adv;if(f.t>=1){f.t=0;f.seg=(f.seg+1)%f.pts.length;f.wait=1+Math.random()*2.5}
    f.m.position.lerpVectors(a,b,clamp(f.t,0,1));f.m.position.y=Math.abs(Math.sin(t*9+f.seg))*.18;
    f.m.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);
  }
}

/* ---------- loop ---------- */
function enter(){if(!S.built)build();S.t=0}
function leave(){}
function update(dt,t){
  S.t=t;if(!S.ready)return;
  stepFolk(dt,t);
  for(const m of S.heroM.values()){m.H.update(dt,t)}
  for(const h of S.lights){h.material.opacity=(h.userData.base||.5)*(.82+.18*Math.sin(t*3+h.userData.ph))}
  S.fire.update(dt);S.glow.update(dt);
  for(const p of S.smokes){if(Math.random()<dt*14)S.fire.emit(p.x+(Math.random()-.5)*.4,p.y,p.z+(Math.random()-.5)*.4,(Math.random()-.3)*.5,1.6+Math.random(),(Math.random()-.5)*.4,2.4,Math.random()<.2?'#ff8a3a':'#8a8498',.9,.35)}
  if(Math.random()<dt*6)S.glow.emit(S.cx+(Math.random()-.5)*60,.5+Math.random()*4,S.cz+(Math.random()-.5)*50,(Math.random()-.5)*.6,.2+Math.random()*.3,(Math.random()-.5)*.6,5,'#d8ff9a',.28,.7);
  // camera: the same corner as the pixel town, with a very slow drift
  const cam=S.camera,asp=cam.aspect||1.6,fov=cam.fov*Math.PI/180,span=98;
  const dist=span/(2*Math.tan(fov/2)*asp)*Math.max(1,1.6/asp*.9);
  const sway=Math.sin(t*.12)*.06,yaw=Math.PI/4+sway,pitch=.62;
  cam.position.set(S.cx+Math.sin(yaw)*Math.cos(pitch)*dist,Math.sin(pitch)*dist,S.cz+Math.cos(yaw)*Math.cos(pitch)*dist);
  cam.lookAt(S.cx,2,S.cz);
  // the moon hangs behind the town, up and to the right on screen
  if(S.moonM){const f=new T.Vector3().subVectors(new T.Vector3(S.cx,0,S.cz),cam.position).setY(0).normalize(),r=new T.Vector3(-f.z,0,f.x).multiplyScalar(-1);r.set(f.z*-1,0,f.x);
    S.moonM.position.set(S.cx+f.x*210+r.x*70,92,S.cz+f.z*210+r.z*70);S.moonM.quaternion.copy(cam.quaternion)}
  if(S.stars)S.stars.rotation.y=t*.003;
}
const pv=new T.Vector3(),box=new T.Box3();
function overlay(){
  const slot=D3.slot;if(!slot)return;const root=slot.parentElement;if(!root)return;
  const W=slot.clientWidth,H=slot.clientHeight;
  for(const el of root.querySelectorAll('[data-nb]')){ // buildings: a box around the projected corners
    const b=S.bld[el.dataset.nb];if(!b){el.style.display='none';continue}
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    for(const dx of [0,1])for(const dz of [0,1])for(const dy of [0,1]){pv.set(b.grp.position.x+dx*b.w,dy*b.h,b.grp.position.z+dz*b.d);const s=D3.toScreen(pv);x0=Math.min(x0,s.x);x1=Math.max(x1,s.x);y0=Math.min(y0,s.y);y1=Math.max(y1,s.y)}
    el.style.display='';el.style.left=x0.toFixed(1)+'px';el.style.top=y0.toFixed(1)+'px';el.style.width=(x1-x0).toFixed(1)+'px';el.style.height=(y1-y0).toFixed(1)+'px';
  }
  for(const el of root.querySelectorAll('[data-nh]')){ // heroes: a box on the model
    const m=S.heroM.get(el.dataset.nh);if(!m){el.style.display='none';continue}
    const p=m.H.root.position;pv.set(p.x,0,p.z);const a=D3.toScreen(pv);pv.set(p.x,m.h,p.z);const b=D3.toScreen(pv),hh=Math.max(16,a.y-b.y);
    el.style.display='';el.style.left=(a.x-hh*.35).toFixed(1)+'px';el.style.top=b.y.toFixed(1)+'px';el.style.width=(hh*.7).toFixed(1)+'px';el.style.height=hh.toFixed(1)+'px';
    const hint=el.querySelector('.alert');if(hint)hint.style.top='-6px';
  }
  for(const el of root.querySelectorAll('[data-ng]')){ // gravestones
    const g=S.graveG&&S.graveG.children.find(c=>c.userData.grave===+el.dataset.ng);if(!g){el.style.display='none';continue}
    pv.set(g.position.x,2.2,g.position.z);const s=D3.toScreen(pv);el.style.display='';el.style.left=s.x.toFixed(1)+'px';el.style.top=s.y.toFixed(1)+'px';
  }
  const mo=root.querySelector('[data-nmoon]');
  if(mo&&S.moonM){pv.copy(S.moonM.position);const s=D3.toScreen(pv);mo.style.left=s.x.toFixed(1)+'px';mo.style.top=s.y.toFixed(1)+'px'}
}
D3.scenes.town={scene:null,camera:null,enter,leave,update,overlay,resize(){}};
Object.defineProperty(D3.scenes.town,'scene',{get(){if(!S.built)build();return S.scene}});
Object.defineProperty(D3.scenes.town,'camera',{get(){if(!S.built)build();return S.camera}});
(D3.after=D3.after||{}).town=function(slot){
  if(!S.built)build();
  const info=G().townInfo();
  const sig=info.sig;
  S.cx=(info.center[0])*TS;S.cz=(info.center[1])*TS;
  if(sig!==S.sig){S.sig=sig;buildTown(info);S.folkSig=null}
  syncHeroes(info);
  const fs=G().state.week+'|'+Object.keys(S.bld).filter(k=>S.bld[k]).length;
  if(S.folkSig!==fs){S.folkSig=fs;folkInit(info)}
  S.ready=true;
};
D3.townState=S;
})();
