'use strict';
const data = window.PAZARDZHIK;
const $ = id => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb7c8d4);
scene.fog = new THREE.FogExp2(0xb6c5cb, .0029);
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, .12, 1200);
let renderer;
try { renderer = new THREE.WebGLRenderer({antialias:true}); }
catch (error) {
  $('start').innerHTML = '<h1>Необходим е WebGL</h1><p>Отвори играта в браузър с включено хардуерно ускорение.</p>';
  throw error;
}
if(renderer.shadowMap){
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=true;
}
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
$('scene').append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe3e9f0, 0x8e8669, 1.58));
const sun = new THREE.DirectionalLight(0xffedcf, 1.97);
sun.target.position.set(-304,0,-44);
sun.position.set(-464,210,-129);
sun.castShadow=true;
sun.shadow.mapSize.set(4096,4096);
Object.assign(sun.shadow.camera,{left:-395,right:395,top:235,bottom:-235,near:20,far:620});
sun.shadow.normalBias=.11;
sun.shadow.bias=-.00015;
sun.shadow.camera.updateProjectionMatrix();
scene.add(sun,sun.target);
let seed=81394;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const material = (color, settings={}) => new THREE.MeshStandardMaterial({color, roughness:.84, ...settings});
function noiseTexture(base, amount) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const c=canvas.getContext('2d'), image=c.createImageData(128,128);
  for(let i=0;i<image.data.length;i+=4){
    const px=i/4%128, py=Math.floor(i/512);
    const patches=(Math.sin(px*Math.PI/16)*Math.cos(py*Math.PI/32)+.55*Math.sin((px+py)*Math.PI/8))*amount*.20;
    const shade=(random()-.5)*amount+patches;
    for(let j=0;j<3;j++)image.data[i+j]=base[j]+shade;
    image.data[i+3]=255;
  }
  c.putImageData(image,0,0);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.anisotropy=4;
  return texture;
}
const groundTex=noiseTexture([124,132,82],49);
groundTex.repeat.set(220,165);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(2200,1650,132,99),material(0xffffff,{map:groundTex}));
ground.geometry.rotateX(-Math.PI/2);
ground.geometry.translate(-510,-.075,-80);
const groundVertices=ground.geometry.attributes.position;
for(let i=0;i<groundVertices.count;i++){
  groundVertices.setY(i,groundVertices.getY(i)+periodHeight(groundVertices.getX(i),groundVertices.getZ(i)));
}
ground.geometry.computeVertexNormals();
ground.receiveShadow=true;
scene.add(ground);
const roadTex=noiseTexture([119,117,111],24);
const asphalt=material(0xffffff,{map:roadTex});
const concrete=material(0xb5ad9a);
const pavementTexture=noiseTexture([149,141,121],31);
const pavementCanvas=pavementTexture.image;
const joints=pavementCanvas.getContext('2d');
joints.strokeStyle='#777361';joints.lineWidth=1;
for(let row=0;row<16;row++){
  joints.beginPath();
  joints.moveTo(0,row*8+.5);joints.lineTo(128,row*8+.5);
  for(let col=row%2*4;col<128;col+=8){
    joints.moveTo(col+.5,row*8);joints.lineTo(col+.5,(row+1)*8);
  }
  joints.stroke();
}
const paving=material(0xffffff,{map:pavementTexture,bumpMap:pavementTexture,bumpScale:.049});
const grassVerge=material(0xdee1af,{map:groundTex});
const paint=material(0xe5e6de);
const yellowPaint=material(0xcaae52);
const unitBox=new THREE.BoxGeometry(1,1,1);
const foliage=new THREE.IcosahedronGeometry(1,1);
const trunk=new THREE.CylinderGeometry(.65,1,1,7);
const dishMesh=new THREE.SphereGeometry(1,14,8);
const batches=new Map();
function instance(key, geometry, color, x,y,z, sx,sy,sz, yaw=0){
  if(!batches.has(key)) batches.set(key,{geometry,items:[]});
  batches.get(key).items.push([color,x,y,z,sx,sy,sz,yaw]);
}
function flush(){
  const dummy=new THREE.Object3D(), color=new THREE.Color();
  for(const [key,{geometry,items}] of batches){
    const chunks=new Map();
    for(const item of items){
      const [,x,,z]=item;
      const cell=items.length<80?'all':Math.floor(x/112)+','+Math.floor(z/112);
      if(!chunks.has(cell))chunks.set(cell,[]);
      chunks.get(cell).push(item);
    }
    const mat=material(0xffffff);
    for(const local of chunks.values()){
      const mesh=new THREE.InstancedMesh(geometry,mat,local.length);
      local.forEach(([tint,x,y,z,sx,sy,sz,yaw],i)=>{
        dummy.position.set(x,y+periodHeight(x,z),z);dummy.scale.set(sx,sy,sz);dummy.rotation.y=yaw;dummy.updateMatrix();
        mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,color.set(tint));
      });
      mesh.computeBoundingSphere();
      // Three.js tests these bounds independently for the view and shadow cameras.
      mesh.castShadow=['period-details','crown','trunk'].includes(key);
      mesh.receiveShadow=key==='period-details';
      scene.add(mesh);
    }
  }
}
const planeGroups=new Map();
function surface(mat, points, height){
  if(!planeGroups.has(mat))planeGroups.set(mat,{positions:[],uv:[]});
  const group=planeGroups.get(mat);
  const shape=points.map(([x,z])=>new THREE.Vector2(x,-z));
  for(const tri of THREE.ShapeUtils.triangulateShape(shape,[])){
    for(const i of tri){
      const [x,z]=points[i];group.positions.push(x,height+periodHeight(x,z),z);group.uv.push(x/7,z/7);
    }
  }
}
function strip(mat,a,b,width,y){
  const dx=b[0]-a[0],dz=b[1]-a[1], length=Math.hypot(dx,dz);
  if(length<.07)return;
  const x=dz/length*width/2,z=-dx/length*width/2;
  surface(mat,[[a[0]+x,a[1]+z],[b[0]+x,b[1]+z],[b[0]-x,b[1]-z],[a[0]-x,a[1]-z]],y);
}
function disc(mat,[x,z],radius,y){
  surface(mat,Array.from({length:10},(_,i)=>[x+Math.cos(i*Math.PI/5)*radius,z+Math.sin(i*Math.PI/5)*radius]),y);
}
const roadSegments=[];
for(const [p,w,name,kind,junction,id] of data.roads){
  for(let i=1;i<p.length;i++){
    for(const [a,b] of openRoadPieces(p[i-1],p[i])){
    const dx=b[0]-a[0],dz=b[1]-a[1],d=Math.hypot(dx,dz);
    if(d<.07)continue;
    roadSegments.push({a,b,w,name,id});
    if(kind!=='service'){strip(concrete,a,b,w+2.8,.01);disc(concrete,a,w/2+1.4,.01);disc(concrete,b,w/2+1.4,.01);}
    // Slightly different heights keep overlapping road surfaces stable.
    const height=.025+roadSegments.length*.000008;
    strip(asphalt,a,b,w,height);disc(asphalt,a,w/2,height);disc(asphalt,b,w/2,height);
    if(w>=6 && kind!=='service' && junction!=='roundabout'){
      for(let at=5;at<d-5;at+=10){
        const x=a[0]+dx*at/d;
        if(name==='Пловдивска'&&(x> -305&&x<-211||x>-588&&x<-551))continue;
        const offsets=name==='Пловдивска'&&w===9?[-w/6,w/6]:[0];
        for(const offset of offsets){
          const point=k=>[a[0]+dx*k/d+dz*offset/d,a[1]+dz*k/d-dx*offset/d];
          strip(paint,point(at),point(Math.min(at+3,d-3)),.12,.052);
        }
      }
    }
  }
}
}
function edgeDistance(x,z,a,b){
  const dx=b[0]-a[0],dz=b[1]-a[1],den=dx*dx+dz*dz;
  const t=den ? THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/den,0,1) : 0;
  return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);
}
const water=material(0x7d9f9f), lawn=material(0x889667);
for(const [p,type] of data.zones){
  if(p.length<4 || p[0][0]!==p.at(-1)[0] || p[0][1]!==p.at(-1)[1])continue;
  surface(type==='water'?water:lawn,p.slice(0,-1),-.035);
}
const colliders=[];
const colliderCells=new Map();
const cellSize=24;
function addCollider(f){
  colliders.push(f);
  for(let x=Math.floor((f.minX-1.5)/cellSize);x<=Math.floor((f.maxX+1.5)/cellSize);x++){
    for(let z=Math.floor((f.minZ-1.5)/cellSize);z<=Math.floor((f.maxZ+1.5)/cellSize);z++){
      const key=x+','+z;
      if(!colliderCells.has(key))colliderCells.set(key,[]);
      colliderCells.get(key).push(f);
    }
  }
}

