/* Dark Side of the Moon: 3D mode, core.
   One persistent WebGL canvas that moves between screens (town, node map, battle), a voxel toolkit that builds every
   model (heroes, gear, monsters, buildings) out of cubes so the 3D look stays true to the pixel art, and small helpers
   for particles, screen overlays and icon thumbnails. Everything is plain scripts: no build step. */
(function(){
'use strict';
const T=window.THREE;
if(!T)throw new Error('three.js missing');
const D3=window.DS3D=window.DS3D||{};
D3.T=T;D3.scenes={};D3.cur=null;D3.ready=false;D3.failed=false;

/* ---------- small helpers ---------- */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const easeOut=t=>1-Math.pow(1-t,3);
const hash3=(x,y,z)=>{let n=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^Math.imul(z|0,1274126177);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295};
function rng(seed){let s=(seed>>>0)||1;return()=>{s=Math.imul(s^(s>>>15),s|1);s^=s+Math.imul(s^(s>>>7),s|61);return((s^(s>>>14))>>>0)/4294967295}}
function strSeed(s){let n=2166136261;for(const c of String(s))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0}
const hexNum=h=>typeof h==='number'?h:parseInt(String(h).replace('#','').replace(/^(.)(.)(.)$/,'$1$1$2$2$3$3'),16);
const rgbOf=n=>[(n>>16)&255,(n>>8)&255,n&255];
const numOf=c=>(clamp(Math.round(c[0]),0,255)<<16)|(clamp(Math.round(c[1]),0,255)<<8)|clamp(Math.round(c[2]),0,255);
// lighten (f>0) or darken (f<0) a 0xRRGGBB number or '#rrggbb' string; returns a number
function shade(c,f){const a=rgbOf(hexNum(c));return numOf(f>=0?a.map(v=>v+(255-v)*f):a.map(v=>v*(1+f)))}
function mix(c1,c2,t){const a=rgbOf(hexNum(c1)),b=rgbOf(hexNum(c2));return numOf(a.map((v,i)=>v+(b[i]-v)*t))}
Object.assign(D3,{clamp,lerp,ease,easeOut,hash3,rng,strSeed,hexNum,shade,mix,rgbOf,numOf});

/* ---------- voxel model ----------
   Y is up, X right, Z toward the viewer. One voxel is one unit. Colors are 0xRRGGBB; flag bits above 24:
   EMIT (glows, ignores light) and FLAT (no ambient-occlusion shading or color jitter). */
const EMIT=1<<24,FLAT=1<<25;
const KEY=(x,y,z)=>(x+512)|((y+512)<<10)|((z+512)<<20);
const FACES=[
  {n:[1,0,0],c:[[1,0,1],[1,0,0],[1,1,0],[1,1,1]]},
  {n:[-1,0,0],c:[[0,0,0],[0,0,1],[0,1,1],[0,1,0]]},
  {n:[0,1,0],c:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]},
  {n:[0,-1,0],c:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]},
  {n:[0,0,1],c:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]]},
  {n:[0,0,-1],c:[[1,0,0],[0,0,0],[0,1,0],[1,1,0]]},
];
const AO_TAB=[.5,.68,.84,1];
const colCache=new Map();
function lin(hex){let c=colCache.get(hex);if(!c){const k=new T.Color();k.setHex(hex);c=[k.r,k.g,k.b];colCache.set(hex,c)}return c}

