'use strict';

function createDragUI({getPilot,getCar,applyCosmetics,invalidate,onLeave}){
  const $=id=>document.getElementById(id);
  const cars=DragCore.cars, select=$('drag-car');
  $('local-notice').hidden=location.protocol!=='file:';
  const by=(id,fn)=>$(id).addEventListener('click',fn);
  const storageKey='plovdivska84-drag-v1';
  let profile={best:{},medals:{},credits:0,owned:{},awarded:[]};
  try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved)profile={...profile,...saved};}catch{}
  let local=null, room=null, ws=null, myId=null, frameTime=0, accumulator=0, enteredAt=0;
  let input={gas:false,launch:false,shift:0};
  let showingRace=false, localMode='training', desired=null;
  const seconds=n=>Number.isFinite(n)?n.toFixed(3)+' с':'—';
  const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(profile));}catch{}};
  function updateShop(){
    $('awards').textContent='Кредити '+profile.credits+' · Медали '+Object.values(profile.medals).filter(Boolean).length;
    for(const button of document.querySelectorAll('[data-unlock]')){
      const key=button.dataset.unlock, name={paint:'Окраска',rim:'Джанти',number:'Номер'}[key];
      button.textContent=name+(profile.owned[key]?' · отключено':' · 10');
      button.disabled=!!profile.owned[key]||profile.credits<10;
    }
    applyCosmetics(profile.owned);
  }
  function stats(){
    const car=cars[select.value];
    $('drag-stats').textContent=car.hp+' к.с. · '+car.mass+' кг · '+car.drive+' · '+car.ratios.length+' предавки · '+car.red+' об/мин';
  }
  function showRace(active){
    showingRace=active;
    document.body.classList.toggle('drag-active',active);
    $('race-ui').hidden=!active;
    $('drag-menu').hidden=active;
    if(active)$('race-result').hidden=true;
    invalidate();
  }
  function send(message){if(ws?.readyState===1)ws.send(JSON.stringify(message));}
  function selectRoom(){send({type:'select',car:select.value,pilot:getPilot()});}
  function refreshRoom(){
    const inRoom=!!room, me=room?.players.find(p=>p.id===myId);
    $('ready').hidden=room?.phase!=='lobby';
    $('ready').textContent=me?.ready?'Отмени готовност':'Готов';
    $('again').hidden=room?.phase!=='finished';
    $('again').disabled=!!me?.again;
    $('leave').hidden=!inRoom;
    if(!inRoom)return;
    $('room-code').value=room.code;
    $('room-state').textContent='Стая '+room.code+' · '+room.players.map(p=>
      (p.id===myId?'Ти':'Гост')+' · Пилот '+p.pilot+' · '+cars[p.car].name+(p.ready?' ✓':'')).join(' / ')+
      (room.result?.reason==='disconnect'?' · Другият играч прекъсна връзката.':'');
  }
  function connect(message){
    if(location.protocol==='file:'){$('room-state').textContent='За онлайн игра отвори адреса на стартирания сървър.';return;}
    if(ws?.readyState===1){send(message);return;}
    desired=message;
    if(ws?.readyState===0)return;
    const connection=new WebSocket((location.protocol==='https:'?'wss:':'ws:')+'//'+location.host+'/race');
    ws=connection;
    $('room-state').textContent='Свързване…';
    connection.onmessage=({data})=>{
      if(ws!==connection)return;
      const m=JSON.parse(data);
      if(m.type==='hello'){myId=m.id;send(desired);return;}
      if(m.type==='error'){$('room-state').textContent=m.message;return;}
      if(m.type!=='room')return;
      const was=room;
      room=m;enteredAt=performance.now();
      if(!was||was.code!==m.code)selectRoom();
      refreshRoom();
      if(m.phase==='race'||m.phase==='between'||m.phase==='finished'){
        local=null;
        if(!showingRace)showRace(true);
        if(m.phase==='race'&&was?.phase!=='race'){
          $('race-result').hidden=true;send({type:'input',gas:input.gas});
        }
        if(m.phase==='between'||m.phase==='finished')showOnlineResult();
      }else if(showingRace&&!local){
        showRace(false);onLeave();
      }
      invalidate();
    };
    connection.onerror=()=>{$('room-state').textContent='Сървърът не отговори.';};
    connection.onclose=()=>{
      if(ws!==connection)return;
      ws=null;room=null;refreshRoom();
      if(showingRace&&!local){showRace(false);onLeave();}
      $('room-state').textContent='Връзката е прекъсната.';
    };
  }
  function depart(){
    send({type:'leave'});room=null;refreshRoom();$('room-state').textContent='';
  }
  function startLocal(mode){
    if(room)depart();
    localMode=mode;
    select.value=select.value||getCar();
    local=DragCore.create(select.value);
    frameTime=-3.0-Math.random()*.65;accumulator=0;
    input={gas:false,launch:false,shift:0};
    showRace(true);
  }
  function closeRace(){
    const online=!local;
    local=null;
    if(online)depart();
    input={gas:false,launch:false,shift:0};
    showRace(false);onLeave();
  }
  function resultButton(text,fn){
    const button=document.createElement('button');
    button.textContent=text;button.addEventListener('click',fn);
    $('race-result').append(button);
  }
  function report(title,lines){
    const report=$('race-result');
    report.replaceChildren();
    const heading=document.createElement('h2');heading.textContent=title;report.append(heading);
    for(const line of lines){const p=document.createElement('p');p.textContent=line;report.append(p);}
    report.hidden=false;
  }
  function detail(state){
    const f=state?.finish;
    if(!f)return state?.falseStart?'Фалстарт':'Без време';
    return 'Реакция '+seconds(f.reaction)+' · Драг '+seconds(f.elapsed)+' · Общо '+seconds(f.total)+' · Смени '+f.shifts+'%';
  }
  function showLocalResult(){
    if(local.falseStart){report('Фалстарт',['Натисни Space след зеления сигнал.']);}
    else{
      const old=profile.best[local.id],f=local.finish;
      const record=localMode==='record'&&(!old||f.total<old);
      if(record){profile.best[local.id]=f.total;if(old)profile.medals.record=true;}
      if(f.reaction<=.22)profile.medals.reaction=true;
      if(f.shifts>=92&&local.shiftCount>=2)profile.medals.shifts=true;
      save();updateShop();
      report(record?'Нов личен рекорд':'Финал',[
        detail(local),old?'Спрямо рекорда: '+(f.total-old>=0?'+':'')+(f.total-old).toFixed(3)+' с':'Първо измерено време за тази кола.',
      ]);
    }
    resultButton('Нов опит',()=>startLocal(localMode));
    resultButton('Към менюто',closeRace);
  }
  function showOnlineResult(){
    const result=room.result;
    const title={false:'Фалстарт',double:'Двоен фалстарт',tie:'Равенство',timeout:'Изтече времето',finish:'Резултат'}[result.reason];
    const complete=room.phase==='finished';
    if(complete&&!profile.awarded.includes(room.matchId)){
      profile.awarded.push(room.matchId);profile.credits+=result.winner===myId?12:8;save();updateShop();
    }
    report(complete?(result.winner===myId?'Мачът е спечелен':'Мачът приключи'):title,[
      ...room.players.map(p=>(p.id===myId?'Ти':'Гост')+' · '+p.wins+' победи · '+detail(p.state)),
      complete?'Избери реванш или се върни в града.':'Следващият рунд започва автоматично.',
    ]);
    if(complete){
      if(!room.players.find(p=>p.id===myId)?.again)resultButton('Реванш',()=>send({type:'again'}));
      resultButton('Към менюто',closeRace);
    }
  }
  function gauge(s,training){
    const c=$('gauge').getContext('2d'),car=cars[s.id];
    c.clearRect(0,0,620,420);
    const centreX=285,centreY=241,r=160,start=.78*Math.PI,end=2.23*Math.PI,max=10000;
    const a=rpm=>start+(end-start)*rpm/max;
    function arc(radius,from,to,width,color){
      c.beginPath();c.arc(centreX,centreY,radius,from,to);c.lineWidth=width;c.strokeStyle=color;c.stroke();
    }
    c.fillStyle='#172325f2';c.beginPath();c.arc(centreX,centreY,202,0,Math.PI*2);c.fill();
    arc(r,start,end,9,'#5d7778');arc(r,a(car.red),end,13,'#f25b64');
    if(training){
      const rpm=s.launchAt===null?car.launch:DragCore.optimum(car,s.gear);
      const span=s.launchAt===null?450:car.tolerance;
      arc(r-25,a(rpm-span),a(rpm+span),13,'#a3dfa2');
    }
    c.font='bold 20px system-ui';c.fillStyle='#b9d5d3';c.textAlign='center';c.textBaseline='middle';
    for(let i=0;i<=10;i++){
      const q=a(i*1000),x=Math.cos(q),y=Math.sin(q);
      c.fillText(i,centreX+x*136,centreY+y*136);
      c.beginPath();c.moveTo(centreX+x*155,centreY+y*155);c.lineTo(centreX+x*170,centreY+y*170);
      c.lineWidth=3;c.strokeStyle='#b9d5d3';c.stroke();
    }
    const needle=a(s.rpm);
    c.beginPath();c.moveTo(centreX,centreY);c.lineTo(centreX+Math.cos(needle)*151,centreY+Math.sin(needle)*151);
    c.lineWidth=6;c.strokeStyle='#ffe7c0';c.stroke();
    c.fillStyle='#f7ebda';c.font='bold 66px system-ui';c.fillText(s.gear,centreX,centreY+57);
    c.font='bold 24px system-ui';c.fillText(Math.round(s.speed*3.6)+' км/ч',centreX,centreY+103);
    c.font='bold 18px system-ui';c.fillText(Math.round(s.rpm)+' об/мин',centreX,centreY+132);
    c.fillStyle=s.rpm>=DragCore.optimum(car,s.gear)-car.tolerance?'#b6f3a0':'#50665c';
    c.beginPath();c.arc(centreX,centreY-61,15,0,Math.PI*2);c.fill();
    if(training&&s.feedback){c.fillStyle='#ffe7c0';c.fillText(s.feedback,centreX,centreY-38);}
  }
  function advance(dt){
    if(!showingRace)return null;
    let players=[],index=0,time=frameTime;
    if(local){
      if(!local.finish&&!local.falseStart){
        accumulator+=dt;
        while(accumulator>=DragCore.step){
          DragCore.tick(local,input,frameTime);
          input.shift=0;input.launch=false;
          accumulator-=DragCore.step;frameTime+=DragCore.step;
        }
        if(local.finish||local.falseStart)showLocalResult();
      }
      time=frameTime;players=[{state:local,car:local.id,pilot:getPilot()}];
    }else{
      players=room?.players??[];
      time=(room?.time??-3)+(room?.phase==='race'?Math.min(.12,(performance.now()-enteredAt)/1000):0);
      index=Math.max(0,players.findIndex(p=>p.id===myId));
    }
    const mine=players[index]?.state;
    if(!mine)return null;
    const light=$('race-start');
    light.textContent=mine.falseStart?'ФАЛСТАРТ':mine.finish?'ФИНАЛ':time<0?'● '.repeat(Math.min(3,Math.max(1,4-Math.ceil(-time)))):time<1.5?'●  СТАРТ':'';
    light.style.color=time<0?'#ffad60':'#a5e7aa';
    light.hidden=!light.textContent;
    $('race-progress').textContent=mine.dist.toFixed(0)+' / 402 м'+(room?' · '+players.map(p=>p.wins).join(' : '):'')+
      (local&&profile.best[mine.id]?' · Рекорд '+seconds(profile.best[mine.id]):'')+
      (local&&localMode==='training'&&mine.launchAt===null?' · Старт при '+cars[mine.id].launch+' об/мин':'');
    gauge(mine,!!local&&localMode==='training');
    return {players,index,time};
  }
  function capture(event,down){
    if(!showingRace)return false;
    const codes=['KeyW','ArrowUp','KeyA','KeyS','Space','Escape'];
    if(!codes.includes(event.code)||(event.target?.tagName==='BUTTON'&&event.code==='Space'&&!$('race-result').hidden))return true;
    event.preventDefault();
    if(event.code==='Escape'&&down&&!event.repeat){closeRace();return true;}
    if(event.code==='KeyW'||event.code==='ArrowUp')input.gas=down;
    const launch=down&&!event.repeat&&event.code==='Space';
    const shift=down&&!event.repeat?(event.code==='KeyA'?1:event.code==='KeyS'?-1:0):0;
    if(launch)input.launch=true;
    if(shift)input.shift=shift;
    if(room?.phase==='race')send({type:'input',gas:input.gas,launch,shift});
    return true;
  }
  by('drag-open',()=>{
    $('drag-menu').hidden=!$('drag-menu').hidden;
    if(!$('drag-menu').hidden){if(!room)select.value=getCar();stats();updateShop();}
  });
  by('city',()=>{$('drag-menu').hidden=true;});
  by('training',()=>startLocal('training'));by('record',()=>startLocal('record'));
  by('create-room',()=>connect({type:'create'}));
  by('join-room',()=>connect({type:'join',code:$('room-code').value.trim()}));
  by('ready',()=>send({type:'ready',value:!room?.players.find(p=>p.id===myId)?.ready}));
  by('again',()=>send({type:'again'}));by('leave',depart);
  select.addEventListener('change',()=>{stats();if(room)selectRoom();});
  for(const button of document.querySelectorAll('[data-unlock]'))button.addEventListener('click',()=>{
    const key=button.dataset.unlock;
    if(profile.credits>=10&&!profile.owned[key]){
      profile.credits-=10;profile.owned[key]=true;save();updateShop();invalidate();
    }
  });
  const release=()=>{
    input={gas:false,launch:false,shift:0};
    if(room?.phase==='race')send({type:'input',gas:false});
  };
  addEventListener('blur',release);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});
  stats();updateShop();
  return {advance,capture,startTraining:()=>startLocal('training'),active:()=>showingRace,chooseCar:id=>{if(!room)select.value=id;stats();}};
}
