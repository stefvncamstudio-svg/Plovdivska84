'use strict';

const blockDesigns = {
  204:[8,0x9d9789,1,-1],205:[8,0xa09988,2,-1],206:[8,0xa29885,2,-1],207:[8,0x999183,1,-1],
  215:[14,0xa49d90,2,-1],216:[8,0xb77335,2,1],217:[8,0xad743f,2,1],218:[8,0xc18040,2,1],
  219:[8,0xae7037,2,1],220:[8,0xad7543,2,1],228:[11,0xb7aa93,1,1],229:[12,0xb6a27f,1,1],
  230:[8,0xb87536,2,1],231:[8,0xb87536,2,1],232:[6,0x8f8b78,1,1],
  476:[8,0xc47e36,2,-1],477:[8,0xb87936,2,-1],478:[8,0xbe7a3e,2,-1],
  479:[8,0xc38b49,2,-1],480:[8,0xc38941,2,-1],481:[8,0xc08a49,2,-1],
};
const facadePatches={
  204:[[0,2,0,2,0xbcb7aa],[5,7,3,4,0xc4cbc0],[8,10,1,3,0xb99480]],
  216:[[1,3,0,2,0xd1c7ad],[4,6,2,3,0xd5cbbb],[7,9,3,5,0xd1c6ac]],
  217:[[0,4,0,2,0xaaa195],[6,8,3,3,0xe0d6c1],[9,10,1,2,0xc4baa5]],
  230:[[0,2,0,0,0xb8b8aa],[4,5,0,0,0xc8c6b9],[6,7,1,1,0xa4a296]],
  231:[[1,3,2,5,0xc3c8c5],[5,6,1,2,0xd5cbb9],[10,11,0,3,0xb9c3c0]],
  232:[[0,2,0,0,0xb8b8aa],[4,5,0,0,0xd0cbbe],[6,7,1,1,0xa4a296]],
  479:[[0,2,1,5,0xdfdcd0],[4,6,0,3,0xd1cbc0],[8,9,1,6,0xcfd0c8]],
};