class Vox{
  constructor(){this.m=new Map()}
  set(x,y,z,c,f){x=Math.round(x);y=Math.round(y);z=Math.round(z);if(c==null)return this;this.m.set(KEY(x,y,z),(hexNum(c)&0xFFFFFF)|(f||0));return this}
  get(x,y,z){return this.m.get(KEY(x,y,z))}
  has(x,y,z){return this.m.has(KEY(x,y,z))}
  del(x,y,z){this.m.delete(KEY(Math.round(x),Math.round(y),Math.round(z)));return this}
  get size(){return this.m.size}
  // inclusive box
  box(x0,y0,z0,x1,y1,z1,c,f){
    if(x0>x1)[x0,x1]=[x1,x0];if(y0>y1)[y0,y1]=[y1,y0];if(z0>z1)[z0,z1]=[z1,z0];
    for(let x=Math.round(x0);x<=Math.round(x1);x++)for(let y=Math.round(y0);y<=Math.round(y1);y++)for(let z=Math.round(z0);z<=Math.round(z1);z++)this.set(x,y,z,typeof c==='function'?c(x,y,z):c,f);
    return this}
  // hollow box shell (walls only)
  shell(x0,y0,z0,x1,y1,z1,c,f){
    for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++){
      if(x===x0||x===x1||y===y0||y===y1||z===z0||z===z1)this.set(x,y,z,typeof c==='function'?c(x,y,z):c,f)}
    return this}
  ell(cx,cy,cz,rx,ry,rz,c,f){
    for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++)for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)for(let z=Math.floor(cz-rz);z<=Math.ceil(cz+rz);z++){
      const dx=(x-cx)/rx,dy=(y-cy)/ry,dz=(z-cz)/rz;if(dx*dx+dy*dy+dz*dz<=1.0001)this.set(x,y,z,typeof c==='function'?c(x,y,z):c,f)}
    return this}
  // vertical cylinder (elliptical), y0..y1 inclusive
  cyl(cx,cz,y0,y1,rx,rz,c,f){
    for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++)for(let z=Math.floor(cz-(rz||rx));z<=Math.ceil(cz+(rz||rx));z++){
      const dx=(x-cx)/rx,dz=(z-cz)/(rz||rx);if(dx*dx+dz*dz<=1.0001)for(let y=y0;y<=y1;y++)this.set(x,y,z,typeof c==='function'?c(x,y,z):c,f)}
    return this}
  // cone / tapered cylinder: radius r0 at y0 shrinking to r1 at y1
  cone(cx,cz,y0,y1,r0,r1,c,f){
    const n=Math.max(1,y1-y0);
    for(let y=y0;y<=y1;y++){const r=lerp(r0,r1,(y-y0)/n);if(r<.3&&r1<.3&&y===y1){this.set(cx,y,cz,typeof c==='function'?c(cx,y,cz):c,f);continue}
      for(let x=Math.floor(cx-r);x<=Math.ceil(cx+r);x++)for(let z=Math.floor(cz-r);z<=Math.ceil(cz+r);z++){const dx=x-cx,dz=z-cz;if(dx*dx+dz*dz<=r*r+.25)this.set(x,y,z,typeof c==='function'?c(x,y,z):c,f)}}
    return this}
  // straight line of cubes, optional radius (box half-size)
  line(x0,y0,z0,x1,y1,z1,c,r,f){
    r=r||0;const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),Math.abs(z1-z0),1);
    for(let i=0;i<=n;i++){const t=i/n,x=Math.round(lerp(x0,x1,t)),y=Math.round(lerp(y0,y1,t)),z=Math.round(lerp(z0,z1,t));
      if(r<=0)this.set(x,y,z,c,f);else this.box(x-r,y-r,z-r,x+r,y+r,z+r,c,f)}
    return this}
  // gable roof: ridge along X (axis 'x') or Z. Eaves overhang by `ov`.
  gable(x0,z0,x1,z1,y,c,opts){
    opts=opts||{};const ov=opts.ov||1,ax=opts.axis||'x',steep=opts.steep||1,c2=opts.c2||c;
    const w=ax==='x'?z1-z0+1+2*ov:x1-x0+1+2*ov,half=Math.ceil(w/2);
    for(let i=0;i<half;i++){const yy=y+Math.floor(i/steep);
      if(ax==='x'){for(let x=x0-ov;x<=x1+ov;x++){this.set(x,yy,z0-ov+i,(x+i)&1?c:c2);this.set(x,yy,z1+ov-i,(x+i)&1?c:c2)}}
      else{for(let z=z0-ov;z<=z1+ov;z++){this.set(x0-ov+i,yy,z,(z+i)&1?c:c2);this.set(x1+ov-i,yy,z,(z+i)&1?c:c2)}}}
    return this}
  // pyramid (hip) roof over a rectangle
  hip(x0,z0,x1,z1,y,c,opts){
    opts=opts||{};const ov=opts.ov||1,c2=opts.c2||c,steep=opts.steep||1;
    let a=x0-ov,b=x1+ov,d=z0-ov,e=z1+ov,yy=y,i=0;
    while(a<=b&&d<=e){for(let x=a;x<=b;x++)for(let z=d;z<=e;z++){if(x===a||x===b||z===d||z===e||(a>=b-1)||(d>=e-1))this.set(x,yy,z,(x+z+i)&1?c:c2)}
      a++;b--;d++;e--;i++;if(i%steep===0)yy++;if(i>40)break}
    return this}
  copy(){const v=new Vox();v.m=new Map(this.m);return v}
  // merge another model in, offset by (ox,oy,oz); `over` false keeps existing voxels
  add(o,ox,oy,oz,over){ox=ox||0;oy=oy||0;oz=oz||0;for(const [k,v] of o.m){const x=(k&1023)-512+ox,y=((k>>10)&1023)-512+oy,z=((k>>20)&1023)-512+oz;if(over===false&&this.has(x,y,z))continue;this.m.set(KEY(x,y,z),v)}return this}
  mirrorX(cx){const o=new Vox();for(const [k,v] of this.m){const x=(k&1023)-512,y=((k>>10)&1023)-512,z=((k>>20)&1023)-512;o.m.set(KEY(Math.round(2*cx-x),y,z),v)}return o}
  rotY90(){const o=new Vox();for(const [k,v] of this.m){const x=(k&1023)-512,y=((k>>10)&1023)-512,z=((k>>20)&1023)-512;o.m.set(KEY(z,y,-x),v)}return o}
  bounds(){let a=[1e9,1e9,1e9],b=[-1e9,-1e9,-1e9];for(const k of this.m.keys()){const x=(k&1023)-512,y=((k>>10)&1023)-512,z=((k>>20)&1023)-512;a[0]=Math.min(a[0],x);a[1]=Math.min(a[1],y);a[2]=Math.min(a[2],z);b[0]=Math.max(b[0],x);b[1]=Math.max(b[1],y);b[2]=Math.max(b[2],z)}return {min:a,max:b}}
  // Build geometry. opts: ao (default true), jit (brightness jitter), sc (scale), ox/oy/oz (pivot in voxels), top (flat color for a rim).
  geometry(opts){
    opts=opts||{};const ao=opts.ao!==false,jit=opts.jit==null?.07:opts.jit,sc=opts.sc||1,ox=opts.ox||0,oy=opts.oy||0,oz=opts.oz||0;
    const L={p:[],n:[],c:[],i:[]},G={p:[],n:[],c:[],i:[]},m=this.m;
    const has=(x,y,z)=>m.has(KEY(x,y,z));
    for(const [k,v] of m){
      const x=(k&1023)-512,y=((k>>10)&1023)-512,z=((k>>20)&1023)-512,emit=!!(v&EMIT),flat=!!(v&FLAT),B=emit?G:L;
      const base=lin(v&0xFFFFFF),j=emit||flat?1:1+(hash3(x,y,z)-.5)*jit;
      for(let f=0;f<6;f++){
        const F=FACES[f],nx=F.n[0],ny=F.n[1],nz=F.n[2];
        if(m.has(KEY(x+nx,y+ny,z+nz)))continue;
        const idx0=B.p.length/3,aoV=[1,1,1,1],aoI=[3,3,3,3];
        if(ao&&!emit&&!flat){
          // the two axes across the face
          const ax=nx?1:0,ay=ny?1:0;
          for(let q=0;q<4;q++){const cc=F.c[q];
            let t1,t2;
            if(nx){t1=[0,cc[1]?1:-1,0];t2=[0,0,cc[2]?1:-1]}else if(ny){t1=[cc[0]?1:-1,0,0];t2=[0,0,cc[2]?1:-1]}else{t1=[cc[0]?1:-1,0,0];t2=[0,cc[1]?1:-1,0]}
            const s1=has(x+nx+t1[0],y+ny+t1[1],z+nz+t1[2])?1:0,s2=has(x+nx+t2[0],y+ny+t2[1],z+nz+t2[2])?1:0,cn=has(x+nx+t1[0]+t2[0],y+ny+t1[1]+t2[1],z+nz+t1[2]+t2[2])?1:0;
            const a=(s1&&s2)?0:3-(s1+s2+cn);aoI[q]=a;aoV[q]=AO_TAB[a]}
        }
        for(let q=0;q<4;q++){const cc=F.c[q];
          B.p.push((x+cc[0]-ox)*sc,(y+cc[1]-oy)*sc,(z+cc[2]-oz)*sc);B.n.push(nx,ny,nz);
          const s=j*aoV[q];B.c.push(base[0]*s,base[1]*s,base[2]*s)}
        if(aoI[0]+aoI[2]>=aoI[1]+aoI[3])B.i.push(idx0,idx0+1,idx0+2,idx0,idx0+2,idx0+3);else B.i.push(idx0+1,idx0+2,idx0+3,idx0+1,idx0+3,idx0);
      }
    }
    const mk=B=>{if(!B.i.length)return null;const g=new T.BufferGeometry();
      g.setAttribute('position',new T.Float32BufferAttribute(B.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(B.n,3));g.setAttribute('color',new T.Float32BufferAttribute(B.c,3));
      g.setIndex(B.p.length/3>65535?new T.Uint32BufferAttribute(B.i,1):new T.Uint16BufferAttribute(B.i,1));g.computeBoundingSphere();return g};
    return {lit:mk(L),glow:mk(G)};
  }
  // Build a THREE.Group holding the lit mesh and the glowing mesh.
  mesh(opts){
    const {lit,glow}=this.geometry(opts),g=new T.Group();
    if(lit){const me=new T.Mesh(lit,D3.mat.lit);me.name='lit';g.add(me)}
    if(glow){const me=new T.Mesh(glow,D3.mat.glow);me.name='glow';g.add(me)}
    return g}
}
Vox.EMIT=EMIT;Vox.FLAT=FLAT;
D3.Vox=Vox;D3.EMIT=EMIT;D3.FLAT=FLAT;