function footprint(p){
  return {p,minX:Math.min(...p.map(v=>v[0])),maxX:Math.max(...p.map(v=>v[0])),minZ:Math.min(...p.map(v=>v[1])),maxZ:Math.max(...p.map(v=>v[1]))};
}
function inside(x,z,poly){
  let hit=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const [ax,az]=poly[i],[bx,bz]=poly[j];
    if((az>z)!==(bz>z) && x<(bx-ax)*(z-az)/(bz-az)+ax) hit=!hit;
  }
  return hit;
}
function blocked(x,z,r=.3){
  const [left,top,right,bottom]=data.bounds;
  if(x<left+r||x>right-r||z<top+r||z>bottom-r)return true;
  for(const {p,minX,maxX,minZ,maxZ} of (colliderCells.get(Math.floor(x/cellSize)+','+Math.floor(z/cellSize))||[])){
    if(x<minX-r||x>maxX+r||z<minZ-r||z>maxZ+r)continue;
    if(inside(x,z,p)||p.some((a,i)=>edgeDistance(x,z,a,p[(i+1)%p.length])<r))return true;
  }
  return false;
}
const palettes=[0xc7b191,0xd3c7af,0xbfa28a,0xdfd7bc,0xa9a7a0,0xd2bca2,0xbbb5a7,0xb08175];
const roofs=[0x885044,0xa25e4b,0x6e635c,0x92736a,0x9b877b];
const facadeGroups=new Map();
function wall(mat, a,b,y0,y1){
  if(!facadeGroups.has(mat))facadeGroups.set(mat,[]);
  const [x,z]=a,[u,v]=b;
  const aHeight=periodHeight(x,z),bHeight=periodHeight(u,v);
  facadeGroups.get(mat).push(x,y0+aHeight,z,u,y0+bHeight,v,u,y1+bHeight,v,x,y0+aHeight,z,u,y1+bHeight,v,x,y1+aHeight,z);
}
const stone=palettes.map(color=>material(color,{side:THREE.DoubleSide}));
const roofMats=roofs.map(color=>material(color,{side:THREE.DoubleSide}));
function building(p,height,type,tint){
  if(p.length<3)return;
  const f=footprint(p), area=(f.maxX-f.minX)*(f.maxZ-f.minZ);
  if(area<8)return;
  addCollider(f);
  const industrial=['industrial','warehouse','retail','commercial','garage','garages'].includes(type)||area>1900;
  const h=height || (industrial ? 4.7+random()*2.3 : area<35 ? 2.6 : 3.2+3*Math.floor(random()*3));
  const c=tint ?? Math.floor(random()*stone.length);
  const roof=roofMats[Math.floor(random()*roofMats.length)];
  surface(roof,p,h);
  const signed=p.reduce((sum,[x,z],i)=>{const [u,v]=p[(i+1)%p.length];return sum+x*v-u*z;},0);
  const sign=signed>0?1:-1;
  const xCenter=(f.minX+f.maxX)/2,zCenter=(f.minZ+f.maxZ)/2;
  const nearRoad=roadSegments.some(({a,b,w})=>edgeDistance(xCenter,zCenter,a,b)<55+w);
  for(let i=0;i<p.length;i++){
    const a=p[i],b=p[(i+1)%p.length],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
    if(len<.4)continue;
    wall(stone[c],a,b,0,h);
    const nx=sign*dz/len,nz=-sign*dx/len,yaw=-Math.atan2(dz,dx);
    instance('trim',unitBox,industrial?0xaaa79b:0x817467,(a[0]+b[0])/2,h,(a[1]+b[1])/2,len+.12,.15,.23,yaw);
    if(!nearRoad||len<2.5||h<3)continue;
    instance('trim',unitBox,0x9b8d79,(a[0]+b[0])/2,.38,(a[1]+b[1])/2,len,.76,.10,yaw);
    const columns=Math.min(25,Math.floor(len/(industrial?4:2.65)));
    const floors=Math.min(12,Math.max(1,Math.floor((h+.26)/2.85)));
    for(let floor=0;floor<floors;floor++){
      for(let j=0;j<columns;j++){
        const t=(j+.5)/columns,y=1.69+floor*2.83,x=a[0]+dx*t,z=a[1]+dz*t;
        if(y+.8>h)continue;
        const wide=industrial?1.45:1.05;
        instance('reveal',unitBox,0xd7d2c5,x+nx*.055,y,z+nz*.055,wide+.15,1.32,.16,yaw);
        instance('glass',unitBox,random()>.5?0x536369:0x677779,x+nx*.15,y,z+nz*.15,wide,1.15,.08,yaw);
        instance('trim',unitBox,0xb6b6ab,x+nx*.19,y,z+nz*.19,.045,1.15,.085,yaw);
        instance('trim',unitBox,0xafaa9e,x+nx*.17,y-.61,z+nz*.17,wide+.16,.085,.26,yaw);
        if(!industrial&&floor>0&&j%3===1&&i===0&&area>130){
          instance('trim',unitBox,0xa8a195,x+nx*.48,y-.77,z+nz*.48,wide+.5,.14,1.15,yaw);
          instance('trim',unitBox,0x696d68,x+nx*.96,y-.4,z+nz*.96,wide+.45,.52,.055,yaw);
        }
      }
    }
  }
  if(!industrial && h<8 && p.length===4 && area>40){
    // Raised ridge on compact, approximately rectangular footprints.
    const [a,b,c,d]=p;
    const len1=Math.hypot(a[0]-b[0],a[1]-b[1]),len2=Math.hypot(b[0]-c[0],b[1]-c[1]);
    const [u,v,w,q]=len1>len2?[a,b,c,d]:[b,c,d,a];
    const k=[(u[0]+q[0])/2,(u[1]+q[1])/2],l=[(v[0]+w[0])/2,(v[1]+w[1])/2];
    const top=h+Math.min(2.2,Math.min(len1,len2)*.24);
    const out=facadeGroups.get(roof)||[];facadeGroups.set(roof,out);
    const vec=(pt,y)=>[pt[0],y+periodHeight(...pt),pt[1]];
    const U=vec(u,h),V=vec(v,h),W=vec(w,h),Q=vec(q,h),K=vec(k,top),L=vec(l,top);
    out.push(...U,...V,...L,...U,...L,...K,...Q,...K,...L,...Q,...L,...W,...U,...K,...Q,...V,...W,...L);
  }
}
const periodRoof=material(0x676358);
const periodKit={
  box:(color,...transform)=>instance('period-details',unitBox,color,...transform),
  roof:(p,y)=>surface(periodRoof,p,y),
  footprint:p=>addCollider(footprint(p)),
  glassColor:0x667774,
};
periodKit.dish=(x,y,z,yaw)=>{
  instance('dishes',dishMesh,0xd8d7cf,x,y,z,.255,.227,.059,yaw);
  periodKit.box(0xa6a6a0,x+Math.sin(yaw)*.10,y-.115,z+Math.cos(yaw)*.10,.028,.036,.26,yaw);
};
for(const [index,[p,height,type,name]] of data.buildings.entries()){
  if(name==='Kaufland'||index===49||(index>=469&&index<=473)||p.every(inClosedLot))continue;
  const x=p.reduce((sum,pt)=>sum+pt[0],0)/p.length;
  const z=p.reduce((sum,pt)=>sum+pt[1],0)/p.length;
  const design=blockDesigns[index];
  if(type==='apartments'&&(design||x>-670&&x<50&&z>-180&&z<140)){
    const tower=index===229||index===215;
    const [floors,color,profile,front]=design??[5,0xaaa595,1,z<0?1:-1];
    apartmentBlock(p,{floors,color,bays:tower?5:4,tower,profile,front,patches:facadePatches[index]??[]},periodKit);
  }else if(index===89){
    apartmentBlock(p,{floors:8,color:0xc5a7a3,bays:4,profile:3,front:1},periodKit);
  }else if(index>=239&&index<=241){
    // Two-storey pitched-roof houses on the north side by №65–69.
    building(p,5.55,type,index===239?7:3);
    if(index===239){
      for(const [px,pz] of [[-331,-58.85],[-324,-57.70],[-320,-57.12]]){
        periodKit.box(0x707b66,px,2.72,pz,.082,5.42,.076);
      }
      for(const [px,pz] of [[-331.2,-58.58],[-327.4,-57.94],[-323.9,-57.41],[-321.0,-56.99]]){
        periodKit.box(0xe4ded1,px,1.69,pz,1.58,1.31,.13,-.154);
        periodKit.box(0x739680,px,1.69,pz+.08,1.41,1.18,.055,-.154);
        periodKit.box(0xe6e0d0,px,1.69,pz+.13,.060,1.20,.052,-.154);
      }
    }
  }else{
    building(p,height,type);
  }
}
modernLandmarks({...periodKit,building,surface,asphalt,paving,
  market:data.buildings.find(([, , ,name])=>name==='Kaufland')[0],corner:data.buildings[49][0]});
