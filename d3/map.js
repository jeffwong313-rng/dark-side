/* 3D road map: the whole screen is the world. The party stands on the road and the choices lie ahead; pick one and
   the heroes walk forward, left or right, to it. The game's own buttons (one per reachable node) are laid over the
   3D picture so tips, the controller and keyboard keep working. */
(function(){
'use strict';
const D3=window.DS3D,T=window.THREE,{clamp,lerp,rng,shade,mix,Vox,EMIT}=D3;
const G=()=>D3.G;
const ROW=9,SPREAD=26;
const S={built:false,biome:null,sig:'',rows:new Map(),nodeObjs:[],pos:new Map(),walk:null,t:0,party:[],path:null};

/* ---------- node symbols ---------- */
const NV={};
function plinth(col,glow){const v=new Vox();v.cyl(0,0,0,1,5,5,0x3a3340);v.cyl(0,0,2,2,4,4,0x4a4352);
  for(let a=0;a<24;a++){const t=a/24*Math.PI*2;v.set(Math.round(Math.cos(t)*5),2,Math.round(Math.sin(t)*5),glow||col,EMIT)}return v}
NV.battle=()=>{const v=plinth(0xe0736c,0xe0736c);
  v.line(-3,3,0,3,13,0,0xd8dce8,0);v.line(3,3,0,-3,13,0,0xd8dce8,0);v.box(-1,3,-1,1,4,1,0x8a5a2a);
  v.line(-3,3,1,3,13,1,0xa8acb8,0);v.line(3,3,1,-3,13,1,0xa8acb8,0);v.box(-4,6,0,-2,6,1,0xe3b341);v.box(2,6,0,4,6,1,0xe3b341);return v};
NV.elite=()=>{const v=plinth(0xb56fe3,0xb56fe3);v.cyl(0,0,3,10,1,1,0x5a4a3a);
  v.ell(0,13,0,3.3,3,3,0xe8e0cc);v.box(-1,10,-1,1,11,1,0xe8e0cc);v.box(-2,13,2,-1,14,3,0x1a1218);v.box(1,13,2,2,14,3,0x1a1218);
  v.line(-3,15,0,-6,19,0,0xd8c8a8,0);v.line(3,15,0,6,19,0,0xd8c8a8,0);v.set(-1,13,3,0xb56fe3,EMIT);v.set(1,13,3,0xb56fe3,EMIT);return v};
NV.chest=()=>{const v=plinth(0xe3b341,0x806020);v.box(-4,3,-3,4,7,3,0x7a4a24);v.box(-4,8,-3,4,9,3,0x8a5a2a);v.ell(0,8,0,4.2,2.2,3.2,0x8a5a2a);
  v.box(-4,3,-3,-4,9,3,0xe3b341);v.box(4,3,-3,4,9,3,0xe3b341);v.box(-1,6,3,1,8,3,0xffe066,EMIT);return v};
NV.gold=()=>{const v=plinth(0xe3b341,0x806020);
  for(let i=0;i<4;i++){const r=4-i*.9;v.cyl(0,0,3+i,3+i,r,r,i&1?0xe3b341:0xf2c84a)}
  v.ell(0,8,0,2.6,1.4,2.6,0xffe066);v.set(0,10,0,0xffffff,EMIT);return v};
NV.heal=()=>{const v=new Vox();v.cyl(0,0,0,1,6,6,0x3a3340);
  v.gable(-5,-4,1,4,2,0xc9b89a,{axis:'x',ov:0,c2:0xb0a082,steep:1});v.box(-5,2,-4,1,2,4,0x5a4a3a);
  v.cyl(4,0,2,2,2,2,0x5a5a60);for(let i=0;i<3;i++)v.set(4,3+i,0,i?0xff8a2a:0xffd060,EMIT);v.line(3,2,-1,5,2,1,0x6a4a2a,0);v.line(3,2,1,5,2,-1,0x6a4a2a,0);return v};
NV.gamble=()=>{const v=plinth(0x9a8aa0,0x6a5a80);v.cone(0,0,3,12,3.4,1,(x,y)=>y>9?0x2a2034:0x3a2c48);v.ell(0,12,0,2,2,2,0x1a1420);
  v.box(-1,11,2,1,12,3,0xffe066,EMIT);v.box(5,3,-1,7,5,1,0xf0f0e8);v.set(6,5,0,0x202020);v.set(5,4,1,0x202020);return v};
NV.merchant=()=>{const v=plinth(0x6ad8a0,0x3a8060);v.box(-5,3,-3,5,6,3,0x7a5a3a);
  for(let i=-5;i<=5;i++)v.box(i,7,-4,i,8,4,(i&1)?0xd8cfb8:0xc0504a);
  v.box(-5,3,-3,-5,10,-3,0x5a3a22);v.box(5,3,-3,5,10,-3,0x5a3a22);
  v.cyl(-2,0,7,10,1,1,0x6ab8e8);v.ell(-2,11,0,1.6,1.6,1.6,0x9ad8ff);v.cyl(2,0,7,9,1,1,0xe05a6a);v.ell(2,10,0,1.4,1.4,1.4,0xff8a8a);return v};
NV.mystery=()=>{const v=new Vox();v.cyl(0,0,0,0,5,5,0x2a2438);
  const c=0xc8a8ff,Q=['.XXX.','X...X','....X','...X.','..X..','..X..','.....','..X..'];
  Q.forEach((row,y)=>{for(let x=0;x<5;x++)if(row[x]==='X')v.box(x-2,14-y*2,-1,x-2,15-y*2,1,c,EMIT)});return v};
NV.boss=()=>{const v=new Vox();v.cyl(0,0,0,1,9,9,0x2a2430);
  v.box(-6,2,-3,-3,16,3,0x3a3040);v.box(3,2,-3,6,16,3,0x3a3040);v.box(-6,16,-3,6,19,3,0x2a2430);
  v.line(-6,19,0,-9,24,0,0xd8c8a8,0);v.line(6,19,0,9,24,0,0xd8c8a8,0);v.box(-3,6,0,3,14,0,0x120a14);
  v.box(-2,10,1,-1,11,1,0xff3a2a,EMIT);v.box(1,10,1,2,11,1,0xff3a2a,EMIT);return v};
NV.warden=()=>{const v=NV.boss();v.line(0,19,0,0,27,0,0xff5a3a,0,EMIT);v.box(-1,19,-1,1,22,1,0x6a4a8a);return v};
NV.king=()=>{const v=new Vox();v.cyl(0,0,0,1,10,10,0x1a1420);v.box(-5,2,-2,5,6,2,0x2a2030);v.box(-5,2,-2,-3,16,2,0x2a2030);v.box(3,2,-2,5,16,2,0x2a2030);v.box(-3,7,-1,3,16,0,0x3a2848);
  const g=0xe3b341;v.box(-3,19,-1,3,20,1,g);for(const x of [-3,0,3])v.box(x,21,0,x,23,0,g);v.set(0,21,1,0xff3a5a,EMIT);return v};
NV.unseen=()=>{const v=new Vox();v.ell(0,3,0,4,3,4,0x4a4658);v.ell(0,6,0,3,2.5,3,0x5a5668);return v};
const nvCache=new Map();
function nodeObj(type,opts){
  opts=opts||{};const kind=NV[type]?type:'unseen';
  let g=nvCache.get(kind);if(!g){g=NV[kind]().geometry({ao:true,jit:.06});nvCache.set(kind,g)}
  const grp=new T.Group();
  if(g.lit)grp.add(new T.Mesh(g.lit,D3.mat.lit));if(g.glow)grp.add(new T.Mesh(g.glow,D3.mat.glow));
  grp.scale.setScalar(opts.big?.3:.21);return grp}

/* ---------- build ---------- */
function build(){
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(46,1.8,.5,260);
  S.scene=scene;S.camera=camera;S.nodes=new T.Group();S.roads=new T.Group();S.scen=new T.Group();S.heroG=new T.Group();
  scene.add(S.scen,S.roads,S.nodes,S.heroG);
  S.fx=new D3.Particles(300,{grav:0,drag:.2,px:280});scene.add(S.fx.points);
  S.built=true;
}
function setBiome(biome){
  if(S.biome===biome&&S.arena)return;
  S.biome=biome;
  if(S.arena){S.scene.remove(S.arena.group)}
  const B=D3.BIOME3D[biome]||D3.BIOME3D.forest;
  const grp=new T.Group(),gt=D3.groundTex(biome);gt.repeat.set(80,80);
  const gm=new T.Mesh(new T.PlaneGeometry(500,500),new T.MeshLambertMaterial({map:gt}));gm.rotation.x=-Math.PI/2;gm.position.y=-.6;grp.add(gm);
  const hemi=new T.HemisphereLight(B.hemi[0],B.hemi[1],1.55),sun=new T.DirectionalLight(B.sun,B.sunI);sun.position.set(-10,16,6);grp.add(hemi,sun);
  const wx=D3.weather(B.fx,70);grp.add(wx.points);S.wx=wx;S.arena={group:grp,B};S.scene.add(grp);
  S.scene.background=D3.skyTex(B.skyTop,B.skyBot);S.scene.fog=new T.Fog(B.fog,50,135);
  for(const [,g] of S.rows)S.scen.remove(g);S.rows.clear();
  S.moon=null;
}
const nodeX=(P,c)=>((c+.5)/(P.nc||7)-.5)*SPREAD,nodeZ=k=>-k*ROW;
function jit(k,i,a){return (D3.hash3(k*7+3,i*13+1,5)-.5)*a}
function posOf(row,i){const c=row.cols[i];return new T.Vector3(nodeX(row,c)+jit(row.k,i,2),0,nodeZ(row.k)+jit(row.k,i+9,2))}

function sceneryRow(k){
  if(S.rows.has(k))return;
  const B=S.arena.B,R=rng(D3.strSeed(S.biome)+k*911),g=new T.Group(),kinds=B.trees;
  const n=6;
  for(let i=0;i<n;i++){
    const side=R()<.5?-1:1,x=side*(SPREAD/2+4+R()*22),z=nodeZ(k)+(R()-.5)*ROW*1.4;
    const kind=R()<.25?B.rocks[1]:kinds[Math.floor(R()*kinds.length)],o=kind===B.rocks[1]?{c:B.rocks[0]}:B.treeO;
    const m=D3.prop(kind,Math.floor(R()*5),o,.22*(.8+R()*.6));m.position.set(x,-.6,z);m.rotation.y=R()*6.28;g.add(m)}
  for(let i=0;i<3;i++){ // small things closer to the road
    const x=(R()-.5)*(SPREAD+16),z=nodeZ(k)+(R()-.5)*ROW,kind=R()<.5?B.extra:B.rocks[1];
    if(Math.abs(x)<SPREAD/2+1.5)continue;
    const m=D3.prop(kind,Math.floor(R()*5),kind===B.extra?B.extraO:{c:B.rocks[0],r:2},.15);m.position.set(x,-.6,z);m.rotation.y=R()*6.28;g.add(m)}
  S.scen.add(g);S.rows.set(k,g);
}

function rebuild(info){
  // clear
  for(const c of [...S.nodes.children])S.nodes.remove(c);
  for(const c of [...S.roads.children]){S.roads.remove(c);c.traverse(o=>{if(o.geometry)o.geometry.dispose()})}
  S.pos.clear();S.nodeObjs.length=0;
  const rows=info.rows;
  // positions
  for(const row of rows){if(row.none||!row.cols)continue;row.cols.forEach((c,i)=>S.pos.set(row.k+':'+i,posOf(row,i)))}
  // the road: flat blocks along each link
  const v=new Vox(),Q=.5,col={past:0x5a5048,hot:0xe8c070,norm:0x9a8a6a,unseen:0x4a4238};
  const put=(a,b,c)=>{const n=Math.ceil(a.distanceTo(b)/Q);for(let s=0;s<=n;s++){const t=s/n,x=lerp(a.x,b.x,t),z=lerp(a.z,b.z,t);
      const wob=Math.sin(s*.5)*.4;for(let w=-2;w<=2;w++){const px=Math.round((x+wob)/Q)+(Math.abs(b.x-a.x)>Math.abs(b.z-a.z)?0:w),pz=Math.round(z/Q)+(Math.abs(b.x-a.x)>Math.abs(b.z-a.z)?w:0);
        if(Math.abs(w)===2&&(s+w)%2)continue;v.set(px,0,pz,D3.hash3(px,pz,1)>.8?shade(c,-.15):c)}}};
  for(const row of rows){if(row.none||!row.cols)continue;
    const nx=rows.find(r=>r.k===row.k+1);
    row.next.forEach((ns,i)=>ns.forEach(j=>{
      if(!nx||nx.none||!nx.cols)return;const a=S.pos.get(row.k+':'+i),b=S.pos.get(nx.k+':'+j);if(!a||!b)return;
      const hot=row.k===info.stage-1&&i===info.pos,past=row.k<info.stage-1;
      put(a,b,hot?col.hot:past?col.past:(!nx.vis?col.unseen:col.norm));
    }));
    if(!nx||nx.none||!nx.cols){row.cols.forEach((c,i)=>{const a=S.pos.get(row.k+':'+i);if(!a)return;put(a,a.clone().add(new T.Vector3(0,0,-ROW*.5)),col.unseen)})}
  }
  // the start of the road
  const first=rows.find(r=>r.k===info.stage-1);if(!first||first.none){const a=S.start=new T.Vector3(0,0,nodeZ(info.stage-1));const nx=rows.find(r=>r.k===info.stage);
    if(nx&&nx.cols)nx.cols.forEach((c,i)=>{put(a,S.pos.get(nx.k+':'+i),col.hot)})}
  const roadGeo=v.geometry({ao:false,jit:.04,sc:Q}),rg=new T.Group();
  if(roadGeo.lit){const m=new T.Mesh(roadGeo.lit,D3.mat.lit);m.position.y=-.55;rg.add(m)}S.roads.add(rg);
  // nodes
  for(const row of rows){if(row.none||!row.cols)continue;
    row.nodes.forEach(n=>{
      const p=S.pos.get(row.k+':'+n.i);if(!p)return;
      const showType=row.vis&&!n.fog,type=showType?n.t:null,big=type==='boss'||type==='warden'||type==='king';
      const o=nodeObj(type,{big});o.position.copy(p).setY(-.55);o.userData={k:row.k,i:n.i,type,can:n.can,here:n.here};
      if(n.past||row.k<info.stage-1){o.scale.multiplyScalar(.8)}
      // glow under reachable choices
      if(n.can){const h=D3.halo('#ffe9a0',7,.55);h.position.set(p.x,1,p.z);S.nodes.add(h);o.userData.halo=h;
        const ring=new T.Mesh(new T.RingGeometry(2.1,2.4,28),new T.MeshBasicMaterial({color:0xffe066,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(p.x,-.5,p.z);S.nodes.add(ring);o.userData.ring=ring}
      if(n.trap&&showType){const h=D3.halo('#ff3a3a',5,.6);h.position.set(p.x,3,p.z);S.nodes.add(h)}
      if(type==='heal'){const f=D3.halo('#ff9a3a',3,.8);f.position.set(p.x+1.1,1.1,p.z);S.nodes.add(f);o.userData.fire=f}
      if(row.k<info.stage-1||(row.k===info.stage-1&&!n.here)){o.visible=row.k>=info.stage-2}
      S.nodes.add(o);S.nodeObjs.push(o);
    });
  }
}

/* ---------- party on the road ---------- */
function partyModels(){
  const P=G().partyAll(),want=P.map(h=>h.id).join(',')+'|'+P.map(h=>JSON.stringify(h.gear&&Object.values(h.gear).map(x=>x&&(x.id||x.name)))).join('');
  if(S.partySig===want)return;S.partySig=want;
  for(const c of [...S.heroG.children])S.heroG.remove(c);S.party=[];
  P.forEach((h,i)=>{const H=D3.buildHero(h,{scale:.2*.8});S.heroG.add(H.root);S.party.push({H,h,i,at:0})});
}
function standPoint(info){
  const first=info.rows.find(r=>r.k===(info.evt&&info.pos!=null?info.stage:info.stage-1));
  if(first&&!first.none&&first.cols&&info.pos!=null&&S.pos.get(first.k+':'+info.pos))return S.pos.get(first.k+':'+info.pos).clone();
  return S.start?S.start.clone():new T.Vector3(0,0,nodeZ(info.stage-1));
}

/* ---------- walking ---------- */
D3.mapGo=function(i){
  if(S.walk)return;
  const info=S.info;if(!info)return;
  const row=info.rows.find(r=>r.k===info.stage);if(!row||!row.cols)return;
  const from=S.stand.clone(),to=S.pos.get(row.k+':'+i);if(!to){G().ACT.node(i);G().render();return}
  const path=[from,from.clone().lerp(to,.5).add(new T.Vector3((D3.hash3(i,row.k,2)-.5)*1.6,0,0)),to];
  const curve=new T.CatmullRomCurve3(path),len=curve.getLength();
  S.walk={curve,len,t:0,dur:Math.max(.9,len/6.5),i};
  if(G().sfx)G().sfx('click');
};

/* ---------- scene hooks ---------- */
function enter(){if(!S.built)build();S.t=0;document.body.classList.add('d3mapmode')}
function leave(){document.body.classList.remove('d3mapmode')}
const camT=new T.Vector3(),camP=new T.Vector3();
function update(dt,t){
  S.t=t;if(!S.info)return;
  if(S.walk){const w=S.walk;w.t+=dt;const u=clamp(w.t/w.dur,0,1),e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
    S.lead=w.curve.getPoint(e);
    if(u>=1){const i=w.i;S.walk=null;S.stand=S.lead.clone();
      // hand over to the game: this starts the fight or event at that node
      const A=G().ACT;A.node(i);G().render()}}
  else S.lead=S.stand.clone();
  // party follows the lead along a short trail
  const lead=S.lead||S.stand;
  S.trail=S.trail||[];S.trail.unshift(lead.clone());if(S.trail.length>120)S.trail.length=120;
  S.party.forEach((m,i)=>{
    const idx=Math.min(S.trail.length-1,i*9),p=S.trail[idx]||lead,q=S.trail[Math.min(S.trail.length-1,idx+3)]||p;
    const sp=S.walk?1:0;
    m.H.root.position.set(p.x+(S.walk?0:(i-(S.party.length-1)/2)*2.4),p.y,p.z+(S.walk?0:Math.abs(i-(S.party.length-1)/2)*.8));
    const dir=new T.Vector3(p.x-q.x,0,p.z-q.z);
    const yaw=sp&&dir.lengthSq()>1e-5?Math.atan2(dir.x,dir.z):0+Math.PI;
    // face forward (up the road, -z) when standing
    const want=sp?(dir.lengthSq()>1e-5?Math.atan2(dir.x,dir.z):Math.PI):Math.PI;
    let d=want-m.H.root.rotation.y;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;m.H.root.rotation.y+=d*Math.min(1,dt*10);
    D3.setPose(m.H,sp?'walk':'idle');m.H.update(dt,t);
  });
  // scenery rows near the camera
  const rowNow=Math.round(-lead.z/ROW);
  for(let k=rowNow-3;k<=rowNow+9;k++)if(k>=0)sceneryRow(k);
  for(const [k,g] of [...S.rows])if(k<rowNow-5||k>rowNow+12){S.scen.remove(g);S.rows.delete(k)}
  // pulsing choices, camp fire
  for(const o of S.nodeObjs){const u=o.userData;
    if(u.ring){u.ring.material.opacity=.55+Math.sin(t*4+u.i)*.3;const s=1+Math.sin(t*4+u.i)*.06;u.ring.scale.set(s,s,s)}
    if(u.halo)u.halo.material.opacity=.4+Math.sin(t*3+u.i)*.15;
    if(u.fire){u.fire.material.opacity=.6+Math.sin(t*17)*.2;u.fire.position.y=1.1+Math.sin(t*11)*.1}
    if(u.type==='mystery'||u.type==='gold')o.position.y=-.55+Math.sin(t*2+u.i)*.15;
    if(u.type==='mystery')o.rotation.y=t*.8+u.i;
    if(u.type==='king'||u.type==='boss'||u.type==='warden')o.rotation.y=Math.sin(t*.5)*.05;
  }
  S.wx&&S.wx.update(dt,t);S.fx.update(dt);
  // camera: behind and above the leader, looking up the road
  const asp=S.camera.aspect||1.8;
  camT.set(lead.x*.55,.5,lead.z-12);
  camP.set(lead.x*.55+Math.sin(t*.2)*.5,14+(asp<1.6?3:0),lead.z+19+(asp<1.6?4:0));
  S.cp=S.cp||camP.clone();S.ct=S.ct||camT.clone();
  S.cp.x=D3.smooth(S.cp.x,camP.x,3.5,dt);S.cp.y=D3.smooth(S.cp.y,camP.y,3.5,dt);S.cp.z=D3.smooth(S.cp.z,camP.z,3.5,dt);
  S.ct.x=D3.smooth(S.ct.x,camT.x,3.5,dt);S.ct.y=D3.smooth(S.ct.y,camT.y,3.5,dt);S.ct.z=D3.smooth(S.ct.z,camT.z,3.5,dt);
  S.camera.position.copy(S.cp);S.camera.lookAt(S.ct);
}
const pv=new T.Vector3();
function overlay(){
  const slot=D3.slot;if(!slot)return;const root=slot.parentElement;if(!root)return;
  for(const el of root.querySelectorAll('[data-nk]')){
    const key=el.dataset.nk,p=S.pos.get(key);if(!p){el.style.visibility='hidden';continue}
    pv.set(p.x,p.y+(el.dataset.h?+el.dataset.h:3.2),p.z);const s=D3.toScreen(pv);
    if(!s.on||s.y<0||s.y>slot.clientHeight+40){el.style.visibility='hidden';continue}
    el.style.visibility='visible';el.style.transform=`translate(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px) translate(-50%,-100%)`;
    el.style.zIndex=String(Math.round(1000-s.z*500));
  }
}
D3.scenes.map={scene:null,camera:null,enter,leave,update,overlay,resize(){}};
Object.defineProperty(D3.scenes.map,'scene',{get(){if(!S.built)build();return S.scene}});
Object.defineProperty(D3.scenes.map,'camera',{get(){if(!S.built)build();return S.camera}});
(D3.after=D3.after||{}).map=function(slot){
  if(!S.built)build();
  const info=G().mapInfo();if(!info)return;
  setBiome(info.biome);
  const sig=info.id+':'+info.stage+':'+info.pos+':'+(info.evt?'e':'')+':'+(info.reach||[]).join(',')+':'+info.rows.map(r=>r.none?'-':(r.vis?1:0)).join('');
  S.info=info;
  if(sig!==S.sig||S.walk===null&&S.needs){S.sig=sig;rebuild(info);
    if(!S.walk){S.stand=standPoint(info);S.trail=[];}}
  partyModels();
  if(!S.stand)S.stand=standPoint(info);
  if(!S.cp){const lead=S.stand;S.cp=new T.Vector3(lead.x*.55,14,lead.z+19);S.ct=new T.Vector3(lead.x*.55,.5,lead.z-12)}
};
D3.mapState=S;
})();