/* ---------- shared materials ---------- */
D3.mat={
  lit:new T.MeshLambertMaterial({vertexColors:true}),
  glow:new T.MeshBasicMaterial({vertexColors:true}),
  shadow:new T.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.38,depthWrite:false}),
};
// a soft round blob used under characters and props
const blobTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,2,32,32,31);g.addColorStop(0,'rgba(0,0,0,.85)');g.addColorStop(.6,'rgba(0,0,0,.35)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,64,64);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t})();
const blobMat=new T.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false});
const blobGeo=new T.PlaneGeometry(1,1);blobGeo.rotateX(-Math.PI/2);
D3.blob=(r,op)=>{const m=new T.Mesh(blobGeo,op==null?blobMat:new T.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false,opacity:op}));m.scale.set(r*2,1,r*2);m.position.y=.06;m.renderOrder=1;return m};

// radial glow texture for halos around lights and magic
const glowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new T.CanvasTexture(c)})();
D3.halo=(color,size,op)=>{const s=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:hexNum(color),transparent:true,opacity:op==null?.55:op,blending:T.AdditiveBlending,depthWrite:false,fog:false}));s.scale.set(size,size,1);return s};

/* ---------- pixel art to voxels ---------- */
// rows: array of strings; colorOf(ch) -> 0xRRGGBB number, null (empty), or {c,emit}. Faces +Z, centered on X, base at y=0.
D3.voxFromRows=function(rows,colorOf,opt){
  opt=opt||{};const th=opt.depth||2,v=new Vox(),h=rows.length,w=rows[0].length;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const ch=rows[y][x],c=colorOf(ch);if(c==null||ch==='.')continue;const col=typeof c==='object'?c.c:c,em=typeof c==='object'&&c.emit;
    for(let z=0;z<th;z++)v.set(x-Math.floor(w/2),h-1-y,z-Math.floor(th/2),col,em?EMIT:0)}
  return v};