function modernRoad(kit){
  const {box,strip,surface,paint,asphalt,paving,roadSegments,edgeDistance,plant}=kit;
  const white=paint, yellow=kit.yellow;
  const offset=(p,dx,dz)=>[p[0]+dx,p[1]+dz];
  function bar(x,z,a,width,depth,mat=white){
    const dx=Math.cos(a)*width/2,dz=Math.sin(a)*width/2;
    strip(mat,[x-dx,z-dz],[x+dx,z+dz],depth,.078);
  }
  function crossing(x,z,a,width,count=8,mat=white,dashed=false){
    for(let i=0;i<count;i++){
      const d=((i+.5)/count-.5)*width;
      bar(x+Math.cos(a)*d,z+Math.sin(a)*d,a,(width/count)*.58,dashed?.40:2.55,mat);
    }
  }
  function arrow(x,z,heading,turn=0,mat=white){
    const a=heading*Math.PI/180, f=[Math.sin(a),-Math.cos(a)], r=[Math.cos(a),Math.sin(a)];
    const shape=turn
      ?[[-.13,-2], [.13,-2],[.13,.55],[turn*.68,1.11],[turn*.44,1.32],[turn*1.19,1.65],[turn*1.18,.82],[turn*.90,.93],[-.13,.59]]
      :[[-.13,-2],[.13,-2],[.13,1],[.43,1],[0,2],[-.43,1],[-.13,1]];
    surface(mat,shape.map(([u,v])=>[x+r[0]*u+f[0]*v,z+r[1]*u+f[1]*v]),.078);
  }
  // Northern roadside panels follow the mapped carriageway, with breaks at the photographed junction mouths.
  const runs=[[-741,-617],[-594,-508],[-482,-377],[-361,-283],[-244,-151],[-144,-74]];
  const blue=0x1763b6, gold=0xe0a939;
  function fence(a,b){
    const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz), yaw=-Math.atan2(dz,dx);
    if(len<.7)return;
    const n=Math.round(len/2.15), span=len/n;
    const pt=s=>[a[0]+dx*s/len,a[1]+dz*s/len];
    for(let i=0;i<n;i++){
      const [cx,cz]=pt((i+.5)*span);
      for(const y of [.13,.94])box(blue,cx,y,cz,span-.085,.037,.043,yaw);
      for(let j=1;j<=10;j++){
        const [x,z]=pt((i+j/11)*span);
        box(gold,x,.535,z,.018,.78,.023,yaw);
      }
      const [x,z]=pt(i*span);
      box(blue,x,.51,z,.053,1.02,.057,yaw);
    }
    box(blue,b[0],.51,b[1],.053,1.02,.057,yaw);
  }
  fence([-508,-88.3],[-482,-83.6]);
  for(const {a,b,w,name,id} of roadSegments){
    if(name!=='Пловдивска'||!['1572264596','1572264597','160101363','1572270580','1572270579','1572270577','1572270578','1572270576'].includes(id))continue;
    const offsetZ=-w/2-.64;
    for(const [from,to] of runs){
      const lo=Math.max(from,Math.min(a[0],b[0])), hi=Math.min(to,Math.max(a[0],b[0]));
      if(hi-lo<.9)continue;
      const at=x=>[x,a[1]+(x-a[0])/(b[0]-a[0])*(b[1]-a[1])+offsetZ];
      fence(at(lo),at(hi));
    }
  }
  for(const [x,z,a,w,n,dashed] of [
    [-250.74,-38.87,1.73,9,9,true],[-252.54,-27.07,1.73,9,9,true],
    [-276.47,-43.17,1.73,6,7,true],[-278.41,-31.67,1.73,9,8,true],
    [-262.65,-48.71,.14,6,7,true],[-263.18,-22.82,.14,7,8,true],
    [-541.93,-88.67,1.73,6,7,false],[-552.02,-77.57,1.73,9,9,false],
    [-527.09,-63.99,1.73,9,8,false],[-498.88,-59.41,.02,8,8,false],
    [-507.55,-60.81,.10,8,8,false],[-604.1,-92.5,.49,10,10,false],
    [-7.16,-12.2,1.57,9,9,false],[-7.3,0.01,1.57,9,9,false],
    [0.40,5.25,.03,5.8,7,false],[-369.08,-37.36,1.73,7.1,7,true],
  ])crossing(x,z,a,w,n,x===-369.08?yellow:white,dashed);
  for(const [x,z,heading,width] of [[-246.9,-38,279,8.8],[-282.2,-32.4,99,8.7],[-262.8,-53.6,177,5.8],[-263.1,-18.6,0,6.0]]){
    const a=heading*Math.PI/180;
    bar(x,z,a,width,.38);
  }
  function lanes(a,b,width){
    const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);
    for(const n of [-width/6,width/6]){
      const x=-dz/l*n,z=dx/l*n;
      strip(white,offset(a,x,z),offset(b,x,z),.13,.077);
    }
  }
  lanes([-211,-32.2],[-245,-37.9],9);
  lanes([-305,-36.2],[-284,-32.6],9);
  lanes([-560,-92.3],[-588,-100.1],6);
  for(const [x,z,h,t] of [[-227,-32.0,279,-1],[-227,-35.1,279,0],[-227,-38.0,279,1],
    [-239,-33.9,279,-1],[-239,-37,279,0],[-239,-40,279,1],
    [-555,-90,281,-1],[-555,-94,281,0],[-570,-94,285,-1],[-570,-98,285,0],
    [-300,-14,174,-1],[-295,-15,174,0],[-266,-10,175,-1],[-258,-10,175,1]])arrow(x,z,h,t,x>-310&&z>-20?yellow:white);
  const lot=[[-382,-10],[-281,-10],[-246,1],[-249,46],[-384,47]];
  surface(asphalt,lot,.032);
  for(const z of [0,8,21])for(let x=-375;x<-281;x+=2.8)bar(x,z,Math.PI/2,4.0,.105,white);
  for(let x=-565;x<-40;x+=3.4){
    const roads=roadSegments.filter(({a,b,name})=>name==='Пловдивска'&&x>Math.min(a[0],b[0])&&x<Math.max(a[0],b[0]));
    const points=roads.map(({a,b})=>a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]));
    if(points.length!==2||Math.abs(points[0]-points[1])<10.8)continue;
    const z=(points[0]+points[1])/2;
    for(let j=0;j<5;j++)box(j%2?0xccb9eb:0xeae0d1,x+j*.42,.15,z+Math.sin(j*1.9)*.35,.20,.125,.19);
  }
  for(const [x,z,s] of [[-89,-20,2.9],[-127,16,3.1],[-174,-49,2.6],[-211,-51,2.7],[-318,-59,2.5],[-352,-58,3],[-465,-80,3.1],[-510,-95,3.3],[-487,-95,3.2],[-498,-130,3.0],[-521,-102,2.7],[-544,-107,3.1],[-565,-114,3],[-595,-125,3.2],[-628,-143,3.1],[-640,-111,3.2]]){
    if(!roadSegments.some(r=>edgeDistance(x,z,r.a,r.b)<r.w/2+1.2))plant(x,z,s);
  }
  strip(paving,[-275,-50],[-272,-84],1.7,.091);
  for(const [x,z] of [[-272,-3.6],[-254,-4.5],[-375,-6],[-360,-7]]){
    box(0xbb392f,x,.55,z,.22,1.1,.25);
    for(let i=0;i<8;i++)box(i%2?0xc63b33:0xe2dfd2,x+(i-3.5)*.10,.92+(i+.5)*.36,z,.15,.40,.078);
  }
}

