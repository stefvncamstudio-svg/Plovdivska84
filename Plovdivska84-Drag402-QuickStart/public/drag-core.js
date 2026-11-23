'use strict';
((root,factory)=>{
  const api=factory();
  if(typeof module==='object') module.exports=api;
  else root.DragCore=api;
})(typeof globalThis==='undefined'?this:globalThis,()=>{
  const distance=402, step=1/120;
  const cars={
    skyline:{name:'Skyline',hp:320,mass:1390,drive:'4×4',red:6800,launch:4100,grip:1.11,tolerance:280,ratios:[3.4,2.25,1.63,1.29,1.04,.86],late:.99,color:0xa6b9bf},
    supra:{name:'Toyota Supra',hp:373,mass:1540,drive:'Задно',red:6800,launch:3500,grip:.92,tolerance:225,ratios:[3.56,2.37,1.69,1.31,1.0,.81],late:1.16,color:0xf47919},
    s2000:{name:'Honda S2000',hp:248,mass:1240,drive:'Задно',red:9000,launch:5200,grip:1.02,tolerance:490,ratios:[3.75,2.47,1.85,1.46,1.14,.93],late:.88,color:0xec347b},
  };
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const optimum=(car,gear=1)=>car.red-[300,170,235,345,410,410][clamp(gear,1,6)-1];
  function create(id){
    return {id,dist:0,speed:0,rpm:1100,gear:1,launchAt:null,finish:null,falseStart:false,
      shiftLock:0,shiftCount:0,shiftScore:0,feedback:'',launchGrip:1};
  }
  function tick(s,input,time,dt=step){
    if(s.finish||s.falseStart)return;
    const car=cars[s.id], throttle=!!input.gas;
    if(s.launchAt===null){
      s.rpm+=(input.gas?3800:-4800)*dt;
      s.rpm=clamp(s.rpm,1100,car.red+180);
      if(!input.launch)return;
      if(time<0){s.falseStart=true;return;}
      s.launchAt=time;
      const error=Math.abs(s.rpm-car.launch);
      s.launchGrip=clamp(1-error/(s.id==='supra'?4300:5450),.43,1);
    }
    s.shiftLock=Math.max(0,s.shiftLock-dt);
    if(input.shift&&s.shiftLock===0){
      const gear=clamp(s.gear+Math.sign(input.shift),1,car.ratios.length);
      if(gear!==s.gear){
        const diff=s.rpm-optimum(car,s.gear);
        const score=clamp(1-Math.max(0,Math.abs(diff)-car.tolerance)/(car.red*.48),0,1);
        s.feedback=input.shift<0?'Надолу':diff<-car.tolerance?'Ранна':diff>car.tolerance?'Късна':'Точна';
        if(input.shift>0){s.shiftCount++;s.shiftScore+=score;}
        s.shiftLock=.095+(input.shift>0?(1-score)*.27:0);
        s.gear=gear;
      }
    }
    const gearRatio=car.ratios[s.gear-1];
    const coupled=s.speed*gearRatio*69;
    s.rpm=clamp(Math.max(1100,coupled,s.gear===1&&throttle?Math.max(0,car.launch-s.speed*145):0),1100,car.red+220);
    const limiter=s.rpm>=car.red+100;
    const torque=clamp(.66+.38*Math.sin(clamp((s.rpm/car.red-.19)*1.77,0,1.55)),.62,1.04);
    const late=s.gear>=3?car.late:1;
    const force=(car.hp/car.mass)*15.5*gearRatio*torque*late;
    const grip=(s.gear===1?car.grip*s.launchGrip:1);
    const accel=(throttle&&!s.shiftLock?Math.min(force,9.8*grip)*(limiter?.085:1):0)-.13-.00091*s.speed*s.speed;
    const before=s.dist, nextSpeed=Math.max(0,s.speed+accel*dt);
    s.dist+=(s.speed+nextSpeed)*dt*.5;
    s.speed=nextSpeed;
    if(s.dist>=distance){
      const at=time+dt*clamp((distance-before)/(s.dist-before),0,1);
      s.dist=distance;
      s.finish={total:at,reaction:s.launchAt,elapsed:at-s.launchAt,
        shifts:s.shiftCount?Math.round(100*s.shiftScore/s.shiftCount):0};
    }
  }
  return {cars,distance,step,optimum,create,tick};
});
