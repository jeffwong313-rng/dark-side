/* Monsters in 3D: each pixel-art frame is inflated into a small voxel toy, so every monster in the game has a 3D body
   that matches its 2D drawing. Four frames (idle, breath, attack, hurt) are swapped by state. */
(function(){
const D3=window.DS3D,T=window.THREE,{clamp,hexNum}=D3;
const geoCache=new Map();

function framesFor(e){
  const spec=D3.G.foeSpec(e);if(!spec)return null;
  let rec=geoCache.get(spec.key);
  if(!rec){
    const grids=spec.fr(),pal=spec.pal,colorOf=k=>{const P=pal[k];if(P==null)return null;const ent=typeof P==='string'?{c:P}:P;
      const c=hexNum(ent.c);return ent.flat?{c,flat:true}:c};
    // measure the first frame so every frame shares one scale and one ground line
    const g0=grids[0];let x0=1e9,x1=-1,y0=1e9,y1=-1;
    for(let y=0;y<g0.h;y++)for(let x=0;x<g0.w;x++)if(g0.m[y*g0.w+x]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}
    const hpx=y1-y0+1,wpx=x1-x0+1,drop=g0.h-1-y1;
    const geos=grids.map(g=>{
      const v=D3.voxFromGrid(g,colorOf,{maxH:g.w>=40?5:4,k:.75,dropY:drop});
      return v.geometry({ao:true,jit:.06,sc:1});
    });
    rec={geos,hpx,wpx,w:g0.w};geoCache.set(spec.key,rec);
  }
  return rec;
}

// opts.height: wanted height in world units; opts.dir: direction the monster lunges (toward the heroes)
D3.buildFoe=function(e,opts){
  opts=opts||{};
  const rec=framesFor(e),root=new T.Group(),body=new T.Group(),frames=[],mats=[];
  root.add(body);
  if(!rec){ // unknown art: a plain orb so the battle never breaks
    const m=new T.Mesh(new T.SphereGeometry(.8,12,10),new T.MeshLambertMaterial({color:0x8a6aa0}));m.position.y=.8;body.add(m);
    return {root,body,frames:[],mats:[],h:1.6,w:1.6,setPose(){},setFlash(){},update(){},pose:'idle'};
  }
  const H=opts.height||3.2,sc=H/rec.hpx;
  for(const G of rec.geos){
    const gr=new T.Group();
    if(G.lit){const m=D3.mat.lit.clone();mats.push(m);gr.add(new T.Mesh(G.lit,m))}
    if(G.glow)gr.add(new T.Mesh(G.glow,D3.mat.glow));
    gr.visible=false;gr.scale.setScalar(sc);body.add(gr);frames.push(gr)}
  frames[0].visible=true;
  const sh=D3.blob(Math.max(1.1,rec.wpx*sc*.5),.55);root.add(sh);
  const F={root,body,frames,mats,shadow:sh,h:H,w:rec.wpx*sc,pose:'idle',pt:0,dur:0,flash:0,cur:0,seed:Math.random()*9,
    dir:opts.dir||new T.Vector3(-1,0,0),death:0,
    setFlash(v){F.flash=v},
    setPose(p,dur){F.pose=p;F.pt=0;F.dur=dur||.5;if(p==='dead')F.death=0},
    update(dt,t){animateFoe(F,dt,t)}};
  return F;
};

function animateFoe(F,dt,t){
  F.pt+=dt;const body=F.body,p=F.pose,k=clamp(F.pt/(F.dur||.5),0,1);
  let fr=Math.floor(t*1.6+F.seed)%2,x=0,y=0,z=0,sx=1,sy=1,rz=0;
  const bob=Math.sin(t*2.4+F.seed);
  y=bob*.05;sy=1+bob*.018;
  if(p==='attack'){fr=2;const q=Math.sin(Math.min(1,k)*Math.PI);x=F.dir.x*q*F.w*.9;z=F.dir.z*q*F.w*.9;y+=q*.25;if(k>=1)F.pose='idle'}
  else if(p==='hurt'){fr=3;const q=1-k;x=-F.dir.x*q*.45;z=-F.dir.z*q*.45;rz=Math.sin(F.pt*50)*.05*q;if(k>=1)F.pose='idle'}
  else if(p==='dead'){fr=3;F.death=k;const e=k*k;y-=e*F.h*.25;sy=1-e*.85;sx=1+e*.25;rz=e*.4;if(F.shadow)F.shadow.material.opacity=.55*(1-k)}
  else if(p==='frozen'){fr=0;y=0;sy=1}
  if(F.cur!==fr){F.frames[F.cur].visible=false;F.frames[fr].visible=true;F.cur=fr}
  body.position.set(x,y,z);body.scale.set(sx,sy,sx);body.rotation.z=rz;
  const f=F.flash;if(F.mats.length)for(const m of F.mats)m.emissive.setRGB(f,f*.92,f*.85);
  if(F.flash>0)F.flash=Math.max(0,F.flash-dt*3.5);
  if(p==='dead'&&F.mats.length){const a=1-clamp((k-.55)/.45,0,1);for(const m of F.mats){m.transparent=a<1;m.opacity=a}}
}
D3.foeCacheClear=()=>geoCache.clear();
})();