function modernLandmarks(kit){
  const {building,box,roof,footprint,surface,asphalt,paving}=kit;
  const rectangle=(a,b,c,d)=>[[a,c],[b,c],[b,d],[a,d]];
  const shop=kit.market;
  footprint(shop);
  roof(shop,7.15);
  for(let i=0;i<shop.length;i++){
    const [x,z]=shop[i],[u,v]=shop[(i+1)%shop.length];
    const length=Math.hypot(u-x,v-z),yaw=-Math.atan2(v-z,u-x);
    const cx=(x+u)/2,cz=(z+v)/2;
    box(0x9da8ad,cx,3.46,cz,length+.1,6.92,.34,yaw);
    box(0x49545b,cx,6.86,cz,length+.14,.5,.45,yaw);
    if(length>30){
      for(let j=2;j<length-1;j+=4){
        box(0x818d94,x+(u-x)*j/length,3.55,z+(v-z)*j/length,.034,6.6,.39,yaw);
      }
    }
  }
  // Glazed entrance on the north side and projecting canopy.
  box(0x435054,-320,2.15,10.44,30,4.3,.56,.03);
  for(let x=-333;x<=-306;x+=2.5){
    box(0x799599,x,1.61,10.08,2.33,2.79,.11);
    box(0xd2d6d2,x-1.20,1.61,10.02,.075,2.94,.16);
  }
  box(0x3e464b,-320,4.31,8.67,35,.54,3.1);
  for(const x of [-336,-304])box(0x575e60,x,2.05,7.6,.21,4.1,.21);

  building(rectangle(-103,-74,15,27),4.7,'retail',3);
  for(let x=-100;x<-75;x+=3.52){
    box(0x586c70,x,2.28,14.88,2.66,2.46,.23);
    // Segment an arch and the curved lower apron in relief around each window.
    for(let i=0;i<11;i++){
      const a=Math.PI*(i+.5)/11;
      const u=Math.cos(a)*1.42, v=Math.sin(a)*.82;
      box(0xc1b893,x+u,3.02+v,14.64,.31,.31,.37);
      box(0xb6aa82,x+u,.67-v*.49,14.69,.34,.24,.34);
    }
    for(const k of [-1.42,1.42]) box(0xc2b798,x+k,1.94,14.64,.28,2.48,.38);
  }

  const corner=kit.corner;
  if(corner){
    building(corner,14.4,'apartments',3);
    // Cream frontage with orange piers, a glazed corner and terracotta balconies.
    const [a,b]=corner;
    const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
    if(len>2){
      const yaw=-Math.atan2(dz,dx);
      for(let j=0;j<Math.max(1,Math.floor(len/2));j++){
        const t=(j+.5)/Math.max(1,Math.floor(len/2));
        const x=a[0]+dx*t,z=a[1]+dz*t;
        box(0xba6651,x,5,z,.36,9.85,.42,yaw);
        for(let y=3.4;y<13.8;y+=2.8){
          box(0xc07558,x+.2,y,z-.28,1.66,.29,1.08,yaw);
          box(0xbfc8bf,x+.2,y+.47,z-.78,1.64,.43,.065,yaw);
        }
      }
    }
  }
  building(rectangle(-20,-7,-42,-23),14.8,'commercial',4);
  box(0x414a4e,-13.5,14.88,-34.0,10,.45,12);
  for(let y=1.65;y<14;y+=2.8){
    for(let x=-18.3;x<-7;x+=2.64) box(y<2?0x46565a:0x677b84,x,y,-22.82,2.05,1.36,.14);
  }
  building(rectangle(-28,-8,18,26),3.6,'retail',2);
  building(rectangle(14,29,12,18),2.9,'commercial',1);
  box(0x8f443c,16.5,2.83,13.0,17,.17,.19);
  building(rectangle(-249,-231,-10,4),3.35,'house',7);
}