// Inflated extrusion of a material grid: thicker toward the middle of the shape, like a small toy.
// grid: {w,h,m:[material keys],get(x,y)}; colorOf(m) -> {c, flat}|hex string; opt.maxH is the max half thickness.
D3.voxFromGrid=function(g,colorOf,opt){
  opt=opt||{};const W=g.w,H=g.h,maxH=opt.maxH||4,k=opt.k==null?.8:opt.k,v=new Vox();
  const filled=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&!!g.m[y*W+x];
  const dist=new Float32Array(W*H).fill(99);
  // distance to the nearest empty pixel (two-pass chamfer)
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(!filled(x,y)){dist[y*W+x]=0;continue}
    let d=99;const nb=(dx,dy,c)=>{const xx=x+dx,yy=y+dy;d=Math.min(d,(xx<0||yy<0||xx>=W||yy>=H?0:dist[yy*W+xx])+c)};nb(-1,0,1);nb(0,-1,1);nb(-1,-1,1.4);nb(1,-1,1.4);dist[y*W+x]=Math.min(d,99)}
  for(let y=H-1;y>=0;y--)for(let x=W-1;x>=0;x--){if(!filled(x,y))continue;
    let d=dist[y*W+x];const nb=(dx,dy,c)=>{const xx=x+dx,yy=y+dy;d=Math.min(d,(xx<0||yy<0||xx>=W||yy>=H?0:dist[yy*W+xx])+c)};nb(1,0,1);nb(0,1,1);nb(1,1,1.4);nb(-1,1,1.4);dist[y*W+x]=d}
  // the sprite's own bottom edge sits on the ground, so don't round it off there
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const key=g.m[y*W+x];if(!key)continue;
    const ent=colorOf(key);if(ent==null)continue;const c=typeof ent==='object'?ent.c:ent,flat=typeof ent==='object'&&(ent.flat||ent.emit);
    let d=dist[y*W+x];if(!filled(x,y+1))d=Math.max(d,Math.min(maxH,2));
    const hh=clamp(Math.round(d*k),1,maxH),by=H-1-y-(opt.dropY||0);
    if(flat){for(let z=hh-1;z<=hh;z++)v.set(x-Math.floor(W/2),by,z,c,EMIT)}
    else for(let z=-hh;z<=hh;z++)v.set(x-Math.floor(W/2),by,z,c)}
  return v};

