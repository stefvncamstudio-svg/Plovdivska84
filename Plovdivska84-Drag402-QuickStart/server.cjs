'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {WebSocketServer}=require('ws');
const core=require('./public/drag-core.js');

function createServer({countdown=3,roundBreak=2,random=Math.random}={}){
  const root=path.join(__dirname,'public');
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.txt':'text/plain; charset=utf-8'};
  const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://local').pathname;
    if(pathname==='/health'){res.end('ok');return;}
    const name=pathname==='/'?'index.html':pathname.slice(1);
    if(!/^[a-zA-Z0-9._-]+$/.test(name)||!mime[path.extname(name)]){res.writeHead(404).end();return;}
    const file=fs.createReadStream(path.join(root,name));
    file.once('open',()=>{res.setHeader('Content-Type',mime[path.extname(name)]);file.pipe(res);});
    file.once('error',()=>res.writeHead(404).end());
  });
  const sockets=new WebSocketServer({server,path:'/race',maxPayload:1024});
  const rooms=new Map();
  const send=(ws,message)=>{if(ws.readyState===1&&ws.bufferedAmount<100000)ws.send(JSON.stringify(message));};
  const clock=()=>performance.now()/1000;
  const publish=(room,now=clock())=>{
    const snapshot={type:'room',code:room.code,phase:room.phase,time:now-room.green,
      players:room.players.map(p=>({id:p.id,pilot:p.pilot,car:p.car,ready:p.ready,wins:p.wins,again:p.again,state:p.state})),
      result:room.result,matchId:room.matchId};
    for(const p of room.players)send(p.ws,snapshot);
  };
  function begin(room,now){
    room.phase='race';room.green=now+countdown+random()*.8;room.sim=now;
    room.result=null;
    for(const p of room.players){
      p.state=core.create(p.car);p.input={gas:false,shift:0,launch:false};
    }
    publish(room,now);
  }
  function finish(room,now,winner,reason){
    if(winner)winner.wins++;
    room.result={winner:winner?.id??null,reason};
    room.phase=winner?.wins===2?'finished':'between';
    room.next=now+roundBreak;
    publish(room,now);
  }
  function leave(ws){
    const room=ws.room;
    if(!room)return;
    ws.room=null;
    room.players=room.players.filter(p=>p.ws!==ws);
    if(!room.players.length){rooms.delete(room.code);return;}
    room.phase='lobby';room.result={winner:null,reason:'disconnect'};
    for(const p of room.players){p.ready=false;p.wins=0;p.again=false;p.state=null;}
    publish(room);
  }
  sockets.on('connection',ws=>{
    const id=crypto.randomBytes(7).toString('hex');
    send(ws,{type:'hello',id});
    ws.on('error',()=>{});
    ws.on('close',()=>leave(ws));
    ws.on('message',raw=>{
      let m;
      try{m=JSON.parse(raw);}catch{return;}
      if(!m||typeof m!=='object')return;
      if(m.type==='create'||m.type==='join'){
        let room=rooms.get(String(m.code??'').toUpperCase());
        if(m.type==='create'){
          if(rooms.size>=250){send(ws,{type:'error',message:'Няма свободни стаи.'});return;}
          let code;
          do{code=crypto.randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));
          room={code,players:[],phase:'lobby',green:clock(),matchId:crypto.randomUUID(),result:null};
          rooms.set(code,room);
        }
        if(ws.room===room&&room)return;
        if(!room||room.players.length>=2||room.phase!=='lobby'){
          send(ws,{type:'error',message:'Стаята липсва или е заета.'});return;
        }
        leave(ws);
        ws.room=room;
        room.players.push({ws,id,pilot:1,car:'skyline',ready:false,wins:0,again:false,state:null});
        publish(room);return;
      }
      if(m.type==='leave'){leave(ws);return;}
      const room=ws.room,p=room?.players.find(player=>player.ws===ws);
      if(!p)return;
      if(room.phase==='lobby'&&m.type==='select'){
        if(Object.hasOwn(core.cars,m.car))p.car=m.car;
        if(Number.isInteger(m.pilot)&&m.pilot>=1&&m.pilot<=3)p.pilot=m.pilot;
        p.ready=false;publish(room);
      }else if(room.phase==='lobby'&&m.type==='ready'){
        p.ready=!!m.value;
        if(room.players.length===2&&room.players.every(q=>q.ready))begin(room,clock());
        else publish(room);
      }else if(room.phase==='race'&&m.type==='input'){
        p.input.gas=m.gas===true;
        if(m.shift===1||m.shift===-1)p.input.shift=m.shift;
        if(m.launch===true&&p.state.launchAt===null&&!p.state.falseStart){
          const received=clock();
          // Judge launch at its arrival. Clients cannot supply a timestamp.
          if(received<room.green)p.state.falseStart=true;
          else if(!p.input.launch){p.input.launch=true;p.input.received=received;}
        }
      }else if(room.phase==='finished'&&m.type==='again'){
        p.again=true;
        if(room.players.length===2&&room.players.every(q=>q.again)){
          room.matchId=crypto.randomUUID();
          for(const q of room.players){q.wins=0;q.again=false;}
          begin(room,clock());
        }else publish(room);
      }
    });
  });
  let broadcast=0;
  const timer=setInterval(()=>{
    const now=clock();
    for(const room of rooms.values()){
      if(room.phase==='between'&&now>=room.next)begin(room,now);
      if(room.phase!=='race')continue;
      let iterations=0;
      while(room.sim+core.step<=now&&iterations++<240){
        const time=room.sim-room.green;
        for(const p of room.players){
          const launch=p.input.launch&&p.input.received<=room.sim+core.step;
          core.tick(p.state,{gas:p.input.gas,launch,shift:p.input.shift},
            launch?Math.max(time,p.input.received-room.green):time);
          if(launch)p.input.launch=false;
          p.input.shift=0;
        }
        room.sim+=core.step;
      }
      const [a,b]=room.players;
      if(!b)continue;
      const x=a.state,y=b.state;
      if(x.falseStart&&y.falseStart){finish(room,now,null,'double');continue;}
      if((x.falseStart||y.falseStart)&&now>=room.green){
        finish(room,now,x.falseStart?b:a,'false');continue;
      }
      if(x.finish&&y.finish){
        const diff=x.finish.total-y.finish.total;
        finish(room,now,Math.abs(diff)<.001?null:diff<0?a:b,Math.abs(diff)<.001?'tie':'finish');continue;
      }
      if(now-room.green>40){
        const winner=x.finish?a:y.finish?b:null;
        finish(room,now,winner,winner?'finish':'timeout');continue;
      }
      if(broadcast===0)publish(room,now);
    }
    broadcast=(broadcast+1)%5;
  },10);
  server.once('close',()=>{clearInterval(timer);sockets.close();});
  return {server,sockets};
}
if(require.main===module){
  const {server}=createServer();
  server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>{
    const url='http://localhost:'+server.address().port;
    console.log('Пловдивска 84 — '+url);
    if(process.platform==='darwin'&&process.env.OPEN_LOCAL_BROWSER==='1'){
      require('node:child_process').execFile('open',[url],error=>{
        if(error)console.log('Отвори '+url+' в браузъра.');
      });
    }
  });
}
module.exports={createServer};
