import {
  loadEngine, World, Game, Player, Bot, Loot, BuildSystem, Combat, Storm, Navigation,
  WEATHER, WEAPON_STATS, OUTFITS, THREE, aimVector, vec, rng, clamp
} from "./dist/game.mjs";
import { ACTION, ACTION_MASK, EQUIPMENT, STATUSES, MAX_PLAYERS, TICK } from "./dist/protocol.mjs";

await loadEngine();

const NONE=()=>{};
const round=(n,places=100)=>Math.round(n*places)/places;
const position=p=>[round(p.x),round(p.y),round(p.z)];
const ACT_RELOAD=1, ACT_MED=2, ACT_SWING=3;
const actionType=type=>type==="reload"?ACT_RELOAD:type==="med"?ACT_MED:type==="swing"?ACT_SWING:0;
const wrapAngle=angle=>Math.atan2(Math.sin(angle),Math.cos(angle));
const battleSettings={values:{difficulty:"normal",daylight:"afternoon",weather:"clear",crouchMode:"toggle",aimMode:"toggle"}};

export const outfitCount=OUTFITS.length;

export class Match {
  static async createArena() {
    const world=new World(new THREE.Scene());
    await world.initialize(async()=>{},true);
    return { world, navigation:new Navigation(world) };
  }

  constructor(arena,room,seed,emit) {
    this.arena=arena;
    this.room=room;
    this.emit=emit;
    this.seed=seed;
    this.age=0;
    this.tickNumber=0;
    this.winner=null;
    this.rules=new Game(battleSettings);
    const game=this.rules;
    game.headless=true;
    game.world=arena.world;
    game.navigation=arena.navigation;
    game.world.reset();
    game.navigation.edges.fill(-1);
    game.navigation.queue.clear();
    game.atmosphere={daylight:battleSettings.values.daylight,conditions:WEATHER.clear,moteMap:null};
    game.audio={
      event:NONE,foot:NONE,
      shot:(weapon,p)=>emit(["shot",this.shooter?.id??0,weapon,...position(p)])
    };
    game.fx={
      burst:NONE,foot:NONE,flash:NONE,impact:NONE,
      trace:(from,to,scale)=>{
        if(this.traced) return;
        this.traced=true;
        emit(["trace",this.shooter?.id??0,...position(from),...position(to),scale]);
      }
    };
    game.ui={
      notice:(message)=>{ if(this.interacting) emit(["notice",this.interacting.id,message]); },soundCue:NONE,
      eliminate:(message)=>emit(["feed",message]),
      hit:NONE
    };
    game.renderer={camera:{position:vec()}};
    game.cameraRig={firstPerson:true,direction:vec(),readyGun:()=>true};
    game.random=rng(seed);
    game.objects=new THREE.Group();
    game.busModel=new THREE.Group();
    game.lootAssets={
      chest:new THREE.Group(),ammo:new THREE.Group(),
      item:()=>({group:new THREE.Group(),obj:new THREE.Group()})
    };
    game.state="lobby";
    game.match=game.setupMatch();
    game.match.bus.position.copy(game.match.start);
    this.humans=game.humans=Array.from(room.peers.values(),peer=>{
      const player=new Player(game,peer.id,peer.name,peer.outfit);
      player.p.copy(game.match.start);
      player.yaw=game.match.yaw;
      player.control={held:0,taps:0,scroll:0,seq:0,at:0};
      return player;
    });
    const count=room.bots?MAX_PLAYERS-this.humans.length:0;
    const bots=Array.from({length:count},(_,i)=>new Bot(game,MAX_PLAYERS+i+1,i));
    for(const bot of bots) {
      bot.name="Bot "+bot.name;
      bot.p.copy(game.match.start);
    }
    this.actors=game.actors=[...this.humans,...bots];
    this.byId=new Map(this.actors.map(actor=>[actor.id,actor]));
    game.player=this.humans[0];
    game.loot=new Loot(game);
    game.builds=new BuildSystem(game);
    game.storm=new Storm(game);
    game.combat=new Combat(game);
    const fire=game.combat.fire.bind(game.combat);
    game.combat.fire=(actor,target)=>{
      this.shooter=actor;
      this.traced=false;
      fire(actor,target);
      this.shooter=null;
    };
    game.onLoot=(kind,entry,actor)=>{
      if(kind==="item") emit(["item",this.lootRow(entry)]);
      if(kind==="take") emit(["take",entry.netId,actor.id]);
      if(kind==="open") emit(["open",entry.netId]);
    };
    game.onBuild=(kind,piece)=>{
      if(kind==="place") emit(["build",this.buildRow(piece)]);
      if(kind==="remove") emit(["debuild",piece.key]);
      if(kind==="wear") emit(["wear",piece.key,round(piece.hp)]);
    };
    game.world.onBreak=id=>emit(["break",id]);
    game.world.onDoor=(id,open)=>emit(["door",id,open]);
    const uiDamage=game.damage.bind(game);
    game.damage=(target,amount,source,type,head,point)=>{
      if(!target.alive || target.state==="bus") return;
      const hp=target.hp+target.shield, priorShield=target.shield;
      uiDamage(target,amount,source,type,head,point);
      if(hp<=target.hp+target.shield) return;
      if(target.human || source?.human) {
        emit(["hit",source?.id??0,target.id,round(hp-target.hp-target.shield),target.shield<priorShield,+!!head,...position(point??target.p)]);
      }
    };
    const eliminate=game.eliminate.bind(game);
    game.eliminate=(actor,source,type)=>{
      actor.rank=this.actors.filter(peer=>peer.alive).length;
      actor.killer=source?.id??0;
      actor.eliminatedAt=this.age;
      eliminate(actor,source,type);
    };
  }

