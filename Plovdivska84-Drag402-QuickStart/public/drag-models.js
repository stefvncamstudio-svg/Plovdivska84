'use strict';

function buildDragModels({THREE,material,box,ball,tube,profile,rectangle,skyline,hero,wheels}){
  const m=color=>material(color,{side:THREE.DoubleSide});
  const black=m(0x242a31), glass=m(0x597785), chrome=m(0xb5c3c7), gold=m(0xeab75e);
  const red=m(0xaa2b4d), white=m(0xeef1e5);
  function coach(id){
    const open=id==='s2000', root=new THREE.Group();
    const body=m(DragCore.cars[id].color);body.roughness=.32;
    const trim=m(open?0xa91f58:0xca5910);
    const spoiler=m(open?0xe92c76:0x322d2d);
    const length=open?2.09:2.32, width=open?.87:.94;
    profile(root,trim,rectangle(width-.12,.29,-length,length),rectangle(width,.54,-length-.035,length+.035));
    profile(root,body,rectangle(width,.53,-length-.035,length+.035),rectangle(width-.085,.83,-length+.14,length-.20));
    box(root,body,0,.838,open?1.39:1.49,width*1.83,.06,open?1.21:1.20);
    box(root,black,0,.45,length+.05,.88,.20,.06);
    box(root,black,0,.36,-length-.03,width*1.65,.10,.15);
    if(open){
      box(root,black,0,.815,-.22,width*1.65,.07,1.47);
      const screen=box(root,glass,0,1.10,.54,width*1.76,.44,.06);
      screen.rotation.x=-.44;
      for(const x of [-.32,.32]){
        box(root,white,x,.86,-.39,.37,.52,.28).rotation.x=-.14;
        ball(root,black,x,1.11,-.59,.23,.155,.075);
      }
      box(root,black,-.32,1.00,.28,.28,.09,.10);
    }else{
      profile(root,glass,rectangle(.81,.83,-1.43,1.04),rectangle(.63,1.35,-.72,.27));
      profile(root,body,rectangle(.646,1.32,-.75,.29),rectangle(.59,1.40,-.67,.23));
      for(const x of [-1,1]){
        box(root,body,x*.74,1.03,-.91,.095,.52,.105).rotation.x=.61;
        box(root,body,x*.78,1.04,.63,.07,.59,.10).rotation.x=-.73;
      }
    }
    box(root,spoiler,0,1.26,-length+.23,width*2.10,.081,.31);
    for(const side of [-1,1]){
      box(root,chrome,side*.46,1.03,-length+.24,.073,.41,.093).rotation.x=.24;
      box(root,spoiler,side*width,1.26,-length+.23,.063,.179,.32);
      box(root,white,side*.57,.71,length-.014,.40,.137,.085).rotation.z=side*.19;
      box(root,black,side*.57,.705,-length-.001,.50,.19,.068);
      for(let i=0;i<3;i++)ball(root,i===2?gold:red,side*(.41+i*.14),.706,-length-.044,.057,.060,.021);
      box(root,trim,side*width,.425,0,.14,.143,2.67);
      box(root,body,side*(width+.042),1.005,.52,.21,.103,.147);
      for(let i=0;i<4;i++){
        const graphic=box(root,m(open?0xf8b7cf:0x87bd4c),side*(width-.015),.63,.40-i*.26,.017,.041,.25);
        graphic.rotation.x=-.30+i*.12;
      }
    }
    for(const wheel of wheels){
      const copy=wheel.pivot.clone(true);
      if(open)copy.position.z*=.91;
      root.add(copy);
    }
    return root;
  }
  const models={skyline,supra:coach('supra'),s2000:coach('s2000')};
  const pilots=[hero], rigs=[null];
  for(const n of [2,3]){
    const root=new THREE.Group(), slim=n===2;
    const complexion=m(slim?0xd4a27e:0xb37968), dark=m(0x222938), hair=m(slim?0x392e25:0x493836);
    const bodyWidth=slim?.178:.268;
    ball(root,slim?dark:complexion,0,1.22,0,bodyWidth,.299,slim?.105:.155);
    if(slim){
      box(root,m(0xc52c43),.067,1.36,.091,.122,.19,.033);
      box(root,white,-.067,1.36,.091,.123,.19,.033);
      box(root,dark,0,1.48,.073,.152,.065,.099);
    }else{
      for(const x of [-.106,.106])ball(root,complexion,x,1.315,.082,.13,.13,.087);
      ball(root,hair,0,1.57,.072,.079,.022,.045);
    }
    tube(root,complexion,0,1.494,0,.06,.069,.135);
    ball(root,complexion,0,1.652,0,.105,.14,.098);
    ball(root,hair,-.008,slim?1.769:1.758,-.028,.104,slim?.060:.030,.082);
    ball(root,complexion,0,1.638,.096,.027,.04,.028);
    const legs=[],arms=[];
    for(const side of [-1,1]){
      ball(root,complexion,side*.10,1.64,0,.023,.036,.022);
      ball(root,white,side*.047,1.672,.086,.031,.017,.015);
      ball(root,dark,side*.047,1.672,.102,.013,.013,.007);
      if(slim){
        for(const offset of [-1,1]){
          box(root,dark,side*.047,1.674+offset*.029,.111,.085,.009,.012);
          box(root,dark,side*.047+offset*.040,1.674,.111,.009,.050,.012);
        }
      }else{
        box(root,hair,side*.046,1.704,.094,.055,.012,.018).rotation.z=side*.29;
      }
      const leg=new THREE.Group();leg.position.set(side*.094,.94,0);root.add(leg);
      tube(leg,dark,0,-.193,0,slim?.065:.095,.061,.39);
      tube(leg,slim?complexion:dark,0,-.603,0,.056,.043,.47);
      ball(leg,white,0,-.881,.05,.057,.05,.102);
      const arm=new THREE.Group();arm.position.set(side*(bodyWidth+.027),1.421,0);
      arm.rotation.z=side*.18;root.add(arm);
      tube(arm,slim?(side===1?m(0xc52c43):white):complexion,0,-.087,0,slim?.059:.087,slim?.05:.068,.20);
      tube(arm,complexion,0,-.281,0,slim?.044:.06,.039,.25);
      ball(arm,complexion,0,-.432,0,.043,.07,.036);
      legs.push(leg);arms.push(arm);
    }
    if(slim){box(root,dark,0,1.677,.113,.023,.009,.012);}
    ball(root,m(0x673b37),0,1.581,.093,slim?.057:.046,slim?.021:.010,.016);
    if(slim)ball(root,white,0,1.587,.107,.047,.009,.008);
    root.scale.y=slim?1.91/1.83:1;
    rigs.push({legs,arms});
    pilots.push(root);
  }
  function seat(number){
    const sitting=pilots[number-1].clone(true);
    // The driver's legs sit below the bodywork.
    sitting.position.set(-.31,-.53,-.24);
    for(const part of sitting.children)if(part.isGroup&&part.position.y<1)part.visible=false;
    return sitting;
  }
  return {models,pilots,seat,rigs};
}
