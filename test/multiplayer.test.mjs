import { once } from "node:events";
import assert from "node:assert/strict";
import test from "node:test";
import WebSocket from "ws";
import { createServer } from "../server.mjs";
import { Match } from "../match.mjs";
import { vec, aimVector } from "../dist/game.mjs";
import { ACTION, MAX_PLAYERS, PROTOCOL } from "../dist/protocol.mjs";

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

class Client {
  constructor(base) {
    this.socket=new WebSocket(base);
    this.messages=[];
    this.socket.on("message",raw=>this.messages.push(JSON.parse(raw)));
  }
  async connect() {
    await once(this.socket,"open");
    this.send({t:"hello",v:PROTOCOL});
    return this.next(m=>m.t==="hello");
  }
  send(value) { this.socket.send(JSON.stringify(value)); }
  async next(predicate, timeout=7000) {
    const deadline=Date.now()+timeout;
    do {
      const at=this.messages.findIndex(predicate);
      if(at!==-1) return this.messages.splice(at,1)[0];
      await delay(15);
    } while(Date.now()<deadline);
    throw new Error("Expected server response did not arrive.");
  }
  close() {this.socket.terminate();}
}

test("private codes, bot toggle, host permission, public fill and synchronized player movement",async t=>{
  const app=await createServer({port:0,host:"127.0.0.1",lobbyWait:350});
  t.after(()=>app.close());
  const url="ws://127.0.0.1:"+app.address.port+"/ws";
  const health=await fetch("http://127.0.0.1:"+app.address.port+"/health");
  assert.equal(health.status,200);
  const host=new Client(url), friend=new Client(url), queued=new Client(url);
  t.after(()=>{host.close();friend.close();queued.close();});
  await Promise.all([host.connect(),friend.connect(),queued.connect()]);

  host.send({t:"create"});
  const lobby=await host.next(m=>m.t==="lobby");
  assert.match(lobby.code,/^[A-Z2-9]{6}$/);
  assert.equal(lobby.bots,true);

  friend.send({t:"join",code:lobby.code});
  const joined=await friend.next(m=>m.t==="lobby");
  assert.equal(joined.roster.length,2);
  assert.notEqual(joined.self,lobby.self);
  friend.send({t:"bots",on:false});
  friend.send({t:"start"});
  host.send({t:"ping"});
  await host.next(m=>m.t==="pong");
  assert.ok(!host.messages.some(m=>m.t==="match"));

  host.send({t:"bots",on:false});
  await friend.next(m=>m.t==="lobby" && !m.bots);
  host.send({t:"start"});
  const [a,b]=await Promise.all([host.next(m=>m.t==="match"),friend.next(m=>m.t==="match")]);
  assert.equal(a.roster.length,2);
  assert.equal(b.roster.length,2);
  assert.deepEqual(a.items,b.items);
  assert.deepEqual(a.phases,b.phases);
  assert.deepEqual(a.start,b.start);
  assert.ok(a.items.length>20);

  queued.send({t:"public"});
  const fill=await queued.next(m=>m.t==="match");
  assert.equal(fill.roster.length,MAX_PLAYERS);
  assert.equal(fill.roster.filter(row=>row[1].startsWith("Bot ")).length,24);
  assert.notDeepEqual(fill.start,a.start);

  await host.next(m=>m.t==="state" && m.a>5);
  host.send({t:"input",n:1,y:a.yaw,p:-.35,h:ACTION.forward,j:ACTION.jump,w:0});
  friend.send({t:"input",n:1,y:b.yaw,p:-.35,h:0,j:ACTION.jump,w:0});
  const [dropA,dropB]=await Promise.all([
    host.next(m=>m.t==="state" && m.p.some(p=>p[0]===a.self && p[6]===1)),
    friend.next(m=>m.t==="state" && m.p.some(p=>p[0]===a.self && p[6]===1))
  ]);
  assert.ok(Math.abs(dropA.a-dropB.a)<.25);
  assert.ok(dropA.p.find(p=>p[0]===a.self)[2]>40);
  assert.equal(dropA.alive,2);
  friend.close();
  const win=await host.next(m=>m.t==="state" && m.win===a.self);
  assert.equal(win.alive,1);
});

test("a full 25-slot simulation finishes with one winner and ordered placements",async()=>{
  const arena=await Match.createArena();
  const players=[{id:1,name:"Player 1",outfit:0},{id:4,name:"Player 4",outfit:3}];
  const events=[];
  const match=new Match(arena,{mode:"private",bots:true,peers:new Map(players.map(p=>[p.id,p]))},124,e=>events.push(e));
  assert.equal(match.actors.length,MAX_PLAYERS);
  assert.equal(new Set(match.actors.map(p=>p.id)).size,MAX_PLAYERS);
  assert.equal(match.actors.filter(p=>p.human).length,2);
  for(let i=0;i<16000 && match.winner===null;i++) match.step();
  assert.ok(match.winner>0);
  assert.equal(match.worldState().alive,1);
  assert.deepEqual(match.actors.filter(p=>!p.alive).map(p=>p.rank).sort((a,b)=>a-b),
    Array.from({length:MAX_PLAYERS-1},(_,i)=>i+2));
  assert.ok(events.some(row=>row[0]==="take"));
  assert.ok(events.some(row=>row[0]==="shot"));
  assert.ok(events.some(row=>row[0]==="feed"));
  match.dispose();
});

test("nearby players contend for the same item and shots resolve after collision",async()=>{
  const arena=await Match.createArena();
  const peers=[{id:1,name:"Player 1",outfit:0},{id:2,name:"Player 2",outfit:1}];
  const events=[];
  const match=new Match(arena,{mode:"private",bots:false,peers:new Map(peers.map(p=>[p.id,p]))},9,event=>events.push(event));
  const {rules:g}=match;
  const [a,b]=match.humans;
  a.state=b.state="ground";
  a.p.set(30,95,0);b.p.set(30,95,-7);
  a.grounded=b.grounded=true;
  a.yaw=0;
  a.pitch=0;
  a.aiming=true;
  const loot=g.loot.drop({kind:"gun",id:"pistol",tier:0,clip:12},vec(30,95,-.75));
  assert.equal(g.loot.take(a,loot),true);
  assert.equal(g.loot.take(b,loot),false);
  assert.equal(a.held().clip,12);
  g.combat.fire(a);
  assert.equal(a.held().clip,11);
  assert.ok(b.hp<100);
  assert.ok(events.some(e=>e[0]==="hit"&&e[1]===1&&e[2]===2));
  assert.equal(aimVector(a.yaw).z<0,true);
  match.dispose();
});