function modernSigns(kit){
  const {box,label,scene,material,modelPart}=kit;
  const dark=material(0x292c2b);
  const display=(lines,w,h,x,y,z,heading,bg,fg)=>{
    const mesh=label(lines,w,h,bg,fg);
    mesh.position.set(x,y+periodHeight(x),z);
    mesh.rotation.y=heading*Math.PI/180;
    scene.add(mesh);
    return mesh;
  };
  // Behind the north roadside fence, facing the street.
  display('← Център\nCentre',2.7,.94,-501.3,1.91,-90.0,0,'#efeee0','#222927');
  for(const x of [-502.04,-500.57])box(0x777d76,x,.97,-90.07,.057,1.94,.067);
  const fakeMark='К';
  for(const [x,z,h,heading,main] of [[-273,-3.8,7.45,168,false],[-366,-5.7,7.1,178,false],[-320,8.15,5.33,180,true]]){
    if(!main){
      for(const side of [-1,1])box(0x444b4c,x+side*.83,h*.48,z,.14,h,.20,heading*Math.PI/180);
    }
    display(fakeMark,main?3.4:2.10,main?1.43:2.00,x,h,z,heading,'#244653','#f5c45b');
    if(!main)display('МАРКЕТ',1.92,.39,x,h-1.22,z-.012,heading,'#244653','#f7efe2');
  }
  display('КАТ',2.0,.64,-7.18,2.34,-6.52,196,'#c3a850','#34455c');
  display('КАТ',2.0,.64,-7.18,2.34,-6.49,16,'#c3a850','#34455c');
  const states=[];
  function signal(x,z,heading,reach,axis){
    const angle=heading*Math.PI/180;
    const fx=Math.sin(angle),fz=Math.cos(angle),rx=Math.cos(angle),rz=-Math.sin(angle);
    box(0x343b3b,x,2.85,z,.154,5.70,.154);
    const body=(dx,dy,dz)=>{
      const node=new THREE.Group();
      node.position.set(dx,dy+periodHeight(dx),dz);node.rotation.y=angle;scene.add(node);
      kit.modelBox(node,dark,0,0,0,.29,.89,.19);
      const lenses=[];
      for(let i=0;i<3;i++){
        const y=.27-i*.27;
        const lamp=new THREE.MeshBasicMaterial({color:0x252929});
        modelPart(node,new THREE.CircleGeometry(.089,20),lamp,0,y,.100);
        kit.modelBox(node,dark,0,y+.094,.136,.194,.052,.125);
        lenses.push(lamp);
      }
      states.push({lenses,axis});
    };
    if(reach){
      box(0x343b3b,x+rx*reach/2,5.15,z+rz*reach/2,Math.abs(reach),.105,.115,angle);
      body(x+rx*reach,5.26,z+rz*reach);
    }
    body(x+fx*.14,2.78,z+fz*.14);
  }
  // Alignment follows the four surveyed stop/crossing tags. Heads point back towards approaching traffic.
  signal(-249.2,-44.5,102,-4.8,0);
  signal(-249.2,-33.1,102,0,0);
  signal(-280.7,-26.1,282,-4.8,0);
  signal(-280.1,-37.0,282,0,0);
  signal(-258.4,-55.5,4,-3.2,1);
  signal(-268.0,-21.1,185,-3.1,1);
  return function updateSignals(t){
    const phase=(t/1000)%54;
    for(const {lenses,axis} of states){
      const go=axis===0?phase<25:phase>=30&&phase<51;
      const amber=axis===0?phase>=25&&phase<28:phase>=51;
      lenses[0].color.setHex(go||amber?0x462e2b:0xfc3321);
      lenses[1].color.setHex(amber?0xffae26:0x514728);
      lenses[2].color.setHex(go?0x32db73:0x243d33);
    }
  };
}