referenceBuildings({...periodKit,surface,paving,buildings:data.buildings});
function tree(x,z,size){
  if(inClosedLot([x,z]))return;
  instance('trunk',trunk,0x62513e,x,size*.43,z,.18*size,.86*size,.18*size);
  const shades=[0x547543,0x6a8b48,0x7f9e51,0x49633a];
  const local=x>-675&&x<40&&Math.abs(z)<150;
  const lobes=local?13:4;
  for(let i=0;i<lobes;i++){
    const angle=i*2.39996, middle=i<4, radius=middle?size*.26:size*.59;
    const spread=middle?.72:.38;
    instance('crown',foliage,shades[i%shades.length],x+Math.sin(angle)*radius,
      size*(1.04+(i%5)*.10),z+Math.cos(angle)*radius,size*spread,size*(spread+.12),size*spread,angle);
  }
}
for(const {a,b,w} of roadSegments){
  const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
  if(w<6||len<26)continue;
  for(let t=12;t<len-11;t+=22){
    const side=random()>.5?1:-1, off=side*(w/2+2.35);
    const x=a[0]+dx*t/len+dz*off/len,z=a[1]+dz*t/len-dx*off/len;
    if(blocked(x,z,1.2)||roadSegments.some(s=>edgeDistance(x,z,s.a,s.b)<s.w/2+1.15))continue;
    if(random()>.36)tree(x,z,1.35+random()*1.18);
    else {
      instance('pole',trunk,0x70756f,x,3,z,.065,6,.065);
      instance('trim',unitBox,0x5f665f,x,5.96,z,.85,.12,.25);
    }
  }
}
periodStreet({roadSegments,edgeDistance,strip,surface,disc,box:periodKit.box,
  addTree:(x,z,size)=>{if(!blocked(x,z,1))tree(x,z,size);},
  types:{concrete,paint,asphalt,paving,verge:grassVerge}});
modernRoad({roadSegments,edgeDistance,strip,surface,box:periodKit.box,
  paint,asphalt,paving,yellow:yellowPaint,plant:(x,z,size)=>{if(!blocked(x,z,1))tree(x,z,size);}});
// Parked vehicles keep the shop foreground legible from both reference approaches.
const parkedWheel=new THREE.CylinderGeometry(.30,.30,.16,12).rotateZ(Math.PI/2);
const parkedRim=new THREE.CylinderGeometry(.16,.16,.17,12).rotateZ(Math.PI/2);
const parkedCabin=new THREE.BoxGeometry(1,1,1);
const cabinVertices=parkedCabin.attributes.position;
for(let i=0;i<cabinVertices.count;i++){
  if(cabinVertices.getY(i)>0){
    cabinVertices.setX(i,cabinVertices.getX(i)*.78);
    cabinVertices.setZ(i,cabinVertices.getZ(i)*.71);
  }
}
parkedCabin.computeVertexNormals();
const parkedColors=[0xcacbc6,0x3e4b57,0x627c86,0x7e524c,0x838989,0xd3c69a];
for(const [index,[x,z,yaw]] of [[-375,8,1.57],[-370,8,1.57],[-365,8,1.57],[-357,8,1.57],[-350,8,1.57],
  [-343,0,1.57],[-338,0,1.57],[-332,0,1.57],[-326,0,1.57],[-312,-2,1.57],[-304,-2,1.57],
  [-291,4,1.57],[-284,4,1.57],[-101,12,1.50],[-117,16,1.46],[-212,12,1.32]].entries()){
  if(blocked(x,z,.9)||roadSegments.some(r=>edgeDistance(x,z,r.a,r.b)<r.w/2+.75))continue;
  const co=Math.cos(yaw),si=Math.sin(yaw);
  const point=(u,v)=>[x+u*co+v*si,z-u*si+v*co];
  const color=parkedColors[index%parkedColors.length];
  const detail=(geo,tint,u,y,v,w,h,d)=>{const [px,pz]=point(u,v);instance('parked-'+geo.id,geo,tint,px,y,pz,w,h,d,yaw);};
  detail(unitBox,color,0,.57,0,1.66,.48,3.78);
  detail(parkedCabin,0x547078,0,1.06,-.18,1.52,.66,2.23);
  detail(unitBox,color,0,1.374,-.18,1.17,.075,1.64);
  for(const u of [-.80,.80]){
    for(const v of [-1.25,1.25]){
      detail(parkedWheel,0x25292a,u,.30,v,1,1,1);
      detail(parkedRim,0x9da1a0,u+Math.sign(u)*.012,.30,v,1,1,1);
    }
    detail(unitBox,0xdbd7bd,u*.8,.65,1.90,.32,.15,.06);
    detail(unitBox,0xa3332e,u*.8,.63,-1.90,.30,.14,.06);
  }
  addCollider(footprint([point(-.84,-1.92),point(.84,-1.92),point(.84,1.92),point(-.84,1.92)]));
}
const [lotX,lotZ]=data.lot;
const carSpot=[21.1,53.7], spawn=[19.45,59.1];
const startCarHeading=Math.PI;
const addSceneryCollider=p=>addCollider(footprint(p));
const roadAccess=buildRoadAccess({roads:roadSegments,route:data.route,edgeDistance,
  box:periodKit.box,collider:addSceneryCollider});
buildSkatePark({surface,strip,paving,material,box:periodKit.box,collider:addSceneryCollider,tree,
  mesh:(geometry,mat)=>{const object=new THREE.Mesh(geometry,mat);object.receiveShadow=true;scene.add(object);}});