/* ---------- renderer, canvas and scene loop ---------- */
let renderer=null,last=0,errs=0;
const canvas=document.createElement('canvas');canvas.className='d3canvas';canvas.setAttribute('aria-hidden','true');
D3.canvas=canvas;
D3.supported=function(){try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'))}catch(e){return false}};
D3.init=function(){
  if(renderer)return true;
  try{
    renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.setClearColor(0x0a0810,1);
    D3.renderer=renderer;D3.ready=true;requestAnimationFrame(frame);return true;
  }catch(e){console.error('3D init failed',e);D3.failed=true;D3.ready=false;return false}
};
D3.quality=()=>{const q=(D3.G&&D3.G.set&&D3.G.set.gfxq)||'high';return q};
D3.pixelRatio=()=>Math.min(window.devicePixelRatio||1,D3.quality()==='low'?1:D3.quality()==='med'?1.5:2);
function frame(t){
  requestAnimationFrame(frame);
  const s=D3.cur;if(!renderer||!s||!canvas.isConnected||document.hidden)return;
  const dt=Math.min(.05,(t-last)/1000||0);last=t;
  if(D3.quality()==='low'&&((frame.n=(frame.n||0)+1)&1))return; // 30 fps on low
  try{
    if(!canvas.clientWidth||!canvas.clientHeight)return;
    if(canvas.width!==Math.round(canvas.clientWidth*D3.pixelRatio())||canvas.height!==Math.round(canvas.clientHeight*D3.pixelRatio()))D3.resize();
    s.update&&s.update(dt,t/1000);
    renderer.render(s.scene,s.camera);
    s.overlay&&s.overlay(dt,t/1000);
    errs=0;
  }catch(e){console.error('3D frame error',e);if(++errs>4){D3.failed=true;D3.cur=null;if(D3.G&&D3.G.fail3d)D3.G.fail3d(e)}}
}
D3.resize=function(){
  if(!renderer)return;const w=Math.max(2,canvas.clientWidth),h=Math.max(2,canvas.clientHeight),pr=D3.pixelRatio();
  renderer.setPixelRatio(pr);renderer.setSize(w,h,false);
  const s=D3.cur;if(s&&s.camera){s.camera.aspect=w/h;s.camera.updateProjectionMatrix();s.resize&&s.resize(w,h)}
};
let ro=null;
// Put the canvas into a slot element and make `name` the active scene.
D3.mount=function(slot,name){
  if(!D3.init())return false;
  const s=D3.scenes[name];if(!s)return false;
  if(canvas.parentNode!==slot)slot.insertBefore(canvas,slot.firstChild);
  if(D3.cur!==s){D3.cur&&D3.cur.leave&&D3.cur.leave();D3.cur=s;s.enter&&s.enter()}
  D3.slot=slot;
  if(ro)ro.disconnect();
  try{ro=new ResizeObserver(()=>D3.resize());ro.observe(slot)}catch(e){}
  D3.resize();return true;
};
D3.unmount=function(){if(D3.cur&&D3.cur.leave)D3.cur.leave();D3.cur=null;if(ro){ro.disconnect();ro=null}if(canvas.parentNode)canvas.parentNode.removeChild(canvas);D3.slot=null};

// World point -> pixel position inside the canvas (CSS px). Returns {x,y,z,on} where z<1 means in front of the camera.
const _v=new T.Vector3();
D3.toScreen=function(v,cam){cam=cam||(D3.cur&&D3.cur.camera);_v.copy(v).project(cam);const w=canvas.clientWidth,h=canvas.clientHeight;return {x:(_v.x+1)/2*w,y:(1-_v.y)/2*h,z:_v.z,on:_v.z<1&&_v.z>-1}};

/* ---------- particles ----------
   A pool of soft glowing points with per-particle size, color, fade and gravity. */
D3.Particles=function(max,opts){
  opts=opts||{};this.max=max;this.n=0;
  const pos=new Float32Array(max*3),col=new Float32Array(max*4),size=new Float32Array(max);
  this.pos=pos;this.col=col;this.size=size;this.vel=new Float32Array(max*3);this.life=new Float32Array(max);this.ttl=new Float32Array(max);this.s0=new Float32Array(max);this.c0=new Float32Array(max*3);this.grav=opts.grav==null?0:opts.grav;this.drag=opts.drag==null?0:opts.drag;this.grow=opts.grow||0;
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('color',new T.BufferAttribute(col,4));g.setAttribute('size',new T.BufferAttribute(size,1));
  this.geo=g;
  const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:opts.additive===false?T.NormalBlending:T.AdditiveBlending,fog:false,
    uniforms:{px:{value:opts.px||260}},
    vertexShader:'attribute vec4 color;attribute float size;varying vec4 vC;uniform float px;void main(){vC=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=size*px/max(.1,-mv.z);}',
    fragmentShader:'varying vec4 vC;void main(){vec2 d=gl_PointCoord-.5;float r=length(d)*2.;if(r>1.)discard;float a=(1.-r*r);gl_FragColor=vec4(vC.rgb,vC.a*a);}'});
  this.mat=mat;this.points=new T.Points(g,mat);this.points.frustumCulled=false;this.points.renderOrder=5;
  g.setDrawRange(0,0);
};
D3.Particles.prototype={
  emit(x,y,z,vx,vy,vz,life,color,size,alpha){
    let i=this.n<this.max?this.n++:Math.floor(Math.random()*this.max);
    const c=lin(hexNum(color));
    this.pos[i*3]=x;this.pos[i*3+1]=y;this.pos[i*3+2]=z;this.vel[i*3]=vx;this.vel[i*3+1]=vy;this.vel[i*3+2]=vz;this.life[i]=life;this.ttl[i]=life;this.s0[i]=size;this.c0[i*3]=c[0];this.c0[i*3+1]=c[1];this.c0[i*3+2]=c[2];this.col[i*4+3]=alpha==null?1:alpha;this.col[i*4]=c[0];this.col[i*4+1]=c[1];this.col[i*4+2]=c[2];this.size[i]=size;
    this.al=this.al||new Float32Array(this.max);this.al[i]=alpha==null?1:alpha;
  },
  update(dt){
    const n=this.n;this.al=this.al||new Float32Array(this.max);
    for(let i=0;i<n;i++){
      if(this.life[i]<=0){this.size[i]=0;continue}
      this.life[i]-=dt;const t=clamp(this.life[i]/this.ttl[i],0,1);
      this.vel[i*3+1]-=this.grav*dt;if(this.drag){const d=Math.max(0,1-this.drag*dt);this.vel[i*3]*=d;this.vel[i*3+1]*=d;this.vel[i*3+2]*=d}
      this.pos[i*3]+=this.vel[i*3]*dt;this.pos[i*3+1]+=this.vel[i*3+1]*dt;this.pos[i*3+2]+=this.vel[i*3+2]*dt;
      this.size[i]=this.s0[i]*(this.grow?lerp(1,this.grow,1-t):t>.7?1:.4+t*.85);this.col[i*4+3]=this.al[i]*Math.min(1,t*2.2);
      if(this.life[i]<=0)this.size[i]=0}
    this.geo.attributes.position.needsUpdate=this.geo.attributes.color.needsUpdate=this.geo.attributes.size.needsUpdate=true;this.geo.setDrawRange(0,n)},
  clear(){this.n=0;this.geo.setDrawRange(0,0)}
};

