'use strict';

const periodViews = [
  ['01-kat', 'КАТ · №97',42.1867299,24.3502078,187.30,84.45],
  ['02-87', '№87 · павилион и блокове',42.1867662,24.3490878,193.88,88.37],
  ['03-79', '№79 · северни блокове',42.186796,24.3487245,356.94,83.67],
  ['04-signals', '№69 · светофари',42.1869506,24.3473706,284.60,88.59],
  ['05-shutich', '№69 · Мария Шутич',42.1870001,24.3469953,7.90,83.90],
  ['06-market-west', '№69 · западен вход на магазина',42.1870001,24.3469953,187.44,84.08],
  ['07-65', '№65 · розовата къща',42.1870924,24.3462009,11.96,88.91],
  ['08-market-east', '№63 · магазинът',42.1871438,24.3457738,192.63,83.65],
  ['09-63', '№63 · сивият блок',42.1871438,24.3457738,9.69,87.67],
  ['10-centre-sign', '№49 · табела Център',42.1873339,24.3441683,10.33,88.36],
  ['11-49-south', '№49 · южни блокове',42.1873339,24.3441683,188.39,86.32],
  ['12-approach', '№39 · подход към Мария Луиза',42.1874489,24.3434555,267.70,82.72],
  ['13-corner', '№39 · ъгловата сграда',42.1875661,24.3429858,228.22,88.22],
  ['14-skate', 'Скейт парк · Димчо Дебелянов',42.1872775,24.3437789,193.33,90.10],
  ['15-37', '№37 · розовият блок',42.1877965,24.3424522,27.96,91.52],
  ['16-billboard', 'Билборд при №25',42.1886039,24.3409512,291.52,81.72],
  ['17-directions', 'Център · София · Панагюрище',42.1881464,24.341811,343.46,86.03],
  ['18-pharmacy', 'Аптека при №25',42.1888281,24.3404793,218.89,86.59],
  ['19-bank', 'Остъклена фасада при №20',42.1889251,24.3402707,223.60,91.46],
].map(([file,name,lat,lon,heading,tilt])=>{
  const x=(lon-24.3502)*82415, z=(42.18663-lat)*111110;
  return {file,name,position:[x,2.35+periodHeight(x),z],heading,pitch:90-tilt,hfov:75};
});

function periodHeight(x) {
  // A shallow estimated grade keeps road, terrain and model bases aligned.
  return x*.00165;
}