const lotOutline=[[lotX-11,lotZ-9],[lotX+7,lotZ-9],[lotX+10,lotZ+9],[lotX-11,lotZ+9]];
surface(asphalt,lotOutline,.042);
for(let i=0;i<6;i++){
  const x=carSpot[0]-1.47+(i-2)*2.94;
  strip(paint,[x,lotZ-4.7],[x,lotZ+3],.12,.058);
}
const lanePaint=material(0xe7e0c2);
const finishDark=material(0x263435);
function trackMark(dist,offset){
  const {x,z,yaw}=DragTrack.at(dist,-1);
  return [x+Math.cos(yaw)*offset,z-Math.sin(yaw)*offset];
}
for(const dist of [0,402]){
  for(let i=0;i<12;i++){
    const a=trackMark(dist,-3.3+i*.55),b=trackMark(dist,-3.3+(i+1)*.55);
    strip(dist===402&&i%2?finishDark:lanePaint,a,b,.50,.097);
  }
}
for(let dist=5;dist<463;dist+=11)strip(lanePaint,trackMark(dist,0),trackMark(dist+3,0),.13,.092);
for(const [mat,{positions,uv}] of planeGroups){
  mat.side=THREE.DoubleSide;
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  // Horizontal surfaces use one stable upward normal regardless of ring winding.
  const normals=new Float32Array(positions.length);
  for(let i=1;i<normals.length;i+=3)normals[i]=1;
  geo.setAttribute('normal',new THREE.BufferAttribute(normals,3));
  // Normalize winding for lighting on double-sided materials.
  const pos=geo.attributes.position, tex=geo.attributes.uv;
  for(let i=0;i<pos.count;i+=3){
    const ax=pos.getX(i+1)-pos.getX(i),az=pos.getZ(i+1)-pos.getZ(i);
    const bx=pos.getX(i+2)-pos.getX(i),bz=pos.getZ(i+2)-pos.getZ(i);
    if(az*bx-ax*bz>=0)continue;
    const x=pos.getX(i+1),z=pos.getZ(i+1),u=tex.getX(i+1),v=tex.getY(i+1);
    pos.setXYZ(i+1,pos.getX(i+2),pos.getY(i+2),pos.getZ(i+2));
    pos.setXYZ(i+2,x,pos.getY(i+2),z);
    tex.setXY(i+1,tex.getX(i+2),tex.getY(i+2));tex.setXY(i+2,u,v);
  }
  const mesh=new THREE.Mesh(geo,mat);
  mesh.receiveShadow=true;
  mesh.userData.groundLayer=[asphalt,paint,yellowPaint,concrete,paving,water,lawn,grassVerge].includes(mat);
  scene.add(mesh);
}
for(const [mat,positions] of facadeGroups){
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,mat);
  mesh.castShadow=true;mesh.receiveShadow=true;
  scene.add(mesh);
}
flush();
function modelPart(parent,geo,mat,x,y,z){
  const part=new THREE.Mesh(geo,mat);
  part.position.set(x,y,z);parent.add(part);return part;
}
const pieces = {
  box:(parent,mat,x,y,z,w,h,d)=>modelPart(parent,new THREE.BoxGeometry(w,h,d),mat,x,y,z),
  ball:(parent,mat,x,y,z,w,h,d)=>{
    const mesh=modelPart(parent,new THREE.SphereGeometry(1,13,10),mat,x,y,z);
    mesh.scale.set(w,h,d);return mesh;
  },
  tube:(parent,mat,x,y,z,top,bottom,h)=>modelPart(parent,new THREE.CylinderGeometry(top,bottom,h,12),mat,x,y,z)
};
function profile(parent,mat,bottom,top){
  const p=[...bottom,...top];
  const faces=[[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7],[0,3,2,1]];
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(faces.flatMap(([a,b,c,d])=>[...p[a],...p[b],...p[c],...p[a],...p[c],...p[d]]),3));
  geo.computeVertexNormals();
  return modelPart(parent,geo,mat,0,0,0);
}
const rectangle=(w,y,back,front)=>[[-w,y,back],[w,y,back],[w,y,front],[-w,y,front]];
let car=new THREE.Group();scene.add(car);
const metal=material(0xa6b9bf,{metalness:.33,roughness:.34,side:THREE.DoubleSide});
const lower=material(0x8a8c87,{side:THREE.DoubleSide});
const rubber=material(0x242728);
const glass=material(0x507079,{metalness:.33,roughness:.19,side:THREE.DoubleSide});
const silver=material(0xbdbfb5,{metalness:.43,roughness:.29});
const light=material(0xf5ebc6,{emissive:0x2b2314});
const tail=material(0xb73b29), amber=material(0xc7802f);
const box=pieces.box, ball=pieces.ball, tube=pieces.tube;
const teal=material(0x189390,{roughness:.33,metalness:.26,side:THREE.DoubleSide});
const accent=material(0xe6b550,{side:THREE.DoubleSide});
profile(car,lower,rectangle(.88,.28,-2.29,2.29),rectangle(.96,.58,-2.34,2.27));
profile(car,metal,rectangle(.96,.55,-2.34,2.27),rectangle(.87,.87,-2.21,2.18));
profile(car,glass,rectangle(.80,.86,-1.52,1.08),rectangle(.66,1.36,-.92,.39));
profile(car,metal,rectangle(.674,1.335,-.93,.40),rectangle(.61,1.395,-.87,.35));
box(car,teal,0,.89,1.63,1.58,.05,1.04);
box(car,metal,0,.89,-1.84,1.57,.06,.65);
box(car,rubber,0,.324,2.274,1.69,.10,.19);
box(car,rubber,0,.39,-2.33,1.63,.18,.15);
box(car,rubber,0,.55,2.293,1.02,.24,.055);
for(let i=0;i<5;i++)box(car,silver,0,.465+i*.036,2.324,.82,.013,.014);
box(car,rubber,0,1.235,-1.99,1.99,.08,.33);
for(const side of [-1,1]){
  const mount=box(car,rubber,side*.53,1.055,-1.93,.089,.36,.14);
  mount.rotation.x=.26;
  box(car,accent,side*.985,1.22,-1.99,.045,.19,.33);
  box(car,light,side*.65,.72,2.235,.43,.137,.085);
  box(car,amber,side*.65,.477,2.270,.20,.078,.072);
  for(const [x,r] of [[.68,.132],[.423,.104]]){
    const ring=tube(car,rubber,side*x,.716,-2.255,r+.025,r+.025,.038);
    ring.rotation.x=Math.PI/2;
    const lamp=tube(car,tail,side*x,.716,-2.277,r,r,.023);
    lamp.rotation.x=Math.PI/2;
  }
  box(car,teal,side*.905,.455,0,.13,.13,3.02);
  const stripe=box(car,accent,side*.936,.639,.10,.022,.041,1.82);
  stripe.rotation.x=-.106;
  box(car,silver,side*.884,.797,-.18,.034,.032,.186);
  box(car,metal,side*.91,.991,.61,.23,.104,.144);
  for(const [z,h,tilt] of [[-1.10,.55,.78],[.70,.58,-.87],[-.76,.49,.02]]){
    const pillar=box(car,metal,side*.735,1.103,z,.069,h,.067);
    pillar.rotation.x=tilt;pillar.rotation.z=side*.17;
  }
}
function label(text,width,height,bg,fg){
  const c=document.createElement('canvas');c.width=512;c.height=128;
  const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);
  ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';const directed=text.startsWith('← ');
  const lines=(directed?text.slice(2):text).split('\n');
  ctx.font=lines.length===1?'bold 76px sans-serif':'bold 49px sans-serif';
  if(text==='К'){
    ctx.fillRect(115,19,56,90);
    ctx.beginPath();ctx.moveTo(174,67);ctx.lineTo(294,19);ctx.lineTo(375,19);ctx.lineTo(252,65);
    ctx.lineTo(401,109);ctx.lineTo(305,109);ctx.closePath();ctx.fill();
  }else{
    lines.forEach((line,i)=>ctx.fillText(line,directed?300:256,lines.length===1?65:37+i*52,directed?320:470));
  }
  if(directed){
    ctx.beginPath();ctx.moveTo(26,64);ctx.lineTo(91,12);ctx.lineTo(114,12);ctx.lineTo(54,64);ctx.lineTo(114,116);ctx.lineTo(91,116);ctx.closePath();ctx.fill();
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));
}
for(const dir of [-1,1]){
  const plate=label('ПЗ 168',.36,.092,'#dedbd2','#202321');
  plate.position.set(0,.52,dir*(dir>0?2.377:2.394));plate.rotation.y=dir===1?0:Math.PI;car.add(plate);
}
const graffitiTextures=new Map();
function scenePost(color,x,y,z,w,h,d,angle=0){
  const barrier=box(scene,material(color),x,y+periodHeight(x),z,w,h,d);
  barrier.rotation.y=angle;barrier.castShadow=true;barrier.receiveShadow=true;
  return barrier;
}
function paintedPanel(source,x,y,z,angle,w,h){
  if(!graffitiTextures.has(source)){
    const canvas=typeof source==='number'?sprayPanel(source):source;
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    graffitiTextures.set(source,material(0xffffff,{map,side:THREE.FrontSide}));
  }
  const board=modelPart(scene,new THREE.PlaneGeometry(w,h),graffitiTextures.get(source),x,y+periodHeight(x),z);
  board.rotation.y=angle;board.receiveShadow=true;
}
buildLotBarrier({collider:addSceneryCollider,canvas:index=>index,box:scenePost,label:paintedPanel});
streetSigns({label,painted:paintedPanel,post:scenePost,scene});
const wheels=[];
for(const x of [-.91,.91]){
  for(const z of [-1.42,1.43]){
    const pivot=new THREE.Group();pivot.position.set(x,.335,z);car.add(pivot);
    const axle=new THREE.Group();pivot.add(axle);
    const tire=tube(axle,rubber,0,0,0,.335,.335,.214);tire.rotation.z=Math.PI/2;
    const rim=tube(axle,silver,Math.sign(x)*.112,0,0,.224,.224,.024);rim.rotation.z=Math.PI/2;
    const darkRim=tube(axle,rubber,Math.sign(x)*.127,0,0,.115,.115,.016);darkRim.rotation.z=Math.PI/2;
    for(let i=0;i<8;i++)ball(axle,silver,Math.sign(x)*.139,Math.cos(i*Math.PI/4)*.169,Math.sin(i*Math.PI/4)*.169,.012,.023,.023);
    wheels.push({pivot,axle,steering:z>0});
  }
}
const hero=new THREE.Group();scene.add(hero);
const skin=material(0xc48f6e), hair=material(0x282525), shirt=material(0xe0dbd1), sleeves=material(0x2c2e31), jeans=material(0x494b4b), shoes=material(0xe1ded2);
const darkGlass=material(0x232c30,{roughness:.26});
ball(hero,shirt,0,1.225,0,.214,.31,.124);
box(hero,jeans,0,.96,0,.325,.14,.19);
tube(hero,skin,0,1.505,0,.064,.069,.13);
ball(hero,skin,0,1.661,0,.103,.141,.093);
ball(hero,skin,0,1.633,.051,.078,.084,.061);
ball(hero,skin,0,1.655,.105,.024,.033,.024);
ball(hero,hair,-.009,1.77,-.013,.103,.061,.094);
ball(hero,hair,-.022,1.799,.015,.084,.042,.076);
ball(hero,hair,0,1.715,-.06,.10,.08,.049);
for(const side of [-1,1]){
  ball(hero,skin,side*.10,1.652,-.002,.020,.035,.019);
  ball(hero,darkGlass,side*.047,1.69,.089,.048,.027,.016);
  box(hero,darkGlass,side*.093,1.696,.037,.013,.013,.10);
}
box(hero,darkGlass,0,1.694,.099,.025,.011,.016);
ball(hero,material(0x8f5d4e),0,1.611,.104,.033,.007,.006);
const legs=[], arms=[];
for(const side of [-1,1]){
  const leg=new THREE.Group();leg.position.set(side*.093,.95,0);hero.add(leg);
  tube(leg,jeans,0,-.208,0,.079,.068,.427);
  const knee=new THREE.Group();knee.position.y=-.44;leg.add(knee);
  tube(knee,jeans,0,-.183,0,.066,.048,.38);
  ball(knee,shoes,0,-.445,.06,.065,.054,.125);
  legs.push({leg,knee});
  const arm=new THREE.Group();arm.position.set(side*.184,1.403,0);hero.add(arm);
  arm.rotation.z=side*.12;
  tube(arm,sleeves,0,-.091,0,.069,.057,.222);
  tube(arm,skin,0,-.284,0,.048,.039,.238);
  ball(arm,skin,0,-.425,.006,.042,.059,.032);
  arms.push(arm);
}
const dragModels=buildDragModels({THREE,material,box,ball,tube,profile,rectangle,skyline:car,hero,wheels});
const skylineCar=car;
let selectedPilot=1,selectedCar='skyline';
const parking={
  skyline:{object:skylineCar,x:carSpot[0],z:carSpot[1],yaw:startCarHeading},
  supra:{object:dragModels.models.supra,x:24.05,z:carSpot[1],yaw:startCarHeading},
  s2000:{object:dragModels.models.s2000,x:27.0,z:carSpot[1],yaw:startCarHeading},
};
const rollWheels=Object.fromEntries(Object.entries(parking).map(([id,{object}])=>[id,id==='skyline'?wheels:
  object.children.filter(node=>node.isGroup).map(pivot=>({pivot,axle:pivot.children[0],steering:pivot.position.z>0}))]));
