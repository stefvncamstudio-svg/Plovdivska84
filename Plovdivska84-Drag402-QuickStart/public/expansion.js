'use strict';

// Local metres inferred from the marked view, beyond the playable KAT forecourt.
const closedLot={left:10,right:80,near:76,far:153};
const inClosedLot=([x,z])=>x>closedLot.left&&x<closedLot.right&&z>closedLot.near&&z<closedLot.far;

function openRoadPieces(a,b){
  const dx=b[0]-a[0],dz=b[1]-a[1], cuts=[0,1];
  for(const x of [closedLot.left,closedLot.right]){
    const t=(x-a[0])/dx, z=a[1]+dz*t;
    if(t>0&&t<1&&z>=closedLot.near&&z<=closedLot.far)cuts.push(t);
  }
  for(const z of [closedLot.near,closedLot.far]){
    const t=(z-a[1])/dz, x=a[0]+dx*t;
    if(t>0&&t<1&&x>=closedLot.left&&x<=closedLot.right)cuts.push(t);
  }
  cuts.sort((x,y)=>x-y);
  const point=t=>[a[0]+dx*t,a[1]+dz*t];
  return cuts.slice(1).flatMap((t,i)=>{
    const from=cuts[i];
    return t-from>1e-7&&!inClosedLot(point((from+t)/2))?[[point(from),point(t)]]:[];
  });
}

function buildSkatePark({surface,strip,paving,material,box,mesh,collider,tree}){
  const red=material(0xa96253), concrete=material(0xc2bdab,{side:THREE.DoubleSide});
  const park=[[-553,-49],[-516,-47],[-519,-25],[-552,-27]];
  surface(red,park,.047);
  strip(paving,[-539,-58],[-539,-47],3.2,.092);
  strip(paving,[-553,-49],[-516,-47],2.7,.092);
  const rail=0x985e43;
  for(const [a,b] of [[park[0],[-541,-48.35]],[[-537,-48.14],park[1]],[park[1],park[2]],[park[2],park[3]]]){
    const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),yaw=-Math.atan2(dz,dx);
    for(const y of [.22,1.08])box(rail,(a[0]+b[0])/2,y,(a[1]+b[1])/2,l,.049,.047,yaw);
    for(let t=.15;t<l;t+=.43)box(rail,a[0]+dx*t/l,.64,a[1]+dz*t/l,.043,1.02,.045,yaw);
    const nx=dz/l*.12,nz=-dx/l*.12;
    collider([[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]]);
  }
  function ramp(x,z,width,length,height,reverse){
    const vertices=[];
    function point(t,side){
      const px=x+side*width/2;
      return [px,.06+periodHeight(px)+height*t*t,z+t*length*reverse];
    }
    for(let i=0;i<10;i++){
      const a=point(i/10,-1),b=point(i/10,1),c=point((i+1)/10,1),d=point((i+1)/10,-1);
      vertices.push(...a,...b,...c,...a,...c,...d);
      for(const [low,high] of [[a,d],[b,c]]){
        const lower=[low[0],.05+periodHeight(low[0]),low[2]],upper=[high[0],.05+periodHeight(high[0]),high[2]];
        vertices.push(...low,...lower,...upper,...low,...upper,...high);
      }
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();
    mesh(g,concrete);
    const end=z+length*reverse;
    box(0x555c5b,x,height+.055,end,width+.12,.075,.09);
    collider([[x-width/2,z],[x+width/2,z],[x+width/2,end],[x-width/2,end]]);
  }
  ramp(-545,-34,6,4.5,1.55,1);
  ramp(-528,-33,6,4.8,1.75,1);
  ramp(-528,-39,6,4.3,1.42,-1);
  box(0x85877e,-537,.32,-37,3.2,.54,1.75);
  collider([[-538.6,-37.88],[-535.4,-37.88],[-535.4,-36.12],[-538.6,-36.12]]);
  for(const z of [-41.5,-30.4]){
    box(0x707975,-542,.58,z,3.5,.065,.07);
    for(const x of [-543.35,-540.65])box(0x707975,x,.31,z,.071,.58,.069);
  }
  tree(-556,-37,3.05);
  tree(-514,-43,2.78);
}