function apartmentBlock(p,{floors,color,bays,tower=false,profile=0,front=1,patches=[]},kit){
  const {box,roof,footprint,glassColor}=kit;
  footprint(p);
  const plinth=2.75, storey=2.79, h=plinth+floors*storey;
  roof(p,h+.11);
  const winding=p.reduce((sum,[x,z],i)=>{
    const [u,v]=p[(i+1)%p.length];
    return sum+x*v-u*z;
  },0)>0?1:-1;
  const panelTints=[0,0x070806,0x110f0a,0x000304,0x100e09];
  for(let side=0;side<p.length;side++){
    const [x,z]=p[side], [u,v]=p[(side+1)%p.length];
    const length=Math.hypot(u-x,v-z), dx=(u-x)/length, dz=(v-z)/length;
    const nx=winding*dz,nz=-winding*dx,yaw=-Math.atan2(dz,dx);
    const counts=length>16?Math.max(bays,Math.round(length/3.1)):bays;
    const width=length/counts;
    const frontage=nz*front>.48;
    function part(t,y,d,w,height,depth,tint){
      box(tint,x+dx*t+nx*d,y,z+dz*t+nz*d,w,height,depth,yaw);
    }
    part(length*.5,h/2,-.27,length+.10,h,.28,0x8f8673);
    part(length*.5,h+.18,-.02,length+.15,.48,.32,0xa89d84);
    part(length*.5,.17,.035,length,.34,.14,0x766f62);
    for(let bay=0;bay<counts;bay++){
      const t=(bay+.5)*width;
      const pier=(bay%3===1&&frontage)?0xc1ab7d:color;
      const door=bay===Math.floor(counts/2);
      part(t,.43,-.04,width-.022,.50,.22,0xa79c80);
      part(t,2.51,.02,width-.018,.47,.24,pier);
      part(t,1.44,-.08,width*.73,1.93,.10,door?0x656458:0x535950);
      if(door){
        part(t,2.40,.25,width*.78,.18,.68,0xbfb39a);
        part(t-.08,.12,.31,width*.79,.24,.75,0x9b9281);
      }else{
        part(t,1.45,-.015,width*.65,1.83,.05,frontage&&bay%2===0?0x918a71:glassColor);
      }
      for(let row=0;row<floors;row++){
        const y=plinth+row*storey;
        const variation=(row*3+bay*7+side*2)%5;
        const remodel=frontage && patches.find(([first,last,lo,hi])=>bay>=first&&bay<=last&&row>=lo&&row<=hi);
        const tint=remodel?remodel[4]:pier-panelTints[variation];
        const relief=remodel?.10:0;
        const balcony=(frontage||(profile===2&&Math.abs(nx)>.7&&length>10))&&(tower?(bay===1||bay===counts-1):profile!==3&&bay%3===profile%3);
        const open=balcony&&(row+bay*2)%5!==0;
        const glazing=balcony&&!open;
        const aperture=Math.min(width-.36,balcony?width*.88:width*.69);
        const sill=balcony?.22:.92, opening=balcony?2.01:1.29;
        part(t,y+sill/2,.025+relief,width-.032,sill-.026,.18,tint);
        part(t,y+(sill+opening+storey)/2,.025+relief,width-.032,storey-sill-opening-.032,.18,tint);
        for(const direction of [-1,1]){
          part(t+direction*(width+aperture)/4,y+sill+opening/2,.025+relief,(width-aperture)/2-.012,opening,.18,tint);
        }
        part(t,y+sill+opening/2,-.09,aperture,opening,.055,0x686456);
        const jamb=remodel||variation!==2?0xe2e2d9:0x756756;
        part(t,y+sill+opening/2,-.045,aperture-.12,opening-.13,.04,balcony?0x77766a:glassColor);
        for(const direction of [-1,1]){
          part(t+direction*(aperture-.06)/2,y+sill+opening/2,-.012,.075,opening,.056,jamb);
          part(t,y+sill+opening/2+direction*(opening-.065)/2,-.012,aperture,.066,.056,jamb);
        }
        part(t,y+sill+opening/2,-.011,.054,opening-.08,.065,jamb);
        if(!balcony){
          part(t,y+sill-.029,.065,aperture+.16,.075,.26,0xafaa91);
        }else{
          const depth=tower?.86:1.03;
          part(t,y+.095,depth*.5,aperture+.21,.19,depth+.13,0xaaa18a);
          part(t,y+.91,depth,aperture+.20,.1,.09,0xb0ab97);
          for(const j of [-1,1]){
            part(t+j*(aperture+.12)/2,y+.54,depth*.51,.088,.69,depth,0x8d8573);
          }
          part(t,y+.45,depth,aperture+.11,.53,.11,variation===2?0x878b76:0x9d947d);
          if(glazing){
            part(t,y+1.32,depth-.028,aperture,1.42,.065,0x677772);
            for(const offset of [-.33,0,.33]){
              part(t+offset*aperture,y+1.34,depth+.022,.053,1.45,.075,jamb);
            }
          }else{
            for(const offset of [-.35,-.17,0,.17,.35]){
              part(t+offset*aperture,y+.74,depth,.027,.31,.044,0x7c7a6b);
            }
          }
        }
        if(frontage && (row*7+bay*11+profile*3)%9<3){
          const at=t+width*.24;
          const level=y+(balcony?.63:.56);
          part(at,level,balcony?.99:.24,.67,.41,.31,0xe1ddd1);
          part(at-.104,level,balcony?1.155:.405,.30,.27,.016,0x656c6b);
          for(let slot=0;slot<5;slot++)part(at+.145,level-.12+slot*.055,balcony?1.155:.405,.146,.012,.019,0x858983);
          part(at,level-.239,balcony?.98:.24,.54,.054,.40,0x85877f);
        }
        if(balcony&&(row*5+bay+profile)%7===1){
          const point=t+aperture*.30, dist=1.16;
          if(kit.dish)kit.dish(x+dx*point+nx*dist,y+1.10,z+dz*point+nz*dist,yaw);
        }
        if(tower&&frontage&&variation===3){
          part(t+width*.3,y+.49,.128,.11,.62,.029,0x989173);
          part(t+width*.32,y+.27,.131,.16,.25,.03,0xa39a7e);
        }
      }
    }
    if(frontage)part(length*.5,2.79,.13,length+.05,.12,.25,0xa09983);
  }
}