/* ---------- thumbnails: small still renders of a model, cached as picture URLs ---------- */
let tr=null,tScene=null,tCam=null;
const thumbCache=new Map();
function thumbInit(){
  if(tr)return true;
  try{
    const c=document.createElement('canvas');c.width=c.height=160;
    tr=new T.WebGLRenderer({canvas:c,antialias:true,alpha:true,preserveDrawingBuffer:true});tr.outputColorSpace=T.SRGBColorSpace;tr.setClearColor(0x000000,0);tr.setSize(160,160,false);
    tScene=new T.Scene();tScene.add(new T.HemisphereLight(0xdfe6ff,0x40384a,1.25));const dl=new T.DirectionalLight(0xfff0dc,1.9);dl.position.set(-4,7,6);tScene.add(dl);
    tCam=new T.PerspectiveCamera(30,1,.1,500);return true}
  catch(e){console.error('thumb init failed',e);tr=null;return false}
}
// build(): returns a THREE.Object3D centered however you like; it is framed automatically.
D3.thumb=function(key,build,opts){
  if(thumbCache.has(key))return thumbCache.get(key);
  if(!thumbInit())return null;
  opts=opts||{};let url=null;
  try{
    const obj=build();tScene.add(obj);
    const box=new T.Box3().setFromObject(obj),size=new T.Vector3(),ctr=new T.Vector3();box.getSize(size);box.getCenter(ctr);
    const r=Math.max(size.x,size.y,size.z)*.5*(opts.pad||1.15),dist=r/Math.tan(T.MathUtils.degToRad(15));
    const yaw=opts.yaw==null?-.6:opts.yaw,pit=opts.pitch==null?.35:opts.pitch;
    tCam.position.set(ctr.x+Math.sin(yaw)*Math.cos(pit)*dist,ctr.y+Math.sin(pit)*dist+(opts.lookY||0),ctr.z+Math.cos(yaw)*Math.cos(pit)*dist);tCam.lookAt(ctr.x,ctr.y+(opts.lookY||0),ctr.z);
    tr.render(tScene,tCam);url=tr.domElement.toDataURL('image/png');
    tScene.remove(obj);obj.traverse(o=>{if(o.geometry)o.geometry.dispose()});
  }catch(e){console.error('thumb failed',e)}
  if(url)thumbCache.set(key,url);return url;
};
D3.thumbCacheSize=()=>thumbCache.size;

