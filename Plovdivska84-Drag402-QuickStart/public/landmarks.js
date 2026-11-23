'use strict';

const katSigns=[];
function referenceBuildings({box,surface,roof,footprint,paving,buildings}){
  const rect=(x,z,w,d)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
  function buildingFrame(x,z,yaw){
    const co=Math.cos(yaw),si=Math.sin(yaw);
    const pt=(u,v)=>[x+u*co+v*si,z-u*si+v*co];
    return {
      part:(color,u,y,v,w,h,d)=>box(color,...[pt(u,v)[0],y,pt(u,v)[1]],w,h,d,yaw),
      sign:(text,u,y,v,w,h,bg,fg)=>{
        const [sx,sz]=pt(u,v);katSigns.push({text,x:sx,y,z:sz,w,h,yaw,bg,fg});
      },
      shape:(u,v,w,d)=>rect(u,v,w,d).map(p=>pt(...p)),
    };
  }
  function facade(frame,w,d,floors,color,{glass=false,balconies=false,base=2.8}={}){
    const {part,shape}=frame;
    const height=base+(floors-1)*2.72;
    const p=shape(0,0,w,d);footprint(p);
    part(color,0,height/2,0,w,height,d);
    part(0x77746d,0,.29,d/2,w,.58,.14);
    part(color,0,height+.10,0,w+.3,.2,d+.3);
    const count=Math.max(2,Math.round(w/(glass?1.65:2.8)));
    const span=w/count;
    for(let i=0;i<count;i++){
      const u=(i+.5)*span-w/2;
      for(let row=0;row<floors;row++){
        const y=row===0?1.45:base+(row-.5)*2.72;
        const width=span*(glass?.92:row===0?.87:.73),h=glass?2.52:row===0?2.06:1.37;
        part(glass?0x333c41:0xd0c7b6,u,y,d/2+.018,width+.12,h+.1,.105);
        part(glass?[0x53717d,0x405965,0x648492][(i+row*2)%3]:row===0?0x526564:0x6e8286,u,y,d/2+.077,width,h,.035);
        part(glass?0x32383d:0xcac4b1,u,y,d/2+.105,.045,h,.039);
        if(balconies&&row&&i%3===1){
          part(color,u,y-.74,d/2+.39,span+.08,.16,.88);
          part(0xa0a49d,u,y-.37,d/2+.81,span+.03,.43,.055);
        }
      }
    }
    return height;
  }
  function pitched(frame,w,d,height,rise){
    const {part}=frame;
    const layers=10;
    for(let i=0;i<layers;i++){
      const size=(1-i/layers)*d;
      part(i%2?0x895448:0x925c4e,0,height+rise*(i+.5)/layers,0,w+.4,rise/layers+.018,size+.44);
    }
  }
  // The service wing keeps its existing parcel. The long front looks across the forecourt.
  const kat=buildingFrame(-9,53,Math.PI/2);
  const {part,sign,shape}=kat;
  const body=shape(0,0,21,8);footprint(body);roof(body,6.75);
  part(0x8c8b84,0,3.35,0,21,6.7,8);
  part(0xa7aaa5,0,6.71,0,21.2,.18,8.22);
  for(let i=0;i<7;i++){
    const u=-9+i*3;
    part(0xc2c5be,u,4.58,4.03,2.84,2.04,.12);
    part(i%3===0?0x587686:0x496774,u,4.58,4.10,2.68,1.89,.054);
    part(0xbfc5c0,u,4.58,4.145,.07,1.89,.028);
    part(0xc1c6c2,u,5.01,4.145,2.68,.046,.023);
    part(0x41575d,u,1.42,4.045,i===1||i===5?2.25:1.9,1.91,.085);
    if(i%2===0)part(0xd7d9d1,u-.57,3.15,4.18,.58,.43,.37);
  }
  for(const u of [-5.8,5.8]){
    part(0xc9c7b8,u,2.57,4.67,6.4,.14,1.36);
    part(0x8d8d81,u,2.49,5.28,6.42,.083,.12);
    part(0xb6b5a9,u-2.76,1.24,5.21,.105,2.48,.11);
  }
  surface(paving,shape(0,5.13,22,2.45),.095);
  sign('kat-emblem',-6.1,6.10,4.12,1.21,1.10,'','');

  const bank=buildingFrame(-827,-236,.55);
  facade(bank,19,12,3,0xd0d1cc,{glass:true});
  bank.part(0xd3d2cb,-1.65,4.65,6.14,1.54,9.10,.42);
  bank.part(0x294381,0,8.12,6.22,19,.66,.32);
  bank.sign('Postbank',-4.6,8.12,6.42,4.18,.53,'#aa3b37','#fff2e3');
  const pharmacy=buildingFrame(-811,-220,.55);
  facade(pharmacy,7.1,4.6,1,0xe3e0d5);
  pharmacy.sign('АПТЕКА',0,2.60,2.44,6.6,.69,'#e4e6d9','#174780');
  pharmacy.sign('АПТЕКА',.2,1.94,2.38,2.1,.26,'#1d4e76','#ffffff');
  const kiosk=buildingFrame(-830,-275,Math.PI+.48);
  facade(kiosk,18,6,1,0xbcbcb0);
  kiosk.part(0xb4b8b3,0,2.94,0,18.55,.17,6.68);
  kiosk.sign('ЕЛЕКТРО',-4.7,2.67,3.10,6,.43,'#d9d8ca','#282a28');
  kiosk.sign('СПОРТ ТОТО',3.7,2.65,3.11,5.4,.5,'#34374f','#fff0d4');

  for(const [index,color,floors,rise] of [[469,0xc6886b,5,2.45],[470,0xbc8063,5,2.15],[471,0xd3c5aa,5,2.25],[472,0xbc7d5c,3,1.4],[473,0xa29681,2,1.05]]){
    const [p]=buildings[index];
    const xs=p.map(v=>v[0]), zs=p.map(v=>v[1]);
    const x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2;
    const frame=buildingFrame(x,z,2.58);
    const w=index===469?16:11,d=index===469?14:10;
    const h=facade(frame,w,d,floors,color,{balconies:true});
    pitched(frame,w,d,h,rise);
    if(index===469){
      for(const u of [-6.9,6.9]){
        frame.part(0xc88c70,u,(h+2.32)/2,d/2-.35,2.05,h+2.32,3.05);
        for(let y=3.5;y<h+1;y+=2.65)frame.part(0x658692,u,y,d/2+1.19,1.69,1.35,.08);
      }
      frame.sign('АПТЕКА',-3.9,2.57,d/2+.112,3.4,.39,'#e0e5db','#227354');
    }
  }
}