function periodStreet({roadSegments, edgeDistance, strip, surface, disc, box, types, addTree}){
  const {concrete,paint,asphalt,paving,verge}=types;
  const isNear=(x,z)=>x>-257&&x<30&&z>-75&&z<56;
  const curbColor=0xb6ac91, roadShoulder=0x7c796d;
  function open(x,z,own){
    return !roadSegments.some(s=>s!==own&&edgeDistance(x,z,s.a,s.b)<s.w/2+.18);
  }
  for(const own of roadSegments){
    const {a,b,w,name}=own;
    if(name!=='Пловдивска' || w<7)continue;
    const dx=b[0]-a[0],dz=b[1]-a[1], len=Math.hypot(dx,dz);
    const nx=dz/len,nz=-dx/len, yaw=-Math.atan2(dz,dx);
    for(const side of [-1,1]){
      for(let t=.12;t<len-.12;t+=2.2){
        const end=Math.min(t+2.16,len-.12);
        if(end-t<.12)continue;
        const point=(d,o)=>[a[0]+dx*d/len+side*nx*o,a[1]+dz*d/len+side*nz*o];
        const [x,z]=point((t+end)/2,w/2+.13);
        if(!isNear(x,z)||!open(x,z,own)||!open(...point((t+end)/2,w/2+.65),own))continue;
        const sidewalk=point((t+end)/2,w/2+1);
        box(curbColor,x,.074,z,end-t,.15,.18,yaw);
        const [edgeX,edgeZ]=point((t+end)/2,w/2-.12);
        box(roadShoulder,edgeX,.039,edgeZ,end-t,.027,.18,yaw);
        if(open(...sidewalk,own)){
          strip(paving,point(t,w/2+1.04),point(end,w/2+1.04),1.63,.098);
        }
      }
    }
  }
  surface(asphalt,[[5,28],[21,31],[32,55],[29,65],[9,65],[8,49]],.045);
  strip(paving,[7.4,34.0],[6.7,22.0],1.50,.095);
  surface(paving,[[-64,-24],[-21,-24],[-21,-18],[-64,-17]],.088);
  for(const [x,z] of [[-7.2,-6.7],[-10.5,19.0],[-7.2,-17.65]]){
    box(0x7b6244,x,2.65,z,.12,5.3,.13);
  }
  const wire=[[-48,5.39,8.1],[-28,4.9,6.9],[-6.6,5.3,5.55],[7,4.96,-5.9],[21,5.28,-17.5]];
  for(let i=1;i<wire.length;i++){
    const [x,y,z]=wire[i-1],[u,v,w]=wire[i];
    const len=Math.hypot(u-x,w-z);
    box(0x555343,(x+u)*.5,(y+v)*.5,(z+w)*.5,len,.020,.022,-Math.atan2(w-z,u-x));
  }
  surface(verge,[[-15,5],[-11,6],[-12,23],[-22,27],[-25,17]],.012);
  surface(verge,[[-1,-16],[4,-16],[16,-22],[22,-20],[25,-15]],.017);
  strip(paving,[-4.95,4.05],[-4.8,10.7],2.35,.097);
  strip(paving,[-4.98,-12.35],[-4.7,-20],2.35,.097);
  for(const [min,max] of [[-13,-5],[-.1,4.1]]){
    for(let z=min;z<=max;z+=.95)strip(paint,[-6.48,z],[-3.51,z],.54,.079);
  }
  for(const [x,z,size] of [[-23,15,1.94],[-26,21,2.1],[21,-19,2.2],[27,-24,2.06],[-87,-21,1.54],[-111,-23,1.51],[-220,13,2.01],[27,35,1.65]]){
    addTree(x,z,size);
  }
  // The fence, lamps and sign enclose the scene visually while leaving the drive open.
  for(let z=30;z<64;z+=3.1){
    box(0x8c8a79,-1.8,.68,z,.13,1.36,.13);
    box(0x756d5d,-1.8,.90,z+1.55,.047,.05,3.12);
    box(0x756d5d,-1.8,.43,z+1.55,.047,.05,3.12);
    for(let at=.25;at<3.0;at+=.36)box(0x7d7861,-1.8,.67,z+at,.04,1.12,.035);
  }
  for(const [x,z] of [[-9.1,3.6],[-49,7.1],[-99,4.4],[-149,1.25],[-203,-3.4],[-246,-5.8]]){
    box(0x827f6f,x,3.12,z,.19,6.24,.17);
    box(0x817e70,x,6.18,z-.56,.105,.075,1.35);
    box(0x625f54,x,6.12,z-1.23,.28,.13,.45);
  }
  for(const [x,z] of [[-6.9,-16.8],[-2.6,-17.2],[-9.3,-16.9],[-12.0,-17.2]]){
    box(0xc5b69b,x,.18,z,.17,.36,.17);
    box(0xa36a50,x,.29,z,.173,.12,.173);
  }
  disc(concrete,[-9.2,3.85],.35,.094);
}
