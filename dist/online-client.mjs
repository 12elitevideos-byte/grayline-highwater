import { MAX_PLAYERS, ACTION, PROTOCOL, EQUIPMENT, EQUIPMENT_KIND, STATUSES } from "./protocol.mjs";
import { matchServer } from "./server-config.mjs";

const OPEN=1;
const START_DELAY=5;
const CONNECT_WINDOW=125000;
const localHost=name=>["localhost","127.0.0.1","[::1]"].includes(name);
const WS_PROTOCOL=location=>location.protocol==="https:"?"wss:":"ws:";

export class OnlineMatch {
  constructor(game,engine) {
    this.game=game;
    this.engine=engine;
    this.active=false;
    this.socket=null;
    this.request=null;
    this.lobby=null;
    this.timer=0;
    const {$,show}=engine;
    $("onlineFind").onclick=()=>this.open("public");
    $("onlinePrivate").onclick=()=>this.open("private");
    $("onlineBack").onclick=()=>this.closePanel();
    $("createRoom").onclick=()=>this.connect({t:"create"});
    $("joinForm").onsubmit=event=>{
      event.preventDefault();
      this.connect({t:"join",code:$("roomInput").value.trim().toUpperCase()});
    };
    $("roomInput").oninput=event=>{event.target.value=event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"");};
    $("allowBots").onchange=()=>this.send({t:"bots",on:$("allowBots").checked});
    $("roomStart").onclick=()=>{if(this.send({t:"start"})) $("roomStart").disabled=true;};
    $("copyCode").onclick=async()=>{
      const code=this.lobby?.code;
      if(!code) return;
      try {
        await navigator.clipboard.writeText(code);
        this.status("Room code copied.");
      } catch { this.status("Share this room code with your friends."); }
    };
    $("world").addEventListener("click",()=>{
      if(this.active && game.isLive() && !game.modal && !game.input.locked) game.input.lock();
    });
    window.addEventListener("pagehide",()=>this.disconnect());
    show("onlinePause",false);
  }

  get endpoint() {
    const url=localHost(location.hostname) || location.hostname.endsWith(".onrender.com") || location.hostname.endsWith(".localhost") || location.port==="4173"
      ? new URL("/ws",location.href)
      : new URL(matchServer);
    url.protocol=WS_PROTOCOL(url);
    return url.href;
  }

  status(message) {
    this.engine.$("onlineStatus").textContent=message;
  }

  open(mode) {
    this.disconnect();
    this.mode=mode;
    this.game.audio.open();
    this.game.audio.event("click");
    this.game.openModal("online");
    const {$,show}=this.engine;
    $("onlineTitle").textContent=mode==="public"?"Battle Royale":"Private Match";
    show("privateSetup",mode==="private");
    show("roomLobby",false);
    this.setConnecting(false);
    this.status(mode==="private"?"Create a room and send your friends the code.":"Finding players…");
    if(mode==="private") $("createRoom").focus({preventScroll:true});
    else { $("onlineBack").focus({preventScroll:true});this.connect({t:"public"}); }
  }

  closePanel() {
    this.disconnect();
    this.game.openModal("");
  }

  disconnect() {
    const socket=this.socket;
    this.socket=null;
    this.request=null;
    this.lobby=null;
    this.active=false;
    this.roomReady=false;
    clearTimeout(this.timer);
    clearTimeout(this.attemptTimer);
    clearInterval(this.lobbyTimer);
    if(socket && socket.readyState<2) socket.close();
  }

  setConnecting(busy) {
    const {$}=this.engine;
    for(const id of ["createRoom","roomInput","joinRoom"]) $(id).disabled=busy;
  }

  connect(request) {
    this.request=request;
    this.deadline=Date.now()+CONNECT_WINDOW;
    this.setConnecting(true);
    this.status("Connecting to the match server…");
    clearTimeout(this.timer);
    if(this.socket?.readyState===OPEN && this.handshake) {
      this.send(request);
      return;
    }
    if(this.socket) {
      const old=this.socket;
      this.socket=null;
      old.close();
    }
    this.dial();
  }

  dial() {
    if(!this.request) return;
    const socket=new WebSocket(this.endpoint);
    this.socket=socket;
    this.handshake=false;
    this.attemptTimer=setTimeout(()=>{if(this.socket===socket && !this.handshake) socket.close();},13000);
    socket.onopen=()=>{if(this.socket===socket) this.send({t:"hello",v:PROTOCOL});};
    socket.onmessage=event=>{
      if(this.socket!==socket) return;
      let data;
      try { data=JSON.parse(event.data); } catch { return; }
      this.receive(data);
    };
    socket.onclose=()=>{
      if(this.socket!==socket) return;
      this.socket=null;
      clearTimeout(this.attemptTimer);
      clearInterval(this.lobbyTimer);
      if(!this.handshake && this.request && Date.now()<this.deadline && this.game.modal==="online") {
        this.status("The free server is waking up. This can take a minute.");
        this.timer=setTimeout(()=>this.dial(),2500);
        return;
      }
      const wasInMatch=this.active;
      if(wasInMatch) {
        if(this.game.state==="result") return;
        this.game.menu();
        this.game.openModal("online");
      }
      this.lobby=null;
      this.request=null;
      this.active=false;
      const {show,$}=this.engine;
      show("roomLobby",false);
      show("privateSetup",this.mode==="private");
      this.setConnecting(false);
      if(this.mode==="public") {
        $("onlineBack").focus({preventScroll:true});
        this.status(wasInMatch?"Connection lost. Go back and select Battle Royale to rejoin.":"The match server didn’t respond. Go back and try again.");
      } else this.status(wasInMatch?"Connection lost. Create or join another room.":"The match server didn’t respond. Try again.");
    };
  }

  send(data) {
    const socket=this.socket;
    if(socket?.readyState!==OPEN || socket.bufferedAmount>64000) return false;
    socket.send(JSON.stringify(data));
    return true;
  }

  receive(data) {
    switch(data.t) {
      case "hello":
        this.handshake=true;
        clearTimeout(this.attemptTimer);
        if(this.request) this.send(this.request);
        break;
      case "lobby":
        this.request=null;
        this.lobby=data;
        this.lobbyClockOffset=Date.now()-data.at;
        if(this.active) {
          this.roomReady=true;
          if(this.game.state==="result") this.readyToRematch();
        } else this.renderLobby();
        break;
      case "match":
        this.request=null;
        this.game.start(data);
        break;
      case "state":
        if(this.active) this.acceptState(data);
        break;
      case "self":
        if(this.active) this.acceptSelf(data);
        break;
      case "error":
        this.request=null;
        this.setConnecting(false);
        if(this.lobby) this.renderLobby();
        this.status(data.message);
        if(this.active && this.game.state!=="result") this.game.ui.notice(data.message,4);
        break;
      case "lobbyReady":
        this.roomReady=true;
        if(this.game.state==="result") this.readyToRematch();
        break;
      case "matchClosed":
        if(this.game.state!=="result" && this.active) {
          this.game.menu();
          this.onlineNotice("The match closed. Try another round.");
        }
        break;
      case "expired":
        this.lobby=null;
        this.setConnecting(false);
        this.engine.show("roomLobby",false);
        this.engine.show("privateSetup",true);
        this.status("This room expired. Create a new one or join with a code.");
        break;
    }
  }

  renderLobby() {
    const {lobby}=this,{$,show}=this.engine;
    const isPrivate=lobby.mode==="private",host=isPrivate && lobby.self===lobby.host;
    show("privateSetup",false);
    show("roomLobby",true);
    show("codeLine",isPrivate);
    show("roomStart",host);
    show("botOption",host);
    $("allowBots").checked=lobby.bots;
    $("roomStart").disabled=lobby.queued || !lobby.bots && lobby.roster.length<2;
    $("roomCode").textContent=lobby.code;
    $("roomPlayers").textContent=lobby.roster.length+" / "+MAX_PLAYERS+" players";
    $("roomRoster").replaceChildren(...lobby.roster.map(([id,name])=>{
      const row=document.createElement("li");
      row.textContent=(id===lobby.self?"You":name)+(isPrivate && id===lobby.host?" · Host":"");
      return row;
    }));
    const label=()=>{
      if(lobby.queued) return "Waiting for an arena to open.";
      if(!isPrivate) {
        const remaining=Math.max(0,Math.ceil((lobby.deadline+this.lobbyClockOffset-Date.now())/1000));
        return remaining?"Starting in "+remaining+" s · Bots fill empty slots.":"Starting match…";
      }
      const fill=lobby.bots?MAX_PLAYERS-lobby.roster.length:0;
      if(!lobby.bots && lobby.roster.length<2) return "Invite one more player to start without bots.";
      return (host?"Ready when you are.":"Waiting for the host.")+(fill?" "+fill+" bot"+(fill===1?"":"s")+" will join.":"");
    };
    clearInterval(this.lobbyTimer);
    this.status(label());
    if(!isPrivate) this.lobbyTimer=setInterval(()=>this.status(label()),300);
    if(host && !$("roomStart").disabled && document.activeElement===$("createRoom")) $("roomStart").focus({preventScroll:true});
  }

  onlineNotice(message) {
    const {$,show}=this.engine;
    $("notice").textContent=message;
    show("notice",true);
  }

  readyToRematch() {
    const button=this.engine.$("again");
    if(this.mode==="private") {button.disabled=false;button.textContent="Back to room";}
  }

  again() {
    const g=this.game;
    if(this.mode!=="private" || this.socket?.readyState!==OPEN || !this.lobby) {
      const mode=this.mode;
      g.menu();
      this.open(mode);
      return;
    }
    if(!this.roomReady) return;
    this.active=false;
    g.state="menu";
    g.clean();
    g.atmosphere.menu();
    g.ui.reset();
    this.engine.show("menu",true);
    this.engine.show("hud",false);
    g.openModal("online");
    this.renderLobby();
  }

  attach(info) {
    const g=this.game,{vec,Competitor,$}=this.engine;
    clearInterval(this.lobbyTimer);
    this.active=true;
    this.roomReady=false;
    this.mode=info.mode;
    this.self=info.self;
    this.seq=0;
    this.nextInput=0;
    this.taps=0;
    this.scroll=0;
    this.crouch=false;
    this.aim=false;
    this.remote=new Map([[info.self,g.player]]);
    this.netLoot=new Map();
    this.current=null;
    this.latestAge=0;
    this.ownTarget=vec();
    this.ownVelocity=vec();
    this.correction=vec();
    this.havePose=false;
    this.out=null;
    this.win=null;
    this.predictedGround=false;
    this.nextMap=0;
    const match=g.match;
    match.start.fromArray(info.start);
    match.end.fromArray(info.end);
    match.bus.position.copy(match.start);
    match.yaw=info.yaw;
    match.bus.rotation.y=info.yaw;
    match.direction.copy(match.end).sub(match.start).normalize();
    match.duration=info.duration;
    g.player.yaw=info.yaw;
    g.player.p.copy(match.start);
    g.storm.phases=info.phases;
    g.storm.remaining=info.phases[0].hold;
    g.player.name="You";
    g.onlinePlayers=info.roster.length;
    $("again").disabled=false;
    for(const [id,name,outfit] of info.roster) {
      if(id===this.self) continue;
      // Keep net IDs even when the local actor is at index zero.
      const actor=new Competitor(g,id,name,outfit);
      actor.netVisible=false;
      this.remote.set(id,actor);
      g.actors.push(actor);
    }
    for(const id of info.broken) g.world.break(g.world.resources[id]);
    for(const id of info.opened) this.openContainer(id);
    for(const id of info.doors) g.world.doors[id]?.set(true);
    for(const row of info.items) this.upsertItem(row);
    for(const row of info.builds) this.placeBuild(row);
    g.cameraRig.update(0);
  }

  acceptState(data) {
    const g=this.game,{vec}=this.engine;
    this.current=data;
    this.latestAge=data.a;
    this.arrivedAt=performance.now();
    const m=g.match, storm=g.storm;
    m.age=data.a;
    [storm.x,storm.z,storm.r,storm.index,storm.mode,storm.remaining,storm.closed]=data.z;
    m.bus.visible=!!data.b[0];
    m.phase=data.b[1];
    m.bus.position.fromArray(data.b,2);
    m.bus.rotation.z=Math.sin(m.age*.99)*.028;
    for(const actor of this.remote.values()) if(actor!==g.player) actor.netVisible=false;
    for(const row of data.p) {
      const actor=this.remote.get(row[0]);
      if(!actor) continue;
      const state=STATUSES[row[6]],self=actor===g.player;
      actor.netVisible=true;
      if(self) {
        this.ownTarget.fromArray(row,1);
        this.ownVelocity.set(row[9],0,row[10]);
        if(!this.havePose || actor.state!==state || actor.p.distanceToSquared(this.ownTarget)>19) {
          actor.p.copy(this.ownTarget);
          this.havePose=true;
        }
      } else {
        const snap=!actor.netPosition || actor.state!==state || actor.netPosition.distanceToSquared(actor.p)>260;
        actor.netPosition??=vec();
        actor.netPosition.fromArray(row,1);
        actor.netYaw=row[4];
        actor.netPitch=row[5];
        if(snap) {
          actor.p.copy(actor.netPosition);
          actor.yaw=row[4];
          actor.pitch=row[5];
        }
        const id=EQUIPMENT[row[8]];
        actor.usingPick=id==="pick";
        const same=actor.items[0]?.id===id;
        if(!same) actor.items[0]=row[8]>1?{id,kind:EQUIPMENT_KIND[row[8]],tier:0}:null;
        const action=["","reload","med","swing"][row[13]];
        actor.action=action?{type:action,item:actor.held(),remaining:row[14],total:row[15]}:null;
      }
      if(actor.state!==state) {
        if(state==="ground") {
          actor.model.land(.8);
          if(self) g.audio.event("land",actor.p,.74);
        }
        if(state==="dead") actor.deathAge=0;
        if(self && state==="glide") g.audio.event("glide",actor.p,.62);
        if(self && state==="dive" && actor.state==="bus") actor.pitch=Math.min(actor.pitch,-.15);
      }
      actor.state=state;
      actor.netState=state;
      actor.netGrounded=!!(row[7]&1);
      if(!self || !this.predictedGround || state!=="ground") actor.grounded=actor.netGrounded;
      actor.crouching=!!(row[7]&2);
      actor.aiming=!!(row[7]&4);
      actor.inBuild=!!(row[7]&8);
      actor.moveX=row[9];actor.moveZ=row[10];
      actor.speed=Math.hypot(actor.moveX,actor.moveZ);
      actor.shotPose=Math.max(actor.shotPose,row[11]/10);
      actor.flinch=Math.max(actor.flinch,row[12]/10);
    }
    for(const event of data.e) this.event(event);
    if(g.state==="result") return;
    if(!g.player.alive) g.state="spectate";
    else if(g.player.state!=="bus") g.state="active";
    else g.state=data.a<START_DELAY?"lobby":"bus";
    this.win=data.win;
    if(this.win===this.self) this.finish(true);
    else if(this.out && (data.a>=this.out[2]+3.45 || data.win!==null)) this.finish(false);
    else if(!g.player.alive && g.modal && g.modal!=="result") g.openModal("");
  }

  acceptSelf(data) {
    const g=this.game,p=g.player;
    p.hp=data.hp;
    p.shield=data.shield;
    if(Math.abs(p.vy-data.vy)>2.4 || !p.grounded && !this.predictedGround) p.vy=data.vy;
    if(p.slot!==data.slot || p.usingPick!==data.pick) p.equipmentChanged();
    p.slot=data.slot;
    p.usingPick=data.pick;
    [p.buildType,p.buildMaterial,p.buildRotation]=data.build;
    // Keep the same item object when the server updates its ammo count.
    p.items=data.items.map((item,i)=>{
      const old=p.items[i];
      return item && old?.id===item.id && old.tier===item.tier ? Object.assign(old,item) : item;
    });
    p.reserve=data.reserve;
    p.materials=data.materials;
    p.action=data.action?{type:data.action[0],total:data.action[1],remaining:data.action[2],item:p.held()}:null;
    [p.kills,p.damageDone,p.shotsFired,p.shotsHit,p.looted]=data.stats;
    this.out=data.out;
    if(this.out) {
      const [rank,killer,age]=this.out;
      g.resultRank=rank;
      g.killer=this.remote.get(killer)||null;
      g.match.recordAge=age;
      if(this.latestAge>=age+3.45 || this.win!==null && this.win!==this.self) this.finish(false);
    }
    if(g.modal==="inventory") g.ui.renderInventory();
  }

  finish(won) {
    const g=this.game,{$}=this.engine;
    if(g.state==="result") return;
    if(!won && !this.out) return;
    g.state="result";
    if(won) g.audio.victory();
    this.engine.show("hud",false);
    const finalAge=won?this.latestAge:this.out[2];
    g.ui.result(won,won?1:this.out[0],g.killer,finalAge);
    if(this.mode==="private" && this.socket?.readyState===OPEN) {
      $("again").disabled=!this.roomReady;
      $("again").textContent=this.roomReady?"Back to room":"Match in progress";
    }
    g.openModal("result");
  }

  upsertItem(row) {
    const [id,x,y,z,item,corpse]=row,{vec}=this.engine;
    const existing=this.netLoot.get(id);
    if(existing) {existing.item=item;return;}
    this.netLoot.set(id,this.game.loot.drop(item,vec(x,y,z),undefined,!!corpse,id));
  }

  openContainer(id) {
    const loot=this.game.loot,entry=loot.containers[id];
    if(!entry || entry.open) return;
    entry.open=true;
    loot.unindex(entry);
  }

  placeBuild(row) {
    const builds=this.game.builds;
    const [key,x,z,y,type,material,turn,rotation,hp,age]=row;
    if(builds.pieces.has(key)) return;
    const plan=builds.plan(x,z,y,type,material,turn,rotation,y);
    plan.key=key;
    const piece=builds.place(plan);
    piece.hp=hp;
    piece.age=age;
  }

  event(event) {
    const g=this.game,p=g.player,{vec,clamp}=this.engine;
    switch(event[0]) {
      case "item":
        this.upsertItem(event[1]);break;
      case "take": {
        const entry=this.netLoot.get(event[1]);
        if(!entry) break;
        entry.taken=true;
        g.loot.unindex(entry);
        entry.group.removeFromParent();
        this.netLoot.delete(event[1]);
        if(event[2]===this.self) g.audio.event("pickup",entry.p,.65);
        break;
      }
      case "open": {
        const entry=g.loot.containers[event[1]];
        if(entry) g.audio.event(entry.kind==="car"?"metal":entry.kind,entry.p,.64);
        this.openContainer(event[1]);break;
      }
      case "build":
        this.placeBuild(event[1]);g.audio.event("build",vec(event[1][1],event[1][3],event[1][2]),.8);break;
      case "wear": {
        const piece=g.builds.pieces.get(event[1]);
        if(piece) piece.hp=event[2];
        break;
      }
      case "debuild": {
        const piece=g.builds.pieces.get(event[1]);
        if(piece) g.builds.remove(piece,true);
        break;
      }
      case "door": {
        const door=g.world.doors[event[1]];
        if(door) door.set(event[2],g.audio);break;
      }
      case "break": {
        const node=g.world.resources[event[1]];
        if(node) {
          const position=node.colliders[0]?.box.getCenter(vec());
          g.world.break(node);
          if(position && position.distanceToSquared(p.p)<110**2) {
            g.audio.event(node.silent?"glass":"break",position,.55);
            g.fx.burst(position,node.silent?"glass":"wood",9,.6);
          }
        }
        break;
      }
      case "shot": {
        const [kind,id,weapon,x,y,z]=event,own=id===this.self;
        const point=vec(x,y,z),item=p.held();
        if(own && item?.kind==="gun" && item.id===weapon) p.kick(item);
        const muzzle=own?g.cameraRig.muzzle(weapon):point;
        g.audio.shot(weapon,muzzle,g.world,own);
        g.fx.flash(muzzle,weapon==="shotgun"||weapon==="sniper"?1.65:1.05);
        g.ui.soundCue(own?p:this.remote.get(id),point,"shot",140);
        break;
      }
      case "trace": {
        const [,id,x,y,z,tx,ty,tz,scale]=event;
        const start=id===this.self && p.held()?.kind==="gun"?g.cameraRig.muzzle(p.held().id):vec(x,y,z);
        g.fx.trace(start,vec(tx,ty,tz),scale);break;
      }
      case "hit": {
        const [,from,to,value,shield,head,x,y,z]=event,at=vec(x,y,z);
        if(from===this.self) {
          g.ui.hit(at,value,shield,head);
          g.audio.event(head?"head":shield?"shieldCrack":"hit");
        }
        if(to===this.self) {
          p.hitShade=from ? .84 : .61;
          p.bigHit=from&&value>=25?clamp(value/44,.52,1):p.bigHit;
          p.shake=Math.min(.39,p.shake+.18);
          p.attacker=this.remote.get(from);
          if(p.attacker) {
            const origin=p.attacker.netPosition||p.attacker.p;
            p.damageDirection=p.yaw-Math.atan2(p.p.x-origin.x,p.p.z-origin.z);
          } else g.audio.event("storm",p.p,.7);
        }
        g.fx.burst(at,shield?"shield":"hit",head?13:7,.57);
        break;
      }
      case "feed":
        g.ui.eliminate(event[1],false);break;
      case "notice":
        g.ui.notice(event[2],1.3);break;
    }
  }

  input(now,enabled) {
    const g=this.game,i=g.input,p=g.player;
    let held=0;
    if(enabled) {
      for(const [key,bit] of Object.entries(ACTION)) {
        if(i.down(key)) held|=bit;
        if(i.just(key)) this.taps|=bit;
      }
      const s=g.settings.values;
      if(s.crouchMode==="toggle") {
        if(i.just("crouch")) this.crouch=!this.crouch;
        held=(held&~ACTION.crouch)|(this.crouch?ACTION.crouch:0);
      }
      if(s.aimMode==="toggle") {
        if(i.just("ads")) this.aim=!this.aim;
        held=(held&~ACTION.ads)|(this.aim?ACTION.ads:0);
      }
      if(i.just("hud")) g.settings.change("showHud",!s.showHud);
      if(i.just("dropItem")) g.dropSelected();
      this.scroll=i.takeWheelStep()||this.scroll;
    } else { this.taps=0;this.scroll=0; }
    this.held=held;
    if(now>=this.nextInput) {
      this.nextInput=now+30;
      if(this.send({t:"input",n:++this.seq,h:held,j:this.taps,y:p.yaw,p:p.pitch,w:this.scroll})) {
        this.taps=0;
        this.scroll=0;
      }
    }
  }

  frame(dt,now) {
    const g=this.game,p=g.player,{vec,damp,angleDiff,aimVector,clamp,$}=this.engine;
    if(!p || g.state==="result") return;
    const controls=!g.modal && g.input.locked && p.alive;
    const yaw=p.yaw;
    if(p.alive) this.input(now,controls);
    const current=this.current;
    const shotsDecay=dt*6.3;
    const visibleCamera=(g.state==="spectate" || !p.alive) && g.killer?.alive?g.killer:p;
    for(const actor of this.remote.values()) {
      actor.age+=dt;
      actor.shotPose=Math.max(0,actor.shotPose-shotsDecay);
      actor.flinch=Math.max(0,actor.flinch-dt*5.4);
      actor.gliderOpening=damp(actor.gliderOpening,+(actor.state==="glide"),9,dt);
      if(actor.state==="dead") actor.deathAge+=dt;
      if(actor!==p && actor.netVisible && actor.netPosition) {
        actor.p.lerp(actor.netPosition,1-Math.exp(-16*dt));
        actor.yaw+=angleDiff(actor.netYaw,actor.yaw)*(1-Math.exp(-19*dt));
        actor.pitch=damp(actor.pitch,actor.netPitch,19,dt);
      }
    }
    if(current) {
      const time=clamp((now-this.arrivedAt)/1000,0,.12);
      g.match.age=this.latestAge+time;
      g.storm.remaining=Math.max(0,current.z[5]-time);
    }
    for(const door of g.world.doors) if(door.object.visible) door.update(dt);
    if(p.alive && p.state!=="bus" && this.havePose) {
      if(controls) {
        const forward=+(!!(this.held&ACTION.forward))-(!!(this.held&ACTION.back));
        const side=+(!!(this.held&ACTION.right))-(!!(this.held&ACTION.left));
        const step=aimVector(yaw).multiplyScalar(forward).addScaledVector(vec(Math.cos(yaw),0,-Math.sin(yaw)),side);
        if(step.lengthSq()>1) step.normalize();
        p.crouching=!!(this.held&ACTION.crouch) || g.world.collision.blocked(p.p.x,p.p.y,p.p.z,1.66,.29);
        p.aiming=!!(this.held&ACTION.ads) && !p.inBuild && p.state==="ground" && p.held()?.kind==="gun";
        const speed=p.crouching?2.03:p.action?.type==="med"?2.16:p.aiming?2.60:forward>0 && (this.held&ACTION.sprint)?6.18:4.28;
        const pieces=Math.max(1,Math.ceil(dt/.033));
        for(let j=0;j<pieces;j++) {
          if(p.netState==="ground") p.walk(dt/pieces,step.x*speed,step.z*speed,j===0 && g.input.just("jump"));
          else if(p.netState===p.state) p.airborne(dt/pieces,step.x,step.z,forward>0);
        }
        this.predictedGround=p.state==="ground";
        if(p.state!==p.netState) p.state=p.netState;
      } else this.predictedGround=false;
      const moving=controls && (this.held&15);
      if(p.state!=="ground" || p.grounded || !controls) {
        const predicted=this.correction.copy(this.ownTarget);
        if(moving) predicted.addScaledVector(this.ownVelocity,clamp((now-this.arrivedAt)/1000+.06,0,.16));
        p.p.lerp(predicted,1-Math.exp(-(moving?5.8:21)*dt));
      } else {
        p.p.x=damp(p.p.x,this.ownTarget.x,5.8,dt);
        p.p.z=damp(p.p.z,this.ownTarget.z,5.8,dt);
      }
    }
    p.recoverAim(dt);
    p.hitShade=Math.max(0,p.hitShade-dt*1.35);
    p.bigHit=damp(p.bigHit,0,7.3,dt);
    p.shake=Math.max(0,p.shake-dt*5);
    p.viewSway.multiplyScalar(Math.exp(-10*dt));
    if(p.action) p.action.remaining=Math.max(0,p.action.remaining-dt);
    g.cameraRig.update(dt);
    const viewer=g.renderer.camera.position;
    for(const actor of this.remote.values()) {
      if(!actor.netVisible && actor!==p) {actor.model.root.visible=false;continue;}
      actor.model.update(dt,viewer,actor===visibleCamera);
    }
    const target=p.state==="ground"?g.loot.target(p):null;
    if(p.interaction!==target) p.holdTime=0;
    p.interaction=target;
    if(target && target.kind!=="item" && controls && g.input.down("use")) p.holdTime=Math.min(target.duration||.25,p.holdTime+dt);
    else p.holdTime=0;
    g.builds.ghost.visible=false;
    if(controls && p.inBuild && p.state==="ground") g.builds.preview(p);
    g.builds.update(dt);
    g.fx.update(dt,g.world.terrain);
    g.loot.update(dt,viewer,g.clock);
    g.storm.draw(g.clock,g.cameraRig.focus);
    g.ui.tick(dt);
    if(current) $("alive").textContent=String(current.alive);
    if(g.modal==="map" && now>=(this.nextMap||0)) {
      this.nextMap=now+180;
      g.ui.map($("bigMap"),true);
    }
    g.input.finishStep();
  }
}
