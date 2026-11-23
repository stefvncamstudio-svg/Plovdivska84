'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {WebSocket}=require('ws');
const core=require('./public/drag-core.js');
const {createServer}=require('./server.cjs');

function pass(id,{delta=0,reaction=.15,launchRPM=core.cars[id].launch}={}){
  const s=core.create(id),car=core.cars[id],launchTick=Math.ceil(reaction/core.step);
  for(let i=-360;i<4600&&!s.finish&&!s.falseStart;i++){
    const shift=s.gear<car.ratios.length&&s.rpm>=core.optimum(car,s.gear)+delta?1:0;
    core.tick(s,{gas:i>=launchTick||s.rpm<launchRPM,launch:i===launchTick,shift},i*core.step);
  }
  return s;
}
test('Shared physics, finish at 402 m, redlines and driver skill',()=>{
  const ids=Object.keys(core.cars);
  assert.deepEqual(ids.map(id=>core.cars[id].red),[6800,6800,9000]);
  const scores={};
  for(const id of ids){
    const clean=pass(id),early=pass(id,{delta:-1300,reaction:.39}),late=pass(id,{delta:510,reaction:.40});
    const poorStart=pass(id,{launchRPM:1100});
    assert.equal(clean.dist,402);
    assert(clean.finish&&early.finish&&late.finish&&poorStart.finish);
    assert(clean.finish.total<early.finish.total&&clean.finish.total<late.finish.total);
    assert(clean.finish.total<poorStart.finish.total);
    assert(pass(id,{reaction:-.25}).falseStart);
    scores[id]={clean:clean.finish.total,early:early.finish.total,late:late.finish.total};
  }
  for(const a of ids)for(const b of ids)if(a!==b)assert(scores[a].clean<scores[b].early);
  console.log('Simulated times (s):',scores);
});

function client(url){
  const socket=new WebSocket(url),history=[];
  let latest, id;
  socket.on('error',()=>{});
  socket.on('message',raw=>{
    const m=JSON.parse(raw);history.push(m);latest=m;
    if(m.type==='hello')id=m.id;
  });
  return {socket,history,get latest(){return latest;},get id(){return id;},
    send:m=>socket.send(JSON.stringify(m))};
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(get,predicate,ms=3800){
  const end=Date.now()+ms;
  do{const item=get();if(item&&predicate(item))return item;await sleep(9);}while(Date.now()<end);
  throw Error('Timeout: '+JSON.stringify(get()));
}
test('HTTP and two independent WebSocket clients: room, two false starts, finish, rematch and disconnect',{timeout:35000},async()=>{
  const {server,sockets}=createServer({countdown:.50,roundBreak:.28,random:()=>0});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const port=server.address().port,url='ws://127.0.0.1:'+port+'/race';
  try{
    assert.match(await(await fetch('http://127.0.0.1:'+port+'/')).text(),/Пловдивска 84/);
    assert.equal(await(await fetch('http://127.0.0.1:'+port+'/health')).text(),'ok');
    const a=client(url), b=client(url);
    await until(()=>a.latest,m=>m.type==='hello');await until(()=>b.latest,m=>m.type==='hello');
    a.send({type:'create'});
    const lobby=await until(()=>a.latest,m=>m.phase==='lobby');
    b.send({type:'join',code:lobby.code});
    await until(()=>b.latest,m=>m.players?.length===2);
    a.send({type:'select',car:'supra',pilot:2});b.send({type:'select',car:'s2000',pilot:3});
    await until(()=>a.latest,m=>m.players?.map(p=>p.pilot).join()==='2,3');
    a.send({type:'ready',value:true});b.send({type:'ready',value:true});
    await until(()=>a.latest,m=>m.phase==='race');await until(()=>b.latest,m=>m.phase==='race');
    a.send({type:'input',gas:true,launch:true});b.send({type:'input',gas:true,launch:true});
    await until(()=>a.latest,m=>m.result?.reason==='double');
    await until(()=>a.latest,m=>m.phase==='race'&&m.time<0);
    b.send({type:'input',gas:true,launch:true});
    await until(()=>a.latest,m=>m.result?.reason==='false');
    assert.equal(a.latest.result.winner,a.id);
    await until(()=>a.latest,m=>m.phase==='race'&&m.time<0);
    a.send({type:'input',gas:true});b.send({type:'input',gas:true});
    await until(()=>a.latest,m=>m.phase==='race'&&m.time>.02);
    a.send({type:'input',gas:true,launch:true});
    await sleep(410);b.send({type:'input',gas:true,launch:true});
    const end=Date.now()+23000;
    const shifted=new Map();
    while(Date.now()<end&&a.latest.phase!=='finished'){
      for(const cli of [a,b]){
        const p=cli.latest.players?.find(p=>p.id===cli.id);
        if(p?.state?.rpm>core.optimum(core.cars[p.car],p.state.gear)&&p.state.gear<6&&shifted.get(cli.id)!==p.state.gear){
          shifted.set(cli.id,p.state.gear);cli.send({type:'input',gas:true,shift:1});
        }
      }
      await sleep(15);
    }
    const final=await until(()=>a.latest,m=>m.phase==='finished');
    const peer=await until(()=>b.latest,m=>m.phase==='finished');
    assert.deepEqual(peer.result,final.result);
    assert.deepEqual(peer.players.map(p=>p.state.finish),final.players.map(p=>p.state.finish));
    assert.equal(final.result.reason,'finish');
    assert(final.players.every(p=>p.state.finish&&p.state.shiftCount>=2));
    a.send({type:'again'});b.send({type:'again'});
    await until(()=>a.latest,m=>m.phase==='race'&&m.matchId!==final.matchId);
    b.socket.close();
    await until(()=>a.latest,m=>m.phase==='lobby'&&m.result?.reason==='disconnect');
  }finally{
    for(const socket of sockets.clients)socket.terminate();
    await new Promise(resolve=>server.close(resolve));
  }
});
