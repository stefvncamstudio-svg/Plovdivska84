'use strict';

const mainRoadIds=new Set(["128154615", "157467264", "160017286", "160101363", "160812187", "1511636499", "1572192066", "1572192078", "1572192080", "1572264594", "1572264596", "1572264597", "1572264601", "1572264602", "1572264614", "1572264615", "1572270576", "1572270577", "1572270578", "1572270579", "1572270580"]);

function buildRoadAccess({roads,route,edgeDistance,box,collider}){
  const key=p=>p.join(',');
  const edgeKey=(a,b)=>[key(a),key(b)].sort().join('/');
  const routeEdges=new Set(route.slice(1).map((p,i)=>edgeKey(route[i],p)));
  const allowed=[], branches=new Map(), junctions=new Map();
  const turnarounds=new Set(['24843817','160017285']);
  for(const {a,b,w,name,id} of roads){
    const through=(name==='Пловдивска'&&mainRoadIds.has(id))||turnarounds.has(id)||routeEdges.has(edgeKey(a,b));
    if(through){
      allowed.push({a,b,w});
      junctions.set(key(a),a);junctions.set(key(b),b);
    }else{
      for(const [from,to] of [[a,b],[b,a]]){
        if(!branches.has(key(from)))branches.set(key(from),[]);
        branches.get(key(from)).push({to,w});
      }
    }
  }
  function clearance(x,z){
    let result=Infinity;
    for(const {a,b,w} of allowed){
      if(x<Math.min(a[0],b[0])-16||x>Math.max(a[0],b[0])+16||
         z<Math.min(a[1],b[1])-16||z>Math.max(a[1],b[1])+16)continue;
      result=Math.min(result,edgeDistance(x,z,a,b)-w/2);
    }
    return result;
  }
  const inForecourt=(x,z)=>x>-3&&x<32&&z>=35&&z<68;
  const gates=[];
  const visited=new Set();
  function trace(a,b,w,distance){
    const segment=edgeKey(a,b);
    if(visited.has(segment)||distance>65)return;
    visited.add(segment);
    const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
    if(len<.01)return;
    const ux=dx/len,uz=dz/len;
    for(let d=0;d<=len;d+=.40){
      const x=a[0]+ux*d,z=a[1]+uz*d;
      if(inForecourt(x,z))return;
      if(clearance(x,z)<4.4)continue;
      // Keep the entire barrier clear of through-lanes, including oblique intersections.
      const half=w/2+.16;
      const clear=[-half,0,half].every(o=>clearance(x+uz*o,z-ux*o)>1.75);
      if(!clear)continue;
      if(!gates.some(g=>Math.hypot(g.x-x,g.z-z)<4.1)){
        gates.push({x,z,ux,uz,half});
      }
      return;
    }
    if(junctions.has(key(b)))return;
    for(const next of branches.get(key(b))??[])trace(b,next.to,next.w,distance+len);
  }
  for(const point of junctions.values()){
    for(const {to,w} of branches.get(key(point))??[])trace(point,to,w,0);
  }
  for(const {x,z,ux,uz,half} of gates){
    const at=(l,d=0)=>[x+uz*l+ux*d,z-ux*l+uz*d];
    const yaw=Math.atan2(ux,uz);
    const panels=Math.ceil(half*2/2.4),width=half*2/panels;
    for(let i=0;i<panels;i++){
      const [px,pz]=at((i+.5)*width-half);
      box(0xa9a69b,px,.43,pz,width-.047,.86,.58,yaw);
      box(0xcecaba,px,.79,pz,width-.048,.18,.51,yaw);
      for(const face of [-1,1]){
        const [vx,vz]=at((i+.5)*width-half,.30*face);
        box(0xb95343,vx,.6,vz,width*.43,.158,.026,yaw);
        const [hx,hz]=at((i+.5)*width-half+width*.29,.30*face);
        box(0xe8dfc8,hx,.6,hz,width*.12,.158,.029,yaw);
      }
    }
    collider([at(-half,-.30),at(half,-.30),at(half,.30),at(-half,.30)]);
  }
  // Applies to vehicles only. Prevents going around barrier ends over grass,
  // while the surrounding city and the sidewalk gaps remain walkable.
  function permitsCar(x,z){
    if(inForecourt(x,z))return true;
    const shoulder=clearance(x,z);
    if(shoulder>5.5)return false;
    return shoulder<=1.75||!gates.some(g=>{
      const dx=x-g.x,dz=z-g.z;
      return Math.abs(dx*g.ux+dz*g.uz)<.57&&
        Math.abs(dx*g.uz-dz*g.ux)<g.half+5.5;
    });
  }
  return {gates,permitsCar};
}
