import { OnlineMatch } from "./online-client.mjs";

// Grayline: Highwater. Dependencies are pinned and game assets are generated below.
const $ = id => document.getElementById(id);
const show = (id, visible) => { $(id).hidden = !visible; };
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const lerp = (a, b, fraction) => a + (b - a) * fraction;
const smooth = (a, b, value) => {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const damp = (current, target, rate, dt) => lerp(current, target, 1 - Math.exp(-rate * dt));
const TAU = Math.PI * 2;
const angleDiff = (to, from) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const HALF = 512;
const SEA = 2;
const SUN_DIRECTION = [-.61,.55,.54];
const HORIZON_COLOR = "#9fb9c2";
const ISLAND_SEED = 813042;
const CROSSING = { west:-5, east:54, z:-40, width:9 };
const LAKE_ACCESS = { west:-190, east:-150, z:160, deck:3.5 };
const PLACES = [
  { name:"Switchback", short:"Switchback", x:-81, z:-61, rx:79, rz:65 },
  { name:"Alder Farm", short:"Alder Farm", x:220, z:-152, rx:51, rz:40 },
  { name:"Milepost 6", short:"Milepost 6", x:140, z:55, rx:37, rz:28 },
  { name:"Stillwater", short:"Stillwater", x:-214, z:141, rx:34, rz:32 },
  { name:"Bracken Camp", short:"Bracken", x:-270, z:-226, rx:33, rz:26 },
  { name:"Greycap Quarry", short:"Greycap", x:224, z:234, rx:45, rz:33 },
  { name:"Mercer Works", short:"Mercer", x:325, z:84, rx:57, rz:43 },
  { name:"Beacon Point", short:"Beacon", x:383, z:-138, rx:12, rz:12 }
];
const RARITIES = ["Common","Uncommon","Rare","Epic","Legendary"];
const RARITY_COLORS = ["#c0c8c2","#82d185","#78bdef","#c193f9","#f2bc65"];
const MATERIALS = ["Wood","Stone","Metal"];
const BUILD_NAMES = ["Wall","Floor","Ramp","Pyramid"];
const MATERIAL_HP = [148,235,330];
const AMMO = { Light:60, Shells:18, Rifle:80, Heavy:16 };
const WEAPON_STATS = {
  pistol: {
    name:"Pistol", mag:12, delay:.245, reload:1.1, damage:24, spread:.015, range:105, falloff:24, ammo:"Light", kick:.025, head:1.65,
    adsTime:.154, recoil:{ steps:[1,.89,1.06], side:.19, rate:14, recovery:.83 }
  },
  smg: {
    name:"SMG", mag:26, delay:.086, reload:1.35, damage:15, spread:.025, range:96, falloff:19, ammo:"Light", kick:.017, head:1.55, auto:true,
    adsTime:.166, recoil:{ steps:[1,.87,1.04,.91,1.10,.96], side:.36, rate:12, recovery:.78 }
  },
  shotgun: {
    name:"Shotgun", mag:5, delay:.76, reload:1.62, damage:13, spread:.084, range:62, falloff:12, ammo:"Shells", kick:.085, head:1.5, pellets:8,
    adsTime:.216, recoil:{ steps:[1,.94,1.06], side:.18, rate:9, recovery:.76 }
  },
  rifle: {
    name:"Assault Rifle", mag:28, delay:.119, reload:1.54, damage:25, spread:.017, range:205, falloff:53, ammo:"Rifle", kick:.031, head:1.6, auto:true,
    adsTime:.195, recoil:{ steps:[1,.92,1.10,.96,1.16], side:.26, rate:11, recovery:.80 }
  },
  sniper: {
    name:"Sniper", mag:4, delay:1.16, reload:2.15, damage:88, spread:.021, range:355, falloff:155, ammo:"Heavy", kick:.093, head:1.9,
    adsTime:.238, recoil:{ steps:[1,1.07,.98], side:.13, rate:8, recovery:.74 }
  }
};
const MEDICINE = {
  bandage:{ name:"Bandages", type:"health", amount:20, limit:75, time:2.4, max:6, tier:0 },
  medkit: { name:"Medkit", type:"health", amount:100, limit:100, time:4.5, max:3, tier:1 },
  small:  { name:"Small Shield", type:"shield", amount:25, limit:50, time:2.0, max:6, tier:1 },
  big:    { name:"Big Shield", type:"shield", amount:50, limit:100, time:3.5, max:3, tier:2 }
};
const BOT_NAMES = ["Ash","Locke","Rook","Moss","Silt","Dune","Hale","Sparrow","Kite","Bracken","Pike","Flint","Vale","Cairn","Wren","Fern","Reed","Gale","Sable","Alder","Sedge","Marl","Brook","Lark"];
const DIFFICULTY = {
  easy:{ react:.58, error:.11, sight:92, courage:35, head:.05 },
  normal:{ react:.34, error:.062, sight:119, courage:28, head:.12 },
  hard:{ react:.19, error:.033, sight:145, courage:22, head:.22 }
};
const BOT_STYLES = {
  aggressive:{ push:1.28, caution:.28, loot:.78, hold:.16, distance:.75 },
  careful:{ push:.77, caution:.83, loot:.98, hold:.58, distance:1.04 },
  looter:{ push:.82, caution:.62, loot:1.42, hold:.39, distance:.98 },
  camper:{ push:.62, caution:.86, loot:.84, hold:.80, distance:1.12 },
  sniper:{ push:.70, caution:.69, loot:1.07, hold:.63, distance:1.34 }
};

function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let n = Math.imul(seed ^ seed >>> 15, 1 | seed);
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}
function hash(x, z, seed = 19) {
  let n = Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + seed;
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967296;
}
const choose = (values, random = Math.random) => values[Math.floor(random() * values.length)];
const timeText = seconds => {
  const n = Math.max(0, Math.ceil(seconds));
  return Math.floor(n / 60) + ":" + String(n % 60).padStart(2, "0");
};
const canvas2D = (width, height = width) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};
const vec = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const aimVector = (yaw, pitch = 0) => vec(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
// Keep the shared eye below the standing or crouched collision ceiling.
const eyeHeight = actor => actor.crouching ? 1.10 : 1.62;
const eyePosition = actor => actor.p.clone().add(vec(0,eyeHeight(actor),0));

const yawTo = (from, to) => Math.atan2(from.x - to.x, from.z - to.z);
const areaDistance = (p, x, z) => dist(p.x, p.z, x, z);
const makeGun = (id, tier = 0) => ({ kind:"gun", id, tier, clip:WEAPON_STATS[id].mag });
const makeMed = (id, count = 1) => ({ kind:"med", id, count, tier:MEDICINE[id].tier });
const makeAmmo = (id, count = AMMO[id]) => ({ kind:"ammo", id, count, tier:0 });
const itemName = item => ({
  gun:() => WEAPON_STATS[item.id].name, med:() => MEDICINE[item.id].name,
  ammo:() => item.id + " Ammo", material:() => MATERIALS[item.id], pick:() => "Pickaxe"
}[item.kind]());
const nearestPlace = (x, z) => PLACES.reduce((a, b) => areaDistance(b,x,z) < areaDistance(a,x,z) ? b : a);
const placement = n => "#" + n;

let THREE, Sky, Reflector, RoomEnvironment, SimplexNoise, mergeGeometries;
let EffectComposer, RenderPass, ShaderPass, UnrealBloomPass, OutputPass, FXAAShader;

const KEYS = {
  forward:["Move forward","KeyW"], back:["Move backward","KeyS"], left:["Move left","KeyA"], right:["Move right","KeyD"],
  jump:["Jump / exit bus / glider","Space"], sprint:["Sprint","ShiftLeft"], crouch:["Crouch","KeyC"],
  shoot:["Fire / swing / place / use","Mouse0"], ads:["Aim","Mouse2"], reload:["Reload","KeyR"], use:["Interact","KeyE"],
  build:["Build mode","KeyQ"], slot1:["Slot 1 / wall","Digit1"], slot2:["Slot 2 / floor","Digit2"],
  slot3:["Slot 3 / ramp","Digit3"], slot4:["Slot 4 / pyramid","Digit4"], slot5:["Slot 5","Digit5"],
  pick:["Pickaxe","KeyF"], material:["Cycle material","KeyG"], rotate:["Rotate build piece","KeyT"],
  map:["Island map","KeyM"], dropItem:["Drop selected item","KeyX"], inventory:["Inventory","Tab"],
  hud:["Show or hide HUD","KeyH"], pause:["Pause / close menu","Escape"]
};
const KEY_DEFAULTS = Object.fromEntries(Object.entries(KEYS).map(([action, key]) => [action,key[1]]));
const keyName = code => ({
  Mouse0:"LMB", Mouse1:"MMB", Mouse2:"RMB", Mouse3:"Mouse 4", Mouse4:"Mouse 5", WheelUp:"Wheel Up", WheelDown:"Wheel Down", Space:"Space", ShiftLeft:"L Shift",
  ShiftRight:"R Shift", ControlLeft:"L Ctrl", ControlRight:"R Ctrl", Escape:"Esc", ArrowUp:"↑", ArrowDown:"↓", ArrowLeft:"←", ArrowRight:"→"
}[code] || code.replace(/^Key|^Digit/,""));
const PRESETS = {
  low:    { scale:64, shadows:"off", distance:580, grass:19, post:false, aa:false, ao:false, bloom:false, blur:false, vignette:false, reflections:false },
  medium: { scale:79, shadows:"low", distance:840, grass:43, post:true, aa:true, ao:false, bloom:false, blur:false, vignette:true, reflections:false },
  high:   { scale:93, shadows:"high", distance:1150, grass:78, post:true, aa:true, ao:true, bloom:true, blur:true, vignette:true, reflections:true },
  ultra:  { scale:100, shadows:"high", distance:1470, grass:100, post:true, aa:true, ao:true, bloom:true, blur:true, vignette:true, reflections:true }
};
const DRAW_PIXELS={low:530000,medium:1100000,high:1950000,ultra:3040000,custom:1950000};
const GRAPHICS_PREVIEW=["preset",...Object.keys(PRESETS.low)];
const PRESET_BOTS = { low:12, medium:18, high:24, ultra:24, custom:24 };
const OPTIONS = {
  graphics:[
    ["preset","Preset",["low|Low","medium|Medium","high|High","ultra|Ultra","custom|Custom"]],
    ["scale","Render scale",[50,100,1,"%"]], ["shadows","Shadows",["off|Off","low|Low","high|High"]],
    ["distance","View distance",[430,1500,10," m"]], ["grass","Grass density",[0,100,1,"%"]],
    ["post","Post-processing",true], ["aa","Anti-aliasing (FXAA)",true], ["ao","Ambient occlusion",true],
    ["bloom","Bloom",true], ["blur","Motion blur",true], ["vignette","Vignette",true], ["reflections","Water reflections",true], ["fov","Field of view",[55,104,1,"°"]],
    ["limit","FPS limit",["30|30","60|60","120|120","0|Unlimited"]], ["fps","Show FPS",true]
  ],
  controls:[
    ["sensitivity","Mouse sensitivity",[10,180,1,"%"]], ["adsSense","Aim sensitivity",[15,100,1,"%"]],
    ["scopeSense","Scope sensitivity",[10,100,1,"%"]], ["invert","Invert Y",true],
    
    ["crouchMode","Crouch input",["hold|Hold","toggle|Toggle"]], ["aimMode","Aim input",["hold|Hold","toggle|Toggle"]],
    ["wheelSwitch","Scroll wheel switches weapons",true], ["invertWheel","Invert scroll direction",true]
  ],
  audio:[
    ["master","Master",[0,100,1,"%"]], ["effects","Effects",[0,100,1,"%"]],
    ["music","Music",[0,100,1,"%"]], ["ui","UI",[0,100,1,"%"]]
  ],
  gameplay:[
    ["difficulty","Bot difficulty",["easy|Easy","normal|Normal","hard|Hard"]],
    ["bots","Bot count",["0|Preset default","6|6","12|12","18|18","24|24"],"Applies when a new match starts."],
    ["daylight","Time of day",["random|Random","dawn|Dawn","noon|Noon","afternoon|Late afternoon","sunset|Sunset","overcast|Overcast","night|Night"],"Applies when a new match starts."],
    ["weather","Weather",["random|Random","clear|Clear","rain|Rain","fog|Fog","thunder|Thunderstorm"],"Applies when a new match starts."],
    ["dropMode","Drop mode",["bus|Choose from bus","glide|Start gliding","ground|Start on foot"]],
    ["numbers","Show damage numbers",true], ["shake","Camera shake",true], ["bob","Head bob",true]
  ],
  accessibility:[
    ["hudScale","HUD scale",[80,130,5,"%"]], ["showHud","Show HUD",true],
    ["palette","Color palette",["standard|Standard","deutan|Red–green support","tritan|Blue–yellow support"]],
    ["soundCues","Directional sound captions",true], ["reducedMotion","Reduced motion",true],
    ["largeText","Larger text",true], ["contrast","High-contrast HUD",true]
  ]
};

class Settings {
  constructor() {
    const low = /CrOS/.test(navigator.userAgent) || (navigator.deviceMemory || 8) <= 4 || (navigator.hardwareConcurrency || 8) <= 4;
    const preset = low ? "low" : "medium";
    this.values = {
      preset, ...PRESETS[preset], fov:76, limit:"60", fps:false, sensitivity:85, adsSense:58, scopeSense:36,
      invert:false, shoulder:"right", crouchMode:"hold", aimMode:"hold", wheelSwitch:true, invertWheel:false,
      master:72, effects:83, music:32, ui:65, difficulty:"normal", bots:"0", daylight:"random", weather:"random",
      numbers:true, shake:true, bob:true, dropMode:"bus", hudScale:100, showHud:true,
      palette:"standard", soundCues:false, reducedMotion:matchMedia("(prefers-reduced-motion: reduce)").matches,
      largeText:false, contrast:false
    };
    this.defaults={...this.values};
    this.keys = {...KEY_DEFAULTS};
    try {
      const saved = JSON.parse(localStorage.getItem("grayline.settings.v2") || "null");
      const old = saved ? null : JSON.parse(localStorage.getItem("grayline.gfx.v1") || "null");
      const values = saved?.values;
      if (values) {
        for (const [id,, definition] of Object.values(OPTIONS).flat()) {
          const input = values[id];
          if (definition === true && typeof input === "boolean") this.values[id] = input;
          else if (typeof definition[0] === "number" && Number.isFinite(input)) this.values[id] = clamp(input, definition[0], definition[1]);
          else if (Array.isArray(definition) && definition.some(option => typeof option === "string" && option.split("|")[0] === input)) this.values[id] = input;
        }
      }
      if (old) {
        for(const id of ["sensitivity","fov"]) if(Number.isFinite(old[id])) this.values[id]=clamp(old[id],id==="fov"?55:10,id==="fov"?104:180);
        for(const id of ["invert","bob"]) if(typeof old[id]==="boolean") this.values[id]=old[id];
        if (typeof old.volume === "number") this.values.master = clamp(old.volume,0,100);
      }
      const keys = saved?.keys || old?.keys;
      if (keys) for (const action of Object.keys(KEYS)) {
        if (typeof keys[action] === "string" && keys[action]) this.rebind(action, keys[action], false);
      }
    } catch { /* Storage may be unavailable when a local file is opened privately. */ }
    this.bindings = {};
    this.controls = {};
    this.tabs = {};
    this.listen = "";
  }
  save() {
    try { localStorage.setItem("grayline.settings.v2", JSON.stringify({ values:{...this.values,...this.preview}, keys:this.keys })); }
    catch { /* Settings remain in memory until the page closes. */ }
  }
  key(action) { return keyName(this.keys[action]); }
  rebind(action, code, persist = true) {
    const conflict = Object.keys(this.keys).find(other => other !== action && this.keys[other] === code);
    if (conflict) this.keys[conflict] = this.keys[action];
    this.keys[action] = code;
    if (persist) this.save();
    return conflict;
  }
  makeMenu(onChange) {
    this.onChange=onChange;
    const tabs = document.querySelector(".tabs");
    for (const [name, options] of Object.entries(OPTIONS)) {
      const tab = document.createElement("button");
      tab.textContent = name[0].toUpperCase() + name.slice(1);
      tab.setAttribute("role","tab");
      tab.onclick = () => this.tab(name);
      const page = document.createElement("div");
      page.id = name + "Page";
      page.setAttribute("role","tabpanel");
      tab.id = name + "Tab";
      tab.setAttribute("aria-controls",page.id);
      page.setAttribute("aria-labelledby",tab.id);
      this.tabs[name] = tab;
      tabs.append(tab);
      $("settingPages").append(page);
      const heading=document.createElement("p");heading.className="searchGroup";heading.textContent=tab.textContent;heading.hidden=true;page.append(heading);
      for (const [id,label,definition,note] of options) {
        const row = document.createElement("label");
        row.className = "setting";
        const title = document.createElement("span");
        title.textContent = label;
        if (note) {
          const small = document.createElement("small");
          small.textContent = note;
          title.append(small);
        }
        row.append(title);
        let input, output, suffix = "";
        if (definition === true) {
          input = document.createElement("input");
          input.type = "checkbox";
          row.append(input);
        } else if (typeof definition[0] === "number") {
          const [min,max,step,unit] = definition;
          suffix = unit;
          input = document.createElement("input");
          Object.assign(input,{ type:"range", min, max, step });
          output = document.createElement("output");
          const range = document.createElement("span");
          range.className = "range";
          range.append(input,output);
          row.append(range);
        } else {
          input = document.createElement("select");
          for (const option of definition) {
            const [value,text] = option.split("|");
            input.append(new Option(text,value));
          }
          row.append(input);
        }
        input.id = "setting-" + id;
        input.oninput=()=>this.change(id,input.type==="checkbox"?input.checked:input.type==="range"?Number(input.value):input.value);
        this.controls[id] = { input, output, suffix };
        page.append(row);
      }
    }
    const bindings = document.createElement("div");
    bindings.id = "bindings";
    for (const [id,[label]] of Object.entries(KEYS)) {
      const row = document.createElement("div");
      row.className = "setting";
      const text = document.createElement("span");
      text.textContent = label;
      const button = document.createElement("button");
      button.className = "bind";
      button.setAttribute("aria-label","Rebind " + label);
      button.onclick = () => { this.listen = id; this.syncBindings(); };
      this.bindings[id] = button;
      row.append(text,button);
      bindings.append(row);
    }
    const status = document.createElement("p");
    status.id = "bindingStatus";
    status.setAttribute("role","status");
    const reset = document.createElement("button");
    reset.className = "small";
    reset.id="resetBindings";
    reset.textContent = "Reset bindings";
    reset.onclick = () => {
      Object.assign(this.keys,KEY_DEFAULTS);
      this.listen = "";
      this.save();
      this.syncBindings("Default bindings restored.");
      onChange("keys");
    };
    $("controlsPage").append(bindings,status,reset);
    $("settingsSearch").oninput=()=>this.search();
    $("resetTab").onclick=()=>this.resetTab();
    $("applyGraphics").onclick=()=>this.finishPreview(true);
    $("revertGraphics").onclick=()=>this.finishPreview(false);
    tabs.onkeydown=event=>{
      const names=Object.keys(this.tabs),i=names.indexOf(this.activeTab);
      const next=event.key==="ArrowRight"?i+1:event.key==="ArrowLeft"?i-1:event.key==="Home"?0:event.key==="End"?names.length-1:null;
      if(next===null) return;
      event.preventDefault();const name=names[(next+names.length)%names.length];this.tab(name);this.tabs[name].focus();
    };
    this.tab("graphics");this.sync();
  }
  tab(name) {
    this.listen="";
    this.activeTab=name;
    $("settingsSearch").value="";
    for (const [key,tab] of Object.entries(this.tabs)) {
      tab.setAttribute("aria-selected",String(name===key));
      tab.tabIndex=name===key?0:-1;
    }
    this.search();
    this.syncBindings();
  }
  sync() {
    for (const [id,{input,output,suffix}] of Object.entries(this.controls)) {
      if (input.type === "checkbox") input.checked = this.values[id];
      else input.value = this.values[id];
      if (output) output.value = this.values[id] + suffix;
    }
    this.syncBindings();
  }
  syncBindings(message) {
    if (!$("bindingStatus")) return;
    for (const [id,button] of Object.entries(this.bindings)) {
      button.textContent = this.listen === id ? "Press input" : this.key(id);
      button.classList.toggle("listening", this.listen === id);
    }
    $("bindingStatus").textContent = message || (this.listen
      ? "Binding " + KEYS[this.listen][0] + ". Press a key, mouse button or scroll."
      : "Select an action, then press a key, mouse button or scroll. A bound wheel direction overrides cycling.");
  }
  count() { return Number(this.values.bots) || PRESET_BOTS[this.values.preset] || 18; }
  change(id,value,onChange=this.onChange) {
    const risky=Object.hasOwn(PRESETS.low,id) || id==="preset";
    if(risky && !this.preview) this.preview=Object.fromEntries(GRAPHICS_PREVIEW.map(key=>[key,this.values[key]]));
    this.values[id]=value;
    if(id==="preset" && PRESETS[value]) Object.assign(this.values,PRESETS[value]);
    else if(risky) this.values.preset="custom";
    if(risky) this.armPreview();
    else this.save();
    this.sync();onChange(id);
  }
  armPreview() {
    this.previewEnd=performance.now()+10000;
    show("graphicsConfirm",true);
    clearInterval(this.previewTimer);
    this.previewTimer=setInterval(()=>this.updatePreview(),180);
    this.updatePreview();
  }
  updatePreview() {
    if(!this.preview) return;
    const seconds=Math.ceil((this.previewEnd-performance.now())/1000);
    if(seconds<=0) this.finishPreview(false);
    else if(seconds!==this.previewSeconds) {
      this.previewSeconds=seconds;
      $("graphicsCountdown").textContent="Keep these graphics settings? Reverting in "+seconds+"s.";
    }
  }
  finishPreview(keep) {
    if(!this.preview) return;
    clearInterval(this.previewTimer);
    if(!keep) Object.assign(this.values,this.preview);
    this.preview=null;
    this.previewSeconds=0;
    show("graphicsConfirm",false);
    this.save();this.sync();this.onChange("graphics");
  }
  resetTab() {
    const tab=this.activeTab;
    if(tab==="graphics" && !this.preview) this.preview=Object.fromEntries(GRAPHICS_PREVIEW.map(id=>[id,this.values[id]]));
    for(const [id] of OPTIONS[tab]) this.values[id]=this.defaults[id];
    if(tab==="controls") { Object.assign(this.keys,KEY_DEFAULTS);this.listen=""; }
    if(tab==="graphics") this.armPreview();
    this.save();this.sync();this.onChange(tab);
  }
  search() {
    const query=$("settingsSearch").value.toLowerCase().trim();
    let results=0;
    for(const tab of Object.keys(OPTIONS)) {
      const page=$(tab+"Page");
      let count=0;
      for(const row of page.querySelectorAll(".setting")) {
        const match=!query || row.textContent.toLowerCase().includes(query);
        row.hidden=!match;
        if(match) count++;
      }
      const extra=tab==="controls";
      if(extra) {
        show("bindingStatus",!query);
        show("resetBindings",!query);
      }
      page.querySelector(".searchGroup").hidden=!query;
      page.hidden=query?!count:tab!==this.activeTab;
      results+=count;
    }
    show("settingsEmpty",!!query && !results);
  }

}

// Indexed collision and ray traversal are shared by walking, building, AI and cameras.
class Collision {
  constructor(terrain) {
    this.terrain = terrain;
    this.cells = new Map();
    this.entries = new Set();
    this.invalid = [];
    this.size = 8;
    this.ray = new THREE.Ray();
    this.point = vec();
    this.stamp = 0;
    this.rayStamp=0;
  }
  cell(x,z) { return Math.floor(x / this.size) + "," + Math.floor(z / this.size); }
  add(box, options = {}) {
    const entry = { box, active:true, surface:"concrete", ...options };
    this.insert(entry);
    return entry;
  }
  insert(entry) {
    if (this.entries.has(entry)) return;
    const {min,max}=entry.box;
    if (entry.box.isEmpty() || ![min.x,min.y,min.z,max.x,max.y,max.z].every(Number.isFinite)) {
      entry.active=false;
      this.invalid.push(entry);
      return;
    }
    entry.active=true;
    this.entries.add(entry);
    entry.cells = [];
    const {box} = entry;
    for (let x = Math.floor(box.min.x / this.size); x <= Math.floor(box.max.x / this.size); x++) {
      for (let z = Math.floor(box.min.z / this.size); z <= Math.floor(box.max.z / this.size); z++) {
        const key = x + "," + z;
        if (!this.cells.has(key)) this.cells.set(key,new Set());
        this.cells.get(key).add(entry);
        entry.cells.push(key);
      }
    }
  }
  remove(entry) {
    if (!this.entries.delete(entry)) return;
    for (const key of entry.cells) {
      const set = this.cells.get(key);
      set?.delete(entry);
      if (set?.size===0) this.cells.delete(key);
    }
    entry.cells.length=0;
    entry.active = false;
  }
  visit(minX,minZ,maxX,maxZ,fn) {
    const mark = ++this.stamp;
    for (let x = Math.floor(minX / this.size); x <= Math.floor(maxX / this.size); x++) {
      for (let z = Math.floor(minZ / this.size); z <= Math.floor(maxZ / this.size); z++) {
        const cell = this.cells.get(x + "," + z);
        if (!cell) continue;
        for (const entry of cell) if (entry.active && entry.stamp !== mark) {
          entry.stamp = mark;
          if (fn(entry)) return true;
        }
      }
    }
    return false;
  }
  horizontalHit(box,x,z,radius) {
    const dx = x - clamp(x,box.min.x,box.max.x);
    const dz = z - clamp(z,box.min.z,box.max.z);
    return dx * dx + dz * dz < radius * radius;
  }
  horizontalEntry(entry,x,z,radius,y) {
    return this.horizontalHit(entry.box,x,z,radius) && (!entry.contains || entry.contains(x,z,radius,y));
  }
  oriented(x,y,z,w,h,d,rx,ry,rz,options) {
    const local=bounds(0,0,0,w,h,d);
    const matrix=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx,ry,rz)).setPosition(x,y,z);
    const inverse=matrix.clone().invert(),localRay=new THREE.Ray(),point=vec();
    return this.add(local.clone().applyMatrix4(matrix),{
      ...options,
      contains:(px,pz,radius)=>{
        point.set(px,y,pz).applyMatrix4(inverse);
        return this.horizontalHit(local,point.x,point.z,radius);
      },
      intersect:(ray,out)=>localRay.copy(ray).applyMatrix4(inverse).intersectBox(local,out)?.applyMatrix4(matrix)||null
    });
  }
  cylinder(x,y,z,height,bottom,top,options) {
    const size=Math.max(bottom,top),slope=(top-bottom)/height;
    return this.add(bounds(x,y+height/2,z,size*2,height,size*2),{
      ...options,
      contains:(px,pz,radius,feet=NaN)=>{
        const r=(Number.isFinite(feet)?lerp(bottom,top,clamp((feet-y)/height,0,1)):size)+radius;
        return (px-x)**2+(pz-z)**2<r*r;
      },
      intersect:(ray,out)=>{
        const {origin:o,direction:d}=ray;
        const xx=o.x-x,zz=o.z-z,yy=o.y-y,r=bottom+slope*yy,dr=slope*d.y;
        const a=d.x*d.x+d.z*d.z-dr*dr,b=xx*d.x+zz*d.z-r*dr,c=xx*xx+zz*zz-r*r;
        const det=b*b-a*c;
        let best=Infinity;
        if(det>=0 && Math.abs(a)>1e-9) {
          const root=Math.sqrt(det);
          const t1=(-b-root)/a,t2=(-b+root)/a;
          if(t1>.012 && yy+t1*d.y>=0 && yy+t1*d.y<=height) best=t1;
          if(t2>.012 && t2<best && yy+t2*d.y>=0 && yy+t2*d.y<=height) best=t2;
        }
        if(Math.abs(d.y)>.00001) {
          const cap=(h,radius)=>{
            const t=(h-yy)/d.y;
            if(t>.012 && t<best && (xx+t*d.x)**2+(zz+t*d.z)**2<=radius*radius) best=t;
          };
          cap(0,bottom);cap(height,top);
        }
        return Number.isFinite(best)?ray.at(best,out):null;
      }
    });
  }
  ellipsoid(x,y,z,rx,ry,rz,yaw,options) {
    const matrix=new THREE.Matrix4().makeRotationY(yaw).scale(vec(rx,ry,rz)).setPosition(x,y,z);
    const inverse=matrix.clone().invert(),rayLocal=new THREE.Ray(),unit=new THREE.Sphere(vec(),1),point=vec();
    const radius=Math.max(rx,rz);
    const height=(px,pz)=>{
      point.set(px,y,pz).applyMatrix4(inverse);
      return ry*Math.sqrt(Math.max(0,1-point.x*point.x-point.z*point.z));
    };
    return this.add(bounds(x,y,z,radius*2,ry*2,radius*2),{
      ...options,
      contains:(px,pz,pad)=>{
        point.set(px,y,pz).applyMatrix4(inverse);
        return (point.x/(1+pad/rx))**2+(point.z/(1+pad/rz))**2<1;
      },
      heightAt:(px,pz)=>y+height(px,pz),bottomAt:(px,pz)=>y-height(px,pz),
      intersect:(ray,out)=>rayLocal.copy(ray).applyMatrix4(inverse).intersectSphere(unit,out)?.applyMatrix4(matrix)||null
    });
  }
  blocked(x,y,z,height = 1.65,radius = .31,ignoreDoor = false) {
    return this.visit(x-radius,z-radius,x+radius,z+radius,entry => {
      const {box} = entry;
      if (entry.walkThrough || (ignoreDoor && entry.door) || y+height<=box.min.y+.026 || y+.035>=box.max.y ||
        !this.horizontalEntry(entry,x,z,radius,y)) return false;
      const top=entry.heightAt?entry.heightAt(x,z):box.max.y;
      const bottom=entry.bottomAt?entry.bottomAt(x,z):box.min.y;
      return y+height>bottom+.027 && y+.037<top;
    });
  }
  floor(x,z,limit = Infinity,radius = .05,ignoreBuild = false,needSurface = false) {
    let y=this.terrain.height(x,z),support=null;
    this.visit(x-radius,z-radius,x+radius,z+radius,entry => {
      if (entry.walkThrough || entry.noFloor || (ignoreBuild && entry.build) || entry.box.max.y<=y ||
        !this.horizontalEntry(entry,x,z,entry.heightAt?Math.min(radius,.08):radius)) return false;
      const top=entry.heightAt?entry.heightAt(x,z):entry.box.max.y;
      if (top<=limit && top>y) { y=top;support=entry; }
      return false;
    });
    return {y,surface:support?.surface || (needSurface?this.terrain.surface(x,z):undefined),entry:support};
  }
  cast(origin,dir,maxDistance,mode = "bullet",includeGround = true) {
    if(maxDistance<=.012) return null;
    this.ray.set(origin,dir);
    let found = null, nearest = maxDistance;
    const n = this.size, mark = ++this.rayStamp;
    let ix = Math.floor(origin.x / n), iz = Math.floor(origin.z / n);
    const sx = Math.sign(dir.x), sz = Math.sign(dir.z);
    let tx = sx ? ((ix + (sx > 0 ? 1 : 0)) * n - origin.x) / dir.x : Infinity;
    let tz = sz ? ((iz + (sz > 0 ? 1 : 0)) * n - origin.z) / dir.z : Infinity;
    const dx = sx ? n / Math.abs(dir.x) : Infinity, dz = sz ? n / Math.abs(dir.z) : Infinity;
    for (;;) {
      const cell = this.cells.get(ix + "," + iz);
      if (cell) for (const entry of cell) {
        if (!entry.active || entry.rayStamp===mark) continue;
        entry.rayStamp=mark;
        if (entry.ghost || (mode === "vision" && entry.glass) || (mode === "nav" && (entry.door || entry.glass))) continue;
        const point = entry.intersect ? entry.intersect(this.ray,this.point) : this.ray.intersectBox(entry.box,this.point);
        if (!point) continue;
        const distance = origin.distanceTo(point);
        if (distance > .012 && distance < nearest) {
          nearest = distance;
          found = { point:point.clone(), distance, entry, surface:entry.surface };
        }
      }
      if (Math.min(tx,tz) >= nearest) break;
      if (tx < tz) { ix += sx; tx += dx; } else { iz += sz; tz += dz; }
    }
    if (includeGround) {
      const step = Math.min(4,Math.max(.28,nearest / 37));
      for (let t = Math.min(step,nearest); t <= nearest; t = Math.min(t + step,nearest)) {
        const x = origin.x + dir.x * t, z = origin.z + dir.z * t;
        if (origin.y + dir.y * t <= this.terrain.height(x,z)) {
          let a = Math.max(0,t - step), b = t;
          for (let i=0;i<8;i++) {
            const m = (a+b)/2, px = origin.x+dir.x*m, pz = origin.z+dir.z*m;
            if (origin.y+dir.y*m < this.terrain.height(px,pz)) b=m; else a=m;
          }
          const point = origin.clone().addScaledVector(dir,b);
          return { point, distance:b, entry:null, surface:this.terrain.surface(point.x,point.z) };
        }
        if (t >= nearest) break;
      }
    }
    return found;
  }
}

class MinHeap {
  constructor() { this.items = []; }
  push(id, cost) {
    const a = this.items, value = {id,cost};
    let i = a.length;
    a.push(value);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (a[parent].cost <= cost) break;
      a[i] = a[parent];
      i = parent;
    }
    a[i] = value;
  }
  pop() {
    const a = this.items, root = a[0], tail = a.pop();
    if (!a.length) return root;
    let i = 0;
    while (i*2+1 < a.length) {
      let child = i*2+1;
      if (child+1 < a.length && a[child+1].cost < a[child].cost) child++;
      if (tail.cost <= a[child].cost) break;
      a[i] = a[child];
      i = child;
    }
    a[i] = tail;
    return root;
  }
  get length() { return this.items.length; }
}
class Renderer {
  constructor(settings) {
    this.settings = settings;
    this.gl = new THREE.WebGLRenderer({ canvas:$("world"), antialias:false, powerPreference:"high-performance" });
    this.gl.outputColorSpace=THREE.SRGBColorSpace;
    this.gl.info.autoReset=false;
    this.shadowAnchor=vec();
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.13;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.gl.shadowMap.autoUpdate = false;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(HORIZON_COLOR,.002);
    this.camera = new THREE.PerspectiveCamera(76,1,.09,1700);
    this.camera.layers.enable(2);
    this.scene.add(this.camera);

    this.sunDir = vec(...SUN_DIRECTION).normalize();
    const sky = this.sky = new Sky();
    sky.scale.setScalar(1350);
    sky.material.depthWrite = false;
    const skyUniforms = sky.material.uniforms;
    skyUniforms.turbidity.value = 3.1;
    skyUniforms.rayleigh.value = 1.92;
    skyUniforms.mieCoefficient.value = .0024;
    skyUniforms.mieDirectionalG.value = .81;
    skyUniforms.sunPosition.value.copy(this.sunDir);
    this.addClouds(sky);
    sky.renderOrder=200;
    this.scene.add(sky);
    this.sun = new THREE.DirectionalLight("#fff0d4",2.9);
    this.sun.position.copy(this.sunDir).multiplyScalar(180);
    this.sun.castShadow = true;
    this.sun.shadow.normalBias=.073;
    this.sun.shadow.bias=-.00021;
    this.sun.shadow.camera.near = 12;
    this.sun.shadow.camera.far = 315;
    this.skyLight = new THREE.HemisphereLight("#deebff","#726852",1.18);
    this.scene.add(this.sun,this.sun.target,this.skyLight);

    const pmrem = new THREE.PMREMGenerator(this.gl);
    const room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room,.023);
    this.scene.environment = this.environment.texture;
    room.dispose?.();
    pmrem.dispose();

    const float=this.gl.extensions.has("EXT_color_buffer_float") || this.gl.extensions.has("EXT_color_buffer_half_float");
    const target=new THREE.WebGLRenderTarget(2,2,{
      type:float?THREE.HalfFloatType:THREE.UnsignedByteType,depthBuffer:true,depthTexture:new THREE.DepthTexture(2,2,THREE.UnsignedIntType)
    });
    this.composer = new EffectComposer(this.gl,target);
    this.composer.renderTarget2.depthTexture = new THREE.DepthTexture(2,2,THREE.UnsignedIntType);
    this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.shading = new ShaderPass({
      uniforms:{
        tDiffuse:{value:null}, tDepth:{value:null}, enabledAO:{value:0}, vignette:{value:0},
        sprintBlur:{value:0}, aimBlur:{value:0}, impact:{value:0}, aimDepth:{value:180},
        sunScreen:{value:new THREE.Vector2()}, shaftLight:{value:0}, shaftColor:{value:new THREE.Color()},
        resolution:{value:new THREE.Vector2(2,2)}, nearClip:{value:.09}, farClip:{value:1700}
      },
      vertexShader:`
        varying vec2 screenUV;
        void main() { screenUV=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
      `,
      fragmentShader:`
        uniform sampler2D tDiffuse, tDepth;
        uniform float enabledAO, vignette, nearClip, farClip, sprintBlur, aimBlur, impact, aimDepth, shaftLight;
        uniform vec2 resolution, sunScreen;
        uniform vec3 shaftColor;
        varying vec2 screenUV;
        float meters(vec2 uv) {
          float d=texture2D(tDepth,uv).r;
          return nearClip*farClip/max(.0001,farClip-d*(farClip-nearClip));
        }
        void main() {
          vec4 base=texture2D(tDiffuse,screenUV);
          vec2 center=(screenUV-.5)*vec2(1.06,1.);
          float d=meters(screenUV);
          float edge=smoothstep(.13,.61,length(center));
          if (d>.9 && (sprintBlur+aimBlur+impact)>.015) {
            float focus=smoothstep(.12,.68,abs(log(max(1.,d)/aimDepth)));
            float blur=edge*(sprintBlur*.010+impact*.026)+aimBlur*focus*(.0006+edge*.0048);
            vec2 motion=center*blur;
            vec2 defocus=vec2(-center.y,center.x)*aimBlur*focus*.006;
            vec3 sum=texture2D(tDiffuse,screenUV-motion).rgb+texture2D(tDiffuse,screenUV+motion).rgb;
            sum+=texture2D(tDiffuse,screenUV-motion*1.8+defocus).rgb;
            sum+=texture2D(tDiffuse,screenUV+motion*1.8-defocus).rgb;
            base.rgb=mix(base.rgb,sum*.25,smoothstep(.0004,.006,blur)*.70);
          }
          float shade=1.;
          if (enabledAO>.5) {
            if (d<110.) {
              vec2 span=1./resolution*clamp(62./d,2.1,12.);
              float occlusion=0.;
              float phase=fract(sin(dot(floor(gl_FragCoord.xy/2.),vec2(12.9898,78.233)))*43758.5453)*6.283;
              for(int i=0;i<8;i++) {
                float a=phase+float(i)*.785398;
                float k=1.+.5*mod(float(i),2.);
                float delta=d-meters(screenUV+vec2(cos(a),sin(a))*span*k);
                occlusion+=smoothstep(.032,.20,delta)*(1.-smoothstep(.20,1.25,delta));
              }
              shade-=occlusion*.061*(1.-smoothstep(34.,110.,d));
            }
          }
          shade*=1.-vignette*.21*smoothstep(.18,.73,length(center));
          vec3 color=base.rgb*shade;
          vec2 toSun=sunScreen-screenUV;
          float halo=1.-smoothstep(.04,.49,length(toSun*vec2(resolution.x/resolution.y,1.)));
          if (shaftLight>.006 && d>3. && halo>0.) {
            float light=0.;
            for (int i=0;i<8;i++) {
              vec2 sampleUV=clamp(screenUV+toSun*(float(i)+1.)*.108,0.,1.);
              light+=smoothstep(105.,220.,meters(sampleUV));
            }
            color+=shaftColor*shaftLight*halo*(light*.125)*smoothstep(3.,18.,d);
          }
          color=mix(color,color*vec3(1.11,.61,.58)+vec3(.17,.012,.008),impact*(.15+.51*edge));
          gl_FragColor=vec4(color,base.a);
        }
      `
    });
    const shaderRender = this.shading.render.bind(this.shading);
    this.shading.render = (renderer,write,read,...rest) => {
      this.shading.uniforms.tDepth.value = read.depthTexture;
      shaderRender(renderer,write,read,...rest);
    };
    this.composer.addPass(this.shading);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(2,2),.20,.27,1.04);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.fxaa = new ShaderPass(FXAAShader);
    this.composer.addPass(this.fxaa);
    this.shadowClock = 0;
    this.shadowStyle = "";
    this.resizePending = true;
    addEventListener("resize",() => { this.resizePending = true; });
    this.apply();
  }
  addClouds(sky) {
    const noise = new SimplexNoise({ random:rng(77015) });
    const size = 256, data = new Uint8Array(size*size);
    // The texture is periodic at the seam so projecting it across the sky is continuous.
    for (let j=0;j<size;j++) for (let i=0;i<size;i++) {
      const u=i/size*TAU, v=j/size*TAU;
      const sx=Math.cos(u), sy=Math.sin(u), sz=Math.cos(v), sw=Math.sin(v);
      const n=.59*noise.noise4d(sx*2,sy*2,sz*2.7,sw*2.7)+
        .29*noise.noise4d(sx*5,sy*5,sz*6,sw*6)+.12*noise.noise4d(sx*12,sy*12,sz*16,sw*16);
      data[j*size+i] = Math.round(smooth(-.02,.6,n)*255);
    }
    const clouds = new THREE.DataTexture(data,size,size,THREE.RedFormat);
    clouds.wrapS = clouds.wrapT = THREE.RepeatWrapping;
    clouds.magFilter = THREE.LinearFilter;
    clouds.minFilter = THREE.LinearMipmapLinearFilter;
    clouds.generateMipmaps = true;
    clouds.needsUpdate = true;
    sky.material.uniforms.cloudMap = { value:clouds };
    sky.material.uniforms.cloudTime = { value:0 };
    this.cloudTime = sky.material.uniforms.cloudTime;
    Object.assign(sky.material.uniforms,{
      horizonTint:{value:new THREE.Color(HORIZON_COLOR)}, zenithTint:{value:new THREE.Color("#547da2")},
      cloudTint:{value:new THREE.Color("#c4cdd0")}, lightTint:{value:new THREE.Color("#fff2d8")},
      cloudCover:{value:.28}, darkness:{value:0}, skyGlow:{value:0}, cloudSpeed:{value:.34},
      skyFlash:{value:0}, stormTint:{value:0}
    });
    sky.material.fragmentShader = `
      uniform sampler2D cloudMap;
      uniform float cloudTime, cloudCover, darkness, skyGlow, cloudSpeed, skyFlash, stormTint;
      uniform vec3 horizonTint, zenithTint, cloudTint, lightTint;
    ` +
      sky.material.fragmentShader.replace("gl_FragColor = vec4( retColor, 1.0 );",`
        vec3 skyDir=normalize(vWorldPosition-cameraPosition);
        vec2 plane=skyDir.xz/max(.13,skyDir.y)*.17+vec2(.0016,.0006)*cloudTime*cloudSpeed;
        float cloud=texture2D(cloudMap,plane).r;
        float bank=texture2D(cloudMap,plane*.42+vec2(.18,.25)).r;
        float wisps=texture2D(cloudMap,plane*1.9+vec2(.69,.41)).r;
        float mask=smoothstep(.44-cloudCover*.25,.78-cloudCover*.29,cloud*.62+bank*.39+wisps*.14);
        mask=mix(mask,.53+mask*.41,smoothstep(.58,1.,cloudCover))*smoothstep(.009,.23,skyDir.y);
        float facing=max(0.,dot(skyDir,vSunDirection));
        float sunlight=pow(facing,7.);
        vec3 gradient=mix(horizonTint,zenithTint,pow(clamp(skyDir.y+.02,0.,1.),.45));
        gradient+=lightTint*sunlight*skyGlow*.49;
        retColor=mix(gradient,retColor,.21*(1.-darkness)*(1.-cloudCover));
        if (darkness>.8 && skyDir.y>.04) {
          vec2 starUV=vec2(atan(skyDir.z,skyDir.x)*104.,skyDir.y*192.);
          vec2 cell=floor(starUV);
          float r=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
          vec2 offset=vec2(fract(r*17.31),fract(r*29.4))*.64+.18;
          float star=(1.-smoothstep(.03,.17,length(fract(starUV)-offset)))*step(.978,r);
          retColor+=vec3(.49,.64,.95)*star*(.65+.35*sin(r*437.1+cloudTime*1.4))*smoothstep(.04,.22,skyDir.y);
        }
        float disk=smoothstep(mix(.99968,.99948,darkness),mix(.99983,.99962,darkness),facing);
        retColor+=lightTint*disk*(1.2+skyGlow*2.7)*(1.-cloudCover*.94);
        float rim=smoothstep(.36,.66,cloud*.71+bank*.29)-smoothstep(.58,.84,cloud);
        vec3 cloudColor=mix(cloudTint*.61,cloudTint*1.16,smoothstep(.29,.74,cloud*.70+bank*.30));
        cloudColor+=lightTint*sunlight*skyGlow*(.23+rim*.44);
        retColor=mix(retColor,cloudColor,mask*(.55+cloudCover*.42));
        retColor+=vec3(.23,.28,.48)*skyFlash;
        retColor=mix(retColor*.96,retColor*vec3(.46,.25,.69)+vec3(.026,.006,.053),stormTint*.78);
        gl_FragColor = vec4(retColor,1.0);
      `);
  }
  apply() {
    const s = this.settings.values;
    const shadows = s.shadows !== "off";
    this.gl.shadowMap.enabled = shadows;
    this.sun.castShadow = shadows;
    if (s.shadows !== this.shadowStyle) {
      this.shadowStyle = s.shadows;
      const res = s.shadows === "high" ? 2048 : 1024;
      this.sun.shadow.mapSize.set(res,res);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
      const radius = s.shadows === "high" ? 89 : 64;
      Object.assign(this.sun.shadow.camera,{ left:-radius, right:radius, top:radius, bottom:-radius });
      this.sun.shadow.camera.updateProjectionMatrix();
      this.gl.shadowMap.needsUpdate = true;
    }
    this.camera.far = Math.max(s.distance + 390,1000);
    this.camera.updateProjectionMatrix();
    this.scene.fog.density = 1.66 / s.distance;
    this.shading.uniforms.enabledAO.value=+(s.post && s.ao);
    this.shading.uniforms.vignette.value=+(s.post && s.vignette);
    this.shading.uniforms.farClip.value = this.camera.far;
    this.shading.enabled=s.post && (s.ao || s.vignette || s.blur || s.preset==="high" || s.preset==="ultra");
    this.bloom.enabled = s.post && s.bloom;
    this.fxaa.enabled = s.aa;
    this.resizePending = true;
  }
  resize() {
    this.resizePending = false;
    const width=Math.max(1,window.innerWidth),height=Math.max(1,window.innerHeight);
    const {preset,scale}=this.settings.values;
    const native=Math.min(devicePixelRatio||1,1.35,Math.sqrt(DRAW_PIXELS[preset]/(width*height)));
    const ratio=Math.max(.13,native*scale/100*(this.performanceScale??1));
    this.gl.setPixelRatio(ratio);
    this.gl.setSize(width,height,false);
    if (this.settings.values.post || this.settings.values.aa) {
      this.composer.setPixelRatio(ratio);
      this.composer.setSize(width,height);
      this.shading.uniforms.resolution.value.set(width*ratio,height*ratio);
      this.fxaa.material.uniforms.resolution.value.set(1/(width*ratio),1/(height*ratio));
    }
    this.camera.aspect = width / Math.max(height,1);
    this.camera.updateProjectionMatrix();
  }
  draw(focus, clock, dt, aerial) {
    if (this.resizePending) this.resize();
    this.gl.info.reset();
    this.cloudTime.value = clock;
    this.shadowClock -= dt;
    if (this.sun.castShadow && this.shadowClock <= 0) {
      const y = aerial ? Math.min(48,focus.y) : focus.y;
      const radius=this.sun.shadow.camera.right,texel=2*radius/this.sun.shadow.mapSize.x;
      this.shadowAnchor.set(Math.round(focus.x/texel)*texel,Math.round(y/texel)*texel,Math.round(focus.z/texel)*texel);
      this.sun.target.position.copy(this.shadowAnchor);
      this.sun.position.copy(this.sun.target.position).addScaledVector(this.sunDir,157);
      this.gl.shadowMap.needsUpdate = true;
      this.shadowClock=aerial?.30:this.shadowStyle==="low"?.19:.12;
    }
    if (this.settings.values.post || this.settings.values.aa) this.composer.render(dt);
    else this.gl.render(this.scene,this.camera);
  }
}

const DAYLIGHT = {
  dawn:{
    direction:[-.88,.20,.43], sun:"#ffba7b", sunlight:2.85, sky:"#748eac", horizon:"#dfaa92",
    cloud:"#a99cae", fill:"#b1bad1", ground:"#796958", ambient:1.33, exposure:1.08, haze:1.24, glow:.88, cover:.34
  },
  noon:{
    direction:SUN_DIRECTION, sun:"#fff1d8", sunlight:3.14, sky:"#5895bd", horizon:"#a8c6ce",
    cloud:"#d2dfe7", fill:"#e1eeff", ground:"#827762", ambient:1.24, exposure:1.08, haze:.91, glow:.43, cover:.25
  },
  afternoon:{
    direction:[-.76,.39,.52], sun:"#ffdfb4", sunlight:3.25, sky:"#5389b5", horizon:"#aec3cb",
    cloud:"#c2cedc", fill:"#c6dcf5", ground:"#8b7862", ambient:1.34, exposure:1.09, haze:.90, glow:.66, cover:.33
  },
  sunset:{
    direction:[.77,.16,-.61], sun:"#ff9a56", sunlight:3.55, sky:"#6d749b", horizon:"#d3987e",
    cloud:"#ba8b92", fill:"#a9aecf", ground:"#8e6d5e", ambient:1.38, exposure:1.09, haze:1.17, glow:1, cover:.40
  },
  overcast:{
    direction:[-.29,.63,.34], sun:"#c9d2d5", sunlight:1.04, sky:"#859199", horizon:"#aab4b4",
    cloud:"#8e999c", fill:"#d6e0e0", ground:"#827e70", ambient:1.80, exposure:1.04, haze:1.55, glow:.09, cover:.85
  },
  night:{
    direction:[.44,.54,-.67], sun:"#a1bcf5", sunlight:.66, sky:"#182742", horizon:"#384963",
    cloud:"#344258", fill:"#9eb9e6", ground:"#606578", ambient:1.30, exposure:1.01, haze:1.18, glow:.33, cover:.29
  }
};

const WEATHER = {
  clear:{ rain:0, fog:0, cover:0, wind:.34 },
  rain:{ rain:.77, fog:.25, cover:.60, wind:.93 },
  fog:{ rain:0, fog:1, cover:.31, wind:.18 },
  thunder:{ rain:1, fog:.34, cover:.80, wind:1.45 }
};

class Atmosphere {
  constructor(renderer,world) {
    this.renderer=renderer;
    this.world=world;
    this.u=world.climate;
    this.cameraDirection=vec();
    this.sunPoint=vec();
    this.up=vec(0,1,0);
    this.lampChoice=new Array(3).fill(null);
    this.lampDistance=new Float32Array(3);
    this.lamps=Array.from({length:3},()=>new THREE.PointLight("#ffd0a0",0,15,2));
    renderer.scene.add(...this.lamps);
    this.rain=this.lines(400,"#a6bfca",.50);
    this.bolt=this.lines(55,"#b9c9ff",1);
    this.bolt.material.color.setRGB(2.3,2.7,4.9);
    this.bolt.material.blending=THREE.AdditiveBlending;
    this.bolt.renderOrder=6;
    this.streaks=this.lines(80,"#d1e2e1",.31);
    this.trail=this.lines(80,"#bacfd1",.42,true);
    this.trailHistory=[[],[]];
    const mote=canvas2D(32),moteContext=mote.getContext("2d");
    const glow=moteContext.createRadialGradient(16,16,0,16,16,15.5);
    glow.addColorStop(0,"#fff");
    glow.addColorStop(.35,"#fffc");
    glow.addColorStop(1,"#fff0");
    moteContext.fillStyle=glow;
    moteContext.fillRect(0,0,32,32);
    this.moteMap=new THREE.CanvasTexture(mote);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute("position",new THREE.BufferAttribute(new Float32Array(128*3),3).setUsage(THREE.DynamicDrawUsage));
    this.embers=new THREE.Points(geometry,new THREE.PointsMaterial({
      color:"#ad87ff",map:this.moteMap,size:.29,transparent:true,opacity:.68,depthWrite:false,fog:false,blending:THREE.AdditiveBlending
    }));
    this.embers.layers.set(2);
    this.embers.frustumCulled=false;
    renderer.scene.add(this.embers);

    const sprite=canvas2D(128,64),ctx=sprite.getContext("2d");
    const image=ctx.createImageData(128,64),noise=new SimplexNoise({random:rng(3302)});
    for (let z=0;z<64;z++) for (let x=0;x<128;x++) {
      const dx=(x-64)/63,dz=(z-32)/31;
      const wisps=.62+noise.noise(x*.058,z*.109)*.31+noise.noise(x*.136,z*.24)*.14;
      const k=(z*128+x)*4;
      image.data.set([255,255,255,Math.round(255*wisps*(1-smooth(.10,1,Math.hypot(dx,dz))))],k);
    }
    ctx.putImageData(image,0,0);
    const fogMap=new THREE.CanvasTexture(sprite);
    const random=rng(22031);
    this.banks=[];
    for (let i=0;i<47;i++) {
      const x=lerp(-430,430,random()),z=lerp(-411,416,random());
      const y=world.terrain.height(x,z);
      if (y>14 || y<SEA-5 || world.buildings.locate(x,y,z)) continue;
      const mat=new THREE.SpriteMaterial({map:fogMap,transparent:true,depthWrite:false,fog:false});
      const cloud=new THREE.Sprite(mat),width=lerp(37,91,random()),height=lerp(4.1,11.8,random());
      cloud.scale.set(width,height,1);
      cloud.layers.set(2);
      cloud.renderOrder=3;
      renderer.scene.add(cloud);
      this.banks.push({cloud,x,y:Math.max(SEA,y)+height*.39,z,phase:random()*TAU});
    }
    this.menu();
  }
  lines(capacity,color,opacity,vertexColors=false) {
    const geometry=new THREE.BufferGeometry(),positions=new Float32Array(capacity*6);
    geometry.setAttribute("position",new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
    if (vertexColors) geometry.setAttribute("color",
      new THREE.BufferAttribute(new Float32Array(positions.length),3).setUsage(THREE.DynamicDrawUsage));
    geometry.setDrawRange(0,0);
    const mesh=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color,opacity,vertexColors,transparent:true,depthWrite:false}));
    mesh.frustumCulled=false;
    mesh.layers.set(2);
    this.renderer.scene.add(mesh);
    return mesh;
  }
  drawLines(mesh,count) {
    mesh.visible=count>0;
    mesh.geometry.setDrawRange(0,count*2);
    if (count) mesh.geometry.attributes.position.needsUpdate=true;
  }
  configure(daylight,weather) {
    this.daylight=daylight;
    this.weather=weather;
    this.profile=DAYLIGHT[daylight];
    this.conditions=WEATHER[weather];
    this.dayHorizon=new THREE.Color(this.profile.horizon).lerp(new THREE.Color("#7d8b95"),this.conditions.cover*.46);
    this.stormHorizon=new THREE.Color("#573b72");
    this.wetSky=new THREE.Color(this.profile.sky).lerp(new THREE.Color("#7c8b94"),this.conditions.cover*.51);
    const r=this.renderer,p=this.profile,w=this.conditions;
    r.sunDir.set(...p.direction).normalize();
    r.skyLight.color.set(p.fill);
    r.skyLight.groundColor.set(p.ground);
    r.sun.color.set(p.sun);
    r.gl.toneMappingExposure=p.exposure;
    r.shadowClock=0;
    r.sun.shadow.radius=weather==="clear" && daylight!=="overcast"?1:2.4;
    const sky=r.sky.material.uniforms;
    sky.sunPosition.value.copy(r.sunDir);
    sky.zenithTint.value.copy(this.wetSky);
    sky.horizonTint.value.copy(this.dayHorizon);
    sky.cloudTint.value.set(p.cloud).lerp(new THREE.Color("#747f8b"),w.cover*.46);
    sky.lightTint.value.set(p.sun);
    sky.cloudCover.value=clamp(p.cover+w.cover*.63,0,1);
    sky.darkness.value=+(daylight==="night");
    sky.skyGlow.value=p.glow*(1-w.cover*.76);
    this.u.wetness.value=w.rain;
    this.u.skyTint.value.copy(this.wetSky);
    this.u.sunTint.value.set(p.sun);
    this.u.sunDir.value.copy(r.sunDir);
    this.u.sunStrength.value=clamp(p.sunlight/3,0,1.15)*(1-w.cover*.64);
    const {asphalt,curb,sidewalk,warmGlass,fixture}=this.world.mats;
    const pavement=[asphalt,curb,sidewalk,this.world.buildings.apronMaterial];
    const reflection=daylight==="night"?.23:.40;
    for (const material of pavement) if (material) material.envMapIntensity=reflection*(1-w.rain*.44);
    warmGlass.emissiveIntensity=daylight==="night"?1.88:daylight==="sunset"?.42:daylight==="dawn"?.22:.016;
    warmGlass.opacity=daylight==="night"?.66:daylight==="sunset"?.43:.31;
    fixture.emissiveIntensity=daylight==="night"?1.8:daylight==="sunset" || daylight==="dawn"?.65:.07;
    this.stormBlend=0;
    this.precipAt=0;this.lampAt=0;
    this.flash=0;
    this.boltUntil=0;
    this.nextLightning=Infinity;
    this.nextTrail=0;
    this.trailHistory.forEach(side=>{side.length=0;});
    this.drawLines(this.trail,0);
    this.drawLines(this.bolt,0);
  }
  menu() {
    this.configure("afternoon","clear");
  }
  start(settings,random) {
    const days=["dawn","noon","afternoon","afternoon","sunset","overcast","night"];
    const weather=["clear","clear","clear","rain","fog","thunder"];
    this.configure(settings.daylight==="random"?choose(days,random):settings.daylight,
      settings.weather==="random"?choose(weather,random):settings.weather);
    this.random=rng(Math.floor(random()*4294967296));
    this.nextLightning=this.weather==="thunder"?lerp(8,15,this.random()):Infinity;
  }
  lightning(game) {
    const random=this.random,camera=this.renderer.camera.position;
    const sunward=this.renderer.camera.getWorldDirection(this.cameraDirection);
    const yaw=Math.atan2(sunward.z,sunward.x)+lerp(-.63,.63,random());
    const radius=lerp(125,330,random());
    const x=camera.x+Math.cos(yaw)*radius,z=camera.z+Math.sin(yaw)*radius;
    const impact=vec(x,Math.max(SEA,this.world.terrain.height(x,z)),z);
    const start=impact.clone().add(vec(lerp(-34,34,random()),Math.max(131,camera.y+24),lerp(-42,42,random())));
    const positions=this.bolt.geometry.attributes.position;
    let previous=start,count=0;
    const segment=(a,b)=>{
      positions.setXYZ(count*2,a.x,a.y,a.z);
      positions.setXYZ(count*2+1,b.x,b.y,b.z);
      count++;
    };
    for (let i=1;i<=15;i++) {
      const t=i/15,node=start.clone().lerp(impact,t);
      const width=(i===15?0:lerp(3.3,11.6,random()));
      node.x+=(random()-.5)*width*2;
      node.z+=(random()-.5)*width*2;
      segment(previous,node);
      if (i>2 && i<12 && i%2===0) {
        let tip=node;
        const sign=random()<.5?-1:1;
        for (let b=0;b<4;b++) {
          const branch=tip.clone().add(vec(sign*lerp(2.3,7.9,random()),-lerp(5,10,random()),lerp(-4.5,5,random())));
          segment(tip,branch);
          tip=branch;
        }
      }
      previous=node;
    }
    this.drawLines(this.bolt,count);
    this.boltUntil=game.clock+.47;
    game.audio.thunder(impact,camera);
  }
  updatePrecipitation(game,clock,camera,low) {
    const {conditions:w}=this;
    const count=w.rain>0?(low?102:this.renderer.settings.values.preset==="medium"?211:348):0;
    const positions=this.rain.geometry.attributes.position;
    const wind=this.u.windStrength.value;
    let visible=0;
    if (!this.shelter) for (let i=0;i<count;i++) {
      const wrap=value=>value-Math.floor(value);
      const x=camera.x+(wrap(hash(i,19)+clock*wind*.078+hash(i,66)*.07)-.5)*27;
      const z=camera.z+(wrap(hash(i,177)+clock*wind*.031)-.5)*27;
      const y=camera.y+wrap(hash(i,61)-clock*(1.00+hash(i,18)*.52))*17-6.9;
      if (y<Math.max(SEA,this.world.terrain.height(x,z))) continue;
      const length=.35+hash(i,775)*.61;
      positions.setXYZ(visible*2,x,y,z);
      positions.setXYZ(visible*2+1,x-wind*.27*length,y+length,z-wind*.13*length);
      visible++;
    }
    this.rain.material.opacity=w.rain*(low?.40:.49);
    this.drawLines(this.rain,visible);
    for (const {cloud,x,y,z,phase} of this.banks) {
      cloud.visible=w.fog>0 && dist(x,z,camera.x,camera.z)<240 && !this.shelter;
      if (!cloud.visible) continue;
      cloud.position.set(x+Math.sin(clock*.091+phase)*9,y+Math.cos(clock*.07+phase)*.64,z+Math.sin(clock*.053+phase)*5.4);
      cloud.material.color.copy(this.renderer.scene.fog.color);
      cloud.material.opacity=w.fog*(low?.49:.68)*(1-smooth(180,240,cloud.position.distanceTo(camera)));
    }
    if (game.match && !game.modal && game.match.age>=this.nextLightning) {
      this.lightning(game);
      this.nextLightning=game.match.age+lerp(19,37,this.random());
    }
    const bolt=Math.max(0,this.boltUntil-clock);
    this.bolt.visible=bolt>0;
    this.flash=bolt/.47*(.57+.43*Math.sin(bolt*29)**2);
    this.bolt.material.opacity=this.flash;
  }
  updateAirMotion(player,clock,camera,low) {
    const diving=player?.state==="dive",gliding=player?.state==="glide";
    const count=diving?Math.round((low?35:76)*smooth(13,32,Math.abs(player.vy))):0;
    const pos=this.streaks.geometry.attributes.position;
    for (let i=0;i<count;i++) {
      const a=hash(i,56)*TAU,r=lerp(3.5,16,hash(i,71));
      const y=camera.y+(hash(i,19)*23+clock*(22+hash(i,83)*9))%23-14;
      const x=camera.x+Math.cos(a)*r,z=camera.z+Math.sin(a)*r;
      pos.setXYZ(i*2,x,y,z);
      pos.setXYZ(i*2+1,x-Math.cos(a)*.09,y-lerp(.42,1.71,hash(i,62)),z-Math.sin(a)*.09);
    }
    this.drawLines(this.streaks,count);
    const add=gliding && clock>=this.nextTrail;
    if (add) this.nextTrail=clock+.044;
    const trail=this.trail.geometry.attributes,range=low?13:27;
    let cursor=0;
    this.trailHistory.forEach((side,i)=>{
      while (side.length && (side.length>range || clock-side[0].clock>1.34)) side.shift();
      if (add) {
        const p=player.model.glider.localToWorld(vec(i?2.29:-2.29,2.28,1.94));
        side.push({p,clock});
      }
      for (let j=1;j<side.length;j++) {
        if (side[j].clock-side[j-1].clock>.16) continue;
        for (const item of [side[j-1],side[j]]) {
          const fade=1-smooth(.07,1.30,clock-item.clock);
          trail.position.setXYZ(cursor,item.p.x,item.p.y-(clock-item.clock)*.24,item.p.z);
          trail.color.setXYZ(cursor++,fade*.69,fade*.85,fade);
        }
      }
    });
    if (cursor) trail.color.needsUpdate=true;
    this.drawLines(this.trail,cursor/2);
  }
  update(game,dt,aerial) {
    const {renderer:r,u,profile:p,conditions:w}=this;
    const camera=r.camera,position=camera.position,player=game.player,clock=game.clock;
    const low=r.settings.values.preset==="low";
    const grounded=player?.state==="ground";
    const indoors=grounded && position.y<this.world.terrain.height(position.x,position.z)+13;
    this.shelter=!!(indoors && this.world.collision.cast(position,this.up,10,"vision",false));
    const outside=!!(grounded && game.storm && !game.storm.contains(player.p.x,player.p.z));
    this.stormBlend=damp(this.stormBlend,+outside,4.3,dt);
    u.simTime.value=clock;
    u.stormShade.value=this.stormBlend;
    u.windStrength.value=w.wind*(.85+.23*Math.sin(clock*.81)+.15*Math.sin(clock*.263));
    if(clock>=this.precipAt) {
      this.precipAt=clock+(low?.052:.032);
      this.updatePrecipitation(game,clock,position,low);
    }
    if(r.settings.values.reducedMotion) {
      this.flash=Math.min(.25,this.flash*.36);
      this.bolt.visible=false;
    }
    this.updateAirMotion(r.settings.values.reducedMotion?null:player,clock,position,low);
    this.updateLamps(clock,position,aerial);
    r.sky.position.copy(position);
    const fog=r.scene.fog;
    fog.color.copy(this.dayHorizon).lerp(this.stormHorizon,this.stormBlend*.90);
    fog.density=(1.52/r.settings.values.distance)*p.haze+w.fog*.0058*(aerial?.54:1)+this.stormBlend*.0053;
    u.horizonTint.value.copy(fog.color);
    u.fogRate.value=fog.density;
    const sky=r.sky.material.uniforms;
    sky.cloudSpeed.value=u.windStrength.value;
    sky.skyFlash.value=this.flash;
    sky.stormTint.value=this.stormBlend;
    r.sun.intensity=p.sunlight*(1-w.cover*.75)*(1-this.stormBlend*.57)+this.flash*1.22;
    r.skyLight.intensity=p.ambient*(1-this.stormBlend*.45)+this.flash*.84;
    r.skyLight.color.set(p.fill).lerp(this.stormHorizon,this.stormBlend*.68);
    this.embers.visible=this.stormBlend>.03 && !this.shelter;
    if (this.embers.visible) {
      const positions=this.embers.geometry.attributes.position,count=low?55:positions.count;
      for (let i=0;i<count;i++) {
        const x=position.x+((hash(i,22)*32+clock*(.8+hash(i,95)*1.3))%32)-16;
        const z=position.z+((hash(i,83)*32+clock*.73)%32)-16;
        const y=position.y+((hash(i,45)*12+clock*(.5+hash(i,63)))%12)-6;
        positions.setXYZ(i,x,y,z);
      }
      this.embers.material.opacity=this.stormBlend*.68;
      this.embers.geometry.setDrawRange(0,count);
      positions.needsUpdate=true;
    }
    const post=r.shading.uniforms,high=["high","ultra"].includes(r.settings.values.preset);
    const motion=r.settings.values.blur && !r.settings.values.reducedMotion && r.settings.values.post;
    post.sprintBlur.value=damp(post.sprintBlur.value,motion && grounded?smooth(4.65,6.1,player.speed):0,8,dt);
    post.aimBlur.value=damp(post.aimBlur.value,motion && high && grounded && player.aiming && player.held()?.id!=="sniper"?1:0,9,dt);
    post.impact.value=motion?(player?.bigHit||0):0;
    post.shaftLight.value=0;
    if (high && !aerial && !this.shelter && this.daylight!=="night" && w.cover<.5) {
      camera.updateMatrixWorld();
      if (camera.getWorldDirection(this.cameraDirection).dot(r.sunDir)>.34 &&
          !this.world.collision.cast(position,r.sunDir,185,"vision")) {
        this.sunPoint.copy(position).addScaledVector(r.sunDir,680).project(camera);
        post.sunScreen.value.set(this.sunPoint.x*.5+.5,this.sunPoint.y*.5+.5);
        post.shaftLight.value=.22*p.glow*(1-w.fog*.66)*(1-this.stormBlend);
        post.shaftColor.value.copy(r.sun.color);
      }
    }
    if (post.aimBlur.value>.03) {
      camera.getWorldDirection(this.cameraDirection);
      const center=this.world.collision.cast(position,this.cameraDirection,160,"vision");
      post.aimDepth.value=damp(post.aimDepth.value,Math.max(3,center?.distance||160),11,dt);
    }
  }
  updateLamps(clock,camera,aerial) {
    if(clock<this.lampAt) return;
    this.lampAt=clock+.18;
    const strength=this.daylight==="night"?1:this.daylight==="sunset"?.38:this.conditions.cover>.5?.29:0;
    const distance=this.lampDistance,choice=this.lampChoice;
    distance.fill(30**2);choice.fill(null);
    if(strength && !aerial) for(const lamp of this.world.lights) {
      const d=lamp.position.distanceToSquared(camera);
      for(let i=0;i<3;i++) if(d<distance[i]) {
        for(let j=2;j>i;j--) {distance[j]=distance[j-1];choice[j]=choice[j-1];}
        distance[i]=d;choice[i]=lamp;break;
      }
    }
    this.lamps.forEach((light,i)=>{
      const lamp=choice[i];
      const budget=this.renderer.settings.values.preset==="low"?1:this.renderer.settings.values.preset==="medium"?2:3;
      light.visible=strength>0 && !aerial && i<budget;
      light.intensity=lamp?strength*lamp.strength*(1-smooth(420,900,distance[i])):0;
      if(lamp) light.position.copy(lamp.position);
    });
  }
}

function wetSurface(material,climate,amount) {
  const compile=material.onBeforeCompile, key=material.customProgramCacheKey();
  material.onBeforeCompile=shader=>{
    compile(shader);
    Object.assign(shader.uniforms,{
      wetness:climate.wetness, wetSky:climate.skyTint, rainTime:climate.simTime,
      puddleAmount:{value:amount}
    });
    shader.vertexShader="varying vec3 wetWorld;\n"+shader.vertexShader.replace("#include <worldpos_vertex>",`
      #include <worldpos_vertex>
      wetWorld=(modelMatrix*vec4(transformed,1.)).xyz;
    `);
    shader.fragmentShader=`
      varying vec3 wetWorld;
      uniform vec3 wetSky;
      uniform float wetness, rainTime, puddleAmount;
      float wetNoise(vec2 p) {
        vec2 cell=floor(p),f=fract(p);
        f=f*f*(3.-2.*f);
        float seed=dot(cell,vec2(17.17,41.87));
        vec4 corner=fract(sin(vec4(seed)+vec4(0.,17.17,41.87,59.04))*43758.54);
        return mix(mix(corner.x,corner.y,f.x),mix(corner.z,corner.w,f.x),f.y);
      }
    `+shader.fragmentShader.replace("#include <roughnessmap_fragment>",`
      #include <roughnessmap_fragment>
      float pool=0.;
      if (wetness>.01) {
        vec3 surfaceNormal=normalize(cross(dFdx(wetWorld),dFdy(wetWorld)));
        float slope=smoothstep(.85,.995,abs(surfaceNormal.y));
        vec2 p=wetWorld.xz*vec2(.39,.30);
        vec2 warped=p+vec2(wetNoise(p*.94),wetNoise(p*1.1+3.6))*.94;
        float lowSpot=wetNoise(warped)*.72+wetNoise(p*2.73)*.21+wetNoise(p*8.8)*.07;
        pool=smoothstep(.58,.73,lowSpot)*slope*wetness*puddleAmount;
        float damp=wetness*slope;
        diffuseColor.rgb*=1.-damp*.20-pool*.15;
        roughnessFactor=mix(roughnessFactor,.18,damp*.26+pool*.59);
      }
    `).replace("#include <opaque_fragment>",`
      if (pool>.02) {
        vec3 eye=normalize(cameraPosition-wetWorld);
        float glint=.085+.27*pow(1.-abs(eye.y),4.);
        vec2 cell=floor(wetWorld.xz*1.56);
        float r=fract(sin(dot(cell,vec2(19.77,26.21)))*1367.75);
        float life=fract(r+rainTime*(.63+r*.83));
        float ring=length(fract(wetWorld.xz*1.56)-vec2(.37+r*.24,.59-r*.22));
        float ripple=(1.-smoothstep(.012,.032,abs(ring-life*.31)))*life*(1.-life);
        outgoingLight=mix(outgoingLight,wetSky*.61,pool*glint)+wetSky*ripple*pool*.18;
      }
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey=()=>"grayline-wet-"+key;
  return material;
}

class Materials {
  constructor(climate,headless=false) {
    this.headless=headless;
    this.catalog = new Map();
    this.wood = this.textured("plank","#a58666",.88);
    this.cedar = this.textured("plank","#b38461",.87);
    this.siding = this.textured("siding","#a9ae9a",.87);
    this.brick = this.textured("brick","#9d7767",.91);
    this.plaster = this.textured("plaster","#d1c8b3",.97);
    this.concrete = this.textured("concrete","#9b9a8e",.94);
    this.shingle = this.textured("shingle","#555d62",.89);
    this.zinc = this.textured("seam","#617878",.76,.36);
    this.rustRoof = this.textured("seam","#995b45",.87,.17);
    this.steel = this.textured("steel","#818e8a",.71,.43);
    this.asphalt = wetSurface(this.textured("asphalt","#575b56",.98),climate,.86);
    this.curb = wetSurface(this.textured("concrete","#b0aa99",.96),climate,.46);
    this.sidewalk = wetSurface(this.concrete.clone(),climate,.56);
    this.bark = this.textured("bark","#a09a84",.97);
    this.rock = this.textured("rock","#858e8d",.98);
    this.grass = this.textured("grass","#839468",.98);
    this.dirt = this.textured("dirt","#a68969",.99);
    this.sand = this.textured("sand","#cfc2a4",.97);
    this.fixture = new THREE.MeshStandardMaterial({
      color:"#e8bf85", emissive:"#ffaf56", emissiveIntensity:.07, roughness:.58
    });
    this.glass = new THREE.MeshStandardMaterial({
      color:"#91becc", roughness:.16, metalness:.16, envMapIntensity:.68, transparent:true,
      opacity:.26, depthWrite:false, side:THREE.DoubleSide
    });
    this.warmGlass=this.glass.clone();
    this.warmGlass.emissive.set("#ffac58");
    this.warmGlass.emissiveIntensity=.016;
  }
  images(kind, size = 128) {
    const c = canvas2D(size), normal = canvas2D(size), rough = canvas2D(size);
    const ctx = c.getContext("2d"), nc = normal.getContext("2d"), rc = rough.getContext("2d");
    const color = ctx.createImageData(size,size), bumps = nc.createImageData(size,size), shine = rc.createImageData(size,size);
    const height = new Float32Array(size*size);
    const noise = new SimplexNoise({random:rng(kind.split("").reduce((seed,ch) => Math.imul(seed,31)+ch.charCodeAt(0),131))});
    const canStain=["siding","plaster","brick","concrete","seam"].includes(kind);
    for (let j=0;j<size;j++) for (let i=0;i<size;i++) {
      const x=i/size, z=j/size, k=j*size+i, pixel=hash(i,j,118);
      const n = noise.noise(x*7.7+1,z*7.7+11)*.5 + noise.noise(x*24,z*23)*.29 + (pixel-.5)*.28;
      let relief=n*.26, tone=n*.18, moss=0, stain=0;
      if (canStain) {
        const streak=noise.noise(x*43,z*3.1)*.37+noise.noise(x*9,z*6)*.37;
        stain=smooth(.17,.57,streak+n*.5);
      }
      switch (kind) {
        case "brick": case "shingle": {
          const rows=kind==="brick"? 7 : 8, cols=kind==="brick"? 4 : 6;
          const row=Math.floor(z*rows), col=x*cols+(row%2)*.5;
          const ux=col%1, uz=z*rows%1, edge=Math.min(ux,1-ux,uz,1-uz);
          const shape=smooth(.027,.073,edge);
          relief=shape*.58+n*.08;
          tone=lerp(-.32,(hash(Math.floor(col),row,33)-.45)*.4+n*.35,shape);
          break;
        }
        case "plank": case "siding": {
          const across = kind==="plank"?x*5:z*8;
          const seam=smooth(0,.065,across%1)*(1-smooth(.968,1,across%1));
          const grain=noise.noise(x*(kind==="plank"?48:4),z*(kind==="plank"?3:53));
          relief=seam*.25+grain*.095+n*.055;
          tone=-.30*(1-seam)+grain*.1+(hash(Math.floor(across),6)-.5)*.27+n*.13;
          break;
        }
        case "bark": {
          const ridges = noise.noise(x*36,z*4.5)+.45*noise.noise(x*75+42,z*7.8);
          relief=ridges*.32+n*.23;
          tone=ridges*.31+Math.sin(z*83+x*3)*.055+n*.19;
          break;
        }
        case "fabric": {
          const weave=(Math.sin(x*TAU*39)*Math.sin(z*TAU*51));
          const stitch=1-smooth(.008,.026,Math.abs((z*5%1)-.50));
          relief=n*.055+weave*.048+stitch*.06;
          tone=n*.09+weave*.04+stitch*.13;
          break;
        }
        case "steel": {
          const seam = Math.abs(Math.cos(x*TAU*7));
          const rib = smooth(.68,.98,seam);
          relief=rib*.26+n*.04;
          tone=-.16*rib+n*.10+(pixel-.5)*.09;
          break;
        }
        case "seam": {
          const panel=x*5, edge=Math.min(panel%1,1-panel%1);
          const rib=1-smooth(.013,.055,edge);
          const wear=noise.noise(x*40,z*3.2)*.11;
          relief=rib*.59+n*.04;
          tone=rib*-.24+(hash(Math.floor(panel),9)-.5)*.14+wear+n*.12;
          break;
        }
        case "plaster":
          relief=n*.068;
          tone=n*.11+(pixel-.5)*.105;
          break;
        case "asphalt": {
          const seam=Math.sin((x+noise.noise(x*8,z*7)*.058)*31)*Math.sin((z+noise.noise(x*8+19,z*7)*.084)*26);
          const crack=(1-smooth(.004,.042,Math.abs(seam)))*smooth(.11,.29,noise.noise(x*3+12,z*5));
          relief=pixel*.16+n*.055-crack*.16;
          tone=n*.16+(pixel-.5)*.38-crack*.52;
          break;
        }
        case "concrete":
          relief=pixel*.16+n*.055;
          tone=n*.16+(pixel-.5)*.19;
          break;
        case "rock":
          relief=n*.50+noise.noise(x*16+z*12,z*22)*.13;
          tone=n*.34+Math.sin(z*56+x*8+n*1.5)*.104;
          moss=smooth(.05,.47,n*.92+noise.noise(x*8+4,z*8-9)*.57);
          break;
        case "grass":
          relief=n*.16+pixel*.025;
          tone=n*.32+(pixel-.5)*.14;
          break;
        default:
          relief=n*.21+pixel*.065;
          tone=n*.24+(pixel-.5)*.22;
      }
      height[k] = relief;
      const gray=clamp(214+tone*151-stain*40,58,253),iron=kind==="steel"?164:232;
      color.data.set([gray*(1-moss*.28+stain*.025),gray*(1-moss*.105),gray*(1-moss*.43-stain*.08),255],k*4);
      const r=clamp(iron-tone*34+(pixel-.5)*22,80,255);
      shine.data.set([r,r,r,255],k*4);
    }
    // Wrap the stochastic color, height and roughness tails without changing the drawn seams.
    const blendPair=(a,b,weight)=>{
      const h=(height[a]+height[b])*.5;
      height[a]=lerp(height[a],h,weight);height[b]=lerp(height[b],h,weight);
      for(const data of [color.data,shine.data]) for(let k=0;k<3;k++) {
        const i=a*4+k,j=b*4+k,mid=(data[i]+data[j])*.5;
        data[i]=lerp(data[i],mid,weight);data[j]=lerp(data[j],mid,weight);
      }
    };
    for(let i=0;i<7;i++) for(let j=0;j<size;j++) {
      const weight=1-smooth(0,7,i);
      blendPair(j*size+i,j*size+size-1-i,weight);
      blendPair(i*size+j,(size-1-i)*size+j,weight);
    }
    const sample = (x,z) => height[((z+size)%size)*size+(x+size)%size];
    for (let j=0;j<size;j++) for (let i=0;i<size;i++) {
      const dx=(sample(i-1,j)-sample(i+1,j))*.81, dz=(sample(i,j+1)-sample(i,j-1))*.81;
      const len=Math.hypot(dx,dz,1);
      bumps.data.set([128+127*dx/len,128+127*dz/len,128+127/len,255],(j*size+i)*4);
    }
    ctx.putImageData(color,0,0);
    nc.putImageData(bumps,0,0);
    rc.putImageData(shine,0,0);
    const tex = (image,srgb=false) => {
      const map = new THREE.CanvasTexture(image);
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.anisotropy = 4;
      if (srgb) map.colorSpace = THREE.SRGBColorSpace;
      return map;
    };
    return { map:tex(c,true), normalMap:tex(normal), roughnessMap:tex(rough) };
  }
  textured(kind,color,roughness,metalness = 0) {
    if (!this.headless && !this.catalog.has(kind)) this.catalog.set(kind,this.images(kind,kind === "grass" || kind === "rock" ? 256 : 128));
    return new THREE.MeshStandardMaterial({
      ...this.catalog.get(kind), color, roughness, metalness, envMapIntensity:.40, normalScale:new THREE.Vector2(.66,.66)
    });
  }
  paint(color, roughness = .88, metalness = 0) {
    const key = color+"/"+roughness+"/"+metalness;
    if (!this.catalog.has(key)) {
      const material=new THREE.MeshStandardMaterial({ color,roughness,metalness,envMapIntensity:.42 });
      material.userData.batchPaint=true;
      this.catalog.set(key,material);
    }
    return this.catalog.get(key);
  }
}

// The same surveyed centerlines drive grading, surface paint, navigation and both maps.
const TOWN_GRID = { x:[-154,-81,-8], z:[-83,-40,-1], width:8.4 };
const NO_ROADS=[];
const RIVER = [[88,-465],[76,-397],[73,-337],[70,-284],[59,-209],[38,-151],[23,-88],[17,-12],[-22,61],[-81,126],[-130,166],[-158,215],[-227,273],[-302,322],[-376,371],[-416,416]];
const ROAD_ROUTES = [
  { kind:"dirt", width:5.7, place:4, points:[[-154,-83],[-168,-83],[-200,-99],[-226,-151],[-256,-193],[-267,-198],[-285,-198]] },
  { kind:"dirt", width:5.1, place:3, points:[[-81,-1],[-81,8],[-108,29],[-144,56],[-173,84],[-205,113],[-210.5,119],[-210.5,144],[-211,160],[-235,165]] },
  { kind:"trail", width:2.5, points:[[-211,160],[-189,160]] },
  { kind:"asphalt", width:7.4, points:[[54,-40],[73,-40],[94,-29],[121,-7],[148,16],[177,37],[177,77]] },
  { kind:"asphalt", width:6.3, place:2, points:[[177,77],[153,77],[119,77],[110,75]] },
  { kind:"dirt", width:5.5, place:1, points:[[177,37],[184,1],[197,-52],[208,-89],[207,-110],[205,-124],[231,-124],[260,-124]] },
  { kind:"dirt", width:4.5, points:[[205,-124],[184,-124]] },
  { kind:"dirt", width:4.8, place:7, points:[[260,-124],[285,-137],[321,-164],[350,-151],[369,-135],[379,-129],[389,-129]] },
  { kind:"asphalt", width:6.4, place:6, points:[[177,77],[228,79],[254,86],[269,89],[279,91],[320,91],[326,91]] },
  { kind:"asphalt", width:5.6, points:[[279,91],[275,110],[275,123],[291,128],[327,128],[358,128],[371,118],[371,69],[357,69]] },
  { kind:"dirt", width:5.9, place:5, points:[[177,77],[182,124],[194,169],[204,200],[224,219],[229,239],[229,259],[248,259]] },
  { kind:"dirt", width:3.7, points:[[229,239],[218,240],[211,240]] }
];
function segments(path) {
  return path.slice(1).map(([x,z],i) => {
    const [ax,az]=path[i], dx=x-ax, dz=z-az;
    return {ax,az,dx,dz,inv:1/(dx*dx+dz*dz)};
  });
}
function pathDistance(list,x,z) {
  let best=Infinity;
  for (const {ax,az,dx,dz,inv} of list) {
    const a=x-ax,b=z-az,t=clamp((a*dx+b*dz)*inv,0,1);
    best=Math.min(best,(a-dx*t)**2+(b-dz*t)**2);
  }
  return Math.sqrt(best);
}

class RoadNetwork {
  constructor() {
    this.nodes=new Map();
    this.edges=[];
    this.cells=new Map();
    this.placeNodes=new Map();
    this.walks=[];
    const town=(a,b)=>this.link(a,b,"town",TOWN_GRID.width);
    const {x,z}=TOWN_GRID;
    for (const row of z) for(let i=1;i<x.length;i++) town([x[i-1],row],[x[i],row]);
    for (const column of x) for(let i=1;i<z.length;i++) town([column,z[i-1]],[column,z[i]]);
    town([x[2],CROSSING.z],[CROSSING.west,CROSSING.z]);
    this.link([CROSSING.west,CROSSING.z],[CROSSING.east,CROSSING.z],"bridge",CROSSING.width);
    this.placeNodes.set(0,this.nodes.get(x[1]+","+z[1]));
    for (const {points,kind,width,place} of ROAD_ROUTES) {
      for(let i=1;i<points.length;i++) this.link(points[i-1],points[i],kind,width);
      if (place!=null) {
        const at=points.at(-1);
        this.placeNodes.set(place,this.nodes.get(at.join(",")));
      }
    }
  }
  node([x,z]) {
    const key=x+","+z;
    if (!this.nodes.has(key)) this.nodes.set(key,{x,z,links:[],y:0});
    return this.nodes.get(key);
  }
  link(from,to,kind,width) {
    const a=this.node(from),b=this.node(to),dx=b.x-a.x,dz=b.z-a.z;
    const length=Math.hypot(dx,dz);
    const edge={a,b,dx,dz,length,inv:1/(length*length),kind,half:width/2,grade:null};
    this.edges.push(edge);
    a.links.push(b); b.links.push(a);
    this.index(edge,edge.half+13);
  }
  index(edge,pad) {
    const {a,b}=edge;
    for(let z=Math.floor((Math.min(a.z,b.z)-pad)/32);z<=Math.floor((Math.max(a.z,b.z)+pad)/32);z++) {
      for(let x=Math.floor((Math.min(a.x,b.x)-pad)/32);x<=Math.floor((Math.max(a.x,b.x)+pad)/32);x++) {
        const key=x+","+z;
        if (!this.cells.has(key)) this.cells.set(key,[]);
        this.cells.get(key).push(edge);
      }
    }
  }
  grade(terrain) {
    this.plots=terrain.plots;
    const crossingY=terrain.plots[0].y+.059;
    for (const node of this.nodes.values()) {
      node.y=terrain.baseElevation(node.x,node.z);
      if (node.z===CROSSING.z && (node.x===CROSSING.west || node.x===CROSSING.east)) node.y=crossingY;
      if (node.x===-189 && node.z===160) node.y=terrain.plots[3].y;
      node.y=Math.max(SEA+.55,node.y);
    }
    const fixed=new Set([...this.nodes.values()].filter(node=>
      node.z===CROSSING.z && node.x>=CROSSING.west && node.x<=CROSSING.east ||
      terrain.plots.some(p=>Math.abs(node.x-p.x)<=p.rx-.7 && Math.abs(node.z-p.z)<=p.rz-.7)));
    for(let pass=0;pass<24;pass++) {
      for(const {a,b,length,kind} of this.edges) {
        if(kind==="town" || kind==="bridge") continue;
        const delta=b.y-a.y,excess=Math.abs(delta)-length*.186;
        if(excess<.001 || fixed.has(a) && fixed.has(b)) continue;
        const shift=excess*Math.sign(delta);
        if(!fixed.has(a)) a.y+=shift*(fixed.has(b)?1:.5);
        if(!fixed.has(b)) b.y-=shift*(fixed.has(a)?1:.5);
      }
    }
    for (const edge of this.edges) {
      const {a,b,kind,length}=edge;
      if (kind==="town" || kind==="bridge") continue;
      const count=Math.max(1,Math.ceil(length/4));
      const grade=edge.grade=new Float32Array(count+1);
      grade[0]=a.y; grade[count]=b.y;
      const step=length/count,maxRise=Math.max(.187,Math.abs(b.y-a.y)/length+.004)*step;
      for(let i=1;i<count;i++) {
        const t=i/count,x=lerp(a.x,b.x,t),z=lerp(a.z,b.z,t);
        const raw=(terrain.baseElevation(x,z)*2+terrain.baseElevation(x-edge.dx/count,z-edge.dz/count)+
          terrain.baseElevation(x+edge.dx/count,z+edge.dz/count))*.25;
        const remaining=(count-i)*maxRise;
        grade[i]=clamp(clamp(Math.max(SEA+.57,raw),b.y-remaining,b.y+remaining),grade[i-1]-maxRise,grade[i-1]+maxRise);
      }
    }
  }
  projection(edge,x,z) { return clamp(((x-edge.a.x)*edge.dx+(z-edge.a.z)*edge.dz)*edge.inv,0,1); }
  width(edge,t) {
    const buffer=edge.kind==="bridge" || edge.kind==="town"?0:1.3;
    return edge.half+buffer*(1-smooth(0,10,Math.min(t,1-t)*edge.length));
  }
  nearby(x,z) { return this.cells.get(Math.floor(x/32)+","+Math.floor(z/32)) || NO_ROADS; }
  graded(x,z,base) {
    const nearby=this.nearby(x,z);
    if(!nearby.length) return base;
    let total=0,height=0,blend=0,developed=0;
    for(const plot of this.plots) {
      const margin=Math.max(Math.abs(x-plot.x)-plot.rx,Math.abs(z-plot.z)-plot.rz);
      if(margin<9) developed=Math.max(developed,1-smooth(-3,9,margin));
    }
    for (const edge of nearby) {
      if (!edge.grade) continue;
      const t=this.projection(edge,x,z);
      const d=Math.hypot(x-edge.a.x-edge.dx*t,z-edge.a.z-edge.dz*t);
      const w=1-smooth(edge.half+1,edge.half+lerp(12,2.38,developed),d);
      if (w===0) continue;
      const f=t*(edge.grade.length-1),i=Math.min(edge.grade.length-2,Math.floor(f));
      const seam=(1-smooth(.1,edge.half+4,d))**2*2+.08;
      height+=w*seam*lerp(edge.grade[i],edge.grade[i+1],f-i);
      total+=w*seam;
      blend=Math.max(blend,w);
    }
    return total?lerp(base,height/total,blend):base;
  }
  surfaceAt(x,z,pad=0,includeWalks=true) {
    let nearest=null,best=Infinity;
    for (const edge of this.nearby(x,z)) {
      if (!includeWalks && edge.kind==="walk") continue;
      const t=this.projection(edge,x,z);
      const dx=x-edge.a.x-edge.dx*t,dz=z-edge.a.z-edge.dz*t;
      const d=dx*dx+dz*dz, width=this.width(edge,t)+pad;
      if (d<width*width && d<best) { nearest=edge; best=d; }
    }
    return nearest;
  }
  addWalk(points) {
    const edges=[];
    for(let i=1;i<points.length;i++) {
      const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z;
      const length=Math.hypot(dx,dz);
      if (length<.05) continue;
      const edge={a,b,dx,dz,length,inv:1/(length*length),kind:"walk",half:.83};
      this.walks.push(edge);
      edges.push(edge);
      this.index(edge,3);
    }
    return edges;
  }
  paint(terrain) {
    const size=1024,data=terrain.roadMap.image.data;
    const channel={asphalt:0,dirt:1,trail:1,walk:2};
    for(let j=0;j<size;j++) for(let i=0;i<size;i++) {
      const x=i-HALF+.5,z=j-HALF+.5,k=(j*size+i)*4;
      let asphalt=0,dirt=0,walk=0;
      for (const edge of this.nearby(x,z)) {
        const c=channel[edge.kind];
        if(c===undefined) continue;
        const t=this.projection(edge,x,z),width=this.width(edge,t);
        const d=Math.hypot(x-edge.a.x-edge.dx*t,z-edge.a.z-edge.dz*t);
        const value=1-smooth(width-.58,width+.79,d);
        if(c===0) asphalt=Math.max(asphalt,value);
        else if(c===1) dirt=Math.max(dirt,value);
        else walk=Math.max(walk,value);
      }
      data[k]=Math.round(255*asphalt);data[k+1]=Math.round(255*dirt);data[k+2]=Math.round(255*walk);
    }
    terrain.roadMap.needsUpdate=true;
  }
  draw(ctx,p,size) {
    ctx.lineCap="round";
    const colors={town:"#4a5554",asphalt:"#666b62",bridge:"#bcb19b",dirt:"#a79978",trail:"#a4987d",walk:"#a5a18a"};
    for (const edge of [...this.walks,...this.edges]) {
      ctx.strokeStyle=colors[edge.kind];
      ctx.lineWidth=Math.max(.52,edge.half*2/1024*size);
      ctx.beginPath();ctx.moveTo(p(edge.a.x),p(edge.a.z));ctx.lineTo(p(edge.b.x),p(edge.b.z));ctx.stroke();
    }
    ctx.lineCap="butt";
  }
}

class Terrain {
  constructor(scene,mats,climate,roads,headless=false) {
    this.climate=climate;
    this.roads=roads;
    this.n = new SimplexNoise({random:rng(ISLAND_SEED)});
    this.river = segments(RIVER);
    this.plots = PLACES.map(place => ({ ...place, y:Math.max(6,this.natural(place.x,place.z)) }));
    this.roads.grade(this);
    this.side = 513;
    this.heights = new Float32Array(this.side*this.side);
    for (let j=0;j<this.side;j++) for (let i=0;i<this.side;i++) this.heights[j*this.side+i]=this.elevation(i*2-HALF,j*2-HALF);
    const size=384, weights=new Uint8Array(size*size*4);
    for (let j=0;j<size;j++) for (let i=0;i<size;i++) {
      const x=(i+.5)/size*1024-HALF, z=(j+.5)/size*1024-HALF;
      const y=this.height(x,z), slope=this.slope(x,z);
      const sand=(1-smooth(2.15,6.6,y))*(1-smooth(.25,.86,slope)*.75);
      const rock=smooth(.29,.93,slope)*(1-sand);
      const dirt=(1-sand)*.09+(1-rock)*smooth(.1,.62,this.n.noise(x*.037,z*.037))*.21;
      const mix=[Math.max(0,1-sand-rock-dirt),dirt,rock,sand];
      const sum=mix.reduce((total,v)=>total+v,0);
      weights.set(mix.map(v=>Math.round(v/sum*255)),(j*size+i)*4);
    }
    this.splat = new THREE.DataTexture(weights,size,size);
    if(headless) return;
    const shore=Uint8Array.from(this.heights,y=>clamp(Math.round((y+5)*10),0,255));
    this.depth=new THREE.DataTexture(shore,this.side,this.side,THREE.RedFormat);
    this.roadMap=new THREE.DataTexture(new Uint8Array(1024*1024*4),1024,1024);
    for (const map of [this.splat,this.depth,this.roadMap]) {
      map.magFilter=THREE.LinearFilter;
      map.minFilter=THREE.LinearFilter;
      map.needsUpdate=true;
    }
    this.terrainMaterial = this.makeMaterial(mats);
    this.tiles = [];
    for (let j=0;j<8;j++) for (let i=0;i<8;i++) {
      const x=i*128-HALF,z=j*128-HALF;
      const mesh=new THREE.Mesh(this.tileGeometry(x,z,16),this.terrainMaterial);
      mesh.receiveShadow=true;
      scene.add(mesh);
      const precise=roads.edges.some(edge=>Math.max(edge.a.x,edge.b.x)>x-9 && Math.min(edge.a.x,edge.b.x)<x+137 &&
        Math.max(edge.a.z,edge.b.z)>z-9 && Math.min(edge.a.z,edge.b.z)<z+137);
      this.tiles.push({ mesh, x,z, levels:{16:mesh.geometry}, level:16, precise });
    }
    this.water=this.makeWater(mats);
    this.water.renderOrder=-10;
    scene.add(this.water);
  }
  fractal(x,z) {
    return this.n.noise(x,z)*.61+this.n.noise(x*2.06+48,z*2.06+33)*.27+
      this.n.noise(x*4.33-17,z*4.33+56)*.09+this.n.noise(x*8.5+72,z*8.5-13)*.03;
  }
  natural(x,z) {
    const wx=x+this.n.noise(x*.0057+4,z*.0057+87)*43;
    const wz=z+this.n.noise(x*.0057+43,z*.0057+11)*43;
    const r=Math.hypot(x/468,z/455);
    const coast=(1-r+this.n.noise(wx*.0068+92,wz*.0068)*.089)*445;
    const shelf=smooth(-21,87,coast);
    const hills=14+this.fractal(wx*.0086,wz*.0086)*30+this.fractal(wx*.0039+52,wz*.0039-17)*16;
    const axis=-280+Math.sin((x-15)*.012)*37;
    const ridge=Math.exp(-(((z-axis)/71)**2))*Math.exp(-(((x-145)/166)**2));
    const ridges=1-Math.abs(this.n.noise(wx*.0095+18,wz*.0095-42)*.86+this.n.noise(wx*.021+51,wz*.021)*.14);
    const quarry=clamp(1-dist(x,z,246,280)/94,0,1);
    const coastBed=2.85+clamp(coast*.17,-21,4);
    const ridgeFace=ridge*(46+53*ridges*ridges+9*this.n.noise(wx*.026,wz*.022));
    const headland=clamp(1-dist(x,z,381,-137)/49,0,1);
    let ground=lerp(coastBed,Math.max(5,hills),shelf)+shelf*(ridgeFace+headland*headland*7+
      quarry*quarry*(51+this.n.noise(wx*.025,wz*.025)*15));
    if (x>440 && z>-189 && z<-95) {
      for (const [px,pz,h,rx,rz] of [[460,-163,24,12,14],[475,-139,25,10,11],[481,-112,18,13,9]]) {
        const radius=Math.hypot((x-px)/rx,(z-pz)/rz);
        ground=Math.max(ground,coastBed+h*(1-smooth(.26,1.19,radius))+(1-smooth(0,1,radius))*this.n.noise(x*.13,z*.13)*4.2);
      }
    }
    const lakeR=Math.hypot((x+132)/72,(z-167)/58);
    const lake=1-smooth(.82,1.26,lakeR+.054*this.n.noise(x*.038,z*.038));
    const river=1-smooth(7.1,23,pathDistance(this.river,x,z)+this.n.noise(x*.031,z*.031)*1.75);
    const bed=SEA-3.45-this.n.noise(x*.05,z*.05)*.42;
    return lerp(lerp(ground,Math.min(ground,bed),river),bed,lake);
  }
  baseElevation(x,z) {
    let y=this.natural(x,z);
    for (const plot of this.plots) {
      const dx=Math.max(0,Math.abs(x-plot.x)-plot.rx), dz=Math.max(0,Math.abs(z-plot.z)-plot.rz);
      if (dx<=24 && dz<=24) y=lerp(plot.y,y,smooth(0,24,Math.hypot(dx,dz)));
    }
    if (x>=CROSSING.east-9 && x<=84) {
      const shoulder=1-smooth(4.6,12,Math.abs(z-CROSSING.z));
      y=lerp(y,this.plots[0].y+.065,(1-smooth(CROSSING.east-4,84,x))*shoulder);
    }
    if (x>CROSSING.west+3 && x<CROSSING.east-7 && Math.abs(z-CROSSING.z)<18) {
      y=Math.min(y,this.natural(x,z));
    }
    const {west,east,z:lakeZ,deck}=LAKE_ACCESS;
    if (x>=west-6 && x<=east+5) {
      const t=clamp((x-west)/(east-west),0,1);
      const approach=smooth(west-6,west,x)*(1-smooth(east+1,east+5,x));
      y=lerp(y,lerp(this.plots[3].y,deck,t),approach*(1-smooth(2.8,8.8,Math.abs(z-lakeZ))));
    }
    const quarry=this.plots[5],qz=z-quarry.z,qx=Math.abs(x-quarry.x);
    if (qz>=26 && qz<75 && qx<54) {
      const strength=(1-smooth(29,54,qx))*(1-smooth(62,75,qz));
      const face=quarry.y+3.1*smooth(29,34,qz)+5.0*smooth(43,47,qz)+4.7*smooth(55,59,qz);
      y=lerp(y,Math.max(y,face),strength);
    }
    return y;
  }
  elevation(x,z) { return this.roads.graded(x,z,this.baseElevation(x,z)); }
  height(x,z) {
    if (Math.abs(x)>HALF || Math.abs(z)>HALF) return -18;
    const fx=(x+HALF)*.5,fz=(z+HALF)*.5,i=Math.min(511,Math.floor(fx)),j=Math.min(511,Math.floor(fz));
    const offset=j*this.side+i;
    const u=fx-i,v=fz-j,a=this.heights[offset],b=this.heights[offset+1];
    const c=this.heights[offset+this.side],d=this.heights[offset+this.side+1];
    return u+v<=1 ? a+(b-a)*u+(c-a)*v : d+(c-d)*(1-u)+(b-d)*(1-v);
  }
  slope(x,z) {
    return Math.hypot(this.height(x+1,z)-this.height(x-1,z),this.height(x,z+1)-this.height(x,z-1))*.5;
  }
  surface(x,z) {
    const y=this.height(x,z);
    if (y<SEA-.09) return "water";
    const road=this.roads.surfaceAt(x,z,0,false);
    if (road && road.kind!=="bridge") return road.kind==="asphalt" || road.kind==="town"?"asphalt":"dirt";
    if (y<SEA+3.3) return "dirt";
    const i=clamp(Math.floor((x+HALF)/1024*384),0,383),j=clamp(Math.floor((z+HALF)/1024*384),0,383);
    const k=(j*384+i)*4;
    return this.splat.image.data[k+2]>137 ? "stone" : this.splat.image.data[k+1]>106 ? "dirt" : "grass";
  }
  makeMaterial(mats) {
    const m=mats.grass.clone();
    m.color.set("#ffffff");
    m.normalScale.set(.22,.22);
    m.onBeforeCompile = shader => {
      Object.assign(shader.uniforms,{
        groundSplat:{value:this.splat}, groundRoad:{value:this.roadMap}, roadGrain:{value:mats.asphalt.map}, grassColor:{value:mats.grass.color}, grassTex:{value:mats.grass.map},
        dirtColor:{value:mats.dirt.color}, dirtTex:{value:mats.dirt.map}, rockColor:{value:mats.rock.color},
        rockTex:{value:mats.rock.map}, sandColor:{value:mats.sand.color}, sandTex:{value:mats.sand.map}
      });
      shader.vertexShader = "varying vec3 groundWorld;\n"+shader.vertexShader.replace("#include <worldpos_vertex>",
        "#include <worldpos_vertex>\ngroundWorld=(modelMatrix*vec4(transformed,1.)).xyz;");
      shader.fragmentShader = `
        varying vec3 groundWorld;
        uniform sampler2D groundSplat, groundRoad, roadGrain, grassTex, dirtTex, rockTex, sandTex;
        uniform vec3 grassColor, dirtColor, rockColor, sandColor;
      vec3 groundSample(sampler2D tex, vec2 p, float scale, float blend) {
          vec2 a=p*scale;
          vec2 b=mat2(.83,.56,-.56,.83)*p*(scale*.63)+vec2(.27,.59);
          return mix(texture2D(tex,a).rgb,texture2D(tex,b).rgb,blend);
        }
      ` + shader.fragmentShader.replace("#include <map_fragment>",`
        vec2 mapUV=groundWorld.xz/1024.+.5;
        vec4 mixWeight=texture2D(groundSplat,mapUV);
        mixWeight/=max(.001,dot(mixWeight,vec4(1.)));
        vec2 pos=groundWorld.xz;
        float variation=sin(pos.x*.047+sin(pos.y*.059))*cos(pos.y*.044-pos.x*.021);
        float broad=sin(pos.x*.021+pos.y*.014)+.45*cos(pos.y*.036-pos.x*.029);
        float blend=.43+variation*.27;
        vec3 moss=mix(vec3(.74,.86,.82),vec3(1.16,1.08,.85),smoothstep(-.94,1.08,broad));
        vec3 grd=vec3(0.);
        if(mixWeight.r>.004) grd+=groundSample(grassTex,pos,.27,blend)*grassColor*moss*mixWeight.r;
        if(mixWeight.g>.004) grd+=groundSample(dirtTex,pos,.25,blend)*dirtColor*mixWeight.g;
        float fracture=sin(pos.x*.103+sin(pos.y*.087))*1.42+.87*cos(pos.y*.14+groundWorld.y*.17);
        float sediment=sin(groundWorld.y*.91+pos.x*.062-pos.y*.031+fracture+variation*.61);
        vec3 slate=mix(vec3(.84,.87,.93),vec3(1.12,1.08,1.01),smoothstep(-.71,.82,sediment));
        if(mixWeight.b>.004) grd+=groundSample(rockTex,vec2(pos.x+pos.y*.61,groundWorld.y+pos.y*.28),.21,blend)*rockColor*slate*mixWeight.b;
        if(mixWeight.a>.004) grd+=groundSample(sandTex,pos,.32,blend)*sandColor*mixWeight.a;
        vec3 road=texture2D(groundRoad,mapUV).rgb;
        if(max(road.g,road.b)>.005) {
          vec3 gravel=groundSample(dirtTex,pos,.38,blend)*vec3(.29,.22,.15)*(1.+variation*.13);
          grd=mix(grd,gravel,max(road.g*.95,road.b*.75));
        }
        if(road.r>.005) {
          vec3 pavement=groundSample(roadGrain,pos,.23,blend)*vec3(.135,.146,.144)*(1.+variation*.13);
          grd=mix(grd,pavement,road.r);
        }
        diffuseColor.rgb*=grd*(.98+variation*.12);
      `);
    };
    m.customProgramCacheKey=()=>"grayline-ground";
    return wetSurface(m,this.climate,.47);
  }
  tileGeometry(x,z,side) {
    const p=[],n=[],uv=[],idx=[],vertices=new Map(),step=64/side;
    const vertex=(i,j)=>{
      const key=i+j*65;
      if (vertices.has(key)) return vertices.get(key);
      const index=p.length/3,vx=x+i*2,vz=z+j*2;
      const dx=(this.height(vx-1,vz)-this.height(vx+1,vz))*.5;
      const dz=(this.height(vx,vz-1)-this.height(vx,vz+1))*.5;
      const len=Math.hypot(dx,1,dz);
      p.push(vx,this.height(vx,vz),vz);n.push(dx/len,1/len,dz/len);uv.push(vx*.23,vz*.23);
      vertices.set(key,index);
      return index;
    };
    for(let j=0;j<64;j+=step) for(let i=0;i<64;i+=step) {
      const a=vertex(i,j),b=vertex(i+step,j),c=vertex(i,j+step),d=vertex(i+step,j+step);
      if(step===1 || i>0 && j>0 && i+step<64 && j+step<64) { idx.push(a,c,b,c,d,b);continue; }
      const rim=[a];
      if(i===0) for(let k=1;k<step;k++) rim.push(vertex(i,j+k));
      rim.push(c);
      if(j+step===64) for(let k=1;k<step;k++) rim.push(vertex(i+k,j+step));
      rim.push(d);
      if(i+step===64) for(let k=step-1;k>0;k--) rim.push(vertex(i+step,j+k));
      rim.push(b);
      if(j===0) for(let k=step-1;k>0;k--) rim.push(vertex(i+k,j));
      const center=vertex(i+step/2,j+step/2);
      for(let k=0;k<rim.length;k++) idx.push(center,rim[k],rim[(k+1)%rim.length]);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute("position",new THREE.Float32BufferAttribute(p,3));
    g.setAttribute("normal",new THREE.Float32BufferAttribute(n,3));
    g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }
  warm() {
    for (const tile of this.tiles) {
      tile.levels[32]=this.tileGeometry(tile.x,tile.z,32);
      if (tile.precise) tile.levels[64]=this.tileGeometry(tile.x,tile.z,64);
    }
  }
  makeWater(mats) {
    const geometry=new THREE.PlaneGeometry(5200,5200);
    const mesh=new Reflector(geometry,{textureWidth:384,textureHeight:216,multisample:0,clipBias:.0006});
    const {tDiffuse,textureMatrix}=mesh.material.uniforms;
    mesh.material.dispose();
    mesh.rotation.x=-Math.PI/2;
    mesh.position.y=SEA;
    mesh.material=new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,
      uniforms:{
        ...this.climate,sea:{value:SEA},limit:{value:1050},heightfield:{value:this.depth},wave:{value:mats.sand.normalMap},
        tDiffuse,textureMatrix,reflection:{value:0}
      },
      vertexShader:`
        uniform mat4 textureMatrix;
        varying vec3 world;
        varying vec4 mirrorUV;
        void main(){
          vec4 local=vec4(position,1.);
          mirrorUV=textureMatrix*local;
          world=(modelMatrix*local).xyz;
          gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
        }
      `,
      fragmentShader:`
        varying vec3 world;
        varying vec4 mirrorUV;
        uniform float simTime, sea, fogRate, limit, reflection, sunStrength, windStrength, wetness, stormShade;
        uniform sampler2D heightfield, wave, tDiffuse;
        uniform vec3 horizonTint, skyTint, sunDir, sunTint;
        void main() {
          vec2 uv=world.xz/1024.+.5;
          float depth=sea-(texture2D(heightfield,(clamp(uv,0.,1.)*512.+.5)/513.).r*25.5-5.);
          if (abs(world.x)>512. || abs(world.z)>512.) depth=19.;
          if (depth<-.14) discard;
          vec2 p=world.xz;
          float time=simTime*(1.+windStrength*.35);
          vec2 w1=texture2D(wave,p*.24+vec2(time*.065,time*.031)).rg*2.-1.;
          vec2 w2=texture2D(wave,p*.128+vec2(-time*.046,time*.027)).rg*2.-1.;
          float phase=sin(p.x*.081+p.y*.109+time*.20)*.83+cos(p.x*.15-p.y*.202+time*.16)*.63;
          float ridge=sin(p.x*.51+p.y*.36-time*1.87+phase);
          float crossWave=sin(p.x*.21-p.y*.71-time*1.31-phase*.76);
          vec2 perturb=vec2((w1.x+w2.y)*.61+ridge*.068,(w1.y-w2.x)*.61+crossWave*.063)*(1.+windStrength*.45);
          vec3 normal=normalize(vec3(perturb.x,1.,perturb.y));
          vec3 v=normalize(cameraPosition-world);
          float fresnel=.083+.82*pow(1.-max(.01,dot(v,normal)),4.);
          vec3 r=reflect(-v,normal);
          vec3 reflected=mix(horizonTint,skyTint,smoothstep(0.,.94,r.y));
          if (reflection>.01 && mirrorUV.w>.001) {
            vec2 projected=mirrorUV.xy/mirrorUV.w;
            float edge=min(min(projected.x,projected.y),min(1.-projected.x,1.-projected.y));
            float factor=smoothstep(.008,.11,edge)*reflection;
            if (factor>.01) {
              vec2 distortion=perturb*.040*smoothstep(.08,1.0,depth);
              reflected=mix(reflected,texture2D(tDiffuse,clamp(projected+distortion,.001,.999)).rgb,factor*.94);
            }
          }
          float light=pow(max(0.,dot(r,sunDir)),mix(88.,29.,wetness));
          float tint=smoothstep(.20,6.5,depth);
          vec3 color=mix(vec3(.085,.31,.265),vec3(.017,.093,.127),tint);
          float exposure=clamp(sunStrength+.19,.39,1.);
          color*=exposure;
          float glitter=pow(max(0.,dot(reflect(-v,vec3(0.,1.,0.)),sunDir)),18.);
          color=mix(color,reflected,fresnel)+sunTint*(light*.91+glitter*.075)*sunStrength;
          float swell=.21+.10*sin(time*1.6+p.x*.49+p.y*.28)+w2.y*.35;
          float lip=1.-smoothstep(.045,max(.17,swell+.46),depth);
          float froth=smoothstep(-.35,.36,w1.x+w2.y+ridge*.23+crossWave*.13);
          float wash=1.-smoothstep(.13,.48,abs(depth-.65-ridge*.16-w2.y*.25));
          float foam=(lip+wash*.32)*(.32+.68*froth)*(.74+.26*sin(p.x*.83-p.y*.43+time*2.7));
          color=mix(color,vec3(.58,.67,.62)*exposure,foam*.65*smoothstep(-.26,.22,depth));
          color=mix(color,color*vec3(.54,.34,.73),stormShade*.77);
          float distanceToWater=length(cameraPosition-world),haze=distanceToWater*fogRate;
          color=mix(color,horizonTint,1.-exp(-haze*haze));
          gl_FragColor=vec4(color,1.-smoothstep(limit*.68,limit*.965,distanceToWater));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `
    });
    this.reflectionEnabled=false;
    this.reflectionAt=-Infinity;
    this.reflectionDirection=vec();
    const capture=mesh.onBeforeRender;
    mesh.onBeforeRender=(renderer,scene,camera)=>{
      if (!this.reflectionEnabled || camera.position.y<SEA+.13) return;
      const clock=this.climate.simTime.value;
      if (clock-this.reflectionAt>=this.reflectionInterval) {
        capture(renderer,scene,camera);
        this.reflectionAt=clock;
      }
      mesh.material.uniforms.reflection.value=this.reflectionBlend;
    };
    return mesh;
  }
  updateReflection(camera,clock,prefs,dt) {
    const pos=camera.position,d=camera.getWorldDirection(this.reflectionDirection);
    let wanted=false;
    if (prefs.reflections && !["low","medium"].includes(prefs.preset) && pos.y>SEA+.13 && pos.y<SEA+51 && d.y<.57) {
      // Only pay for a mirrored pass when there is water beneath the view or near the banks.
      for (const step of [3,17,35,64,104]) {
        if (wanted) break;
        for (const side of [0,-.37,.37]) {
          const x=pos.x+(d.x+d.z*side)*step,z=pos.z+(d.z-d.x*side)*step;
          if (this.height(x,z)<SEA+.22) { wanted=true; break; }
        }
      }
    }
    this.reflectionBlend=damp(this.reflectionBlend||0,+wanted,10,dt);
    this.reflectionInterval=prefs.preset==="medium"?.22:.145;
    this.reflectionEnabled=wanted;
    this.water.material.uniforms.reflection.value=this.reflectionBlend;
    if (clock-this.reflectionAt>.46) this.water.material.uniforms.reflection.value=0;
  }
  update(focus,clock,prefs,aerial) {
    const detail=prefs.preset !== "low";
    for (const tile of this.tiles) {
      const d=dist(focus.x,focus.z,tile.x+64,tile.z+64);
      tile.mesh.visible=d<prefs.distance+106;
      if (!tile.mesh.visible) continue;
      const near=tile.level===64?163:142;
      const level=(!aerial && d<(detail?near:Math.max(112,near-17))) || (tile.precise && d<(aerial?155:196)) ? 64 : d<(tile.level>=32?304:282) ? 32 : 16;
      if (level===tile.level) continue;
      tile.level=level;
      if (!tile.levels[level]) tile.levels[level]=this.tileGeometry(tile.x,tile.z,level);
      tile.mesh.geometry=tile.levels[level];
    }
    this.water.material.uniforms.limit.value=Math.max(1000,prefs.distance+390);
  }
}
// World geometry is written once. Each destructible part retains its vertex span in the batch.
function boxAt(x,y,z,w,h,d,rx=0,ry=0,rz=0) {
  const g=new THREE.BoxGeometry(w,h,d);
  const uv=g.attributes.uv;
  for (let i=0;i<24;i++) {
    const face=Math.floor(i/4);
    uv.setXY(i,uv.getX(i)*(face<2?d:w)/2.6,uv.getY(i)*(face===2 || face===3?d:h)/2.6);
  }
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x,y,z);
  return g;
}
function groundBox(x,y,z,w,h,d) {
  const g=boxAt(x,y,z,w,h,d);
  const {uv,position}=g.attributes;
  for (let i=8;i<12;i++) uv.setXY(i,position.getX(i)/2.6,position.getZ(i)/2.6);
  return g;
}
const bounds = (x,y,z,w,h,d) => new THREE.Box3(vec(x-w/2,y-h/2,z-d/2),vec(x+w/2,y+h/2,z+d/2));
function cylinderBetween(from,to,r1,r2,segments=7) {
  const d=to.clone().sub(from);
  const g=new THREE.CylinderGeometry(r2,r1,d.length(),segments);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(vec(0,1,0),d.normalize()));
  g.translate((from.x+to.x)*.5,(from.y+to.y)*.5,(from.z+to.z)*.5);
  return g;
}
function tintedGeometry(geometry,color) {
  const c=new THREE.Color(color), a=new Float32Array(geometry.attributes.position.count*3);
  for (let i=0;i<a.length;i+=3) a.set([c.r,c.g,c.b],i);
  geometry.setAttribute("color",new THREE.BufferAttribute(a,3));
  return geometry;
}
function mergeParts(parts) {
  const aligned=parts.map(g => {
    const copy=g.index?g.toNonIndexed():g;
    if (copy!==g) g.dispose();
    return copy;
  });
  const merged=mergeGeometries(aligned);
  for (const g of aligned) g.dispose();
  return merged;
}

class StaticBatches {
  constructor(scene,headless=false) {
    this.scene = scene;
    this.headless=headless;
    this.pending = new Map();
    this.paints = new Map();
    this.meshes = [];
  }
  put(shape,mat,x,z,node=null,cast=true) {
    if(this.headless) { shape.dispose(); return; }
    if (mat.userData.batchPaint) {
      const key=mat.roughness+"/"+mat.metalness;
      tintedGeometry(shape,mat.color);
      if (!this.paints.has(key)) {
        const paint=mat.clone();
        paint.color.set(0xffffff);
        paint.vertexColors=true;
        this.paints.set(key,paint);
      }
      mat=this.paints.get(key);
    }
    const key=Math.floor(x/108)+","+Math.floor(z/108)+":"+mat.uuid+":"+cast;
    if (!this.pending.has(key)) this.pending.set(key,{ mat, shapes:[], nodes:[], cast });
    const group=this.pending.get(key);
    const g=shape.index?shape.toNonIndexed():shape;
    if (g!==shape) shape.dispose();
    group.shapes.push(g);
    group.nodes.push(node);
  }
  commit() {
    for (const {mat,shapes,nodes,cast} of this.pending.values()) {
      const geometry=mergeGeometries(shapes);
      geometry.computeBoundingSphere();
      if(!geometry.boundingSphere || !Number.isFinite(geometry.boundingSphere.radius)) throw new Error("Invalid static batch geometry");
      const mesh=new THREE.Mesh(geometry,mat);
      mesh.castShadow=cast && !mat.transparent;
      mesh.receiveShadow=!mat.transparent;
      const position=geometry.attributes.position;
      const edits=nodes.some(Boolean);
      if (edits) position.setUsage(THREE.DynamicDrawUsage);
      let start=0;
      shapes.forEach((shape,index) => {
        const count=shape.attributes.position.count*3, node=nodes[index];
        if (node) node.spans.push({ position,start,count,original:position.array.slice(start,start+count) });
        start+=count;
        shape.dispose();
      });
      this.scene.add(mesh);
      this.meshes.push(mesh);
    }
    this.pending.clear();
  }
  update(focus,distance) {
    for(const mesh of this.meshes) {
      const bounds=mesh.geometry.boundingSphere;
      const limit=distance+bounds.radius+80;
      mesh.visible=(bounds.center.x-focus.x)**2+(bounds.center.z-focus.z)**2<limit*limit;
    }
  }
}

class Door {
  constructor(world,pos,axis,wide,material) {
    this.world=world;
    this.pos=pos;
    this.axis=axis;
    this.wide=wide;
    this.depth=.11;
    this.angle=0;
    this.yaw=axis==="x"?0:Math.PI/2;
    this.open=false;
    this.object=new THREE.Group();
    this.object.position.copy(pos);
    this.object.rotation.y=this.yaw;
    const panel=new THREE.Mesh(boxAt(wide*.5,1.03,0,wide,2.06,this.depth),material);
    panel.castShadow=panel.receiveShadow=true;
    const latch=new THREE.Mesh(boxAt(wide-.13,1.03,.071,.065,.08,.04),world.mats.paint("#a99e77",.43,.65));
    const latchOther=latch.clone();
    latchOther.position.z=-.142;
    const trims=[];
    for (const face of [-.061,.061]) {
      for (const x of [.108,wide-.108]) trims.push(boxAt(x,1.03,face,.058,1.81,.016));
      for (const y of [.15,.79,1.85]) trims.push(boxAt(wide*.5,y,face,wide-.19,.058,.016));
    }
    this.object.add(panel,new THREE.Mesh(mergeParts(trims),world.mats.cedar),latch,latchOther);
    world.scene.add(this.object);
    const localBox=bounds(wide*.5,1.03,0,wide,2.06,this.depth);
    const inverse=this.inverse=this.transform().clone().invert();
    const localRay=new THREE.Ray(),localPoint=vec();
    this.localBox=localBox;
    this.collider=world.collision.add(localBox.clone().applyMatrix4(this.transform()),{
      door:this,surface:"wood",noFloor:true,
      contains:(x,z,radius)=>{
        localPoint.set(x,pos.y,z).applyMatrix4(inverse);
        return world.collision.horizontalHit(localBox,localPoint.x,localPoint.z,radius);
      },
      intersect:(ray,point)=>{
        localRay.copy(ray).applyMatrix4(inverse);
        return localRay.intersectBox(localBox,point)?.applyMatrix4(this.object.matrixWorld) || null;
      }
    });
    this.target=this.object.localToWorld(vec(wide*.5,1.0,0));
  }
  transform() { this.object.updateMatrixWorld(); return this.object.matrixWorld; }
  set(open,audio) {
    if (this.open===open) return;
    this.open=open;
    this.world.onDoor?.(this.netId,open);
    audio?.event("door",this.target,.6);
  }
  update(dt) {
    const target=this.open ? -Math.PI/2 : 0;
    if (Math.abs(this.angle-target)<.002) return;
    this.angle=damp(this.angle,target,14,dt);
    if (Math.abs(this.angle-target)<.008) this.angle=target;
    this.object.rotation.y=this.yaw+this.angle;
    this.world.collision.remove(this.collider);
    this.collider.box.copy(this.localBox).applyMatrix4(this.transform());
    this.inverse.copy(this.object.matrixWorld).invert();
    this.collider.active=true;
    this.world.collision.insert(this.collider);
  }
  reset() { this.open=false; this.update(2); }
}

class Building {
  constructor(world,x,y,z,w,d,kind,style) {
    this.world=world;
    this.x=x; this.y=y; this.z=z;
    this.w=w; this.d=d;
    this.kind=kind;
    this.style=style;
    this.nodes=[];
    this.doors=[];
    this.trim=world.mats.paint("#ded5bd");
    this.plaster=world.mats.plaster;
    this.baseboard=world.mats.paint("#727063");
    world.noGrass.push({ x,z,rx:w/2+.22,rz:d/2+.25 });
  }
  at(x,y,z) { return vec(this.x+x,this.y+y,this.z+z); }
  box(x,y,z,w,h,d,mat,options={}) {
    const {world}=this, center=this.at(x,y,z);
    const { node=null, surface="concrete", solid=false, noFloor=false, cast=true, glass=false }=options;
    world.batches.put(boxAt(center.x,center.y,center.z,w,h,d),mat,this.x,this.z,node,cast);
    if (solid) {
      const collider=world.collision.add(bounds(center.x,center.y,center.z,w,h,d),{ node,surface,noFloor,glass,building:this });
      if (node) node.colliders.push(collider);
    }
  }
  geo(g,material,node=null,cast=true) {
    g.translate(this.x,this.y,this.z);
    this.world.batches.put(g,material,this.x,this.z,node,cast);
  }
  nav(x,y,z,links=[]) {
    const i=this.nodes.length;
    const position=this.at(x,y,z);
    this.nodes.push({ position, links:[...links] });
    for (const other of links) this.nodes[other].links.push(i);
    return i;
  }
  entrance(x,y,z,door,insideZ=z-2.45) {
    this.outside=this.nav(x,y,z);
    this.inside=this.nav(x,y,insideZ,[this.outside]);
    this.mainDoor=door;
    if(!["tower","lighthouse"].includes(this.kind)) {
      const m=this.world.mats;
      this.box(0,2.86,-.69,.31,.058,.31,m.fixture,{cast:false});
      this.world.lights.push({position:this.at(0,2.74,-.69),strength:39});
    }
  }
  floor(x,top,z,w,d,mat,surface="wood",thick=.24) {
    this.box(x,top-thick*.5,z,w,thick,d,mat,{solid:true,surface});
  }
  furniture(x,y,z,w,h,d,mat,surface="wood",node=null) {
    const index=surface==="metal"?2:surface==="stone"?1:0;
    const resource=node || this.world.resource(index,60,7);
    this.box(x,y,z,w,h,d,mat,{solid:true,surface,node:resource});
    return resource;
  }
  wall(axis,fixed,start,end,base,height,mat,surface,openings=[],interior=false) {
    const thickness=interior?.23:.28;
    const type=surface==="metal"?2:surface==="stone"?1:0;
    const node=this.world.resource(type,interior?96:surface==="wood"?145:204,interior?10:17);
    const panel=(a,b,y,h,depth=thickness,offset=0,material=mat,options={solid:true,surface,node,noFloor:true})=>{
      if (b-a<.005 || h<.005) return;
      const center=(a+b)/2;
      if (axis==="x") this.box(center,y+h/2,fixed+offset,b-a,h,depth,material,options);
      else this.box(fixed+offset,y+h/2,center,depth,h,b-a,material,options);
    };
    const stripe=(a,b,y,h,offset,material=this.trim,depth=.036) => panel(a,b,y,h,depth,offset,material,{node});
    const layer=(a,b,y,h) => {
      panel(a,b,y,h);
      if (interior || surface!=="metal") {
        const face=fixed>0?-1:1;
        stripe(a,b,y+.009,h-.018,face*(thickness*.5+.015),this.plaster,.028);
      }
      if (y===base && h>.1) {
        stripe(a,b,y+.016,.07,thickness*.5+.035,this.baseboard);
        stripe(a,b,y+.016,.07,-thickness*.5-.035,this.baseboard);
      }
      if (!interior && a===start && h>.42 && y===base) {
        const out=Math.sign(fixed)*(thickness*.5+.036);
        stripe(a,a+.17,y,h,out);
      }
      if (!interior && b===end && h>.42 && y===base) {
        const out=Math.sign(fixed)*(thickness*.5+.036);
        stripe(b-.17,b,y,h,out);
      }
    };
    let cursor=start;
    const sorted=[...openings].sort((a,b)=>a.center-b.center);
    for (let i=0;i<sorted.length;i++) {
      const opening=sorted[i],after=sorted[i+1];
      const {center,h,low,kind}=opening;
      const shared=after?(center+opening.w/2+after.center-after.w/2)/2-.07:end-.07;
      const a=Math.max(cursor+(i?.14:.07),center-opening.w*.5),b=Math.min(shared,center+opening.w*.5);
      const w=b-a;
      if(w<=.12) continue;
      layer(cursor,a,base,height);
      layer(a,b,base,low);
      layer(a,b,base+low+h,height-low-h);
      const edge=thickness*.5+.025;
      for (const offset of [-edge,edge]) {
        stripe(a-.065,a+.025,base+low-.025,h+.112,offset);
        stripe(b-.025,b+.065,base+low-.025,h+.112,offset);
        stripe(a-.065,b+.065,base+low+h-.012,.087,offset);
        if (kind==="window") stripe(a-.095,b+.095,base+low-.067,.082,offset,this.trim,.082);
      }
      if (kind==="window") {
        const glass=this.world.resource(0,1,0);
        glass.silent=true;
        node.attached.push(glass);
        const m=this.world.mats,lit=this.warmWindows!==false && hash(Math.round(this.x+a),Math.round(this.z+b),616)>.26;
        panel(a+.027,b-.027,base+low+.025,h-.05,.024,0,lit?m.warmGlass:m.glass,{ solid:true,node:glass,surface:"glass",glass:true,noFloor:true,cast:false });
        if (w>1.55) stripe(center-.027,center+.027,base+low,h,0,this.trim,.10);
        if (h>1.52 && w<3.8) stripe(a,b,base+low+h*.68,.043,0,this.trim,.095);
      }
      if (kind==="door") {
        const hinge=axis==="x"? this.at(a+.018,base,fixed) : this.at(fixed,base,b-.018);
        const door=new Door(this.world,hinge,axis,w-.036,this.doorMaterial || this.world.mats.wood);
        node.attachedDoors.push(door);
        this.world.doors.push(door);
        this.doors.push(door);
        opening.object=door;
      }
      cursor=b;
    }
    layer(cursor,end,base,height);
    return node;
  }
  stairs(x,y,z,dirX,dirZ,width,run,rise,steps,material,surface="wood") {
    const route=[];
    for (let i=0;i<steps;i++) {
      const stepLen=run/steps, along=stepLen*(i+.5), stepTop=y+rise*(i+1)/steps;
      const px=x+along*dirX,pz=z+along*dirZ;
      const w=Math.abs(dirZ)?width:stepLen, d=Math.abs(dirX)?width:stepLen;
      const thickness=surface==="metal"?.12:stepTop-y+.08;
      this.floor(px,stepTop,pz,w,d,material,surface,thickness);
      route.push(this.at(px,stepTop,pz));
    }
    return route;
  }
  rail(x,y,z,x2,z2,mat) {
    const w=Math.abs(x2-x),d=Math.abs(z2-z),items=Math.ceil((w+d)/.55);
    this.box((x+x2)*.5,y+.88,(z+z2)*.5,Math.max(.065,w),.075,Math.max(.065,d),mat,{solid:true,surface:"metal",noFloor:true});
    for (let i=0;i<=items;i++) this.box(lerp(x,x2,i/items),y+.45,lerp(z,z2,i/items),.054,.88,.054,mat,{solid:true,surface:"metal",noFloor:true});
  }
  roof(w,d,base,rise,cover,gable) {
    const half=w*.5+.39, slope=Math.atan2(rise,half), len=Math.hypot(half,rise);
    for (const side of [-1,1]) {
      const rot=-side*slope, center=this.at(side*half*.5,base+rise*.5,0);
      this.geo(boxAt(side*half*.5,base+rise*.5,0,len,.19,d+.83,0,0,rot),cover);
      const local=bounds(0,0,0,len,.19,d+.83);
      const matrix=new THREE.Matrix4().makeRotationZ(rot).setPosition(center), inverse=matrix.clone().invert();
      const ray=new THREE.Ray();
      this.world.collision.add(local.clone().applyMatrix4(matrix),{
        surface:"stone",
        heightAt:x=>this.y+base+rise-Math.abs(x-this.x)*rise/half+.105,
        bottomAt:x=>this.y+base+rise-Math.abs(x-this.x)*rise/half-.105,
        intersect:(r,out) => ray.copy(r).applyMatrix4(inverse).intersectBox(local,out)?.applyMatrix4(matrix)||null
      });
      const gutterA=this.at(0,0,0);
      gutterA.set(side*(half+.03),base-.06,-d/2-.42);
      const gutterB=vec(gutterA.x,gutterA.y,d/2+.43);
      this.geo(cylinderBetween(gutterA,gutterB,.085,.085,8),this.world.mats.steel);
      this.geo(cylinderBetween(vec(gutterA.x,.35,d/2+.23),vec(gutterA.x,base-.12,d/2+.23),.053,.053,7),this.world.mats.steel);
    }
    const gableProfile=[[-w/2,0],[w/2,0],[w/2,.19],[0,rise+.105],[-w/2,.19]];
    const shape=new THREE.Shape(gableProfile.map(([x,y])=>new THREE.Vector2(x,y)));
    shape.closePath();
    for (const side of [-1,1]) {
      const z=side*d*.5-.122,y=base-.043;
      const geo=new THREE.ExtrudeGeometry(shape,{depth:.245,bevelEnabled:false,steps:1});
      geo.translate(0,y,z);
      this.geo(geo,gable);
      const layers=[z,z+.245].map(depth=>gableProfile.map(([x,h])=>this.at(x,y+h,depth)));
      this.world.collision.add(new THREE.Box3().setFromPoints(layers.flat()),{
        surface:"wood",noFloor:true,intersect:(ray,point)=>{
          let result=null, distance=Infinity;
          for (const layer of layers) for (let i=1;i<layer.length-1;i++) {
            const hit=ray.intersectTriangle(layer[0],layer[i],layer[i+1],false,point);
            if (hit && hit.distanceToSquared(ray.origin)<distance) {
              distance=hit.distanceToSquared(ray.origin);
              result=hit.clone();
            }
          }
          return result?point.copy(result):null;
        }
      });
    }
    this.box(0,base+rise+.06,0,.19,.14,d+.82,cover);
  }
  lamp(x,y,z) {
    const m=this.world.mats;
    this.box(x,y+.14,z,.17,.075,.15,m.paint("#323d40",.65,.3));
    this.box(x,y,z+.028,.10,.21,.11,m.fixture,{cast:false});
    this.world.lights.push({position:this.at(x,y-.11,z+.28),strength:24});
    this.box(x,y-.13,z,.15,.062,.145,m.paint("#323d40",.65,.3));
  }
  rug(x,y,z,w,d,color) {
    const m=this.world.mats;
    const binding=m.paint("#c5b18a");
    this.box(x,y+.008,z,w,.015,d,m.paint(color),{cast:false});
    for (const side of [-1,1]) {
      this.box(x+side*(w/2-.12),y+.016,z,.047,.005,d-.13,binding,{cast:false});
      this.box(x,y+.016,z+side*(d/2-.09),w-.19,.005,.041,binding,{cast:false});
    }
  }
  bed(x,y,z) {
    const m=this.world.mats;
    const node=this.furniture(x,y+.28,z,1.38,.54,2.15,m.wood);
    this.box(x,y+.51,z,1.33,.19,2.09,m.paint("#bbb9a2"),{node});
    this.box(x,y+.61,z+.24,1.34,.075,1.53,m.paint("#68766f"),{node});
    this.box(x,y+.62,z-.71,.93,.11,.39,m.paint("#ccc5af"),{node});
    this.box(x,y+.60,z-1.01,1.43,.74,.10,m.wood,{node});
  }
  couch(x,y,z) {
    const m=this.world.mats, fabric=m.paint("#777663");
    const node=this.furniture(x,y+.27,z,2.22,.52,.92,fabric);
    this.box(x,y+.54,z-.34,2.20,.57,.22,fabric,{node,solid:true,surface:"wood"});
    for (const a of [-.99,.99]) this.box(x+a,y+.47,z,.23,.43,.84,fabric,{node});
    for (const a of [-.46,.46]) this.box(x+a,y+.56,z+.13,.83,.13,.53,m.paint("#8f8a73"),{node});
  }
  table(x,y,z) {
    const m=this.world.mats, node=this.furniture(x,y+.69,z,1.4,.10,.79,m.wood);
    for (const a of [-.59,.59]) for (const b of [-.31,.31]) this.box(x+a,y+.32,z+b,.08,.64,.08,m.wood,{node});
    for (const a of [-1.04,1.04]) {
      const chair=this.furniture(x+a,y+.37,z,.45,.13,.43,m.wood);
      this.box(x+a+Math.sign(a)*.19,y+.56,z,.07,.39,.43,m.wood,{node:chair,solid:true,surface:"wood"});
      for(const c of [-.16,.16]) for(const d of [-.16,.16]) this.box(x+a+c,y+.17,z+d,.052,.36,.052,m.wood,{node:chair});
    }
  }
  kitchen(x,y,z) {
    const m=this.world.mats, appliance=m.paint("#87918a",.43,.26);
    const fridge=this.furniture(x,y+.86,z,.79,1.72,.71,appliance,"metal");
    this.box(x,y+1.07,z+.364,.78,.025,.024,m.steel,{node:fridge});
    this.box(x-.28,y+.84,z+.375,.028,.34,.035,m.steel,{node:fridge});
    const cabinet=this.furniture(x+1.08,y+.44,z,1.27,.88,.66,m.wood);
    this.box(x+1.08,y+.916,z,1.34,.069,.72,m.concrete,{node:cabinet});
    this.box(x+1.01,y+.97,z,.46,.04,.36,m.steel,{node:cabinet});
    this.box(x+1.01,y+1.03,z-.10,.045,.16,.045,m.steel,{node:cabinet});
  }
  stash(kind,x,y,z) {
    this.world.stashes.push({ kind, position:this.at(x,y,z), building:this });
  }
}

const windowOpening=(center,w,h=1.18,low=.94)=>({center,w,h,low,kind:"window"});

class Buildings {
  constructor(world) {
    this.world=world;
    this.all=[];
    const [town,farm,gas,lake,woods,quarry,industry,point]=world.terrain.plots;
    const {mats}=world;
    const cream=mats.textured("siding","#cbbd98",.89);
    const blue=mats.textured("siding","#6d929d",.89);
    const green=mats.textured("siding","#839979",.88);
    const brick=mats.textured("brick","#a5725c",.94);
    const stone=mats.textured("concrete","#c4c2ac",.89);
    this.house(town,-58,-42,blue,true);
    this.bungalow(town,-22,-42,brick);
    this.modern(town,23,-42,stone);
    this.cabin(town,40,-42,green,mats.rustRoof);
    this.house(town,57,-42,cream,false);
    this.modern(town,-58,0,stone);
    this.house(town,-22,0,green,true);
    this.bungalow(town,23,0,cream);
    this.bungalow(town,-40,0,brick);
    this.shop(town,54,0,false);
    this.bungalow(town,-58,43,brick);
    this.cabin(town,-22,43,blue,mats.shingle);
    this.house(town,-40,43,cream,false);
    this.modern(town,23,43,stone);
    this.house(town,57,43,blue,false);
    this.townRoads(town);
    this.house(farm,-29,-12,cream,true);
    this.barn(farm,7,7);
    this.shed(farm,35,-17,10,8,mats.wood);
    this.shop(gas,-14,-9,true);
    this.shed(gas,22,-11,10,8,mats.steel);
    this.cabin(lake,-14,7,green,mats.zinc);
    this.cabin(lake,13,-9,blue,mats.rustRoof);
    this.shed(lake,-4,-17,8.8,7,mats.siding);
    this.cabin(woods,-13,2,mats.cedar,mats.zinc);
    this.cabin(woods,13,-9,green,mats.rustRoof);
    this.tower(quarry,-11,-5);
    this.shed(quarry,17,10,14,9,mats.steel);
    this.warehouse(industry,-22,-11);
    this.warehouse(industry,24,13);
    this.shed(industry,31,-23,12,8,mats.steel);
    this.lighthouse(point);
    this.crossing(town);
    this.roadDetails();
    this.streetscape(town);
    this.lakefront();
    this.farmyard(farm);
    this.camp(woods);
    this.quarryWorks(quarry);
    this.yard(industry);
  }
  newBuilding(plot,x,z,w,d,kind,mat) {
    const b=new Building(this.world,plot.x+x,plot.y,plot.z+z,w,d,kind,mat);
    this.all.push(b);
    return b;
  }
  house(plot,x,z,facade,upperLoot) {
    const b=this.newBuilding(plot,x,z,12.8,11.2,"house",facade), m=this.world.mats;
    const level=.32, upper=3.52, eave=6.77, w=b.w/2,d=b.d/2;
    const type=facade.map===m.brick.map?"stone":"wood";
    b.floor(0,level,0,b.w,b.d,m.wood,"wood",.32);
    b.box(0,.1025,0,b.w+.24,.205,b.d+.24,m.concrete,{solid:true,surface:"stone"});
    const frontDoor={ center:-2.03,w:1.25,h:2.09,low:0,kind:"door" };
    const window=(center,width=1.87,low=.93)=>({ center,w:width,h:1.15,low,kind:"window" });
    b.wall("x",d,-w,w,level,upper-level,facade,type,[window(-4.62,1.51),frontDoor,window(2.85,2.42)]);
    b.wall("x",-d,-w,w,level,upper-level,facade,type,[window(-3.12),window(2.29,1.3,1.12)]);
    b.wall("z",w,-d,d,level,upper-level,facade,type,[window(-2.73,1.62),window(2.56,1.33)]);
    b.wall("z",-w,-d,d,level,upper-level,facade,type,[window(-3.36,1.67),window(2.05,1.99)]);
    b.wall("x",d,-w,w,upper,eave-upper,facade,type,[window(-3.48),window(2.54)]);
    b.wall("x",-d,-w,w,upper,eave-upper,facade,type,[window(-2.64,2.03),window(2.99)]);
    b.wall("z",w,-d,d,upper,eave-upper,facade,type,[window(-2.11,1.63)]);
    b.wall("z",-w,-d,d,upper,eave-upper,facade,type,[window(-3.14,1.6),window(2.19,1.56)]);
    const gap={center:-2.0,w:1.23,h:2.08,low:0,kind:"opening"};
    b.wall("x",-.92,-6.25,2.83,level,3.02,m.siding,"wood",[gap],true);
    b.wall("z",.51,-5.46,-.9,level,3.02,m.siding,"wood",[{...gap,center:-3.45}],true);
    b.wall("x",-.51,-6.25,2.86,upper,3.15,m.siding,"wood",[gap],true);
    b.floor((-w+3.29)/2,upper,0,w+3.29,b.d,m.wood);
    b.floor((5.69+w)/2,upper,0,w-5.69,b.d,m.wood);
    b.floor(4.49,upper,(-d-1.91)/2,2.40,d-1.91,m.wood);
    b.floor(4.49,upper,(d+3.97)/2,2.40,d-3.97,m.wood);
    b.stairs(4.43,level,3.91,0,-1,1.85,5.82,upper-level,16,m.wood);
    b.rail(3.34,upper,-1.85,3.34,3.91,m.wood);
    b.rail(3.38,upper,3.97,5.69,3.97,m.wood);
    b.floor(0,eave+.05,0,b.w-.20,b.d-.19,m.plaster,"concrete",.13);
    b.box(-2.19,eave-.085,2.8,.46,.083,.44,m.paint("#bab6a4",.52));
    b.box(-2.10,eave-.082,-3.12,.40,.074,.40,m.paint("#c0b9a4",.54));
    const roof=upperLoot?m.shingle:m.zinc;
    b.roof(b.w,b.d,eave,upperLoot?2.63:2.20,roof,facade);
    b.box(0,eave+.84,d+.15,1.04,.63,.074,m.paint("#515a55"));
    for(let i=0;i<5;i++) b.box(0,eave+.62+i*.11,d+.197,1.01,.028,.055,b.trim);
    for (const side of [-1,1]) b.box(0,upper-.05,side*(d+.157),b.w,.138,.072,b.trim);
    b.box(3.96,8.01,-2.8,.73,2.12,.82,m.brick,{solid:true,surface:"stone"});
    b.box(3.96,9.09,-2.8,.91,.13,1.0,m.concrete);
    b.box(3.96,9.185,-2.8,.47,.083,.55,m.paint("#323633"));
    const front=this.porch(b,-2.03,upperLoot?6.7:4.65,2.2,level,roof);
    b.lamp(frontDoor.center+1.04,2.26,d+.20);
    b.table(-4.33,level,2.67);
    b.couch(1.02,level,2.63);
    b.kitchen(1.74,level,-4.86);
    b.bed(-4.70,level,-3.77);
    b.bed(-4.43,upper,-3.68);
    b.couch(.67,upper,2.55);
    b.rug(-1.96,level,2.3,1.22,2.62,"#815d51");
    b.furniture(1.99,upper+.5,-4.89,1.06,1,.54,m.siding);
    b.entrance(-2.03,level,front,frontDoor.object,d-.96);
    const hall=b.nav(-2.03,level,1.48,[b.inside]);
    const rear=b.nav(-2.03,level,-2.41,[hall]);
    const kitchen=b.nav(-.20,level,-3.45,[rear]);
    b.nav(1.47,level,-3.45,[kitchen]);
    const stairEntry=b.nav(4.43,level,4.65);
    const stairBottom=b.nav(4.43,level+.2,3.68,[stairEntry]);
    const stairMiddle=b.nav(4.43,level+1.6,1.05,[stairBottom]);
    const landing=b.nav(4.43,upper,-2.45,[stairMiddle]);
    const upperHall=b.nav(1.82,upper,-2.43,[landing]);
    const upperRear=b.nav(-2.03,upper,-2.32,[upperHall]);
    b.nav(-2.03,upper,1.4,[upperRear]);
    b.nav(.25,level,4.37,[hall,stairEntry]);
    b.stash("chest",upperLoot?-1.02:-.91,upperLoot?upper:level,upperLoot?-4.37:-3.84);
    b.stash("gun",-2.03,level,1.90);
    b.stash("ammo",1.7,upper,-3.69);
    b.stash("med",-.42,level,4.65);
    return b;
  }
  porch(b,x,width,depth,y,roof) {
    const m=this.world.mats, wall=b.d/2, front=wall+depth;
    b.floor(x,y,wall+depth/2,width,depth,m.cedar,"wood",Math.min(y,.27));
    const steps=Math.ceil(y/.175), run=steps*.34;
    b.stairs(x,0,front+run,0,-1,2.28,run,y,steps,m.wood);
    const awning=y+2.39;
    b.geo(boxAt(x,awning+.11,wall+depth*.51,width+.49,.155,depth+.56,.107),roof);
    b.box(x,awning-.015,front+.19,width+.44,.16,.145,b.trim);
    for (const side of [-1,1]) {
      const p=x+side*(width/2-.16);
      b.box(p,(y+awning)/2,front-.18,.19,awning-y,.19,m.cedar,{solid:true,surface:"wood",noFloor:true});
      b.box(p,y+.16,front-.18,.28,.32,.28,m.concrete);
      b.box(p,awning-.16,front-.18,.27,.17,.27,b.trim);
    }
    this.world.noGrass.push({x:b.x+x,z:b.z+wall+(depth+run)/2,rx:width/2,rz:(depth+run)/2});
    return front-.19;
  }
  bungalow(plot,x,z,facade) {
    const m=this.world.mats;
    const b=this.newBuilding(plot,x,z,15.2,10.4,"bungalow",facade),w=b.w/2,d=b.d/2;
    const y=.36,top=3.52,door={center:-2.30,w:1.28,h:2.11,low:0,kind:"door"};
    const surface=facade.map===m.brick.map?"stone":"wood";
    b.trim=m.paint("#c4bbaa");
    b.doorMaterial=m.textured("plank","#65796c",.86);
    b.floor(0,y,0,b.w,b.d,m.wood,"wood",.34);
    b.box(0,.115,0,b.w+.13,.23,b.d+.13,m.concrete);
    b.wall("x",d,-w,w,y,top-y,facade,surface,[windowOpening(-5.29,1.88),door,windowOpening(2.4,3.72,1.49,.74),windowOpening(5.92,1.4)]);
    b.wall("x",-d,-w,w,y,top-y,facade,surface,[windowOpening(-4.72,2.4),windowOpening(4.46,1.9)]);
    for (const side of [-1,1]) b.wall("z",side*w,-d,d,y,top-y,facade,surface,[windowOpening(-1.82,2.35),windowOpening(2.75,1.77)]);
    b.wall("x",-.96,-w+.14,-.49,y,top-y,m.siding,"wood",[{center:-3.38,w:1.23,h:2.09,low:0,kind:"opening"}],true);
    b.floor(0,top+.035,0,b.w-.19,b.d-.18,m.plaster,"concrete",.13);
    b.roof(b.w,b.d,top,1.48,m.shingle,facade);
    const front=this.porch(b,door.center,5.6,2.48,y,m.zinc);
    b.lamp(door.center+1.12,2.42,d+.17);
    for (const s of [-1,1]) {
      const px=s*(w-.97);
      b.furniture(px,.33,d+.82,1.18,.67,1.11,m.concrete,"stone");
      b.box(px,.68,d+.82,1.12,.045,1.04,m.dirt);
    }
    b.table(-5.16,y,2.41);
    b.couch(3.62,y,1.51);
    b.rug(2.72,y,3.24,2.56,1.63,"#766c63");
    b.kitchen(2.86,y,-4.42);
    b.bed(-5.62,y,-3.54);
    b.furniture(.88,y+.51,-4.61,1.16,1.02,.55,m.cedar);
    b.entrance(door.center,y,front,door.object,d-.98);
    const hall=b.nav(-2.28,y,.34,[b.inside]);
    const side=b.nav(.74,y,.34,[hall]);
    const back=b.nav(.63,y,-2.19,[side]);
    b.nav(-3.35,y,-2.68,[back]);
    b.stash("chest",-3.41,y,-3.67);
    b.stash("gun",.68,y,2.87);
    b.stash("ammo",5.82,y,-3.54);
    b.stash("med",.94,y,-2.76);
    return b;
  }
  modern(plot,x,z,facade) {
    const m=this.world.mats,cage=m.paint("#475b60",.72,.19),timber=m.textured("siding","#a27f60",.92);
    const b=this.newBuilding(plot,x,z,15.8,10.8,"modern",facade),w=b.w/2,d=b.d/2;
    const y=.25,up=3.49,roof=6.77;
    const door={center:-1.91,w:1.35,h:2.13,low:0,kind:"door"};
    b.trim=cage;
    b.warmWindows=false;
    b.doorMaterial=cage;
    b.floor(0,y,0,b.w,b.d,m.concrete,"concrete",.26);
    b.wall("x",d,-w,.12,y,up-y,facade,"stone",[windowOpening(-5.26,2.87,2.11,.44),door]);
    b.wall("x",d,.12,w,y,up-y,timber,"wood",[windowOpening(2.87,3.30,1.98,.49),windowOpening(6.23,1.38)]);
    b.wall("x",-d,-w,w,y,up-y,facade,"stone",[windowOpening(-4.38,3.22,1.80,.62),windowOpening(2.46,2.46,1.61,.73)]);
    for (const side of [-1,1]) b.wall("z",side*w,-d,d,y,up-y,facade,"stone",[windowOpening(-1.94,2.72,1.86,.57)]);
    b.wall("x",d,.12,w,up,roof-up,timber,"wood",[windowOpening(2.32,2.76,1.93,.63),windowOpening(6.19,1.69,1.66,.78)]);
    b.wall("x",-d,.12,w,up,roof-up,timber,"wood",[windowOpening(2.55,2.49),windowOpening(6.28,1.65)]);
    b.wall("z",w,-d,d,up,roof-up,timber,"wood",[windowOpening(-3.09,1.73),windowOpening(1.15,3.37,1.74,.67)]);
    b.wall("z",.12,-d,d,up,roof-up,facade,"stone",[{center:-2.56,w:1.57,h:2.16,low:0,kind:"opening"},windowOpening(1.71,2.14)]);
    b.floor((.02-w)/2,up,0,w+.02,b.d+.20,m.cedar,"wood",.26);
    b.floor((.02+4.70)/2,up,0,4.68,b.d,m.wood);
    b.floor((6.94+w)/2,up,0,w-6.94,b.d,m.wood);
    b.floor(5.82,up,(-d-1.98)/2,2.24,d-1.98,m.wood);
    b.floor(5.82,up,(d+3.97)/2,2.24,d-3.97,m.wood);
    b.stairs(5.82,y,3.97,0,-1,1.94,5.95,up-y,17,m.wood);
    b.rail(4.67,up,-1.26,4.67,3.93,cage);
    b.rail(4.7,up,3.97,6.92,3.97,cage);
    b.rail(-w+.13,up,-d+.13,-w+.13,d-.13,cage);
    for (const side of [-1,1]) b.rail(-w+.13,up,side*(d-.09),-.03,side*(d-.09),cage);
    b.floor((.02+w)/2,roof+.20,0,w+.63,b.d+.84,cage,"metal",.26);
    b.box((.06+w)/2,roof+.13,d+.44,w+.60,.23,.07,cage);
    b.floor(-.43,.25,d+1.03,5.73,2.06,m.concrete,"concrete",.23);
    b.floor(door.center,.125,d+2.27,2.04,.42,m.concrete,"concrete",.125);
    b.geo(boxAt(-.38,2.77,d+1.13,5.92,.20,2.65),cage);
    b.box(2.46,1.52,d+2.2,.18,2.54,.17,cage,{solid:true,surface:"metal",noFloor:true});
    for(let i=0;i<7;i++) b.box(2.37,2.31-i*.243,d+1.29,.10,.054,1.98,m.cedar);
    b.lamp(door.center+1.07,2.26,d+.18);
    b.table(-4.97,y,2.32);
    b.couch(-5.15,y,-2.38);
    b.kitchen(.67,y,-4.66);
    b.rug(-4.86,y,-.98,2.78,1.37,"#516662");
    b.bed(2.32,up,3.53);
    b.furniture(-6.13,up+.34,-1.61,1.32,.68,1.05,m.cedar);
    b.entrance(door.center,y,d+1.95,door.object,d-1.00);
    const hall=b.nav(-1.92,y,.48,[b.inside]);
    const stairs=b.nav(5.83,y,4.60,[hall]);
    const entry=b.nav(5.82,y+.19,3.74,[stairs]);
    const mid=b.nav(5.82,y+1.67,1.01,[entry]);
    const top=b.nav(5.82,up,-2.47,[mid]);
    const upper=b.nav(2.31,up,-2.60,[top]);
    const deck=b.nav(-1.46,up,-2.61,[upper]);
    b.nav(-5.67,up,-2.61,[deck]);
    b.nav(2.35,up,1.65,[upper]);
    b.stash("chest",-6.82,up,-3.48);
    b.stash("gun",-2.45,y,-2.85);
    b.stash("ammo",2.3,up,1.68);
    b.stash("med",3.12,y,2.25);
    return b;
  }
  cabin(plot,x,z,facade,roof) {
    const m=this.world.mats;
    const b=this.newBuilding(plot,x,z,12.6,9.75,"cabin",facade),w=b.w/2,d=b.d/2;
    const y=.58,eave=3.88,rise=3.33,door={center:.02,w:1.36,h:2.09,low:0,kind:"door"};
    b.trim=m.paint("#5d4c3c");
    b.doorMaterial=m.cedar;
    b.floor(0,y,0,b.w,b.d,m.cedar,"wood",.24);
    for (const u of [-w+.61,0,w-.61]) for (const v of [-d+.62,d-.62]) b.box(u,.21,v,.91,.42,.91,m.concrete);
    b.wall("x",d,-w,w,y,eave-y,facade,"wood",[windowOpening(-3.56,3.42,1.91,.54),door,windowOpening(3.53,3.44,1.91,.54)]);
    b.wall("x",-d,-w,w,y,eave-y,facade,"wood",[windowOpening(-3.78,1.69),windowOpening(2.97,2.52,1.24)]);
    for (const side of [-1,1]) b.wall("z",side*w,-d,d,y,eave-y,facade,"wood",[windowOpening(-1.26,2.43,1.33)]);
    b.roof(b.w,b.d,eave,rise,roof,facade);
    for (const side of [-1,1]) {
      const trimZ=side*(d+.147);
      b.box(0,eave+.92,trimZ,.21,1.84,.125,b.trim);
      b.geo(boxAt(side*b.w*.258,eave+rise*.51,d+.20,Math.hypot(w+.22,rise),.14,.17,0,0,-side*Math.atan2(rise,w+.22)),b.trim);
    }
    b.box(0,eave-.13,d+.20,b.w,.17,.16,b.trim);
    const front=this.porch(b,.02,8.22,2.29,y,roof);
    b.lamp(-.98,2.66,d+.18);
    b.lamp(1.10,2.66,d+.18);
    b.couch(-3.66,y,.38);
    b.rug(-2.97,y,2.43,2.49,1.37,"#825f47");
    b.table(3.41,y,1.94);
    b.kitchen(-4.98,y,-4.19);
    b.bed(4.74,y,-3.22);
    b.entrance(.02,y,front,door.object,d-1.15);
    const hall=b.nav(.07,y,.37,[b.inside]);
    const back=b.nav(.80,y,-2.72,[hall]);
    b.nav(3.60,y,-2.51,[back]);
    b.stash("chest",.80,y,-3.43);
    b.stash("gun",-.99,y,2.87);
    b.stash("ammo",2.57,y,-2.53);
    return b;
  }
  shop(plot,x,z,gas) {
    const b=this.newBuilding(plot,x,z,18.4,12.4,"shop",this.world.mats.brick),m=this.world.mats;
    const y=.18,h=3.65,w=b.w/2,d=b.d/2;
    b.floor(0,y,0,b.w,b.d,m.concrete,"concrete",.18);
    const door={center:-4.76,w:1.56,h:2.14,low:0,kind:"door"};
    const frontGlass=[-7.27,-2.04,1.5,5.77].map(center=>({center,w:2.51,h:2.09,low:.43,kind:"window"}));
    b.wall("x",d,-w,w,y,h-y,m.concrete,"stone",[door,...frontGlass]);
    b.wall("x",-d,-w,w,y,h-y,m.brick,"stone");
    b.wall("z",-w,-d,d,y,h-y,m.brick,"stone");
    b.wall("z",w,-d,d,y,h-y,m.brick,"stone",[{center:-2,w:1.63,h:1.2,low:1.04,kind:"window"}]);
    b.floor(0,h+.2,0,b.w+.62,b.d+.45,m.asphalt,"concrete");
    for (const s of [-1,1]) {
      b.box(0,h+.38,s*d,b.w+.4,.43,.22,m.brick,{solid:true,surface:"stone"});
      if(s<0) b.box(s*w,h+.38,0,.22,.43,b.d,m.brick,{solid:true,surface:"stone"});
      else {
        for(const [start,end] of [[-d,-3.52],[-1.84,d]]) b.box(w,h+.38,(start+end)/2,.22,.43,end-start,m.brick,{solid:true,surface:"stone"});
      }
    }
    b.floor(10.4,y,6.0,1.95,.59,m.concrete,"concrete",.18);
    b.floor(10.28,h+.2,-2.68,2.22,1.55,m.steel,"metal");
    b.stairs(10.40,y,5.75,0,-1,1.85,7.75,h+.2-y,22,m.steel,"metal");
    b.rail(11.33,h+.2,-3.41,11.33,-1.95,m.steel);
    b.box(2.9,h+.66,-3.42,2.26,.90,1.22,m.steel,{solid:true,surface:"metal"});
    for (let i=0;i<6;i++) b.box(2.02+i*.35,h+1.124,-3.42,.043,.023,.85,m.paint("#393f3c"));
    b.box(-7.1,2.27,5.91,1.2,.12,.84,m.siding);
    const counter=b.furniture(-4.94,y+.56,-1.3,5.03,1.12,1.01,m.wood);
    b.box(-4.94,y+1.14,-1.3,5.17,.085,1.08,m.concrete,{node:counter});
    b.box(-6.16,y+1.29,-1.29,.33,.22,.24,m.paint("#373e38"),{node:counter});
    for (const a of [.0,3.04,6.12]) {
      for (let i=0;i<4;i++) b.furniture(a,y+.22+i*.51,-2.21,1.59,.085,.94,m.steel,"metal");
      for (const side of [-1,1]) {
        b.box(a+side*.79,y+1,-2.21,.065,2,.94,m.steel,{solid:true,surface:"metal"});
        for (let level=0;level<3;level++) for (let j=0;j<3;j++) {
          b.box(a+side*.29+j*.15-.14,y+.39+level*.51,-2.09,.103,.22,.19,m.paint(["#b0a58b","#7c8e7c","#866253"][j]));
        }
      }
    }
    const fascia=m.paint(gas?"#80584a":"#4c6764",.76,.13);
    b.box(0,3.53,d+.23,b.w+.34,.73,.24,fascia);
    this.sign(b,0,3.56,d+.365,gas?"MILEPOST 6":"SWITCHBACK SUPPLY",gas?7.8:9.45,.56);
    b.geo(boxAt(0,2.86,d+.99,b.w+.28,.14,2.11,.061),m.zinc);
    b.box(0,2.81,d+1.96,b.w+.27,.14,.12,fascia);
    for (const px of [-7.8,.15,7.84]) b.lamp(px,2.61,d+.22);
    b.entrance(-4.76,y,d+1.4,door.object);
    const hall=b.nav(-4.76,y,1.2,[b.inside]);
    b.nav(1.76,y,.48,[hall]);
    const aisle=b.nav(-1.45,y,-.28,[hall]);
    const back=b.nav(-1.45,y,-4.26,[aisle]);
    b.nav(4.43,y,-4.26,[back]);
    const clear=b.nav(10.40,gas?.043:0,7.71,[b.outside]);
    const stair=b.nav(10.40,y,6.03,[clear]);
    const firstTread=b.nav(10.40,y+(h+.2-y)/22,5.59,[stair]);
    const stairTop=b.nav(10.40,h+.2,-2.65,[firstTread]);
    b.nav(7.24,h+.2,-2.65,[stairTop]);
    b.stash("chest",-.85,y,-4.80);
    b.stash("gun",2.15,y,.66);
    b.stash("ammo",6.34,y,-4.7);
    b.stash("chest",1.22,h+.2,-3.4);
    if (gas) {
      b.floor(0,.043,15.6,26.5,16,m.asphalt,"concrete",.043);
      b.box(0,3.76,16.2,21.2,.38,8.3,m.zinc);
      b.box(0,3.75,20.40,21.27,.45,.135,fascia);
      b.box(0,3.88,20.49,21.29,.064,.028,m.paint("#d4bf96"));
      this.sign(b,0,3.74,20.505,"MILEPOST 6   /   FUEL",7.8,.34);
      for (const px of [-8.91,8.91]) for (const pz of [13.2,19.3]) {
        b.box(px,1.8,pz,.28,3.6,.28,m.concrete,{solid:true,surface:"stone"});
      }
      for (const px of [-6,-1.9,2.1,6.2]) {
        b.floor(px,.13,16.1,2.26,1.56,m.concrete,"concrete",.13);
        b.furniture(px,.78,16.1,.55,1.42,.46,m.paint("#92746a"),"metal");
        b.box(px,1.15,16.346,.34,.257,.028,m.paint("#303a37"));
        b.geo(cylinderBetween(vec(px+.31,1.34,16.27),vec(px+.55,.49,16.27),.024,.024,6),m.paint("#2c302d"));
      }
      this.world.noGrass.push({x:b.x,z:b.z+15.6,rx:13.3,rz:8.0});
    }
    return b;
  }
  sign(b,x,y,z,label,width,height) {
    if(this.world.headless) return;
    const c=canvas2D(512,64),ctx=c.getContext("2d");
    ctx.fillStyle="#3c4841";
    ctx.fillRect(0,0,512,64);
    ctx.strokeStyle="#b6af8f";
    ctx.lineWidth=2;
    ctx.strokeRect(4,4,504,56);
    ctx.font="700 35px system-ui";
    ctx.textBaseline="middle";
    ctx.textAlign="center";
    ctx.fillStyle="#e1d6bc";
    ctx.fillText(label,256,33,478);
    const map=new THREE.CanvasTexture(c);
    map.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshStandardMaterial({map,roughness:.88});
    const g=new THREE.PlaneGeometry(width,height);
    g.translate(x,y,z);
    b.geo(g,material,null,false);
  }
  warehouse(plot,x,z) {
    const b=this.newBuilding(plot,x,z,26.5,20.1,"warehouse",this.world.mats.steel),m=this.world.mats,w=b.w/2,d=b.d/2;
    b.floor(0,.18,0,b.w,b.d,m.concrete,"concrete",.18);
    b.wall("x",d,-w,w,.18,5.85,m.steel,"metal",[{center:0,w:5.1,h:3.4,low:0,kind:"opening"}]);
    b.wall("x",-d,-w,w,.18,5.85,m.steel,"metal");
    const windows=[-6,0,6].map(center=>({center,w:2.16,h:.81,low:3.85,kind:"window"}));
    for (const s of [-1,1]) b.wall("z",s*w,-d,d,.18,5.85,m.steel,"metal",windows);
    for (let i=0;i<10;i++) b.box(0,2.55+i*.156,d+.038,5.04,.151,.13,m.steel,{solid:true,surface:"metal",noFloor:true});
    for (const s of [-1,1]) {
      b.box(s*2.6,2.11,d+.13,.14,4.22,.16,m.paint("#404b45",.7,.4));
      for (const a of [-9,-4,4,9]) b.box(s*(w-.63),2.91,a,.21,5.57,.24,m.steel);
    }
    b.roof(b.w,b.d,6.04,1.82,x>0?m.rustRoof:m.zinc,m.steel);
    this.sign(b,0,5.47,d+.173,x>0?"MERCER  /  BAY 02":"MERCER  /  BAY 01",6.7,.63);
    for (const px of [-6.81,6.81]) b.lamp(px,3.72,d+.18);
    b.floor(0,3.12,-7.73,b.w-1,2.72,m.steel,"metal",.14);
    b.floor(10.92,3.12,-2.94,2.2,6.88,m.steel,"metal",.15);
    b.rail(-12.2,3.12,-6.27,9.8,-6.27,m.steel);
    b.rail(9.77,3.12,-6.25,9.77,.48,m.steel);
    b.stairs(10.91,.18,6.51,0,-1,1.69,6.03,2.94,15,m.steel,"metal");
    for (const [px,pz,stack,base=.18] of [[-8.4,-5.1,2],[-8.43,1.03,1],[-5.73,1.16,2],[5.37,-5.38,1],[4.5,4.5,1],[-9.72,-7.7,1,3.12]]) {
      for (let i=0;i<stack;i++) {
        const node=b.furniture(px,base+.56+i*1.11,pz,1.36,1.10,1.30,m.wood);
        b.box(px,base+.91+i*1.11,pz+.66,1.36,.09,.054,m.siding,{node});
        b.box(px,base+.24+i*1.11,pz+.66,1.36,.09,.054,m.siding,{node});
      }
    }
    b.entrance(0,.18,d+1.33,null);
    const center=b.nav(0,.18,1.9,[b.inside]);
    b.nav(-2.86,.18,-4.5,[center]);
    const stair=b.nav(10.91,.18,7.2,[b.inside]);
    const cat=b.nav(10.91,3.12,-1.13,[stair]);
    const turn=b.nav(10.91,3.12,-7.83,[cat]);
    b.nav(2.40,3.12,-7.83,[turn]);
    b.stash("chest",-2.6,.18,-4.9);
    b.stash("chest",2.24,3.12,-8.03);
    b.stash("gun",1.12,.18,3.26);
    b.stash("ammo",-5.3,.18,-5.12);
    return b;
  }
  shed(plot,x,z,width,depth,mat) {
    const b=this.newBuilding(plot,x,z,width,depth,"shed",mat),m=this.world.mats,w=width/2,d=depth/2;
    const type=mat===m.steel?"metal":mat===m.brick?"stone":"wood";
    b.floor(0,.18,0,width,depth,type==="wood"?m.wood:m.concrete,type==="wood"?"wood":"concrete",.18);
    const door={center:-1.31,w:1.29,h:2.12,low:0,kind:"door"};
    const window={center:2,w:1.39,h:1.04,low:1,kind:"window"};
    b.wall("x",d,-w,w,.18,2.94,mat,type,[door,window]);
    b.wall("x",-d,-w,w,.18,2.94,mat,type,[{...window,center:0}]);
    for (const side of [-1,1]) b.wall("z",side*w,-d,d,.18,2.94,mat,type);
    b.roof(width,depth,3.12,1.38,m.shingle,mat);
    b.furniture(w-1.4,.70,-d+1.05,1.24,1.03,1.1,m.wood);
    b.furniture(-w+1.04,.58,-.43,1.17,.77,1.37,m.wood);
    b.entrance(-1.31,.18,d+1.35,door.object);
    const center=b.nav(-1.31,.18,.10,[b.inside]);
    b.nav(.20,.18,-d+1.14,[center]);
    b.stash("chest",.17,.18,-d+1.17);
    b.stash("gun",-1.06,.18,.41);
    return b;
  }
  barn(plot,x,z) {
    const m=this.world.mats,paint=m.textured("siding","#a36150",.94);
    const b=this.newBuilding(plot,x,z,20.4,15.5,"barn",paint),w=b.w/2,d=b.d/2;
    b.floor(0,.18,0,b.w,b.d,m.wood,"wood");
    b.wall("x",d,-w,w,.18,4.53,paint,"wood",[{center:0,w:3.85,h:3.17,low:0,kind:"opening"}]);
    b.wall("x",-d,-w,w,.18,4.53,paint,"wood");
    for (const side of [-1,1]) b.wall("z",side*w,-d,d,.18,4.53,paint,"wood",[{center:0,w:2.02,h:.90,low:2.37,kind:"window"}]);
    for (const x of [-3.0,3.0]) {
      b.box(x,1.78,d+.17,1.83,3.3,.18,m.cedar,{solid:true,surface:"wood"});
      for (const tilt of [-.47,.47]) b.geo(boxAt(x,1.78,d+.30,.12,3.52,.063,0,0,tilt),b.trim);
    }
    b.roof(b.w,b.d,4.71,3.04,m.zinc,paint);
    this.sign(b,0,5.24,d+.164,"ALDER FARM",4.95,.72);
    b.lamp(0,3.83,d+.20);
    const hay=m.textured("plank","#b1a176",.99);
    for (const [x,z,n] of [[-6,-4,2],[-6,-2.5,1],[5,-4.4,2],[6.4,-4.4,1],[7,2,2]]) {
      for (let i=0;i<n;i++) b.furniture(x,.59+i*.84,z,1.23,.82,1.12,hay);
    }
    b.entrance(0,.18,d+1.4,null);
    const center=b.nav(0,.18,0,[b.inside]);
    b.nav(.62,.18,-4.84,[center]);
    b.stash("chest",.62,.18,-4.84);
    b.stash("gun",-.41,.18,2.4);
    b.stash("med",2.2,.18,-2.35);
  }
  tower(plot,x,z) {
    const m=this.world.mats;
    const b=this.newBuilding(plot,x,z,7.6,8.0,"tower",m.wood);
    for (const a of [-3.34,3.34]) for (const d of [-3.57,3.57]) {
      b.box(a,3.52,d,.38,7.05,.38,m.wood,{solid:true,surface:"wood",noFloor:true});
      b.box(a,.27,d,.85,.54,.85,m.concrete,{solid:true,surface:"stone"});
    }
    for (const s of [-1,1]) {
      b.geo(cylinderBetween(vec(-3.25,1,s*3.58),vec(3.25,6.89,s*3.58),.12,.12,5),m.wood);
      b.geo(cylinderBetween(vec(s*3.3,1,-3.56),vec(s*3.3,6.94,3.56),.12,.12,5),m.wood);
    }
    b.stairs(1.57,.02,3.55,0,-1,1.46,6.40,3.53,16,m.wood);
    b.floor(0,3.55,-3.19,4.66,1.22,m.wood);
    b.stairs(-1.58,3.55,-2.58,0,1,1.46,6.13,3.37,16,m.wood);
    b.floor(0,6.92,3.77,7.6,.46,m.wood);
    b.floor(1.45,6.92,-.15,4.7,7.39,m.wood);
    b.floor(-3.10,6.92,-.15,1.40,7.39,m.wood);
    b.rail(3.68,6.92,-3.69,3.68,3.86,m.wood);
    b.rail(-3.68,6.92,-3.69,3.68,-3.69,m.wood);
    b.rail(-3.68,6.92,3.86,3.68,3.86,m.wood);
    b.rail(-3.68,6.92,-3.69,-3.68,3.86,m.wood);
    b.rail(-.75,6.92,-3.67,-.75,2.59,m.wood);
    for (const a of [-3.55,3.55]) for (const d of [-3.55,3.55]) b.box(a,8.05,d,.17,2.38,.17,m.wood);
    b.roof(7.6,8.0,9.18,1.49,m.shingle,m.siding);
    b.outside=b.nav(1.57,.02,4.2,[]);
    const inner=b.nav(1.57,3.55,-3.23,[b.outside]);
    const turn=b.nav(-1.58,3.55,-3.23,[inner]);
    const up=b.nav(-1.58,6.92,3.35,[turn]);
    const crossing=b.nav(1.16,6.92,3.35,[up]);
    b.nav(1.92,6.92,.04,[crossing]);
    b.stash("chest",1.90,6.92,.33);
    b.stash("gun",-.2,.02,2.2);
  }
  lighthouse(plot) {
    const world=this.world,m=world.mats;
    const iron=m.paint("#364f5b",.66,.43),cream=m.textured("concrete","#dbd3b7",.89);
    const stripe=m.textured("brick","#a5614f",.92),roof=m.textured("seam","#40565f",.77,.21);
    const b=this.newBuilding(plot,0,0,7.4,7.7,"lighthouse",cream),w=b.w/2,d=b.d/2;
    const y=.24,landing=3.67,deck=7.08,glassTop=9.91;
    const door={center:1.58,w:1.34,h:2.12,low:0,kind:"door"};
    b.trim=iron;
    b.floor(0,y,0,b.w,b.d,m.concrete,"concrete",.26);
    b.floor(1.58,.12,d+.32,2.2,.62,m.concrete,"concrete",.12);
    b.wall("x",d,-w,w,y,landing-y,cream,"stone",[door,windowOpening(-1.43,1.15)]);
    b.wall("x",-d,-w,w,y,landing-y,cream,"stone",[windowOpening(.03,1.75)]);
    for (const side of [-1,1]) b.wall("z",side*w,-d,d,y,landing-y,cream,"stone");
    for (const side of [-1,1]) {
      b.wall("x",side*d,-w,w,landing,deck-landing,stripe,"stone",[windowOpening(-.45,1.11,1.46,.81)]);
      b.wall("z",side*w,-d,d,landing,deck-landing,stripe,"stone",[windowOpening(.51,1.19,1.38,.84)]);
      b.box(0,landing+.08,side*(d+.158),b.w+.15,.38,.09,cream);
      b.box(side*(w+.158),landing+.08,0,.09,.38,b.d+.15,cream);
    }
    b.stairs(1.58,y,3.10,0,-1,1.51,5.55,landing-y,19,iron,"metal");
    b.floor(0,landing,-3.10,5.51,1.32,iron,"metal",.15);
    b.stairs(-1.58,landing,-2.44,0,1,1.51,5.50,deck-landing,19,iron,"metal");
    b.floor(0,deck,3.85,8.9,1.58,m.concrete,"concrete",.31);
    b.floor(1.89,deck,-.61,5.12,7.34,m.concrete,"concrete",.31);
    b.floor(-3.44,deck,-.61,2.02,7.34,m.concrete,"concrete",.31);
    b.floor(-1.54,deck,-3.99,1.79,.58,m.concrete,"concrete",.29);
    for (const side of [-1,1]) {
      b.rail(side*4.34,deck,-4.17,side*4.34,4.51,iron);
      b.rail(-4.34,deck,side<0?-4.17:4.51,4.34,side<0?-4.17:4.51,iron);
    }
    b.rail(-.66,deck,-2.73,-.66,2.57,iron);
    const lantern=2.48;
    for (const side of [-1,1]) {
      const front=[{center:-1.51,w:1.69,h:2.22,low:0,kind:"opening"},windowOpening(.77,2.28,1.94,.47)];
      const rear=[windowOpening(-1.37,1.47,1.94,.47),windowOpening(.12,1.28,1.94,.47),windowOpening(1.55,1.34,1.94,.47)];
      b.wall("x",side*lantern,-lantern,lantern,deck,glassTop-deck,iron,"metal",side>0?front:rear);
      b.wall("z",side*lantern,-lantern,lantern,deck,glassTop-deck,iron,"metal",[windowOpening(-1.31,1.82,1.94,.47),windowOpening(1.28,1.83,1.94,.47)]);
      b.box(0,glassTop-.05,side*lantern,5.48,.19,.19,iron);
    }
    b.geo(new THREE.CylinderGeometry(.24,4.28,2.04,4,1,false,Math.PI/4).translate(0,glassTop+1,0),roof);
    b.box(0,glassTop+.08,0,5.72,.19,5.72,iron,{solid:true,surface:"metal"});
    b.box(0,glassTop+2.25,0,.075,.69,.075,iron);
    b.box(.16,deck+.38,.04,.68,.76,.68,iron,{solid:true,surface:"metal"});
    const beacon=new THREE.Group(), lens=new THREE.Mesh(boxAt(0,0,.23,.87,.38,.10),m.fixture);
    lens.add(new THREE.Mesh(boxAt(0,0,-.46,.87,.38,.10),m.fixture));
    beacon.position.copy(b.at(.16,deck+1.06,.04));
    beacon.add(lens,new THREE.Mesh(new THREE.CylinderGeometry(.24,.38,.52,12),iron));
    world.scene.add(beacon);
    world.rotors.push({object:beacon,axis:"y",speed:.55});
    b.lamp(2.63,2.31,d+.17);
    this.sign(b,-1.38,2.72,d+.167,"BEACON POINT",2.96,.38);
    b.entrance(1.58,y,d+.42,door.object,d-.38);
    const lower=b.nav(1.58,y,3.19,[b.inside]);
    const first=b.nav(1.58,landing,-3.06,[lower]);
    const turn=b.nav(-1.58,landing,-3.06,[first]);
    const upper=b.nav(-1.58,deck,3.34,[turn]);
    const view=b.nav(.15,deck,3.64,[upper]);
    b.nav(3.50,deck,3.45,[view]);
    b.stash("chest",3.35,deck,2.93);
    b.stash("gun",-.66,y,1.69);
    b.stash("ammo",-2.92,deck,3.18);
  }
  crossing(town) {
    const w=this.world,m=w.mats,{west,east,z,width}=CROSSING;
    const y=town.y+.059,span=east-west,cx=(east+west)/2;
    const steel=m.paint("#426c70",.74,.33),edge=m.paint("#849792",.64,.31);
    const road=groundBox(cx,y-.185,z,span,.37,width);
    w.batches.put(road,m.asphalt,cx,z,null,false);
    const deck=w.collision.add(bounds(cx,y-.185,z,span,.37,width),{surface:"asphalt",pavement:true,bridge:true});
    w.bridge=deck.box;
    w.noGrass.push({ x:cx,z,rx:span/2+1,rz:width/2+1 });
    const put=(g,mat,cast=true)=>w.batches.put(g,mat,cx,z,null,cast);
    const beam=(a,b,r=.14)=>put(cylinderBetween(vec(...a),vec(...b),r,r,4),steel);
    for (const px of [west+4,east-6]) for (const side of [-1,1]) {
      const pz=z+side*(width/2-.54), footing=w.terrain.height(px,pz);
      if (footing<y-.36) put(boxAt(px,(footing+y-.30)/2,pz,2.9,y-footing-.28,2.12),m.concrete);
      put(boxAt(px,y-.48,z,3.32,.47,width+.26),m.concrete);
    }
    const joints=[west+2,west+8,west+16,west+24,west+32,west+40,west+48,east-2];
    for (const side of [-1,1]) {
      const rail=z+side*(width/2+.165);
      put(boxAt(cx,y+.49,rail,span,.12,.18),edge);
      put(boxAt(cx,y+.91,rail,span,.14,.17),steel);
      put(boxAt(cx,y-.24,rail,span,.45,.32),steel);
      w.collision.add(bounds(cx,y+.49,rail,span,.12,.18),{surface:"metal",noFloor:true,bridge:true});
      w.collision.add(bounds(cx,y+.91,rail,span,.14,.17),{surface:"metal",noFloor:true,bridge:true});
      w.collision.add(bounds(cx,y-.24,rail,span,.32,.45),{surface:"metal",noFloor:true,bridge:true});
      const top=joints.map((x,i)=>[x,y+(i===0 || i===joints.length-1?1.0:5.56),rail]);
      for(let i=0;i<joints.length;i++) {
        const x=joints[i],bottom=[x,y-.29,rail];
        beam(bottom,top[i],.21);
        w.collision.cylinder(x,bottom[1],rail,top[i][1]-bottom[1],.21,.21,{surface:"metal",noFloor:true,bridge:true});
        put(boxAt(x,y+1.025,rail-.026*side,.31,.28,.19),edge);
        if(!i) continue;
        beam(top[i-1],top[i],.23);
        beam(bottom,top[i-1]);
        if(i%2===0) beam([joints[i-1],y-.29,rail],top[i],.097);
      }
    }
    for (const x of joints.slice(1,-1)) {
      const top=y+5.56;
      beam([x,top,z-width/2-.14],[x,top,z+width/2+.14],.19);
      put(boxAt(x,top-.09,z,.44,.08,.22),m.fixture,false);
    }
    for (let x=west+3;x<east-1;x+=5.1) this.mark(x,y+.006,z,2.58,.13,"#dbbd73");
    for (const side of [-1,1]) this.mark(cx,y+.006,z+side*(width/2-.44),span-.12,.088,"#cfcec0");
  }
  slab(x,y,z,w,d,mat,surface="concrete") {
    this.world.batches.put(groundBox(x,y+.025,z,w,.05,d),mat,x,z,null,false);
    this.world.noGrass.push({x,z,rx:w/2,rz:d/2});
    this.world.collision.add(bounds(x,y+.025,z,w,.05,d),{surface,pavement:true});
  }
  townRoads(plot) {
    const w=this.world,m=w.mats,{x,y,z}=plot;
    const localX=TOWN_GRID.x.map(value=>value-x),localZ=TOWN_GRID.z.map(value=>value-z);
    const half=TOWN_GRID.width/2;
    const roads=[],curbs=[],walks=[];
    const firstX=localX[0]-half,lastX=localX[2]+half,firstZ=localZ[0]-half,lastZ=localZ[2]+half;
    const add=(x1,x2,z1,z2)=>{
      roads.push([x1,x2,z1,z2]);
      curbs.push([x1-.19,x2+.19,z1-.19,z2+.19]);
      walks.push([x1-2.06,x2+2.06,z1-2.06,z2+2.06]);
    };
    for (const u of localX) add(u-half,u+half,firstZ,lastZ);
    for (const v of localZ) add(firstX,v===CROSSING.z-z?CROSSING.west-x:lastX,v-half,v+half);
    for(const b of this.all) {
      const entrance=b.nodes[b.outside].position;
      const end=localZ[b.z-z< -20?0:b.z-z<20?1:2]-half-1.8;
      const start=entrance.z-z+(b.kind==="modern"?.45:b.kind==="shop"?-.9:.43);
      const u=entrance.x-x;
      walks.push([u-.82,u+.82,Math.min(start,end),Math.max(start,end)+.06]);
    }
    const contains=([a,b,c,d],px,pz)=>px>=a && px<b && pz>=c && pz<d;
    const edge=[CROSSING.west-x,lastX+3,CROSSING.z-z-CROSSING.width/2,CROSSING.z-z+CROSSING.width/2];
    const southExit=[localX[1]-2.77,localX[1]+2.77,lastZ,lastZ+2.35];
    const westExit=[firstX-2.35,firstX,localZ[0]-3.01,localZ[0]+3.01];
    const sections=axis=>[...new Set([...roads,...curbs,...walks,edge,southExit,westExit].flatMap(rect=>rect.slice(axis,axis+2)))].sort((a,b)=>a-b);
    const xs=sections(0),zs=sections(2),heights=[.05,.145,.125],materials=[m.asphalt,m.curb,m.sidewalk];
    const kind=(px,pz)=>{
      if(contains(edge,px,pz) || contains(southExit,px,pz) || contains(westExit,px,pz)) return -1;
      if(roads.some(rect=>contains(rect,px,pz))) return 0;
      if(!walks.some(rect=>contains(rect,px,pz))) return -1;
      return curbs.some(rect=>contains(rect,px,pz))?1:2;
    };
    for(let j=0;j<zs.length-1;j++) {
      const near=zs[j],far=zs[j+1],mid=(near+far)/2;
      let start=xs[0],previous=kind((start+xs[1])/2,mid);
      for(let i=1;i<xs.length;i++) {
        const next=i===xs.length-1?-1:kind((xs[i]+xs[i+1])/2,mid);
        if(next===previous) continue;
        if(previous>=0) {
          const width=xs[i]-start,length=far-near,px=x+(start+xs[i])/2,pz=z+mid,height=heights[previous];
          w.batches.put(groundBox(px,y+height/2,pz,width,height,length),materials[previous],px,pz,null,false);
          w.noGrass.push({x:px,z:pz,rx:width/2,rz:length/2});
          w.collision.add(bounds(px,y+height/2,pz,width,height,length),{surface:previous===0?"asphalt":"concrete",pavement:true});
        }
        start=xs[i];previous=next;
      }
    }
    const paint=(u,v,width,depth,color)=>this.mark(x+u,y+.058,z+v,width,depth,color);
    for (const v of localZ) {
      for(let i=firstX+7;i<lastX-5;i+=5) {
        if(localX.every(column=>Math.abs(i-column)>10)) paint(i,v,2.15,.11);
      }
      for(const u of localX) for(const ox of [-1,1]) {
        if(u===localX[0] && ox<0 || u===localX[2] && ox>0) continue;
        for(let i=-4;i<=4;i++) paint(u+ox*6.43,v+i*.88,1.46,.44,"#d5ceba");
      }
    }
    for (const u of localX) {
      for(let i=firstZ+8;i<lastZ-6;i+=5) if(localZ.every(row=>Math.abs(i-row)>10)) paint(u,i,.11,2.15);
      for(const v of localZ) for(const oz of [-1,1]) {
        if(v===localZ[0] && oz<0 || v===localZ[2] && oz>0) continue;
        for(let i=-4;i<=4;i++) paint(u+i*.88,v+oz*6.43,.44,1.46,"#d5ceba");
      }
    }
    const steel=m.paint("#363e3a",.84,.21),patch=m.textured("asphalt","#424844",.99);
    for(const [u,v] of [[-36,-24],[18,-20],[54,18],[-47,19],[32,62],[-37,57],[1,-4],[72,7]]) {
      const geometry=new THREE.CylinderGeometry(.33,.33,.013,14).translate(x+u,y+.057,z+v);
      w.batches.put(geometry,steel,x+u,z+v,null,false);
      for(let i=-2;i<=2;i++) paint(u+i*.094,v,.022,.45,"#555d55");
    }
    for (const [u,v,length] of [[-38,-23,4.3],[31,19,5.4],[-55,59,3.6],[54,60,5.9]]) {
      w.batches.put(groundBox(x+u,y+.052,z+v,length,.004,.81),patch,x+u,z+v,null,false);
    }
    this.powerline(y,[[x-66,z-14.3],[x-35,z-14.3],[x-11,z-14.3],[x+19,z-14.3],[x+48,z-14.3],[x+66,z-14.3]]);
    w.carSpawns.push([x-30,z-14.5,Math.PI/2],[x+38,z+28.6,Math.PI/2],[x+8.2,z+34,0],[x-59,z+10,Math.PI/2]);
  }
  roadDetails() {
    const w=this.world,paint=w.mats.paint("#bbb28d"),edgePaint=w.mats.paint("#aaa99a");
    const strip=(edge,start,end,across,width,material)=>{
      const ux=edge.dx/edge.length,uz=edge.dz/edge.length,coords=[];
      for(const d of [start,end]) for(const side of [-1,1]) {
        const x=edge.a.x+ux*d-uz*(across+width*side/2),z=edge.a.z+uz*d+ux*(across+width*side/2);
        coords.push(x,w.terrain.height(x,z)+.037,z);
      }
      const geo=new THREE.BufferGeometry();
      geo.setAttribute("position",new THREE.Float32BufferAttribute(coords,3));
      geo.setAttribute("uv",new THREE.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));
      geo.setIndex([0,1,2,2,1,3]);geo.computeVertexNormals();
      w.batches.put(geo,material,coords[0],coords[2],null,false);
    };
    for (const edge of w.roads.edges) {
      if(edge.kind!=="asphalt" || edge.length<10) continue;
      for(let d=3.5;d<edge.length-5;d+=6.5) strip(edge,d,d+2.8,0,.115,paint);
      for(let d=3;d<edge.length-4;d+=2.6) for(const sign of [-1,1]) {
        strip(edge,d,d+2.6,sign*(edge.half-.49),.07,edgePaint);
      }
    }
  }
  mark(x,y,z,w,d,color="#b6aa76") {
    this.world.batches.put(boxAt(x,y,z,w,.006,d),this.world.mats.paint(color),x,z,null,false);
  }
  streetscape(p) {
    const w=this.world,m=w.mats;
    const iron=m.paint("#46575a",.81,.2),leaf=m.paint("#63794d",1);
    const b=new Building(w,p.x,p.y,p.z,1,1,"street",iron);
    for (const [x,z,side] of [[-63,-28,-1],[-33,-16,1],[-11,-28,-1],[12,-16,1],[43,-28,-1],[70,-16,1],
      [-67,27,-1],[-44,15,1],[-14,27,-1],[12,15,1],[37,27,-1],[67,15,1]]) {
      b.box(x,2.52,z,.15,4.82,.15,iron,{solid:true,surface:"metal",noFloor:true});
      b.box(x,.27,z,.28,.32,.28,m.concrete);
      b.box(x,4.86,z+side*.65,.13,.13,1.42,iron);
      b.box(x,4.79,z+side*1.23,.32,.17,.54,iron);
      b.box(x,4.69,z+side*1.23,.25,.04,.43,m.fixture,{cast:false});
      w.lights.push({position:b.at(x,4.55,z+side*1.23),strength:64});
    }
    for (const [x,z] of [[-46,-4],[-10,-38],[8.7,32],[-47,33],[33,38],[48,-45]]) {
      b.furniture(x,.38,z,2.82,.75,1.37,m.brick,"stone");
      b.box(x,.76,z,2.91,.11,1.45,m.concrete);
      b.box(x,.82,z,2.60,.07,1.16,m.dirt);
      for (let i=0;i<4;i++) {
        const n=hash(x+i,z);
        b.geo(new THREE.IcosahedronGeometry(1,1).scale(.37+n*.14,.28+n*.24,.50).translate(x-1.02+i*.69,.96+n*.13,z),leaf);
      }
      w.noGrass.push({x:p.x+x,z:p.z+z,rx:1.46,rz:.73});
    }
    for (const [x,z] of [[-12,-34],[9,38],[39,-35]]) {
      b.furniture(x,.56,z,2.14,.13,.55,m.cedar);
      b.box(x,.82,z-.23,2.16,.42,.076,m.cedar);
      for (const side of [-1,1]) b.box(x+side*.82,.32,z,.08,.47,.49,iron);
    }
  }
  powerline(y,points) {
    const w=this.world,m=w.mats;
    for (const [x,z] of points) {
      w.powerPoles.push(vec(x,y+6.5,z));
      w.batches.put(cylinderBetween(vec(x,y,z),vec(x,y+7.3,z),.19,.13,7),m.wood,x,z);
      w.batches.put(boxAt(x,y+6.95,z,.18,.17,2.08),m.wood,x,z);
      for (const t of [-.86,-.4,.4,.86]) w.batches.put(boxAt(x,y+7.1,z+t,.11,.24,.105),m.concrete,x,z);
      w.collision.add(bounds(x,y+3.6,z,.31,7.2,.31),{surface:"wood",noFloor:true});
    }
    for (let i=1;i<points.length;i++) for (const side of [-.86,-.4,.4,.86]) {
      const [x,z]=points[i-1],[nx,nz]=points[i];
      const a=vec(x,y+7.2,z+side),b=vec(nx,y+7.2,nz+side),mid=a.clone().lerp(b,.5);
      mid.y-=.86;
      w.batches.put(cylinderBetween(a,mid,.021,.021,4),m.paint("#55584e"),x,z,null,false);
      w.batches.put(cylinderBetween(mid,b,.021,.021,4),m.paint("#55584e"),x,z,null,false);
    }
  }
  fence(x,y,z,x2,z2,breakAt = -1) {
    const world=this.world,m=world.mats,count=Math.ceil(dist(x,z,x2,z2)/2.4);
    for (let i=0;i<=count;i++) {
      const px=lerp(x,x2,i/count),pz=lerp(z,z2,i/count);
      world.batches.put(boxAt(px,y+.60,pz,.17,1.20,.17),m.wood,px,pz);
      world.collision.add(bounds(px,y+.60,pz,.17,1.20,.17),{surface:"wood",noFloor:true});
      if (i===count || i===breakAt) continue;
      const nx=lerp(x,x2,(i+1)/count),nz=lerp(z,z2,(i+1)/count);
      const node=world.resource(0,62,6);
      const w=Math.max(Math.abs(nx-px),.105),d=Math.max(Math.abs(nz-pz),.105);
      for (const h of [.47,.87]) {
        world.batches.put(boxAt((px+nx)/2,y+h,(pz+nz)/2,w,.105,d),m.wood,px,pz,node);
        node.colliders.push(world.collision.add(bounds((px+nx)/2,y+h,(pz+nz)/2,w,.105,d),{surface:"wood",node,noFloor:true}));
      }
    }
  }
  lakefront() {
    const w=this.world,m=w.mats,{east:x,z,deck}=LAKE_ACCESS;
    const iron=m.paint("#535847",.87,.11),b=new Building(w,x,deck,z,1,1,"dock",m.cedar);
    const run=35,width=4.75;
    b.floor(run/2,.069,0,run+1.1,width,m.cedar,"wood",.28);
    b.floor(run-2,.069,0,4.3,12.4,m.cedar,"wood",.28);
    b.floor(24,.069,6.35,2.73,9.8,m.cedar,"wood",.28);
    for(let i=0;i<36;i++) b.box(i-.37,.071,0,.026,.014,width-.2,iron,{cast:false});
    for (const [u,v] of [[1,-2.16],[1,2.16],[6,-2.16],[6,2.16],[12,-2.16],[12,2.16],
      [18,-2.16],[18,2.16],[24,-2.16],[24,2.16],[24,7],[24,10.9],[31,-5.85],[31,5.85],[35,-5.85],[35,5.85]]) {
      const bottom=w.terrain.height(x+u,z+v)-.18-deck, support=.42-bottom;
      b.box(u,(.42+bottom)/2,v,.27,support,.27,m.wood,{solid:true,surface:"wood",noFloor:true});
      b.box(u,.37,v,.32,.16,.32,iron);
    }
    b.rail(1,.069,-2.12,30.67,-2.12,m.cedar);
    b.rail(1,.069,2.12,20.8,2.12,m.cedar);
    b.rail(30.86,.069,-5.87,34.91,-5.87,m.cedar);
    b.rail(34.91,.069,-5.87,34.91,5.87,m.cedar);
    b.furniture(31.92,.52,-4.02,1.64,.88,.95,m.wood);
    b.furniture(34.18,.48,3.74,.75,.80,1.62,m.wood);
    b.stash("chest",32.25,.07,-1.42);
    b.stash("ammo",22.91,.07,6.79);
    b.box(1.5,.77,2.183,2.76,.40,.085,m.wood);
    this.sign(b,1.5,.78,2.228,"STILLWATER LANDING",2.68,.35);
    w.noGrass.push({x:x+run/2,z,rx:run/2+1,rz:2.8});
    for(const [u,v,color] of [[17,-6.7,"#759b99"],[28,8,"#af6c52"]]) {
      const px=x+u,pz=z+v, trim=m.paint(color,.8);
      const wood=m.paint("#b7a583"), low=SEA+.02;
      const hull=new THREE.CylinderGeometry(.93,.52,.44,6).scale(2.42,1,.94).rotateY(.23);
      w.batches.put(hull.translate(px,low+.04,pz),trim,px,pz,null,false);
      w.batches.put(boxAt(px,low+.272,pz,3.2,.037,1.03),wood,px,pz,null,false);
      for (const off of [-.87,.81]) w.batches.put(boxAt(px+off,low+.35,pz,.28,.085,1.12),wood,px,pz,null,false);
    }
  }
  farmyard(p) {
    const w=this.world,m=w.mats;
    this.fence(p.x-42,p.y,p.z+35,p.x-24,p.z+35);
    this.fence(p.x-9,p.y,p.z+35,p.x+42,p.z+35);
    this.fence(p.x-42,p.y,p.z-24,p.x-42,p.z+19);
    this.slab(p.x,p.y,p.z+18,16,4,m.dirt,"dirt");
    const b=new Building(w,p.x,p.y,p.z,1,1,"farmyard",m.wood),soil=m.textured("dirt","#80634c",.99);
    const greens=[m.paint("#7b8748"),m.paint("#929449"),m.paint("#687641")];
    for(let i=0;i<8;i++) {
      const x=22+i*2.85;
      b.box(x,.052,13,1.82,.10,16.8,soil,{cast:false});
      w.noGrass.push({x:p.x+x,z:p.z+13,rx:1.01,rz:8.55});
      for(let j=0;j<16;j++) {
        const n=hash(i,j,172),dx=(n-.5)*.51,z=5.65+j*.984,h=.27+n*.52;
        b.geo(new THREE.ConeGeometry(.29,h,4).scale(.86,1,1.32).rotateZ((n-.5)*.62).translate(x+dx,.10+h/2,z),greens[j%3],null,false);
        b.box(x+dx,.23,z,.34,.14,.38,greens[(j+1)%3],{cast:false});
      }
    }
    for(const [x,z,r] of [[-13,-.9,2.57],[-6.8,-.9,2.34]]) {
      const h=8.0+r*.43;
      b.geo(new THREE.CylinderGeometry(r,r,h,20).translate(x,h/2,z),m.zinc);
      b.geo(new THREE.ConeGeometry(r+.19,1.82,20).translate(x,h+.83,z),m.rustRoof);
      for(const y of [.27,2.18,4.11,6.05,h-.11]) b.geo(new THREE.CylinderGeometry(r+.066,r+.066,.086,20).translate(x,y,z),m.steel);
      w.collision.cylinder(p.x+x,p.y,p.z+z,h,r,r,{surface:"metal",noFloor:true});
      w.noGrass.push({x:p.x+x,z:p.z+z,rx:r,rz:r});
    }
    const iron=m.paint("#677578",.68,.38),pivot=new THREE.Group(),blades=[];
    pivot.position.copy(b.at(-20.2,9.93,12.82));
    for(let i=0;i<9;i++) {
      const a=i/9*TAU;
      blades.push(boxAt(1.83*Math.sin(a),1.83*Math.cos(a),0,.38,1.23,.093,0,0,-a+.26));
    }
    pivot.add(new THREE.Mesh(mergeParts(blades),m.rustRoof));
    pivot.add(new THREE.Mesh(new THREE.TorusGeometry(2.1,.043,5,21),iron));
    w.scene.add(pivot);
    w.rotors.push({object:pivot,axis:"z",speed:.28});
    for (const side of [-1,1]) for (const z of [11.47,13.64]) {
      b.geo(cylinderBetween(vec(-20.2+side*1.13,.02,z),vec(-20.2+side*.18,9.65,12.62),.104,.081,5),iron);
    }
    for(const y of [2.28,4.44,6.59,8.63]) {
      const half=lerp(1.08,.35,y/9);
      b.box(-20.2,y,12.83,half*2,.105,.105,iron);
    }
    w.carSpawns.push([p.x+18,p.z+20,0]);
  }
  camp(p) {
    const m=this.world.mats,w=this.world,x=p.x+4,z=p.z+14;
    const rock=m.rock;
    for (let i=0;i<9;i++) {
      const a=i/9*TAU;
      const g=new THREE.IcosahedronGeometry(.22,0).translate(x+Math.cos(a)*.85,p.y+.12,z+Math.sin(a)*.85);
      w.batches.put(g,rock,x,z);
    }
    w.batches.put(cylinderBetween(vec(x-1.95,p.y+.29,z-1.53),vec(x+1.7,p.y+.29,z-1.53),.27,.26),m.bark,x,z);
    w.batches.put(boxAt(x,p.y+.027,z,1.69,.049,1.6),m.asphalt,x,z,null,false);
    const b=new Building(w,p.x,p.y,p.z,1,1,"campsite",m.wood);
    const canvas=m.textured("fabric","#737e63",.96);
    for(const [u,v] of [[-7,17],[15,14]]) {
      for(const side of [-1,1]) {
        b.geo(boxAt(u+side*.97,1.1,v,2.72,.071,4.06,0,0,-side*.77),canvas);
        b.box(u,1.07,v+side*1.88,.09,2.12,.10,m.wood,{solid:true,surface:"wood",noFloor:true});
      }
      b.furniture(u,.30,v+1.02,1.17,.57,.68,m.wood);
      w.noGrass.push({x:p.x+u,z:p.z+v,rx:2.1,rz:2.18});
    }
    this.sign(b,3.7,1.83,21.73,"BRACKEN CAMP",3.32,.58);
    for (const u of [2.27,5.13]) b.box(u,.98,21.63,.17,1.96,.17,m.wood,{solid:true,surface:"wood",noFloor:true});
    b.box(3.7,1.83,21.67,3.45,.68,.12,m.wood);
  }
  quarryWorks(p) {
    const w=this.world,m=w.mats,iron=m.paint("#485556",.73,.38),yellow=m.paint("#a88b55",.81,.26);
    const b=new Building(w,p.x,p.y,p.z,1,1,"conveyor",iron);
    const from=vec(-34,1.46,20.2),to=vec(-7,8.31,20.2),middle=from.clone().lerp(to,.5);
    const length=from.distanceTo(to),rise=Math.atan2(to.y-from.y,to.x-from.x);
    b.geo(boxAt(middle.x,middle.y,middle.z,length,.42,2.48,0,0,rise),iron);
    b.geo(boxAt(middle.x,middle.y+.25,middle.z,length,.091,1.66,0,0,rise),m.asphalt);
    for(const side of [-1,1]) {
      b.geo(boxAt(middle.x,middle.y+.48,middle.z+side*1.16,length,.42,.12,0,0,rise),yellow);
      for(const t of [.22,.48,.77,1]) {
        const pos=from.clone().lerp(to,t),h=pos.y-.16,z=pos.z+side*.93;
        b.box(pos.x,h/2,z,.29,h,.28,iron,{solid:true,surface:"metal",noFloor:true});
        b.geo(cylinderBetween(vec(pos.x-1.48,.15,z),vec(pos.x,h-.25,z),.085,.085,5),iron);
      }
    }
    b.geo(new THREE.CylinderGeometry(2.45,1.23,2.93,4,1,false,Math.PI/4).translate(-6.8,8.35,20.2),m.rustRoof);
    b.box(-6.8,9.70,20.2,3.53,.21,3.56,yellow);
    for(const [x,z,s] of [[-22,22,2.47],[-27,15,2.00],[2.9,20,1.77],[8,22,2.16]]) {
      b.geo(new THREE.IcosahedronGeometry(1,1).scale(s,s*.54,s*.85).rotateY(hash(x,z)*TAU).translate(x,s*.23,z),m.rock);
      w.collision.add(bounds(p.x+x,p.y+s*.31,p.z+z,s*1.39,s*.63,s*1.19),{surface:"stone"});
      w.noGrass.push({x:p.x+x,z:p.z+z,rx:s,rz:s*.85});
    }
  }
  yard(p) {
    const w=this.world,m=w.mats;
    this.slab(p.x,p.y,p.z+5,106,69,m.concrete);
    w.carSpawns.push([p.x+4,p.z+27,.19],[p.x-34,p.z+18,Math.PI/2]);
    this.powerline(p.y,[[p.x-36,p.z+36],[p.x-12,p.z+36],[p.x+25,p.z+36],[p.x+36,p.z+36]]);
    const b=new Building(w,p.x,p.y,p.z,1,1,"yard",m.steel);
    const palette=[m.textured("steel","#8d5c4b",.88,.21),m.textured("steel","#637f80",.84,.23),m.textured("steel","#9b8967",.88,.18)];
    const iron=m.paint("#4c5550",.76,.35),gantry=m.paint("#9e7047",.78,.28);
    for(const [i,[x,z,count]] of [[-26,22,2],[-17,22,1],[-14,27,1],[19,-19,2],[10,-19,1],[-3,-26,1],[39,0,1]].entries()) {
      for(let row=0;row<count;row++) {
        const y=1.28+row*2.42, color=palette[(i+row)%3];
        const node=b.furniture(x,y,z,6.04,2.4,2.45,color,"metal");
        for(const s of [-1,1]) {
          b.box(x,y+s*1.16,z+1.25,6.12,.093,.075,iron,{node});
          b.box(x+s*2.98,y,z+1.25,.10,2.27,.075,iron,{node});
        }
        for(const off of [-1.78,-1.27,1.27,1.78]) b.box(x+off,y,z+1.255,.047,2.18,.075,m.steel,{node});
      }
    }
    for(const x of [-43,31]) {
      b.box(x,4.80,30,1.05,9.45,1.21,gantry,{solid:true,surface:"metal",noFloor:true});
      b.box(x,.68,30,2.37,1.33,1.89,iron,{solid:true,surface:"metal"});
      b.geo(cylinderBetween(vec(x,6.65,29.9),vec(x+Math.sign(-x)*6.6,9.46,29.9),.23,.23,4),gantry);
    }
    b.box(-6,9.19,30,75.2,.25,1.70,gantry);
    b.box(-6,10.25,30,75.2,.21,1.88,iron);
    for (const side of [-1,1]) {
      for(let i=0;i<10;i++) {
        const x=-42.7+i*8.1,z=30+side*.77;
        b.box(x,9.70,z,.23,1.14,.15,gantry);
        const next=i%2===0?x+8.1:x-8.1;
        b.geo(cylinderBetween(vec(x,9.26,z),vec(next,10.19,z),.095,.095,4),gantry);
      }
    }
    b.box(-8.9,9.03,30,2.53,2.12,2.5,iron);
    b.box(-8.9,6.94,30,.086,2.68,.086,m.steel);
    b.geo(new THREE.TorusGeometry(.25,.072,6,11).translate(-8.9,5.48,30),iron);
    b.box(12,9.68,30.776,6.82,.72,.12,iron);
    this.sign(b,12,9.68,30.842,"MERCER WORKS",6.56,.57);
    for(const side of [-1,1]) {
      this.mark(p.x-3,p.y+.056,p.z+30+side*3,90,.11,"#b6a163");
      this.mark(p.x+6+side*1.6,p.y+.056,p.z+8,.09,7.8,"#dbd2b2");
    }
  }
  locate(x,y,z) {
    return this.all.find(b => Math.abs(b.x-x)<b.w*.5+.3 && Math.abs(b.z-z)<b.d*.5+.3 && y<b.y+11);
  }
}

class Vegetation {
  constructor(world) {
    this.world=world;
    this.groups=[];
    this.mats=world.mats;
    this.makeTrees();
    this.makeCars();
    this.makeRocksAndShrubs();
    if(!world.headless) this.setupGrass();
  }
  leafAtlas() {
    const c=canvas2D(256,256),ctx=c.getContext("2d");
    ctx.drawImage(this.mats.bark.map.image,0,0,126,256);
    const random=rng(4871);
    ctx.fillStyle="#bdc5ad";
    ctx.fillRect(129,0,127,256);
    for (let i=0;i<730;i++) {
      const x=129+random()*127,y=random()*256,r=1+random()*4;
      ctx.fillStyle=choose(["#90a182","#d2d4b6","#a9ba9a","#758e75"],random);
      ctx.beginPath();
      ctx.ellipse(x,y,r*1.4,r*.46,random()*TAU,0,TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation="destination-out";
    for (let i=0;i<126;i++) {
      ctx.beginPath();
      ctx.ellipse(133+random()*122,random()*256,1.2+random()*4,1.4+random()*4,random()*TAU,0,TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation="source-over";
    const map=new THREE.CanvasTexture(c);
    map.colorSpace=THREE.SRGBColorSpace;
    map.anisotropy=2;
    return map;
  }
  firLayer(radius,height,count,phase,random) {
    const positions=[],uv=[],indices=[];
    const rings=[[-.24,.27],[0,1],[.55,.59],[1.03,.10]];
    const outline=Array.from({length:count},(_,i)=>(i%2===0?1:.77)+random()*.18);
    for (const [y,width] of rings) for (let i=0;i<=count;i++) {
      const a=phase+i/count*TAU,n=outline[i%count];
      positions.push(Math.cos(a)*radius*width*n,height*(y+(n-.82)*.19),Math.sin(a)*radius*width*n);
      uv.push(i/count,clamp((y+.25)/1.3,0,1));
    }
    const stride=count+1;
    for (let ring=0;ring<rings.length-1;ring++) for (let i=0;i<count;i++) {
      const a=ring*stride+i,b=a+1,c=a+stride,d=c+1;
      indices.push(a,c,b,b,c,d);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }
  treeGeometry(kind,cheap) {
    const pine=kind===0,birch=kind===2, parts=[];
    const random=rng(7471+31*kind);
    const tint = (g,color,leaf) => {
      const uv=g.attributes.uv;
      for(let i=0;i<uv.count;i++) uv.setX(i,uv.getX(i)*.472+(leaf?.52:.009));
      parts.push(tintedGeometry(g,color));
    };
    const bark=birch?"#c1b6a0":pine?"#665343":"#7b6350";
    const end=pine?7.1:5.1;
    tint(cylinderBetween(vec(0,0,0),vec(.15,end,0),pine?.28:.40,.074,cheap?5:8),bark,false);
    const leafCol=kind===0?["#354d3e","#48634d","#526c4a"]:kind===1?["#516d45","#6d854d","#748653"]:["#838447","#9c9456","#717c47"];
    if (pine) {
      const tiers=cheap?4:8;
      for (let tier=0;tier<tiers;tier++) {
        const t=tier/(tiers-1),y=2.08+t*5.61,extent=lerp(2.47,.30,t)*(1+random()*.12);
        const g=this.firLayer(extent,lerp(1.79,1.11,t),cheap?6:14,tier*.73,random);
        g.translate(Math.sin(tier*1.36)*.13,y,Math.cos(tier*.92)*.10);
        tint(g,leafCol[tier%3],true);
        if (!cheap && tier<6) {
          const a=tier*2.39996, x=Math.cos(a),z=Math.sin(a),dy=(random()-.5)*.17;
          const branch=this.firLayer(extent*.38,lerp(.98,.57,t),8,a,random).rotateY(-a).translate(x*extent*.73,y+dy,z*extent*.73);
          tint(branch,leafCol[(tier+1)%3],true);
          tint(cylinderBetween(vec(.06,y-.20,0),vec(x*extent*.875,y+dy,z*extent*.875),.063,.013,5),bark,false);
        }
      }
    } else {
      const branches=cheap?5:9;
      for (let i=0;i<branches;i++) {
        const a=i*.381966*TAU, outer=i>1, r=outer?1.1+random()*1.2:.43;
        const x=Math.cos(a)*r,z=Math.sin(a)*r,y=(birch?5.14:5.05)+(outer?random()*1.3:(i===0?1.45:2.10));
        if (!cheap) tint(cylinderBetween(vec(.12,2.45+random()*1.8,0),vec(x,y,z),.10+random()*.08,.026,6),bark,false);
        const len=birch?1.35:1.87;
        const g=cheap?new THREE.IcosahedronGeometry(1,0):new THREE.SphereGeometry(1,8,5);
        g.scale(len*(.84+random()*.38),birch?1.5:1.37,len*.85).rotateY(a).translate(x,y,z);
        tint(g,choose(leafCol,random),true);
      }
    }
    return mergeParts(parts);
  }
  instantiate(entries,geo,material,lod=null,cast=true,depthMaterial=null) {
    if(this.world.headless) { geo.dispose();lod?.dispose();return; }
    const scene=this.world.scene;
    const groups=new Map();
    for (const entry of entries) {
      const key=Math.floor(entry.x/145)+","+Math.floor(entry.z/145);
      if (!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(entry);
    }
    const matrix=new THREE.Matrix4(), quaternion=new THREE.Quaternion();
    for (const [key,group] of groups) {
      const mesh=new THREE.InstancedMesh(geo,material,group.length);
      const distant=lod?new THREE.InstancedMesh(lod,material,group.length):null;
      for (const obj of [mesh,distant].filter(Boolean)) {
        obj.castShadow=cast;
        obj.receiveShadow=true;
        if (depthMaterial) obj.customDepthMaterial=depthMaterial;
        scene.add(obj);
      }
      group.forEach((entry,i) => {
        quaternion.setFromEuler(new THREE.Euler(0,entry.yaw,0));
        matrix.compose(vec(entry.x,entry.y,entry.z),quaternion,vec(entry.sx,entry.sy,entry.sz));
        for (const obj of [mesh,distant].filter(Boolean)) {
          obj.setMatrixAt(i,matrix);
          if (entry.tint) obj.setColorAt(i,typeof entry.tint==="number"?new THREE.Color().setScalar(entry.tint):entry.tint);
          if (entry.node) entry.node.instances.push({mesh:obj,i,matrix:matrix.clone()});
        }
      });
      for (const obj of [mesh,distant].filter(Boolean)) obj.computeBoundingSphere();
      const [gx,gz]=key.split(",").map(Number);
      this.groups.push({ mesh,distant,x:(gx+.5)*145,z:(gz+.5)*145 });
    }
  }
  suitable(x,z,pad=0) {
    const w=this.world,y=w.terrain.height(x,z);
    return y>SEA+1.25 && w.terrain.slope(x,z)<.85 && !w.roads.surfaceAt(x,z,pad+.18) &&
      !w.noGrass.some(box=>Math.abs(x-box.x)<box.rx+pad && Math.abs(z-box.z)<box.rz+pad);
  }
  makeTrees() {
    const random=rng(9551), w=this.world;
    const mat=new THREE.MeshStandardMaterial({map:w.headless?null:this.leafAtlas(),vertexColors:true,alphaTest:.46,
      side:THREE.DoubleSide,roughness:.98,envMapIntensity:.25 });
    const bend=shader=>{
      Object.assign(shader.uniforms,{windTime:w.climate.simTime,windStrength:w.climate.windStrength});
      shader.vertexShader=`uniform float windTime,windStrength;\n`+shader.vertexShader.replace("#include <begin_vertex>",`
        #include <begin_vertex>
        vec3 trunk=instanceMatrix[3].xyz;
        float height=clamp(position.y*.125,0.,1.);
        float gust=sin(windTime*1.91+trunk.x*.113+trunk.z*.075)+.29*sin(windTime*4.8+position.y*.61);
        vec3 direction=vec3(.93,0.,.37)*mat3(instanceMatrix);
        vec2 breeze=normalize(direction.xz);
        transformed.xz+=breeze*windStrength*height*height*(gust*.28+.39);
      `);
    };
    mat.onBeforeCompile=shader=>{
      bend(shader);
      shader.uniforms.windLight=w.climate.sunStrength;
      shader.vertexShader="varying float leafLight;\n"+shader.vertexShader.replace("#include <begin_vertex>",`
        #include <begin_vertex>
        leafLight=step(.5,uv.x)*(.5+.5*sin(windTime*2.3+position.x*1.8+position.z*2.1+instanceMatrix[3].x*.13));
      `);
      shader.fragmentShader="uniform float windLight; varying float leafLight;\n"+shader.fragmentShader.replace("#include <color_fragment>",`
        #include <color_fragment>
        diffuseColor.rgb*=1.+leafLight*windLight*.096;
      `);
    };
    mat.customProgramCacheKey=()=>"grayline-tree-sway";
    const depthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:mat.map,alphaTest:mat.alphaTest,side:mat.side});
    depthMaterial.onBeforeCompile=bend;
    depthMaterial.customProgramCacheKey=()=>"grayline-tree-shadow-sway";
    const sets=[[],[],[]], occupied=new Set();
    for (let i=0;i<5920;i++) {
      const x=(random()-.5)*939,z=(random()-.5)*921;
      const clump=smooth(-.65,.70,w.terrain.n.noise(x*.012+14,z*.011-8));
      const region=nearestPlace(x,z);
      const inPlot=Math.abs(x-region.x)<region.rx+.4 && Math.abs(z-region.z)<region.rz+.4;
      if (random()>.10+clump*.83 || (inPlot && random()>(region.name==="Bracken Camp"?.49:.093)) || !this.suitable(x,z,2.45)) continue;
      const key=Math.floor(x/5)+","+Math.floor(z/5);
      if (occupied.has(key)) continue;
      occupied.add(key);
      const kind=random()<(z<0?.72:.49)?0:random()<.69?1:2;
      const size=.61+random()*.88,r=(kind===0?.28:.40)*size,sy=size*(.89+random()*.23);
      const spot=w.placeProp("tree",x,z,1.46*size,1.46*size,false,-.045);
      if(!spot) continue;
      const {y}=spot,node=w.resource(0,90,24);
      node.colliders.push(w.collision.cylinder(x,y,z,(kind===0?6.9:5.0)*sy,r,.075*size,{node,surface:"wood",noFloor:true}));
      sets[kind].push({x,y,z,sx:size,sy,sz:size,yaw:random()*TAU,tint:.83+random()*.22,node});
      if (sets.reduce((count,set)=>count+set.length,0)>1480) break;
    }
    const town=w.terrain.plots[0];
    for (const [u,v,kind,size] of [[-69,34,0,1.05],[-68,-50,1,.82],[-48,-50,0,.9],[-29,-49,2,.84],
      [9,-53,0,1.19],[10,6,1,.97],[33,7,2,.97],[65,26,0,1.16],[46,26,2,.92],[-13,32,1,.89],[-13,-37,2,.88],[67,-49,0,1.22]]) {
      const x=town.x+u,z=town.z+v;
      if (!this.suitable(x,z,.85)) continue;
      const spot=w.placeProp("tree",x,z,1.38*size,1.38*size,false,-.04);
      if(!spot) continue;
      const {y}=spot,node=w.resource(0,96,24);
      node.colliders.push(w.collision.cylinder(x,y,z,(kind===0?6.9:5.0)*size,(kind===0?.28:.4)*size,.075*size,{node,surface:"wood",noFloor:true}));
      sets[kind].push({x,y,z,sx:size,sy:size,sz:size,yaw:hash(x,z)*TAU,tint:1,node});
    }
    sets.forEach((entries,i)=>this.instantiate(entries,this.treeGeometry(i,false),mat,this.treeGeometry(i,true),true,depthMaterial));
  }
  makeRocksAndShrubs() {
    const w=this.world, random=rng(18771), stones=[], shrubs=[], logs=[];
    for (let i=0;i<965;i++) {
      const quarry=i<105;
      const x=quarry?224+(random()-.5)*163:(random()-.5)*923;
      const z=quarry?234+(random()-.5)*141:(random()-.5)*915;
      if (!this.suitable(x,z,quarry?2.0:1.0)) continue;
      const y=w.terrain.height(x,z), yaw=random()*TAU;
      if (quarry || i%3===0) {
        const s=quarry ? .62+random()**1.9*3.37 : .41+random()**2*1.39;
        const sy=s*(.57+random()*.67), sz=s*(.82+random()*.37);
        const radius=Math.max(s,sz)*.88;
        const spot=w.placeProp("rock",x,z,radius,radius,false,sy*.34);
        if(!spot) continue;
        const node=w.resource(1,78+s*19,Math.round(12+s*5));
        node.colliders.push(w.collision.ellipsoid(x,spot.y,z,s*.94,sy*.91,sz*.94,yaw,{node,surface:"stone"}));
        stones.push({x,y:spot.y,z,sx:s,sy,sz,yaw,tint:.82+random()*.27,node});
      } else {
        const s=.42+random()*.78;
        if(w.placeProp("shrub",x,z,s*.72,s*.71,false,s*.39)) shrubs.push({x,y:y+s*.39,z,sx:s,sy:s*.69,sz:s*.76,yaw,tint:.68+random()*.36});
      }
    }
    for (let i=0;i<90;i++) {
      const x=(random()-.5)*836,z=(random()-.5)*811;
      if (!this.suitable(x,z,2) || w.terrain.slope(x,z)>.21) continue;
      const spot=w.placeProp("log",x,z,.32,1.49,false,.25);
      if(!spot) continue;
      const y=spot.base,node=w.resource(0,62,17);
      node.colliders.push(w.collision.add(bounds(x,y+.24,z,.49,.51,2.96),{node,surface:"wood"}));
      logs.push({x,y:y+.25,z,sx:1,sy:1,sz:1,yaw:0,node});
    }
    const rock=new THREE.IcosahedronGeometry(1,1);
    const p=rock.attributes.position;
    for (let i=0;i<p.count;i++) {
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      const s=.92+hash(Math.round(x*100+y*91),Math.round(z*99))* .24;
      p.setXYZ(i,x*s,y*s,z*s);
    }
    rock.computeVertexNormals();
    this.instantiate(stones,rock,this.mats.rock);
    const bush=new THREE.IcosahedronGeometry(1,1);
    this.instantiate(shrubs,bush,this.mats.paint("#637453",.97),null,false);
    this.instantiate(logs,cylinderBetween(vec(0,0,-1.48),vec(0,0,1.48),.3,.22,8),this.mats.bark);
  }
  makeCars() {
    const w=this.world,m=this.mats,entries=[];
    w.carSpawns.push([143,70,0],[114,69,.1],[-240,157,0],[246,251,Math.PI/2]);
    for (const [x,z,yaw] of w.carSpawns) {
      const width=Math.abs(Math.cos(yaw))*1.99+Math.abs(Math.sin(yaw))*3.87;
      const length=Math.abs(Math.cos(yaw))*3.87+Math.abs(Math.sin(yaw))*1.99;
      const spot=w.placeProp("car",x,z,width/2,length/2,true,-.015);
      if(!spot) continue;
      const {y}=spot,node=w.resource(2,128,20);
      node.colliders.push(w.collision.oriented(x,y+.515,z,1.97,.79,3.85,0,yaw,0,{surface:"metal",node}));
      node.colliders.push(w.collision.oriented(x,y+1.12,z+.33*Math.cos(yaw),1.39,.45,1.56,0,yaw,0,{surface:"metal",node}));
      w.stashes.push({kind:"car",position:vec(x,y+.73,z),node});
      const colors=["#a1b2b0","#986c5c","#7b9298","#8f8d71","#b3ac9b"];
      entries.push({x,y,z,sx:1,sy:1,sz:1,yaw,tint:new THREE.Color(colors[Math.floor(hash(x,z)*colors.length)]),node});
      w.noGrass.push({x,z,rx:width/2,rz:length/2});
    }
    const shell=[
      boxAt(0,.58,0,1.79,.65,3.73),boxAt(0,.88,-1.22,1.71,.19,1.24,.08,0,.028),
      boxAt(0,1.38,.32,1.40,.12,1.55),boxAt(0,.80,1.40,1.70,.22,.78)
    ];
    const rubber=[], windows=[boxAt(0,1.12,.33,1.31,.44,1.44,0,0,0)], trim=[], tail=[];
    for (const x of [-.88,.88]) for (const z of [-1.18,1.17]) rubber.push(cylinderBetween(vec(x-.12,.37,z),vec(x+.12,.37,z),.35,.35,10));
    rubber.push(boxAt(0,.45,1.91,1.84,.19,.13),boxAt(0,.45,-1.91,1.84,.19,.13));
    for(const x of [-.65,.65]) shell.push(boxAt(x,1.13,-.37,.11,.50,.11,.32),boxAt(x,1.14,1.02,.11,.47,.12,-.28));
    for (const side of [-1,1]) {
      trim.push(boxAt(side*.65,.705,-1.876,.39,.15,.081),boxAt(side*.93,.85,.19,.05,.043,.20));
      tail.push(boxAt(side*.668,.72,1.886,.31,.128,.07));
      for (const z of [-1.18,1.17]) trim.push(cylinderBetween(vec(side*.986,.37,z),vec(side*1.012,.37,z),.166,.166,10));
    }
    rubber.push(boxAt(0,.691,-1.879,.84,.17,.073));
    trim.push(boxAt(0,.577,1.889,.29,.09,.061));
    this.instantiate(entries,mergeParts(shell),m.paint("#c7c6bd",.61,.34));
    this.instantiate(entries,mergeParts(rubber),m.paint("#2e3331"));
    this.instantiate(entries,mergeParts(windows),m.paint("#4e6669",.28,.32));
    this.instantiate(entries,mergeParts(trim),m.paint("#989c90",.51,.46),null,false);
    this.instantiate(entries,mergeParts(tail),m.paint("#885045",.53,.17),null,false);
  }
  setupGrass() {
    const blade=new THREE.BufferGeometry(), p=[],col=[],indices=[];
    const random=rng(514);
    for(let i=0;i<6;i++) {
      const angle=i*2.39996, dx=Math.cos(angle),dz=Math.sin(angle);
      const x=(random()-.5)*.58,z=(random()-.5)*.58,height=.19+random()*.37,width=.018+random()*.017;
      const lean=.065+random()*.11,mx=x-dz*lean*.38,mz=z+dx*lean*.38;
      const v=p.length/3;
      p.push(x-dx*width,0,z-dz*width,x+dx*width,0,z+dz*width,
        mx-dx*width*.68,height*.61,mz-dz*width*.68,mx+dx*width*.68,height*.61,mz+dz*width*.68,
        x-dz*lean,height,z+dx*lean);
      col.push(.41,.54,.32,.42,.55,.32,.65,.71,.43,.65,.72,.43,.88,.87,.56);
      indices.push(v,v+1,v+2,v+1,v+3,v+2,v+2,v+3,v+4);
    }
    blade.setAttribute("position",new THREE.Float32BufferAttribute(p,3));
    blade.setAttribute("color",new THREE.Float32BufferAttribute(col,3));
    blade.setIndex(indices);
    blade.computeVertexNormals();
    const flower=mergeParts([
      tintedGeometry(cylinderBetween(vec(0,0,0),vec(.047,.40,0),.017,.013,4),"#63734f"),
      tintedGeometry(new THREE.IcosahedronGeometry(.069,0).scale(1,.54,1).translate(.047,.41,0),"#c8bc84"),
      tintedGeometry(new THREE.IcosahedronGeometry(.041,0).translate(.047,.439,0),"#b2996b")
    ]);
    const mat=new THREE.MeshStandardMaterial({color:"#a4ad84",vertexColors:true,side:THREE.DoubleSide,roughness:1,envMapIntensity:.11});
    this.grassUniforms={ grassClock:{value:0}, grassFocus:{value:vec()}, grassRadius:{value:56}, grassWind:this.world.climate.windStrength };
    mat.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,this.grassUniforms);
      shader.vertexShader="uniform float grassClock,grassRadius,grassWind; uniform vec3 grassFocus; varying float grassPatch;\n"+shader.vertexShader.replace("#include <begin_vertex>",`
        #include <begin_vertex>
        vec3 root=instanceMatrix[3].xyz;
        grassPatch=.62*sin(root.x*.19+sin(root.z*.31))+.38*cos(root.z*.27+root.x*.11);
        float fade=1.-smoothstep(grassRadius*.75,grassRadius,length(root.xz-grassFocus.xz));
        transformed.y*=fade*(.89+grassPatch*.12);
        float wave=sin(root.x*.22+root.z*.14+grassClock*2.9)+.39*sin(root.z*.61+grassClock*5.3);
        vec3 direction=vec3(.94,0.,.34)*mat3(instanceMatrix);
        transformed.xz+=normalize(direction.xz)*transformed.y*(wave*.35+.57)*grassWind;
      `);
      shader.fragmentShader="varying float grassPatch;\n"+shader.fragmentShader.replace("#include <color_fragment>",`
        #include <color_fragment>
        diffuseColor.rgb*=mix(vec3(.76,.92,.85),vec3(1.20,1.10,.86),.5+.5*grassPatch);
      `);
    };
    mat.customProgramCacheKey=()=>"grayline-wind";
    this.grass=new THREE.InstancedMesh(blade,mat,16000);
    this.flowers=new THREE.InstancedMesh(flower,mat,730);
    for (const mesh of [this.grass,this.flowers]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count=0;
      mesh.receiveShadow=true;
      mesh.frustumCulled=false;
      this.world.scene.add(mesh);
    }
    this.grassKey="";
  }
  refreshGrass(focus,prefs) {
    const density=prefs.grass,radius=25+density*.44,step=1.60-density*.0062;
    const cx=Math.floor(focus.x/12)*12,cz=Math.floor(focus.z/12)*12;
    const key=cx+","+cz+","+density;
    if (key===this.grassKey) return;
    this.grassKey=key;
    const w=this.world, matrix=new THREE.Matrix4(), q=new THREE.Quaternion();
    let g=0,f=0;
    const ix=Math.ceil(cx/step),iz=Math.ceil(cz/step),cells=Math.ceil((radius+10)/step);
    for (let i=ix-cells;i<=ix+cells;i++) for(let j=iz-cells;j<=iz+cells;j++) {
      if (g>=16000) break;
      const x=(i+hash(i,j,93))*step,z=(j+hash(i,j,11))*step;
      if (dist(x,z,cx,cz)>radius+8 || (w.terrain.surface(x,z)!=="grass") || !this.suitable(x,z,.10)) continue;
      const size=.62+hash(i,j,46)*.92;
      const y=w.terrain.height(x,z);
      q.setFromAxisAngle(vec(0,1,0),hash(i,j,619)*TAU);
      matrix.compose(vec(x,y-.045,z),q,vec(size,size,size));
      this.grass.setMatrixAt(g++,matrix);
      if (f<730 && hash(i,j,198)>.97) this.flowers.setMatrixAt(f++,matrix);
    }
    this.grass.count=g;
    this.flowers.count=f;
    this.grass.instanceMatrix.needsUpdate=this.flowers.instanceMatrix.needsUpdate=true;
    this.grassUniforms.grassRadius.value=radius;
  }
  update(focus,clock,prefs,aerial) {
    const low=prefs.preset==="low",medium=prefs.preset==="medium";
    const far=low?478:medium?657:prefs.distance+94;
    for (const group of this.groups) {
      const d=dist(focus.x,focus.z,group.x,group.z);
      const close=!group.distant || (!aerial && d<(prefs.preset==="low"?85:119));
      group.mesh.visible=close && d<prefs.distance+80;
      if(group.distant) group.distant.visible=!close && d<far;
    }
    this.grass.visible=this.flowers.visible=!aerial && prefs.grass>0 && focus.y-this.world.terrain.height(focus.x,focus.z)<14;
    if (this.grass.visible) this.refreshGrass(focus,prefs);
    this.grassUniforms.grassClock.value=clock;
    this.grassUniforms.grassFocus.value.copy(focus);
  }
}

class World {
  constructor(scene) {
    this.scene=scene;
    this.climate={
      simTime:{value:0}, wetness:{value:0}, windStrength:{value:.34}, stormShade:{value:0},
      horizonTint:{value:new THREE.Color(HORIZON_COLOR)}, skyTint:{value:new THREE.Color("#65899f")},
      sunTint:{value:new THREE.Color("#fff0d4")}, sunDir:{value:vec(...SUN_DIRECTION).normalize()},
      fogRate:{value:.002}, sunStrength:{value:1}
    };
  }
  async initialize(stage,headless=false) {
    const scene=this.scene;
    this.headless=headless;
    this.mats=new Materials(this.climate,headless);
    await stage(32,"Surveying the island and grading roads");
    this.roads=new RoadNetwork();
    this.terrain=new Terrain(scene,this.mats,this.climate,this.roads,headless);
    this.collision=new Collision(this.terrain);
    this.batches=new StaticBatches(scene,headless);
    this.resources=[];
    this.stashes=[];
    this.doors=[];
    this.carSpawns=[];
    this.placedProps=[];
    this.lights=[];
    this.powerPoles=[];
    this.rotors=[];
    this.noGrass=[];
    await stage(49,"Building districts, interiors and bridges");
    this.buildings=new Buildings(this);
    this.makeApproaches();
    if(!headless) this.roads.paint(this.terrain);
    await stage(64,"Placing vegetation, vehicles and cover");
    this.vegetation=new Vegetation(this);
    // Add a chest beside every other ammo box, preserving existing container IDs.
    const extraChests=this.stashes.filter(stash=>stash.kind==="ammo").filter((_,index)=>index%2===0);
    for(const stash of extraChests) {
      const origin=stash.position;
      for(const [dx,dz] of [[1.45,0],[-1.45,0],[0,1.45],[0,-1.45]]) {
        const x=origin.x+dx,z=origin.z+dz,y=this.collision.floor(x,z,origin.y+.3,.12).y;
        if(Math.abs(y-origin.y)>.3 || this.collision.blocked(x,y,z,1,.47)) continue;
        if(this.stashes.some(other=>other.position.distanceToSquared(vec(x,y,z))<1.35**2)) continue;
        this.stashes.push({kind:"chest",position:vec(x,y,z),building:stash.building});
        break;
      }
    }
    this.doors.forEach((door,index)=>{door.netId=index;});
    this.batches.commit();
    if(!headless) { this.makeMap();this.terrain.warm(); }
  }
  // Validate the capsule route before painting the approach or scattering vegetation.
  accessSpan(a,b) {
    const {terrain:t,collision:c}=this;
    const steps=Math.max(1,Math.ceil(areaDistance(a,b.x,b.z)/.33));
    let prior=a.y;
    for(let i=1;i<=steps;i++) {
      const x=lerp(a.x,b.x,i/steps),z=lerp(a.z,b.z,i/steps);
      const support=c.floor(x,z,prior+.267,.323);
      if(support.y<SEA+.06 || support.y-prior>.269 || prior-support.y>.48 ||
        (!support.entry && t.slope(x,z)>1.04) || c.blocked(x,support.y,z,1.66,.304,true)) return false;
      prior=support.y;
    }
    return Math.abs(prior-b.y)<.53;
  }
  makeApproaches() {
    const {collision:c,terrain:t,roads}=this;
    const walkPoint=(x,z,near=Infinity)=>vec(x,c.floor(x,z,near,.07).y,z);
    for(const b of this.buildings.all) {
      const threshold=b.nodes[b.outside].position;
      const candidates=[];
      for (const edge of roads.edges) {
        if(edge.kind==="bridge" || edge.kind==="trail") continue;
        const t0=roads.projection(edge,threshold.x,threshold.z);
        for(const shift of [0,-4,4,-9,9,-17,17]) {
          const u=clamp(t0+shift/edge.length,0,1);
          const x=edge.a.x+edge.dx*u,z=edge.a.z+edge.dz*u;
          const distance=areaDistance(threshold,x,z);
          if(distance<78 && z>threshold.z-13) {
            candidates.push({x,z,cost:distance+Math.max(0,threshold.z-z)*1.8});
          }
        }
      }
      candidates.sort((a,b)=>a.cost-b.cost);
      const start=walkPoint(threshold.x,threshold.z,threshold.y+.22);
      const ends=[start];
      for(const step of [1.4,2.9,5.4,8.6,12]) {
        const end=walkPoint(start.x,start.z+step,start.y+.31);
        if(this.accessSpan(start,end)) ends.push(end);
      }
      for(const route of candidates.slice(0,54)) {
        if(b.approach) break;
        const goal=walkPoint(route.x,route.z,t.height(route.x,route.z)+.31);
        for(const end of ends) {
          if(goal.z<end.z-.8 && end===start) continue;
          const segments=[end,goal];
          if(!this.accessSpan(end,goal)) {
            const bend=walkPoint(goal.x,end.z,t.height(goal.x,end.z)+.27);
            if(!this.accessSpan(end,bend) || !this.accessSpan(bend,goal)) continue;
            segments.splice(1,0,bend);
          }
          b.approach=segments[0]===start?segments:[start,...segments];
          b.walk=roads.addWalk(b.approach);
          let prior=b.outside;
          for(const point of b.approach.slice(1)) prior=b.nav(point.x-b.x,point.y-b.y,point.z-b.z,[prior]);
          b.accessNode=prior;
          break;
        }
      }
    }
  }
  placeProp(type,x,z,rx,rz,allowPaving=false,groundOffset=0) {
    const original=this.terrain.height(x,z),slope=this.terrain.slope(x,z);
    if(original<SEA+.37 || slope>(type==="car"?.25:type==="tree"?.75:.60) ||
      this.roads.surfaceAt(x,z,Math.max(rx,rz)*.79)) return null;
    const support=this.collision.floor(x,z,original+.24,.035);
    const base=allowPaving?support.y:original;
    if (!allowPaving && support.entry && support.y>original+.025) return null;
    const obstructed=this.collision.visit(x-rx,z-rz,x+rx,z+rz,entry=>{
      const box=entry.box;
      if(entry.pavement || entry===support.entry || box.min.y>base+2.2 || box.max.y<base+.07) return false;
      return Math.abs(x-clamp(x,box.min.x,box.max.x))<rx && Math.abs(z-clamp(z,box.min.z,box.max.z))<rz;
    });
    if(obstructed) return null;
    for(const prop of this.placedProps) {
      if(Math.abs(x-prop.x)<rx+prop.rx && Math.abs(z-prop.z)<rz+prop.rz) return null;
    }
    const placement={type,x,z,rx,rz,base,y:base+groundOffset,offset:groundOffset,entry:support.entry};
    this.placedProps.push(placement);
    return placement;
  }
  resource(type,max,reward) {
    const node={ type,max,hp:max,reward,colliders:[],spans:[],instances:[],attached:[],attachedDoors:[],destroyed:false };
    node.netId=this.resources.length;
    this.resources.push(node);
    return node;
  }
  break(node) {
    if (node.destroyed) return;
    node.destroyed=true;
    this.onBreak?.(node.netId);
    for (const entry of node.colliders) if (entry.active) this.collision.remove(entry);
    for (const span of node.spans) {
      const {position,start,count,original}=span, arr=position.array;
      for (let j=start;j<start+count;j+=3) {
        arr[j]=original[0]; arr[j+1]=original[1]; arr[j+2]=original[2];
      }
      position.needsUpdate=true;
    }
    for (const {mesh,i} of node.instances) {
      mesh.setMatrixAt(i,new THREE.Matrix4().makeScale(0,0,0));
      mesh.instanceMatrix.needsUpdate=true;
    }
    for (const child of node.attached) this.break(child);
    for (const door of node.attachedDoors) {
      door.object.visible=false;
      if (door.collider.active) this.collision.remove(door.collider);
    }
  }
  reset() {
    for (const node of this.resources) {
      node.hp=node.max;
      if (!node.destroyed) continue;
      node.destroyed=false;
      for (const entry of node.colliders) {
        entry.active=true;
        this.collision.insert(entry);
      }
      for (const {position,start,original} of node.spans) {
        position.array.set(original,start);
        position.needsUpdate=true;
      }
      for (const {mesh,i,matrix} of node.instances) {
        mesh.setMatrixAt(i,matrix);
        mesh.instanceMatrix.needsUpdate=true;
      }
      for (const door of node.attachedDoors) {
        door.object.visible=true;
        door.collider.active=true;
        this.collision.insert(door.collider);
      }
    }
    for (const door of this.doors) door.reset();
  }
  update(focus,clock,prefs,aerial) {
    this.terrain.update(focus,clock,prefs,aerial);
    this.batches.update(focus,prefs.distance);
    this.vegetation.update(focus,clock,prefs,aerial);
  }
  animate(clock) {
    for (const {object,axis,speed} of this.rotors) object.rotation[axis]=clock*speed;
  }
  makeMap() {
    const size=660,c=canvas2D(size),ctx=c.getContext("2d");
    const image=ctx.createImageData(size,size);
    for (let j=0;j<size;j++) for(let i=0;i<size;i++) {
      const x=(i/size-.5)*1024,z=(j/size-.5)*1024,y=this.terrain.height(x,z);
      const k=(j*size+i)*4;
      const shade=clamp((y-this.terrain.height(x-2,z-2))*25,-24,24);
      const contour=(y>6 && y%8<.66)?6:0;
      if (y<SEA) {
        const d=clamp(SEA-y,0,12);
        image.data.set([37-d*.76,79-d*1.48,89-d*1.38,255],k);
      } else if(y<SEA+3.6) image.data.set([137,141,112,255],k);
      else image.data.set([75+y*.57+shade-contour,101+y*.39+shade-contour,78+y*.56+shade-contour,255],k);
    }
    ctx.putImageData(image,0,0);
    const p=n=>(n/1024+.5)*size;
    this.roads.draw(ctx,p,size);
    ctx.fillStyle="#a6a08a";
    ctx.fillRect(p(LAKE_ACCESS.east),p(LAKE_ACCESS.z-2.38),35/1024*size,4.76/1024*size);
    ctx.fillStyle="#b2b29b";
    for (const b of this.buildings.all) ctx.fillRect(p(b.x-b.w/2),p(b.z-b.d/2),b.w/1024*size,b.d/1024*size);
    this.map=c;
  }
}
// Procedural weapon silhouettes. The hand pivot is at the grip and the muzzle faces -Z.
class Weapons {
  constructor(mats) {
    this.mats=mats;
    this.forms={};
    const dark=mats.paint("#343b37",.53,.20),metal=mats.paint("#666d66",.46,.72);
    const specs={
      pistol:{front:.26, back:.105, width:.082, mag:.14, stock:0, shape:.12},
      smg:{front:.42, back:.27, width:.11, mag:.255,stock:.18, shape:.21},
      shotgun:{front:.73, back:.31, width:.116, mag:.06,stock:.24, shape:.28},
      rifle:{front:.65, back:.31, width:.124, mag:.235,stock:.22, shape:.31},
      sniper:{front:.92, back:.33, width:.128, mag:.115,stock:.255, shape:.48}
    };
    // These are the top of the rear notch and front post, or the scope axis.
    const sights={
      pistol:[vec(0,.180,.053),vec(0,.183,-.211),.47],
      smg:[vec(0,.205,.023),vec(0,.203,-.42*.77),.50],
      shotgun:[vec(0,.207,.023),vec(0,.202,-.689),.62],
      rifle:[vec(0,.205,.023),vec(0,.205,-.65*.77),.57],
      sniper:[vec(0,.226,.018),vec(0,.226,-.342),.55]
    };
    const supports={
      pistol:vec(-.048,-.029,.021),smg:vec(-.054,.032,-.177),shotgun:vec(-.057,.027,-.282),
      rifle:vec(-.057,.035,-.227),sniper:vec(-.057,.038,-.251),pick:vec(-.028,-.185,.014)
    };
    for (const [id,s] of Object.entries(specs)) {
      const {front,back,width,mag,stock,shape}=s;
      const gun=new THREE.Group();
      let magazinePart=null;
      const polymer=[boxAt(0,-.062,.017,.081,.153,.116,-.21),
        boxAt(0,.079,-shape*.45,width,.106,shape+.105)];
      const iron=[boxAt(0,.133,-shape*.53,width*.83,.04,shape+.087),
        cylinderBetween(vec(0,.123,-shape*.62),vec(0,.123,-front),width*.22,width*.15,10),
        boxAt(0,.028,-.124,width*.61,.049,.158)];
      if (id==="pistol") {
        iron.push(boxAt(0,.117,-.087,.083,.072,.301));
      } else {
        polymer.push(boxAt(0,.053,back-stock*.45,.111,.132,stock,0,0,.025));
        polymer.push(boxAt(0,.044,back,.123,.18,.045,.065));
        polymer.push(boxAt(0,.068,-front*.65,width*.89,.103,front*.35));
        iron.push(boxAt(0,.175,-shape*.58,width*.55,.024,shape*.95),boxAt(0,.090,-front+.034,width*.63,.088,.087));
        for (let i=0;i<5;i++) iron.push(boxAt(0,.191,-.051-i*.028,width*.51,.012,.013));
      }
      if (mag>.1 && id!=="shotgun") {
        const magazine=id==="pistol"?mergeParts([
          boxAt(0,-.116,.023,.071,.052,.090,-.21),
          boxAt(0,-.143,.028,.076,.018,.102,-.21)
        ]):boxAt(0,-mag*.38,-.116,width*.64,mag,.104,.22);
        magazinePart=new THREE.Mesh(magazine,metal);
        magazinePart.name="magazine";
      }
      if (id==="shotgun") {
        iron.push(cylinderBetween(vec(0,.082,-.19),vec(0,.082,-.648),.022,.018,8));
        polymer.push(boxAt(0,.057,-.435,.113,.087,.232));
      }
      if (id==="sniper") {
        iron.push(cylinderBetween(vec(0,.226,.018),vec(0,.226,-.245),.038,.038,10));
        iron.push(cylinderBetween(vec(0,.226,-.224),vec(0,.226,-.337),.051,.06,10));
        iron.push(cylinderBetween(vec(0,.226,-.315),vec(0,.226,-.342),.051,.051,12));
        polymer.push(boxAt(0,.182,-.097,.057,.086,.155));
      }
      const [rear,post,eyeRelief]=sights[id];
      if (id!=="sniper") {
        const height=id==="pistol"?.025:id==="shotgun"?.062:.044;
        iron.push(boxAt(0,post.y-height*.5,post.z,.016,height,.024));
        iron.push(boxAt(0,rear.y-.030,rear.z,.055,.012,.034));
        for (const side of [-1,1]) iron.push(boxAt(side*.020,rear.y-.013,rear.z,.012,.026,.031));
      }
      const body=new THREE.Mesh(mergeParts(polymer),dark),detail=new THREE.Mesh(mergeParts(iron),metal);
      body.castShadow=true;
      gun.add(body,detail);
      if (magazinePart) gun.add(magazinePart);
      this.forms[id]={
        gun, muzzle:vec(0,.123,-front-.024), sight:rear.clone().lerp(post,.5),
        sightRotation:new THREE.Quaternion().setFromUnitVectors(post.clone().sub(rear).normalize(),vec(0,0,-1)),
        eyeRelief,support:supports[id]
      };
    }
    const pick=new THREE.Group();
    const shaft=new THREE.Mesh(cylinderBetween(vec(0,-.37,.018),vec(0,.37,-.055),.037,.032,8),mats.wood);
    const tool=new THREE.Mesh(mergeParts([
      boxAt(0,.34,-.075,.115,.095,.12),
      boxAt(0,.345,-.229,.079,.096,.257,.19),
      boxAt(0,.358,.055,.073,.082,.167,-.27),
      boxAt(0,.378,-.375,.045,.05,.112,.43)
    ]),metal);
    pick.add(shaft,tool);
    this.forms.pick={gun:pick,muzzle:vec(0,.37,-.39),support:supports.pick};
  }
  model(id) { return this.forms[id]?.gun.clone() || null; }
  muzzle(id) { return this.forms[id].muzzle; }
}

const RIG = [
  ["pelvis","",0,.91,0],["spine","pelvis",0,.128,0],["chest","spine",0,.215,0],
  ["neck","chest",0,.222,-.009],["head","neck",0,.145,-.012],
  ["upperR","chest",.215,.127,0],["lowerR","upperR",0,-.267,0],["handR","lowerR",0,-.241,0],
  ["upperL","chest",-.215,.127,0],["lowerL","upperL",0,-.267,0],["handL","lowerL",0,-.241,0],
  ["thighR","pelvis",.104,-.036,0],["shinR","thighR",0,-.404,0],["footR","shinR",0,-.385,0],
  ["thighL","pelvis",-.104,-.036,0],["shinL","thighL",0,-.404,0],["footL","shinL",0,-.385,0],
  ["pack","chest",0,0,.097]
];
const OUTFITS = [
  ["#627a72","#515957","#4e5146","#c19376","#c99759"],
  ["#7c7662","#53544b","#444b3e","#a67860","#a99975"],
  ["#526774","#495456","#3e4849","#cda685","#8da0a0"],
  ["#6e7756","#5a584b","#485143","#895c49","#b49a66"],
  ["#666f71","#454d50","#424b4a","#d4af94","#8a9c8e"],
  ["#817261","#58564f","#49473e","#9b6d59","#b58c64"],
  ["#52635a","#58635c","#3c473f","#b4896e","#83998b"],
  ["#687d7d","#565e58","#424b4a","#825947","#b59e6c"]
];
const ARM_LENGTH = [.267,.241];
const VIEW_ARM_LENGTH = [.385,.424];
const SIDES = [["R",1],["L",-1]];

function characterBones(definitions) {
  const bones={};
  for (const [id,parent,x,y,z] of definitions) {
    const joint=new THREE.Bone();
    joint.name=id;
    joint.position.set(x,y,z);
    bones[id]=joint;
    if (parent) bones[parent].add(joint);
  }
  for (const joint of Object.values(bones)) if (!joint.parent) joint.updateMatrixWorld(true);
  return bones;
}

// Contours run from bottom to top. They let sleeves and trousers bend as continuous cloth.
function clothingLoft(profile,segments) {
  const p=[],u=[],f=[],row=segments+1;
  for (const [j,[y,w,d,z=0,x=0,shape=1]] of profile.entries()) {
    for (let i=0;i<=segments;i++) {
      const angle=i/segments*TAU,cos=Math.cos(angle),sin=Math.sin(angle);
      p.push(x+w*Math.sign(cos)*Math.abs(cos)**shape,y,z+d*Math.sign(sin)*Math.abs(sin)**shape);
      u.push(i/segments,j/(profile.length-1));
    }
  }
  for (let j=0;j<profile.length-1;j++) for (let i=0;i<segments;i++) {
    const a=j*row+i,b=a+1,c=a+row,d=c+1;
    f.push(a,c,b,b,c,d);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.Float32BufferAttribute(p,3));
  geo.setAttribute("uv",new THREE.Float32BufferAttribute(u,2));
  geo.setIndex(f);
  geo.computeVertexNormals();
  const normals=geo.attributes.normal, seam=vec();
  for (let j=0;j<profile.length;j++) {
    const a=j*row,b=a+segments;
    seam.set(normals.getX(a)+normals.getX(b),normals.getY(a)+normals.getY(b),normals.getZ(a)+normals.getZ(b)).normalize();
    normals.setXYZ(a,seam.x,seam.y,seam.z);
    normals.setXYZ(b,seam.x,seam.y,seam.z);
  }
  return geo;
}

class OutfitMesh {
  constructor(bones,cheap) {
    this.bones=bones;
    this.indices=new Map(Object.keys(bones).map((name,index)=>[name,index]));
    this.parts=[];
    this.cheap=cheap;
  }
  add(bone,geo,tint,fabric=0,weights=null) {
    const positions=geo.attributes.position, count=positions.count, index=this.indices.get(bone);
    const color=new THREE.Color(tint), colors=new Float32Array(count*3);
    const ids=new Uint16Array(count*4), influences=new Float32Array(count*4), cloth=new Float32Array(count).fill(fabric);
    for (let i=0;i<count;i++) {
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      const variation=fabric*(.084*Math.sin(y*67+x*19+z*21)+.042*Math.cos(y*113-z*26)+.033*Math.sin(x*59+z*63));
      colors.set([color.r*(1+variation),color.g*(1+variation),color.b*(1+variation)],i*3);
      if (weights) {
        const blend=weights(y);
        for (let j=0;j<blend.length;j++) {
          ids[i*4+j]=this.indices.get(blend[j][0]);
          influences[i*4+j]=blend[j][1];
        }
      } else {
        ids[i*4]=index;
        influences[i*4]=1;
      }
    }
    geo.applyMatrix4(this.bones[bone].matrixWorld);
    geo.setAttribute("color",new THREE.BufferAttribute(colors,3));
    geo.setAttribute("skinIndex",new THREE.Uint16BufferAttribute(ids,4));
    geo.setAttribute("skinWeight",new THREE.Float32BufferAttribute(influences,4));
    geo.setAttribute("cloth",new THREE.BufferAttribute(cloth,1));
    this.parts.push(geo);
  }
  fabric(bone,tint,profile,weights=null,amount=1) {
    this.add(bone,clothingLoft(profile,this.cheap?9:20),tint,amount,weights);
  }
  shell(bone,tint,x,y,z,w,h,d,square=1,cloth=0,angle=0) {
    const g=new THREE.SphereGeometry(1,this.cheap?7:12,this.cheap?4:8),p=g.attributes.position;
    if (square!==1) {
      const round=v=>Math.sign(v)*Math.abs(v)**square;
      for(let i=0;i<p.count;i++) p.setXYZ(i,round(p.getX(i)),round(p.getY(i)),round(p.getZ(i)));
      g.computeVertexNormals();
    }
    g.scale(w,h,d).rotateZ(angle).translate(x,y,z);
    this.add(bone,g,tint,cloth);
  }
  box(bone,tint,x,y,z,w,h,d,angle=0,cloth=0) {
    this.add(bone,boxAt(x,y,z,w,h,d,0,0,angle),tint,cloth);
  }
  piping(bone,tint,points,r,fabric=0) {
    for(let i=1;i<points.length;i++) this.add(bone,cylinderBetween(vec(...points[i-1]),vec(...points[i]),r,r,this.cheap?4:5),tint,fabric);
  }
  finish() {
    const geometry=mergeParts(this.parts);
    geometry.computeBoundingSphere();
    return geometry;
  }
}

class Characters {
  constructor() {
    this.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.79,envMapIntensity:.31});
    this.material.onBeforeCompile=shader=>{
      shader.vertexShader="attribute float cloth; varying float weaveMask; varying vec3 clothRest;\n"+
        shader.vertexShader.replace("#include <begin_vertex>",`
          #include <begin_vertex>
          weaveMask=cloth;
          clothRest=position;
        `);
      shader.fragmentShader="varying float weaveMask; varying vec3 clothRest;\n"+
        shader.fragmentShader.replace("#include <color_fragment>",`
          #include <color_fragment>
          vec2 thread=vec2((clothRest.x+clothRest.z*.73)*725.,clothRest.y*798.);
          float aa=1.-smoothstep(.51,3.14,max(fwidth(thread.x),fwidth(thread.y)));
          float weave=sin(thread.x)*sin(thread.y)*aa;
          float weather=sin(clothRest.x*11.+clothRest.y*31.)*sin(clothRest.z*38.+clothRest.y*13.);
          diffuseColor.rgb*=1.+weaveMask*(weave*.107+weather*.056);
        `);
    };
    this.material.customProgramCacheKey=()=>"highwater-woven-kit";
    this.cache=new Map();
  }
  sleeve(kit,side,sign,coat,accent,length) {
    const upper="upper"+side,lower="lower"+side,hand="hand"+side;
    const [a,b]=length, joint=-a,total=a+b;
    const black="#333b38", trim="#536159", patch="#40544e";
    const weight=y=>{
      const elbow=1-smooth(joint-.085*(a/.267),joint+.079*(a/.267),y);
      return [[upper,1-elbow],[lower,elbow]];
    };
    if (kit.cheap) {
      kit.fabric(upper,coat,[
        [-total,.050,.052],[-total+b*.32,.067,.062,.006],[joint,.070,.067,.010],
        [-a*.32,.086,.075,.006],[0,.087,.079],[.068,.014,.014]
      ],weight);
    } else {
      kit.fabric(upper,coat,[
        [-total,.049,.049],[-total+.027,.055,.057],[-total+b*.26,.064,.061,.002],
        [-total+b*.47,.069,.067,.009],[-total+b*.66,.067,.062,.011],
        [joint-.042,.071,.068,.010],[joint,.070,.071,.009],[joint+.041,.078,.074],
        [-a*.48,.081,.073,.004],[-a*.22,.087,.081,.007],[.006,.083,.079],
        [.049,.057,.053],[.068,.007,.007]
      ],weight);
    }
    kit.fabric(lower,black,[[-b-.011,.050,.051],[-b+.004,.056,.059],[-b+.039,.060,.061],[-b+.051,.052,.053]],null,.56);
    if (!kit.cheap) {
      kit.shell(upper,patch,sign*.057,-a*.32,-.003,.037,.087,.059,.62,.92);
      kit.box(upper,accent,sign*.088,-a*.41,-.005,.014,.036,.079,.06*sign,.72);
      kit.box(upper,"#a9a182",sign*.092,-a*.34,-.004,.012,.011,.062,.05*sign,.61);
      kit.piping(lower,trim,[[sign*.045,-b+.045,.033],[sign*.052,-b*.58,.037],[sign*.059,-b*.27,.037]],.004,.80);
      kit.shell(lower,trim,sign*.008,-b*.31,.058,.048,.078,.017,.62,.74);
    }
    this.glove(kit,hand,sign,accent);
  }
  glove(kit,bone,sign,accent) {
    const glove="#333a36", back="#515a51";
    kit.shell(bone,glove,sign*.006,-.035,.030,.047,.069,.041,.72,.43);
    kit.shell(bone,back,-sign*.005,-.027,.058,.040,.050,.022,.52,.50);
    kit.shell(bone,glove,-sign*.035,-.025,.003,.026,.046,.022,.76,.36,sign*.31);
    if (kit.cheap) return;
    for (let finger=0;finger<4;finger++) {
      const x=(finger-1.5)*.019;
      kit.shell(bone,glove,x,-.076+(finger===0?.004:0),-.003,.0125,.030,.024,.6,.5);
      kit.box(bone,back,x,-.061,.023,.011,.013,.024,0,.4);
    }
    kit.box(bone,accent,0,.013,.065,.036,.012,.010,0,.48);
  }
  torso(kit,coat,trouser,vest,accent) {
    const weights=y=>{
      const mid=smooth(.018,.235,y),top=smooth(.20,.385,y);
      return [["pelvis",1-mid],["spine",mid*(1-top)],["chest",mid*top]];
    };
    kit.fabric("pelvis",coat,kit.cheap?[
      [.028,.171,.123],[.058,.187,.139],[.122,.184,.135],[.319,.215,.138],
      [.472,.216,.128],[.556,.096,.081,-.004],[.585,.070,.070,-.009]
    ]:[
      [.027,.172,.121,.008],[.045,.187,.135,.009],[.071,.184,.137,.009],
      [.108,.185,.131,.014],[.175,.190,.131,.017],
      [.244,.200,.141,.016],[.324,.219,.151,.014],[.411,.226,.150,.012],
      [.468,.221,.136,.004],[.511,.181,.113,-.006],[.541,.113,.093,-.004],
      [.571,.084,.078,-.009],[.590,.070,.072,-.009]
    ],weights);
    kit.fabric("pelvis",trouser,[
      [-.157,.076,.084,.011],[-.114,.156,.110,.008],[-.062,.183,.128,.008],
      [-.006,.192,.132,.008],[.049,.175,.120,.006]
    ],null,.89);
    kit.shell("chest",vest,0,-.053,-.103,.192,.182,.057,.69,.86);
    kit.fabric("pelvis","#3e473f",[
      [.007,.190,.133,.008],[.016,.194,.143,.008],[.044,.191,.143,.008],[.053,.179,.132,.008]
    ],null,.63);
    kit.box("pelvis","#747968",0,.029,-.143,.065,.034,.016,0,.19);
    kit.shell("pack","#424d47",.004,-.020,.098,.175,.230,.086,.61,.9);
    kit.shell("pack",vest,.002,-.185,.082,.163,.069,.101,.66,.9);
    if (kit.cheap) {
      kit.box("pack",accent,0,.025,.185,.193,.026,.015,0,.72);
      return;
    }
    const canvas="#596354", seam="#343c38", strap="#717562";
    kit.shell("pack",canvas,.008,-.037,.153,.136,.135,.045,.57,.91);
    kit.piping("pack",seam,[[-.112,.085,.194],[.112,.085,.197],[.123,.033,.190]],.006,.56);
    kit.box("pack",accent,-.029,.053,.203,.110,.027,.010,0,.8);
    kit.box("pack","#b7ac8a",.063,.053,.200,.033,.026,.013,0,.62);
    kit.shell("pack","#585e51",.134,-.129,.135,.046,.086,.046,.54,.9);
    kit.shell("pack","#3a4b44",-.161,-.102,.109,.041,.095,.038,.72,.60);
    kit.box("pack","#717b6b",-.161,-.027,.110,.057,.022,.061);
    kit.piping("pack","#a3997d",[[.075,-.066,.196],[-.077,-.11,.200],[.085,-.141,.195]],.007,.74);
    kit.piping("pack","#a3997d",[[-.076,-.066,.196],[.082,-.11,.200],[-.075,-.146,.189]],.007,.74);
    kit.add("pack",new THREE.TorusGeometry(.027,.006,5,12).scale(.63,1.36,1).rotateZ(-.24).translate(.146,-.040,.175),accent);
    for(const side of [-1,1]) {
      const x=side*.130;
      kit.piping("chest",strap,[[x,.170,.142],[x,.184,.044],[x,.172,-.070],[side*.118,.095,-.130],[side*.099,-.062,-.147]],.021,.87);
      kit.box("chest","#777d70",side*.113,.052,-.150,.034,.046,.016,side*.11,.28);
      kit.box("pack",seam,side*.135,-.181,.111,.021,.157,.144,side*.06,.83);
      kit.box("pelvis",trouser,side*.148,.027,.112,.027,.052,.020,side*.11,.88);
    }
    for(const x of [-.118,-.009,.104]) {
      kit.shell("chest",canvas,x,-.122,-.159,.057,.063,.032,.52,.93);
      kit.box("chest",strap,x,-.094,-.189,.098,.018,.010,0,.79);
    }
    kit.piping("chest","#49554e",[[0,-.118,-.157],[0,.027,-.145],[0,.131,-.147],[0,.202,-.087]],.006,.58);
    kit.box("chest",accent,-.150,.052,-.141,.036,.028,.014,0,.74);
    kit.box("chest","#838c7e",.003,.138,-.123,.016,.029,.011,-.07,.2);
  }
  face(kit,coat,vest,skin,accent,hero) {
    const head="head", darker=new THREE.Color(skin).multiplyScalar(.68),hair=hero?"#453e37":"#353833";
    kit.fabric("neck","#46554d",[[-.062,.058,.055],[.002,.072,.065],[.068,.074,.064],[.120,.064,.058]],null,.8);
    kit.fabric(head,skin,[
      [-.127,.028,.034,-.017],[-.106,.063,.073,-.014],[-.073,.087,.089,-.009],
      [-.032,.100,.101,-.002],[.007,.102,.103,.003],[.043,.101,.104,.007],
      [.089,.085,.088,.008],[.126,.019,.023,.011]
    ],null,.14);
    kit.fabric(head,vest,[
      [.026,.095,.099,.013],[.047,.109,.118,.008],[.065,.108,.115,.011],
      [.096,.103,.100,.016],[.125,.082,.081,.021],[.143,.028,.032,.029],[.145,.002,.003,.028]
    ],null,.93);
    kit.shell(head,vest,0,.050,-.092,.109,.014,.092,.69,.82,-.025);
    if (kit.cheap) return;
    kit.piping(head,"#758071",[[-.086,.052,-.064],[-.052,.054,-.117],[.004,.050,-.132],[.065,.048,-.114]],.004,.90);
    kit.box(head,accent,-.042,.074,-.102,.055,.019,.013,-.05,.88);
    for(const s of [-1,1]) {
      kit.shell(head,skin,s*.101,-.015,.006,.018,.034,.023,.86,.12,s*.14);
      kit.shell(head,darker,s*.113,-.015,-.001,.007,.020,.014,.76,.15,s*.11);
      kit.shell(head,hair,s*.096,.021,.049,.012,.031,.043,.64,.41,s*.17);
      if (hero) {
        kit.shell(head,"#3b4742",s*.047,.008,-.105,.045,.024,.018,.58,0,s*.07);
        kit.shell(head,"#576c67",s*.047,.011,-.122,.037,.016,.006,.53,0,s*.07);
        kit.box(head,"#798e84",s*.049,.017,-.128,.046,.004,.005,s*.07);
        kit.piping(head,"#3b4742",[[s*.088,.013,-.102],[s*.106,.021,-.038],[s*.104,.018,.019]],.005);
      } else {
        kit.shell(head,darker,s*.042,.008,-.091,.030,.014,.014,.78,.12,s*.08);
        kit.shell(head,"#aab0a1",s*.040,.004,-.102,.020,.005,.006,.73,.1);
        kit.shell(head,"#414541",s*.040,.004,-.108,.007,.005,.004,1);
      }
      kit.shell(head,hair,s*.042,.022,-.099,.025,.006,.008,.58,.27,s*.05);
    }
    if (hero) kit.box(head,"#3b4742",0,.014,-.110,.029,.009,.013);
    kit.shell(head,skin,0,-.016,-.104,.021,.034,.022,1,.15);
    kit.shell(head,skin,0,-.033,-.116,.027,.012,.020,.81,.13);
    kit.shell(head,darker,0,-.069,-.096,.032,.006,.009,.75,.10);
    kit.shell(head,coat,.108,-.012,.024,.017,.046,.032,.55,.63);
    kit.piping(head,"#373f37",[[.109,-.027,.005],[.093,-.044,-.055],[.051,-.055,-.095]],.007,.39);
  }
  trousers(kit,side,sign,trouser,vest,accent) {
    const upper="thigh"+side,lower="shin"+side,foot="foot"+side;
    const weights=y=>{
      const knee=1-smooth(-.480,-.334,y);
      return [[upper,1-knee],[lower,knee]];
    };
    kit.fabric(upper,trouser,kit.cheap?[
      [-.771,.052,.057,.018],[-.565,.073,.075,.018],[-.404,.077,.076,-.012],
      [-.236,.088,.089,.006],[-.050,.099,.099],[.057,.055,.063]
    ]:[
      [-.787,.045,.052,.008],[-.760,.054,.059,.010],[-.705,.052,.057,.012],
      [-.644,.061,.068,.015],[-.563,.074,.077,.017],[-.490,.076,.075,.009],
      [-.430,.076,.077,-.010],[-.381,.078,.081,-.015],[-.337,.082,.086,-.010],
      [-.266,.091,.092,-.009],[-.181,.092,.094,.002],[-.094,.103,.105,.011],
      [-.023,.103,.106,.009],[.033,.088,.084],[.062,.038,.038]
    ],weights);
    kit.shell(lower,vest,0,.006,-.070,.064,.073,.028,.66,.5);
    kit.fabric(foot,"#3d4640",[[-.048,.064,.081,-.025],[-.006,.067,.082,-.017],[.057,.055,.071,-.007],[.116,.051,.059,.004]],null,.63);
    const boot=[
      [-.084,.051,.122,-.048],[-.081,.072,.140,-.046,.0,.55],[-.050,.073,.144,-.047,.0,.57],
      [-.025,.070,.141,-.042,.0,.63],[.006,.060,.125,-.031,.0,.7],[.038,.050,.101,-.016,.0,.73],
      [.054,.033,.073,-.008]
    ];
    kit.fabric(foot,"#434940",boot,null,.41);
    kit.fabric(foot,"#2c322f",[
      [-.085,.001,.001,-.045],[-.085,.063,.133,-.045,0,.48],[-.069,.073,.145,-.047,0,.50],[-.052,.073,.145,-.046,0,.55]
    ],null,.08);
    kit.fabric(foot,"#48524a",[[.045,.052,.063,.007],[.062,.062,.070,.006],[.085,.062,.069,.006],[.096,.055,.063,.007]],null,.67);
    if (kit.cheap) return;
    kit.shell(upper,vest,sign*.078,-.185,.021,.038,.099,.063,.59,.92,-sign*.10);
    kit.box(upper,trouser,sign*.100,-.151,.023,.027,.037,.113,-sign*.11,.98);
    kit.piping(upper,"#55594c",[[sign*.078,-.075,-.045],[sign*.087,-.23,-.030],[sign*.073,-.338,-.045]],.005,.74);
    kit.box(lower,"#3c453f",0,.017,-.097,.080,.039,.017,0,.26);
    kit.box(lower,accent,sign*.037,.017,-.107,.018,.022,.009,0,.63);
    kit.piping(foot,"#8a8d78",[[-.031,.045,-.062],[.031,.045,-.061],[-.032,.028,-.088],[.030,.029,-.089],[-.031,.018,-.119]],.004,.37);
    for(let i=0;i<5;i++) for(const s of [-1,1]) kit.box(foot,"#323632",s*.064,-.073,-.136+i*.043,.018,.019,.019);
  }
  mesh(bones,outfit,cheap) {
    const key=outfit+"/"+cheap;
    if (this.cache.has(key)) return this.cache.get(key);
    const [coat,trouser,vest,skin,accent]=OUTFITS[outfit];
    const kit=new OutfitMesh(bones,cheap);
    this.torso(kit,coat,trouser,vest,accent);
    this.face(kit,coat,vest,skin,accent,outfit===0);
    for(const [side,sign] of SIDES) {
      this.sleeve(kit,side,sign,coat,accent,ARM_LENGTH);
      this.trousers(kit,side,sign,trouser,vest,accent);
    }
    const geometry=kit.finish();
    this.cache.set(key,geometry);
    return geometry;
  }
  viewMesh(bones) {
    const [coat,,,,accent]=OUTFITS[0],kit=new OutfitMesh(bones,false);
    for (const [side,sign] of SIDES) this.sleeve(kit,side,sign,coat,accent,VIEW_ARM_LENGTH);
    return kit.finish();
  }
}

function gliderModel(mats) {
  const positions=[], uvs=[], index=[];
  const strips=18,rows=5;
  for(let j=0;j<=rows;j++) for(let i=0;i<=strips;i++) {
    const u=i/strips,v=j/rows,x=(u-.5)*5.15;
    const arch=1-(x/2.59)**2;
    positions.push(x,2.14+arch*.63+Math.sin(v*Math.PI)*.27,.22+v*1.73+(.1-.41*arch));
    uvs.push(u,v);
  }
  const g=new THREE.BufferGeometry();
  for(let j=0;j<rows;j++) for(let i=0;i<strips;i++) {
    const a=j*(strips+1)+i,b=a+strips+1;
    index.push(a,b,a+1,a+1,b,b+1);
  }
  g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));
  g.setIndex(index);
  g.computeVertexNormals();
  const shell=mats.textured("fabric","#9a9068",.96);
  shell.side=THREE.DoubleSide;
  const group=new THREE.Group();
  const wing=new THREE.Mesh(g,shell);
  wing.castShadow=true;
  group.add(wing);
  const lines=[];
  for(const x of [-2.45,-1.35,-.82,.82,1.35,2.45]) for(const z of [.18,1.62]) {
    const arch=1-(x/2.59)**2;
    lines.push(cylinderBetween(vec(Math.sign(x)*.35,1.74,-.093),vec(x,2.17+arch*.65,z+.22-.41*arch),.013,.013,4));
  }
  for (const s of [-1,1]) lines.push(boxAt(s*.35,1.735,-.093,.105,.036,.037));
  group.add(new THREE.Mesh(mergeParts(lines),mats.paint("#4a4b3f")));
  return group;
}

const LANDING_DIP = [[0,0],[.15,.79],[.31,1],[.63,.28],[1,0]];
const SWING_CLEARANCE = [[0,0],[.17,.55],[.43,1],[.70,.76],[1,0]];
const SWING_ROLL = [[0,-.48],[.22,-.58],[.48,-.15],[.80,.28],[1,.19]];
const AXE_ARC = [
  [0,.22,.025,-.27,-.44],[.17,.26,.27,.16,1.52],[.33,.22,.12,-.36,-.72],
  [.52,.19,-.17,-.37,-1.37],[.74,.25,-.09,-.23,-.75],[1,.22,.025,-.27,-.44]
];
const RELOAD_DROP = [[0,0],[.13,0],[.34,1],[.56,1],[.78,0],[1,0]];
const RELOAD_TILT = [[0,0],[.20,.90],[.52,1],[.73,.58],[1,0]];

function poseTrack(keys,t,column=1) {
  const end=keys.length-1;
  if (t<=keys[0][0]) return keys[0][column];
  for (let i=1;i<=end;i++) {
    if (t>keys[i][0]) continue;
    const a=keys[i-1],b=keys[i];
    return lerp(a[column],b[column],smooth(a[0],b[0],t));
  }
  return keys[end][column];
}
const actionPhase = action => action?clamp(1-action.remaining/action.total,0,1):0;

class LimbIK {
  constructor(upper,lower,end,pole) {
    this.upper=upper;
    this.lower=lower;
    this.end=end;
    this.pole=pole;
    this.a=Math.abs(lower.position.y);
    this.b=Math.abs(end.position.y);
    this.down=vec(0,-1,0);
    this.axis=vec();this.bend=vec();this.elbow=vec();this.tip=vec();
    this.top=new THREE.Quaternion();this.bottom=new THREE.Quaternion();this.turn=new THREE.Quaternion();
  }
  solve(target,orientation,blend=1) {
    const axis=this.axis.copy(target).sub(this.upper.position);
    const distance=axis.length(),reach=clamp(distance,Math.abs(this.a-this.b)+.014,this.a+this.b-.001);
    if (distance>.00001) axis.multiplyScalar(1/distance);
    else axis.copy(this.down);
    const bend=this.bend.copy(this.pole).addScaledVector(axis,-this.pole.dot(axis));
    if (bend.lengthSq()<.000001) {
      bend.set(1,0,0);
      if (Math.abs(axis.x)>.8) bend.set(0,0,1);
      bend.addScaledVector(axis,-bend.dot(axis));
    }
    bend.normalize();
    const along=(this.a*this.a-this.b*this.b+reach*reach)/(2*reach);
    this.elbow.copy(axis).multiplyScalar(along).addScaledVector(bend,Math.sqrt(Math.max(0,this.a*this.a-along*along)));
    this.tip.copy(axis).multiplyScalar(reach).sub(this.elbow);
    this.top.setFromUnitVectors(this.down,this.elbow.normalize());
    this.bottom.setFromUnitVectors(this.down,this.tip.normalize());
    this.upper.quaternion.slerp(this.top,blend);
    this.lower.quaternion.slerp(this.turn.copy(this.top).invert().multiply(this.bottom),blend);
    this.end.quaternion.slerp(this.turn.copy(this.bottom).invert().multiply(orientation),blend);
  }
  sample(position,orientation) {
    const {upper,lower,end}=this;
    position.copy(lower.position).applyQuaternion(upper.quaternion).add(upper.position);
    orientation.copy(upper.quaternion).multiply(lower.quaternion);
    position.add(this.tip.copy(end.position).applyQuaternion(orientation));
    orientation.multiply(end.quaternion);
  }
}

// Each boot keeps its contact in world space until the next swing.
class BootMotion {
  constructor(side) {
    this.side=side;
    this.anchor=vec();this.from=vec();this.position=vec();this.goal=vec();
    this.mode="air";
    this.heading=0;
    this.pitch=0;
    this.supporting=false;
  }
  ground(actor,p) {
    const base=actor.p.y;
    const height=actor.game.world.collision.floor(p.x,p.z,base+.35,.055).y;
    p.y=clamp(Math.max(SEA-.64,height),base-.38,base+.33);
  }
  update(actor,gait,dt) {
    const {p,yaw}=actor,side=this.side;
    const cy=Math.cos(yaw),sy=Math.sin(yaw);
    const split=side*lerp(.123,.154,gait.crouch);
    const offset=side*-.041+gait.crouch*.037;
    const spot=this.goal.set(p.x+cy*split+sy*offset,p.y,p.z-sy*split+cy*offset);
    const phase=(gait.phase+(side>0?0:.5))%1;
    const stride=gait.moving;
    const stance=stride && phase<gait.contact;
    const initial=this.mode==="air" || this.position.distanceToSquared(spot)>1.8;
    const facing=yaw+side*.105+gait.strafe*.19;
    this.supporting=stance || !stride;

    if (!stride) {
      this.ground(actor,spot);
      if (initial) this.position.copy(spot);
      else this.position.lerp(spot,1-Math.exp(-17*dt));
      this.pitch=damp(this.pitch,0,18,dt);
      this.heading=initial?facing:this.heading+angleDiff(facing,this.heading)*(1-Math.exp(-18*dt));
      this.mode="idle";
    } else if (stance) {
      const tooFar=Math.hypot(this.anchor.x-spot.x,this.anchor.z-spot.z)>.49;
      if (this.mode!=="contact" || tooFar || initial) {
        const lead=(gait.contact*.5-phase)*gait.period;
        spot.x+=gait.vx*lead;spot.z+=gait.vz*lead;
        this.ground(actor,spot);
        this.anchor.copy(spot);
        this.heading=facing;
      }
      this.position.copy(this.anchor);
      const t=phase/gait.contact;
      this.pitch=.19*(1-smooth(0,.21,t))-.48*smooth(.62,1,t)*lerp(.70,1,gait.run);
      this.mode="contact";
    } else {
      if (initial || this.mode!=="swing") {
        if (initial) this.ground(actor,spot);
        this.from.copy(initial?spot:this.position);
      }
      const time=(1-phase+gait.contact*.5)*gait.period;
      spot.x+=gait.vx*time;spot.z+=gait.vz*time;
      this.ground(actor,spot);
      const t=(phase-gait.contact)/(1-gait.contact);
      this.position.copy(this.from).lerp(spot,smooth(0,1,t));
      this.position.y+=poseTrack(SWING_CLEARANCE,t)*lerp(.12,.34,gait.run)*lerp(1,.69,gait.crouch);
      this.heading+=angleDiff(facing,this.heading)*(1-Math.exp(-19*dt));
      this.pitch=poseTrack(SWING_ROLL,t)*lerp(.74,1,gait.run);
      this.mode="swing";
    }
  }
  ankleHeight() {
    return this.position.y+.084*Math.cos(this.pitch)-Math.min(.186*Math.sin(this.pitch),-.097*Math.sin(this.pitch));
  }
}

function magazinePose(part,id,time,target) {
  if (!part) return;
  const removal=time==null?0:poseTrack(RELOAD_DROP,time);
  part.position.y=-(id==="pistol"?.105:.150)*removal;
  part.position.z=.038*removal;
  part.rotation.x=-.36*removal;
  part.visible=time==null || time<.375 || time>=.535;
  if (target && time!=null) {
    const reach=smooth(.024,.143,time)*(1-smooth(.72,.9,time));
    const pocket=smooth(.345,.455,time)-smooth(.480,.575,time);
    target.x=lerp(target.x,-.043,reach);
    target.y=lerp(target.y,(id==="pistol"?-.116:-.112)+part.position.y+.14*pocket,reach);
    target.z=lerp(target.z,(id==="pistol"?.016:-.116)+part.position.z+.10*pocket,reach);
  }
}

class CharacterModel {
  constructor(game,actor,outfit) {
    this.actor=actor;
    this.game=game;
    const b=this.bones=characterBones(RIG);
    const skin=game.characters;
    const skeleton=this.skeleton=new THREE.Skeleton(Object.values(b));
    const make=cheap=>{
      const mesh=new THREE.SkinnedMesh(skin.mesh(b,outfit,cheap),skin.material);
      mesh.bind(skeleton,new THREE.Matrix4());
      mesh.castShadow=true;
      mesh.receiveShadow=true;
      mesh.boundingSphere=new THREE.Sphere(vec(0,.90,0),1.72);
      return mesh;
    };
    this.high=make(false);
    this.low=make(true);
    this.pivot=new THREE.Group();
    this.rig=new THREE.Group();
    this.rig.position.y=-.91;
    this.rig.add(this.high,this.low,b.pelvis);
    this.pivot.position.y=.91;
    this.pivot.add(this.rig);
    this.root=new THREE.Group();
    this.glider=game.glider.clone();
    this.glider.visible=false;
    this.root.add(this.pivot,this.glider);
    this.slot=new THREE.Group();
    b.handR.add(this.slot);
    this.arms={R:new LimbIK(b.upperR,b.lowerR,b.handR,vec(.68,-.95,.35)),L:new LimbIK(b.upperL,b.lowerL,b.handL,vec(-.64,-.89,.32))};
    this.legs={R:new LimbIK(b.thighR,b.shinR,b.footR,vec(.09,.15,-1)),L:new LimbIK(b.thighL,b.shinL,b.footL,vec(-.09,.15,-1))};
    this.boots={R:new BootMotion(1),L:new BootMotion(-1)};
    this.gait={phase:0,moving:false,crouch:0,run:0,strafe:0,contact:.5,period:.5,vx:0,vz:0};
    this.right=vec();this.left=vec();this.support=vec();this.handPosition=vec();this.foot=vec();
    this.turn=new THREE.Euler(0,0,0,"YXZ");
    this.wrist=new THREE.Quaternion();this.wristLeft=new THREE.Quaternion();
    this.handRotation=new THREE.Quaternion();this.pelvisInverse=new THREE.Quaternion();
    this.phase=Math.PI*.11;
    this.poseClock=0;
    this.motion=0;
    this.landAge=1;
    this.landForce=0;
    this.lastYaw=actor.yaw;
    this.id="";
    this.swap=0;
    this.magazine=null;
    game.objects.add(this.root);
  }
  equip(id) {
    if (this.id===id) return;
    this.id=id;
    this.swap=id ? .20 : 0;
    this.slot.clear();
    const mesh=MEDICINE[id]?this.game.lootAssets.models[id].clone():this.game.weapons.model(id);
    if (mesh) this.slot.add(mesh);
    this.magazine=mesh?.getObjectByName("magazine") || null;
  }
  muzzle(id) {
    return this.slot.localToWorld(this.game.weapons.muzzle(id).clone());
  }
  land(force) {
    this.landAge=0;
    this.landForce=clamp(force,.22,1);
  }
  stride(dt) {
    const a=this.actor,g=this.gait;
    this.motion=damp(this.motion,a.speed,11,dt);
    g.crouch=damp(g.crouch,+(a.crouching && a.state==="ground"),15,dt);
    g.run=damp(g.run,smooth(2.70,6.12,this.motion)*(1-g.crouch),12,dt);
    g.vx=damp(g.vx,a.moveX,20,dt);
    g.vz=damp(g.vz,a.moveZ,20,dt);
    const idle=a.state!=="ground" || !a.grounded || a.speed<.19;
    const speed=Math.hypot(g.vx,g.vz);
    g.moving=!idle && speed>.19;
    g.strafe=clamp((Math.cos(a.yaw)*g.vx-Math.sin(a.yaw)*g.vz)/3.6,-1,1);
    g.contact=lerp(lerp(.65,.27,smooth(.64,5.7,this.motion)),.63,g.crouch);
    const cycle=lerp(lerp(.97,2.65,smooth(.3,6.3,this.motion)),1.07,g.crouch);
    g.period=cycle/Math.max(.65,speed);
    if (g.moving) this.phase=(this.phase+clamp(dt/g.period,0,.18)*TAU)%TAU;
    g.phase=this.phase/TAU;
  }
  posture(dt,collapse,dive,glide,grounded) {
    const a=this.actor,b=this.bones,g=this.gait;
    const falling=a.state==="ground" && !a.grounded;
    this.landAge+=dt;
    const land=poseTrack(LANDING_DIP,this.landAge/.34)*this.landForce;
    const bodySpeed=smooth(.15,3.4,this.motion)*+(a.state==="ground");
    const phase=this.phase;
    const roll=a.state==="dead"?a.fallSide*collapse*(1.47+.14*Math.sin(a.deathAge*10)*Math.exp(-a.deathAge*3.5)):
      glide?g.strafe*.18:dive?g.strafe*.23:0;
    const pitch=dive?-1.11:glide?-.13:falling?-.13:a.state==="dead"?-.34:0;
    this.pivot.rotation.z=damp(this.pivot.rotation.z,roll,11,dt);
    this.pivot.rotation.x=damp(this.pivot.rotation.x,pitch,13,dt);
    this.pivot.position.y=damp(this.pivot.position.y,lerp(.91,.235,collapse),14,dt);

    const inertia=clamp(angleDiff(a.yaw,this.lastYaw)/Math.max(dt,.001),-5,5);
    this.lastYaw=a.yaw;
    const crouch=g.crouch, breath=Math.sin(a.age*2.55)*.006;
    const strideBob=Math.cos(phase*2+.12)*lerp(.010,.030,g.run)*bodySpeed;
    let hips=.912-.282*crouch-.057*g.run-.030*bodySpeed+strideBob-.178*land+breath;
    b.pelvis.position.set(Math.sin(phase)*.023*bodySpeed,.91,crouch*.055);
    if (grounded) {
      for (const [side,sign] of SIDES) {
        const boot=this.boots[side];
        boot.update(a,g,dt);
        if (!boot.supporting) continue;
        const hx=a.p.x+Math.cos(a.yaw)*sign*.104,hz=a.p.z-Math.sin(a.yaw)*sign*.104;
        const reach=Math.sqrt(Math.max(.374,.776**2-(boot.position.x-hx)**2-(boot.position.z-hz)**2));
        hips=Math.min(hips,boot.ankleHeight()-a.p.y+.036+reach);
      }
    }
    b.pelvis.position.y=damp(this.hipY ?? hips,hips,26,dt);
    this.hipY=b.pelvis.position.y;
    b.pelvis.rotation.y=damp(b.pelvis.rotation.y,
      Math.sin(phase)*.125*bodySpeed+g.strafe*.17-inertia*.036,15,dt);
    b.pelvis.rotation.z=damp(b.pelvis.rotation.z,Math.cos(phase)*.04*bodySpeed-g.strafe*.058,16,dt);
    b.spine.rotation.x=damp(b.spine.rotation.x,-.055-.233*crouch-.205*g.run-.18*land
      +(glide?.14:0)+a.flinch*.15+breath*2.1,16,dt);
    b.chest.rotation.y=damp(b.chest.rotation.y,-Math.sin(phase)*.17*bodySpeed-g.strafe*.12
      +(a.aiming?-.12:0)-a.shotPose*.034,15,dt);
    b.chest.rotation.z=damp(b.chest.rotation.z,a.fallSide*a.flinch*.14+Math.cos(phase)*.059*bodySpeed-g.strafe*.06,17,dt);
    b.pack.rotation.x=damp(b.pack.rotation.x,Math.sin(phase*2-.45)*.052*bodySpeed+land*.071,15,dt);
    b.pack.rotation.y=damp(b.pack.rotation.y,Math.cos(phase)*.044*bodySpeed+inertia*.010,13,dt);
    b.head.rotation.x=damp(b.head.rotation.x,glide?.21:dive?.31:a.pitch*.64-b.spine.rotation.x*.55,15,dt);
    b.head.rotation.y=damp(b.head.rotation.y,-b.chest.rotation.y*.62-b.pelvis.rotation.y*.61
      +Math.sin(a.age*1.32+a.id)*.075*(1-smooth(0,1.8,this.motion))*(1-Number(a.aiming)),14,dt);
  }
  lowerBody(dt,collapse,dive,glide,grounded) {
    const a=this.actor,b=this.bones,g=this.gait;
    const orientation=this.wrist;
    if (grounded) {
      b.pelvis.updateWorldMatrix(true,false);
      this.pelvisInverse.setFromRotationMatrix(b.pelvis.matrixWorld).invert();
    }
    for(const [side,sign] of SIDES) {
      const leg=this.legs[side],boot=this.boots[side],foot=this.foot;
      if (grounded) {
        foot.copy(boot.position);foot.y=boot.ankleHeight();
        b.pelvis.worldToLocal(foot);
        orientation.setFromEuler(this.turn.set(boot.pitch,boot.heading,0));
        orientation.premultiply(this.pelvisInverse);
        leg.solve(foot,orientation,boot.supporting?1:1-Math.exp(-32*dt));
        continue;
      }
      boot.mode="air";
      const rising=smooth(-5.7,4.4,a.vy),lead=sign*(Math.cos(this.phase)>.02?1:-1);
      let x=sign*.137,y=-.58-.114*(1-rising),z=-.109-.131*lead*rising;
      if (dive || glide) {
        x=sign*(dive?.226:.170);
        y=dive?-.657-.045*sign:-.62-.055*sign;
        z=dive?.227+.052*sign:.133+.078*sign;
      } else if (a.state==="dead") {
        x=sign*(.157+.05*collapse);y=-.755+.065*sign*collapse;z=.108*sign+.09*collapse;
      }
      orientation.setFromEuler(this.turn.set(dive?-.44:glide?-.27:.12,sign*.105,sign*.06));
      leg.solve(foot.set(x,y,z),orientation,1-Math.exp(-15*dt));
    }
  }
  airborneHands(dt,collapse,dive,glide) {
    const a=this.actor,b=this.bones;
    for(const [side,sign] of SIDES) {
      const hand=this.right;
      this.wrist.setFromEuler(this.turn.set(-.82,sign*.36,sign*.18));
      if (dive || glide) {
        hand.set(sign*.572,.028,.061);
        if (glide) {
          const handle=b.chest.worldToLocal(this.glider.localToWorld(this.left.set(sign*.35,1.74,-.093)));
          hand.lerp(handle,smooth(.29,.95,a.gliderOpening));
        }
      } else {
        hand.set(sign*(.43+.08*collapse),-.31+.14*collapse,sign*.095+.058);
        this.wrist.setFromEuler(this.turn.set(.28,sign*.41,sign*.51));
      }
      this.arms[side].solve(hand,this.wrist,1-Math.exp(-14*dt));
    }
  }
  upperBody(dt) {
    const a=this.actor,g=this.gait,right=this.right,left=this.left;
    const item=a.inBuild?null:a.held(), gun=item?.kind==="gun";
    const form=gun?this.game.weapons.forms[item.id]:null;
    const action=a.action,time=actionPhase(action),reload=gun && action?.type==="reload"?time:null;
    const lift=gun && (a.aiming || a.shotPose>.12), step=this.phase;
    this.swap=Math.max(0,this.swap-dt);
    const swing=Math.cos(step)*smooth(.19,3.8,this.motion);
    const breathe=Math.sin(a.age*2.7)*.008;
    const land=poseTrack(LANDING_DIP,this.landAge/.34)*this.landForce;
    const holster=lift?0:g.run;
    let pitch=.15,yaw=0,roll=.16;
    right.set(.244,-.284,-.040-swing*.234);
    left.set(-.244,-.278,-.045+swing*.234);
    if (gun) {
      const aim=clamp(a.pitch,-1.21,1.20), punch=a.shotPose;
      const reloadTilt=reload==null?0:poseTrack(RELOAD_TILT,reload);
      // Torso pitch is removed here so the muzzle still follows the horizon as the body leans.
      pitch=aim-this.bones.spine.rotation.x-.18*(1-Number(lift))-.31*holster+.085*punch-.39*reloadTilt;
      yaw=.032+.20*holster-.17*reloadTilt;
      roll=.05+.46*holster+.39*reloadTilt;
      right.set(lift?.147:.187,
        (lift?.204:.065)+Math.sin(aim)*.264-.079*holster-.091*reloadTilt+breathe,
        (lift?-.249:-.223)+.094*holster+.066*punch+.064*this.swap+.087*(1-Math.cos(aim)));
      right.y-=this.swap*.56+land*.061;
    } else if (item?.kind==="pick") {
      const t=action?.type==="swing"?time:0;
      right.set(poseTrack(AXE_ARC,t,1),poseTrack(AXE_ARC,t,2)+breathe,poseTrack(AXE_ARC,t,3));
      pitch=poseTrack(AXE_ARC,t,4);
      yaw=-.08;roll=-.14;
      left.set(-.14,-.095,.036+swing*.10).lerp(this.support.set(-.109,.125,-.235),Math.sin(t*Math.PI)*.54);
    } else if (item?.kind==="med") {
      const active=action?.type==="med"?smooth(0,.20,time)*(1-smooth(.72,1,time)):0;
      const drinking=MEDICINE[item.id].type==="shield";
      right.set(.175,-.17,-.212).lerp(this.support.set(drinking?.028:.064,drinking?.275:-.140,drinking?-.229:-.270),active);
      left.set(-.19,-.15,-.20).lerp(this.support.set(-.045,drinking?.197:-.145,-.265),active);
      pitch=drinking?active*1.17:-.12;
      roll=-.16;
    }
    const blend=1-Math.exp(-26*dt);
    this.wrist.setFromEuler(this.turn.set(pitch,yaw,roll));
    this.arms.R.solve(right,this.wrist,blend);
    if (gun) {
      this.arms.R.sample(this.handPosition,this.handRotation);
      this.support.copy(form.support);
      magazinePose(this.magazine,item.id,reload,this.support);
      if (item.id==="shotgun" && reload!=null) this.support.z+=.189*poseTrack(RELOAD_TILT,reload);
      left.copy(this.support.applyQuaternion(this.handRotation).add(this.handPosition));
      this.wristLeft.copy(this.handRotation).multiply(this.wrist.setFromEuler(this.turn.set(-.11,-.24,item.id==="pistol"?-.42:-.71)));
    } else {
      this.wristLeft.setFromEuler(this.turn.set(item?.kind==="med"?pitch*.51:-.13,-.18,-.12));
    }
    this.arms.L.solve(left,this.wristLeft,blend);
  }
  update(dt,viewer,hideBody) {
    const a=this.actor;
    this.root.position.copy(a.p);
    this.root.rotation.y=a.yaw;
    const dive=a.state==="dive",glide=a.state==="glide",corpse=a.state==="dead";
    this.glider.visible=!hideBody && (glide || dive && a.gliderOpening>.05);
    this.glider.scale.setScalar(Math.max(.02,a.gliderOpening));
    this.equip(a.inBuild || dive || glide || corpse ? "" : a.held()?.id || "");
    const distance=this.root.position.distanceToSquared(viewer);
    const detail=a.id===0?72:this.game.settings.values.preset==="low"?43:64;
    this.root.visible=a.netVisible!==false && a.state!=="bus" && (!corpse || a.deathAge<10) && distance<430**2;
    this.high.visible=this.root.visible && !hideBody && distance<=detail**2;
    this.low.visible=this.root.visible && !hideBody && !this.high.visible;
    this.slot.visible=!hideBody && distance<165**2;
    if (!this.root.visible) return;
    this.poseClock+=dt;
    if (distance>detail**2 && this.poseClock<.067 && !corpse) return;
    dt=this.poseClock;
    this.poseClock=0;
    const collapse=corpse?smooth(0,.84,a.deathAge):0;
    const grounded=a.state==="ground" && a.grounded;
    this.stride(dt);
    this.posture(dt,collapse,dive,glide,grounded);
    this.lowerBody(dt,collapse,dive,glide,grounded);
    if (corpse || dive || glide) this.airborneHands(dt,collapse,dive,glide);
    else this.upperBody(dt);
  }
  dispose() {
    this.root.removeFromParent();
    this.skeleton.dispose();
  }
}

const PICK = { kind:"pick",id:"pick",tier:0 };
class Competitor {
  constructor(game,id,name,outfit) {
    this.game=game;
    this.id=id;
    this.name=name;
    this.p=vec();
    this.yaw=0;
    this.pitch=0;
    this.vy=0;
    this.hp=100;
    this.shield=0;
    this.state="bus";
    this.grounded=false;
    this.surface="grass";
    this.speed=0;
    this.moveX=0;
    this.moveZ=0;
    this.age=0;
    this.deathAge=0;
    this.fallSide=id%2?1:-1;
    this.gliderOpening=0;
    this.flinch=0;
    this.shotPose=0;
    this.cooldown=0;
    this.stepClock=0;
    this.inBuild=false;
    this.usingPick=true;
    this.aiming=false;
    this.crouching=false;
    this.action=null;
    this.items=new Array(5).fill(null);
    this.slot=0;
    this.reserve={ Light:0, Shells:0, Rifle:0, Heavy:0 };
    this.materials=[20,0,0];
    this.kills=0;
    this.damageDone=0;
    this.shotsFired=0;
    this.shotsHit=0;
    this.looted=0;
    this.lastHitAt=-Infinity;
    this.outfit=outfit;
    this.model=game.headless ? {
      root:new THREE.Group(), equip(){}, land(){}, dispose(){},
      muzzle:()=>eyePosition(this).addScaledVector(aimVector(this.yaw,this.pitch),.47)
    } : new CharacterModel(game,this,outfit);
  }
  get alive() { return this.state!=="dead"; }
  held() { return this.usingPick ? PICK : this.items[this.slot]; }
  cancel() { this.action=null; }
  slotTo(slot) { this.usingPick=false; this.slot=slot; this.cancel(); }
  give(item) {
    if (item.kind==="ammo") {
      this.reserve[item.id]+=item.count;
      return true;
    }
    if (item.kind==="material") {
      this.materials[item.id]=Math.min(999,this.materials[item.id]+item.count);
      return true;
    }
    const same=this.items.findIndex(old=>old && old.kind===item.kind && old.id===item.id && old.tier===item.tier);
    if (item.kind==="med" && same!==-1) {
      const stack=this.items[same], count=Math.min(item.count,MEDICINE[item.id].max-stack.count);
      stack.count+=count;
      item.count-=count;
      if (!item.count) return true;
    }
    const i=this.items.indexOf(null);
    if (i<0) return false;
    this.items[i]=item;
    if (this.usingPick && item.kind==="gun" || !this.held()) this.slotTo(i);
    return true;
  }
  heal(item) {
    const config=MEDICINE[item?.id];
    if (!config || this.action || (config.type==="health"?this.hp:this.shield)>=config.limit) return false;
    this.action={ type:"med",item,total:config.time,remaining:config.time };
    this.game.audio.event(config.type==="health"?"heal":"shield",this.p,.65);
    return true;
  }
  reload() {
    const item=this.held();
    if (item?.kind!=="gun" || this.action) return;
    const w=WEAPON_STATS[item.id];
    if (this.reserve[w.ammo]===0 || item.clip>=w.mag) return;
    this.action={ type:"reload",item,total:w.reload,remaining:w.reload,phase:0 };
    this.game.audio.event("magOut",this.p,.69);
    this.game.emitNoise(this,this.p,"reload",15);
  }
  tick(dt) {
    this.age+=dt;
    if (!this.alive) {
      this.deathAge+=dt;
      if (this.p.y>this.deathFloor) {
        this.vy=Math.max(-26,this.vy-17.8*dt);
        this.p.y=Math.max(this.deathFloor,this.p.y+this.vy*dt);
      }
      return;
    }
    this.flinch=Math.max(0,this.flinch-dt*5.4);
    this.shotPose=Math.max(0,this.shotPose-dt*6.3);
    this.cooldown=Math.max(0,this.cooldown-dt);
    this.gliderOpening=damp(this.gliderOpening,+(this.state==="glide"),9,dt);
    const action=this.action;
    if (!action) return;
    action.remaining-=dt;
    if (action.type==="swing" && action.remaining<action.total-.16 && !action.hit) {
      action.hit=true;
      this.game.combat.harvest(this);
    }
    if (action.type==="reload") {
      const ratio=action.remaining/action.total;
      if (action.phase===0 && ratio<.44) {
        action.phase=1;
        this.game.audio.event("magIn",this.p,.64);
      }
      if (action.phase===1 && ratio<.12) {
        action.phase=2;
        this.game.audio.event("bolt",this.p,.58);
      }
    }
    if (action.remaining>0) return;
    this.action=null;
    const item=action.item;
    if (action.type==="reload") {
      const w=WEAPON_STATS[item.id], rounds=Math.min(w.mag-item.clip,this.reserve[w.ammo]);
      item.clip+=rounds;
      this.reserve[w.ammo]-=rounds;
    } else if (action.type==="med") {
      const med=MEDICINE[item.id];
      if (med.type==="health") this.hp=Math.min(med.limit,this.hp+med.amount);
      else this.shield=Math.min(med.limit,this.shield+med.amount);
      item.count--;
      this.game.audio.event("pickup",this.p,.8);
      if (!item.count) this.items[this.items.indexOf(item)]=null;
    }
  }
  deploy() {
    if (this.state!=="dive") return;
    this.state="glide";
    this.vy=Math.max(this.vy,-6.8);
    this.game.audio.event("glide",this.p,.85);
    this.game.emitNoise(this,this.p,"glider",46);
  }
  airborne(dt,dx,dz,boost) {
    const w=this.game.world, dive=this.state==="dive";
    const speed=dive?(boost?21.5:12.4):11.2;
    const oldX=this.p.x,oldZ=this.p.z;
    this.speed=speed*Math.min(1,Math.hypot(dx,dz));
    this.p.x=clamp(this.p.x+dx*speed*dt,-HALF-8,HALF+8);
    this.p.z=clamp(this.p.z+dz*speed*dt,-HALF-8,HALF+8);
    this.moveX=(this.p.x-oldX)/dt;
    this.moveZ=(this.p.z-oldZ)/dt;
    // A fast fall can enter the footprint of an overhang between simulation steps.
    const ceiling=this.p.y+Math.max(.26,-this.vy*dt+.18);
    const ground=w.collision.floor(this.p.x,this.p.z,ceiling,.28,false,true);
    const landing=Math.max(ground.y,SEA-.68);
    this.vy=damp(this.vy,dive?(boost?-26.0:-15.6):-5.7,dive?3:6,dt);
    this.p.y+=this.vy*dt;
    if (dive && this.p.y-landing<28) this.deploy();
    if (this.p.y<=landing) {
      this.state="ground";
      this.p.y=landing;
      this.vy=0;
      this.surface=ground.y<SEA-.3?"water":ground.surface;
      this.grounded=true;
      this.game.landed(this);
    }
  }
  walk(dt,vx,vz,jump=false) {
    const w=this.game.world,c=w.collision,t=w.terrain,p=this.p;
    const oldX=p.x,oldZ=p.z, height=this.crouching?1.14:1.66;
    const currentSlope=t.slope(p.x,p.z);
    if (this.grounded && currentSlope>1 && !c.floor(p.x,p.z,p.y+.24).entry) {
      const gx=(t.height(p.x+.9,p.z)-t.height(p.x-.9,p.z))*.55;
      const gz=(t.height(p.x,p.z+.9)-t.height(p.x,p.z-.9))*.55;
      const length=Math.max(1,Math.hypot(gx,gz)),dx=gx/length,dz=gz/length;
      const uphill=Math.max(0,vx*dx+vz*dz),slide=Math.min(8.4,3.7*length);
      vx-=dx*(uphill+slide);
      vz-=dz*(uphill+slide);
    }
    if (this.surface==="water") { vx*=.65; vz*=.65; }
    const step=.263, radius=.302;
    const move=(x,z)=>{
      x=clamp(x,-HALF-13,HALF+13);
      z=clamp(z,-HALF-13,HALF+13);
      const terrainY=t.height(x,z);
      if (terrainY>p.y+step && this.vy<=0) return;
      if (this.grounded && t.slope(x,z)>1.06 && terrainY>t.height(p.x,p.z)+.015 && p.y<terrainY+.135) return;
      const floor=c.floor(x,z,p.y+step,radius+.027);
      const adjusted=this.grounded?Math.max(floor.y,p.y-.09):p.y;
      if (c.blocked(x,adjusted,z,height,radius)) return;
      if (this.grounded && floor.y>p.y && floor.y<=p.y+step) p.y=floor.y;
      p.x=x;p.z=z;
    };
    move(p.x+vx*dt,p.z);
    move(p.x,p.z+vz*dt);
    this.moveX=(p.x-oldX)/Math.max(.001,dt);
    this.moveZ=(p.z-oldZ)/Math.max(.001,dt);
    this.speed=Math.hypot(this.moveX,this.moveZ);
    const support=c.floor(p.x,p.z,p.y+(this.grounded?step:.105),radius,false,true);
    const min=Math.max(support.y,SEA-.64);
    if (jump && this.grounded) {
      this.vy=this.surface==="water"?3.4:5.32;
      this.grounded=false;
      this.game.audio.event("jump",p,.39);
    }
    if (this.grounded && p.y-min>.26) this.grounded=false;
    if (!this.grounded) {
      const current=p.y;
      this.vy=Math.max(-21,this.vy-dt*16.8);
      p.y+=this.vy*dt;
      if (this.vy>0 && c.blocked(p.x,p.y,p.z,height-.026,radius-.026)) {
        p.y=current;
        this.vy=-.35;
      }
      if (this.vy<=0 && p.y<=min) {
        if (this.vy<-4.2) this.game.landed(this,false);
        p.y=min;
        this.vy=0;
        this.grounded=true;
      }
    } else {
      p.y=min;
      this.vy=0;
    }
    this.surface=support.y<SEA-.25?"water":support.surface;
    this.stepClock-=dt;
    if (this.grounded && this.speed>1 && this.stepClock<=0) {
      this.stepClock=(this.crouching?.66:this.speed>4.8?.28:.42);
      this.game.audio.foot(this.surface,p,this.crouching?.08:this.speed>4.8?.64:.38,!this.crouching && this.speed>4.8);
      this.game.fx.foot(this);
      const footRange=this.crouching?7:this.speed>4.85?29:17;
      this.game.emitNoise(this,p,"foot",footRange*(this.surface==="grass"?.75:this.surface==="metal"?1.19:1));
    }
  }
}

class Player extends Competitor {
  constructor(game,id=0,name="You",outfit=0) {
    super(game,id,name,outfit);
    this.human=true;
    this.viewSway=vec();
    this.crouchToggle=false;
    this.aimToggle=false;
    this.buildType=0;
    this.buildMaterial=0;
    this.buildRotation=0;
    this.interaction=null;
    this.holdTime=0;
    this.shake=0;
    this.damageDirection=0;
    this.hitShade=0;
    this.bigHit=0;
    this.blockedShot=false;
    this.pendingShot=null;
    this.recoil={ item:null, lastAt:-Infinity, recoverAt:0, pitch:0, yaw:0, rate:12, step:0, heat:0 };
  }
  wantsAim() {
    const {input,settings}=this.game;
    return this.state==="ground" && !this.inBuild && this.held()?.kind==="gun" &&
      (settings.values.aimMode==="toggle"?this.aimToggle:input.down("ads"));
  }
  look(dx,dy) {
    const settings=this.game.settings.values, aiming=this.wantsAim();
    const scope=aiming && this.held()?.id==="sniper";
    const sensitivity=.00245*settings.sensitivity*.01*(scope?settings.scopeSense:aiming?settings.adsSense:100)*.01;
    const turn=-dx*sensitivity;
    const pitch=clamp(this.pitch-dy*sensitivity*(settings.invert?-1:1),-1.42,1.24);
    const tilt=pitch-this.pitch;
    const recoil=this.recoil;
    // Manual counter-aim uses up the stored recovery instead of pulling twice.
    if (turn*recoil.yaw<0) recoil.yaw+=Math.sign(turn)*Math.min(Math.abs(turn),Math.abs(recoil.yaw));
    if (tilt*recoil.pitch<0) recoil.pitch+=Math.sign(tilt)*Math.min(Math.abs(tilt),Math.abs(recoil.pitch));
    this.yaw+=turn;
    this.pitch=pitch;
    this.viewSway.x=clamp(this.viewSway.x+dx*.0012,-.055,.055);
    this.viewSway.y=clamp(this.viewSway.y-dy*.0010,-.049,.049);
  }
  kick(item) {
    const w=WEAPON_STATS[item.id], profile=w.recoil, r=this.recoil;
    if (r.item!==item || this.age-r.lastAt>Math.max(.31,w.delay*1.45)) r.step=0;
    const scale=(this.aiming?.63:1)*(this.crouching?.79:1)*(1-item.tier*.063);
    const strength=w.kick*scale;
    const tilt=strength*profile.steps[r.step++ % profile.steps.length];
    const side=(this.game.random()*2-1)*strength*profile.side;
    const pitch=clamp(this.pitch+tilt,-1.42,1.24);
    r.pitch+=(pitch-this.pitch)*profile.recovery;
    r.yaw+=side*profile.recovery;
    this.pitch=pitch;
    this.yaw+=side;
    r.item=item;
    r.rate=profile.rate;
    r.lastAt=this.age;
    r.recoverAt=this.age+(w.auto?w.delay+.025:.095);
    r.heat=w.auto?Math.min(1,r.heat+.19):0;
    this.shake=Math.min(.31,this.shake+strength*1.3);
  }
  recoverAim(dt) {
    const r=this.recoil;
    if (this.age-r.lastAt>.115) r.heat=damp(r.heat,0,4.5,dt);
    if (this.age<r.recoverAt) return;
    const fraction=1-Math.exp(-r.rate*dt);
    this.pitch=clamp(this.pitch-r.pitch*fraction,-1.42,1.24);
    this.yaw-=r.yaw*fraction;
    r.pitch*=1-fraction;
    r.yaw*=1-fraction;
  }
  cancel() {
    super.cancel();
    this.pendingShot=null;
  }
  equipmentChanged() {
    const {audio,ui}=this.game;
    if (this.state==="ground") audio.event("swap",this.p,.8);
    this.recoil.heat=0;
    ui.hudAt=0;
  }
  slotTo(slot) {
    const changed=this.usingPick || this.slot!==slot;
    super.slotTo(slot);
    if (changed) this.equipmentChanged();
  }
  selectPick() {
    const changed=!this.usingPick;
    this.inBuild=false;
    this.usingPick=true;
    this.cancel();
    if (changed) this.equipmentChanged();
  }
  cycleEquipment(direction) {
    const {ui,audio,builds}=this.game;
    if (this.inBuild) {
      this.buildType=(this.buildType+direction+BUILD_NAMES.length)%BUILD_NAMES.length;
      builds.shown=null;
      ui.hudAt=0;
      audio.event("swap",this.p,.62);
      return;
    }
    const count=this.items.length+1;
    const current=this.usingPick?0:this.slot+1;
    for (let i=1;i<count;i++) {
      const position=(current+i*direction+count)%count;
      if (position===0) { this.selectPick();return; }
      if (this.items[position-1]) { this.slotTo(position-1);return; }
    }
  }
  input(dt) {
    const input=this.game.input;
    const s=this.game.settings.values;
    this.hitShade=Math.max(0,this.hitShade-dt*1.35);
    this.bigHit=damp(this.bigHit,0,7.3,dt);
    this.shake=Math.max(0,this.shake-dt*5);
    this.viewSway.multiplyScalar(Math.exp(-10*dt));
    if (this.state==="bus" || !this.alive) return;
    this.recoverAim(dt);
    const f=Number(input.down("forward"))-Number(input.down("back"));
    const r=Number(input.down("right"))-Number(input.down("left"));
    const direction=aimVector(this.yaw), right=vec(Math.cos(this.yaw),0,-Math.sin(this.yaw));
    direction.multiplyScalar(f).addScaledVector(right,r);
    if (direction.lengthSq()>1) direction.normalize();
    if (this.state==="dive" || this.state==="glide") {
      this.airborne(dt,direction.x,direction.z,f>0);
      return;
    }
    this.crouching=s.crouchMode==="toggle"?this.crouchToggle:input.down("crouch");
    if (!this.crouching && this.game.world.collision.blocked(this.p.x,this.p.y,this.p.z,1.66,.29)) this.crouching=true;
    this.aiming=this.wantsAim();
    const speed=this.crouching?2.03:this.action?.type==="med"?2.16:this.aiming?2.60:input.down("sprint") && f>0?6.18:4.28;
    this.walk(dt,direction.x*speed,direction.z*speed,input.just("jump"));
  }
  combat() {
    if (this.state!=="ground") return;
    const {input,combat,builds,cameraRig}=this.game;
    const item=this.held(), click=input.just("shoot");
    if (this.inBuild) {
      builds.preview(this);
      if (click) builds.placePlayer(this);
      return;
    }
    if (!item) return;
    if (item.kind==="gun") {
      // A click during the lowering animation is fired once the new gun is up.
      if (click) this.pendingShot={item,until:this.age+.27};
      const queued=this.pendingShot;
      if (queued && (queued.item!==item || this.age>queued.until)) this.pendingShot=null;
      const trigger=this.pendingShot || WEAPON_STATS[item.id].auto && input.down("shoot");
      if (trigger && cameraRig.readyGun(item.id)) {
        this.pendingShot=null;
        combat.fire(this);
      }
    } else if (click) {
      if (item.kind==="med") this.heal(item);
      else combat.fire(this);
    }
  }
}
const SOUND = {
  hover:[["sine",440,550,.052,.045]],
  click:[["triangle",280,175,.098,.135],["grain",.045,1900,.075]],
  jump:[["soft",.12,760,.16]],
  land:[["triangle",94,41,.19,.31],["grain",.185,560,.29]],
  magOut:[["grain",.09,2600,.33],["triangle",242,89,.11,.16]],
  magIn:[["grain",.12,1800,.45],["triangle",162,71,.10,.21]],
  bolt:[["crack",.075,4600,.44],["triangle",442,214,.12,.095]],
  dry:[["crack",.048,2300,.24],["square",145,98,.027,.063]],
  swing:[["soft",.25,1000,.55]],
  wood:[["grain",.178,1200,.45],["triangle",170,70,.16,.29]],
  stone:[["grain",.19,2400,.43],["triangle",267,114,.16,.22]],
  metal:[["crack",.123,2970,.33],["sine",613,594,.26,.24],["sine",953,937,.19,.1]],
  glass:[["crack",.277,5100,.32],["triangle",984,410,.19,.15]],
  build:[["grain",.18,990,.31],["triangle",131,81,.22,.29],["sine",326,380,.14,.08]],
  break:[["grain",.42,1850,.51],["triangle",117,47,.32,.30]],
  door:[["grain",.23,890,.22],["triangle",160,59,.29,.17]],
  chest:[["grain",.42,780,.23],["sine",493,566,.27,.23],["sine",739,840,.47,.16],["sine",987,1014,.6,.11]],
  ammo:[["crack",.13,2005,.3],["triangle",187,102,.20,.22]],
  swap:[["grain",.065,1810,.22],["triangle",311,175,.076,.12]],
  pickup:[["sine",511,713,.17,.24],["triangle",278,386,.12,.08]],
  heal:[["soft",.28,980,.25],["sine",164,242,.61,.14],["sine",247,383,.63,.066]],
  shield:[["triangle",194,395,.5,.12],["sine",328,662,.72,.10]],
  shieldCrack:[["crack",.072,5500,.25],["sine",974,499,.125,.18]],
  shieldBreak:[["crack",.184,6500,.38],["sine",1120,421,.22,.26],["triangle",184,62,.26,.30],["soft",.31,1600,.18]],
  glide:[["soft",.66,1100,.51],["triangle",128,39,.31,.17]],
  storm:[["soft",.27,428,.36],["sine",116,62,.33,.23]],
  hit:[["triangle",326,191,.087,.23],["grain",.04,1350,.15]],
  head:[["sine",858,692,.16,.26],["sine",1318,1200,.12,.12]],
  eliminate:[["triangle",392,523,.27,.25],["sine",660,784,.44,.19],["sine",1175,1018,.47,.115],["soft",.19,590,.21]],
  heartbeat:[["sine",69,43,.14,.35]],
  grass:[["soft",.143,1150,.27],["grain",.086,2800,.13]],
  dirt:[["grain",.115,930,.30],["triangle",124,59,.067,.18]],
  concrete:[["crack",.086,1780,.27],["triangle",167,110,.081,.21]],
  asphalt:[["grain",.106,2260,.32],["triangle",139,73,.087,.20]],
  water:[["soft",.23,1600,.43],["sine",127,91,.118,.11]]
};

const SHOT_SOUND = {
  pistol:{ tail:.145, crack:6040, body:2370, bass:120, power:.42, bite:1.13 },
  smg:{ tail:.105, crack:7430, body:3270, bass:145, power:.35, bite:1.43 },
  shotgun:{ tail:.297, crack:3770, body:1380, bass:81, power:.69, bite:.87 },
  rifle:{ tail:.218, crack:5650, body:2170, bass:104, power:.51, bite:1.07 },
  sniper:{ tail:.348, crack:6800, body:1920, bass:69, power:.67, bite:.94 }
};

const MUSIC_CHORDS = {
  menu:[[98,146.83,196,233.08],[87.31,130.81,174.61,220],[73.42,110,146.83,196],[82.41,123.47,164.81,220]],
  loot:[[82.41,123.47,164.81,196],[65.41,98,130.81,164.81],[73.42,110,146.83,174.61],[87.31,130.81,174.61,220]],
  tension:[[73.42,110,146.83,174.61],[73.42,103.83,146.83,164.81],[65.41,98,130.81,155.56],[69.30,103.83,138.59,164.81]],
  final:[[61.74,92.50,123.47,146.83],[58.27,92.50,116.54,138.59],[55,82.41,110,130.81],[58.27,87.31,116.54,138.59]]
};

class Audio {
  constructor(settings) {
    this.settings=settings;
    this.context=null;
    this.voices=new Set();
    this.routes=new Set();
    this.musicAt=0;
    this.musicNote=0;
    this.heartAt=0;
    this.musicMood="";
    this.ambienceAt=0;
    this.ambientEventAt=0;
    this.whizzAt=0;
    this.room=null;
  }
  open() {
    if (this.failed) return;
    if (!this.context) {
      const Context=window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      try { this.context=new Context(); } catch { this.failed=true; return; }
      const c=this.context;
      const gain=()=>c.createGain();
      this.master=gain();
      this.effects=gain();
      this.music=gain();
      this.ui=gain();
      this.compressor=c.createDynamicsCompressor();
      Object.assign(this.compressor.threshold,{value:-16});
      this.compressor.ratio.value=4;
      for (const node of [this.effects,this.music,this.ui]) node.connect(this.master);
      this.master.connect(this.compressor);
      this.compressor.connect(c.destination);
      this.outside=this.verb(1.30,.51,.16,9917);
      this.inside=this.verb(.61,.31,.22,789);
      this.noise={};
      for (const [index,kind] of ["grain","crack","soft"].entries()) {
        const n=c.createBuffer(1,c.sampleRate*2,c.sampleRate),data=n.getChannelData(0),random=rng(107+index*3103);
        let slow=0,last=0;
        for (let i=0;i<data.length;i++) {
          const v=random()*2-1;
          slow=.89*slow+v*.11;
          data[i]=kind==="soft"?slow*2.3+(v-last)*.064:kind==="crack"?v*.64+(v-last)*.23:v*.54+slow*.57;
          last=v;
        }
        this.noise[kind]=n;
      }
      this.wind=this.ambience("soft",240);
      this.engine=this.ambience("triangle",67,true);
      this.wall=this.ambience("sine",51,true);
      this.stormWind=this.ambience("soft",134);
      this.rainBed=this.ambience("grain",3280);
      this.roofRain=this.ambience("grain",980);
      this.shoreBed=this.ambience("soft",1210,true);
      this.powerBed=this.ambience("sawtooth",60,true);
      this.roofRain.filter.type="bandpass";
      this.roofRain.filter.Q.value=.91;
      this.beds=[this.wind,this.engine,this.wall,this.stormWind,this.rainBed,this.roofRain,this.shoreBed,this.powerBed];
      this.apply();
    }
    if (this.context.state==="suspended") this.context.resume().catch(()=>{});
  }
  verb(seconds,shape,wet,seed) {
    const c=this.context,n=Math.round(c.sampleRate*seconds),buffer=c.createBuffer(2,n,c.sampleRate);
    const random=rng(seed);
    for (let channel=0;channel<2;channel++) {
      const out=buffer.getChannelData(channel);
      let smooth=0;
      for(let i=0;i<n;i++) {
        smooth=smooth*.23+(random()*2-1)*.77;
        out[i]=smooth*Math.exp(-i/(n*shape))*(i>c.sampleRate*.012?1:.18)*.67;
      }
      for (const [time,amp] of [[.017,.66],[.042,.38],[.083,.29],[.151,.15]]) out[Math.floor(c.sampleRate*time*(1+channel*.043))]=amp;
    }
    const filter=c.createConvolver(),mix=c.createGain();
    filter.buffer=buffer;
    mix.gain.value=wet;
    filter.connect(mix);
    mix.connect(this.effects);
    return filter;
  }
  apply() {
    const c=this.context;
    if (!c) return;
    const s=this.settings.values, now=c.currentTime;
    for (const name of ["master","effects","music","ui"]) this[name].gain.setTargetAtTime((s[name]/100)**1.38,now,.045);
  }
  panner(pos,ref=4,max=420) {
    const p=this.context.createPanner();
    p.panningModel="HRTF";
    p.distanceModel="inverse";
    p.refDistance=ref;
    p.maxDistance=max;
    p.rolloffFactor=1.26;
    this.audioPosition(p,pos);
    return p;
  }
  audioPosition(p,pos) {
    p.positionX.value=pos.x;
    p.positionY.value=pos.y+.4;
    p.positionZ.value=pos.z;
  }
  route(pos,strength,filter=17000,range=5,room=this.room,duration=2.9) {
    const c=this.context;
    const gain=c.createGain();
    gain.gain.value=strength;
    let tail=gain;
    const nodes=[gain];
    if (filter<16800) {
      const low=c.createBiquadFilter();
      low.type="lowpass";
      low.frequency.value=filter;
      gain.connect(low);
      tail=low;
      nodes.push(low);
    }
    if (pos) {
      const p=this.panner(pos,range);
      tail.connect(p);
      tail=p;
      nodes.push(p);
      tail.connect(room?this.inside:this.outside);
    }
    tail.connect(this.effects);
    const route={nodes, timer:0};
    this.routes.add(route);
    route.timer=setTimeout(()=>this.clearRoute(route),duration*1000);
    return gain;
  }
  clearRoute(route) {
    clearTimeout(route.timer);
    route.nodes.forEach(node=>node.disconnect());
    this.routes.delete(route);
  }
  voice(shape,startFrequency,endFrequency,seconds,volume,output,delay=0,attack=.019) {
    const c=this.context,now=c.currentTime+delay,node=c.createOscillator(),gain=c.createGain();
    node.type=shape;
    node.frequency.setValueAtTime(startFrequency,now);
    node.frequency.exponentialRampToValueAtTime(Math.max(1,endFrequency),now+seconds*.86);
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+Math.min(seconds*.28,attack));
    gain.gain.exponentialRampToValueAtTime(.0001,now+seconds);
    node.connect(gain);
    gain.connect(output);
    this.launch(node,[gain],now,seconds);
  }
  noiseVoice(kind,seconds,filter,volume,output,delay=0,pitch=1) {
    const c=this.context,now=c.currentTime+delay,node=c.createBufferSource(),gain=c.createGain(),eq=c.createBiquadFilter();
    node.buffer=this.noise[kind];
    node.playbackRate.value=pitch;
    eq.type=kind==="crack"?"bandpass":"lowpass";
    eq.frequency.setValueAtTime(filter,now);
    eq.frequency.exponentialRampToValueAtTime(Math.max(53,filter*.36),now+seconds);
    eq.Q.value=kind==="crack"?.7:.45;
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+Math.min(seconds*.18,.019));
    gain.gain.exponentialRampToValueAtTime(.0001,now+seconds);
    node.connect(eq);
    eq.connect(gain);
    gain.connect(output);
    this.launch(node,[gain,eq],now,seconds,Math.random()*.54);
  }
  launch(node,extras,time,seconds,offset=0) {
    this.voices.add(node);
    node.onended=()=>{
      this.voices.delete(node);
      node.disconnect();
      extras.forEach(n=>n.disconnect());
    };
    node.start(time,offset);
    node.stop(time+seconds+.015);
  }
  event(key,pos=null,strength=1) {
    if (!this.context || this.context.state!=="running" || !SOUND[key] || this.voices.size>88) return;
    if (pos && this.listener && this.listener.distanceToSquared(pos)>124**2) return;
    const output=key==="hover" || key==="click" ? this.ui : this.route(pos,strength,16000,key==="land"?4.4:3.4);
    for (const [shape,a,b,c,d] of SOUND[key]) {
      if (this.noise[shape]) this.noiseVoice(shape,a,b,c,output,0,.92+Math.random()*.17);
      else this.voice(shape,a,b,c,d,output);
    }
  }
  foot(surface,pos,loudness,sprinting) {
    if (this.context?.state!=="running" || !this.listener || this.listener.distanceToSquared(pos)>69**2 || this.voices.size>76) return;
    const output=this.route(pos,loudness,loudness<.12?2500:6400,2.8);
    if (surface==="wood" || surface==="metal" || surface==="stone") {
      const wood=surface==="wood",metal=surface==="metal";
      this.noiseVoice("grain",.103,wood?1100:2050,.31,output,0,1+Math.random()*.16);
      this.voice(metal?"sine":"triangle",wood?123:metal?540:249,wood?69:metal?513:154,metal?.18:.105,.27,output);
    } else {
      for (const [shape,a,b,c,d] of SOUND[surface]||SOUND.dirt) {
        if (this.noise[shape]) this.noiseVoice(shape,a,b,c,output,0,.87+Math.random()*.25);
        else this.voice(shape,a,b,c,d,output);
      }
    }
    if (sprinting) {
      this.noiseVoice("crack",.046,2860,.15,output,.046,1.23);
      this.voice("triangle",691,473,.042,.104,output,.069);
    }
  }
  roomAt(world,at) {
    const room=world.buildings.locate(at.x,at.y,at.z);
    return room && world.collision.cast(at,vec(0,1,0),12,"vision",false)?room:null;
  }
  shot(id,pos,world,local) {
    if (this.context?.state!=="running" || this.voices.size>(local?119:94)) return;
    const ear=this.listener||pos,delta=ear.clone().sub(pos),distance=delta.length();
    if (distance>462) return;
    const room=this.roomAt(world,pos);
    const blocked=!local && distance>4 && world.collision.cast(pos,delta.normalize(),distance-.38,"vision");
    const filter=lerp(16900,670,smooth(9,380,distance))*(blocked?.37:1);
    const delay=local?0:distance/343;
    const out=this.route(pos,blocked?.51:1,filter,14,room,Math.max(2.9,delay+1.65));
    const {tail,crack,body,bass,power,bite}=SHOT_SOUND[id];
    this.noiseVoice("crack",id==="shotgun"?.072:.043,crack,power*.80,out,delay,bite*(.94+Math.random()*.14));
    this.noiseVoice("grain",tail,body,power*.90,out,delay+.008,.87+Math.random()*.26);
    this.voice("triangle",bass,bass*.39,tail*.94,power*.66,out,delay);
    this.voice("sine",bass*.73,Math.max(24,bass*.27),tail*1.20,power*.42,out,delay+.012);
    if (distance>335 || this.voices.size>96) return;
    this.shotEcho(pos,ear,world,room,tail,power,delay);
  }
  shotEcho(pos,ear,world,room,tail,power,arrival) {
    const angle=Math.atan2(ear.z-pos.z,ear.x-pos.x)+.71,max=room?14:78;
    let taps=0;
    for (const turn of [0,1.82,-2.03]) {
      const ray=vec(Math.cos(angle+turn),room?.14:-.012,Math.sin(angle+turn)).normalize();
      const bounce=world.collision.cast(pos,ray,max,"vision");
      if (!bounce || bounce.distance<.8) continue;
      const path=bounce.distance+ear.distanceTo(bounce.point);
      const delay=Math.max(arrival+(room?.028:.082),path/343);
      const out=this.route(bounce.point,1,room?4100:2300,10,room,3.1);
      const level=power*(room?.40:.30)*(1-smooth(14,168,path)*.61);
      this.noiseVoice(room?"grain":"soft",tail*(room?.74:1.39),room?1650:1220,level,out,delay,.79);
      taps++;
      if (taps>=2) break;
    }
    if (!room) {
      const roll=this.route(pos,.78,1550,18,false);
      this.noiseVoice("soft",tail*1.83,1020,power*(taps?.21:.37),roll,arrival+.187,.72);
      this.noiseVoice("soft",tail*1.35,630,power*.11,roll,arrival+.362,.68);
    }
  }
  whizz(pos,travel,miss) {
    if (this.context?.state!=="running" || this.context.currentTime<this.whizzAt || this.voices.size>109) return;
    this.whizzAt=this.context.currentTime+.16;
    const out=this.route(pos,1-smooth(.28,1.95,miss)*.64,12200,6);
    const delay=Math.min(.32,travel/510);
    this.noiseVoice("crack",.038,6600,.27,out,delay,1.26);
    this.voice("sine",3670,970,.091,.28,out,delay+.006);
    this.noiseVoice("soft",.141,2400,.37,out,delay+.008,.96);
  }
  thunder(impact,camera) {
    if (this.context?.state!=="running") return;
    const delay=impact.distanceTo(camera)/343;
    const out=this.route(impact,this.room ? .61 : 1,this.room ? 1050 : 2650,115,this.room,4.5);
    this.noiseVoice("crack",.17,1370,.53,out,delay,.76);
    this.noiseVoice("soft",1.70,521,.91,out,delay+.05,.67);
    this.noiseVoice("soft",1.31,289,.56,out,delay+.46,.63);
    this.voice("sine",67,29,1.55,.51,out,delay+.04,.125);
  }
  ambience(shape,frequency,positional=false) {
    const c=this.context,gain=c.createGain();
    const filter=c.createBiquadFilter(),isNoise=!!this.noise[shape];
    let source;
    gain.gain.value=0;
    filter.type="lowpass";
    filter.frequency.value=isNoise?frequency:235;
    filter.Q.value=.48;
    if (isNoise) {
      source=c.createBufferSource();
      source.buffer=this.noise[shape];
      source.loop=true;
    } else {
      source=c.createOscillator();
      source.type=shape;
      source.frequency.value=frequency;
    }
    source.connect(filter);
    filter.connect(gain);
    const p=positional?this.panner(vec(),27,500):null;
    if (p) { gain.connect(p); p.connect(this.effects); } else gain.connect(this.effects);
    source.start(0,isNoise?Math.random()*.74:0);
    return { source,filter,gain,p };
  }
  reset() {
    for (const voice of this.voices) { try { voice.stop(); } catch {} }
    for (const route of this.routes) this.clearRoute(route);
    this.heartAt=this.musicAt=this.ambienceAt=this.ambientEventAt=this.whizzAt=0;
    this.musicMood="";
    this.room=this.shore=this.pole=null;
    if (this.context) for (const bed of this.beds) bed.gain.gain.setTargetAtTime(0,this.context.currentTime,.09);
  }
  nearbyAmbience(world,position) {
    this.room=this.roomAt(world,position);
    this.shore=null;
    this.pole=null;
    if (position.y<SEA+23) {
      if (world.terrain.height(position.x,position.z)<SEA) this.shore=vec(position.x,SEA,position.z);
      for (let radius=7;!this.shore && radius<=37;radius+=7) for (let i=0;i<8;i++) {
        const x=position.x+Math.cos(i*TAU/8)*radius,z=position.z+Math.sin(i*TAU/8)*radius;
        if (world.terrain.height(x,z)<SEA-.12) { this.shore=vec(x,SEA,z); break; }
      }
    }
    let closest=48**2;
    for (const pole of world.powerPoles) {
      const distance=position.distanceToSquared(pole);
      if (distance>closest) continue;
      closest=distance;
      this.pole=pole;
    }
  }
  ambientDetail(game,now,position) {
    const climate=game.atmosphere,world=game.world;
    this.ambientEventAt=now+lerp(4,13,Math.random());
    if (this.room) {
      const room=this.room,loc=vec(room.x,position.y+.91,room.z);
      const out=this.route(loc,.63,5500,7,room);
      this.noiseVoice("soft",.26,860,.29,out,.014,.76);
      this.voice("triangle",164,91,.29,.19,out,0,.10);
      return;
    }
    if (climate.daylight==="night" || climate.conditions.rain>.2) return;
    const area=nearestPlace(position.x,position.z);
    if (world.terrain.surface(position.x,position.z)!=="grass" || position.y>world.terrain.height(position.x,position.z)+7 ||
      area.name==="Switchback" && areaDistance(area,position.x,position.z)<77) return;
    const angle=Math.random()*TAU,distance=lerp(11,28,Math.random());
    const loc=position.clone().add(vec(Math.cos(angle)*distance,lerp(3,7,Math.random()),Math.sin(angle)*distance));
    const out=this.route(loc,.95,8200,8);
    const base=lerp(1710,2520,Math.random());
    this.voice("sine",base,base*1.37,.117,.22,out);
    this.voice("sine",base*1.28,base*.84,.14,.18,out,.17);
    if (Math.random()>.43) this.voice("sine",base*.91,base*1.16,.135,.14,out,.38);
  }
  updateMusic(game,now,live) {
    const storm=game.storm;
    let mood="";
    if (game.state==="menu") mood="menu";
    else if (live && game.player.state==="ground") {
      mood=storm.index>=5 || storm.r<26?"final":storm.index>=2 || storm.mode==="move"?"tension":"loot";
    }
    if (mood!==this.musicMood) {
      this.musicMood=mood;
      this.musicNote=0;
      this.musicAt=now;
    }
    if (!mood || now<this.musicAt || this.voices.size>99) return;
    const sequence=MUSIC_CHORDS[mood],chord=sequence[this.musicNote++%sequence.length];
    const urgent=mood==="tension" || mood==="final",last=mood==="final";
    const measure=last?2.30:urgent?3.12:mood==="loot"?6.0:4.6;
    const bed=mood==="loot"?.63:1;
    const volume=[.124,.059,.047,.038];
    chord.forEach((note,i)=>this.voice("sine",note,note*.999,measure+1.09,volume[i]*bed,this.music,i*.09,.66+i*.085));
    if (urgent) {
      const steps=last?8:5,spacing=measure/steps;
      for(let i=0;i<steps;i++) {
        const accent=i%4===0;
        this.voice("triangle",accent?chord[0]*1.03:chord[i%3],accent?35:chord[i%3]*.94,.26,
          accent?.16:.064,this.music,i*spacing,.026);
        if (last && accent) this.noiseVoice("soft",.28,192,.16,this.music,i*spacing,.75);
      }
    } else {
      for (const [i,note] of [chord[2],chord[3],chord[1]*2].entries()) {
        this.voice("triangle",note*2,note*1.99,.89,.038*bed,this.music,.47+measure*.23*i,.037);
      }
    }
    this.musicAt=now+measure;
  }
  update(game) {
    const c=this.context;
    if (!c || c.state!=="running") return;
    const now=c.currentTime,camera=game.renderer.camera,p=camera.position;
    this.listener=p;
    const d=camera.getWorldDirection(vec()),l=c.listener;
    l.positionX.value=p.x; l.positionY.value=p.y; l.positionZ.value=p.z;
    l.forwardX.value=d.x; l.forwardY.value=d.y; l.forwardZ.value=d.z;
    l.upX.value=0; l.upY.value=1; l.upZ.value=0;

    const player=game.player,match=game.match,live=!!(player && match && !game.modal && game.state!=="result");
    const flying=live && (player.state==="dive" || player.state==="glide");
    const grounded=live && player.state==="ground";
    const climate=game.atmosphere,windSpeed=game.world.climate.windStrength.value;
    const roof=grounded && climate.shelter;
    if (now>=this.ambienceAt) {
      if (grounded) this.nearbyAmbience(game.world,p);
      else this.room=this.shore=this.pole=null;
      this.ambienceAt=now+.24;
    }
    const level=(bed,value)=>bed.gain.gain.setTargetAtTime(value,now,.18);
    const wind=flying?clamp(Math.abs(player.vy)/32,.18,.80):grounded?(roof?.020:.064+windSpeed*.081):.019;
    level(this.wind,wind);
    this.wind.filter.frequency.setTargetAtTime(flying?340+Math.abs(player.vy)*75:190+windSpeed*95,now,.12);
    const engine=live && match.bus.visible?.40:0;
    level(this.engine,engine);
    this.engine.source.frequency.setTargetAtTime(65+Math.sin(game.clock*3)*3.2,now,.09);
    if (engine) this.audioPosition(this.engine.p,match.bus.position);

    const rain=live?climate.conditions.rain:0;
    level(this.rainBed,rain*(roof?.052:flying?.17:.31));
    level(this.roofRain,roof?rain*.36:0);
    if (roof) this.roofRain.filter.frequency.setTargetAtTime(this.room?.kind==="warehouse"?1670:980,now,.23);
    const shore=grounded && this.shore;
    level(this.shoreBed,shore?.15*(1-smooth(5,43,shore.distanceTo(p)))*(roof?.27:1):0);
    if (shore) {
      this.audioPosition(this.shoreBed.p,shore);
      this.shoreBed.filter.frequency.setTargetAtTime(1130+Math.sin(game.clock*1.97)*247,now,.13);
    }
    const pole=grounded && this.pole;
    level(this.powerBed,pole ? .10*(1-smooth(7,42,pole.distanceTo(p)))*(roof?.53:1) : 0);
    if (pole) this.audioPosition(this.powerBed.p,pole);

    let hum=0,rumble=0;
    if (grounded && game.storm) {
      const s=game.storm,angle=Math.atan2(player.p.z-s.z,player.p.x-s.x);
      const pos=vec(s.x+Math.cos(angle)*s.r,player.p.y,s.z+Math.sin(angle)*s.r);
      const margin=s.r-areaDistance(s,player.p.x,player.p.z);
      hum=.35*(1-smooth(3,88,areaDistance(pos,player.p.x,player.p.z)));
      rumble=(.20+s.index*.013)*(1-smooth(5,126,Math.max(0,margin)))*(roof?.59:1);
      this.audioPosition(this.wall.p,pos);
      this.wall.source.frequency.setTargetAtTime(40+Math.sin(game.clock*2.3)*6.2+s.index*.82,now,.12);
    }
    level(this.wall,hum);
    level(this.stormWind,rumble);
    if (grounded && now>=this.ambientEventAt && this.voices.size<76) this.ambientDetail(game,now,p);
    if (live && player.hp<39 && player.alive && now>=this.heartAt) {
      this.event("heartbeat",null,.78);
      this.voice("sine",58,39,.125,.18,this.effects,.16);
      this.heartAt=now+lerp(.55,.98,player.hp/40);
    }
    this.updateMusic(game,now,live);
  }
  victory() {
    if (!this.context) return;
    [196,261.63,329.63,392,523.26].forEach((n,i) => this.voice("triangle",n,n,.75,.14,this.music,i*.17));
  }
}
class SurfaceEffects {
  constructor(group,world) {
    this.group=group;
    this.world=world;
    this.marks=[];
    this.dust=[];
    this.matrix=new THREE.Matrix4();
    this.localNormal=vec(0,0,1);
    this.size=vec();
    this.capacity=172;
    const geometry=new THREE.PlaneGeometry(2,2);
    for (const name of ["markKind","markLife","markSeed"]) {
      geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(this.capacity),1).setUsage(THREE.DynamicDrawUsage));
    }
    const material=new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,fog:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
      uniforms:THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      vertexShader:`
        attribute float markKind,markLife,markSeed;
        varying vec2 markUV;
        varying vec3 mark;
        #include <fog_pars_vertex>
        void main(){
          markUV=uv*2.-1.;
          mark=vec3(markKind,markLife,markSeed);
          vec4 mvPosition=modelViewMatrix*instanceMatrix*vec4(position,1.);
          gl_Position=projectionMatrix*mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader:`
        varying vec2 markUV;
        varying vec3 mark;
        #include <fog_pars_fragment>
        void main() {
          vec2 p=markUV;
          float r=length(p),alpha=0.;
          vec3 color=vec3(.037,.026,.019);
          if (mark.x>.5 && mark.x<1.5) {
            float angle=atan(p.y,p.x);
            float grain=fract(sin(dot(floor(p*43.),vec2(16.73,38.16))+mark.z*171.)*173.70);
            float edge=.77+.10*sin(angle*5.+mark.z*16.)+.07*cos(angle*9.-mark.z*27.);
            float chip=(1.-smoothstep(.39,edge,r))*(.12+grain*.45);
            float core=(1.-smoothstep(.15,.29,r))*.96;
            color=mix(vec3(.022,.015,.010),vec3(.20,.16,.11),smoothstep(.16,.31,r)*.79);
            alpha=(core+chip*(1.-core))*(1.-mark.y*.72);
          } else if (mark.x<.5) {
            float grit=fract(sin(dot(floor(p*29.),vec2(19.7,47.2))+mark.z*532.)*11871.);
            alpha=(1.-smoothstep(.16,.96,r))*(grit*.32+.58)*(1.-mark.y*.83);
          } else if (mark.x<2.5) {
            float toe=1.-smoothstep(.79,1.,length((p-vec2(-.10,.33))*vec2(1.23,2.04)));
            float heel=1.-smoothstep(.78,1.,length((p-vec2(.15,-.50))*vec2(1.48,2.71)));
            float tread=smoothstep(.36,.59,fract((p.y+abs(p.x)*.31)*7.));
            alpha=max(toe,heel)*(.20+.28*tread)*(1.-mark.y);
          } else {
            float crest=1.-smoothstep(.006,.040,abs(r-.82));
            float inner=1.-smoothstep(.009,.053,abs(r-.63));
            color=vec3(.45,.67,.68);
            alpha=(crest*.58+inner*.29)*(1.-mark.y)*(1.-mark.y);
          }
          if (alpha<.012) discard;
          gl_FragColor=vec4(color,alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }
      `
    });
    this.mesh=new THREE.InstancedMesh(geometry,material,this.capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.layers.set(2);
    this.mesh.frustumCulled=false;
    this.mesh.count=0;
    this.mesh.renderOrder=2;
    group.add(this.mesh);

    const canvas=canvas2D(64),ctx=canvas.getContext("2d");
    const fade=ctx.createRadialGradient(32,32,3,32,32,31);
    fade.addColorStop(0,"#fff");
    fade.addColorStop(.43,"#fffd");
    fade.addColorStop(.73,"#fff6");
    fade.addColorStop(1,"#fff0");
    ctx.fillStyle=fade;
    ctx.fillRect(0,0,64,64);
    this.dustMap=new THREE.CanvasTexture(canvas);
  }
  groundNormal(p) {
    const terrain=this.world.terrain, x=p.x,z=p.z,d=.23;
    return vec(terrain.height(x-d,z)-terrain.height(x+d,z),2*d,terrain.height(x,z-d)-terrain.height(x,z+d)).normalize();
  }
  impactNormal(hit,direction) {
    const entry=hit.entry,p=hit.point;
    if (!entry) return this.groundNormal(p);
    if (entry.build?.type===3 && Math.abs(p.y-entry.build.y)>.021) {
      const x=p.x-entry.build.x,z=p.z-entry.build.z;
      return (Math.abs(x)>Math.abs(z)?vec(Math.sign(x)*.925,1,0):vec(0,1,Math.sign(z)*.925)).normalize();
    }
    const b=entry.box,faces=[
      [Math.abs(b.min.x-p.x),-1,0,0],[Math.abs(b.max.x-p.x),1,0,0],
      [Math.abs(b.min.y-p.y),0,-1,0],[Math.abs(b.max.y-p.y),0,1,0],
      [Math.abs(b.min.z-p.z),0,0,-1],[Math.abs(b.max.z-p.z),0,0,1]
    ];
    let plane=faces[0],best=Infinity;
    for (const face of faces) {
      const [distance,x,y,z]=face;
      const score=distance+.009*(x*direction.x+y*direction.y+z*direction.z+1);
      if (score<best) { best=score; plane=face; }
    }
    return vec(...plane.slice(1));
  }
  add(kind,at,normal,width,length,life,entry=null,yaw=0) {
    if (this.marks.length>=this.capacity) this.marks.shift();
    const q=new THREE.Quaternion().setFromUnitVectors(this.localNormal,normal);
    if (yaw) q.multiply(new THREE.Quaternion().setFromAxisAngle(this.localNormal,yaw));
    this.marks.push({kind,at,q,width,length,life,entry,age:0,seed:Math.random()});
  }
  puff(at,surface,power,normal) {
    if (this.dust.length>=31) return;
    const color=surface==="water"?"#c1d3d1":surface==="wood"?"#b29a78":surface==="stone" || surface==="concrete"?"#aaa394":"#9d8b69";
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({color,map:this.dustMap,transparent:true,opacity:.0,depthWrite:false}));
    sprite.position.copy(at).addScaledVector(normal,.09);
    sprite.layers.set(2);
    sprite.renderOrder=3;
    this.group.add(sprite);
    this.dust.push({sprite,age:0,life:surface==="water"?.34:.57+power*.22,power,
      v:vec((Math.random()-.5)*.53,.21+power*.46,(Math.random()-.5)*.59).addScaledVector(normal,.24)});
  }
  impact(hit,direction,heavy) {
    const {entry,point,surface}=hit,normal=this.impactNormal(hit,direction);
    if (["dirt","grass","stone","wood","concrete","asphalt"].includes(surface)) this.puff(point,surface,heavy?1:.72,normal);
    if (!entry || entry.door || !["wood","stone","metal","concrete","asphalt"].includes(surface)) return normal;
    const spot=point.clone().addScaledVector(normal,Math.abs(normal.y)>.6?.021:.040);
    if (surface==="metal" || heavy) this.add(0,spot,normal,heavy?.18:.12,heavy?.16:.11,23,entry);
    this.add(1,spot.clone().addScaledVector(normal,.003),normal,heavy?.071:.050,heavy?.067:.047,33,entry);
    return normal;
  }
  foot(actor) {
    const {p,yaw,surface}=actor;
    if (actor.id && p.distanceToSquared(actor.game.renderer.camera.position)>57**2) return;
    actor.footSide=-(actor.footSide||1);
    const at=p.clone().add(vec(Math.cos(yaw)*.14*actor.footSide,0,-Math.sin(yaw)*.14*actor.footSide));
    if (surface==="water") {
      at.y=SEA+.022;
      this.add(3,at,vec(0,1,0),.82,.82,.91);
      this.puff(at,surface,.58,vec(0,1,0));
      return;
    }
    const wet=this.world.climate.wetness.value>.15;
    const soil=surface==="dirt" || surface==="grass";
    if (!soil && !wet) return;
    const floor=this.world.collision.floor(at.x,at.z,p.y+.26,.025);
    if (Math.abs(floor.y-p.y)>.31) return;
    const normal=floor.entry?vec(0,1,0):this.groundNormal(at);
    at.y=floor.y;
    at.addScaledVector(normal,.019);
    if (!floor.entry || floor.entry.pavement) this.add(2,at,normal,.105,.162,wet?9:13,floor.entry,yaw);
    if (soil && !wet && actor.speed>3.5) this.puff(at,surface,actor.speed>4.8?.68:.39,normal);
  }
  update(dt) {
    const marks=this.marks,mesh=this.mesh,attr=mesh.geometry.attributes;
    for (let i=marks.length-1;i>=0;i--) {
      marks[i].age+=dt;
      if (marks[i].age>=marks[i].life || marks[i].entry?.active===false) marks.splice(i,1);
    }
    marks.forEach((mark,i)=>{
      const age=mark.age/mark.life,spread=mark.kind===3 ? lerp(.16,1,Math.sqrt(age)):1;
      mesh.setMatrixAt(i,this.matrix.compose(mark.at,mark.q,this.size.set(mark.width*spread,mark.length*spread,1)));
      attr.markKind.setX(i,mark.kind);
      attr.markLife.setX(i,age);
      attr.markSeed.setX(i,mark.seed);
    });
    mesh.count=marks.length;
    if (mesh.count) mesh.instanceMatrix.needsUpdate=attr.markKind.needsUpdate=attr.markLife.needsUpdate=attr.markSeed.needsUpdate=true;
    for (let i=this.dust.length-1;i>=0;i--) {
      const puff=this.dust[i],{sprite,power}=puff;
      puff.age+=dt;
      const age=puff.age/puff.life;
      if (age>=1) {
        this.removeDust(puff);
        this.dust.splice(i,1);
        continue;
      }
      sprite.position.addScaledVector(puff.v,dt);
      sprite.material.opacity=(1-age)*smooth(.0,.20,age)*(.15+power*.21);
      const s=lerp(.14,.54+power*.46,age);
      sprite.scale.set(s,s*.64,1);
    }
  }
  removeDust({sprite}) {
    sprite.material.dispose();
    sprite.removeFromParent();
  }
  dispose() {
    this.dust.forEach(puff=>this.removeDust(puff));
    this.dustMap.dispose();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
    this.mesh.removeFromParent();
  }
}

class Particles {
  constructor(group,world) {
    this.surface=new SurfaceEffects(group,world);
    this.euler=new THREE.Euler();this.particleScale=vec();
    this.effectBudget=1;
    this.parts=[];
    this.lines=[];
    this.mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({roughness:.83,emissive:"#23221c"}),480);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled=false;
    this.mesh.count=0;
    const p=new Float32Array(90*6), colors=new Float32Array(p.length);
    this.geometry=new THREE.BufferGeometry();
    this.geometry.setAttribute("position",new THREE.BufferAttribute(p,3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("color",new THREE.BufferAttribute(colors,3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setDrawRange(0,0);
    this.tracers=new THREE.LineSegments(this.geometry,new THREE.LineBasicMaterial({
      vertexColors:true,transparent:true,opacity:.91,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false
    }));
    this.tracers.frustumCulled=false;
    this.flashMesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),
      new THREE.MeshBasicMaterial({color:new THREE.Color(2.8,1.26,.31),toneMapped:false,transparent:true,opacity:.88,depthWrite:false,blending:THREE.AdditiveBlending}),36);
    this.flashMesh.count=0;
    this.flashMesh.frustumCulled=false;
    this.flashes=[];
    group.add(this.mesh,this.tracers,this.flashMesh);
    this.flashLights=Array.from({length:2},()=>new THREE.PointLight("#ffbb68",0,9.5,2));
    group.add(...this.flashLights);
    this.matrix=new THREE.Matrix4();
    this.rotation=new THREE.Quaternion();
  }
  burst(pos,surface,count,scale=1,normal=null) {
    count=Math.max(1,Math.ceil(count*this.effectBudget));
    const color={
      wood:"#ab875d",stone:"#ada899",concrete:"#a8a79b",metal:"#c0a784",glass:"#a1c9c8",
      grass:"#a19a71",dirt:"#a38e6e",asphalt:"#8c887f",water:"#9db4b4",hit:"#fad486",shield:"#9ac5f3",storm:"#a085ec"
    }[surface] || "#c0ad8a";
    for (let i=0;i<count && this.parts.length<480;i++) {
      const a=Math.random()*TAU,v=lerp(.4,4.2,Math.random())*scale;
      const velocity=vec(Math.cos(a)*v,lerp(.6,3.5,Math.random())*scale,Math.sin(a)*v);
      if (normal) velocity.addScaledVector(normal,scale*2.4);
      const spark=surface==="metal" && normal && i%2===0;
      if (spark) this.trace(pos,pos.clone().addScaledVector(velocity,.28),2.5);
      this.parts.push({
        p:pos.clone().add(vec((Math.random()-.5)*.09,Math.random()*.08,(Math.random()-.5)*.09)),
        v:velocity, stretch:surface==="wood" ? 2.9 : spark?2.1:1,
        age:0,life: spark?.17:lerp(.23,.72,Math.random())*(scale>.8?1:1.4),angle:a, scale:lerp(.035,.14,Math.random())*scale,
        color:new THREE.Color(color).multiplyScalar(lerp(.72,1.2,Math.random()))
      });
    }
  }
  trace(start,end,glow) {
    if (this.lines.length>=90) return;
    this.lines.push({start:start.clone(),end:end.clone(),life:.092,glow});
  }
  flash(at,strength=1) {
    if (this.flashes.length<36) this.flashes.push({ position:at.clone(), age:0, size:strength*.13 });
  }
  impact(hit,ray,item,detail) {
    const normal=detail?this.surface.impact(hit,ray,item==="shotgun" || item==="sniper"):null;
    this.burst(hit.point,hit.surface,detail?7:3,.57,normal);
  }
  foot(actor) {
    this.surface.foot(actor);
    if (actor.surface==="water" && (!actor.id || actor.p.distanceToSquared(actor.game.renderer.camera.position)<34**2)) {
      const at=actor.p.clone();
      at.y=SEA+.04;
      this.burst(at,"water",4,.42);
    }
  }
  lightMuzzles(camera) {
    const flashes=this.flashes.filter(flash=>flash.position.distanceToSquared(camera.position)<56**2);
    flashes.sort((a,b)=>a.position.distanceToSquared(camera.position)-b.position.distanceToSquared(camera.position));
    this.flashLights.forEach((light,i)=>{
      const flash=flashes[i];
      light.visible=this.effectBudget>.45 && i<(this.effectBudget<.8?1:2);
      light.intensity=flash?34*(flash.size/.13)*(1-flash.age/.066)**2:0;
      if (flash) light.position.copy(flash.position);
    });
  }
  update(dt,terrain) {
    this.surface.update(dt);
    const matrix=this.matrix, rotation=this.rotation;
    for(let i=this.parts.length-1;i>=0;i--) {
      const part=this.parts[i];
      part.age+=dt;
      if (part.age>=part.life) { this.parts.splice(i,1); continue; }
      part.p.addScaledVector(part.v,dt);
      part.v.y-=dt*9.3;
      const y=terrain.height(part.p.x,part.p.z);
      if (part.p.y<y+.02) { part.p.y=y+.02; part.v.y=Math.max(0,-part.v.y*.27); part.v.multiplyScalar(.68); }
    }
    this.parts.forEach((p,i)=>{
      const s=p.scale*(1-smooth(p.life*.65,p.life,p.age));
      rotation.setFromEuler(this.euler.set(p.angle+p.age*7,p.angle*3+p.age*5,0));
      this.mesh.setMatrixAt(i,matrix.compose(p.p,rotation,this.particleScale.set(s,s*.66,s*.76*p.stretch)));
      this.mesh.setColorAt(i,p.color);
    });
    this.mesh.count=this.parts.length;
    if (this.mesh.count) this.mesh.instanceMatrix.needsUpdate=this.mesh.instanceColor.needsUpdate=true;
    const p=this.geometry.attributes.position,c=this.geometry.attributes.color;
    for(let i=this.lines.length-1;i>=0;i--) {
      this.lines[i].life-=dt;
      if (this.lines[i].life<0) this.lines.splice(i,1);
    }
    this.lines.forEach(({start,end,life,glow},i)=>{
      const power=(life/.137)*glow;
      p.setXYZ(i*2,start.x,start.y,start.z);
      p.setXYZ(i*2+1,end.x,end.y,end.z);
      c.setXYZ(i*2,power,power*.81,power*.38);
      c.setXYZ(i*2+1,power*.64,power*.43,power*.22);
    });
    this.geometry.setDrawRange(0,this.lines.length*2);
    if (this.lines.length) p.needsUpdate=c.needsUpdate=true;
    this.flashes=this.flashes.filter(f=>{ f.age+=dt; return f.age<.066; });
    this.flashes.forEach((piece,i)=>{
      const s=piece.size*(1-piece.age/.08);
      this.flashMesh.setMatrixAt(i,matrix.makeScale(s,s,s*1.73).setPosition(piece.position));
    });
    this.flashMesh.count=this.flashes.length;
    this.flashMesh.instanceMatrix.needsUpdate=true;
  }
  dispose() {
    this.surface.dispose();
    this.flashLights.forEach(light=>light.removeFromParent());
    for (const mesh of [this.mesh,this.tracers,this.flashMesh]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
      mesh.dispose?.();
      mesh.removeFromParent();
    }
  }
}

const BUILD_SIZE = 4;
const BUILD_LEVEL = 3.15;
const BUILD_DECK = .21;

function buildGeometry(type) {
  const local=[];
  if (type===0) local.push([0,BUILD_LEVEL/2,0,BUILD_SIZE,BUILD_LEVEL,.166]);
  if (type===1) local.push([0,BUILD_DECK/2,0,BUILD_SIZE,BUILD_DECK,BUILD_SIZE]);
  if (type===2) for (let i=0;i<16;i++) {
    const cap=(BUILD_LEVEL+BUILD_DECK)*(i+1)/16,run=BUILD_SIZE/16;
    local.push([0,cap/2,BUILD_SIZE/2-run*(i+.5),BUILD_SIZE,cap,run]);
  }
  if (type===3) {
    const p=[vec(-2,0,-2),vec(2,0,-2),vec(2,0,2),vec(-2,0,2),vec(0,1.85,0)];
    const pos=[],uv=[];
    for (const face of [[0,4,1],[1,4,2],[2,4,3],[3,4,0],[0,1,2],[0,2,3]]) {
      face.forEach(i=>pos.push(p[i].x,p[i].y,p[i].z));
      uv.push(0,0,.75,.924,1.5,0);
    }
    const shape=new THREE.BufferGeometry();
    shape.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));
    shape.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
    shape.computeVertexNormals();
    return { local, shape, pyramid:p };
  }
  return { local, shape:mergeParts(local.map(args=>boxAt(...args))) };
}

class BuildSystem {
  constructor(game) {
    this.game=game;
    this.pieces=new Map();
    this.templates=BUILD_NAMES.map((_,i)=>buildGeometry(i));
    this.blue=new THREE.MeshBasicMaterial({color:"#6fc9f2",opacity:.28,transparent:true,depthWrite:false,side:THREE.DoubleSide});
    this.red=this.blue.clone();
    this.red.color.set("#d27b61");
    this.ghost=new THREE.Mesh(this.templates[0].shape,this.blue);
    this.ghost.visible=false;
    this.ghost.renderOrder=12;
    const edges=this.templates.map(t=>new THREE.EdgesGeometry(t.shape,30));
    const outline=new THREE.LineSegments(edges[0],new THREE.LineBasicMaterial({color:"#b2e4ff",transparent:true,opacity:.75,depthWrite:false}));
    const arrowGeometry=new THREE.BufferGeometry().setFromPoints([
      vec(0,.65,1.4),vec(0,3.42,-1.85),
      vec(-.48,2.94,-1.24),vec(0,3.42,-1.85),
      vec(.48,2.94,-1.24),vec(0,3.42,-1.85)
    ]);
    this.arrow=new THREE.LineSegments(arrowGeometry,new THREE.LineBasicMaterial({color:"#f2f8ff",depthTest:false}));
    this.arrow.renderOrder=13;
    this.ghost.add(outline,this.arrow);
    this.outline=outline;
    this.edges=edges;
    this.game.objects.add(this.ghost);
    this.cost=10;
  }
  plan(x,z,y,type,material,turn,rotation=0,preferredLevel=null) {
    const size=BUILD_SIZE,h=size/2, snap=value=>Math.round(value/size)*size;
    const gx=snap(x),gz=snap(z);
    const angle=(turn+rotation)*Math.PI/2;
    let px=gx,pz=gz, sampleX=gx,sampleZ=gz;
    if (type===0) {
      // Rotate around the same grid corner so every orientation lands on an edge.
      const forward=aimVector(turn*Math.PI/2);
      sampleX=Math.round(gx+forward.x*h); sampleZ=Math.round(gz+forward.z*h);
      px=Math.round(gx+(forward.x-Math.cos(turn*Math.PI/2)+Math.cos(angle))*h);
      pz=Math.round(gz+(forward.z+Math.sin(turn*Math.PI/2)-Math.sin(angle))*h);
    }
    const w=this.game.world;
    const ground=w.collision.floor(sampleX,sampleZ,y+.55,.04,true).y;
    let base=preferredLevel ?? (Math.abs(ground-y)<.85 ? ground : y);
    if (preferredLevel===null && Math.abs(base-ground)<.04 && (type===1 || type===3)) {
      const corners=[[-1.97,-1.97],[-1.97,1.97],[1.97,-1.97],[1.97,1.97]];
      const uphill=Math.max(...corners.map(([u,v])=>w.terrain.height(px+u,pz+v)));
      base=Math.max(base,Math.min(base+.60,uphill-.06));
    }
    if (preferredLevel===null) {
      let error=.72;
      for (const other of this.pieces.values()) {
        if (Math.abs(other.x-sampleX)>size+.11 || Math.abs(other.z-sampleZ)>size+.11) continue;
        for (const level of (other.type===2 || other.type===0 ? [other.y,other.y+BUILD_LEVEL] : [other.y])) {
          const difference=Math.abs(level-base);
          if (difference<error) { error=difference; preferredLevel=level; }
        }
      }
      if (preferredLevel!==null) base=preferredLevel;
    }
    const axis=(turn+rotation)%2;
    const key=type+"/"+px+"/"+pz+"/"+Math.round(base*1000)+"/"+(type===0?Math.abs(axis):0);
    const matrix=new THREE.Matrix4().makeRotationY(angle).setPosition(px,base,pz);
    const {local,pyramid}=this.templates[type];
    const boxes=pyramid?[bounds(px,base+.925,pz,size,1.85,size)]:local.map(args=>bounds(...args).applyMatrix4(matrix));
    const footprint=boxes.reduce((area,box)=>area.union(box),new THREE.Box3());
    return { type,material,angle,key,gx,gz,turn,rotation,x:px,z:pz,y:base,matrix,boxes,footprint };
  }
  anchors(plan) {
    const {type,x,y,z,angle}=plan;
    const offsets=type===0?[[-1.6,0],[0,0],[1.6,0]]:[[0,0],[1.55,1.55],[-1.55,-1.55],[1.55,-1.55],[-1.55,1.55]];
    const c=this.game.world.collision;
    const points=offsets.map(([u,v])=>c.floor(x+u*Math.cos(angle)+v*Math.sin(angle),z-u*Math.sin(angle)+v*Math.cos(angle),y+.27,.04,true).y);
    return points.filter(height=>height>SEA-.05 && Math.abs(y-height)<.72).length >= (type===0?1:2);
  }
  touches(a,b) {
    const x=Math.min(a.max.x,b.max.x)-Math.max(a.min.x,b.min.x);
    const z=Math.min(a.max.z,b.max.z)-Math.max(a.min.z,b.min.z);
    return x>=-.021 && z>=-.021 && (x>.12 || z>.12);
  }
  supports(lower,piece) {
    if (lower===piece) return false;
    const rise=piece.y-lower.y;
    if (Math.abs(rise)<.035) return this.touches(lower.footprint,piece.footprint);
    if (Math.abs(rise-BUILD_LEVEL)>.035) return false;
    if (lower.type===0) return this.touches(lower.footprint,piece.footprint);
    if (lower.type!==2) return false;
    const up=aimVector(lower.angle), end=lower.footprint.clone();
    if (Math.abs(up.x)>.5) {
      if (up.x>0) end.min.x=end.max.x-.025;
      else end.max.x=end.min.x+.025;
    } else if (up.z>0) end.min.z=end.max.z-.025;
    else end.max.z=end.min.z+.025;
    return this.touches(end,piece.footprint);
  }
  rejection(plan,owner) {
    if (owner.materials[plan.material]<this.cost) return "Need 10 "+MATERIALS[plan.material].toLowerCase();
    if (this.pieces.size>=420) return "Build limit reached";
    if (this.pieces.has(plan.key)) return "Piece already placed";
    if (Math.abs(plan.x)>HALF || Math.abs(plan.z)>HALF) return "Outside the build area";
    const collision=this.game.world.collision;
    const overlap=(a,b,edge)=>Math.min(a.max.x,b.max.x)-Math.max(a.min.x,b.min.x)>edge &&
      Math.min(a.max.y,b.max.y)-Math.max(a.min.y,b.min.y)>.032 && Math.min(a.max.z,b.max.z)-Math.max(a.min.z,b.min.z)>edge;
    for(const box of plan.boxes) {
      for(const actor of this.game.actors) {
        if(actor.state==="ground" && box.min.y<actor.p.y+1.56 && box.max.y>actor.p.y+.26 &&
          collision.horizontalHit(box,actor.p.x,actor.p.z,.31)) return "Move clear of the preview";
      }
      const blocked=collision.visit(box.min.x,box.min.z,box.max.x,box.max.z,e=>
        !e.ghost && !(e.pavement && e.box.max.y<=plan.y+.16) && overlap(box,e.box,e.build && (plan.type===0 || e.build.type===0) ? .09 : .041));
      if (blocked) return "Blocked by a nearby object or piece";
    }
    if (plan.type===1 && [-1.94,0,1.94].some(u=>[-1.94,0,1.94].some(v=>
      this.game.world.terrain.height(plan.x+u,plan.z+v)>plan.y+BUILD_DECK-.012))) return "Ground is too high for this floor";
    if (!this.anchors(plan) && ![...this.pieces.values()].some(piece=>this.supports(piece,plan))) return "Needs ground or a connected support";
    return "";
  }
  valid(plan,owner) { return !this.rejection(plan,owner); }
  preview(player) {
    const p=player.p,c=this.game.world.collision;
    const camera=this.game.renderer.camera, dir=this.game.headless?aimVector(player.yaw,player.pitch):this.game.cameraRig.direction;
    const from=this.game.headless?eyePosition(player):camera.position;
    const type=player.buildType,turn=Math.round(player.yaw/(Math.PI/2));
    const ahead=aimVector(player.yaw);
    const hit=c.cast(from,dir,13,"bullet");
    const distance=hit?areaDistance(p,hit.point.x,hit.point.z):Infinity;
    const target=distance>2.6 && distance<8.5 ? hit.point.clone() : p.clone().addScaledVector(ahead,type===0?3.35:4.32);
    const piece=distance<8.5 ? hit.entry?.build : null;
    const size=BUILD_SIZE, half=size/2;
    let level=null;
    if (piece && type!==0) {
      if (piece.type===2 && hit.point.y>=piece.y+BUILD_LEVEL*.66) {
        // Aim at the upper treads to extend a level platform beyond the ramp.
        target.set(piece.gx,piece.y,piece.gz).addScaledVector(aimVector(piece.angle),size);
        level=piece.y+BUILD_LEVEL;
      } else if (piece.type===1) {
        const dx=hit.point.x-piece.x,dz=hit.point.z-piece.z;
        const axis=Math.abs(dx)>.8 || Math.abs(dz)>.8 ? vec(dx,0,dz) : ahead;
        target.set(piece.x,piece.y,piece.z);
        if (Math.abs(axis.x)>Math.abs(axis.z)) target.x+=Math.sign(axis.x)*size;
        else target.z+=Math.sign(axis.z)*size;
        level=piece.y;
      } else if (piece.type===0 && hit.point.y>piece.y+BUILD_LEVEL-.48) {
        level=piece.y+BUILD_LEVEL;
      }
    }
    if (level===null && type!==0) {
      const under=c.floor(p.x,p.z,p.y+.045,.04).entry?.build;
      if (under?.type===2 && p.y>=under.y+BUILD_LEVEL-.22 &&
        target.clone().sub(vec(under.x,0,under.z)).dot(aimVector(under.angle))>half) level=under.y+BUILD_LEVEL;
      if (under?.type===1) level=under.y;
    }
    const y=c.floor(target.x,target.z,p.y+.36,.06,true).y;
    const plan=this.plan(target.x,target.z,y,type,player.buildMaterial,turn,player.buildRotation,level);
    const reason=this.rejection(plan,player),valid=!reason;
    this.selected={plan,valid,reason,rotation:player.buildRotation};
    this.ghost.visible=true;
    this.ghost.position.set(plan.x,plan.y,plan.z);
    this.ghost.rotation.y=plan.angle;
    this.ghost.geometry=this.templates[plan.type].shape;
    this.outline.geometry=this.edges[plan.type];
    this.ghost.material=valid?this.blue:this.red;
    this.outline.material.color.set(valid?"#b2e4ff":"#ed9072");
    this.arrow.visible=plan.type===2;
  }
  placePlayer(player) {
    const shown=this.shown;
    const same=shown && shown.plan.type===player.buildType && shown.plan.material===player.buildMaterial && shown.rotation===player.buildRotation;
    const selected=same ? shown : this.selected;
    if (selected?.valid && this.place(selected.plan,player)) return;
    this.game.audio.event("dry");
    this.game.ui.notice(selected?.reason || (selected && this.rejection(selected.plan,player)) || "Item cannot be placed here",1.25);
  }
  placeBot(bot,enemy,type) {
    const dir=vec(enemy.p.x-bot.p.x,0,enemy.p.z-bot.p.z).normalize();
    const turn=Math.round(yawTo(bot.p,enemy.p)/(Math.PI/2));
    const material=bot.materials.findIndex(count=>count>=this.cost);
    if (material<0) return false;
    for(const advance of [1.5,2.9,3.6]) {
      const x=bot.p.x+dir.x*advance,z=bot.p.z+dir.z*advance;
      const floor=this.game.world.collision.floor(x,z,bot.p.y+.22);
      const plan=this.plan(x,z,floor.y,type,material,turn);
      const piece=this.place(plan,bot);
      if (piece) return piece;
    }
    return false;
  }
  place(plan,owner=null) {
    const game=this.game, w=game.world;
    if (owner && this.rejection(plan,owner)) return null;
    const material=[w.mats.wood,w.mats.brick,w.mats.steel][plan.material].clone();
    material.transparent=true;
    material.opacity=.38;
    material.depthWrite=false;
    const crack={value:0};
    material.onBeforeCompile=shader=>{
      shader.uniforms.wear=crack;
      shader.fragmentShader="uniform float wear;\n"+shader.fragmentShader.replace("#include <map_fragment>",`
        #include <map_fragment>
        vec2 p=vMapUv*6.;
        float crack1=abs(fract(p.x*.43+.51*p.y+sin(p.y*3.5)*.29)-.5);
        float crack2=abs(fract(p.y*.68-.49*p.x+sin(p.x*2.6)*.19)-.5);
        float split=(1.-smoothstep(.009,.054,crack1))*smoothstep(.1,.5,sin(p.y*1.3+.46*p.x));
        split+=.73*(1.-smoothstep(.009,.056,crack2))*smoothstep(.08,.41,cos(p.x*1.54));
        diffuseColor.rgb*=1.-min(1.,split)*wear*.81;
      `);
    };
    material.customProgramCacheKey=()=>"grayline-building-cracks";
    const mesh=new THREE.Mesh(this.templates[plan.type].shape,material);
    mesh.position.set(plan.x,plan.y,plan.z);
    mesh.rotation.y=plan.angle;
    mesh.receiveShadow=true;
    game.objects.add(mesh);
    const max=MATERIAL_HP[plan.material];
    const piece={...plan,mesh,crack,max,hp:max*.29,cap:max*.29,age:0,colliders:[]};
    const surface=["wood","stone","metal"][plan.material];
    for(const box of plan.boxes) {
      const opts={surface,build:piece,noFloor:plan.type===0};
      if (plan.type===3) {
        const p=this.templates[3].pyramid.map(v=>v.clone().applyMatrix4(plan.matrix));
        opts.heightAt=(x,z)=>plan.y+1.85*Math.max(0,1-Math.max(Math.abs(x-plan.x),Math.abs(z-plan.z))/2);
        opts.intersect=(ray,out)=>{
          let min=Infinity,found=null;
          for(let i=0;i<4;i++) {
            const at=ray.intersectTriangle(p[i],p[4],p[(i+1)%4],false,out);
            if (at && at.distanceToSquared(ray.origin)<min) { min=at.distanceToSquared(ray.origin); found=at.clone(); }
          }
          for(const [a,b,c] of [[0,1,2],[0,2,3]]) {
            const at=ray.intersectTriangle(p[a],p[b],p[c],false,out);
            if(at && at.distanceToSquared(ray.origin)<min) { min=at.distanceToSquared(ray.origin);found=at.clone(); }
          }
          return found?out.copy(found):null;
        };
      }
      piece.colliders.push(w.collision.add(box,opts));
      if (plan.type!==2 || box===plan.boxes[0] || box===plan.boxes[plan.boxes.length-1]) game.navigation.invalidate(box);
    }
    this.pieces.set(plan.key,piece);
    if(!owner) return piece;
    game.onBuild?.("place",piece);
    owner.materials[plan.material]-=this.cost;
    game.audio.event("build",mesh.position,.9);
    game.emitNoise(owner,mesh.position,"build",56);
    game.fx.burst(mesh.position,piece.colliders[0].surface,9,.65);
    return piece;
  }
  damage(piece,amount) {
    piece.hp-=amount;
    if(piece.hp>0) { this.game.onBuild?.("wear",piece);return; }
    this.remove(piece,true);
    this.checkSupport();
  }
  remove(piece,fx) {
    if (!this.pieces.delete(piece.key)) return;
    if(fx) this.game.onBuild?.("remove",piece);
    for(const [index,entry] of piece.colliders.entries()) {
      this.game.world.collision.remove(entry);
      if (index===0 || index===piece.colliders.length-1) this.game.navigation.invalidate(entry.box);
    }
    piece.mesh.removeFromParent();
    piece.mesh.material.dispose();
    if (fx) {
      const p=piece.mesh.position.clone().add(vec(0,.7,0));
      this.game.fx.burst(p,piece.colliders[0].surface,23,1.2);
      this.game.audio.event("break",p,.85);
    }
  }
  checkSupport() {
    const alive=[...this.pieces.values()];
    const reachable=new Set(alive.filter(piece=>this.anchors(piece)));
    const queue=[...reachable];
    for(let i=0;i<queue.length;i++) for(const other of alive) {
      if (!reachable.has(other) && this.supports(queue[i],other)) { reachable.add(other); queue.push(other); }
    }
    for(const piece of alive) if(!reachable.has(piece)) this.remove(piece,true);
  }
  update(dt) {
    for(const piece of this.pieces.values()) {
      piece.age+=dt;
      if (piece.age<1 || piece.cap<piece.max) {
        const fill=smooth(0,.99,piece.age), cap=piece.max*lerp(.29,1,fill);
        piece.hp=Math.min(cap,piece.hp+cap-piece.cap);
        piece.cap=cap;
        piece.mesh.material.opacity=lerp(.38,1,fill);
        if (fill===1) {
          piece.mesh.material.transparent=false;
          piece.mesh.material.depthWrite=true;
          piece.mesh.material.needsUpdate=true;
          piece.mesh.castShadow=true;
        }
      }
      piece.crack.value=smooth(0,.84,1-piece.hp/piece.cap);
    }
  }
  dispose() {
    for (const piece of this.pieces.values()) this.remove(piece,false);
    this.ghost.removeFromParent();
    for(const t of this.templates) t.shape.dispose();
    this.edges.forEach(g=>g.dispose());
    this.outline.material.dispose();
    this.arrow.geometry.dispose();
    this.arrow.material.dispose();
    this.blue.dispose();
    this.red.dispose();
  }
}

class LootAssets {
  constructor(game) {
    this.game=game;
    const m=game.world.mats;
    this.beams=RARITY_COLORS.map(color=>new THREE.ShaderMaterial({
      uniforms:{ tint:{value:new THREE.Color(color)},opacity:{value:.22} },
      vertexShader:`
        varying float beamY;
        void main(){beamY=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
      `,
      fragmentShader:`
        varying float beamY;uniform vec3 tint; uniform float opacity;
        void main(){gl_FragColor=vec4(tint*1.6,opacity*(1.-smoothstep(-.64,.62,beamY)));}
      `,
      transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false
    }));
    this.beamGeo=new THREE.CylinderGeometry(.13,.29,1.35,10,1,true);
    this.ringGeo=new THREE.RingGeometry(.31,.347,24).rotateX(-Math.PI/2);
    this.rings=RARITY_COLORS.map(color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.69,side:THREE.DoubleSide,depthWrite:false}));
    this.outlineMats=RARITY_COLORS.map(color=>new THREE.LineBasicMaterial({color,transparent:true,opacity:.56,depthWrite:false}));
    this.outlines={};
    for(const [id,form] of Object.entries(game.weapons.forms)) this.outlines[id]=new THREE.EdgesGeometry(form.gun.children[0].geometry,26);
    this.models={};
    const mesh=(geo,material)=>new THREE.Mesh(geo,material);
    const rich=m.paint("#9c8153",.53,.52),store=m.textured("plank","#876f4c",.81);
    const trunk=new THREE.Group(), caseBase=new THREE.Group(),lid=new THREE.Group();
    caseBase.add(mesh(boxAt(0,.182,0,.84,.36,.53),store),
      mesh(mergeParts([boxAt(0,.044,0,.88,.063,.57),boxAt(-.317,.22,0,.092,.31,.55),boxAt(.317,.22,0,.092,.31,.55),
        boxAt(0,.232,.278,.21,.13,.052)]),rich));
    const gem=new THREE.MeshStandardMaterial({color:"#f2b45a",emissive:"#ffb04c",emissiveIntensity:2.8,roughness:.47});
    caseBase.add(mesh(boxAt(0,.259,.308,.058,.046,.024),gem));
    lid.position.set(0,.357,-.262);
    lid.add(mesh(boxAt(0,.059,.264,.86,.126,.56),store),
      mesh(mergeParts([boxAt(-.319,.096,.261,.092,.092,.58),boxAt(.319,.096,.261,.092,.092,.58),boxAt(0,.008,.561,.234,.06,.029)]),rich));
    trunk.add(caseBase,lid);
    this.chest=trunk;
    const ammo=new THREE.Group();
    const ammoLid=new THREE.Group();
    ammo.add(mesh(boxAt(0,.113,0,.48,.224,.32),m.paint("#616c51",.76,.16)));
    ammoLid.position.set(0,.223,-.161);
    ammoLid.add(mesh(boxAt(0,.016,.16,.50,.055,.34),m.steel));
    ammo.add(ammoLid);
    this.ammo=ammo;
    this.models.ammo=mesh(boxAt(0,.066,0,.248,.124,.197),m.paint("#a79864",.59,.22));
    this.models.bandage=mesh(mergeParts([
      cylinderBetween(vec(-.094,.085,0),vec(.096,.085,0),.086,.086,13),
      cylinderBetween(vec(-.078,.086,.111),vec(.075,.086,.111),.069,.069,11)
    ]),m.paint("#d3c7ac",.87));
    this.models.medkit=new THREE.Group();
    this.models.medkit.add(mesh(boxAt(0,.117,0,.37,.229,.29),m.paint("#bebba6")),
      mesh(mergeParts([boxAt(0,.238,0,.149,.011,.049),boxAt(0,.238,0,.045,.011,.154)]),m.paint("#ad6556")));
    const blue=new THREE.MeshStandardMaterial({color:"#70bad2",roughness:.22,metalness:.14,emissive:"#184451",emissiveIntensity:.74});
    for(const [id,size] of [["small",.078],["big",.132]]) {
      this.models[id]=new THREE.Group();
      this.models[id].add(mesh(cylinderBetween(vec(0,.016,0),vec(0,size*2.3,0),size,size*.79,12),blue),
        mesh(cylinderBetween(vec(0,size*2.29,0),vec(0,size*2.86,0),size*.48,size*.46,9),m.steel));
    }
    for(const [id,mat] of [[0,m.wood],[1,m.rock],[2,m.steel]]) {
      this.models["material"+id]=mesh(mergeParts([boxAt(0,.065,0,.35,.13,.24),boxAt(-.07,.16,.023,.27,.069,.177,0,.126)]),mat);
    }
  }
  item(item) {
    const group=new THREE.Group(),tier=clamp(item.tier,0,4);
    const obj=item.kind==="gun"?this.game.weapons.model(item.id):this.models[item.kind==="med"?item.id:item.kind==="material"?"material"+item.id:"ammo"].clone();
    if (item.kind==="gun") {
      obj.add(new THREE.LineSegments(this.outlines[item.id],this.outlineMats[tier]));
      obj.rotation.set(0,Math.PI/2,-.10);
      obj.position.y=.12;
    }
    const ring=new THREE.Mesh(this.ringGeo,this.rings[tier]);
    const beam=new THREE.Mesh(this.beamGeo,this.beams[tier]);
    beam.position.y=.70;
    group.add(obj,ring,beam);
    return {group,obj};
  }
}

class Loot {
  constructor(game,populate=true) {
    this.game=game;
    this.assets=game.lootAssets;
    this.items=[];
    this.nextItem=0;
    this.containers=[];
    this.cells=new Map();
    this.scratch=[];
    this.random=game.random;
    this.commonLight=new THREE.PointLight("#ffce85",2.6,6,2.2);
    this.commonLight.visible=false;
    game.objects.add(this.commonLight);
    for (const stash of game.world.stashes) {
      const p=stash.position;
      if (!populate && (stash.kind==="gun" || stash.kind==="med")) continue;
      if (stash.kind==="gun") {
        const gun=this.randomGun(false);
        this.drop(gun,p,stash.building);
        this.drop(makeAmmo(WEAPON_STATS[gun.id].ammo),p.clone().add(vec(.56,0,.17)),stash.building);
      } else if (stash.kind==="med") {
        this.drop(this.randomMed(),p,stash.building);
      } else if (stash.kind==="car") {
        const wreck={...stash,p,open:false,duration:.38};
        wreck.netId=this.containers.length;
        this.containers.push(wreck);this.index(wreck);
      } else {
        const obj=(stash.kind==="chest"?this.assets.chest:this.assets.ammo).clone();
        obj.position.copy(p);
        obj.visible=false;
        this.game.objects.add(obj);
        const chest=stash.kind==="chest";
        const container={...stash,p,obj,lid:obj.children[1],open:false,duration:chest?.36:.26,lidAngle:0};
        container.netId=this.containers.length;
        this.containers.push(container);this.index(container);
      }
    }
  }
  index(entry) {
    const {x,z}=entry.p,key=Math.floor(x/18)+","+Math.floor(z/18);
    if(!this.cells.has(key)) this.cells.set(key,new Set());
    this.cells.get(key).add(entry);entry.cell=key;
  }
  unindex(entry) {
    const cell=this.cells.get(entry.cell);
    cell?.delete(entry);
    if(!cell?.size) this.cells.delete(entry.cell);
  }
  local(x,z,radius,out) {
    out.length=0;
    const max=radius*radius;
    for(let i=Math.floor((x-radius)/18);i<=Math.floor((x+radius)/18);i++) {
      for(let j=Math.floor((z-radius)/18);j<=Math.floor((z+radius)/18);j++) {
        const cell=this.cells.get(i+","+j);
        if(cell) for(const entry of cell) {
          if((entry.p.x-x)**2+(entry.p.z-z)**2<=max) out.push(entry);
        }
      }
    }
    return out;
  }
  randomGun(chest) {
    const r=this.random(), tier=chest?(r>.975?4:r>.835?3:r>.45?2:1):(r>.978?3:r>.862?2:r>.55?1:0);
    return makeGun(choose(Object.keys(WEAPON_STATS),this.random),tier);
  }
  randomMed() {
    const r=this.random();
    return r<.29?makeMed("bandage",3):r<.55?makeMed("small",2):r<.78?makeMed("medkit"):makeMed("big");
  }
  drop(item,position,building,corpse=false,netId=null) {
    const {group,obj}=this.assets.item(item);
    const p=position.clone(),c=this.game.world.collision;
    const base=c.floor(p.x,p.z,p.y+.25,.035).y;
    if(netId===null && base>p.y-.74 && base<p.y+.25) p.y=base;
    group.position.copy(p);
    group.visible=false;
    this.game.objects.add(group);
    const entry={ netId:netId??++this.nextItem,kind:"item",item,p,group,obj,building:building||this.game.world.buildings.locate(p.x,p.y,p.z), age:this.random()*TAU,taken:false,corpse };
    this.items.push(entry);
    this.index(entry);
    this.game.onLoot?.("item",entry);
    return entry;
  }
  take(actor,target) {
    if (!target || target.taken || target.open || target.node?.destroyed) return false;
    if (target.kind==="item") {
      const count=target.item.count;
      if(!actor.give(target.item)) {
        if(target.item.count<count) {
          actor.looted++;this.game.onLoot?.("item",target);this.game.audio.event("pickup",target.p,.50);
          if(!actor.id) this.game.ui.notice("Stack topped up",1.2);
          return true;
        }
        if(!actor.id) this.game.ui.notice("Inventory full",1.2);
        return false;
      }
      actor.looted++;
      target.taken=true;
      this.unindex(target);
      target.group.removeFromParent();
      this.game.onLoot?.("take",target,actor);
      this.game.audio.event("pickup",target.p,.50);
      if (!actor.id) this.game.ui.notice(itemName(target.item)+(target.item.kind==="gun"?" · "+RARITIES[target.item.tier]:""),1.15);
      return true;
    }
    target.open=true;
    this.unindex(target);
    this.game.onLoot?.("open",target);
    this.game.emitNoise(actor,target.p,target.kind, target.kind==="chest"?27:16);
    const {p,building}=target;
    const point=(x,z)=>{
      const target=p.clone().add(vec(x,0,z));
      const floor=this.game.world.collision.floor(target.x,target.z,p.y+.25,.02);
      target.y=clamp(floor.y,p.y-.78,p.y+.25);
      return target;
    };
    if (target.kind==="chest") {
      const gun=this.randomGun(true);
      const near=actor.p.clone().sub(p).setY(0).normalize(), hand=vec(-near.z,0,near.x);
      const spread=(forward,side)=>{
        const offset=near.clone().multiplyScalar(forward).addScaledVector(hand,side);
        return point(offset.x,offset.z);
      };
      this.drop(gun,spread(.95,-.16),building);
      this.drop(makeAmmo(WEAPON_STATS[gun.id].ammo),spread(.27,-.76),building);
      this.drop(this.randomMed(),spread(.42,.83),building);
      this.drop({kind:"material",id:Math.floor(this.random()*3),count:20,tier:0},spread(-.54,.58),building);
      this.game.audio.event("chest",p,.85);
      this.game.fx.burst(p.clone().add(vec(0,.45,0)),"hit",17,.62);
    } else if (target.kind==="car") {
      const dx=actor.p.x-p.x,dz=actor.p.z-p.z, length=Math.max(.3,Math.hypot(dx,dz));
      actor.give({kind:"material",id:2,count:18,tier:0});
      this.drop(makeAmmo(choose(Object.keys(AMMO),this.random)),point(dx/length*1.8,dz/length*1.8));
      this.game.audio.event("metal",p,.62);
    } else {
      const types=Object.keys(AMMO);
      this.drop(makeAmmo(choose(types,this.random)),point(.46,.41),building);
      this.drop(makeAmmo(choose(types,this.random)),point(-.54,.27),building);
      this.game.audio.event("ammo",p,.72);
    }
    return true;
  }
  target(player) {
    const p=player.p, eye=p.clone().add(vec(0,player.crouching?1.04:1.49,0)), direction=aimVector(player.yaw,player.pitch*.32);
    const camera=this.game.headless?eyePosition(player):this.game.renderer.camera.position;
    const crosshair=this.game.headless?aimVector(player.yaw,player.pitch):this.game.cameraRig.direction;
    let best=null,score=Infinity;
    const check=(entry,point,door=false)=>{
      if (Math.abs(p.y-point.y)>(door?1.37:.98)) return;
      const pos=point.clone().add(vec(0,door?0:.27,0));
      const diff=pos.clone().sub(eye),d=diff.length();
      if (d>3.25) return;
      diff.multiplyScalar(1/d);
      const facing=diff.dot(direction);
      if (facing<-.30 || facing<.25 && d>1.94) return;
      const onScreen=pos.clone().sub(camera).normalize().dot(crosshair);
      const needsGun=player.usingPick && entry.item?.kind==="gun";
      const value=d*.53+(1-facing)*1.5+(1-onScreen)*12-(needsGun?.88:0);
      if(value>=score) return;
      const hit=this.game.world.collision.cast(eye,diff,d-.06,"vision");
      if (hit && hit.entry?.door !== entry && !(entry.node && hit.entry?.node === entry.node)) return;
      score=value; best=entry;
    };
    for(const entry of this.local(p.x,p.z,3.52,this.scratch)) if(!entry.node?.destroyed) check(entry,entry.p);
    for(const door of this.game.world.doors) if(door.object.visible && areaDistance(p,door.target.x,door.target.z)<3.54) check(door,door.target,true);
    return best;
  }
  interact(player,dt,input) {
    const target=this.target(player);
    if (target!==player.interaction) { player.interaction=target; player.holdTime=0; player.interactionDone=false; }
    if (!input.down("use")) { player.holdTime=0; player.interactionDone=false; }
    if (!target || player.interactionDone) return;
    if(target instanceof Door) {
      if(input.just("use")) {
        target.set(!target.open,this.game.audio);
        this.game.emitNoise(player,target.target,"door",19);
      }
      return;
    }
    if (target.kind==="item") {
      if(input.just("use")) this.take(player,target);
      return;
    }
    if (!input.down("use")) return;
    player.holdTime+=dt;
    if(player.holdTime<target.duration) return;
    this.take(player,target);
    player.holdTime=0;
    player.interactionDone=true;
  }
  update(dt,viewer,clock) {
    let nearest=null,range=26;
    const quality=this.game.settings.values.preset,low=quality==="low",medium=quality==="medium";
    const itemDistance=low?59:medium?83:115,containerDistance=low?106:medium?140:185;
    for(const chest of this.containers) {
      if(!chest.obj) continue;
      const d=areaDistance(viewer,chest.p.x,chest.p.z);
      chest.obj.visible=d<containerDistance;
      if (chest.open && chest.lid && chest.lidAngle<1.34) {
        chest.lidAngle=damp(chest.lidAngle,1.36,9,dt);
        chest.lid.rotation.x=-chest.lidAngle;
      }
      if (chest.kind==="chest" && !chest.open && d<range) { nearest=chest; range=d; }
    }
    this.commonLight.intensity=nearest?2.6:0;
    this.commonLight.visible=this.game.settings.values.preset!=="low";
    if(nearest) { this.commonLight.position.copy(nearest.p);this.commonLight.position.y+=.77; }
    for(const item of this.items) {
      if (item.taken) continue;
      const d=areaDistance(viewer,item.p.x,item.p.z);
      item.group.visible=d<itemDistance;
      item.group.children[1].visible=d<(low?31:49);
      item.group.children[2].visible=d<(low?18:medium?35:53);
      if(d<itemDistance) {
        item.obj.position.y=.11+Math.sin(clock*2.1+item.age)*.073;
        if (item.item.kind!=="gun") item.obj.rotation.y=clock*.49+item.age;
      }
    }
    if (this.items.length>330) this.items=this.items.filter(item=>!item.taken);
  }
}

class Combat {
  constructor(game) {
    this.game=game;
    this.ray=new THREE.Ray();
    this.sphere=new THREE.Sphere();
    this.actorSample=vec();
    this.actorPoint=vec();
  }
  actors(shooter,origin,dir,max) {
    this.ray.set(origin,dir);
    let distance=max,result=null;
    const test=(actor,point,radius,head)=>{
      this.sphere.set(point,radius);
      const hit=this.ray.intersectSphere(this.sphere,this.actorPoint);
      if (!hit) return;
      const d=origin.distanceTo(hit);
      if (d>distance) return;
      distance=d;
      result={actor,point:hit.clone(),distance:d,head};
    };
    for(const actor of this.game.actors) {
      if (!actor.alive || actor===shooter || actor.state==="bus") continue;
      const pos=actor.p;
      if (pos.distanceToSquared(origin)>(distance+2.05)**2) continue;
      const duck=actor.crouching?.34:0,sample=this.actorSample;
      test(actor,sample.set(pos.x,pos.y+1.627-duck,pos.z),.151,true);
      test(actor,sample.set(pos.x,pos.y+1.205-duck,pos.z),.30,false);
      test(actor,sample.set(pos.x,pos.y+.851-duck*.65,pos.z),.265,false);
      test(actor,sample.set(pos.x,pos.y+.44-duck*.38,pos.z),.231,false);
    }
    return result;
  }
  firstHit(actor,origin,direction,range,breakGlass) {
    const c=this.game.world.collision;
    let solid=c.cast(origin,direction,range);
    for(let i=0;i<3 && breakGlass && solid?.entry?.glass;i++) {
      const being=this.actors(actor,origin,direction,solid.distance);
      if (being) return being;
      this.resource(solid,1,actor,false);
      solid=c.cast(origin,direction,range);
    }
    return this.actors(actor,origin,direction,solid?.distance || range) || solid;
  }
  spread(actor,item) {
    const w=WEAPON_STATS[item.id];
    const movement=smooth(.15,6.18,actor.speed);
    const player=actor.human;
    const heat=player && w.auto && actor.recoil.item===item ? actor.recoil.heat : 0;
    const base=w.spread*(actor.aiming?(item.id==="sniper"?.11:.40):1);
    const stable=player && actor.aiming && !w.auto && !w.pellets && actor.grounded && actor.speed<.25;
    if (stable && (actor.recoil.item!==item || actor.age-actor.recoil.lastAt>=w.delay*.93)) return 0;
    return base*(1+movement*.88)*(actor.grounded?1:1.70)*(1+heat*.78)*(actor.crouching?.78:1)*(1-item.tier*.047);
  }
  muzzleObstruction(actor,eye,muzzle,breakGlass) {
    const collision=this.game.world.collision, delta=muzzle.clone().sub(eye), length=delta.length();
    if (length<.018) return null;
    delta.multiplyScalar(1/length);
    let hit=collision.cast(eye,delta,length);
    for (let i=0;i<3 && hit?.entry?.glass && breakGlass;i++) {
      this.resource(hit,1,actor,false);
      hit=collision.cast(eye,delta,length);
    }
    return hit;
  }
  fire(actor,target=null) {
    const game=this.game,item=actor.held();
    if (actor.cooldown>0 || actor.action || !item || !actor.alive) return;
    if (item.kind==="pick") {
      actor.cooldown=.61;
      actor.action={type:"swing",item,total:.49,remaining:.49,hit:false};
      game.audio.event("swing",actor.p,.53);
      return;
    }
    if (item.kind!=="gun") return;
    const w=WEAPON_STATS[item.id];
    if (!item.clip) {
      // Bots decide when it is safe to reload in their combat behavior.
      if (actor.human) {
        actor.reload();
        if(!actor.action) game.audio.event("dry",actor.p,1.05);
      }
      actor.cooldown=.24;
      return;
    }
    item.clip--;
    actor.shotsFired++;
    let hitOpponent=false;
    actor.cooldown=w.delay;
    actor.shotPose=.95;
    const player=!!actor.human, rig=game.cameraRig, camera=game.renderer.camera;
    const eye=eyePosition(actor), first=player && rig.firstPerson;
    const collision=game.world.collision;
    let origin, muzzle, direction, fixedHit=null, blocked=false, sight=null;
    if(game.headless && player) {
      origin=eye.clone();
      direction=aimVector(actor.yaw,actor.pitch);
      muzzle=origin.clone().addScaledVector(direction,.43);
      const cosmetic=this.muzzleObstruction(actor,origin,muzzle,false);
      if(cosmetic) muzzle.copy(cosmetic.point).lerp(origin,.035);
    } else if (first) {
      // The visible gun is only a visual source. Every first-person pellet uses the camera.
      origin=camera.position.clone();
      direction=rig.direction.clone();
      muzzle=rig.muzzle(item.id);
      const cosmetic=this.muzzleObstruction(actor,origin,muzzle,false);
      if (cosmetic) muzzle.copy(cosmetic.point).lerp(origin,.035);
    } else {
      actor.model.root.position.copy(actor.p);
      actor.model.root.rotation.y=actor.yaw;
      actor.model.equip(item.id);
      muzzle=actor.model.muzzle(item.id);
      if (muzzle.distanceToSquared(eye)>3.2) muzzle=eye.clone().addScaledVector(aimVector(actor.yaw,actor.pitch),.47);
      origin=muzzle.clone();
      fixedHit=this.muzzleObstruction(actor,eye,muzzle,true);
      if (fixedHit) {
        blocked=true;
        muzzle.copy(fixedHit.point).lerp(eye,.025);
      }
      if (player) {
        const view=rig.direction;
        sight=this.firstHit(actor,camera.position,view,w.range,false);
        const look=sight?.point || camera.position.clone().addScaledVector(view,w.range);
        const converge=look.clone().sub(origin);
        const distance=converge.length();
        direction=converge.normalize();
        // Close camera intersections cannot bend a shot sharply across the shoulder.
        if (direction.dot(view)<.945) direction.copy(view);
        if (sight && !fixedHit) {
          const travel=look.clone().sub(origin).dot(direction)-.06;
          const obstruction=travel>.025?collision.cast(origin,direction,Math.min(travel,w.range),"vision"):null;
          blocked=!!obstruction && (!sight.entry || obstruction.entry!==sight.entry ||
            obstruction.point.distanceToSquared(sight.point)>.25);
          if (distance<.08 && !sight.actor) blocked=true;
        }
      } else {
        direction=target?target.clone().sub(origin).normalize():aimVector(actor.yaw,actor.pitch);
      }
    }

    game.audio.shot(item.id,muzzle,game.world,player);
    game.emitNoise(actor,muzzle,"shot",item.id==="sniper"?174:item.id==="pistol"?105:145);
    game.fx.flash(muzzle,item.id==="shotgun" || item.id==="sniper"?1.7:1.05);
    const spread=this.spread(actor,item), pellets=w.pellets||1;
    const centerPellet=player && actor.aiming && actor.grounded && actor.speed<.25;
    const right=direction.clone().cross(vec(0,1,0)).normalize(),up=right.clone().cross(direction).normalize();
    const listener=!game.headless && !player && game.player.state==="ground"?eyePosition(game.player):null;
    for (let i=0;i<pellets;i++) {
      const angle=Math.random()*TAU;
      const radius=i===0 && pellets>1 && centerPellet?0:Math.sqrt(Math.random())*spread;
      const ray=direction.clone().addScaledVector(right,Math.cos(angle)*radius).addScaledVector(up,Math.sin(angle)*radius).normalize();
      const hit=fixedHit||this.firstHit(actor,origin,ray,w.range,true);
      const point=hit?.point||origin.clone().addScaledVector(ray,w.range);
      if (i<4) game.fx.trace(muzzle,point,pellets>1?.82:1.2);
      if (listener && i<3 && hit?.actor!==game.player) {
        const travel=listener.clone().sub(origin).dot(ray);
        if (travel>1 && travel<(hit?.distance??w.range)-.11) {
          const near=origin.clone().addScaledVector(ray,travel),miss=near.distanceTo(listener);
          if (miss<1.95) game.audio.whizz(near,travel,miss);
        }
      }
      if (!hit) continue;
      if (player && !first && hit.entry && hit.entry!==sight?.entry && !hit.entry.glass &&
        hit.distance<Math.min(2.5,sight?.distance??Infinity)) blocked=true;
      const falloff=lerp(1,.53,smooth(w.falloff,w.range,hit.distance));
      const power=w.damage*(1+item.tier*.077)*falloff;
      if (hit.actor) {
        hitOpponent=true;
        game.damage(hit.actor,power*(hit.head?w.head:1),actor,"shot",hit.head,point);
      } else {
        game.fx.impact(hit,ray,item.id,i<2 && point.distanceToSquared(camera.position)<100**2);
        if (hit.entry?.build) game.builds.damage(hit.entry.build,power*.91);
        else if (hit.entry?.node) this.resource(hit,power*.59,actor,false);
      }
    }
    if(hitOpponent) actor.shotsHit++;
    if (player) {
      actor.blockedShot=blocked;
      actor.kick(item);
    }
  }
  harvest(actor) {
    if (actor.state!=="ground") return;
    const world=this.game.world,c=world.collision;
    const from=actor.p.clone().add(vec(0,actor.crouching?1.04:1.40,0));
    const direction=aimVector(actor.yaw,actor.pitch);
    let hit=this.firstHit(actor,from,direction,3.46,false);
    if (!hit && Math.abs(actor.pitch)<.7) hit=this.firstHit(actor,from,aimVector(actor.yaw,-.19),3.07,false);
    if (!hit) return;
    if(hit.actor) { this.game.damage(hit.actor,23,actor,"pick",false,hit.point); return; }
    if(hit.entry?.build) this.game.builds.damage(hit.entry.build,43);
    else if (hit.entry?.node) this.resource(hit,49,actor,true);
    else this.game.fx.burst(hit.point,hit.surface,12,.57);
    this.game.audio.event(hit.surface==="metal"?"metal":hit.surface==="wood"?"wood":hit.surface==="glass"?"glass":"stone",hit.point,.78);
  }
  resource(hit,amount,actor,harvest) {
    const node=hit.entry.node;
    if (node.destroyed) return;
    node.hp-=amount;
    if (harvest) this.game.fx.burst(hit.point,hit.surface,12,.68);
    if (node.hp>0) return;
    this.game.world.break(node);
    for (const entry of node.colliders) this.game.navigation.invalidate(entry.box);
    this.game.fx.burst(hit.point,hit.surface,node.silent?11:27,node.silent?.64:1.10);
    this.game.audio.event(node.silent?"glass":"break",hit.point,.70);
    if(node.reward) {
      const pos=hit.point.clone(), away=actor.p.clone().sub(pos).setY(0).normalize();
      pos.addScaledVector(away,.54);
      pos.y=this.game.world.collision.floor(pos.x,pos.z,actor.p.y+.45,.05).y;
      this.game.loot.drop({kind:"material",id:node.type,count:node.reward,tier:0},pos);
    }
    this.game.builds.checkSupport();
  }
}
const NAV_DIRS=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
class Navigation {
  constructor(world) {
    this.world=world;
    this.side=201;
    this.width=5;
    const n=this.side*this.side;
    this.altitude=new Float32Array(n);
    this.penalty=new Uint8Array(n);
    for(let iz=0;iz<this.side;iz++) for(let ix=0;ix<this.side;ix++) this.sample(ix,iz);
    this.seen=new Uint32Array(n);
    this.score=new Float32Array(n);
    this.parent=new Int32Array(n);
    this.closed=new Uint32Array(n);
    this.edges=new Int16Array(n);
    this.edges.fill(-1);
    this.token=0;
    this.queue=new Map();
  }
  sample(ix,iz) {
    const {terrain:t,collision:c,bridge,buildings,roads}=this.world;
    const x=(ix-100)*this.width,z=(iz-100)*this.width,i=iz*this.side+ix;
    const crossing=x>=bridge.min.x && x<=bridge.max.x && z>=bridge.min.z && z<=bridge.max.z;
    const y=t.height(x,z),f=c.floor(x,z,crossing?bridge.max.y+.05:y+.27,.34);
    this.altitude[i]=Math.max(SEA-.64,f.y);
    const steep=t.slope(x,z);
    const obstacle=c.blocked(x,this.altitude[i],z,1.64,.34,true) || buildings.locate(x,y,z);
    this.penalty[i]=!crossing && (y<SEA-.93 || steep>1.04) || obstacle?0:crossing || roads.surfaceAt(x,z,0,false)?1:y<SEA+.12?7:steep>.61?4:2;
  }
  request(bot) {
    this.queue.set(bot,bot.goal);
    bot.pathPending=true;
  }
  flush() {
    const next=this.queue.entries().next().value;
    if(!next) return;
    const [bot,goal]=next;
    this.queue.delete(bot);bot.pathPending=false;
    if(!bot.alive || !goal || bot.goal!==goal) return;
    bot.path=this.path(bot.p,goal,bot.goalHome);
    if(!bot.path.length) bot.failedPathAt=bot.game.match.age;
  }
  invalidate(box) {
    const loX=clamp(Math.floor(box.min.x/this.width)+98,0,200),hiX=clamp(Math.ceil(box.max.x/this.width)+102,0,200);
    const loZ=clamp(Math.floor(box.min.z/this.width)+98,0,200),hiZ=clamp(Math.ceil(box.max.z/this.width)+102,0,200);
    for(let z=loZ;z<=hiZ;z++) {
      this.edges.fill(-1,z*this.side+loX,z*this.side+hiX+1);
      for(let x=loX;x<=hiX;x++) this.sample(x,z);
    }
  }
  point(i) {
    return vec((i%this.side-100)*this.width,this.altitude[i],(Math.floor(i/this.side)-100)*this.width);
  }
  line(a,b,avoidWater=false) {
    const c=this.world.collision,t=this.world.terrain,d=areaDistance(a,b.x,b.z),pieces=Math.max(1,Math.ceil(d/.83));
    const radius=.317;
    let prior=a.y;
    for(let i=1;i<=pieces;i++) {
      const x=lerp(a.x,b.x,i/pieces),z=lerp(a.z,b.z,i/pieces),y=t.height(x,z);
      const floor=c.floor(x,z,prior+.265,radius), min=Math.max(floor.y,SEA-.64);
      const elevated=floor.entry && floor.y>=SEA;
      if ((!elevated && (y<-2.5 || avoidWater && y<SEA-.4)) || Math.abs(min-prior)>1.24 ||
        t.slope(x,z)>1.06 && !floor.entry || c.blocked(x,min,z,1.58,radius,true)) return false;
      prior=min;
    }
    return Math.abs(prior-b.y)<.68;
  }
  walkSpan(a,b,avoidWater=true) {
    const c=this.world.collision,t=this.world.terrain;
    const pieces=Math.max(1,Math.ceil(areaDistance(a,b.x,b.z)/.205));
    // A waypoint can name a lower tread than the capsule can already reach.
    const start=c.floor(a.x,a.z,a.y+.264,.327).y;
    let prior=Math.abs(start-a.y)<.34 ? Math.max(start,SEA-.64) : a.y;
    for (let i=1;i<=pieces;i++) {
      const x=lerp(a.x,b.x,i/pieces),z=lerp(a.z,b.z,i/pieces);
      const ground=t.height(x,z), floor=c.floor(x,z,prior+.264,.327);
      const low=Math.max(floor.y,SEA-.64);
      const elevated=floor.entry && floor.y>=SEA;
      if ((!elevated && (ground<-2.5 || avoidWater && ground<SEA-.4)) || low-prior>.266 || prior-low>.36 ||
        c.blocked(x,low,z,1.59,.303,true)) return false;
      prior=low;
    }
    return Math.abs(prior-b.y)<.44;
  }
  near(p) {
    const ix=clamp(Math.round(p.x/this.width)+100,1,199);
    const iz=clamp(Math.round(p.z/this.width)+100,1,199);
    let best=-1,value=Infinity;
    for (let sz=-3;sz<=3;sz++) for(let sx=-3;sx<=3;sx++) {
      if(ix+sx<0 || ix+sx>200 || iz+sz<0 || iz+sz>200) continue;
      const i=(iz+sz)*this.side+ix+sx;
      if(!this.penalty[i]) continue;
      const q=this.point(i),d=areaDistance(p,q.x,q.z)+this.penalty[i]*.65;
      if(d>=value || !this.line(p,q)) continue;
      best=i;
      value=d;
    }
    return best;
  }
  neighbors(index) {
    const cached=this.edges[index];
    if(cached>=0) return cached;
    const origin=this.point(index),ix=index%this.side,iz=Math.floor(index/this.side);
    let flags=0;
    for(const [bit,[dx,dz]] of NAV_DIRS.entries()) {
      if(ix+dx<0 || ix+dx>=this.side || iz+dz<0 || iz+dz>=this.side) continue;
      const to=index+dx+dz*this.side;
      if(!this.penalty[to] || Math.abs(this.altitude[to]-this.altitude[index])>4.04 ||
        !this.line(origin,this.point(to))) continue;
      flags|=1<<bit;
    }
    this.edges[index]=flags;
    return flags;
  }
  outdoor(a,b) {
    const span=areaDistance(a,b.x,b.z);
    const direct=span<=28 ? this.walkSpan(a,b) : span<170 && this.line(a,b,true);
    if(direct) return [b.clone()];
    const start=this.near(a),goal=this.near(b);
    if(start<0 || goal<0) return !direct && span>28 && this.line(a,b)?[b.clone()]:[];
    if(start===goal) return [this.point(start),b.clone()];
    const heap=new MinHeap(),token=++this.token,gx=goal%this.side,gz=Math.floor(goal/this.side),side=this.side;
    const distance=i=>Math.hypot(i%side-gx,Math.floor(i/side)-gz);
    this.score[start]=0;
    this.seen[start]=token;
    this.parent[start]=-1;
    heap.push(start,distance(start));
    let best=start,steps=0;
    while (heap.length && steps++<1080) {
      const {id}=heap.pop();
      if(this.closed[id]===token) continue;
      this.closed[id]=token;
      if(distance(id)<distance(best)) best=id;
      if(id===goal) break;
      const flags=this.neighbors(id);
      for(const [bit,[dx,dz]] of NAV_DIRS.entries()) {
        if(!(flags & (1<<bit))) continue;
        const next=id+dx+dz*side;
        if (this.closed[next]===token) continue;
        const cost=this.score[id]+(dx && dz?1.414:1)*lerp(1,this.penalty[next],.58)
          +Math.abs(this.altitude[next]-this.altitude[id])*.048;
        if(this.seen[next]===token && this.score[next]<=cost) continue;
        this.seen[next]=token;
        this.parent[next]=id;
        this.score[next]=cost;
        heap.push(next,cost+distance(next)*1.04);
      }
    }
    if(best===start) return span>28 && this.line(a,b)?[b.clone()]:[];
    const stack=[];
    for(let index=best;index!==start;index=this.parent[index]) stack.push(this.point(index));
    stack.reverse();
    const result=[];
    if (stack.length && !this.line(a,stack[0])) stack.unshift(this.point(start));
    let from=a,i=0;
    while (i<stack.length) {
      let next=i;
      for(let j=Math.min(i+5,stack.length-1);j>i;j--) {
        if(this.walkSpan(from,stack[j])) { next=j; break; }
      }
      result.push(stack[next]);
      from=stack[next];
      i=next+1;
    }
    if(best===goal && this.line(result.at(-1)||a,b)) result.push(b.clone());
    return result;
  }
  nearbyNode(build,p) {
    const nodes=build.nodes.map(({position},i)=>({
      i,cost:areaDistance(p,position.x,position.z)+Math.abs(p.y-position.y)*5
    })).sort((a,b)=>a.cost-b.cost);
    return nodes.slice(0,8).find(({i})=>this.walkSpan(p,build.nodes[i].position))?.i??-1;
  }
  indoors(build,a,b) {
    const source=typeof a==="number"?a:this.nearbyNode(build,a);
    const dest=typeof b==="number"?b:this.nearbyNode(build,b);
    if (source<0 || dest<0) return [];
    const previous=new Map([[source,-1]]),pending=[source],nodes=build.nodes;
    for (let i=0;i<pending.length && !previous.has(dest);i++) {
      const index=pending[i],node=nodes[index];
      // Try the authored stair and door waypoints first. Legal shortcuts can route around furniture.
      const choices=new Set(node.links);
      for (let j=0;j<nodes.length;j++) {
        const p=nodes[j].position;
        if (!previous.has(j) && p.distanceToSquared(node.position)<49 && Math.abs(p.y-node.position.y)<.7) choices.add(j);
      }
      for (const other of choices) {
        if (previous.has(other) || !this.walkSpan(node.position,nodes[other].position)) continue;
        previous.set(other,index);
        pending.push(other);
      }
    }
    if(!previous.has(dest)) return [];
    const route=[];
    for(let node=dest;node>=0;node=previous.get(node)) route.push(nodes[node].position.clone());
    route.reverse();
    return route;
  }
  path(a,b,home) {
    const from=this.world.buildings.locate(a.x,a.y,a.z);
    const dest=home || this.world.buildings.locate(b.x,b.y,b.z);
    if (areaDistance(a,b.x,b.z)<22 && Math.abs(a.y-b.y)<.80 && this.walkSpan(a,b)) return [b.clone()];
    if (from && dest===from) {
      const route=this.indoors(from,a,b);
      return route.length?[...route,b.clone()]:[];
    }
    const start=from?from.nodes[from.outside].position:a;
    const end=dest?dest.nodes[dest.outside].position:b;
    const between=this.outdoor(start,end);
    const result=from?this.indoors(from,a,from.outside):[];
    if (from && !result.length) return result;
    result.push(...between);
    if (dest && (between.at(-1)?.distanceTo(end)<.11 || this.walkSpan(start,end))) {
      const entry=this.indoors(dest,dest.outside,b);
      if (entry.length) result.push(...entry,b.clone());
    }
    return result;
  }
}

class Bot extends Competitor {
  constructor(game,id,botIndex=id-1) {
    const outfit=1+Math.floor(game.random()*(OUTFITS.length-1));
    super(game,id,BOT_NAMES[botIndex],outfit);
    const random=game.random;
    this.personality=choose(Object.keys(BOT_STYLES),random);
    this.style=BOT_STYLES[this.personality];
    this.traits={
      aggression:this.style.push*lerp(.78,1.19,random()),patience:clamp(this.style.hold+random()*.31,0,1),
      greed:this.style.loot*lerp(.83,1.24,random()),skill:lerp(.24,.99,random()),
      confidence0:lerp(.24,.82,random()),tilt:lerp(.22,1,random()),scan:lerp(.45,1.3,random())
    };
    this.confidence=this.traits.confidence0;
    this.drop=game.dropPlan(id-1,this.personality);
    this.intent="scout"; this.commitUntil=0; this.utility={};
    this.eye=vec();this.lookRay=vec();this.lookForward=vec();this.lootRay=vec();this.enemyEye=vec();this.shotAim=vec();this.movement=vec();
    this.nearLoot=[];this.knownLoot=new Map();this.visited=new Map();this.rooms=new Set();
    this.panic=0;this.fatigue=0;this.scoutAt=0;this.scanUntil=0;this.harvestAt=0;
    this.lastSound=0;this.doorAt=0;this.nextLoot=0;this.quirkAt=9+random()*28;
    this.phase=random()*TAU;
    this.brain="drop";
    this.goal=null;
    this.goalHome=null;
    this.path=[];
    this.pathAt=0;
    this.shortcutAt=0;
    this.repathAt=0;
    this.reroutes=0;
    this.thinkAt=id*.071;
    this.visibleEnemy=null;
    this.memory=null;
    this.reactionAt=0;
    this.aimSeconds=0;
    this.turnRate=0;
    this.pitchRate=0;
    this.nextBuild=0;
    this.nextHeight=2+game.random()*7;
    this.nextShot=0;
    this.nextHop=0;
    this.repositionAt=0;
    this.cover=null;
    this.coverAt=0;
    this.peekAt=0;
    this.peekUntil=0;
    this.stall=0;
    this.drift=game.random()*TAU;
    this.hand=id%2?1:-1;
    this.reject=new Map();
    this.materials=[20,0,0];
  }
  weapon(opponent) {
    const target=opponent?.p||opponent;
    const range=target?areaDistance(this.p,target.x,target.z):40;
    const fit={
      pistol:.51-.36*smooth(21,95,range),
      smg:1.02-.89*smooth(13,75,range),
      shotgun:1.23-1.14*smooth(9,38,range),
      rifle:.69+.35*smooth(15,38,range)-.63*smooth(89,192,range),
      sniper:.34+1.05*smooth(40,117,range)+(this.personality==="sniper"?.13:0)
    };
    let best=-1,value=-Infinity;
    this.items.forEach((item,index)=>{
      if (item?.kind!=="gun") return;
      const w=WEAPON_STATS[item.id], reserve=this.reserve[w.ammo];
      if (!item.clip && !reserve) return;
      const grade=fit[item.id]+item.tier*.072+(item.clip?.14+.035*item.clip/w.mag:-.52)-
        .96*smooth(w.range*.86,w.range,range)+(index===this.slot&&!this.usingPick?.035:0);
      if (grade>value) { value=grade;best=index; }
    });
    return best;
  }
  canSee(other,eye=this.eye) {
    const delta=this.lookRay.copy(other.p).sub(eye);
    delta.y+=eyeHeight(other)-.12;
    const length=delta.length();
    return length<.23 || !this.game.world.collision.cast(eye,delta.multiplyScalar(1/length),length-.10,"vision");
  }
  sense(max) {
    const eye=this.eye.copy(this.p);eye.y+=eyeHeight(this);
    const forward=this.lookForward.set(-Math.sin(this.yaw),0,-Math.cos(this.yaw));
    let best=null,score=Infinity;
    for(const other of this.game.actors) {
      if(other===this || !other.alive || other.state==="bus") continue;
      const dx=other.p.x-this.p.x,dz=other.p.z-this.p.z,d2=dx*dx+dz*dz;
      const range=max*(other.crouching?.74:1)*(other.speed<.8?.91:1);
      if(d2>range*range || Math.abs(other.p.y-this.p.y)>38) continue;
      const d=Math.sqrt(d2),facing=(dx*forward.x+dz*forward.z)/Math.max(.1,d);
      if(facing<lerp(-.30,.59,smooth(3,range,d)) && d>1.3) continue;
      const value=d+(1-facing)*12-(this.memory?.actor===other?4:0);
      if(value>=score || !this.canSee(other,eye)) continue;
      best=other;score=value;
    }
    return best;
  }
  remember(enemy,time,difficulty) {
    let memory=this.memory;
    if(memory?.actor!==enemy || time-memory.time>.80) {
      const turn=Math.abs(angleDiff(yawTo(this.p,enemy.p),this.yaw));
      const reaction=difficulty.react*(1.34-this.traits.skill*.49)*(1+this.fatigue*.47+turn*.29+this.panic*.38);
      this.reactionAt=time+reaction*lerp(.81,1.31,this.game.random());
      this.aimSeconds=0;
      this.memory={actor:enemy,p:enemy.p.clone(),velocity:vec(),time,duck:enemy.crouching,confidence:.62};
      return;
    }
    const interval=time-memory.time;
    if(interval>0) memory.velocity.lerp(this.lookRay.copy(enemy.p).sub(memory.p).multiplyScalar(1/interval).clampLength(0,8.3),.44);
    memory.p.copy(enemy.p);
    memory.time=time;
    memory.duck=enemy.crouching;
    memory.confidence=1;
  }
  struck(from,time) {
    const random=this.game.random;
    const angle=yawTo(this.p,from),rear=Math.abs(angleDiff(angle,this.yaw))>1.45;
    const direction=aimVector(angle+(random()-.5)*(rear?1.18:.71));
    this.damageGuess=this.p.clone().addScaledVector(direction,lerp(7,32,random()));
    this.damageGuess.y=this.game.world.terrain.height(this.damageGuess.x,this.damageGuess.z);
    if(rear) this.reactionAt=Math.max(this.reactionAt,time+.22+(1-this.traits.skill)*.29);
    this.panic=clamp(this.panic+.19*this.traits.tilt+(this.hp<38?.22:.06),0,1);
  }
  hear(time) {
    const g=this.game,limit=this.remote?27:60;
    let best=null,quality=0,others=0,otherId=-1;
    const wet=g.atmosphere.conditions.rain;
    for(let i=g.sounds.length-1;i>=Math.max(0,g.sounds.length-limit);i--) {
      const event=g.sounds[i],age=time-event.at;
      if(age>2.2) break;
      if(event.id===this.id || event.seq<=this.lastSound || Math.abs(this.p.y-event.p.y)>32) continue;
      const distance=areaDistance(this.p,event.p.x,event.p.z),radius=event.radius*(1-wet*.26);
      if(distance>radius) continue;
      const grade=(1-distance/radius)*(1-age/2.35)+(event.kind==="shot"?.16:0);
      if(event.kind==="shot" && event.id!==otherId && age<1.35) { others++;otherId=event.id; }
      if(grade<=quality) continue;
      best=event;quality=grade;
    }
    if(!best) return null;
    const random=g.random,d=areaDistance(this.p,best.p.x,best.p.z),toward=this.lookRay.copy(best.p).sub(this.eye);
    const length=toward.length();
    const occluded=length>.2 && g.world.collision.cast(this.eye,toward.multiplyScalar(1/length),length-.13,"vision");
    if(occluded && best.kind!=="shot" && quality<.63) { this.lastSound=best.seq;return null; }
    this.lastSound=best.seq;
    const angle=Math.atan2(best.p.z-this.p.z,best.p.x-this.p.x)+(random()-.5)*(.22+d*.0019)*(occluded?1.8:1);
    const radius=Math.max(1,d+lerp(-1,1,random())*(1.4+d*(occluded?.32:.16)));
    const x=this.p.x+Math.cos(angle)*radius,z=this.p.z+Math.sin(angle)*radius;
    const p=vec(x,g.world.terrain.height(x,z),z);
    return {p,at:best.at,kind:best.kind,crowded:others>=3,quality};
  }
  safeTarget(next) {
    const {storm,world}=this.game,zone=next?storm.target():storm;
    const distToCenter=areaDistance(zone,this.p.x,this.p.z),safeRadius=zone.r*lerp(.48,.86,this.traits.patience);
    const heading=Math.atan2(this.p.z-zone.z,this.p.x-zone.x);
    let best=null,bestScore=Infinity;
    for(let i=0;i<13;i++) {
      const spread=(hash(this.id,i)*2-1)*(.46+Math.min(1.4,44/Math.max(zone.r,1)));
      const angle=heading+spread,radius=safeRadius*lerp(.28,1,hash(i,this.id,19));
      const x=zone.x+Math.cos(angle)*radius,z=zone.z+Math.sin(angle)*radius,y=world.terrain.height(x,z);
      if(y<SEA+.27 || world.terrain.slope(x,z)>.82 || world.collision.blocked(x,y,z,1.65,.32,true)) continue;
      const value=areaDistance(this.p,x,z)+(distToCenter<zone.r+20?Math.abs(radius-safeRadius)*.65:0)-y*.12;
      if(value<bestScore) { bestScore=value;best=vec(x,y,z); }
    }
    return best||vec(zone.x,Math.max(SEA-.64,world.terrain.height(zone.x,zone.z)),zone.z);
  }
  seesLoot(target,radius,cone=true) {
    const eye=this.eye, ray=this.lootRay.copy(target.p).sub(eye);
    ray.y+=target.kind==="item"?.20:.30;
    const d=ray.length();
    if(d>radius || d<.01 || Math.abs(ray.y)>3.8 && d<12) return false;
    ray.multiplyScalar(1/d);
    if(cone && d>4 && ray.dot(this.lookForward)<.20) return false;
    const hit=this.game.world.collision.cast(eye,ray,d-.15,"vision");
    return !hit || hit.entry?.node===target.node && !!target.node;
  }
  lootValue(item,armed) {
    if(item.kind==="ammo") return (this.items.some(gun=>gun?.kind==="gun" && WEAPON_STATS[gun.id].ammo===item.id)?3.8:1.4)*(1-smooth(12,96,this.reserve[item.id]));
    if(item.kind==="material") return this.materials[item.id]<50?2.2:0;
    if(item.kind==="med") {
      const duplicate=this.items.find(old=>old?.id===item.id);
      if(duplicate?.count>=MEDICINE[item.id].max) return 0;
      return (MEDICINE[item.id].type==="health"?(100-this.hp):(100-this.shield))*.044+(duplicate?.count?.12:.55);
    }
    const same=this.items.find(gun=>gun?.id===item.id);
    if(same && same.tier>=item.tier && (same.clip || this.reserve[WEAPON_STATS[item.id].ammo])) return 0;
    return (armed?3.15:7.7)+item.tier*.61+(this.personality==="sniper" && item.id==="sniper"?1.35:0);
  }
  chooseLoot(armed,time,scan=true) {
    const g=this.game,sight=armed?this.remote?25:35:this.remote?37:47;
    let checks=0;
    if(scan) for(const loot of g.loot.local(this.p.x,this.p.z,sight,this.nearLoot)) {
      if(loot.taken || loot.open || loot.node?.destroyed || (this.reject.get(loot)||0)>time) continue;
      if(!this.knownLoot.has(loot) && checks++<20 && this.seesLoot(loot,sight)) {
        if(this.knownLoot.size>=20) this.knownLoot.delete(this.knownLoot.keys().next().value);
        this.knownLoot.set(loot,time);
      }
    }
    let best=null,score=0;
    for(const [loot,seenAt] of this.knownLoot) {
      if(loot.taken || loot.open || loot.node?.destroyed || time-seenAt>43 || !g.storm.contains(loot.p.x,loot.p.z,2)) {
        this.knownLoot.delete(loot); continue;
      }
      if((this.reject.get(loot)||0)>time) continue;
      const value=loot.item?this.lootValue(loot.item,armed):loot.kind==="chest"?armed?4.1:6.1:2.8;
      if(value<=0 || loot.item && !this.items.includes(null) && !this.replacement(loot.item,armed,false)) continue;
      const d=areaDistance(this.p,loot.p.x,loot.p.z)+Math.abs(this.p.y-loot.p.y)*3;
      const grade=value*this.traits.greed-d*.082-(time-seenAt)*.027+(this.lootTarget===loot?.87:0);
      if(grade>score) { best=loot;score=grade; }
    }
    return {target:best,score};
  }
  replacement(item,armed,drop) {
    if(item.kind==="ammo" || item.kind==="material" || item.kind==="med" && this.items.some(old=>old?.id===item.id && old.count<MEDICINE[item.id].max)) return true;
    const duplicate=this.items.findIndex(old=>old?.kind==="gun" && old.id===item.id && old.tier<item.tier);
    let index=duplicate,lowest=Infinity;
    if(index<0) {
      this.items.forEach((old,i)=>{
        if(!old || old===this.held() && old.kind==="gun") return;
        const score=old.kind==="gun"?3.6+old.tier*.61+(old.clip?.82:-1.6):this.lootValue(old,armed)+1.13;
        if(score<lowest) { index=i;lowest=score; }
      });
      if(lowest+1.12>=this.lootValue(item,armed)) return false;
    }
    if(index<0) return false;
    if(drop) {
      const old=this.items[index];
      this.items[index]=null;
      const p=this.p.clone().addScaledVector(this.lookForward,-.63);
      this.game.loot.drop(old,p);
    }
    return true;
  }
  standAt(x,z,far=false) {
    const world=this.game.world,t=world.terrain,c=world.collision;
    if (!this.game.storm.contains(x,z) || t.height(x,z)<SEA-.4) return null;
    const y=c.floor(x,z,far?t.height(x,z)+.27:this.p.y+.63,.29).y;
    if (!far && Math.abs(y-this.p.y)>1.7 || t.slope(x,z)>1.04 || c.blocked(x,y,z,1.60,.32,true)) return null;
    return vec(x,y,z);
  }
  sheltered(at,from,crouching=true) {
    const end=at.clone().add(vec(0,eyeHeight({crouching}),0));
    const delta=end.sub(from),length=delta.length();
    if (length<.3) return false;
    const hit=this.game.world.collision.cast(from,delta.normalize(),length-.13,"vision");
    return !!hit && length-hit.distance<25;
  }
  chooseCover(threat) {
    const from=threat.p?eyePosition(threat):threat;
    const nav=this.game.navigation,base=this.p;
    const away=base.clone().sub(from).setY(0).normalize();
    let best=null,cost=Infinity;
    const sampleCount=this.remote?8:17;
    for (let i=0;i<sampleCount;i++) {
      const a=this.drift+i*2.39996,r=1.8+(i%6)*2.08;
      const pos=this.standAt(base.x+Math.cos(a)*r,base.z+Math.sin(a)*r);
      if (!pos || !this.sheltered(pos,from) || !nav.walkSpan(base,pos)) continue;
      const value=r+Math.abs(pos.y-base.y)*1.8+((base.x-pos.x)*away.x+(base.z-pos.z)*away.z)*.21;
      if (value<cost) { cost=value;best=pos; }
    }
    return best;
  }
  peekPoint(from) {
    const here=this.p;
    if (!this.sheltered(here,from,false)) return here.clone();
    const aside=aimVector(yawTo(here,from)+this.hand*Math.PI/2);
    for (const step of [1.25,-1.25,2.15,-2.15]) {
      const point=this.standAt(here.x+aside.x*step,here.z+aside.z*step);
      if (point && !this.sheltered(point,from,false) && this.game.navigation.walkSpan(here,point)) return point;
    }
    return null;
  }
  retreatPoint(from) {
    const yaw=yawTo(from,this.p),nav=this.game.navigation;
    for (const offset of [0,.74,-.74,1.35,-1.35]) {
      const move=aimVector(yaw+offset).multiplyScalar(7.6);
      const point=this.standAt(this.p.x+move.x,this.p.z+move.z);
      if (point && nav.walkSpan(this.p,point)) return point;
    }
    return null;
  }
  setGoal(point,home=null,force=false) {
    const nav=this.game.navigation;
    if(!point) {
      this.goal=this.goalHome=null;this.path.length=0;
      if(this.pathPending) nav.queue.delete(this);
      this.pathPending=false;
      return;
    }
    const time=this.game.match.age;
    if(!force && this.goal && this.goal.distanceToSquared(point)<7 && (this.pathPending || time<this.pathAt)) return;
    this.goal=point.clone();this.goalHome=home;
    if(areaDistance(this.p,point.x,point.z)<15 && nav.walkSpan(this.p,point)) {
      this.path=[this.goal];this.pathPending=false;nav.queue.delete(this);
    } else nav.request(this);
    this.pathAt=time+(this.remote?2.9:1.5)+this.game.random()*.51;
  }
  takeCover(from,time,canPeek) {
    if (!this.cover || time>=this.coverAt || !this.sheltered(this.cover,from)) {
      this.cover=this.sheltered(this.p,from) ? this.p.clone() : this.chooseCover(from);
      this.coverAt=time+(this.remote?3.8:2.6);
    }
    if (this.cover) {
      const reached=this.p.distanceToSquared(this.cover)<.85;
      if (reached && canPeek && !this.remote && time>=this.peekAt) {
        const point=this.peekPoint(from);
        if (point) {
          this.peekUntil=time+(point.distanceToSquared(this.p)>.4?1.38:.78);
          this.peekAt=this.peekUntil+lerp(.55,1.25,this.style.caution);
          this.brain="peek";
          this.setGoal(point,null,true);
          return true;
        }
      }
      this.brain="cover";
      if (reached) this.setGoal(null);
      else this.setGoal(this.cover);
      return true;
    }
    const retreat=this.retreatPoint(from);
    if (!retreat) return false;
    this.brain="retreat";
    this.setGoal(retreat);
    return true;
  }
  medicine() {
    const limit=44+this.style.caution*18;
    const m=this.items.find(item=>item?.kind==="med" && MEDICINE[item.id].type==="health" &&
      this.hp<=Math.min(limit,MEDICINE[item.id].limit-12));
    return m||this.items.find(item=>item?.kind==="med" && MEDICINE[item.id].type==="shield" &&
      this.shield<=MEDICINE[item.id].limit-25);
  }
  climbRamp(target,time) {
    const g=this.game, ramp=g.builds.placeBot(this,target,2);
    if (!ramp) return false;
    const forward=aimVector(ramp.angle);
    const base=vec(ramp.x,ramp.y,ramp.z);
    const entry=base.clone().addScaledVector(forward,-2.31);
    entry.y=g.world.collision.floor(entry.x,entry.z,ramp.y+.24,.22).y;
    const top=base.addScaledVector(forward,1.72);
    top.y=ramp.y+BUILD_LEVEL+BUILD_DECK;
    this.highGround={ramp,time:time+4.6};
    this.goal=top;
    this.goalHome=null;
    this.path=[entry,top];
    this.pathAt=time+4.6;
    this.brain="high ground";
    return true;
  }
  fight(seen,spot,from,weapon,time,difficulty) {
    const g=this.game,s=this.style;
    const held=this.held(), gun=WEAPON_STATS[held?.id];
    const range=areaDistance(this.p,spot.x,spot.z);
    const hit=time-this.lastHitAt<.9;
    const medicine=this.medicine();
    const reserve=gun?this.reserve[gun.ammo]:0;
    const lowMag=gun && reserve>0 && held.clip<=Math.max(1,Math.floor(gun.mag*.18));
    const healHealth=medicine && MEDICINE[medicine.id].type==="health";
    const weak=this.hp<difficulty.courage+s.caution*11+this.panic*18-this.confidence*8;
    const sheltered=this.sheltered(this.p,from);
    if (hit && !sheltered && time>=this.nextBuild && range>6 && range<97 &&
      !g.world.buildings.locate(this.p.x,this.p.y,this.p.z)) {
      const placed=g.builds.placeBot(this,{p:spot},0);
      this.nextBuild=time+(placed?8:3.2)+g.random()*2.4;
      if(placed) { this.coverAt=0;this.brain="build cover"; }
    }
    if (sheltered && (healHealth || !seen && medicine && !hit)) {
      this.slotTo(this.items.indexOf(medicine));
      if (this.heal(medicine)) {
        this.brain="heal";
        this.setGoal(null);
        return true;
      }
    }
    if (sheltered && lowMag) {
      this.reload();
      if (this.action) {
        this.brain="reload";
        this.setGoal(null);
        return true;
      }
    }
    // During the landing scramble, let unarmed bots reach gear rather than
    // hiding from other unarmed competitors they happen to see.
    if (weapon<0 || !gun) {
      if (hit && range<38) {
        const escape=this.retreatPoint(from);
        if (escape) {
          this.brain="retreat";
          this.setGoal(escape);
          return true;
        }
      }
      return false;
    }
    if (this.brain==="peek" && time<this.peekUntil && !weak && !healHealth && held?.clip) return true;
    if (this.brain==="peek" && this.cover) {
      this.brain="cover";
      this.setGoal(this.cover,null,true);
      return true;
    }
    const hiding=this.brain==="cover" && this.cover && time<this.peekAt+.7;
    if (weak || healHealth || !held?.clip || hiding || hit && s.caution>.42) {
      if (this.takeCover(from,time,!!held?.clip && !weak && !healHealth)) return true;
    }
    if (this.highGround?.time>time && g.builds.pieces.has(this.highGround.ramp.key)) {
      this.brain="high ground";
      return true;
    }
    if (!seen) {
      if (this.p.distanceToSquared(spot)<1.65) {
        this.brain="search";
        this.setGoal(null);
        return true;
      }
      this.brain="chase";
      this.setGoal(spot);
      return true;
    }

    if (!this.remote && g.settings.values.difficulty==="hard" && time>=this.nextHeight &&
      time>=this.nextBuild && this.hp>65 && range>21 && range<79 &&
      !g.world.buildings.locate(this.p.x,this.p.y,this.p.z)) {
      this.nextHeight=time+6+g.random()*9;
      if (g.random()<.43 && this.climbRamp(seen,time)) {
        this.nextBuild=time+7;
        return true;
      }
    }
    const wounded=this.pressureOn===seen.id && time<this.pressureUntil && this.traits.aggression>.87 ||
      this.lastNoise?.kind==="reload" && time-this.lastNoise.at<1.3 && this.lastNoise.p.distanceToSquared(spot)<50;
    const closeRange=(held.id==="shotgun"?18:held.id==="smg"?31:held.id==="sniper"?93:61)*s.distance;
    if ((wounded && this.hp>54 && this.traits.aggression>.74 && range>7) || range>closeRange*1.35 && this.hp>40) {
      this.brain="push";
      const distance=wounded?Math.min(7,closeRange*.6):closeRange*.76;
      const direction=this.p.clone().sub(spot).setY(0).normalize();
      const destination=spot.clone().addScaledVector(direction,distance);
      const floor=g.world.collision.floor(destination.x,destination.z,spot.y+.45);
      destination.y=floor.y;
      this.setGoal(destination);
      return true;
    }
    if (held.id==="sniper" && range<22 && s.distance>1.05 && this.takeCover(from,time,true)) return true;
    if (this.brain!=="engage" || time>=this.repositionAt) {
      this.hand*=-1;
      this.repositionAt=time+lerp(.57,1.42,g.random())*(this.remote?1.45:1);
      const dir=aimVector(yawTo(this.p,spot)+Math.PI/2*this.hand);
      const length=(range<16?2.4:3.3)*lerp(.7,1.28,g.random());
      const position=this.standAt(this.p.x+dir.x*length,this.p.z+dir.z*length);
      this.setGoal(position && g.navigation.walkSpan(this.p,position)?position:null,null,true);
    }
    this.brain="engage";
    return true;
  }
  goalScore(state,score,point=null) {
    const committed=this.intent===state && this.game.match.age<this.commitUntil;
    score+=committed?1.44:0;
    if(score>this.utility.score) Object.assign(this.utility,{state,score,point});
  }
  scout(time) {
    const g=this.game,p=this.p,zone=g.storm.target(),world=g.world;
    if(this.path.length || this.pathPending) return;
    if(time<this.scoutAt) return;
    this.scoutAt=time+.71+g.random()*.88;
    const inside=world.buildings.locate(p.x,p.y,p.z);
    if(inside) {
      if(this.searchHouse!==inside) {this.searchHouse=inside;this.rooms.clear();}
      const nearest=g.navigation.nearbyNode(inside,p);
      if(nearest>=0) this.rooms.add(nearest);
      const room=nearest>=0?inside.nodes[nearest]:null;
      const next=room?.links.find(index=>index!==inside.outside && !this.rooms.has(index) &&
        g.navigation.walkSpan(p,inside.nodes[index].position));
      if(next!==undefined) {
        this.rooms.add(next);this.setGoal(inside.nodes[next].position,inside);
        return;
      }
    }
    let home=null,cost=Infinity;
    for(const b of world.buildings.all) {
      if(!b.nodes.length || (this.visited.get(b)||0)>time || !g.storm.contains(b.x,b.z,1)) continue;
      const d=areaDistance(p,b.x,b.z);
      if(d>115 && this.weapon(null)<0 || d>138 || d>=cost) continue;
      home=b;cost=d;
    }
    if(home) {
      this.visited.set(home,time+84);
      const point=home.nodes[home.inside??home.outside].position;
      this.scanUntil=time+lerp(2.4,5.6,this.traits.patience);
      this.setGoal(point,home);
      return;
    }
    const base=stormPoint=>g.storm.contains(stormPoint.x,stormPoint.z,-2);
    let best=null,value=-Infinity;
    for(let i=0;i<9;i++) {
      const a=g.random()*TAU,r=10+g.random()*Math.min(51,zone.r*.55);
      const point=this.standAt(p.x+Math.cos(a)*r,p.z+Math.sin(a)*r,true);
      if(!point || !base(point)) continue;
      const grade=(point.y-p.y)*.47*this.traits.patience-g.random()*4-((this.lastScout?.distanceToSquared(point)||400)<64?18:0);
      if(grade>value) { best=point;value=grade; }
    }
    this.lastScout=best;
    this.setGoal(best||this.safeTarget(true));
  }
  harvestGoal(time) {
    if(this.harvestSpot && this.harvestSpot.entry.active && time<this.harvestUntil) return this.harvestSpot;
    this.harvestSpot=null;
    if(this.remote || time<this.harvestAt || this.materials.some(n=>n>=34)) return null;
    this.harvestAt=time+1.9;
    const c=this.game.world.collision,p=this.p;
    let distance=7;
    c.visit(p.x-6,p.z-6,p.x+6,p.z+6,entry=>{
      if(!entry.node || !entry.node.reward || entry.building || entry.box.max.y<p.y+1.08) return false;
      const at=entry.box.getCenter(this.lookRay);
      const d=areaDistance(p,at.x,at.z);
      if(d>distance || d<.4) return false;
      const to=this.lootRay.copy(at).sub(this.eye),length=to.length();
      const hit=c.cast(this.eye,to.multiplyScalar(1/length),length+.2,"vision");
      // Cells may repeat an entry after a nested cast. Only keep the best visible surface.
      if(hit?.entry!==entry) return false;
      this.harvestSpot={entry,point:vec(at.x,p.y+1.42,at.z)};
      distance=d;
      return false;
    });
    this.harvestUntil=time+4.3;
    return this.harvestSpot;
  }
  think() {
    const g=this.game,time=g.match.age,storm=g.storm,profile=DIFFICULTY[g.settings.values.difficulty];
    this.remote=g.headless ? !g.humans.some(h=>h.alive && areaDistance(this.p,h.p.x,h.p.z)<=158) : areaDistance(this.p,g.player.p.x,g.player.p.z)>158;
    this.thinkAt=time+lerp(this.remote?.48:.17,this.remote?.82:.28,g.random());
    const climate=g.atmosphere;
    const sight=profile.sight*(1-climate.conditions.fog*.53)*(1-climate.conditions.rain*.27)*
      (climate.daylight==="night"?.70:1)*(this.remote?.88:1);
    const seen=this.visibleEnemy=this.sense(sight);
    if(seen) this.remember(seen,time,profile);
    const memory=this.memory?.actor.alive && time-this.memory.time<lerp(2.1,5.4,this.traits.patience)?this.memory:null;
    const attacked=this.damageGuess && time-this.lastHitAt<2.9;
    const spot=seen?this.memory.p:attacked && (!memory || this.lastHitAt>memory.time)?this.damageGuess:memory?.p;
    const noise=this.hear(time);
    if(noise) this.lastNoise=noise;
    const audible=this.lastNoise && time-this.lastNoise.at<5.4?this.lastNoise:null;
    const gun=this.weapon(spot),held=this.items[gun],stats=WEAPON_STATS[held?.id];
    const zone=storm.target(),outside=!storm.contains(this.p.x,this.p.z);
    const nextDistance=areaDistance(zone,this.p.x,this.p.z)-zone.r;
    const rotate=nextDistance>4 && storm.remaining<lerp(8,30,this.traits.patience)+clamp(nextDistance*.17,0,45);
    const medicine=this.medicine();
    this.panic*=seen?.985:.89;
    this.fatigue=clamp(this.fatigue+((this.speed>4.5?.033:-.032)*(this.remote?2:1)),0,1);
    if((this.action?.type==="med" || this.action?.type==="reload") && !outside) return;
    if(outside && this.action) this.cancel();
    const {target,score}=this.chooseLoot(gun>=0,time,!seen);
    if(this.lootTarget && (this.lootTarget.taken || this.lootTarget.open || this.lootTarget.node?.destroyed)) this.lootTarget=null;
    const quiet=(!spot && !attacked),cautious=this.traits.patience+this.panic*.8;
    const utility=this.utility;utility.score=-Infinity;utility.state="scout";utility.point=null;
    this.goalScore("scout",1.25);
    if(quiet && gun>=0 && this.personality==="camper" && this.grounded && time<this.scanUntil) this.goalScore("hold",2.23);
    if(target && !seen) this.goalScore(target.corpse?"loot corpse":"loot",clamp(score,.6,6.5),target);
    if(audible && gun>=0 && quiet) {
      const advance=audible.crowded?3.2+this.traits.aggression*.96:1.65+audible.quality*this.traits.aggression;
      if(this.p.distanceToSquared(audible.p)>9) this.goalScore(audible.crowded?"third-party":"investigate",advance,audible);
    }
    if(spot && (gun>=0 || attacked)) this.goalScore("fight",seen?7.6+this.traits.confidence0:4.8+this.confidence-.32*cautious,spot);
    if(medicine && quiet) this.goalScore("heal",this.hp<45?8.1:5.35,medicine);
    if(quiet && stats && held.clip<Math.ceil(stats.mag*.49) && this.reserve[stats.ammo]>0) this.goalScore("reload",4.46);
    const resource=quiet && gun>=0 && (!target || score<2.6)?this.harvestGoal(time):null;
    if(resource) this.goalScore("harvest",2+this.traits.greed*.67,resource);
    if(rotate || outside) this.goalScore("rotate",outside?15:4.4+nextDistance*.045+(this.hp<45?1.4:0));
    if(this.surface==="water" && !spot) this.goalScore("rotate",10);
    if(this.intent!==utility.state) {
      this.intent=utility.state;
      this.commitUntil=time+lerp(.48,1.14,this.traits.patience);
      if(!["loot","loot corpse"].includes(this.intent)) this.lootTarget=null;
    }
    if(utility.state==="rotate") {
      this.brain="rotate";
      const point=this.safeTarget(!outside);
      this.setGoal(point);
      return;
    }
    if(gun>=0 && (this.slot!==gun || this.usingPick) && utility.state!=="harvest" && utility.state!=="heal") {
      this.slotTo(gun);
      this.nextShot=Math.max(this.nextShot,time+.19+(1-this.traits.skill)*.17);
    }
    if(utility.state==="fight") {
      if(seen && time<this.reactionAt) { this.brain="notice";return; }
      const from=this.enemyEye.copy(spot);from.y+=memory?.duck?1.09:1.59;
      if(this.fight(seen,spot,from,gun,time,profile)) return;
    }
    if(utility.state==="loot" || utility.state==="loot corpse") {
      this.brain=utility.state;
      this.lootTarget=utility.point;
      this.setGoal(this.lootTarget.p,this.lootTarget.building);
    } else if(utility.state==="heal") {
      this.slotTo(this.items.indexOf(medicine));
      if(this.heal(medicine)) { this.brain="heal";this.setGoal(null); }
    } else if(utility.state==="reload") {
      this.reload();if(this.action) { this.brain="reload";this.setGoal(null); }
    } else if(utility.state==="third-party" || utility.state==="investigate") {
      this.brain=utility.state;
      this.heardSpot=utility.point.p;
      this.setGoal(utility.point.p);
    } else if(utility.state==="hold") {
      this.brain="hold";this.setGoal(null);
    } else if(utility.state==="harvest") {
      this.brain="harvest";
      const point=resource.point,d=areaDistance(this.p,point.x,point.z);
      this.usingPick=true;
      if(d<2.55) this.setGoal(null);
      else {
        const at=this.lookRay.copy(this.p).sub(point).setY(0).normalize().multiplyScalar(2.11).add(point);
        at.y=g.world.collision.floor(at.x,at.z,this.p.y+.28).y;
        this.setGoal(at);
      }
    } else {
      this.brain="scout";this.scout(time);
    }
  }
  waypoint(time) {
    const {path,p}=this;
    const climbing=this.brain==="high ground";
    while (path.length && areaDistance(p,path[0].x,path[0].z)<(path.length>1?.56:climbing?.28:.97) &&
      Math.abs(path[0].y-p.y)<(climbing?.24:.49)) path.shift();
    if (!this.remote && path.length>2 && time>=this.shortcutAt && this.stall<.2 && this.brain!=="high ground") {
      this.shortcutAt=time+.24;
      for (let i=Math.min(path.length-1,3);i>0;i--) {
        if (p.distanceToSquared(path[i])<72 && this.game.navigation.walkSpan(p,path[i])) {
          path.splice(0,i);
          break;
        }
      }
    }
    return path[0]||null;
  }
  openDoor(move,time) {
    if(time<this.doorAt) return false;
    const p=this.p,c=this.game.world.collision,r=1.69;
    return c.visit(p.x-r,p.z-r,p.x+r,p.z+r,entry=>{
      const door=entry.door;
      if(!door || door.open || !door.object.visible || Math.abs(p.y+1-door.target.y)>1.14) return false;
      const to=this.lookRay.copy(door.target).sub(p).setY(0),d=to.length();
      if(d>r || to.dot(move)<-.17) return false;
      if(this.doorWait!==door) {
        this.doorWait=door;this.doorReady=time+lerp(.10,.42,this.traits.patience);
      }
      if(time<this.doorReady) return true;
      this.doorWait=null;this.doorAt=time+.45;
      door.set(true,this.game.audio);this.game.emitNoise(this,door.target,"door",19);
      return false;
    });
  }
  unstick(node,time) {
    const g=this.game,p=this.p,loot=this.lootTarget;
    this.repathAt=time+(this.remote?1.1:.57);
    this.reroutes++;
    const yaw=yawTo(p,node)+Math.PI/2*this.hand;
    let detour=null;
    for (const a of [yaw,yaw+Math.PI,yaw-.55,yaw+.55]) {
      const direction=aimVector(a).multiplyScalar(1.43);
      const point=this.standAt(p.x+direction.x,p.z+direction.z);
      if (point && g.navigation.walkSpan(p,point)) { detour=point;break; }
    }
    if(this.goal) {
      this.setGoal(this.goal,this.goalHome,true);
      if(detour) this.path=[detour];
    }
    if(this.reroutes>=5 && !loot) {
      this.setGoal(detour);
      this.scoutAt=0;this.reroutes=0;
    }
    if (this.reroutes>=3 && loot) {
      this.reject.set(loot,time+16);
      this.lootTarget=null;
      this.setGoal(detour);
      this.reroutes=0;
      this.thinkAt=time+.16;
    }
    this.stall=detour?0:.19;
  }
  steerAim(dt,desired) {
    const yaw=(desired?yawTo(this.p,desired):this.yaw)+(this.aiming?this.flare||0:0);
    const pitch=desired?Math.atan2(desired.y-this.p.y-eyeHeight(this),Math.max(.5,areaDistance(this.p,desired.x,desired.z))):0;
    const yawError=angleDiff(yaw,this.yaw),pitchError=pitch-this.pitch;
    const turn=lerp(2.48,5.0,this.traits.skill);
    this.turnRate=damp(this.turnRate,clamp(yawError*10.2,-turn,turn),12.1,dt);
    this.pitchRate=damp(this.pitchRate,clamp(pitchError*10.6,-2.5,2.5),14,dt);
    this.yaw+=this.turnRate*dt;
    this.pitch=clamp(this.pitch+this.pitchRate*dt,-1.28,1.18);
    return Math.abs(yawError)+Math.abs(pitchError)*.68;
  }
  shootingPoint(time) {
    const m=this.memory;
    const delay=this.remote?.17:.092;
    const body=this.shotAim.copy(m.p);body.y+=m.duck?.902:1.205;
    return body.addScaledVector(m.velocity,clamp(time-m.time-delay,-delay,.105)*this.traits.skill);
  }
  shoot(enemy,time,difficulty,angleError) {
    const g=this.game,held=this.held(),w=WEAPON_STATS[held?.id];
    if (!w || !held.clip || this.action || this.cooldown>0 || time<this.reactionAt || time<this.nextShot || angleError>.17) return;
    const eye=eyePosition(this), range=eye.distanceTo(this.shootingPoint(time));
    if (range>w.range || !this.canSee(enemy,eye)) return;
    const direction=aimVector(this.yaw,this.pitch);
    const head=g.random()<difficulty.head*this.traits.skill;
    const focus=lerp(1.27,.37,smooth(0,1.38,this.aimSeconds));
    const movement=(1+Math.min(this.speed,5.5)*.16)*(this.grounded?1:1.31);
    const flinch=1+.81*Math.max(this.flinch,1-smooth(0,.74,time-this.lastHitAt));
    const scale=held.id==="sniper"?.75:held.id==="shotgun"?1.12:1;
    const rhythm=.70+.38*Math.sin(time*1.9+this.phase)+.37*g.random();
    const error=Math.max(.045,range*difficulty.error*focus*movement*flinch*scale*rhythm*
      (1.38-this.traits.skill*.50+this.panic*.49+this.fatigue*.19)*lerp(.70,1.38,smooth(14,120,range)));
    const side=(g.random()+g.random()-1)*error;
    const vertical=(g.random()+g.random()-1)*error*.51;
    const right=direction.clone().cross(vec(0,1,0)).normalize();
    const shot=eye.clone().addScaledVector(direction,range).addScaledVector(right,side);
    shot.y+=head?.418+vertical*.58:clamp(vertical,-.40,.22);
    if (range<9 && held.id==="shotgun") shot.y-=.06;
    g.combat.fire(this,shot);
    this.flare=(g.random()-.5)*w.kick*(1.62-this.traits.skill);
    this.pitch=clamp(this.pitch+w.kick*(1-this.traits.skill*.72),-1.28,1.19);
    this.nextShot=time+Math.max(w.delay,difficulty.react*.48)+lerp(.035,.16,g.random());
  }
  takeNearbyLoot(time) {
    const loot=this.lootTarget,p=this.p,g=this.game;
    if(!loot || time<this.nextLoot || loot.taken || loot.open || areaDistance(p,loot.p.x,loot.p.z)>=1.66 || Math.abs(p.y-loot.p.y)>=.80) return;
    this.nextLoot=time+.17;
    this.eye.copy(p);this.eye.y+=eyeHeight(this);
    if(!this.seesLoot(loot,2.3,false)) return;
    if(this.touching!==loot) {
      this.touching=loot;this.touchAt=time+lerp(.22,.58,this.traits.patience);
      return;
    }
    if(time<this.touchAt) return;
    if(loot.item && !this.items.includes(null)) this.replacement(loot.item,this.weapon(null)>=0,true);
    if(!g.loot.take(this,loot)) this.reject.set(loot,time+28);
    this.knownLoot.delete(loot);
    this.lootTarget=null;this.touching=null;
    this.thinkAt=0;
  }
  act(dt) {
    const g=this.game,time=g.match.age,p=this.p;
    if(!this.alive || this.state==="bus") return;
    if(this.state==="dive" || this.state==="glide") {
      this.brain=this.state==="glide"?"glide":"drop";
      const dir=this.drop.land.clone().sub(p).setY(0),d=dir.length();
      if(d>1) this.steerAim(dt,this.drop.land);
      const clearance=p.y-g.world.terrain.height(p.x,p.z);
      if (this.state==="dive" && (d>125 && d>(p.y-this.drop.land.y)*.89 || d>68 && clearance<44)) this.deploy();
      dir.normalize().multiplyScalar(clamp(d/6,0,1));
      this.airborne(dt,dir.x,dir.z,d>39);
      return;
    }
    if(time>=this.thinkAt && g.thinksLeft>0) { g.thinksLeft--;this.think(); }
    this.flare=damp(this.flare||0,0,6,dt);
    const busy=this.action?.type==="med" || this.action?.type==="reload";
    const node=this.waypoint(time);
    const moving=!!node && !busy;
    const move=this.movement.set(0,0,0);
    if(moving) {
      move.copy(node).sub(p).setY(0).normalize();
      for(const other of g.actors) {
        if(other===this || other.state!=="ground" || Math.abs(p.y-other.p.y)>.66) continue;
        const dx=p.x-other.p.x,dz=p.z-other.p.z,d2=dx*dx+dz*dz;
        if(d2<1.62 && d2>.025) {
          const distance=Math.sqrt(d2),push=(1.28-distance)*.34/distance;
          move.x+=dx*push;move.z+=dz*push;
        }
      }
      if(move.lengthSq()>1) move.normalize();
    }
    const enemy=this.visibleEnemy?.alive && time-(this.memory?.time??-Infinity)<.62?this.visibleEnemy:null;
    const fighting=!!enemy && !!this.memory && ["engage","push","peek","high ground"].includes(this.brain) && !busy;
    this.aiming=fighting;
    this.crouching=busy || this.brain==="cover" && !moving || this.brain==="hold" && !moving ||
      this.brain==="peek" && moving && p.distanceToSquared(node)>1.6;
    const watching=this.brain==="hold" || this.brain==="search" || !moving && this.brain==="scout";
    const checking=this.scanning??=vec();
    const scanYaw=this.yaw+Math.sin(time*this.traits.scan+this.phase)*.9;
    checking.set(p.x-Math.sin(scanYaw)*8,p.y+1.55,p.z-Math.cos(scanYaw)*8);
    const looking=fighting?this.shootingPoint(time):
      this.brain==="notice"?this.memory?.p:this.brain==="harvest"?this.harvestSpot?.point:
      this.brain==="third-party" || this.brain==="investigate"?this.heardSpot:watching?checking:node;
    const angleError=this.steerAim(dt,looking);
    const track=fighting && angleError<.13 && time>=this.reactionAt;
    this.aimSeconds=clamp(this.aimSeconds+(track?dt:-dt*1.85),0,1.65);

    const waiting=moving && this.openDoor(move,time);
    const stealth=this.brain==="investigate" || this.brain==="third-party" || this.brain==="search";
    const speed=this.crouching?1.69:this.brain==="push"?3.9:fighting?2.42:
      this.brain==="rotate"||this.brain==="retreat"?5.34:stealth?2.89:4.17;
    let jump=false;
    if (!this.remote && this.grounded && time>=this.nextHop && fighting && this.brain!=="peek" &&
      areaDistance(p,enemy.p.x,enemy.p.z)<11.4 && p.y<enemy.p.y+1.4) {
      this.nextHop=time+lerp(1.15,2.6,g.random());
      jump=g.random()<.24*this.style.push;
    }
    if(moving && !waiting && this.stall>.31 && this.grounded && time>=this.nextHop && node.y>p.y+.30 && node.y<p.y+.82) {
      this.nextHop=time+1.3;jump=true;
    }
    if(!fighting && this.grounded && time>=this.quirkAt && this.brain==="scout") {
      this.quirkAt=time+9+g.random()*32;
      if(this.traits.aggression>.96 && !this.remote) jump=g.random()<.35;
      this.pauseWalkUntil=time+.24+this.traits.patience*.33;
    }
    const before=moving?areaDistance(p,node.x,node.z):0;
    const pause=waiting || (!fighting && time<(this.pauseWalkUntil||0));
    const wobble=(fighting?.15:.12)*Math.sin(time*4.7+this.phase)*smooth(1.2,5,before);
    const speedFactor=clamp(before*3.3,.28,1)*(pause?0:1);
    this.walk(dt,(move.x-move.z*wobble)*speed*speedFactor,(move.z+move.x*wobble)*speed*speedFactor,jump);
    if(moving && !pause && before>.45 && before-areaDistance(p,node.x,node.z)<dt*.23) {
      this.stall+=dt;
      if (this.stall>(this.remote?.84:.43) && time>=this.repathAt) this.unstick(node,time);
    } else {
      this.stall=Math.max(0,this.stall-dt*3.7);
      if (moving && this.speed>1.15 && this.stall===0) this.reroutes=0;
    }
    this.takeNearbyLoot(time);
    if(this.brain==="harvest" && !moving && this.harvestSpot?.entry.active && angleError<.29) g.combat.fire(this);
    if(fighting) { this.eye.copy(p);this.eye.y+=eyeHeight(this);this.shoot(enemy,time,DIFFICULTY[g.settings.values.difficulty],angleError); }
  }
}
class Input {
  constructor(game) {
    this.game=game;
    this.keys=new Set();
    this.pressed=new Set();
    this.pulses=new Set();
    this.locked=false;
    this.waiting=false;
    this.lockAttempt=null;
    this.rawUnsupported=false;
    this.resetWheel();
    const c=$("world");
    document.addEventListener("keydown",event=>this.press(event.code,event,false),true);
    document.addEventListener("keyup",event=>this.keys.delete(event.code),true);
    // Mouse events report each button change during an aim-and-fire chord.
    document.addEventListener("mousedown",event=>this.press("Mouse"+event.button,event,true),true);
    document.addEventListener("mouseup",event=>{
      this.keys.delete("Mouse"+event.button);
      if (event.button>=3 && (this.locked || game.modal==="settings")) event.preventDefault();
    },true);
    document.addEventListener("pointerup",event=>{
      if (event.button>=3 && (this.locked || game.modal==="settings")) event.preventDefault();
    },true);
    document.addEventListener("wheel",event=>this.wheel(event),{capture:true,passive:false});
    for (const type of ["contextmenu","auxclick"]) {
      document.addEventListener(type,event=>{
        if (this.locked || game.settings.listen || event.target===c || game.modal==="settings") event.preventDefault();
      },true);
    }
    document.addEventListener("mousemove",event=>{
      if(this.locked && !game.modal && game.player && game.state!=="spectate" && game.state!=="result") {
        if(game.debug?.flying) game.debug.look(event.movementX,event.movementY);
        else if(game.player.state==="bus") {
          game.player.look(event.movementX,event.movementY);
        } else game.player.look(event.movementX,event.movementY);
      }
    });
    document.addEventListener("pointerlockchange",()=>{
      this.waiting=false;
      this.lockAttempt=null;
      this.locked=document.pointerLockElement===c;
      this.clear();
      if (this.locked && (!game.isLive() || game.modal)) {
        document.exitPointerLock();
        return;
      }
      if(!this.locked && game.isLive() && !game.modal) game.openModal("pause");
      if(this.locked) show("lockHint",false);
    });
    document.addEventListener("pointerlockerror",()=>{
      const attempt=this.lockAttempt;
      if (attempt && !attempt.promise) this.rejectLock(attempt);
    });
    window.addEventListener("blur",()=>this.clear());
  }
  resetWheel() {
    this.wheelStep=0;
    this.wheelAmount=0;
    this.wheelDirection=0;
    this.wheelAt=-Infinity;
    this.wheelReadyAt=0;
    this.wheelGestureConsumed=false;
  }
  wheel(event) {
    const {settings}=this.game;
    if (!this.locked && !settings.listen) return;
    event.preventDefault();
    if (event.ctrlKey) return;
    // Read the unit first because browser/device combinations report different units.
    const mode=event.deltaMode;
    const delta=event.deltaY*(mode===1?18:mode===2?320:1);
    if (!delta) return;
    const direction=Math.sign(delta),code=direction>0?"WheelDown":"WheelUp";
    if (settings.listen) {
      this.press(code,event,true);
      return;
    }
    if (this.game.modal || !this.game.isLive()) return;
    const isBound=Object.values(settings.keys).includes(code);
    if (!isBound && (!settings.values.wheelSwitch || this.game.player?.state!=="ground")) return;
    const now=performance.now(),fine=mode===0 && Math.abs(delta)<60;
    if (now-this.wheelAt>135 || direction!==this.wheelDirection) {
      this.wheelAmount=0;
      this.wheelGestureConsumed=false;
    }
    this.wheelAt=now;
    this.wheelDirection=direction;
    if (now<this.wheelReadyAt || fine && this.wheelGestureConsumed) return;
    this.wheelAmount+=delta;
    if (Math.abs(this.wheelAmount)<50) return;
    this.wheelReadyAt=now+100;
    this.wheelAmount=0;
    this.wheelGestureConsumed=fine;
    if (isBound) {
      this.press(code,event,true);
      if (this.keys.has(code)) this.pulses.add(code);
    } else this.wheelStep=direction*(settings.values.invertWheel?-1:1);
  }
  takeWheelStep() {
    const step=this.wheelStep;
    this.wheelStep=0;
    return step;
  }
  finishStep() {
    for (const code of this.pulses) this.keys.delete(code);
    this.pulses.clear();
    this.pressed.clear();
  }
  lock() {
    if(this.locked || this.waiting || !this.game.isLive()) return;
    this.waiting=true;
    this.requestLock(!this.rawUnsupported);
  }
  requestLock(raw) {
    const canvas=$("world"),attempt={raw,promise:false};
    this.lockAttempt=attempt;
    try {
      const pending=raw?canvas.requestPointerLock({unadjustedMovement:true}):canvas.requestPointerLock();
      attempt.promise=typeof pending?.catch==="function";
      if(attempt.promise) pending.catch(error=>this.rejectLock(attempt,error));
    } catch (error) { this.rejectLock(attempt,error); }
  }
  rejectLock(attempt,error) {
    if (attempt!==this.lockAttempt || !this.waiting) return;
    if (attempt.raw) {
      // A device that rejected raw input should not need two requests per match.
      if (!error || error.name==="NotSupportedError" || error.name==="TypeError") this.rawUnsupported=true;
      this.requestLock(false);
      return;
    }
    this.waiting=false;
    this.lockAttempt=null;
    if(this.game.isLive() && !this.game.modal) this.game.openModal("pause");
    if(this.game.modal==="pause") show("lockHint",true);
  }
  release() {
    this.waiting=false;
    this.lockAttempt=null;
    if(document.pointerLockElement===$("world")) document.exitPointerLock();
    this.clear();
  }
  clear() {
    this.keys.clear();
    this.finishStep();
    this.resetWheel();
  }
  down(action) { return this.keys.has(this.game.settings.keys[action]); }
  just(action) { return this.pressed.has(this.game.settings.keys[action]); }
  press(code,event,mouse) {
    const game=this.game,settings=game.settings;
    if(!mouse && !event.repeat && code==="F3" && !settings.listen) {
      event.preventDefault();if(!game.online.active) game.debug.toggle();return;
    }
    if(settings.listen) {
      if(!mouse && code==="F3") {event.preventDefault();settings.syncBindings("F3 is reserved for the world inspector.");return;}
      if(!mouse && code==="Escape") {
        event.preventDefault();settings.listen="";settings.syncBindings("Binding canceled.");return;
      }
      const action=settings.listen;
      if(mouse && settings.bindings[action].contains(event.target) && event.button===0) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      settings.listen="";
      const conflict=settings.rebind(action,code);
      settings.syncBindings(conflict?"Swapped with "+KEYS[conflict][0]+".":"Binding saved.");
      game.ui.relabel();
      return;
    }
    if(!mouse && !event.repeat && game.modal) {
      game.ui.focusCycle(event);
      const editing=event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement;
      const isClose=code==="Escape" || !editing && code===settings.keys.pause && code!=="Tab";
      if(isClose || game.modal==="map" && code===settings.keys.map || game.modal==="inventory" && code===settings.keys.inventory) {
        event.preventDefault();
        game.closeModal();
      }
      return;
    }
    if(!this.locked || game.modal || !game.isLive()) return;
    event.preventDefault();
    if(event.repeat || this.keys.has(code)) return;
    if(code===settings.keys.pause) { game.openModal("pause");return; }
    if(code===settings.keys.map) { game.openModal("map");return; }
    if(code===settings.keys.inventory && game.player?.state==="ground") { game.openModal("inventory");return; }
    this.keys.add(code);
    this.pressed.add(code);
  }
}

class UI {
  constructor(game) {
    this.game=game;
    this.parentPanel="";
    this.inventoryFrom=-1;this.dragSlot=-1;
    this.cueUntil=0;this.cueDistance=Infinity;
    this.projection=vec();
    this.ammoReserve=document.createElement("small");
    this.ammoCount=document.createTextNode("");
    this.materialValues=MATERIALS.map(name=>{
      const row=document.createElement("span"),value=document.createElement("b");
      row.append(name+" ",value);$("materials").append(row);return value;
    });
    this.feed=[];
    this.floats=[];
    this.decay=0;
    this.hitTime=0;
    this.miniAt=0;
    this.clock=0;
    this.hudAt=0;
    this.hot=this.makeSlots($("hotbar"),5);
    this.construction=this.makeSlots($("buildSlots"),4);
    this.inventory=this.makeSlots($("inventorySlots"),5,true);
    this.rarityColors=RARITY_COLORS;
    const settings=game.settings;
    settings.makeMenu(id=>game.settingChanged(id));
    const action=(id,callback)=>{ $(id).onclick=()=>{ game.audio.open(); game.audio.event("click");callback(); }; };
    action("play",()=>{this.parentPanel="";game.openModal("setup");});
    action("beginMatch",()=>game.start());
    action("again",()=>game.online.active?game.online.again():game.start());
    action("exit",()=>game.menu());
    action("resultBack",()=>game.menu());
    action("resume",()=>game.resume());
    action("closeMap",()=>game.resume());
    action("closeInventory",()=>game.resume());
    action("inventoryDrop",()=>{ game.dropSelected();this.renderInventory(); });
    const open=(name,parent="")=>{this.parentPanel=parent;game.openModal(name);};
    action("menuSettings",()=>open("settings"));action("pauseSettings",()=>open("settings","pause"));
    action("menuControls",()=>open("controls"));action("pauseControls",()=>open("controls","pause"));
    action("menuHelp",()=>open("help"));action("menuCredits",()=>open("credits"));
    for(const id of ["settingsBack","controlsBack","helpBack","creditsBack","setupBack"]) action(id,()=>game.closeModal());
    action("editBindings",()=>{open("settings",this.parentPanel);settings.tab("controls");settings.tabs.controls.focus();});
    action("inventoryMove",()=>{
      this.inventoryFrom=this.inventoryFrom<0?this.game.player.slot:-1;
      $("itemMoveHint").textContent=this.inventoryFrom<0?"":"Choose a destination slot.";
      this.renderInventory();
    });
    action("replay",()=>{this.replayAt=performance.now();this.replayFrame();});
    this.mapControls();
    this.lastResult();
    this.skin();
    document.addEventListener("pointerover",event=>{ if(event.target instanceof HTMLButtonElement && !event.target.disabled) game.audio.event("hover"); });
    document.addEventListener("click",()=>game.audio.open(),true);
    this.relabel();
  }
  setup() {
    const settings=this.game.settings,root=$("matchOptions");
    root.replaceChildren();
    const descriptions={
      bots:{0:"Use the current graphics preset’s bot count.",6:"A quieter island with more time to explore.",12:"More space between fights.",18:"Busy towns and a balanced island.",24:"The largest field and more contested drops."},
      difficulty:{easy:"More time to react and more missed shots.",normal:"Varied opponents that use cover and rotate.",hard:"Sharper aim and faster decisions."},
      daylight:{random:"Choose a different light profile each match.",dawn:"Warm low sun with long shadows.",noon:"Clear, high-visibility daylight.",afternoon:"Late light on the west side of the island.",sunset:"Low orange light and deeper shade.",overcast:"A soft gray sky and even lighting.",night:"Moonlight and warm lamps around buildings."},
      weather:{random:"Choose one of the four weather profiles.",clear:"Open sightlines across the island.",rain:"Wet roads, softer footsteps and lower visibility.",fog:"Shorter sightlines from ground level.",thunder:"Heavy rain, lightning and muffled distant sound."},
      dropMode:{bus:"Choose when to jump from the bus.",glide:"Start in a glider above the center of the island.",ground:"Start on foot at a different named location."}
    };
    for(const id of ["bots","difficulty","daylight","weather","dropMode"]) {
      const [,title,options]=OPTIONS.gameplay.find(option=>option[0]===id);
      const row=document.createElement("label"),label=document.createElement("span"),select=document.createElement("select"),detail=document.createElement("small");
      row.className="setup-choice";label.textContent=title;select.id="match-"+id;
      for(const option of options) { const [value,text]=option.split("|");select.add(new Option(text,value)); }
      select.value=settings.values[id];
      const sync=()=>{detail.textContent=descriptions[id][select.value];};
      select.onchange=()=>{settings.change(id,select.value);sync();};
      sync();row.append(label,select,detail);root.append(row);
    }
  }
  controls() {
    const root=$("quickControls"),settings=this.game.settings;
    root.replaceChildren();
    for(const [id,[label]] of Object.entries(KEYS)) {
      const row=document.createElement("div"),kbd=document.createElement("kbd");
      kbd.textContent=settings.key(id);row.append(label,kbd);root.append(row);
    }
  }
  skin() {
    const s=this.game.settings.values;
    document.body.dataset.palette=s.palette;
    document.body.classList.toggle("reducedMotion",s.reducedMotion);
    document.body.classList.toggle("highContrast",s.contrast);
    document.body.classList.toggle("largeText",s.largeText);
    $("hud").style.setProperty("--hud-scale",s.hudScale/100);
    this.rarityColors=s.palette==="tritan"?["#d1d1d1","#68d4c4","#ead570","#f494ab","#f7b473"]:
      s.palette==="deutan"?["#ced1d5","#8cd0f5","#b5c7fc","#f0a8dd","#ffc787"]:RARITY_COLORS;
    for(const slots of [this.hot,this.construction,this.inventory]) for(const slot of slots) slot.drawn="";
    show("hud",s.showHud && !!this.game.match && this.game.state!=="result" && !this.game.debug?.flying);
  }
  focusCycle(event) {
    if(event.key!=="Tab" || !this.game.modal || this.game.settings.listen) return;
    const panel=$(this.game.modal+"Panel");
    const list=[...panel.querySelectorAll("button,input,select,canvas[tabindex]")].filter(el=>!el.disabled && el.tabIndex>=0 && el.offsetParent);
    if(!list.length) return;
    const at=list.indexOf(document.activeElement);
    if(at<0 || (event.shiftKey?at===0:at===list.length-1)) {
      event.preventDefault();list[event.shiftKey?list.length-1:0].focus();
    }
  }
  gamepad() {
    const now=performance.now();
    if(now<(this.padAt||0) || this.game.isLive() && !this.game.modal) return;
    this.padAt=now+120;
    let pad;
    try { pad=[...navigator.getGamepads()].find(Boolean); } catch { return; }
    if(!pad) return;
    const axis=pad.axes[1]||0,vertical=pad.buttons[12]?.pressed?-1:pad.buttons[13]?.pressed?1:Math.abs(axis)>.55?Math.sign(axis):0;
    const buttons=pad.buttons[0]?.pressed?1:pad.buttons[1]?.pressed?2:0;
    const root=this.game.modal?$(this.game.modal+"Panel"):$("menu");
    const options=[...root.querySelectorAll("button:not(:disabled),select,input")].filter(el=>el.offsetParent && el.tabIndex>=0);
    if(vertical && options.length) {
      const at=options.indexOf(document.activeElement);
      options[(Math.max(0,at)+vertical+options.length)%options.length].focus();
      this.padAt=now+185;
    }
    if(buttons!==this.padButtons) {
      if(buttons===1 && document.activeElement instanceof HTMLButtonElement) document.activeElement.click();
      if(buttons===2 && this.game.modal) this.game.closeModal();
      this.padButtons=buttons;
    }
  }
  moveInventory(from,to) {
    const p=this.game.player;
    if(!p || !p.items[from] || from<0 || from>=5 || to<0 || to>=5) return;
    if(this.game.online.active) { this.game.online.send({t:"inventory",from,to});this.inventoryFrom=this.dragSlot=-1;return; }
    [p.items[from],p.items[to]]=[p.items[to],p.items[from]];
    p.slotTo(to);p.inBuild=false;
    this.inventoryFrom=-1;this.dragSlot=-1;
    $("itemMoveHint").textContent="Moved to slot "+(to+1)+".";
    this.renderInventory();
  }
  mapControls() {
    const canvas=$("bigMap");
    this.mapCursor={x:0,z:0};
    const ping=()=>{
      this.game.match.ping={...this.mapCursor};
      $("mapHint").textContent="Ping near "+nearestPlace(this.mapCursor.x,this.mapCursor.z).name;
      this.map(canvas,true);
      this.miniAt=0;
    };
    canvas.onclick=event=>{
      const rect=canvas.getBoundingClientRect();
      this.mapCursor.x=clamp(((event.clientX-rect.left)/rect.width-.5)*1024,-HALF,HALF);
      this.mapCursor.z=clamp(((event.clientY-rect.top)/rect.height-.5)*1024,-HALF,HALF);
      ping();
    };
    canvas.onkeydown=event=>{
      const movement={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[event.key];
      if(movement) {
        event.preventDefault();
        this.mapCursor.x=clamp(this.mapCursor.x+movement[0]*13,-HALF,HALF);
        this.mapCursor.z=clamp(this.mapCursor.z+movement[1]*13,-HALF,HALF);
        this.map(canvas,true);
      } else if(event.key==="Enter" || event.key===" ") { event.preventDefault();ping(); }
    };
    canvas.onfocus=()=>{if(this.game.match) this.map(canvas,true);};
    canvas.onblur=()=>{if(this.game.match) this.map(canvas,true);};
    $("clearPing").onclick=()=>{this.game.match.ping=null;$("mapHint").textContent="Ping cleared";this.map(canvas,true);this.miniAt=0;};
  }
  soundCue(actor,point,kind,radius) {
    const g=this.game,p=g.player;
    if(!g.settings.values.soundCues || !p || !p.alive || actor===p || p.state!=="ground" || g.modal) return;
    const range=Math.min(radius,kind==="shot"?97:kind==="foot"?21:27);
    const distance=areaDistance(p.p,point.x,point.z);
    if(distance>range || distance>this.cueDistance*.83 && this.clock<this.cueUntil-.54) return;
    const degree=(p.yaw-yawTo(p.p,point))*180/Math.PI;
    const index=Math.round(degree/45),direction=["ahead","front right","right","back right","behind","back left","left","front left"][(index%8+8)%8];
    const labels={shot:"Gunfire",foot:"Footsteps",door:"Door opened",reload:"Reload",build:"Building",glider:"Glider",chest:"Chest opened",bus:"Bus engine",ammo:"Ammo box"};
    if(!labels[kind]) return;
    this.cueUntil=this.clock+1.18;this.cueDistance=distance;
    $("soundCue").textContent=labels[kind]+" · "+direction;
    show("soundCue",true);
  }
  compare(target,held) {
    const item=target?.item;
    if(item?.kind!=="gun") return "";
    const weapon=WEAPON_STATS[item.id];
    if(held?.kind!=="gun") return item.clip+" rounds loaded · "+weapon.ammo+" ammo";
    if(held.id!==item.id) return "Equipped  "+itemName(held)+"  ·  "+RARITIES[held.tier];
    const strength=Math.round(((1+item.tier*.077)/(1+held.tier*.077)-1)*100);
    return strength?`${strength>0?"+":""}${strength}% base damage compared with your ${weapon.name.toLowerCase()}`:"Same rarity as your "+weapon.name.toLowerCase();
  }
  lastResult() {
    let item;
    try { item=JSON.parse(localStorage.getItem("grayline.lastMatch.v1")||"null"); } catch {}
    const valid=Number.isInteger(item?.rank) && item.rank>0 && Number.isFinite(item.age) && Number.isFinite(item.kills);
    show("lastMatch",valid);
    if(valid) {
      $("lastPlacement").textContent=item.rank===1?"Victory":placement(item.rank)+" place";
      $("lastDetails").textContent=item.kills+" elims · "+timeText(item.age);
    }
  }
  replayFrame() {
    if(!this.replayFrames?.length || this.game.modal!=="result") return;
    const canvas=$("replayCanvas"),ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height;
    const frames=this.replayFrames,first=frames[0],last=frames.at(-1);
    const age=this.replayAt?Math.min(last.t,first.t+(performance.now()-this.replayAt)/1000):last.t;
    const index=Math.max(0,frames.findIndex(frame=>frame.t>=age));
    const x=last.p[0],z=last.p[1],radius=Math.max(36,last.k?Math.hypot(x-last.k[0],z-last.k[1])*.77:36);
    const scale=h/(radius*2),startX=x-w/2/scale,startZ=z-h/2/scale;
    ctx.fillStyle="#243b37";ctx.fillRect(0,0,w,h);
    const texture=this.game.world.map,map=texture.width/1024;
    ctx.drawImage(texture,(HALF+startX)*map,(HALF+startZ)*map,w/scale*map,h/scale*map,0,0,w,h);
    const draw=(key,color)=>{
      ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;
      ctx.beginPath();let moved=false;
      for(let i=0;i<=index;i++) {
        const p=frames[i][key];if(!p) continue;
        const x=(p[0]-startX)*scale,y=(p[1]-startZ)*scale;
        if(moved)ctx.lineTo(x,y);else {ctx.moveTo(x,y);moved=true;}
      }
      ctx.stroke();
      const p=frames[index]?.[key];
      if(p) {ctx.beginPath();ctx.arc((p[0]-startX)*scale,(p[1]-startZ)*scale,5,0,TAU);ctx.fill();}
    };
    draw("p","#ffe0a2");draw("k","#f39f9c");
    ctx.fillStyle="#13221fe9";ctx.fillRect(0,0,w,25);
    ctx.font="12px monospace";ctx.fillStyle="#ffe0a2";ctx.fillText("YOU",10,17);ctx.fillStyle="#f39f9c";ctx.fillText(this.replayKiller,64,17);
    ctx.fillStyle="#e8eada";ctx.textAlign="right";ctx.fillText((age-first.t).toFixed(1)+" / "+(last.t-first.t).toFixed(1)+" s",w-10,17);ctx.textAlign="left";
    if(age===last.t) this.replayAt=0;
  }
  makeSlots(parent,n,buttons=false) {
    return Array.from({length:n},(_,i)=>{
      const el=document.createElement(buttons?"button":"div");
      el.className="slot";
      const kbd=document.createElement("kbd"),label=document.createElement("b"),icon=canvas2D(78,34),count=document.createElement("em");
      el.append(kbd,icon,label,count);
      if(buttons) {
        el.onclick=()=>{
          if(this.inventoryFrom>=0) { this.moveInventory(this.inventoryFrom,i);return; }
          if(this.game.online.active) this.game.online.send({t:"equip",slot:i});
          else { this.game.player.slotTo(i);this.game.player.inBuild=false;this.renderInventory(); }
        };
        el.ondragstart=event=>{this.dragSlot=i;event.dataTransfer.setData("text/plain",String(i));event.dataTransfer.effectAllowed="move";};
        el.ondragover=event=>{if(this.dragSlot>=0) {event.preventDefault();event.dataTransfer.dropEffect="move";}};
        el.ondrop=event=>{if(this.dragSlot>=0) {event.preventDefault();this.moveInventory(this.dragSlot,i);}};
        el.ondragend=()=>{this.dragSlot=-1;};
      }
      parent.append(el);
      return {el,kbd,label,icon,count,drawn:""};
    });
  }
  relabel() {
    const settings=this.game.settings;
    for (const slots of [this.hot,this.construction,this.inventory]) slots.forEach((slot,i)=>{
      const action="slot"+(i+1),code=settings.keys[action],label=settings.key(action);
      slot.kbd.textContent=code==="WheelUp"?"W↑":code==="WheelDown"?"W↓":label;
      slot.kbd.title=label;
    });
    $("menuMode").textContent="First-person · Highwater";
  }
  panel(name) {
    const menu=$("menu");
    if(name && menu.contains(document.activeElement)) this.restoreFocus=document.activeElement;
    show("modal",!!name);menu.inert=!!name;
    for(const panel of ["setup","online","pause","settings","controls","help","credits","map","inventory","result","debug"]) show(panel+"Panel",panel===name);
    if(name==="setup") this.setup();
    if(name==="controls") this.controls();
    if(name==="map" && this.game.match) {
      const p=this.game.player.p;
      this.mapCursor.x=p.x;this.mapCursor.z=p.z;
      $("mapHint").textContent="Click the map or use arrow keys and Enter.";
      this.map($("bigMap"),true);
    }
    if(name==="inventory") {
      this.inventoryFrom=-1;$("itemMoveHint").textContent="Drag a slot or use Move selected.";
      this.renderInventory();
    }
    if(name!=="settings") {
      const settings=this.game.settings;settings.listen="";settings.finishPreview(false);
    }
    if(name) $(name+"Panel").querySelector(".primary, input[type=search], button, canvas[tabindex]")?.focus({preventScroll:true});
    else if(this.game.state==="menu") (this.restoreFocus || $("play")).focus({preventScroll:true});
  }
  reset() {
    this.feed.length=this.floats.length=0;
    $("feed").replaceChildren();
    $("damageText").replaceChildren();
    this.decay=this.hitTime=this.clock=this.hudAt=this.miniAt=this.cueUntil=0;
    this.cueDistance=Infinity;
    this.replayAt=0;
    show("soundCue",false);show("lowHealth",false);
    show("message",false);
    show("direction",false);
    show("progress",false);
  }
  slot(slot,item,selected,buildType=-1) {
    const key=item?(item.kind+"/"+item.id+"/"+item.tier+"/"+(item.count||0)):"empty/"+buildType;
    slot.el.classList.toggle("selected",selected);
    if(slot.drawn===key) return;
    slot.drawn=key;
    const tier=item?item.tier:0,color=this.rarityColors[tier];
    slot.el.style.setProperty("--rarity",item?color:buildType>=0?"#77b3cc":"#4b5850");
    slot.label.textContent=item?itemName(item):buildType>=0?BUILD_NAMES[buildType]:"";
    slot.count.textContent=item?.count>1?String(item.count):"";
    const ctx=slot.icon.getContext("2d");
    ctx.clearRect(0,0,78,34);
    ctx.fillStyle=item?color:"#accbcd";
    ctx.strokeStyle=ctx.fillStyle;
    ctx.lineJoin="round";
    ctx.lineCap="round";
    const line=(points,width=2)=>{
      ctx.lineWidth=width;
      ctx.beginPath();
      points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
      ctx.stroke();
    };
    if (buildType>=0) {
      const forms=[
        [[22,27],[22,6],[57,6],[57,27],[22,27],[22,13],[57,13],[57,20],[22,20]],
        [[17,24],[37,12],[65,18],[45,29],[17,24],[49,16]],
        [[18,27],[26,27],[26,22],[35,22],[35,17],[44,17],[44,12],[53,12],[53,7],[61,7],[61,27],[18,27]],
        [[17,25],[40,6],[65,22],[43,30],[17,25],[40,6],[43,30]]
      ];
      line(forms[buildType],2.25);
    }
    if(!item) return;
    if(item.kind==="gun") {
      const long=item.id==="sniper" || item.id==="shotgun";
      const pistol=item.id==="pistol";
      const end=pistol?51:long?70:65;
      ctx.fillRect(pistol?18:9,12,pistol?32:49,7);
      ctx.fillRect(36,13,end-36,4);
      ctx.fillRect(end-3,11,7,4);
      line([[23,17],[23,22],[19,28]],6);
      if(!pistol) {
        line([[10,16],[7,16],[7,23],[15,21]],3);
        line([[35,18],[38,item.id==="smg"||item.id==="rifle"?29:23]],5);
      }
      if(item.id==="sniper") {
        ctx.fillRect(32,5,20,5);
        ctx.fillRect(29,4,6,7);
        ctx.fillRect(50,4,6,7);
      } else {
        ctx.fillRect(42,9,4,4);
      }
    } else if(item.id==="bandage") {
      ctx.lineWidth=5;
      ctx.beginPath();
      ctx.roundRect(24,10,28,14,5);
      ctx.stroke();
      ctx.fillRect(33,9,8,17);
    } else if(item.id==="medkit") {
      ctx.fillRect(21,7,35,21);
      ctx.fillStyle="#323c30";
      ctx.fillRect(35,11,6,13);
      ctx.fillRect(31,15,14,5);
    } else {
      const big=item.id==="big";
      ctx.beginPath();
      ctx.roundRect(big?28:32,big?10:13,big?22:15,big?20:15,4);
      ctx.fill();
      ctx.fillRect(34,6,10,7);
    }
  }
  renderInventory() {
    const p=this.game.player;
    if(!p) return;
    this.inventory.forEach((slot,i)=>{
      this.slot(slot,p.items[i],p.slot===i&&!p.usingPick);
      slot.el.draggable=!!p.items[i];
      slot.el.classList.toggle("moving",this.inventoryFrom===i);
      slot.el.setAttribute("aria-label","Slot "+(i+1)+" · "+(p.items[i]?itemName(p.items[i]):"Empty"));
    });
    $("reserves").textContent=Object.entries(p.reserve).map(([kind,count])=>kind+" "+count).join("  ·  ");
    $("inventoryDrop").disabled=p.usingPick || !p.items[p.slot];
    $("inventoryMove").disabled=$("inventoryDrop").disabled;
  }
  notice(message,seconds=1.5) {
    $("message").textContent=message;
    show("message",true);
    this.decay=this.clock+seconds;
  }
  eliminate(text,mine=false) {
    const el=document.createElement("div");
    el.className="feedRow"+(mine?" mine":"");
    el.textContent=text;
    $("feed").prepend(el);
    this.feed.unshift({el,expires:this.clock+6.5});
    while(this.feed.length>5) this.feed.pop().el.remove();
  }
  hit(point,value,shield,head) {
    this.hitTime=this.clock+.17;
    if(!this.game.settings.values.numbers || this.floats.length>=22) return;
    const el=document.createElement("span");
    el.className="float "+(shield?"armor":head?"head":"");
    el.textContent=Math.ceil(value);
    $("damageText").append(el);
    this.floats.push({el,point:point.clone().add(vec((Math.random()-.5)*.32,.24,0)),expires:this.clock+.70});
  }
  objective(title,help="") {
    show("objective",!!title);
    $("objectiveTitle").textContent=title;
    $("objectiveHelp").textContent=help;
  }
  compass(yaw) {
    const c=$("compass"),ctx=c.getContext("2d"),w=c.width,h=c.height;
    ctx.clearRect(0,0,w,h);
    const deg=(((-yaw*180/Math.PI)%360)+360)%360;
    const directions=["N","NE","E","SE","S","SW","W","NW"];
    ctx.textAlign="center";
    for(let i=Math.floor(deg/15)-4;i<Math.floor(deg/15)+6;i++) {
      const direction=i*15,x=w*.5+(direction-deg)*5.46,primary=i%3===0;
      ctx.fillStyle=primary?"#f4f4ea":"#c2c8b9";
      ctx.font=primary?"750 19px system-ui":"650 13px monospace";
      ctx.fillText(primary?directions[((i/3)%8+8)%8]:String((direction%360+360)%360),x,25);
      ctx.fillRect(x-1,32,2,primary?13:7);
    }
    ctx.fillStyle="#edbd83";
    ctx.beginPath();
    ctx.moveTo(w/2-6,49);ctx.lineTo(w/2+6,49);ctx.lineTo(w/2,41);ctx.fill();
  }
  map(canvas,big) {
    const ctx=canvas.getContext("2d"),size=canvas.width,game=this.game,s=game.storm,player=game.player,match=game.match;
    const p=a=>(a/1024+.5)*size;
    ctx.clearRect(0,0,size,size);
    ctx.drawImage(game.world.map,0,0,size,size);
    ctx.strokeStyle="#f5f2d21c";
    ctx.lineWidth=1;
    for(let i=1;i<8;i++) {
      const d=i/8*size;
      ctx.beginPath();ctx.moveTo(d,0);ctx.lineTo(d,size);ctx.moveTo(0,d);ctx.lineTo(size,d);ctx.stroke();
    }
    if(s) {
      ctx.save();
      ctx.fillStyle="#331f6669";
      ctx.beginPath();
      ctx.rect(0,0,size,size);
      ctx.moveTo(p(s.x)+s.r/1024*size,p(s.z));
      ctx.arc(p(s.x),p(s.z),s.r/1024*size,0,TAU,true);
      ctx.fill("evenodd");
      const next=s.target();
      const circle=(zone,color,dash)=>{
        ctx.setLineDash(dash);
        ctx.strokeStyle=color;
        ctx.lineWidth=big?2:1.4;
        ctx.beginPath();ctx.arc(p(zone.x),p(zone.z),Math.max(.85,zone.r/1024*size),0,TAU);ctx.stroke();
      };
      if(!s.closed) circle(next,game.settings.values.palette==="tritan"?"#ffadae":"#d0b7ff",big?[7,5]:[3,3]);
      circle(s,"#f8faed",[]);
      ctx.restore();
    }
    if(match && (player.state==="bus" || big)) {
      ctx.save();
      ctx.setLineDash(big?[8,5]:[4,3]);
      ctx.strokeStyle="#e8b57d";
      ctx.lineWidth=big?2.35:1.7;
      ctx.beginPath();
      ctx.moveTo(p(match.start.x),p(match.start.z));
      ctx.lineTo(p(match.end.x),p(match.end.z));
      ctx.stroke();
      ctx.restore();
    }
    ctx.font=big?"700 15px system-ui":"700 9.6px system-ui";
    ctx.textAlign="center";
    for(const place of PLACES) {
      const x=p(place.x),z=p(place.z);
      ctx.fillStyle="#e2dbba";
      ctx.fillRect(x-1.4,z-1.4,2.8,2.8);
      ctx.lineWidth=big?3.4:2.8;
      ctx.strokeStyle="#172115";
      const text=big?place.name:place.short;
      ctx.strokeText(text,x,z-(big?8:4));
      ctx.fillText(text,x,z-(big?8:4));
    }
    if(match?.ping) {
      const x=p(match.ping.x),y=p(match.ping.z),radius=big?7:4;
      ctx.strokeStyle="#292710";ctx.fillStyle="#ffe09e";ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(x,y-radius);ctx.lineTo(x+radius,y);ctx.lineTo(x,y+radius);ctx.lineTo(x-radius,y);ctx.closePath();ctx.fill();ctx.stroke();
    }
    if(big && document.activeElement===canvas) {
      const x=p(this.mapCursor.x),y=p(this.mapCursor.z);
      ctx.strokeStyle="#f5cd8e";ctx.lineWidth=1.5;ctx.strokeRect(x-5,y-5,10,10);
    }
    const pos=player.state==="bus"?match.bus.position:player.p, direction=player.state==="bus"?match.direction:aimVector(player.yaw);
    const x=clamp(p(pos.x),4,size-4),z=clamp(p(pos.z),4,size-4);
    ctx.save();
    ctx.translate(x,z);
    ctx.rotate(Math.atan2(direction.x,-direction.z));
    const scale=big?1.25:.9;
    ctx.scale(scale,scale);
    ctx.fillStyle="#ffdaa1";
    ctx.strokeStyle="#352c21";
    ctx.lineWidth=1.1;
    ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(6,6);ctx.lineTo(0,3);ctx.lineTo(-6,6);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.restore();
  }
  tick(dt) {
    const game=this.game,p=game.player,storm=game.storm;
    if(!game.match || !p) return;
    this.clock+=dt;
    if(!game.settings.values.showHud) return;
    show("soundCue",game.settings.values.soundCues && this.clock<this.cueUntil);
    show("message",this.decay>this.clock);
    this.feed=this.feed.filter(row=>{
      const visible=row.expires>this.clock;
      if(!visible) row.el.remove();
      return visible;
    });
    this.floats=this.floats.filter(mark=>{
      if(mark.expires<=this.clock) { mark.el.remove();return false; }
      const screen=this.projection.copy(mark.point).project(game.renderer.camera);
      const visible=screen.z<1 && screen.z>-1;
      mark.el.hidden=!visible;
      if(visible) {
        mark.el.style.left=(screen.x*.5+.5)*100+"%";
        mark.el.style.top=(.5-screen.y*.5)*100+"%";
      }
      return true;
    });
    if(this.clock>=this.miniAt) {
      this.miniAt=this.clock+.135;
      this.map($("mini"),false);
    }
    const grounded=p.state==="ground";
    const held=p.held(), scope=grounded && p.aiming && held?.id==="sniper";
    const outside=grounded && !storm.contains(p.p.x,p.p.z);
    show("reticle",grounded && !scope && game.state!=="spectate");
    show("scope",scope && game.state!=="spectate");
    show("zoneBanner",outside);
    const reticle=$("reticle");
    reticle.classList.toggle("hit",this.hitTime>this.clock);
    reticle.classList.toggle("blocked",p.blockedShot && p.shotPose>.03);
    const viewportHeight=$("world").clientHeight || innerHeight;
    const focalPixels=viewportHeight*.5/Math.tan(game.renderer.camera.fov*Math.PI/360);
    const radius=held?.kind==="gun" && !p.inBuild ? game.combat.spread(p,held)*focalPixels : 4;
    reticle.style.setProperty("--gap",Math.max(2,Math.min(radius,viewportHeight*.32))/(game.settings.values.hudScale/100)+"px");
    const vignette=$("vignette");
    vignette.classList.toggle("storm",outside);
    vignette.classList.toggle("hardHit",p.bigHit>.29);
    vignette.style.opacity=Math.max(p.hitShade, outside?.67:0);
    show("direction",grounded && p.hitShade>.13 && p.attacker?.alive);
    $("direction").style.transform="rotate("+p.damageDirection+"rad)";
    $("direction").style.opacity=p.hitShade;
    if(this.clock<this.hudAt) return;
    this.compass(p.state==="bus"?game.match.yaw:p.yaw);
    this.hudAt=this.clock+.047;
    const pos=p.state==="bus"?game.match.bus.position:p.p, place=nearestPlace(pos.x,pos.z);
    $("location").textContent=areaDistance(place,pos.x,pos.z)<100?place.name:"Grayline Island";
    $("alive").textContent=String(game.actors.filter(a=>a.alive).length);
    $("kills").textContent=p.kills;
    $("timer").textContent=p.state==="bus"?"–":timeText(storm.remaining);
    const upcoming=storm.target(),nextRange=areaDistance(upcoming,pos.x,pos.z)-upcoming.r;
    const safe=nextRange>0?Math.ceil(nextRange)+" m to next ring":"Inside next ring";
    $("phase").textContent=p.state==="bus"?"Awaiting drop":storm.closed?"Final collapse":storm.label()+" · "+safe;
    show("lowHealth",grounded && p.hp>0 && p.hp<=25);
    $("health").textContent=Math.ceil(p.hp);
    $("shield").textContent=Math.ceil(p.shield);
    $("healthFill").style.width=p.hp+"%";
    $("shieldFill").style.width=p.shield+"%";
    show("fps",game.settings.values.fps);
    $("fps").textContent=Math.round(game.fps)+" FPS";
    show("hotbar",!p.inBuild);
    show("buildSlots",p.inBuild);
    const buildStatus=$("buildStatus"), placementReason=game.builds.selected?.reason;
    show("buildStatus",p.inBuild && grounded);
    buildStatus.classList.toggle("blocked",!!placementReason);
    buildStatus.textContent=placementReason || game.settings.key("rotate")+" Rotate   ·   "+game.settings.key("shoot")+" Place";
    this.hot.forEach((slot,i)=>this.slot(slot,p.items[i],!p.usingPick && p.slot===i));
    this.construction.forEach((slot,i)=>this.slot(slot,null,p.buildType===i,i));
    for(let i=0;i<3;i++) this.materialValues[i].textContent=p.materials[i];
    $("equipped").textContent=p.inBuild?MATERIALS[p.buildMaterial]+" · "+BUILD_NAMES[p.buildType]:held?itemName(held):"Empty slot";
    const ammo=$("ammo");
    if(p.inBuild) ammo.textContent="10 / piece";
    else if(held?.kind==="gun") {
      this.ammoCount.data=held.clip;
      this.ammoReserve.textContent=" / "+p.reserve[WEAPON_STATS[held.id].ammo];
      if(this.ammoCount.parentNode!==ammo) ammo.replaceChildren(this.ammoCount,this.ammoReserve);
    } else ammo.textContent=held?.count||"–";

    const key=action=>game.settings.key(action);
    if(game.state==="lobby") this.objective("Deployment in "+Math.max(1,Math.ceil(5-game.match.age)),key("map")+" to view the drop route");
    else if(p.state==="bus") this.objective("Choose your drop",key("jump")+" Jump    ·    "+key("map")+" Island map");
    else if (p.state==="dive") this.objective("Skydiving",key("forward")+" Dive faster    ·    "+key("jump")+" Deploy glider");
    else if (p.state==="glide") this.objective("Gliding",Math.max(0,Math.round(p.p.y-game.world.terrain.height(p.p.x,p.p.z)))+" m above ground");
    else if (game.state==="spectate") this.objective("Eliminated",game.killer?.id?"Spectating "+game.killer.name:"Caught by the storm");
    else this.objective("");

    const target=p.interaction,door=target instanceof Door;
    const interacting=grounded && !!target;
    show("interact",interacting);
    if(interacting) {
      $("interactKey").textContent=(door || target.kind==="item"?"":"Hold ")+key("use");
      $("interactText").textContent=door?(target.open?"Close door":"Open door"):
        target.kind==="item"?"Pick up "+itemName(target.item)+(target.item.kind==="gun"?" · "+RARITIES[target.item.tier]:""):
        target.kind==="chest"?"Open chest":target.kind==="car"?"Search wreck":"Open ammo box";
    }
    const comparison=interacting?this.compare(target,held):"";
    $("lootCompare").textContent=comparison;show("lootCompare",!!comparison);
    const action=p.action, showingAction=action && action.type!=="swing", hold=interacting && p.holdTime>0;
    show("progress",showingAction || hold);
    if(showingAction || hold) {
      $("progressText").textContent=showingAction?(action.type==="reload"?"Reloading":"Using "+itemName(action.item)):"Interacting";
      const percent=showingAction?1-action.remaining/action.total:p.holdTime/target.duration;
      $("progressFill").style.width=clamp(percent*100,0,100)+"%";
    }
  }
  result(won,rank,killer,age) {
    const p=this.game.player;
    $("resultOverline").textContent=won?"Island secured":"Match complete";
    $("resultTitle").textContent=won?"#1 — Last One Standing":placement(rank)+" — Eliminated";
    $("resultDetail").textContent=won?"You outlasted "+((this.game.online?.active?this.game.onlinePlayers:this.game.actors.length)-1)+" opponents.":
      killer?.id?killer.name+" eliminated you.":"The storm eliminated you.";
    const accuracy=p.shotsFired?Math.round(p.shotsHit/p.shotsFired*100)+"%":"–";
    const stats=[["Placement",placement(rank)],["Eliminations",p.kills],["Damage dealt",Math.round(p.damageDone)],
      ["Survived",timeText(age)],["Accuracy",accuracy],["Items looted",p.looted]];
    try {localStorage.setItem("grayline.lastMatch.v1",JSON.stringify({rank,age,kills:p.kills}));} catch {}
    this.lastResult();
    this.replayFrames=killer?.id?this.game.replay.map(frame=>({t:frame.t,p:frame.p,k:frame.actors[killer.id]})):[];
    this.replayKiller=killer?.name||"";
    this.replayAt=0;
    show("replayBlock",this.replayFrames.length>1 && this.replayFrames.some(frame=>frame.k));
    $("resultStats").replaceChildren(...stats.map(([label,value])=>{
      const stat=document.createElement("div"),strong=document.createElement("strong");
      strong.textContent=value;
      stat.append(strong,label);
      return stat;
    }));
  }
}
// Each row is [target radius, hold seconds, contraction seconds, damage per second].
const STORM_PHASES = [
  [322,75,45,1],[209,35,39,2],[124,29,32,3],[71,23,27,5],[37,18,22,8],[15,14,18,10],[2,12,18,14]
];
class Storm {
  constructor(game) {
    this.game=game;
    this.x=0;this.z=0;this.r=505;
    this.from={x:0,z:0,r:this.r};
    this.index=0;
    this.mode="hold";
    this.remaining=STORM_PHASES[0][1];
    this.elapsed=0;
    this.closed=false;
    this.phases=[];
    const {terrain}=game.world;
    let x=0,z=0,prior=this.r;
    for(const [r,hold,move,dps] of STORM_PHASES) {
      for(let i=0;i<26;i++) {
        const a=game.random()*TAU,k=(prior-r)*lerp(.29,.72,game.random());
        const px=x+Math.cos(a)*k,pz=z+Math.sin(a)*k;
        if(terrain.height(px,pz)<SEA+2.57 || terrain.slope(px,pz)>.67) continue;
        x=px;z=pz;break;
      }
      this.phases.push({x,z,r,hold,move,dps});
      prior=r;
    }
    const g=new THREE.CylinderGeometry(1,1,273,128,1,true);
    this.shell=new THREE.Mesh(g,new THREE.ShaderMaterial({
      uniforms:{clock:{value:0},stormCenter:{value:vec()},stormRadius:{value:500}},
      vertexShader:`
        varying vec3 stormWorld;
        varying vec2 wallUV;
        void main(){wallUV=uv;stormWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(stormWorld,1.);}
      `,
      fragmentShader:`
        varying vec3 stormWorld;
        varying vec2 wallUV;
        uniform float clock,stormRadius;
        uniform vec3 stormCenter;
        float field(vec2 p){
          vec2 i=floor(p),f=fract(p);
          f=f*f*(3.-2.*f);
          vec4 corners=fract(sin(vec4(0.,1.,131.,132.)+dot(i,vec2(1.,131.)))*43758.54);
          return mix(mix(corners.x,corners.y,f.x),mix(corners.z,corners.w,f.x),f.y);
        }
        void main(){
          vec3 ray=normalize(cameraPosition-stormWorld);
          vec2 radial=normalize(stormWorld.xz-stormCenter.xz);
          float rim=pow(1.-abs(dot(radial,ray.xz)),2.);
          float edge=abs(length(cameraPosition.xz-stormCenter.xz)-stormRadius);
          float nearWall=1.-smoothstep(4.,120.,edge);
          float around=wallUV.x*6.2831853,height=stormWorld.y;
          float sweep=sin(around*7.-height*.21+clock*1.35)+.50*sin(around*13.+height*.12-clock*1.02);
          vec2 wind=vec2(around*14.+sweep*2.1-clock*1.45,height*.19+clock*.49);
          float billow=.58*field(wind*.40)+.29*field(wind*.94)+.13*field(wind*2.8);
          float curtain=pow(.5+.5*sin(around*42.+sweep*2.22+clock*1.51),8.);
          float sector=floor(wallUV.x*30.);
          float pulse=fract(clock*.51+sector*.717);
          float strike=(1.-smoothstep(.0,.075,pulse))*step(.78,fract(sin(sector+floor(clock*.51+sector*.717))*16341.));
          float crack=fract(wallUV.x*30.)-.54-.12*sin(height*.53+sector)-.067*sin(height*1.78+sector*6.);
          float fork=crack+(sin(height*.31+sector*6.)*.19+.08)*smoothstep(9.,56.,height);
          float electric=(1.-smoothstep(.004,.018,abs(crack)))+.62*(1.-smoothstep(.004,.015,abs(fork)));
          electric*=strike*(.42+.58*nearWall)*smoothstep(-8.,6.,height)*(1.-smoothstep(81.,142.,height));
          vec3 color=mix(vec3(.095,.024,.31),vec3(.61,.26,1.18),smoothstep(.20,.82,billow)+curtain*.21);
          color+=vec3(.78,.66,1.18)*electric*2.9;
          float alpha=(.046+rim*.14+billow*.17+curtain*.077)*(.70+nearWall*.56)+electric*.63;
          gl_FragColor=vec4(color,clamp(alpha,0.,.86));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      side:THREE.DoubleSide,transparent:true,depthWrite:false
    }));
    const particles=new THREE.BufferGeometry();
    particles.setAttribute("position",new THREE.BufferAttribute(new Float32Array(128*3),3).setUsage(THREE.DynamicDrawUsage));
    this.specks=new THREE.Points(particles,new THREE.PointsMaterial({
      color:"#b68fee",map:game.atmosphere.moteMap,size:.32,transparent:true,opacity:.59,depthWrite:false,blending:THREE.AdditiveBlending
    }));
    this.specks.frustumCulled=false;
    this.specks.layers.set(2);
    this.shell.renderOrder=4;
    this.specks.renderOrder=5;
    game.objects.add(this.shell,this.specks);
  }
  target() { return this.phases[this.index]; }
  contains(x,z,margin=0) { return dist(this.x,this.z,x,z)<=this.r+margin; }
  label() { return "Phase "+(this.index+1)+" / 7 · "+(this.mode==="hold"?"Closing in":"Contracting"); }
  update(dt) {
    let p=this.target();
    this.remaining=Math.max(0,this.remaining-dt);
    if (this.mode==="hold") {
      if(this.remaining===0) {
        this.mode="move";
        this.remaining=p.move;
        this.from={x:this.x,z:this.z,r:this.r};
      }
    } else if(this.mode==="move") {
      const t=1-this.remaining/p.move;
      this.x=lerp(this.from.x,p.x,t);
      this.z=lerp(this.from.z,p.z,t);
      this.r=lerp(this.from.r,p.r,t);
      if(this.remaining===0) {
        if(this.index<this.phases.length-1) {
          this.index++;
          p=this.target();
          this.mode="hold";
          this.remaining=p.hold;
        } else {
          this.mode="last";
          this.remaining=13;
        }
      }
    } else {
      this.r=Math.max(.025,2*(this.remaining/13));
      this.closed=true;
    }
    this.elapsed+=dt;
    if(this.elapsed<1) return;
    this.elapsed-=1;
    for(const actor of this.game.actors) if(actor.state==="ground" && !this.contains(actor.p.x,actor.p.z)) {
      this.game.damage(actor,p.dps,"storm","storm");
      if(actor.id===0) this.game.audio.event("storm",actor.p,.87);
    }
  }
  draw(clock,focus) {
    const u=this.shell.material.uniforms;
    this.shell.visible=this.game.player.state!=="bus";
    this.shell.scale.set(this.r,1,this.r);
    this.shell.position.set(this.x,110,this.z);
    u.clock.value=clock;
    u.stormCenter.value.set(this.x,0,this.z);
    u.stormRadius.value=this.r;
    const distance=Math.abs(areaDistance(this,focus.x,focus.z)-this.r);
    this.specks.visible=this.shell.visible && distance<83;
    if(!this.specks.visible) return;
    const pos=this.specks.geometry.attributes.position,arc=clamp(104/Math.max(7,this.r),.2,Math.PI);
    const base=Math.atan2(focus.z-this.z,focus.x-this.x);
    for(let i=0;i<pos.count;i++) {
      const a=base+(hash(i,21)-.5)*arc+Math.sin(clock*.44+i)*.023;
      const r=this.r+(hash(i,4)-.5)*14.0;
      pos.setXYZ(i,this.x+Math.cos(a)*r,focus.y+((hash(i,17)*29+clock*(.7+hash(i,6)*1.4))%29)-8,this.z+Math.sin(a)*r);
    }
    pos.needsUpdate=true;
  }
  dispose() {
    for(const mesh of [this.shell,this.specks]) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  }
}

function busModel(mats) {
  const bus=new THREE.Group(), hull=[],metal=[],rubber=[],glass=[],signals=[];
  const shell=mats.textured("steel","#7b8873",.75,.32),iron=mats.paint("#949385",.58,.64);
  const hullGeo=new THREE.CapsuleGeometry(1.15,8.4,6,16).rotateX(Math.PI/2).scale(1.29,1.12,1);
  hull.push(hullGeo);
  hull.push(boxAt(0,-.75,.21,2.7,.56,8.8));
  hull.push(boxAt(0,1.20,.72,1.83,.35,6.12));
  metal.push(boxAt(0,-.79,-4.91,2.40,.18,1.2,.12),boxAt(0,1.28,-2.6,1.43,.165,3.62));
  const windowMat=mats.paint("#3d5960",.27,.38);
  glass.push(boxAt(0,.45,-4.993,1.66,.83,.16,.18));
  glass.push(boxAt(0,.43,-4.899,2.11,.79,.12,.24));
  for(const side of [-1,1]) {
    for(let i=0;i<6;i++) {
      const z=-3.57+i*1.19;
      glass.push(boxAt(side*1.42,.37,z,.12,.59,.905,0,0,side*.045));
      metal.push(boxAt(side*1.45,.008,z,.107,.055,.92));
      metal.push(boxAt(side*1.45,.71,z,.092,.045,.95));
    }
    for(const y of [-.57,.79]) metal.push(boxAt(side*1.403,y,.2,.08,.055,8.60));
    hull.push(boxAt(side*2.08,.43,.85,2.01,.15,2.71,0,.18*-side,side*.12));
    hull.push(boxAt(side*2.01,.18,3.42,1.6,.16,2.2,0,.24*-side,-side*.14));
    const x=side*2.74;
    metal.push(cylinderBetween(vec(x,.32,-1.80),vec(x,.32,2.64),.49,.61,14));
    rubber.push(cylinderBetween(vec(x,.32,2.39),vec(x,.32,2.92),.545,.43,14));
    rubber.push(cylinderBetween(vec(x,.32,-1.90),vec(x,.32,-1.64),.343,.46,13));
    signals.push(cylinderBetween(vec(x,.32,2.88),vec(x,.32,2.949),.34,.31,14));
    const light=new THREE.Mesh(new THREE.SphereGeometry(.082,8,6),new THREE.MeshStandardMaterial({
      color:side>0?"#98dcb8":"#dd836f",emissive:side>0?"#74ffc3":"#ff624d",emissiveIntensity:2.4
    }));
    light.position.set(side*3.37,.59,.90);
    bus.add(light);
  }
  const parts=[[hull,shell],[metal,iron],[rubber,mats.paint("#37423f",.69,.32)],[glass,windowMat],
    [signals,new THREE.MeshStandardMaterial({color:"#9bd2cf",emissive:"#8cd8ff",emissiveIntensity:2.7,roughness:.3})]];
  for(const [shapes,mat] of parts) {
    const mesh=new THREE.Mesh(mergeParts(shapes),mat);
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    bus.add(mesh);
  }
  return bus;
}

class ViewArms {
  constructor(game,camera) {
    const [a,b]=VIEW_ARM_LENGTH;
    const rig=[
      ["upperR","",.431,-.52,.025],["lowerR","upperR",0,-a,0],["handR","lowerR",0,-b,0],
      ["upperL","",-.338,-.51,-.131],["lowerL","upperL",0,-a,0],["handL","lowerL",0,-b,0]
    ];
    const bones=characterBones(rig),characters=game.characters;
    this.mesh=new THREE.SkinnedMesh(characters.viewMesh(bones),characters.material);
    this.mesh.bind(new THREE.Skeleton(Object.values(bones)),new THREE.Matrix4());
    this.mesh.frustumCulled=false;
    this.mesh.layers.set(2);
    this.mesh.visible=false;
    const root=new THREE.Group();
    root.layers.set(2);
    root.add(this.mesh,bones.upperR,bones.upperL);
    camera.add(root);
    this.right=new LimbIK(bones.upperR,bones.lowerR,bones.handR,vec(.74,-1,.24));
    this.left=new LimbIK(bones.upperL,bones.lowerL,bones.handL,vec(-.56,-1,.16));
    this.support=vec();
    this.rotation=new THREE.Quaternion();
    this.euler=new THREE.Euler(0,0,0,"YXZ");
  }
  pose(weapon,form,id,magazine,action,dt) {
    this.mesh.visible=weapon.visible;
    if (!weapon.visible) return;
    const reload=action?.type==="reload"?actionPhase(action):null;
    const blend=1-Math.exp(-48*dt);
    this.right.solve(weapon.position,weapon.quaternion);
    const support=this.support;
    if (form) support.copy(form.support);
    else support.set(-.088,-.079,-.018);
    magazinePose(magazine,id,reload,support);
    if (id==="shotgun" && reload!=null) support.z+=.186*poseTrack(RELOAD_TILT,reload);
    if (id==="pick") support.z-=.054+Math.sin(actionPhase(action)*Math.PI)*.034;
    support.multiply(weapon.scale).applyQuaternion(weapon.quaternion).add(weapon.position);
    this.rotation.setFromEuler(this.euler.set(-.19,-.22,id==="pistol"?-.46:-.81)).premultiply(weapon.quaternion);
    this.left.solve(support,this.rotation,blend);
  }
}

class CameraRig {
  constructor(game) {
    this.game=game;
    this.camera=game.renderer.camera;
    this.weapon=new THREE.Group();
    this.weapon.layers.set(2);
    this.camera.add(this.weapon);
    this.weapon.visible=false;
    this.viewArms=new ViewArms(game,this.camera);
    this.magazine=null;
    this.position=vec();
    this.direction=vec(0,0,-1);
    this.focus=vec();
    this.last="";
    this.orbit=0;
    this.item="";
    this.firstPerson=false;
    this.nextItem="";
    this.swapTime=.25;
    this.adsBlend=0;
    this.adsProgress=0;
    this.sprintPose=0;
    this.hipRotation=new THREE.Quaternion();
    this.hipEuler=new THREE.Euler();
    this.aimPosition=vec();
    this.steadySway=vec();
  }
  resetView() {
    this.firstPerson=false;
    this.weapon.visible=false;
    this.viewArms.mesh.visible=false;
    this.weapon.clear();
    this.magazine=null;
    this.item=this.nextItem="";
    this.swapTime=.25;
    this.adsBlend=this.adsProgress=this.sprintPose=0;
    this.last="";
  }
  view(id) {
    if(this.item===id) return;
    this.item=id;
    this.weapon.clear();
    const model=MEDICINE[id]?this.game.lootAssets.models[id].clone():this.game.weapons.model(id);
    this.magazine=model?.getObjectByName("magazine") || null;
    if(model) {
      model.traverse(part=>{ part.castShadow=false; part.layers.set(2); });
      this.weapon.add(model);
    }
  }
  readyGun(id) {
    return !this.firstPerson || this.item===id && this.swapTime>=.16;
  }
  muzzle(id) {
    if (this.item!==id) return this.camera.position.clone();
    return this.weapon.localToWorld(this.game.weapons.muzzle(id).clone());
  }
  poseWeapon(actor,dt,first,scope) {
    const held=actor.held(), id=actor.inBuild || actor.state!=="ground" ? "" : held?.id || "";
    if (!first) {
      this.view(id);
      this.nextItem=id;
      this.swapTime=.25;
      this.adsBlend=this.adsProgress=this.sprintPose=0;
      this.weapon.visible=false;
      this.viewArms.mesh.visible=false;
      return;
    }
    if (this.nextItem!==id) {
      this.nextItem=id;
      this.swapTime=this.item ? Math.min(this.swapTime,.25-this.swapTime) : .105;
    }
    this.swapTime=Math.min(.25,this.swapTime+dt);
    if (this.swapTime>=.105) this.view(this.nextItem);
    this.weapon.visible=!scope && !!this.item && !actor.inBuild;
    const form=this.game.weapons.forms[this.item], stats=WEAPON_STATS[this.item];
    if (!this.item) return;

    const aimed=actor.aiming && this.item===id && !!stats;
    this.adsProgress=clamp(this.adsProgress+(aimed?1:-1)*dt/(stats?.adsTime || .18),0,1);
    this.adsBlend=smooth(0,1,this.adsProgress);
    const blend=this.adsBlend, hip=1-blend;
    const dip=this.swapTime<.105?smooth(0,.105,this.swapTime):1-smooth(.105,.25,this.swapTime);
    this.sprintPose=damp(this.sprintPose,actor.speed>4.85 && !actor.aiming?1:0,11,dt);
    const sprint=this.sprintPose, sway=actor.viewSway || this.steadySway;
    const step=actor.model.phase;
    const bob=this.game.settings.values.bob && !this.game.settings.values.reducedMotion ? Math.min(.024,actor.speed*.0042) : 0;
    const a=actor.action;
    const t=actionPhase(a);
    const reload=a?.type==="reload"?poseTrack(RELOAD_TILT,t):0;
    const swing=a?.type==="swing"?poseTrack(AXE_ARC,t,4)+.44:0;
    const drink=a?.type==="med"?smooth(0,.19,t)*(1-smooth(.72,1,t)):0;
    const push=actor.shotPose*.072;
    const weapon=this.weapon;
    weapon.scale.setScalar(MEDICINE[this.item]?1.17:1);
    weapon.position.set(
      .265+(sway.x+Math.cos(step)*bob)*hip+sprint*.07-reload*.095,
      -.282+(sway.y+Math.sin(step*2)*bob)*hip-sprint*.153+reload*.087+swing*.104+drink*.28,
      -.49-reload*.168+push+swing*.090
    );
    this.hipEuler.set(-.04+sway.y*.8*hip-sprint*.35,sway.x*-.96*hip-.045,.11+sprint*.33);
    this.hipRotation.setFromEuler(this.hipEuler);
    weapon.quaternion.copy(this.hipRotation);
    if (stats && blend>0) {
      this.aimPosition.copy(form.sight).applyQuaternion(form.sightRotation).negate();
      this.aimPosition.z-=form.eyeRelief-push;
      weapon.position.lerp(this.aimPosition,blend);
      weapon.quaternion.slerp(form.sightRotation,blend);
    }
    weapon.position.y-=dip*.24+reload*.043*blend;
    if (dip || reload || swing || drink) {
      weapon.rotateX(-dip*.38-reload*.18+swing*.77+drink*.42);
      weapon.rotateY(reload*.68);
      weapon.rotateZ(reload*.39+swing*.17);
    }
    const obstruction=this.game.world.collision.cast(this.camera.position,this.direction,1.22,"camera");
    if(obstruction) {
      const pull=1-smooth(.20,1.13,obstruction.distance);
      weapon.position.z+=pull*.29;weapon.position.y-=pull*.18;weapon.rotateX(-pull*.25);
    }
    this.viewArms.pose(weapon,form,this.item,this.magazine,a,dt);
  }
  set(pos,direction,fov,kind,dt,snap=false) {
    const fresh=this.last!==kind;
    this.last=kind;
    this.position.lerp(pos,fresh || snap ? 1 : 1-Math.exp(-dt*17));
    this.camera.position.copy(this.position);
    this.direction.copy(direction).normalize();
    this.camera.lookAt(this.position.clone().add(this.direction));
    this.camera.fov=fresh?fov:damp(this.camera.fov,fov,12,dt);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
  }
  flyover(dt,starting=false) {
    const game=this.game,t=game.settings.values.reducedMotion?0:game.clock*.075,place=game.world.terrain.plots[0];
    const position=vec(91+Math.sin(t)*23,place.y+43+Math.cos(t*.67)*7,66+Math.sin(t*.61)*14);
    const target=vec(-57+Math.sin(t*.67)*19,place.y+7.7,-65+Math.sin(t*.82)*9);
    this.focus.copy(target).lerp(position,.28);
    this.firstPerson=false;
    this.weapon.visible=false;
    this.set(position,target.sub(position),57,starting?"lobby":"menu",dt);
  }
  bus(dt) {
    const m=this.game.match,s=this.game.settings.values;
    const actor=this.game.player;
    const p=m.bus.position.clone().addScaledVector(m.direction,6.4).add(vec(0,1.3,0));
    this.focus.copy(m.bus.position);
    this.firstPerson=true;
    this.weapon.visible=false;
    this.set(p,aimVector(actor.yaw,actor.pitch),s.fov*.92,"bus",dt,true);
  }
  follow(actor,dt) {
    const g=this.game,s=g.settings.values;
    const self=actor.id===0 && g.state!=="spectate";
    const p=actor.p, item=actor.held(),air=actor.state==="dive"||actor.state==="glide";
    const scope=actor.aiming && item?.id==="sniper" && !air;
    const zoom=actor.aiming && !air;
    const f=aimVector(actor.yaw,actor.pitch);
    const position=eyePosition(actor);
    const kind=g.state==="spectate"?"spectate":air?"drop":"first";
    const quake=self && s.shake && !s.reducedMotion?Math.sin(g.clock*48)*actor.shake:0;
    const viewDir=quake?aimVector(actor.yaw+quake*.013,actor.pitch+quake*.011):f;
    this.firstPerson=true;
    this.focus.copy(p);
    this.set(position,viewDir,scope?19:zoom?s.fov*.76:air?s.fov+.7:s.fov,kind,dt,true);
    this.poseWeapon(actor,dt,true,scope);
  }
  update(dt) {
    const g=this.game;
    this.viewArms.mesh.visible=false;
    if(g.state==="menu") this.flyover(dt);
    else if(g.player.state==="bus") this.bus(dt);
    else if(g.state==="spectate" || g.state==="result" && !g.player.alive) {
      const actor=g.killer?.alive?g.killer:g.player;
      this.follow(actor,dt);
    } else this.follow(g.player,dt);
  }
}

class DebugView {
  constructor(game) {
    this.game=game;this.flags={};this.layers={};this.active=false;this.flying=false;
    this.position=vec();this.projected=vec();this.forward=vec();this.side=vec();this.yaw=0;this.pitch=0;
    for(const [id,label,color,limit] of [
      ["boxes","Collision boxes",0x9ee2ed,8200],["roads","Road connections",0xf0bf6d,2048],
      ["paths","Navigation and paths",0xa3e9ae,6200],["vision","Bot vision and memory",0xdd9eec,2800],
      ["labels","Bot names and states",0xeeeeee,0]
    ]) {
      const input=document.createElement("input"),row=document.createElement("label");
      input.type="checkbox";row.append(input," "+label);$("debugFlags").append(row);
      this.flags[id]=false;
      input.onchange=()=>{this.flags[id]=input.checked;this.nextDraw=0;};
      if(!limit) continue;
      const positions=new THREE.BufferAttribute(new Float32Array(limit*6),3).setUsage(THREE.DynamicDrawUsage);
      const geo=new THREE.BufferGeometry();geo.setAttribute("position",positions);geo.setDrawRange(0,0);
      const material=new THREE.LineBasicMaterial({color,transparent:true,opacity:.72,depthWrite:false,toneMapped:false,depthTest:id!=="vision"});
      const mesh=new THREE.LineSegments(geo,material);mesh.visible=false;mesh.frustumCulled=false;mesh.renderOrder=15;
      game.renderer.scene.add(mesh);
      this.layers[id]={mesh,positions,count:0,limit};
    }
    this.labels=BOT_NAMES.map(()=>{
      const label=document.createElement("span");label.hidden=true;$("botLabels").append(label);return label;
    });
    $("debugPlace").add(new Option("Choose a location",""));
    PLACES.forEach((place,i)=>$("debugPlace").add(new Option(place.name,String(i))));
    $("debugPlace").onchange=event=>{
      if(event.target.value!=="") this.teleport(Number(event.target.value));
    };
    $("validateWorld").onclick=()=>this.validate();
    $("debugFly").onclick=()=>{
      if(!game.isLive()) return;
      if(this.flying) this.stopFlying();
      else {
        const camera=game.renderer.camera,direction=camera.getWorldDirection(this.forward);
        this.position.copy(camera.position);
        this.yaw=Math.atan2(-direction.x,-direction.z);this.pitch=Math.asin(direction.y);
        this.flying=true;
      }
      game.ui.skin();game.resume();
    };
    $("debugBack").onclick=()=>this.close(false);
  }
  disableForOnline() {
    this.stopFlying();
    this.active=false;
    this.preview=null;
    for(const layer of Object.values(this.layers)) layer.mesh.visible=false;
    show("debugReadout",false);
    show("botLabels",false);
  }
  toggle() {
    if(this.game.modal==="debug") { this.close(true);return; }
    this.active=true;this.nextDraw=0;
    this.returnPanel=this.game.modal;
    $("debugFly").textContent=this.flying?"Return to player":"Free-fly camera";
    $("debugFly").disabled=!this.game.isLive();
    this.game.openModal("debug");
  }
  close(off) {
    const g=this.game;
    if(off) {
      this.active=false;this.preview=null;this.stopFlying();
      show("debugReadout",false);show("botLabels",false);
      for(const layer of Object.values(this.layers)) layer.mesh.visible=false;
    }
    if(this.returnPanel && this.returnPanel!=="debug") g.openModal(this.returnPanel);
    else if(g.isLive()) g.resume();
    else g.openModal("");
  }
  stopFlying() {
    if(!this.flying) return;
    this.flying=false;this.game.cameraRig.last="";this.game.ui.skin();
  }
  teleport(index) {
    const g=this.game,place=PLACES[index],node=g.world.roads.placeNodes.get(index);
    const x=node?.x??place.x,z=node?.z??place.z;
    const y=g.world.collision.floor(x,z,g.world.terrain.height(x,z)+.30).y;
    if(this.flying) this.position.set(x,y+11,z+6);
    else if(!g.match) this.preview={at:vec(x+21,y+23,z+23),looking:vec(place.x,y+2,place.z)};
    else if(g.player.alive && g.isLive()) {
      const p=g.player;
      let target=vec(x,y,z);
      if(g.world.collision.blocked(x,y,z,1.67,.37)) {
        for(let i=0;i<20;i++) {
          const angle=i*2.39996,d=1+i*.56,px=x+Math.cos(angle)*d,pz=z+Math.sin(angle)*d;
          const py=g.world.collision.floor(px,pz,y+1.8).y;
          if(py>SEA && !g.world.collision.blocked(px,py,pz,1.67,.37)) { target=vec(px,py,pz);break; }
        }
      }
      p.p.copy(target);p.state="ground";p.grounded=true;p.vy=0;p.yaw=yawTo(p.p,place);
      p.cancel();p.interaction=null;p.surface=g.world.terrain.surface(p.p.x,p.p.z);
      g.state="active";g.cameraRig.last="";g.cameraRig.update(.033);
    }
    g.visibilityAt=0;this.nextDraw=0;
  }
  look(dx,dy) {
    const sensitivity=.0022*this.game.settings.values.sensitivity/85;
    this.yaw-=dx*sensitivity;this.pitch=clamp(this.pitch-dy*sensitivity,-1.48,1.48);
  }
  moveCamera(dt) {
    const g=this.game,rig=g.cameraRig,i=g.input;
    const yaw=this.yaw,pitch=this.pitch;
    this.forward.set(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
    if(!g.modal) {
      const speed=dt*(i.down("sprint")?65:19);
      this.side.set(Math.cos(yaw),0,-Math.sin(yaw));
      this.position.addScaledVector(this.forward,(+i.down("forward")-+i.down("back"))*speed);
      this.position.addScaledVector(this.side,(+i.down("right")-+i.down("left"))*speed);
      this.position.y=clamp(this.position.y+(+i.down("jump")-+i.down("crouch"))*speed,.20,430);
      i.finishStep();
    }
    rig.weapon.visible=rig.viewArms.mesh.visible=false;
    rig.focus.copy(this.position);rig.set(this.position,this.forward,76,"debug",dt,true);
  }
  validate() {
    const {world:w}=this.game,{roads,collision:c,terrain:t}=w,issues=[];
    const visited=new Set(),queue=[roads.placeNodes.get(0)];
    for(let i=0;i<queue.length;i++) {
      const node=queue[i];
      if(visited.has(node)) continue;
      visited.add(node);
      for(const other of node.links) if(!visited.has(other)) queue.push(other);
    }
    let gaps=0,underwater=0,blockedRoads=0,steepRoads=0;
    for(const edge of roads.edges) {
      const names=`(${edge.a.x}, ${edge.a.z}) to (${edge.b.x}, ${edge.b.z})`;
      if(!visited.has(edge.a) || !visited.has(edge.b)) {gaps++;issues.push("Unconnected road "+names);}
      let wet=false,blocked=false,steep=false,prior=null;
      const count=Math.max(1,Math.ceil(edge.length/1.4));
      for(let i=0;i<=count;i++) {
        const ratio=i/count,x=edge.a.x+edge.dx*ratio,z=edge.a.z+edge.dz*ratio;
        const land=t.height(x,z),y=c.floor(x,z,edge.kind==="bridge"?w.bridge.max.y+.05:land+.28,.372).y;
        wet ||= y<SEA-.05;
        blocked ||= c.blocked(x,y,z,1.66,.37,true);
        steep ||= prior!=null && Math.abs(y-prior)/(edge.length/count)>.43;
        prior=y;
      }
      if(wet) {underwater++;issues.push("Submerged road "+names);}
      if(blocked) {blockedRoads++;issues.push("Blocked road centerline "+names);}
      if(steep) {steepRoads++;issues.push("Steep road grade "+names);}
    }
    let inaccessible=0;
    PLACES.forEach((place,i)=>{
      const access=roads.placeNodes.get(i);
      if(!visited.has(access) || t.height(access.x,access.z)<SEA) {inaccessible++;issues.push(place.name+" has no dry road access");}
    });
    let doors=0;
    for(const b of w.buildings.all) {
      const a=b.nodes[b.outside]?.position,inside=b.nodes[b.inside]?.position;
      if(!a || !b.approach || !b.approach.slice(1).every((point,i)=>w.accessSpan(b.approach[i],point)) || inside && !w.accessSpan(a,inside)) {
        doors++;issues.push(`${b.kind} at ${Math.round(b.x)}, ${Math.round(b.z)} needs a clear door approach`);
      }
    }
    let float=0,roadProps=0;
    for(const p of w.placedProps) {
      const expected=Math.max(t.height(p.x,p.z),p.entry?.box.max.y??-Infinity);
      const delta=p.y-p.offset-expected;
      if(Math.abs(delta)>.075) {float++;issues.push(`${p.type} ${delta>0?"above":"below"} its support at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);}
      if(roads.surfaceAt(p.x,p.z,Math.max(p.rx,p.rz)*.66,false)) {
        roadProps++;issues.push(`${p.type} blocks road at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
      }
    }
    let invalid=c.invalid.length;
    for(const entry of c.entries) {
      const {min,max}=entry.box;
      if(![min.x,min.y,min.z,max.x,max.y,max.z].every(Number.isFinite) || entry.box.isEmpty() ||
         !entry.active || !entry.cells.length || entry.cells.some(key=>!c.cells.get(key)?.has(entry))) invalid++;
    }
    if(invalid) issues.push(`${invalid} invalid collision boxes or cell memberships`);
    const summary=[
      `${roads.edges.length-gaps}/${roads.edges.length} links connected · ${PLACES.length-inaccessible}/${PLACES.length} places accessible`,
      `${w.buildings.all.length-doors}/${w.buildings.all.length} building approaches clear`,
      `${underwater} submerged links · ${blockedRoads} blocked centerlines · ${steepRoads} steep grades`,
      `${w.placedProps.length} generated props · ${float} ground contact issues · ${roadProps} on roads`,
      `${c.entries.size} collision entries · ${invalid} invalid`,
      ...(issues.length?["",...issues]:["","No issues found by these checks."])
    ];
    const report={gaps,underwater,blockedRoads,steepRoads,inaccessible,doors,float,roadProps,invalid,issues};
    $("validatorOutput").textContent=summary.join("\n");
    console.info("Grayline world validator",report);
    return report;
  }
  segment(layer,ax,ay,az,bx,by,bz) {
    if(layer.count>=layer.limit) return;
    layer.positions.setXYZ(layer.count*2,ax,ay,az);
    layer.positions.setXYZ(layer.count++*2+1,bx,by,bz);
  }
  box(layer,box) {
    const {min,max}=box;
    for(const y of [min.y,max.y]) {
      this.segment(layer,min.x,y,min.z,max.x,y,min.z);
      this.segment(layer,max.x,y,min.z,max.x,y,max.z);
      this.segment(layer,max.x,y,max.z,min.x,y,max.z);
      this.segment(layer,min.x,y,max.z,min.x,y,min.z);
    }
    for(const x of [min.x,max.x]) for(const z of [min.z,max.z]) this.segment(layer,x,min.y,z,x,max.y,z);
  }
  cross(layer,x,y,z,size=.52) {
    this.segment(layer,x-size,y,z,x+size,y,z);
    this.segment(layer,x,y,z-size,x,y,z+size);
    this.segment(layer,x,y-size,z,x,y+size,z);
  }
  update() {
    if(!this.active) return;
    const g=this.game,at=g.renderer.camera.position,w=g.world,clock=g.clock,info=g.renderer.gl.info.render;
    if(clock>=(this.nextStats||0)) {
      this.nextStats=clock+.21;
      const live=g.player && !this.flying?g.player.p:at;
      const place=nearestPlace(live.x,live.z),bots=g.actors.reduce((n,a)=>n+(a.id && a.alive?1:0),0);
      $("debugReadout").textContent=[`${g.fps.toFixed(1)} FPS   ${(1000/Math.max(1,g.fps)).toFixed(1)} ms`,
        `${info.calls} draw calls   ${info.triangles.toLocaleString()} triangles`,
        `${live.x.toFixed(1)}, ${live.y.toFixed(1)}, ${live.z.toFixed(1)}  ·  ${place.name}`,
        `${g.atmosphere.daylight} / ${g.atmosphere.weather}  ·  ${bots} bots`,
        this.flying?"Free fly · F3 inspector":"F3 inspector"].join("\n");
      show("debugReadout",true);
    }
    if(clock<(this.nextDraw||0)) return;
    this.nextDraw=clock+.096;
    for(const layer of Object.values(this.layers)) layer.count=0;
    const {boxes,roads,paths,vision}=this.layers;
    if(this.flags.boxes) w.collision.visit(at.x-79,at.z-79,at.x+79,at.z+79,entry=>{this.box(boxes,entry.box);return boxes.count>=boxes.limit;});
    if(this.flags.roads) for(const edge of [...w.roads.edges,...w.roads.walks]) {
      const deck=edge.kind==="bridge"?w.bridge.max.y:undefined;
      const count=Math.max(1,Math.ceil(edge.length/5));
      let x=edge.a.x,z=edge.a.z,y=(deck??w.terrain.height(x,z))+.32;
      for(let i=1;i<=count;i++) {
        const nx=edge.a.x+edge.dx*i/count,nz=edge.a.z+edge.dz*i/count,ny=(deck??w.terrain.height(nx,nz))+.32;
        this.segment(roads,x,y,z,nx,ny,nz);x=nx;y=ny;z=nz;
      }
      this.cross(roads,x,y,z,.83);
    }
    if(this.flags.paths) for(const b of w.buildings.all) {
      if(areaDistance(at,b.x,b.z)>119) continue;
      for(const node of b.nodes) {
        const v=node.position;this.cross(paths,v.x,v.y+.18,v.z,.26);
        for(const link of node.links) {const p=b.nodes[link].position;this.segment(paths,v.x,v.y+.18,v.z,p.x,p.y+.18,p.z);}
      }
    }
    show("botLabels",this.flags.labels);
    for(const label of this.labels) label.hidden=true;
    for(const bot of g.actors) {
      if(!bot.id || !bot.alive || bot.state==="bus" || areaDistance(at,bot.p.x,bot.p.z)>225) continue;
      const p=bot.p;
      if(this.flags.paths) {
        let prev=p;
        for(const point of bot.path) {this.segment(paths,prev.x,prev.y+.16,prev.z,point.x,point.y+.16,point.z);prev=point;}
      }
      if(this.flags.vision && bot.state==="ground") {
        const climate=g.atmosphere,max=DIFFICULTY[g.settings.values.difficulty].sight*(1-climate.conditions.fog*.53)*
          (1-climate.conditions.rain*.27)*(climate.daylight==="night"?.70:1)*(bot.remote?.88:1);
        const eyeY=p.y+eyeHeight(bot),angle=Math.acos(.59);
        let px=0,pz=0;
        for(let i=0;i<=10;i++) {
          const a=bot.yaw+lerp(-angle,angle,i/10),x=p.x-Math.sin(a)*max,z=p.z-Math.cos(a)*max;
          if(i>0) this.segment(vision,px,eyeY,pz,x,eyeY,z);
          if(i===0 || i===10) this.segment(vision,p.x,eyeY,p.z,x,eyeY,z);
          px=x;pz=z;
        }
        if(bot.memory && g.match.age-bot.memory.time<5.4) {
          const pos=bot.memory.p;
          this.cross(vision,pos.x,pos.y+1.4,pos.z,.73);
          this.segment(vision,p.x,eyeY,p.z,pos.x,pos.y+1.4,pos.z);
        }
      }
      if(this.flags.labels) {
        const screen=this.projected.copy(p);screen.y+=2.11;screen.project(g.renderer.camera);
        const label=this.labels[bot.id-1];
        if(screen.z<=-1 || screen.z>=1 || Math.abs(screen.x)>1 || Math.abs(screen.y)>1) continue;
        label.hidden=false;label.style.left=(screen.x*.5+.5)*100+"%";label.style.top=(.5-screen.y*.5)*100+"%";
        label.textContent=bot.name+" · "+bot.brain+(bot.visibleEnemy?" → "+bot.visibleEnemy.name:bot.memory && g.match.age-bot.memory.time<5.4?" · last seen":bot.lootTarget?" · "+(bot.lootTarget.item?itemName(bot.lootTarget.item):bot.lootTarget.kind):"");
      }
    }
    for(const [id,layer] of Object.entries(this.layers)) {
      layer.mesh.visible=this.flags[id] && layer.count>0;
      if(layer.mesh.visible) {layer.positions.needsUpdate=true;layer.mesh.geometry.setDrawRange(0,layer.count*2);}
    }
  }
}

class Game {
  constructor(settings) {
    this.settings=settings;
    this.clock=0;
    this.fps=60;
    this.state="menu";
    this.modal="";
    this.player=null;
    this.match=null;
    this.actors=[];
    this.sounds=[];
    this.soundSequence=0;
    this.thinksLeft=3;
    this.audio=new Audio(settings);
    this.frameAt=0;
    this.visibilityAt=0;
    this.renderFrame=this.renderFrame.bind(this);
  }
  async initialize(stage) {
    await stage(15,"Starting the renderer");
    this.renderer=new Renderer(this.settings);
    await stage(25,"Making procedural surface textures");
    this.world=new World(this.renderer.scene);
    await this.world.initialize(stage);
    await stage(78,"Preparing weather, character rigs and gear");
    this.atmosphere=new Atmosphere(this.renderer,this.world);
    this.characters=new Characters();
    this.glider=gliderModel(this.world.mats);
    this.weapons=new Weapons(this.world.mats);
    this.lootAssets=new LootAssets(this);
    this.busModel=busModel(this.world.mats);
    await stage(88,"Checking walkable ground and preparing menus");
    this.navigation=new Navigation(this.world);
    this.cameraRig=new CameraRig(this);
    this.ui=new UI(this);
    this.debug=new DebugView(this);
    this.input=new Input(this);
    this.online=new OnlineMatch(this, { $,show,vec,clamp,damp,angleDiff,Competitor,WEAPON_STATS,eyePosition,aimVector });
    this.ready=true;
    $("world").addEventListener("webglcontextlost",event=>{
      event.preventDefault();this.fatal("The graphics connection was interrupted. Retry loading to rebuild the island.");
    });
  }
  isLive() { return this.state==="lobby" || this.state==="bus" || this.state==="active"; }
  settingChanged(id) {
    this.audio.apply();
    if(id==="aimMode" && this.player) this.player.aimToggle=false;
    if(id==="crouchMode" && this.player) this.player.crouchToggle=false;
    if(id==="graphics" || OPTIONS.graphics.some(([name])=>name===id && name!=="fps" && name!=="limit")) this.renderer.apply();
    if(id==="accessibility" || OPTIONS.accessibility.some(([name])=>name===id)) this.ui.skin();
    this.visibilityAt=0;
    this.ui.relabel();
  }
  openModal(name) {
    this.modal=name;
    if(name) this.input.release();
    if(name==="pause") { $("pauseTitle").textContent=this.online.active?"Match menu":"Match paused";show("onlinePause",this.online.active); }
    this.ui.panel(name);
  }
  closeModal() {
    if(this.modal==="online") this.online.closePanel();
    else if(["settings","controls","setup","help","credits"].includes(this.modal)) this.openModal(this.ui.parentPanel);
    else if(this.modal==="debug") this.debug.close(false);
    else if(this.isLive()) this.resume();
    else if(this.state==="result") this.menu();
    else this.openModal("");
  }
  resume() {
    if(!this.isLive()) return;
    this.openModal("");
    this.input.lock();
  }
  setupMatch() {
    const angle=this.random()*TAU,direction=vec(Math.cos(angle),0,Math.sin(angle));
    const lateral=vec(-direction.z,0,direction.x).multiplyScalar(lerp(-128,128,this.random()));
    const start=lateral.clone().addScaledVector(direction,-535),end=lateral.clone().addScaledVector(direction,535);
    start.y=end.y=123.5+this.random()*13;
    const yaw=yawTo(start,end),bus=this.busModel.clone();
    bus.rotation.y=yaw;
    bus.position.copy(start);
    bus.visible=false;
    this.objects.add(bus);
    const closePlaces=PLACES.filter(place=>Math.abs((place.x-start.x)*direction.z-(place.z-start.z)*direction.x)<183);
    const dropPlaces=closePlaces.length ? closePlaces : [...PLACES];
    for (let i=dropPlaces.length-1;i>0;i--) {
      const j=Math.floor(this.random()*(i+1));
      [dropPlaces[i],dropPlaces[j]]=[dropPlaces[j],dropPlaces[i]];
    }
    return {start,end,yaw,direction,bus,dropPlaces,age:0,phase:0,duration:27.8,recordAge:0};
  }
  dropPlan(index,style) {
    const random=this.random,m=this.match,w=this.world;
    const preferences={aggressive:[0,2,6],careful:[3,4,1],looter:[0,6,2,1],camper:[4,3,7],sniper:[5,7,6]};
    const favorites=preferences[style].map(i=>PLACES[i]).filter(place=>m.dropPlaces.includes(place));
    const place=favorites.length && random()<.66?choose(favorites,random):m.dropPlaces[index%m.dropPlaces.length];
    let land=null,value=Infinity;
    for(let i=0;i<28;i++) {
      const a=random()*TAU,r=5+random()*Math.min(45,place.rx+12),x=place.x+Math.cos(a)*r,z=place.z+Math.sin(a)*r;
      const y=w.collision.floor(x,z,w.terrain.height(x,z)+.24).y;
      if(y<SEA+.45 || w.terrain.slope(x,z)>.73 || w.buildings.locate(x,y,z) || w.collision.blocked(x,y,z,1.67,.40)) continue;
      const offset=Math.abs((x-m.start.x)*m.direction.z-(z-m.start.z)*m.direction.x);
      const access=w.roads.surfaceAt(x,z,4,false)?-7:0;
      const score=offset*.09+r*.08+access+random()*7;
      if(score<value) { land=vec(x,y,z);value=score; }
    }
    land??=vec(place.x,w.terrain.height(place.x,place.z),place.z);
    const offset=land.clone().sub(m.start).dot(m.direction)/1070;
    return { land, progress:clamp(offset+(random()-.52)*.096,.12,.90), assigned:place.name };
  }
  start(online=null) {
    if(!this.ready) return;
    if(!online) this.online.disconnect();
    this.clean();
    this.world.reset();
    this.navigation.edges.fill(-1);
    this.audio.reset();
    $("again").textContent=online?.mode==="private"?"Back to room":"Play again";
    const seed=online?.seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
    this.random=rng(seed);
    this.atmosphere.start(online ? {...this.settings.values,daylight:online.daylight,weather:online.weather} : this.settings.values,rng(seed^634219));
    this.objects=new THREE.Group();
    this.renderer.scene.add(this.objects);
    this.match=this.setupMatch();
    this.cameraRig.orbit=0;
    this.player=new Player(this,0,"You",online?.outfit??0);
    this.player.yaw=this.match.yaw;
    this.player.p.copy(this.match.start);
    const bots=online?[]:Array.from({length:this.settings.count()},(_,i)=>new Bot(this,i+1));
    this.actors=[this.player,...bots];
    if(online) this.debug.disableForOnline();
    this.fx=new Particles(this.objects,this.world);
    this.loot=new Loot(this,!online);
    this.builds=new BuildSystem(this);
    this.combat=new Combat(this);
    this.storm=new Storm(this);
    this.sounds.length=0;
    this.soundSequence=0;
    this.killer=null;
    this.resultRank=0;
    this.state="lobby";
    this.replay=[];this.replayNext=0;
    this.loot.update(0,this.player.p,this.clock);
    this.ui.reset();
    show("menu",false);
    this.ui.skin();
    if(this.debug) { this.debug.preview=null;this.debug.flying=false;if(this.debug.active) this.debug.validate(); }
    this.visibilityAt=0;
    this.openModal("");
    if(online) {
      this.online.attach(online);
      this.openModal("pause");
      show("lockHint",true);
    } else this.input.lock();
  }
  clean() {
    this.builds?.dispose();
    this.storm?.dispose();
    this.fx?.dispose();
    for(const actor of this.actors) actor.model.dispose();
    this.objects?.removeFromParent();
    this.objects?.clear();
    this.actors=[];
    this.sounds.length=0;
    this.navigation.queue.clear();
    this.cameraRig.resetView();
    this.player=this.match=this.storm=this.builds=this.fx=this.loot=this.objects=null;
    this.audio.reset();
  }
  menu() {
    this.online.disconnect();
    this.state="menu";
    this.openModal("");
    this.input.release();
    this.clean();
    this.debug.stopFlying();
    this.atmosphere.menu();
    this.world.reset();
    this.visibilityAt=0;
    this.ui.reset();
    this.ui.relabel();
    show("menu",true);
    show("hud",false);
  }
  jumpBus(actor) {
    if(actor.state!=="bus") return;
    const m=this.match;
    actor.state="dive";
    actor.p.copy(m.bus.position).add(vec(0,-1.9,0));
    if(actor.human) actor.pitch=Math.min(actor.pitch,-.15);
    else { actor.yaw=yawTo(actor.p,actor.drop.land);actor.pitch=-.48; }
    actor.vy=-6.1;
    if(!actor.id) {
      this.state="active";
      this.audio.event("glide",actor.p,.4);
    }
  }
  alternateDrop(mode) {
    this.match.alternate=true;
    const landMode=mode==="ground",w=this.world;
    this.state="active";
    for(const actor of this.actors) {
      const drop=actor.drop || this.dropPlan(0,"looter");
      actor.p.copy(drop.land);
      actor.yaw=this.random()*TAU;
      actor.state=landMode?"ground":"glide";
      actor.grounded=landMode;actor.vy=landMode?0:-5.7;
      actor.surface=w.terrain.surface(actor.p.x,actor.p.z);
      if(!landMode) actor.p.y+=actor.id?70:85;
      else this.landed(actor);
    }
  }
  recordReplay(force=false) {
    const m=this.match,p=this.player;
    if(!this.replay || p.state!=="ground" && !force || !force && m.age<this.replayNext) return;
    this.replayNext=m.age+.20;
    this.replay.push({t:m.age,p:[p.p.x,p.p.z],actors:this.actors.map(a=>a.state==="bus"?null:[a.p.x,a.p.z])});
    if(this.replay.length>31) this.replay.shift();
  }
  landed(actor,fromDrop=true) {
    const p=actor.p;
    actor.model.land(fromDrop?.92:lerp(.59,1,smooth(3.65,8.5,Math.abs(actor.vy))));
    this.audio.event("land",p,.74);
    this.fx.burst(p,actor.surface,fromDrop?20:7,fromDrop?.79:.43);
    if(!actor.id && fromDrop) this.ui.notice(nearestPlace(p.x,p.z).name,2.2);
  }
  dropSelected() {
    const p=this.player;
    if(!p || !p.alive || p.state!=="ground" || p.usingPick) return;
    if(this.online?.active) { this.online.send({t:"drop"});return; }
    const item=p.items[p.slot];
    if(!item) return;
    const aim=aimVector(p.yaw);
    const pos=p.p.clone().addScaledVector(aim,1.01);
    const eye=p.p.clone().add(vec(0,.48,0));
    if (this.world.collision.cast(eye,aim,1.2,"vision")) pos.copy(p.p);
    pos.y=this.world.collision.floor(pos.x,pos.z,p.p.y+.28,.04).y;
    this.loot.drop(item,pos);
    p.items[p.slot]=null;
    p.cancel();
    if(p.items.every(value=>!value)) p.usingPick=true;
  }
  playerKeys() {
    const i=this.input,p=this.player;
    if(i.just("hud")) this.settings.change("showHud",!this.settings.values.showHud);
    if(p.state==="bus") {
      if(this.state==="bus" && i.just("jump")) this.jumpBus(p);
      return;
    }
    if(p.state==="dive" && i.just("jump")) { p.deploy(); return; }
    const scroll=i.takeWheelStep();
    if(p.state!=="ground") return;
    if(i.just("ads")) p.aimToggle=!p.aimToggle;
    if(i.just("crouch")) p.crouchToggle=!p.crouchToggle;
    if(i.just("build")) {
      p.inBuild=!p.inBuild;
      this.builds.shown=null;
      p.cancel();
    }
    if(i.just("pick")) p.selectPick();
    for(let slot=0;slot<5;slot++) if(i.just("slot"+(slot+1))) {
      if(p.inBuild && slot<4) p.buildType=slot;
      else if(!p.inBuild) p.slotTo(slot);
    }
    if(scroll) p.cycleEquipment(scroll);
    if(i.just("material") && p.inBuild) p.buildMaterial=(p.buildMaterial+1)%3;
    if(i.just("rotate") && p.inBuild) p.buildRotation=(p.buildRotation+1)%4;
    if(i.just("reload") && !p.inBuild) p.reload();
    if(i.just("dropItem")) this.dropSelected();
  }
  emitNoise(actor,p,kind,radius) {
    if(!this.match) return;
    this.sounds.push({id:actor?.id??-1,p:p.clone(),kind,radius,at:this.match.age,seq:++this.soundSequence});
    if(this.sounds.length>154) this.sounds.shift();
    this.ui?.soundCue(actor,p,kind,radius);
  }
  damage(actor,amount,source,type,head=false,point=actor.p) {
    if(!actor.alive || actor.state==="bus") return;
    const storm=source==="storm";
    const absorb=storm?0:Math.min(actor.shield,amount), damage=Math.min(actor.hp,amount-absorb);
    actor.shield-=absorb;
    actor.hp=Math.max(0,actor.hp-damage);
    actor.flinch=.93;
    if(!storm) {
      actor.attacker=source;
      actor.lastHitAt=this.match.age;
      if(!actor.human) actor.struck(source.p,this.match.age);
      if(!source.human) { source.pressureOn=actor.id;source.pressureUntil=this.match.age+1.1; }
      source.damageDone+=damage+absorb;
      if(actor.action?.type==="med") actor.cancel();
    }
    if(actor.id===0) {
      actor.hitShade=storm?.61:.84;
      if (!storm && damage+absorb>=25) actor.bigHit=clamp((damage+absorb)/44,.52,1);
      actor.shake=Math.min(.39,actor.shake+.18);
      if(!storm) actor.damageDirection=actor.yaw-yawTo(actor.p,source.p);
    }
    if(!storm) {
      this.fx.burst(point,absorb?"shield":"hit",head?13:7,.57);
      const armor=absorb>0 ? actor.shield<=0?"shieldBreak":"shieldCrack" : "";
      if (armor && actor.id===0) this.audio.event(armor);
      if(source.id===0) {
        this.ui.hit(point,damage+absorb,absorb>0,head);
        this.audio.event(armor || (head?"head":"hit"));
      }
    }
    if (actor.hp<=0) this.eliminate(actor,source,type);
  }
  eliminate(actor,source,type) {
    const storm=source==="storm";
    const rank=this.actors.filter(a=>a.alive).length;
    actor.state="dead";
    actor.speed=0;
    actor.moveX=actor.moveZ=0;
    actor.inBuild=false;
    actor.aiming=false;
    actor.cancel();
    actor.deathAge=0;
    const pos=actor.p.clone();
    pos.y=Math.max(this.world.collision.floor(pos.x,pos.z,pos.y+.34,.04).y,SEA-.13);
    actor.deathFloor=pos.y;
    actor.vy=Math.min(0,actor.vy);
    for(const [i,item] of actor.items.entries()) if(item) {
      const a=i*2.14,offset=pos.clone().add(vec(Math.cos(a)*.75,0,Math.sin(a)*.75));
      this.loot.drop(item,offset,null,true);
    }
    for(const [id,count] of Object.entries(actor.reserve)) if(count) this.loot.drop(makeAmmo(id,count),pos.clone().add(vec(.39+hash(actor.id,count)*.72,0,-.53)));
    if(actor.materials.some(n=>n>0)) {
      const id=actor.materials.indexOf(Math.max(...actor.materials));
      this.loot.drop({kind:"material",id,count:actor.materials[id],tier:0},pos.clone().add(vec(-.71,0,0)));
    }
    if(!storm) {
      source.kills++;
      if(!source.human) source.confidence=clamp(source.confidence+.16,0,1.18);
    }
    this.ui.eliminate(type==="disconnect"?actor.name+" left the match":storm?actor.name+" was lost to the storm":source.name+" eliminated "+(actor.id?actor.name:"you"),actor.id===0 || source?.id===0);
    if(source?.id===0) {
      this.audio.event("eliminate");
      this.ui.notice("Eliminated "+actor.name,1.67);
    }
    if(actor.id===0 && this.state!=="result") {
      this.recordReplay(true);
      this.killer=storm?null:source;
      this.resultRank=rank;
      this.match.recordAge=Math.max(0,this.match.age-5);
      this.spectateUntil=this.match.age+3.45;
      this.state="spectate";
      this.input.release();
    }
  }
  end(won) {
    if(this.state==="result") return;
    this.state="result";
    if(won) {
      this.match.recordAge=Math.max(0,this.match.age-5);
      this.audio.victory();
    }
    show("hud",false);
    this.ui.result(won,won?1:this.resultRank,this.killer,this.match.recordAge);
    this.openModal("result");
    this.ui.replayFrame();
  }
  step(dt) {
    const m=this.match;
    if(!m || this.modal || this.state==="result") return;
    m.age+=dt;
    if(this.state==="lobby" && m.age>=5) {
      this.state="bus";
      if(this.settings.values.dropMode!=="bus") this.alternateDrop(this.settings.values.dropMode);
    }
    if(m.age>=5) {
      m.phase=clamp((m.age-5)/m.duration,0,1);
      m.bus.visible=m.phase<1 && !m.alternate;
      m.bus.position.copy(m.start).lerp(m.end,m.phase);
      m.bus.position.y+=Math.sin(m.age*1.68)*.53;
      m.bus.rotation.z=Math.sin(m.age*.99)*.028;
      for(const actor of this.actors) {
        if(actor.state==="bus") {
          actor.p.copy(m.bus.position);
          if(actor.id && m.phase>=actor.drop.progress || m.phase>=1) this.jumpBus(actor);
        }
      }
      if(m.bus.visible && m.age>=(m.nextEngine||0)) {m.nextEngine=m.age+1.25;this.emitNoise(null,m.bus.position,"bus",117);}
      this.storm.update(dt);
    }
    if(this.isLive()) this.playerKeys();
    for(const door of this.world.doors) if(door.object.visible) door.update(dt);
    for(const actor of this.actors) {
      actor.tick(dt);
      if(actor.id) actor.act(dt);
    }
    if(this.state!=="spectate") this.player.input(dt);
    const camera=this.renderer.camera;
    const state=this.state;
    const viewer=this.player.state==="bus"?m.bus.position:camera.position;
    this.cameraRig.update(dt);
    if (this.player.state==="ground" && this.isLive()) this.loot.interact(this.player,dt,this.input);
    for(const actor of this.actors) {
      const bodyHidden=this.cameraRig.firstPerson && actor===(state==="spectate"&&this.killer?.alive?this.killer:this.player);
      actor.model.update(dt,viewer,bodyHidden);
    }
    this.builds.ghost.visible=false;
    if(this.isLive()) this.player.combat();
    this.builds.update(dt);
    while(this.sounds.length && m.age-this.sounds[0].at>2.45) this.sounds.shift();
    this.fx.update(dt,this.world.terrain);
    this.loot.update(dt,viewer,this.clock);
    this.storm.draw(this.clock,this.cameraRig.focus);
    this.ui.tick(dt);
    this.recordReplay();
    this.input.finishStep();
    if(this.state==="spectate" && m.age>=this.spectateUntil) this.end(false);
    else if(this.state==="active" && this.player.alive && this.actors.every(a=>a===this.player || !a.alive)) this.end(true);
  }
  paint(dt) {
    if(this.debug?.flying) this.debug.moveCamera(dt);
    else if(this.state==="menu" && this.debug?.preview) {
      const {at,looking}=this.debug.preview,rig=this.cameraRig;
      rig.focus.copy(looking);
      rig.set(at,this.debug.forward.copy(looking).sub(at),65,"inspector vista",dt);
    } else if(this.state==="menu" || this.state==="lobby" && this.modal && !this.online.active) this.cameraRig.update(dt);
    const camera=this.renderer.camera, prefs=this.settings.values;
    const aerial=this.state==="menu" || this.state==="lobby" || this.player?.state==="bus" || this.player?.state==="dive" || this.player?.state==="glide";
    const focus=this.cameraRig.focus;
    if(this.clock>=this.visibilityAt) {
      this.world.update(focus,this.clock,prefs,aerial);
      this.visibilityAt=this.clock+(aerial?.145:.092);
    }
    this.world.vegetation.grassUniforms.grassClock.value=this.clock;
    this.world.animate(this.clock);
    this.atmosphere.update(this,dt,aerial);
    this.world.terrain.updateReflection(camera,this.clock,prefs,dt);
    if(this.fx) {
      this.fx.effectBudget=prefs.preset==="low"?.42:prefs.preset==="medium"?.68:1;
      this.fx.lightMuzzles(camera);
    }
    this.audio.update(this);
    this.ui.gamepad();
    if(this.ui.replayAt) this.ui.replayFrame();
    if(this.state==="menu") {
      show("vista",true);
      $("vista").textContent="Aerial view · "+nearestPlace(focus.x,focus.z).name;
    }
    this.debug?.update();
    this.renderer.draw(focus,this.clock,dt,aerial);
    if (this.builds) this.builds.shown=this.builds.ghost.visible?this.builds.selected:null;
    return camera;
  }
  fatal(message) {
    if(this.failed) return;
    this.online?.disconnect();
    this.failed=true;this.ready=false;this.state="error";
    this.input?.release();
    this.ui?.panel("");
    show("debugReadout",false);show("botLabels",false);
    show("hud",false);show("menu",true);
    showLoadError(message,true);
  }
  renderFrame(now) {
    if(this.failed) return;
    requestAnimationFrame(this.renderFrame);
    try { this.frame(now); }
    catch(error) {
      console.error(error);
      this.fatal("Grayline ran into an error while drawing the match. Retry loading to restart the island.");
    }
  }
  frame(now) {
    const seconds=this.frameAt?(now-this.frameAt)/1000:.017;
    const cap=Number(this.settings.values.limit),limit=this.state==="menu" ? Math.min(cap || 30,30) : cap;
    if(limit!==this.previousCap) {
      this.previousCap=limit;
      this.nextFrameAt=now;
    }
    if(limit && now+1<this.nextFrameAt) return;
    if(limit) this.nextFrameAt=Math.max(now-1000/limit,this.nextFrameAt)+1000/limit;
    this.frameAt=now;
    this.fps=damp(this.fps,1/Math.max(.001,seconds),4.4,Math.min(seconds,1));
    const dt=Math.min(seconds,.24);
    // Resize at most once every few seconds and preserve the chosen preset.
    if(this.isLive() && !this.modal && now>(this.performanceCheck??0)) {
      this.performanceCheck=now+3500;
      const target=Math.min(cap||60,60);
      const scale=this.renderer.performanceScale??1;
      const next=this.fps<target*.79?Math.max(.64,scale-.12):
        this.fps>target*.96?Math.min(1,scale+.06):scale;
      if(Math.abs(next-scale)>.01) {
        this.renderer.performanceScale=next;
        this.renderer.resizePending=true;
      }
    }
    this.clock+=dt;
    if(this.online?.active && this.match) {
      try { this.online.frame(dt,now); } catch(error) { console.error(error);this.fatal("Grayline ran into an error during the online match. Reload the game to try again.");return; }
    }
    else if(this.match && !this.modal && !this.debug?.flying && this.state!=="result") {
      this.thinksLeft=this.settings.values.preset==="low"?4:5;
      this.navigation.flush();
      const count=Math.ceil(dt/.033);
      for(let i=0;i<count;i++) this.step(dt/count);
    }
    this.paint(dt);
  }
}

async function loadEngine() {
  const imports=Promise.all([
    import("three"),
    import("three/addons/objects/Sky.js"),
    import("three/addons/objects/Reflector.js"),
    import("three/addons/environments/RoomEnvironment.js"),
    import("three/addons/math/SimplexNoise.js"),
    import("three/addons/utils/BufferGeometryUtils.js"),
    import("three/addons/postprocessing/EffectComposer.js"),
    import("three/addons/postprocessing/RenderPass.js"),
    import("three/addons/postprocessing/ShaderPass.js"),
    import("three/addons/postprocessing/UnrealBloomPass.js"),
    import("three/addons/postprocessing/OutputPass.js"),
    import("three/addons/shaders/FXAAShader.js")
  ]);
  let timer;
  const timeout=new Promise((_,reject)=>{ timer=setTimeout(()=>reject(new Error("CDN timeout")),18000); });
  try {
    [THREE,{Sky},{Reflector},{RoomEnvironment},{SimplexNoise},{mergeGeometries},
      {EffectComposer},{RenderPass},{ShaderPass},{UnrealBloomPass},{OutputPass},{FXAAShader}]=await Promise.race([imports,timeout]);
  } finally { clearTimeout(timer); }
}

function showLoadError(message,retry) {
  show("bootScreen",false);
  document.querySelectorAll("[data-ready]").forEach(button=>{button.disabled=true;});
  $("notice").textContent=message;
  show("notice",true);
  $("play").textContent=retry?"Retry loading":"Unavailable";
  $("play").disabled=!retry;
  if(retry) $("play").onclick=()=>location.reload();
}
const paintTick=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const LOADING_TIPS=[
  "Use the map to pick a landing away from the busiest part of the bus route.",
  "Watch for the dashed ring on the map. It marks the next safe zone.",
  "Take cover before using a medkit or reloading an empty weapon.",
  "Use your pickaxe on trees, rocks and wrecks for building materials."
];
async function loadStage(percent,text) {
  $("bootProgress").value=percent;
  $("bootPercent").textContent=percent+"%";
  $("bootStage").textContent=text;
  $("bootTip").textContent=LOADING_TIPS[Math.min(3,Math.floor(percent/26))];
  await paintTick();
}
async function boot() {
  $("bootTip").textContent=LOADING_TIPS[0];
  try { await loadEngine(); }
  catch {
    showLoadError("Could not load Grayline’s rendering files. Reload the game and try again.",true);
    return;
  }
  let game;
  try {
    game=new Game(new Settings());
    await game.initialize(loadStage);
    await loadStage(96,"Drawing the island flyover");
    game.paint(.017);
    await loadStage(100,"Island ready");
    show("bootScreen",false);
    document.querySelectorAll("[data-ready]").forEach(button=>{button.disabled=false;});
    $("play").focus({preventScroll:true});
    requestAnimationFrame(game.renderFrame);
  } catch(error) {
    console.error(error);
    showLoadError("Grayline could not prepare the island. Make sure WebGL and hardware acceleration are available, then retry loading.",true);
  }
}
if(typeof window!=="undefined") boot();

export { loadEngine, World, Game, Player, Bot, Loot, BuildSystem, Combat, Storm, Navigation, OUTFITS, WEATHER, DAYLIGHT, WEAPON_STATS, MEDICINE, PICK, eyePosition, aimVector, vec, rng, clamp, damp, TAU, THREE };