function streetSigns({label,painted,post,scene}){
  for(const item of katSigns){
    const {text,x,y,z,w,h,yaw,bg,fg}=item;
    if(text==='kat-emblem'){
      painted(katEmblem(),x,y,z,yaw,w,h);
    }else{
      const sign=label(text,w,h,bg,fg);
      sign.position.set(x,y+periodHeight(x),z);sign.rotation.y=yaw;scene.add(sign);
    }
  }
  const entrance=label('КАТ ПАЗАРДЖИК',5.0,.91,'#e4b946','#243644');
  entrance.position.set(21.1,2.6,47.25);scene.add(entrance);
  for(const x of [18.76,23.44])post(0x5c6058,x,1.19,47.18,.072,2.38,.074);

  const boards=[
    [-509,-61.2,4.35,1.83,4.7,2.95],
    [-706,-194.1,4.74,1.06,5.0,3.08],
    [-763,-237.3,4.7,2.42,5.17,3.28],
    [-780,-258.2,4.02,1.88,4.3,2.70],
  ];
  for(const [i,[x,z,y,yaw,w,h]] of boards.entries()){
    const nx=Math.sin(yaw),nz=Math.cos(yaw);
    post(0x717a7a,x,(y-h/2)/2,z,.36,y-h/2,.40,yaw);
    post(0x7d8584,x,y,z,w+.15,h+.14,.17,yaw);
    painted(sprayPanel(i+20),x+nx*.095,y,z+nz*.095,yaw,w,h);
    painted(sprayPanel(i+27),x-nx*.095,y,z-nz*.095,yaw+Math.PI,w,h);
  }
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=320;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#f9faf2';ctx.fillRect(0,0,384,320);
  ctx.strokeStyle='#455351';ctx.lineWidth=10;ctx.strokeRect(7,7,370,306);
  ctx.fillStyle='#288d63';ctx.fillRect(23,144,268,94);
  ctx.fillStyle='#235191';ctx.fillRect(23,241,268,52);
  ctx.fillStyle='#1d2727';
  function arrow(x,y,turn){
    ctx.save();ctx.translate(x,y);ctx.rotate(turn);
    ctx.beginPath();
    for(const [u,v] of [[0,-27],[18,-6],[7,-6],[7,25],[-7,25],[-7,-6],[-18,-6]])ctx.lineTo(u,v);
    ctx.closePath();ctx.fill();ctx.restore();
  }
  arrow(52,75,0);
  arrow(333,219,Math.PI/2);
  ctx.font='bold 38px sans-serif';ctx.fillText('Център',92,61);ctx.fillText('Centre',92,109);
  ctx.fillStyle='#ffffff';ctx.font='bold 33px sans-serif';ctx.fillText('София',93,183);ctx.fillText('Sofia',93,220);
  ctx.font='bold 25px sans-serif';ctx.fillText('A1',34,181);ctx.fillText('E80',30,217);
  ctx.fillText('37  Панагюрище',32,277);
  const x=-696.5,z=-186.7,yaw=1.06;
  painted(canvas,x,2.53,z,yaw,2.61,2.15);
  for(const l of [-.94,.94])post(0x746e63,x+l*Math.cos(yaw),.94,z-l*Math.sin(yaw),.064,1.88,.065,yaw);
}

function katEmblem(){
  const c=document.createElement('canvas');c.width=c.height=256;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#f1f1e8';ctx.fillRect(0,0,256,256);
  for(const [color,r] of [['#ab5143',104],['#bc9773',91],['#577b63',78]]){
    ctx.strokeStyle=color;ctx.lineWidth=11;ctx.beginPath();ctx.arc(128,128,r,0,Math.PI*2);ctx.stroke();
  }
  ctx.fillStyle='#ededdf';ctx.fillRect(43,97,170,62);
  ctx.fillStyle='#1c363e';ctx.font='bold 50px sans-serif';ctx.textAlign='center';
  ctx.fillText('КАТ',128,145);
  return c;
}