  readyFor(peer) {
    const { world,loot,builds,storm,match }=this.rules;
    return {
      t:"match",mode:this.room.mode,self:peer.id,outfit:peer.outfit,seed:this.seed,
      daylight:battleSettings.values.daylight,weather:battleSettings.values.weather,
      roster:this.actors.map(({id,name,outfit})=>[id,name,outfit]),
      phases:storm.phases,
      start:position(match.start),end:position(match.end),yaw:match.yaw,duration:match.duration,
      containerCount:loot.containers.length,
      opened:loot.containers.filter(entry=>entry.open).map(entry=>entry.netId),
      items:loot.items.filter(entry=>!entry.taken).map(entry=>this.lootRow(entry)),
      doors:world.doors.filter(door=>door.open).map(door=>door.netId),
      broken:world.resources.filter(node=>node.destroyed).map(node=>node.netId),
      builds:[...builds.pieces.values()].map(piece=>this.buildRow(piece))
    };
  }

  lootRow(entry) {
    return [entry.netId,...position(entry.p),entry.item,+entry.corpse];
  }

  buildRow(piece) {
    return [piece.key,piece.gx,piece.gz,piece.y,piece.type,piece.material,piece.turn,piece.rotation,round(piece.hp),round(piece.age)];
  }

  worldState() {
    const {storm,match}=this.rules;
    return {
      t:"state", a:round(this.age,1000), alive:this.actors.filter(actor=>actor.alive).length,
      win:this.winner, b:[+match.bus.visible,round(match.phase,1000),...position(match.bus.position)],
      z:[round(storm.x),round(storm.z),round(storm.r),storm.index,storm.mode,round(storm.remaining),+storm.closed],
      p:this.actors.map(p=>{
        const item=p.inBuild?null:p.held();
        const flags=+p.grounded|(+p.crouching<<1)|(+p.aiming<<2)|(+p.inBuild<<3);
        return [p.id,...position(p.p),round(wrapAngle(p.yaw),1000),round(p.pitch,1000),STATUSES.indexOf(p.state),
          flags,EQUIPMENT.indexOf(item?.id??""),round(p.moveX,10),round(p.moveZ,10),
          Math.round(p.shotPose*10),Math.round(p.flinch*10),
          actionType(p.action?.type),p.action?round(p.action.remaining):0,p.action?round(p.action.total):0,round(p.vy,10)];
      })
    };
  }

