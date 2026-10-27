import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createNavigator} from '../src/engine/navigation.js';

test('hall portable PBR retains wood, stone and brass without exported light stacking',()=>{
 const bytes=fs.readFileSync(new URL('../public/assets/world/hall.glb',import.meta.url));
 const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
 for(const name of ['Walnut grain','Salt worn limestone','Aged brass','Warm archival paper']){
  const material=gltf.materials.find(m=>m.name===name);
  assert.ok(material?.pbrMetallicRoughness.baseColorTexture,`${name} must carry its authored texture`);
 }
 assert.ok(!gltf.extensions?.KHR_lights_punctual,'runtime owns hall lighting');
 assert.ok(gltf.materials.length<30,'equivalent tile materials must remain batched');
});

test('hall has a continuous collision-safe route behind the library',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../src/engine/scene-data.json',import.meta.url)));
 const hall=data.scenes.find(s=>s.id==='hall'),nav=createNavigator(hall);
 const route=nav.find(hall.spawn,{x:-7,z:0});
 assert.ok(route.length>2);
 assert.ok(Math.hypot(route.at(-1).x+7,route.at(-1).z)<.25);
 for(let n=1;n<route.length;n++){
  const a=route[n-1],b=route[n],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.02);
  for(let i=0;i<=steps;i++)assert.equal(nav.blocked(a.x+(b.x-a.x)*i/steps,a.z+(b.z-a.z)*i/steps),false);
 }
 assert.ok(nav.blocked(-6,0),'bookshelf remains solid');
});