function buildLotBarrier({box,canvas,label,collider}){
  const {left,right,near,far}=closedLot;
  collider([[left,near],[right,near],[right,far],[left,far]]);
  for(const [a,b] of [[[left,near],[right,near]],[[right,near],[right,far]],
    [[right,far],[left,far]],[[left,far],[left,near]]]){
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    const yaw=-Math.atan2(dz,dx);
    const count=Math.ceil(length/3.1), width=length/count;
    for(let i=0;i<count;i++){
      const x=a[0]+dx*(i+.5)/count,z=a[1]+dz*(i+.5)/count;
      box(0x969488,x,1.38,z,width-.025,2.76,.28,yaw);
      box(0xb8b4a5,x,2.77,z,width-.021,.09,.29,yaw);
      box(0x77786c,x,.19,z,width-.022,.36,.39,yaw);
      label(canvas(i%9),x+dz/length*.153,1.56,z-dx/length*.153,yaw+Math.PI,width-.09,2.18);
    }
  }
}

function sprayPanel(index){
  const c=document.createElement('canvas');c.width=512;c.height=320;
  const ctx=c.getContext('2d');
  let state=Math.imul(index+71,2654435761)>>>0;
  const rnd=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const colors=[['#f76ab3','#34ce99','#fff09c'],['#f68c58','#69bafb','#eaf9bd'],
    ['#af86f2','#36d6ca','#fbc85a'],['#e96f99','#c9df5b','#68cee4']];
  const [hot,cool,highlight]=colors[index%colors.length];
  ctx.fillStyle=index<9?'#a6a296':'#242533';ctx.fillRect(0,0,512,320);
  for(let i=0;i<1140;i++){
    const x=rnd()*512,y=rnd()*320;
    ctx.fillStyle=i%3===0?hot+'69':i%3===1?cool+'69':'#221c2731';
    const size=1+Math.pow(rnd(),5)*8;ctx.fillRect(x,y,size,size);
  }
  ctx.lineJoin='round';ctx.lineCap='round';
  const wash=ctx.createLinearGradient(0,65,0,247);
  wash.addColorStop(0,hot);wash.addColorStop(.38,hot);
  wash.addColorStop(.55,highlight);wash.addColorStop(.74,cool);
  wash.addColorStop(1,'#167061');
  const shapes=[
    [[30,149],[78,69],[181,61],[221,87],[188,125],[157,103],[112,128],[138,145],[217,133],[239,164],[206,189],[164,181],[125,220],[52,226],[85,188],[58,176],[22,179]],
    [[151,110],[230,54],[253,68],[235,109],[301,81],[334,98],[376,69],[405,86],[361,144],[313,146],[283,201],[245,185],[261,154],[231,157],[213,211],[179,237],[192,189],[146,177],[178,146]],
    [[274,155],[332,182],[360,153],[395,174],[445,104],[479,101],[467,146],[506,154],[471,188],[443,182],[424,213],[460,219],[444,251],[355,246],[328,217],[297,225],[268,247],[241,226]],
  ];
  function outline(points){
    ctx.beginPath();ctx.moveTo(...points[0]);
    for(const point of points.slice(1))ctx.lineTo(...point);
    ctx.closePath();
  }
  const tilt=(index%5-2)*.034;
  ctx.save();ctx.translate(256,160);ctx.rotate(tilt);
  if(index%3===1)ctx.scale(-1,1);
  ctx.translate(-256,-160);
  for(const [n,shape] of shapes.entries()){
    const offset=(rnd()-.5)*22;
    const points=shape.map(([x,y])=>[x,y+offset]);
    outline(points.map(([x,y])=>[x+12,y+16]));
    ctx.fillStyle='#211c2a';ctx.fill();ctx.strokeStyle='#231a2b';ctx.lineWidth=17;ctx.stroke();
    outline(points);
    ctx.strokeStyle='#252031';ctx.lineWidth=17;ctx.stroke();
    ctx.strokeStyle=cool;ctx.lineWidth=8;ctx.stroke();
    ctx.fillStyle=wash;ctx.fill();
    ctx.beginPath();ctx.moveTo(points[0][0]+14,points[0][1]-1);
    for(const [x,y] of points.slice(1,4))ctx.lineTo(x+1,y+8);
    ctx.lineWidth=3;ctx.strokeStyle='#fff6dbb8';ctx.stroke();
    for(let j=0;j<3;j++){
      const x=119+n*113+j*11,y=232+rnd()*20;
      ctx.fillStyle=hot;ctx.fillRect(x,y,2,12+rnd()*12);
    }
  }
  ctx.restore();
  for(let k=0;k<38;k++){
    const x=rnd()*512,y=rnd()*320;
    if(x>54&&x<456&&y>65&&y<249)continue;
    ctx.beginPath();ctx.arc(x,y,1+rnd()*6,0,Math.PI*2);ctx.fillStyle=k%2?hot:cool;ctx.fill();
  }
  return c;
}