  playerState(peer) {
    const p=this.byId.get(peer.id);
    return {
      t:"self",a:round(this.age,1000),seq:p.control.seq,
      hp:round(p.hp),shield:round(p.shield),vy:round(p.vy),
      slot:p.slot,pick:p.usingPick,build:[p.buildType,p.buildMaterial,p.buildRotation],
      items:p.items,reserve:p.reserve,materials:p.materials,
      action:p.action?[p.action.type,p.action.total,round(p.action.remaining)]:null,
      search:p.holdTarget?[p.holdTarget.netId,round(p.holdTime)]:null,
      stats:[p.kills,round(p.damageDone),p.shotsFired,p.shotsHit,p.looted],
      out:p.rank?[p.rank,p.killer,round(p.eliminatedAt)]:null
    };
  }

  input(peer,data) {
    const actor=this.byId.get(peer.id);
    if(!actor?.alive || this.winner!==null) return;
    const input=actor.control;
    if(!Number.isSafeInteger(data.n) || data.n<=input.seq ||
      !Number.isFinite(data.y) || !Number.isFinite(data.p) ||
      !Number.isInteger(data.h) || !Number.isInteger(data.j)) return;
    input.seq=data.n;
    input.at=this.age;
    input.held=data.h&ACTION_MASK;
    input.taps|=data.j&ACTION_MASK;
    if(data.j&ACTION.use) input.container=Number.isSafeInteger(data.container)?data.container:null;
    input.scroll=Math.sign(Number.isInteger(data.w)?data.w:0) || input.scroll;
    actor.yaw=wrapAngle(data.y);
    actor.pitch=clamp(data.p,-1.42,1.24);
  }

  inventory(peer,data) {
    const p=this.byId.get(peer.id);
    if(!p?.alive || p.state!=="ground" || this.winner!==null) return;
    const slot=i=>Number.isInteger(i) && i>=0 && i<p.items.length;
    if(data.t==="drop" && !p.usingPick && p.items[p.slot]) {
      const item=p.items[p.slot], aim=aimVector(p.yaw), at=p.p.clone().addScaledVector(aim,1.01);
      if(this.rules.world.collision.cast(p.p.clone().add(vec(0,.48,0)),aim,1.2,"vision")) at.copy(p.p);
      at.y=this.rules.world.collision.floor(at.x,at.z,p.p.y+.28,.04).y;
      this.rules.loot.drop(item,at);
      p.items[p.slot]=null;p.cancel();
      if(p.items.every(value=>!value)) p.usingPick=true;
    } else if(data.t==="equip" && slot(data.slot)) {
      p.slotTo(data.slot);p.inBuild=false;
    } else if(data.t==="inventory" && slot(data.from) && slot(data.to) && p.items[data.from]) {
      [p.items[data.from],p.items[data.to]]=[p.items[data.to],p.items[data.from]];
      p.slotTo(data.to);p.inBuild=false;
    }
  }

  eliminateDisconnected(peer) {
    const actor=this.byId.get(peer.id);
    if(actor?.alive && this.winner===null) {
      // A forfeited player leaves their current inventory for the remaining players.
      actor.hp=0;
      this.rules.eliminate(actor,"storm","disconnect");
    }
  }

