import assert from "node:assert/strict";
import test from "node:test";
import { Match } from "../match.mjs";
import { Loot, eyePosition, vec } from "../dist/game.mjs";
import { ACTION, TICK } from "../dist/protocol.mjs";

const arena=await Match.createArena();
const player={id:1,name:"Player 1",outfit:0};
const room={mode:"private",bots:false,peers:new Map([[player.id,player]])};
const hold={down:key=>key==="use",just:()=>false};
const release={down:()=>false,just:()=>false};

function approach(game,chest) {
  const p=game.player,c=game.world.collision;
  for(const distance of [.70,1,1.38,1.78,2.20,2.6]) {
    for(let i=0;i<16;i++) {
      const angle=i*Math.PI/8;
      const x=chest.p.x+Math.cos(angle)*distance,z=chest.p.z+Math.sin(angle)*distance;
      const y=c.floor(x,z,chest.p.y+.33,.255).y;
      if(Math.abs(y-chest.p.y)>.4 || c.blocked(x,y,z,1.66,.302)) continue;
      p.p.set(x,y,z);
      p.yaw=Math.atan2(x-chest.p.x,z-chest.p.z);
      p.pitch=Math.atan2(chest.p.y+.27-eyePosition(p).y,distance);
      if(game.loot.target(p)===chest) return true;
    }
  }
  return false;
}

test("the client builds the same chest list as the game server",()=>{
  const match=new Match(arena,room,11,()=>{});
  try {
    const game=match.rules,count=match.readyFor(player).containerCount;
    const legacy=new Loot(game,false);
    const current=new Loot(game,false,count);
    assert.equal(current.containers.length,game.loot.containers.length);
    assert.deepEqual(current.containers.map(c=>c.p.toArray()),game.loot.containers.map(c=>c.p.toArray()));
    assert.ok(legacy.containers.length<current.containers.length);
    assert.deepEqual(legacy.containers.map(c=>c.p.toArray()),current.containers.slice(0,legacy.containers.length).map(c=>c.p.toArray()));
  } finally { match.dispose(); }
});

test("all 49 Highwater chests can be targeted and opened from a walkable spot",()=>{
  const events=[];
  const match=new Match(arena,room,12,event=>events.push(event));
  try {
    const game=match.rules,loot=game.loot,p=game.player;
    p.state="ground";
    const chests=loot.containers.filter(c=>c.kind==="chest");
    assert.equal(chests.length,49);
    for(const chest of chests) {
      // Existing pickups or bots may compete for space. The current target
      // still has to pass reach and line of sight checks.
      assert.ok(approach(game,chest),"Chest "+chest.netId+" has no clear, walkable approach.");
      const startCount=loot.items.length;
      loot.resetInteraction(p);
      for(let i=0;i<14;i++) loot.interact(p,TICK,hold);
      assert.ok(chest.open,"Chest "+chest.netId+" did not open.");
      assert.equal(loot.items.length-startCount,4);
      assert.equal(events.filter(e=>e[0]==="open" && e[1]===chest.netId).length,1);
    }
  } finally { match.dispose(); }
});

test("the server keeps a search on the same chest and rejects out-of-reach requests",()=>{
  const match=new Match(arena,room,13,()=>{});
  try {
    const game=match.rules,loot=game.loot,p=game.player;
    p.state="ground";p.grounded=true;
    const chest=loot.containers.find(c=>c.kind==="chest");
    p.p.copy(chest.p).add(vec(0,0,20));
    assert.notEqual(loot.target(p,chest),chest);
    assert.ok(approach(game,chest));
    match.input(player,{n:1,y:p.yaw,p:p.pitch,h:ACTION.use,j:ACTION.use,container:chest.netId});
    match.updateHuman(p,TICK);
    assert.equal(p.holdTarget,chest);
    assert.deepEqual(match.playerState(player).search,[chest.netId,.03]);
    p.p.z+=20;
    loot.interact(p,TICK,hold);
    assert.equal(p.holdTime,0);
    assert.equal(chest.open,false);
    loot.interact(p,TICK,release);
    assert.ok(approach(game,chest));
    for(let i=0;i<12;i++) loot.interact(p,TICK,hold);
    assert.equal(chest.open,true);
    assert.equal(match.playerState(player).search,null);
  } finally { match.dispose(); }
});
