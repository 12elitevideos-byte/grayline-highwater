import http from "node:http";
import { randomInt } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { Match,outfitCount } from "./match.mjs";
import { PROTOCOL, MAX_PLAYERS, TICK } from "./dist/protocol.mjs";

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"dist");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".txt":"text/plain; charset=utf-8",".mp3":"audio/mpeg"};
const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const publicWait=15000, privateIdle=20*60*1000, endGrace=6500;
const frameMs=TICK*1000;
const frontendOrigin="https://grayline-highwater.goldenmotor16.chatgpt.site";
const defaultOrigins=new Set([frontendOrigin,"https://grayline-highwater.onrender.com"]);

export async function createServer({
  port=process.env.PORT||10000, host="0.0.0.0",
  lobbyWait=publicWait,
  originList=process.env.ALLOWED_ORIGINS,
  localOrigin=process.env.RENDER!=="true"
}={}) {
  const arenas=[];
  const rooms=new Map();
  const allowed=originList?new Set(originList.split(",").map(value=>value.trim()).filter(Boolean)):defaultOrigins;
  const connections=new Set(), addressCounts=new Map();
  let publicRoom;
  let stopping=false;

  const server=http.createServer(async(req,res)=>{
    res.setHeader("X-Content-Type-Options","nosniff");
    res.setHeader("Referrer-Policy","strict-origin-when-cross-origin");
    if(req.method!=="GET" && req.method!=="HEAD") { res.writeHead(405,{Allow:"GET, HEAD"}).end();return; }
    let route;
    try { route=decodeURIComponent(new URL(req.url,"http://grayline.local").pathname); }
    catch { res.writeHead(400).end();return; }
    if(route==="/health") {
      res.writeHead(200,{"content-type":"application/json","cache-control":"no-store"});
      res.end(req.method==="HEAD"?undefined:JSON.stringify({service:"grayline",protocol:PROTOCOL,ready:true}));
      return;
    }
    const file=path.resolve(root,"."+(route==="/"?"/index.html":route));
    if(!file.startsWith(root+path.sep)) { res.writeHead(404).end();return; }
    try {
      const info=await stat(file);
      if(!info.isFile()) { res.writeHead(404).end();return; }
      res.writeHead(200,{
        "content-type":mime[path.extname(file)]||"application/octet-stream",
        "content-length":info.size,
        "cache-control":file.includes(path.sep+"vendor"+path.sep)?"public, max-age=86400":"no-cache"
      });
      if(req.method==="HEAD") res.end();
      else createReadStream(file).on("error",()=>res.destroy()).pipe(res);
    } catch { res.writeHead(404).end(); }
  });
  const wss=new WebSocketServer({noServer:true,perMessageDeflate:false,maxPayload:2048});
  const send=(peer,data)=>{
    if(peer.ws.readyState===WebSocket.OPEN) peer.ws.send(typeof data==="string"?data:JSON.stringify(data));
  };
  const error=(peer,message)=>send(peer,{t:"error",message});
  const roomId=()=>{
    let id;
    do { id=Array.from({length:6},()=>alphabet[randomInt(alphabet.length)]).join(""); } while(rooms.has(id));
    return id;
  };
  const originAllowed=(origin,req)=>{
    if(!origin) return true;
    if(allowed.has(origin)) return true;
    if(process.env.RENDER_EXTERNAL_URL===origin) return true;
    if(!localOrigin) return false;
    try {
      const url=new URL(origin);
      return (url.protocol==="https:" || url.protocol==="http:") &&
        (["localhost","127.0.0.1","[::1]"].includes(url.hostname) || url.host===req.headers.host);
    } catch { return false; }
  };

  const touch=room=>{room.touched=Date.now();};
  function newRoom(mode) {
    const room={code:roomId(),mode,bots:true,host:0,peers:new Map(),match:null,deadline:0,events:[],endAt:0,queued:false};
    touch(room);
    rooms.set(room.code,room);
    return room;
  }

  function tellLobby(room) {
    if(room.match) return;
    const roster=[...room.peers.values()].map(p=>[p.id,p.name]);
    for(const peer of room.peers.values()) send(peer,{
      t:"lobby",mode:room.mode,code:room.mode==="private"?room.code:"",self:peer.id,host:room.host,
      roster,bots:room.bots,at:Date.now(),deadline:room.deadline,queued:room.queued,capacity:MAX_PLAYERS
    });
  }

  function leave(peer) {
    const room=peer.room;
    if(!room) return;
    peer.room=null;
    if(room.match) room.match.eliminateDisconnected(peer);
    room.peers.delete(peer.id);
    if(room.host===peer.id) room.host=room.peers.keys().next().value??0;
    touch(room);
    if(!room.peers.size) removeRoom(room);
    else if(!room.match) tellLobby(room);
  }

  function removeRoom(room) {
    room.match?.dispose();
    if(room.arena) room.arena.inUse=false;
    room.match=null;
    rooms.delete(room.code);
    if(publicRoom===room) publicRoom=null;
  }

  function addPeer(peer,room) {
    if(peer.room===room) { tellLobby(room);return; }
    leave(peer);
    peer.lastSelf="";
    let id=1;
    while(room.peers.has(id)) id++;
    peer.id=id;
    peer.name="Player "+id;
    peer.outfit=(id-1)%outfitCount;
    peer.room=room;
    room.peers.set(id,peer);
    room.host ||= id;
    touch(room);
    if(room.mode==="public" && !room.deadline) room.deadline=Date.now()+lobbyWait;
    tellLobby(room);
    if(room.mode==="public" && room.peers.size===MAX_PLAYERS) requestStart(room);
  }

  function requestStart(room) {
    if(room.match || !room.peers.size) return;
    if(!room.bots && room.peers.size<2) {
      error(room.peers.get(room.host),"Invite one more player or enable bots to start.");
      return;
    }
    const arena=arenas.find(arena=>!arena.inUse);
    if(!arena) {
      if(!room.queued) {
        room.queued=true;
        room.deadline=0;
        tellLobby(room);
      }
      return;
    }
    arena.inUse=true;
    room.arena=arena;
    room.queued=false;
    room.deadline=0;
    if(publicRoom===room) publicRoom=null;
    try {
      room.match=new Match(arena,room,randomInt(0,2**32),event=>room.events.push(event));
      for(const peer of room.peers.values()) send(peer,room.match.readyFor(peer));
      publish(room);
    } catch(err) {
      console.error("Unable to initialize match",err);
      for(const peer of room.peers.values()) error(peer,"The arena could not start. Please create or join another match.");
      resetRoom(room);
    }
  }

  function resetRoom(room) {
    room.match?.dispose();
    room.match=null;
    if(room.arena) room.arena.inUse=false;
    room.arena=null;
    room.endAt=0;
    room.events.length=0;
    room.deadline=0;
    touch(room);
    if(room.mode==="private" && room.peers.size) {
      for(const peer of room.peers.values()) send(peer,{t:"lobbyReady"});
      tellLobby(room);
    } else {
      for(const peer of room.peers.values()) { peer.room=null;send(peer,{t:"matchClosed"}); }
      removeRoom(room);
    }
  }

  function publish(room) {
    const match=room.match,state=match.worldState(),events=room.events.splice(0);
    // Remote poses are only useful near the player or their spectate target.
    for(const peer of room.peers.values()) {
      if(peer.ws.bufferedAmount>256_000) {
        peer.ws.close(1013,"Connection too slow");
        peer.ws.terminate();
        continue;
      }
      const subject=match.byId.get(peer.id);
      const eye=!subject.alive?(match.byId.get(subject.killer)||subject):subject;
      const tracked=state.p.filter(row=>{
        if(row[0]===peer.id || row[0]===eye.id) return true;
        if(eye.state==="bus" || row[6]===0) return false;
        return (row[1]-eye.p.x)**2+(row[3]-eye.p.z)**2<440**2;
      });
      const filtered=events.filter(event=>{
        if(event[0]==="notice") return event[1]===peer.id;
        if(event[0]==="step") return event[1]!==peer.id && (event[7]-eye.p.x)**2+(event[9]-eye.p.z)**2<(event[6]+7)**2;
        if(event[0]==="land") return (event[4]-eye.p.x)**2+(event[6]-eye.p.z)**2<36**2;
        if(event[0]==="foley") return (event[4]-eye.p.x)**2+(event[6]-eye.p.z)**2<27**2;
        if(event[0]==="shot") return (event[3]-eye.p.x)**2+(event[5]-eye.p.z)**2<290**2;
        if(event[0]==="trace") return (event[2]-eye.p.x)**2+(event[4]-eye.p.z)**2<290**2;
        return event[0]!=="hit" || event[1]===peer.id || event[2]===peer.id;
      });
      // Send the larger inventory payload only when it changes, with a periodic refresh.
      const self=match.playerState(peer);
      const signature=JSON.stringify([self.hp,self.shield,self.slot,self.pick,self.build,self.items,self.reserve,self.materials,self.action?.[0],self.search,self.stats,self.out]);
      if(signature!==peer.lastSelf || match.tickNumber%16===0) {
        peer.lastSelf=signature;
        send(peer,self);
      }
      send(peer,{...state,p:tracked,e:filtered});
    }
  }

  function handle(peer,raw,isBinary) {
    if(isBinary) return;
    const now=Date.now();
    if(now-peer.rateAt>=1000) {peer.rateAt=now;peer.messages=0;}
    if(++peer.messages>85) {peer.ws.close(1008,"Too many messages");return;}
    let data;
    try {data=JSON.parse(raw.toString("utf8"));} catch {return;}
    if(!data || typeof data!=="object" || typeof data.t!=="string") return;
    if(data.t==="ping") { send(peer,{t:"pong"});return; }
    if(data.t==="hello") {
      if(data.v!==PROTOCOL) {error(peer,"This tab has an old version. Reload Grayline.");peer.ws.close(1008,"Version");return;}
      peer.hello=true;
      send(peer,{t:"hello",v:PROTOCOL});
      return;
    }
    if(!peer.hello) return;
    const room=peer.room;
    switch(data.t) {
      case "public":
        if(room?.mode==="public" && !room.match) return;
        if(!publicRoom || publicRoom.peers.size>=MAX_PLAYERS) {
          if(rooms.size>=48) {error(peer,"Match lobbies are busy. Try again in a moment.");return;}
          publicRoom=newRoom("public");
        }
        addPeer(peer,publicRoom);
        break;
      case "create":
        if(room?.mode==="private" && !room.match) {tellLobby(room);return;}
        if(rooms.size>=48) {error(peer,"Private rooms are busy. Try again in a moment.");return;}
        addPeer(peer,newRoom("private"));
        break;
      case "join": {
        if(now-peer.lastJoin<350) return error(peer,"Wait a moment before trying another room code.");
        peer.lastJoin=now;
        const target=typeof data.code==="string"&&/^[A-Z0-9]{6}$/.test(data.code)?rooms.get(data.code):null;
        if(target?.mode!=="private") return error(peer,"Room not found. Check the six-character code.");
        if(target.match) return error(peer,"That match is in progress. You can join when it ends.");
        if(target.peers.size>=MAX_PLAYERS) return error(peer,"That room is full.");
        addPeer(peer,target);
        break;
      }
      case "leave":
        leave(peer);
        break;
      case "bots":
        if(room?.mode==="private" && !room.match && room.host===peer.id) {
          room.bots=data.on!==false;
          if(!room.bots && room.peers.size<2) room.queued=false;
          touch(room);tellLobby(room);
        }
        break;
      case "start":
        if(room?.mode==="private" && !room.match && room.host===peer.id) requestStart(room);
        break;
      case "input":
        room?.match?.input(peer,data);
        break;
      case "drop":
      case "equip":
      case "inventory":
        room?.match?.inventory(peer,data);
        break;
    }
  }

  wss.on("connection",(ws,req,address)=>{
    const peer={ws,address,hello:false,room:null,id:0,lastSelf:"",rateAt:0,messages:0,lastJoin:0,alive:true,joinedAt:Date.now()};
    connections.add(peer);
    addressCounts.set(address,(addressCounts.get(address)||0)+1);
    ws.on("pong",()=>{peer.alive=true;});
    ws.on("message",(raw,binary)=>handle(peer,raw,binary));
    ws.on("error",()=>ws.terminate());
    ws.once("close",()=>{
      connections.delete(peer);
      const remaining=(addressCounts.get(address)||1)-1;
      if(remaining) addressCounts.set(address,remaining);else addressCounts.delete(address);
      leave(peer);
    });
  });

  server.on("upgrade",(req,socket,head)=>{
    const address=(req.headers["x-forwarded-for"]?.split(",").at(-1)?.trim()||req.socket.remoteAddress||"unknown");
    if(stopping || req.url!=="/ws" || !originAllowed(req.headers.origin,req) || connections.size>=160 || (addressCounts.get(address)||0)>=40) {
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      return;
    }
    wss.handleUpgrade(req,socket,head,ws=>wss.emit("connection",ws,req,address));
  });

  const count=Math.min(4,Math.max(1,parseInt(process.env.GRAYLINE_ARENAS||"2",10)||2));
  for(let i=0;i<count;i++) arenas.push(await Match.createArena());
  const heartbeat=setInterval(()=>{
    const now=Date.now();
    for(const peer of connections) {
      if(!peer.alive || !peer.hello && now-peer.joinedAt>16000) {peer.ws.terminate();continue;}
      peer.alive=false;
      peer.ws.ping();
    }
  },12000);
  let timer,last=performance.now(),carry=0;
  const tick=()=>{
    if(stopping) return;
    const now=performance.now(),wall=Date.now();
    carry=Math.min(100,carry+now-last);
    last=now;
    for(const room of rooms.values()) {
      if(room.match) {
        if(room.endAt && wall>=room.endAt) resetRoom(room);
      } else if(room.mode==="public" && room.deadline && wall>=room.deadline || room.queued && arenas.some(arena=>!arena.inUse)) {
        requestStart(room);
      } else if(room.mode==="private" && wall-room.touched>privateIdle) {
        for(const peer of room.peers.values()) {
          peer.room=null;
          send(peer,{t:"expired"});
        }
        removeRoom(room);
      }
    }
    while(carry>=frameMs) {
      carry-=frameMs;
      for(const room of rooms.values()) {
        const match=room.match;
        if(!match || room.endAt) continue;
        try {
          match.step();
          if(match.winner!==null) {
            publish(room);
            room.endAt=wall+endGrace;
          } else if(match.tickNumber%2===0) publish(room);
        } catch(err) {
          console.error("Match stopped",err);
          for(const peer of room.peers.values()) error(peer,"The match ended because the server hit an error.");
          resetRoom(room);
        }
      }
    }
    timer=setTimeout(tick,Math.max(1,frameMs-carry-(performance.now()-now)));
  };
  await new Promise((resolve,reject)=>server.once("error",reject).listen(Number(port),host,resolve));
  tick();
  return {
    server,
    address:server.address(),
    close:async()=>{
      stopping=true;
      clearTimeout(timer);
      clearInterval(heartbeat);
      for(const room of rooms.values()) removeRoom(room);
      for(const peer of connections) peer.ws.terminate();
      wss.close();
      await new Promise(resolve=>server.close(resolve));
    }
  };
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const flag=(name,fallback)=>{
    const at=process.argv.indexOf(name);
    return at===-1?fallback:process.argv[at+1];
  };
  const app=await createServer({port:flag("--port",process.env.PORT||10000),host:flag("--host","0.0.0.0")});
  console.log("Grayline listening on port "+app.address.port);
  for(const signal of ["SIGINT","SIGTERM"]) process.once(signal,()=>void app.close());
}