  updateHuman(player,dt) {
    const {control:c}=player,{rules:g}=this;
    if(this.age-c.at>.45) c.held=c.taps=c.scroll=0;
    const input={
      down:key=>!!(c.held&ACTION[key]),
      just:key=>!!(c.taps&ACTION[key]),
      takeWheelStep:()=>c.scroll
    };
    const {down,just}=input;
    if(player.state==="bus") {
      if(this.age>=5 && just("jump")) g.jumpBus(player);
    } else if(player.state==="dive" && just("jump")) player.deploy();
    if(player.state==="ground") {
      if(just("build")) {player.inBuild=!player.inBuild;player.cancel();}
      if(just("pick")) player.selectPick();
      for(let i=0;i<5;i++) if(just("slot"+(i+1))) {
        if(player.inBuild && i<4) player.buildType=i;
        else if(!player.inBuild) player.slotTo(i);
      }
      if(c.scroll) player.cycleEquipment(c.scroll);
      if(player.inBuild && just("material")) player.buildMaterial=(player.buildMaterial+1)%3;
      if(player.inBuild && just("rotate")) player.buildRotation=(player.buildRotation+1)%4;
      if(!player.inBuild && just("reload")) player.reload();
      player.aimToggle=down("ads");
      player.crouchToggle=down("crouch");
    }
    g.input=input;
    player.input(dt);
    if(player.state==="ground") {
      this.interacting=player;
      g.loot.interact(player,dt,input,g.loot.containers[c.container]);
      if(player.inBuild) {
        if(just("shoot")) {
          g.builds.preview(player);
          g.builds.shown=null;
          g.builds.placePlayer(player);
        }
      } else {
        const item=player.held();
        if(item && (just("shoot") || item.kind==="gun" && WEAPON_STATS[item.id].auto && down("shoot"))) {
          if(item.kind==="med") player.heal(item);
          else g.combat.fire(player);
        }
      }
      this.interacting=null;
    } else g.loot.resetInteraction(player);
    c.taps=c.scroll=0;
  }

  step(dt=TICK) {
    if(this.winner!==null) return;
    const g=this.rules,m=g.match;
    this.age+=dt;
    m.age=this.age;
    this.tickNumber++;
    if(this.age>=5) {
      m.phase=clamp((this.age-5)/m.duration,0,1);
      m.bus.position.copy(m.start).lerp(m.end,m.phase);
      m.bus.position.y+=Math.sin(m.age*1.68)*.53;
      m.bus.visible=m.phase<1;
      for(const actor of this.actors) {
        if(actor.state!=="bus") continue;
        actor.p.copy(m.bus.position);
        if(m.phase>=1 || !actor.human && m.phase>=actor.drop.progress) g.jumpBus(actor);
      }
      g.storm.update(dt);
    }
    for(const door of g.world.doors) if(door.object.visible) door.update(dt);
    g.thinksLeft=7;
    if(this.tickNumber%2===0) g.navigation.flush();
    for(const actor of this.actors) {
      actor.tick(dt);
      if(!actor.alive) continue;
      if(actor.human) this.updateHuman(actor,dt);
      else actor.act(dt);
    }
    g.builds.update(dt);
    while(g.sounds.length && this.age-g.sounds[0].at>2.45) g.sounds.shift();
    if(this.tickNumber%180===0) g.loot.items=g.loot.items.filter(item=>!item.taken);
    if(this.age>5) {
      const alive=this.actors.filter(actor=>actor.alive);
      if(alive.length<=1) this.winner=alive[0]?.id??0;
      if(this.age>=520 && this.winner===null) {
        const ordered=alive.sort((a,b)=>a.hp+b.shield-b.hp-a.shield || a.kills-b.kills || a.id-b.id);
        for(const actor of ordered.slice(0,-1)) {
          actor.hp=0;g.eliminate(actor,"storm","storm");
        }
        this.winner=ordered.at(-1).id;
      }
    }
  }

  dispose() {
    const g=this.rules;
    g.world.onBreak=null;
    g.world.onDoor=null;
    g.builds.dispose();
    g.storm.dispose();
    g.objects.clear();
    g.navigation.queue.clear();
  }
}