for(const {object} of Object.values(parking))scene.add(object);
for(const model of dragModels.pilots.slice(1))scene.add(model);
const menuScene=new THREE.Scene();menuScene.background=new THREE.Color(0x1c2d30);
menuScene.add(new THREE.HemisphereLight(0xffedda,0x668386,2));
const menuLight=new THREE.DirectionalLight(0xffdfbb,2.8);
menuLight.position.set(1,3,4);menuScene.add(menuLight);
box(menuScene,material(0x233d41),0,-.14,0,12,.26,9);
const podiums=dragModels.pilots.map((model,i)=>{
  const clone=model.clone(true),x=(i-1)*1.32;
  clone.position.set(x,.12,0);menuScene.add(clone);
  const base=tube(menuScene,material(i===0?0xb27749:0x3c565b),x,.031,0,.52,.55,.15);
  return base;
});
const menuCamera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,30);
function renderMenu(){
  menuCamera.aspect=innerWidth/innerHeight;
  menuCamera.updateProjectionMatrix();
  const distance=Math.max(4.7,6.7/menuCamera.aspect);
  menuCamera.position.set(0,1.4,distance);menuCamera.lookAt(0,.68,0);
  renderer.render(menuScene,menuCamera);
  // The menu uses a different scene. Refresh static city shadows on entering the map.
  if(renderer.shadowMap)renderer.shadowMap.needsUpdate=true;
}
for(const button of document.querySelectorAll('[data-pilot]'))button.addEventListener('click',()=>{
  selectedPilot=Number(button.dataset.pilot);
  for(const candidate of document.querySelectorAll('[data-pilot]'))candidate.setAttribute('aria-pressed',String(candidate===button));
  podiums.forEach((base,i)=>base.material.color.setHex(i===selectedPilot-1?0xb27749:0x3c565b));
  invalidateFrame();
});
const raceCars=[new THREE.Group(),new THREE.Group()];
for(const slot of raceCars){slot.visible=false;scene.add(slot);}
const raceDecor=new THREE.Group();scene.add(raceDecor);
const darkRace=material(0x222b2b),glowRace=material(0x585d4c,{emissive:0x402810});
const lamps=[];
for(const offset of [-3.9,3.9]){
  const [x,z]=trackMark(-1,offset),height=periodHeight(x);
  box(raceDecor,darkRace,x,1.3+height,z,.12,2.6,.12);
  for(let i=0;i<3;i++)lamps.push(ball(raceDecor,glowRace.clone(),x,2.20+i*.22+height,z,.089,.089,.089));
}
for(const offset of [-4.05,4.05]){
  const [x,z]=trackMark(402,offset);
  box(raceDecor,material(0xe7b55d),x,1.62+periodHeight(x),z,.12,3.24,.12);
}
const startPose=DragTrack.at(0,-1);
const startBanner=label('СТАРТ · ДРАГ 402 м',7.9,.76,'#233532','#ffdf91');
startBanner.position.set(startPose.x,3.23+periodHeight(startPose.x),startPose.z);
startBanner.rotation.y=startPose.yaw+Math.PI;
raceDecor.add(startBanner);
for(const offset of [-4.05,4.05]){
  const [x,z]=trackMark(0,offset);
  box(raceDecor,darkRace,x,1.58+periodHeight(x),z,.10,3.16,.10);
}
const finishBanner=label('ФИНАЛ · 402 м',7.9,.62,'#233532','#f8e1ae');
const finishPose=DragTrack.at(402,-1);
finishBanner.position.set(finishPose.x,3.27+periodHeight(finishPose.x),finishPose.z);
finishBanner.rotation.y=finishPose.yaw+Math.PI;raceDecor.add(finishBanner);