/* ---------- misc ---------- */
// Orbiting camera helper with smooth easing, used by the scenes.
D3.smooth=(cur,target,k,dt)=>cur+(target-cur)*(1-Math.exp(-k*dt));
// Make a canvas texture quickly.
D3.canvasTex=(w,h,draw,opts)=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;if(opts&&opts.nearest){t.magFilter=t.minFilter=T.NearestFilter}return t};
// Star field shared by the sky domes.
D3.stars=(n,r,seed)=>{const R=rng(seed||7),p=new Float32Array(n*3),c=new Float32Array(n*4),s=new Float32Array(n);
  for(let i=0;i<n;i++){const th=R()*Math.PI*2,ph=Math.acos(1-R()*1.1),rr=r;p[i*3]=rr*Math.sin(ph)*Math.cos(th);p[i*3+1]=rr*Math.cos(ph)*.9+r*.05;p[i*3+2]=rr*Math.sin(ph)*Math.sin(th);const b=.5+R()*.5;c[i*4]=b;c[i*4+1]=b;c[i*4+2]=.8+R()*.2;c[i*4+3]=.4+R()*.6;s[i]=.9+R()*1.6}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('color',new T.BufferAttribute(c,4));g.setAttribute('size',new T.BufferAttribute(s,1));
  const m=new T.ShaderMaterial({transparent:true,depthWrite:false,fog:false,uniforms:{px:{value:220}},vertexShader:'attribute vec4 color;attribute float size;varying vec4 vC;uniform float px;void main(){vC=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=size*px*.012;}',fragmentShader:'varying vec4 vC;void main(){vec2 d=gl_PointCoord-.5;if(length(d)>.5)discard;gl_FragColor=vC;}'});
  const pts=new T.Points(g,m);pts.frustumCulled=false;return pts};
