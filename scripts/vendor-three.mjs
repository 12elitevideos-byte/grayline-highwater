import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const source=resolve("node_modules/three");
const target=resolve("dist/vendor/three");
const importPaths=[
  "build/three.module.js",
  "examples/jsm/objects/Sky.js",
  "examples/jsm/objects/Reflector.js",
  "examples/jsm/environments/RoomEnvironment.js",
  "examples/jsm/math/SimplexNoise.js",
  "examples/jsm/utils/BufferGeometryUtils.js",
  "examples/jsm/postprocessing/EffectComposer.js",
  "examples/jsm/postprocessing/RenderPass.js",
  "examples/jsm/postprocessing/ShaderPass.js",
  "examples/jsm/postprocessing/UnrealBloomPass.js",
  "examples/jsm/postprocessing/OutputPass.js",
  "examples/jsm/shaders/FXAAShader.js"
];

const visited=new Set();
async function copyModule(file) {
  if(visited.has(file)) return;
  visited.add(file);
  const contents=await readFile(file,"utf8");
  const relative=file.slice(source.length+1);
  const destination=resolve(target,relative);
  await mkdir(dirname(destination),{recursive:true});
  await writeFile(destination,contents);
  for(const match of contents.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]([.][^'"]+)['"]/g)) {
    await copyModule(resolve(dirname(file),match[1]));
  }
}
for(const file of importPaths) await copyModule(resolve(source,file));
await copyFile(resolve(source,"LICENSE"),resolve(target,"LICENSE.txt"));
console.log("Prepared "+visited.size+" Three.js modules.");