const cosmeticMeshes=[];
function addCosmetics(model){
  const paint=box(model,material(0x40b6a6),0,.879,1.43,.14,.027,1.02);
  const number=label('84',.31,.17,'#f4d89c','#263532');
  number.position.set(0,.61,-2.38);number.rotation.y=Math.PI;model.add(number);
  const rims=[];
  for(const x of [-1.045,1.045]){
    for(const z of [-1.35,1.38]){
      const ring=tube(model,material(0xc28a4d),x,.335,z,.155,.155,.018);
      ring.rotation.z=Math.PI/2;rims.push(ring);
    }
  }
  cosmeticMeshes.push({paint,number,rims});
}
for(const model of Object.values(parking))addCosmetics(model.object);
const applyCosmetics=owned=>{
  for(const {paint,number,rims} of cosmeticMeshes){
    paint.visible=!!owned.paint;number.visible=!!owned.number;
    rims.forEach(rim=>rim.visible=!!owned.rim);
  }
};
const passengers=new Map();
function updatePassenger(parent,pilot,visible){
  if(!visible){if(passengers.has(parent))passengers.get(parent).model.visible=false;return;}
  const old=passengers.get(parent);
  if(old?.pilot!==pilot){
    if(old)parent.remove(old.model);
    const model=dragModels.seat(pilot);parent.add(model);passengers.set(parent,{pilot,model});
  }
  passengers.get(parent).model.visible=true;
}
function renderRace(world,dt){
  hero.visible=false;dragModels.pilots.slice(1).forEach(p=>p.visible=false);
  heroShadow.visible=false;carShadow.visible=false;marker.visible=false;
  for(const {object} of Object.values(parking))object.visible=false;
  for(const [i,slot] of raceCars.entries()){
    const entry=world?.players[i];
    const wasVisible=slot.visible;
    slot.visible=!!entry?.state;
    if(!slot.visible)continue;
    if(slot.userData.model!==entry.car){
      slot.clear();
      passengers.delete(slot);
      const copy=dragModels.models[entry.car].clone(true);
      copy.position.set(0,0,0);copy.rotation.set(0,0,0);copy.visible=true;
      for(const child of copy.children.filter(child=>child.userData.seated))copy.remove(child);
      slot.add(copy);slot.userData.model=entry.car;
    }
    updatePassenger(slot,entry.pilot,entry.car==='s2000');
    const pose=DragTrack.at(entry.state.dist,i);
    const y=.057+periodHeight(pose.x);
    if(!wasVisible||entry.state.dist===0||Math.hypot(slot.position.x-pose.x,slot.position.z-pose.z)>21){
      slot.position.set(pose.x,y,pose.z);
    }else{
      const t=1-Math.exp(-dt*18);
      slot.position.x+=(pose.x-slot.position.x)*t;
      slot.position.z+=(pose.z-slot.position.z)*t;
      slot.position.y+=(y-slot.position.y)*t;
    }
    slot.rotation.y=pose.yaw;
  }
  const time=world?.time??-3;
  lamps.forEach((lamp,i)=>lamp.material.color.setHex(time>=0?0x5fdd7f:i%3<Math.max(1,4-Math.ceil(-time))?0xf2a15b:0x494038));
  const mine=world?.players[world.index]?.state;
  if(mine){
    const pose=DragTrack.at(mine.dist,world.index);
    const sin=Math.sin(pose.yaw),cos=Math.cos(pose.yaw);
    eye.set(pose.x-sin*7.5,3.25+periodHeight(pose.x),pose.z-cos*7.5);
    if(camera.position.distanceTo(eye)>28)camera.position.copy(eye);
    else camera.position.lerp(eye,1-Math.exp(-dt*14));
    camera.lookAt(pose.x+sin*6,1.1+periodHeight(pose.x),pose.z+cos*6);
  }
}
const marker=new THREE.Group();
const markerMat=new THREE.MeshBasicMaterial({color:0xffb856});
const arrow=modelPart(marker,new THREE.ConeGeometry(.27,.48,4),markerMat,0,0,0);arrow.rotation.z=Math.PI;
scene.add(marker);
function shadow(w,d){
  const c=document.createElement('canvas');c.width=c.height=64;
  const ctx=c.getContext('2d'), gradient=ctx.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,'#17201882');gradient.addColorStop(1,'#17201800');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));
  mesh.rotation.x=-Math.PI/2;scene.add(mesh);return mesh;
}
const heroShadow=shadow(1.35,1.08),carShadow=shadow(2.9,5.35);
const animateSignals=modernSigns({box:(color,x,y,z,w,h,d,yaw=0)=>{
  const mesh=box(scene,material(color),x,y+periodHeight(x),z,w,h,d);
  mesh.rotation.y=yaw;mesh.castShadow=true;return mesh;
},label,scene,material,modelPart,modelBox:box});
animateSignals(27000);
const keys=new Set();
let started=false, driving=false, completed=false, speed=0, yaw=0, orbit=0, phase=0, gameTime=0;
let comparisonView=null;
const playCameraPosition=new THREE.Vector3();
let walkInput=0, walkHeading=0, walkCamera=0, manualOrbit=false;
const walkVelocity=new THREE.Vector3();
let notice=0, exitMessage='';
const actor=new THREE.Vector3(), vehicle=new THREE.Vector3();
const target=new THREE.Vector3(), eye=new THREE.Vector3();
function reset(){
  actor.set(spawn[0],0,spawn[1]);vehicle.set(carSpot[0],0,carSpot[1]);
  selectedCar='skyline';car=skylineCar;
  for(const {object,x,z,yaw} of Object.values(parking)){
    object.position.set(x,.053+periodHeight(x),z);object.rotation.y=yaw;object.visible=true;
  }
  driving=false;completed=false;speed=0;orbit=0;yaw=0;phase=0;notice=0;
  car.rotation.y=startCarHeading;hero.rotation.y=0;
  walkInput=0;walkHeading=0;walkCamera=0;manualOrbit=false;walkVelocity.set(0,0,0);
  walkCamera=Math.PI-.16;orbit=walkCamera;
  hero.rotation.y=walkCamera;
  camera.position.set(actor.x,2.45,actor.z+4.6);
}
reset();
function start(){started=true;$('drag-open').hidden=false;$('start').hidden=true;renderer.domElement.focus();invalidateFrame();}
$('play').addEventListener('click',start);
$('quick-drag').addEventListener('click',()=>{start();dragUI.startTraining();});
function nearbyCar(){
  const nearest=Object.entries(parking).map(([id,{object}])=>[id,Math.hypot(actor.x-object.position.x,actor.z-object.position.z)])
    .sort((a,b)=>a[1]-b[1])[0];
  return nearest[1]<=3.05?nearest[0]:null;
}
function interact(){
  if(!driving){
    const id=nearbyCar();
    if(!id)return;
    selectedCar=id;car=parking[id].object;vehicle.set(car.position.x,0,car.position.z);
    dragUI.chooseCar(id);
    driving=true;completed=true;notice=4;speed=0;
    return;
  }
  if(Math.abs(speed)>1.25){notice=-2;exitMessage='Спри, за да слезеш';return;}
  for(const dir of [-1,1]){
    const x=vehicle.x+Math.cos(car.rotation.y)*dir*1.72,z=vehicle.z-Math.sin(car.rotation.y)*dir*1.72;
    if(blocked(x,z,.32))continue;
    actor.set(x,0,z);orbit=car.rotation.y;hero.rotation.y=orbit;
    walkInput=0;walkHeading=orbit;walkCamera=orbit;manualOrbit=false;walkVelocity.set(0,0,0);
    driving=false;speed=0;return;
  }
  notice=-4;exitMessage='Няма място за слизане';
}
const viewKeys=Array.from({length:9},(_,i)=>'Digit'+(i+1));
const viewStep=['BracketLeft','BracketRight'];
const handled=new Set([...viewKeys,...viewStep,'Escape','KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','ShiftLeft','ShiftRight','KeyE','KeyR','Space']);
addEventListener('keydown',e=>{
  if(dragUI.capture(e,true)||!started||!handled.has(e.code)||['INPUT','SELECT'].includes(e.target?.tagName))return;
  e.preventDefault();
  let viewIndex=viewKeys.indexOf(e.code);
  if(viewStep.includes(e.code)){
    const current=periodViews.indexOf(comparisonView);
    viewIndex=current<0?0:(current+(e.code==='BracketRight'?1:-1)+periodViews.length)%periodViews.length;
  }
  if(viewIndex>=0){
    if(!e.repeat){
      keys.clear();
      if(!comparisonView)playCameraPosition.copy(camera.position);
      comparisonView=periodViews[viewIndex];
      invalidateFrame();
      $('view-name').textContent=(viewIndex+1)+' / '+periodViews.length+' · '+comparisonView.name;
      $('view-name').hidden=false;
    }
    return;
  }
  if(comparisonView){
    comparisonView=null;
    invalidateFrame();
    camera.position.copy(playCameraPosition);
    camera.fov=65;
    camera.updateProjectionMatrix();
    $('view-name').hidden=true;
  }
  keys.add(e.code);
  if(e.repeat)return;
  if(e.code==='KeyE')interact();
  if(e.code==='KeyR')reset();
});
addEventListener('keyup',e=>{if(!dragUI.capture(e,false))keys.delete(e.code);});
addEventListener('blur',()=>keys.clear());
renderer.domElement.tabIndex=0;
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
renderer.domElement.addEventListener('mousemove',e=>{
  if(!started||driving||comparisonView||dragUI.active()||!(e.buttons&2)||!e.movementX)return;
  if(!manualOrbit)orbit=walkCamera;
  orbit-=e.movementX*.0032;
  manualOrbit=true;
});
addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);invalidateFrame();
});
function slide(point,dx,dz,radius){
  if(!blocked(point.x+dx,point.z+dz,radius)){point.x+=dx;point.z+=dz;return true;}
  if(!blocked(point.x+dx,point.z,radius))point.x+=dx;
  if(!blocked(point.x,point.z+dz,radius))point.z+=dz;
  return false;
}
function carBlocked(x,z,angle){
  for(const offset of [-1.45,0,1.45]){
    const px=x+Math.sin(angle)*offset,pz=z+Math.cos(angle)*offset;
    if(!roadAccess.permitsCar(px,pz)||blocked(px,pz,.94))return true;
  }
  return false;
}
const pressed=(...codes)=>codes.some(code=>keys.has(code));
function easeAngle(current,target,response,maxRate,dt){
  const difference=Math.atan2(Math.sin(target-current),Math.cos(target-current));
  const step=difference*(1-Math.exp(-response*dt));
  return current+THREE.MathUtils.clamp(step,-maxRate*dt,maxRate*dt);
}
function update(dt){
  const forward=Number(pressed('KeyW','ArrowUp'))-Number(pressed('KeyS','ArrowDown'));
  const turn=Number(pressed('KeyA','ArrowLeft'))-Number(pressed('KeyD','ArrowRight'));
  const running=pressed('ShiftLeft','ShiftRight');
  let walkStride=0;
  if(driving){
    if(forward) speed+=forward*(forward*speed<0?21:Math.max(5.5,12-Math.abs(speed)*.135))*dt;
    else speed*=Math.exp(-.85*dt);
    if(pressed('Space'))speed*=Math.exp(-7.8*dt);
    speed=THREE.MathUtils.clamp(speed,-8,48.5);
    const steering=turn*Math.min(Math.abs(speed)/2.4,1)*Math.sign(speed)*1.05/(1+Math.abs(speed)*.028);
    const steps=Math.max(1,Math.ceil(Math.abs(speed)*dt/.34));
    for(let i=0;i<steps;i++){
      const angle=car.rotation.y+steering*dt/steps;
      const x=vehicle.x+Math.sin(angle)*speed*dt/steps,z=vehicle.z+Math.cos(angle)*speed*dt/steps;
      if(carBlocked(x,z,angle)){speed=0;break;}
      vehicle.set(x,0,z);car.rotation.y=angle;
    }
    for(const {pivot,axle,steering:front} of rollWheels[selectedCar]){
      pivot.rotation.y=front?turn*.35:0;axle.rotation.x+=speed*dt/.335;
    }
  }else{
    const input=forward*3+turn;
    if(input && input!==walkInput){
      // Lock the intended world direction for this input chord.
      walkHeading=(manualOrbit?orbit:walkCamera)+Math.atan2(turn,forward);
      manualOrbit=false;
    }
    walkInput=input;
    const goalSpeed=input?(running?6.1:2.9):0;
    const response=1-Math.exp(-dt*(input?8:12));
    walkVelocity.x+=(Math.sin(walkHeading)*goalSpeed-walkVelocity.x)*response;
    walkVelocity.z+=(Math.cos(walkHeading)*goalSpeed-walkVelocity.z)*response;
    if(!input && walkVelocity.lengthSq()<.0016)walkVelocity.set(0,0,0);
    if(input){
      hero.rotation.y=easeAngle(hero.rotation.y,walkHeading,10,running?2.95:2.55,dt);
    }
    const x=actor.x,z=actor.z;
    slide(actor,walkVelocity.x*dt,walkVelocity.z*dt,.32);
    walkStride=Math.hypot(actor.x-x,actor.z-z)/Math.max(dt,.0001);
    phase+=walkStride*dt*(running?2.15:2.85);
    const view=manualOrbit?orbit:hero.rotation.y;
    walkCamera=easeAngle(walkCamera,view,manualOrbit?9:4.2,manualOrbit?2.85:1.48,dt);
  }
  for(let i=0;i<2;i++){
    const amount=THREE.MathUtils.clamp(walkStride/(running?6.1:2.9),0,1);
    const swing=Math.sin(phase+i*Math.PI)*(running?.82:.52)*amount;
    legs[i].leg.rotation.x=swing;legs[i].knee.rotation.x=Math.max(0,-swing)*.63;arms[i].rotation.x=-swing*.72;
  }
  const activePilot=dragModels.pilots[selectedPilot-1];
  for(const p of dragModels.pilots)p.visible=p===activePilot&&!driving;
  activePilot.position.copy(actor);activePilot.position.y=.053+periodHeight(actor.x,actor.z);
  activePilot.rotation.y=hero.rotation.y;
  const rig=dragModels.rigs[selectedPilot-1];
  if(rig)for(let i=0;i<2;i++){
    rig.legs[i].rotation.x=legs[i].leg.rotation.x;rig.arms[i].rotation.x=arms[i].rotation.x;
  }
  for(const {object} of Object.values(parking)){
    object.visible=true;
    updatePassenger(object,selectedPilot,driving&&object===car&&selectedCar==='s2000');
    const seated=passengers.get(object)?.model;
    if(seated)seated.userData.seated=true;
  }
  car.position.copy(vehicle);car.position.y=.053+periodHeight(vehicle.x,vehicle.z);
  heroShadow.position.set(actor.x,.069+periodHeight(actor.x,actor.z),actor.z);heroShadow.visible=!driving;
  carShadow.position.set(vehicle.x,.068+periodHeight(vehicle.x,vehicle.z),vehicle.z);carShadow.rotation.z=car.rotation.y;
  marker.position.set(vehicle.x,2.07+Math.sin(gameTime*.003)*.12+periodHeight(vehicle.x,vehicle.z),vehicle.z);marker.visible=!completed;
  yaw=driving?car.rotation.y:walkCamera;
  const focus=driving?vehicle:actor,d=driving?7.8:4.55,y=driving?3.05:2.42;
  target.set(focus.x+Math.sin(yaw)*(driving?2.65:1.28),(driving?1.0:1.25)+periodHeight(focus.x,focus.z),focus.z+Math.cos(yaw)*(driving?2.65:1.28));
  let cameraDistance=d;
  for(let k=.6;k<=d;k+=.4){
    if(blocked(focus.x-Math.sin(yaw)*k,focus.z-Math.cos(yaw)*k,.12)){cameraDistance=Math.max(.35,k-.35);break;}
  }
  eye.set(focus.x-Math.sin(yaw)*cameraDistance,y+periodHeight(focus.x,focus.z),focus.z-Math.cos(yaw)*cameraDistance);
  camera.position.lerp(eye,1-Math.exp(-dt*13));camera.lookAt(target);
  if(notice>0)notice=Math.max(0,notice-dt);
  if(notice<0)notice=Math.min(0,notice+dt);
}
const mini=$('map'), ctx=mini.getContext('2d');
const mapBase=document.createElement('canvas');mapBase.width=mini.width;mapBase.height=mini.height;
const base=mapBase.getContext('2d');
const project=([x,z])=>[12+(x+1200)*.298,12+(z+520)*.298];
function line(c,points){
  points.forEach((p,i)=>{const [x,y]=project(p);if(i===0)c.moveTo(x,y);else c.lineTo(x,y);});
}
base.fillStyle='#27352e';base.fillRect(0,0,mini.width,mini.height);
base.fillStyle='#8ba095';base.font='21px system-ui';base.fillText('С',427,27);
base.strokeStyle='#52645a';base.lineWidth=1.4;
base.beginPath();for(const {a,b} of roadSegments)line(base,[a,b]);base.stroke();
base.strokeStyle='#dfad67';base.lineWidth=3.2;
base.beginPath();line(base,data.route);base.stroke();
for(const [distance,color] of [[0,'#9ce5a1'],[402,'#f2f0e3']]){
  const p=DragTrack.at(distance,-1),[x,y]=project([p.x,p.z]);
  base.fillStyle=color;
  base.beginPath();base.arc(x,y,5.4,0,Math.PI*2);base.fill();
  base.font='bold 14px system-ui';base.fillText(distance===0?'СТАРТ':'ФИНАЛ',x-18,y-9);
}
base.strokeStyle='#f0876c';base.lineWidth=2;
base.beginPath();
for(const {x,z,ux,uz,half} of roadAccess.gates){
  const width=Math.max(half,4.0);
  line(base,[[x-uz*width,z+ux*width],[x+uz*width,z-ux*width]]);
}
base.stroke();
function dot(p,color,r){
  const [x,y]=project(p);ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
}
function hud(){
  const focus=driving?vehicle:actor;
  ctx.drawImage(mapBase,0,0);dot(carSpot,'#f4bb6e',6);dot([focus.x,focus.z],'#faffef',5);
  $('title').textContent=completed?'Свободно придвижване':'Паркираният автомобил';
  $('objective').textContent=completed?(notice>0?'Задачата е изпълнена.':'Следвай маршрута или разгледай улиците.'):'Намери колата в паркинга на КАТ.';
  $('mode').textContent=driving?'Автомобил':'Пеша';
  $('speed').textContent=driving?Math.round(Math.abs(speed)*3.6)+' км/ч':'';
  const near=!driving&&nearbyCar();
  const spec=near?DragCore.cars[near]:null;
  const msg=driving?(notice<0?exitMessage:''):spec?'Качи се':'';
  $('prompt').hidden=!started||!msg;
  if(msg)$('prompt').innerHTML=msg==='Качи се'?'<kbd>E</kbd> '+spec.name+' · '+spec.hp+' к.с. · '+spec.mass+' кг · '+spec.drive+' · '+spec.ratios.length+' пред.':msg;
}
const dragUI=createDragUI({getPilot:()=>selectedPilot,getCar:()=>selectedCar,applyCosmetics,invalidate:()=>{
  if(dragUI.active())comparisonView=null;
  invalidateFrame();
},onLeave:()=>{
  raceCars.forEach(slot=>{slot.visible=false;});
  marker.visible=!completed;
  camera.position.copy(driving?vehicle:actor);camera.position.y=2.6;
}});
let pendingFrame=null, previousFrame=null, needsFrame=true;
const frameInterval=1000/30;
function scheduleFrame(){
  if(!document.hidden&&pendingFrame===null)pendingFrame=requestAnimationFrame(frame);
}
function invalidateFrame(){needsFrame=true;scheduleFrame();}
function frame(now){
  pendingFrame=null;
  if(document.hidden)return;
  if(!started){renderMenu();return;}
  if(comparisonView&&!dragUI.active()){
    if(needsFrame){
      applyPeriodView(comparisonView);
      renderer.render(scene,camera);
      needsFrame=false;
    }
    previousFrame=null;
    return;
  }
  if(previousFrame!==null&&now-previousFrame<frameInterval-1){
    scheduleFrame();return;
  }
  const dt=previousFrame===null?1/30:Math.min(.075,(now-previousFrame)/1000);
  previousFrame=now;
  if(started)gameTime+=dt*1000;
  if(dragUI.active()){keys.clear();renderRace(dragUI.advance(dt),dt);}
  else {update(dt);hud();animateSignals(gameTime);}
  renderer.render(scene,camera);
  needsFrame=false;
  if(started)scheduleFrame();
}
document.addEventListener('visibilitychange',()=>{
  if(pendingFrame!==null)cancelAnimationFrame(pendingFrame);
  pendingFrame=null;previousFrame=null;keys.clear();
  if(!document.hidden)invalidateFrame();
});
scheduleFrame();

function applyPeriodView(view){
  const angle=THREE.MathUtils.degToRad(view.heading);
  const pitch=THREE.MathUtils.degToRad(view.pitch);
  camera.position.set(...view.position);
  camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(view.hfov)/2)/camera.aspect));
  camera.updateProjectionMatrix();
  camera.lookAt(camera.position.x+Math.sin(angle)*Math.cos(pitch),
    camera.position.y+Math.sin(pitch),camera.position.z-Math.cos(angle)*Math.cos(pitch));
}