// Gradient sky texture (vertical) for scene backgrounds.
D3.skyTex=(top,bottom,mid)=>D3.canvasTex(4,128,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,top);if(mid)g.addColorStop(.55,mid);g.addColorStop(1,bottom);x.fillStyle=g;x.fillRect(0,0,w,h)});
// Pixel-art moon texture: lit face shrinks from the right as p (0-100) of the moon turns dark, veined with red.
D3.moonTex=p=>{const N=64,f=clamp(p,0,100)/100;return D3.canvasTex(N,N,(x)=>{const r=N/2-2,cx=N/2,cy=N/2;
  const im=x.createImageData(N,N);for(let py=0;py<N;py++)for(let px=0;px<N;px++){const dx=px+.5-cx,dy=py+.5-cy;if(dx*dx+dy*dy>r*r)continue;
    const w=Math.sqrt(r*r-dy*dy),litp=dx<w*(1-2*f),n=hash3(px>>1,py>>1,3),cr=((px-20)**2+(py-24)**2<30)||((px-42)**2+(py-44)**2<40)||((px-44)**2+(py-18)**2<16);
    const vein=((px*3+py*5)%23===0)||((px+py*2)%29===0&&(px+py)%3===0);
    const c=litp?(cr?[184,173,150]:n>.9?[240,232,210]:[230,220,196]):(vein?[138,31,46]:cr?[28,20,36]:[42,31,51]);
    const i=(py*N+px)*4;im.data[i]=c[0];im.data[i+1]=c[1];im.data[i+2]=c[2];im.data[i+3]=255}
  x.putImageData(im,0,0)},{nearest:true})};

D3.version='1';
})();
