import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CirculationSimulation} from '../src/world03/simulation.js';
import {regions,drugs,bossPhases} from '../src/world03/data.js';
import {progress,unlocked,completeRegion} from '../src/world03/quests.js';
import {heightAt,walkable,links} from '../src/world03/geography.js';
import {TransitController} from '../src/world03/transport.js';
import {createNavigator} from '../src/engine/navigation.js';
import {createStore} from '../src/persistence/store.js';

test('shared normalized circulation identities, deterministic drug effects and reset',()=>{
 const s=new CirculationSimulation();const baseline=s.read();
 assert.equal(baseline.cardiacOutput,baseline.heartRate*baseline.strokeVolume);
 assert.equal(baseline.meanArterialPressure,baseline.cardiacOutput*baseline.vascularResistance);
 s.setInput('vascularResistance',1.7);assert.ok(s.read().meanArterialPressure>baseline.meanArterialPressure);
 s.reset('hypertension');const high=s.read();s.apply('enalapril');const ace=s.read();
 assert.ok(ace.vascularResistance<high.vascularResistance);assert.ok(ace.angiotensinII<high.angiotensinII);assert.ok(ace.bradykinin>high.bradykinin);
 s.reset('hypertension');s.apply('losartan');assert.equal(s.read().angiotensinII,high.angiotensinII);assert.ok(s.read().at1Signal<high.at1Signal);assert.equal(s.read().bradykinin,high.bradykinin);
 s.reset('hypertension');s.apply('furosemide');assert.ok(s.read().bloodVolume<high.bloodVolume);
 s.reset('tachycardia');s.apply('verapamil');assert.ok(s.read().conductionState.avSpeed<1);assert.ok(s.read().heartRate<1.5);
 s.reset('tachycardia');s.apply('amiodarone');assert.ok(s.read().conductionState.refractoryPeriod>1);
 s.reset('thrombosis');s.apply('aspirin');assert.ok(s.read().plateletActivity<1);assert.equal(s.read().fibrinolysis,.2);
 s.reset('thrombosis');s.apply('alteplase');assert.ok(s.read().fibrinolysis>1);
 s.setInput('heartRate',Infinity);assert.ok(Number.isFinite(s.read().heartRate));s.setInput('heartRate',999);assert.ok(s.read().heartRate<=2.2);
 s.reset();assert.deepEqual(s.read(),baseline);
 const saved=s.serialize();assert.deepEqual(new CirculationSimulation(saved).read(),baseline);
 for(const d of Object.keys(drugs)){s.reset();s.apply(d);assert.ok(Object.values(s.read()).filter(v=>typeof v==='number').every(Number.isFinite));}
});

test('progress dependencies, four Boss phases and reward idempotency survive save import',()=>{
 const s=createStore();s.state.avatar={name:'澜',hair:'wave',coat:'#477b70'};s.state.done.boss=true;s.state.world02={complete:['08']};
 // Initialize the existing second-island shape without discarding its progress.
 Object.assign(s.state.world02,{errors:[],visited:['08'],region:'08',operations:{},answers:{},sim:{},boss:9});
 const p=progress(s.state);assert.equal(unlocked(s.state,'B'),false);completeRegion(s.state,'A');assert.equal(unlocked(s.state,'B'),true);assert.equal(unlocked(s.state,'F'),true);
 completeRegion(s.state,'A');assert.equal(s.state.xp,45);
 for(const id of ['B','C','F','D','E','G'])completeRegion(s.state,id);assert.equal(unlocked(s.state,'H'),true);
 p.boss={phase:3,index:2};p.sim=new CirculationSimulation().serialize();p.transport={mode:'sailing',from:'A',to:'F',elapsed:2};
 const restored=createStore();restored.import(s.export());assert.equal(restored.state.world03.boss.index,2);assert.equal(restored.state.avatar.name,'澜');assert.equal(restored.state.world02.boss,9);
 completeRegion(restored.state,'H');assert.equal(restored.state.storyFlags.world04Discovered,true);assert.equal(restored.state.world03.fastTravel,true);
 assert.equal(regions.length,8);assert.equal(bossPhases.length,4);assert.ok(bossPhases[3].questions.length>=6);
});

test('all island/bridge paths have continuous surfaces and reef gate opens after pump repair',()=>{
 const state={complete:['A','B','C','D','E','F','G']};
 const nav=createNavigator({bounds:{min:[-44,-10,-68],max:[43,24,40]},colliders:[],walkable:(x,z)=>walkable(x,z,state)});
 for(const [a,b] of links){const r=regions.find(r=>r.id===a),s=regions.find(r=>r.id===b);const path=nav.find({x:r.x,z:r.z+4.5},{x:s.x,z:s.z+4.5});assert.ok(path.length>1,a+b);
  for(let i=1;i<path.length;i++){const p=path[i-1],q=path[i],steps=Math.ceil(Math.hypot(q.x-p.x,q.z-p.z)/.06);for(let n=0;n<=steps;n++){const x=p.x+(q.x-p.x)*n/steps,z=p.z+(q.z-p.z)*n/steps;assert.equal(nav.blocked(x,z),false,a+b);assert.ok(Number.isFinite(heightAt(x,z)));}}
 }
 const d=regions.find(r=>r.id==='D'),g=regions.find(r=>r.id==='G');assert.equal(walkable((d.x+g.x)/2,(d.z+g.z)/2,{complete:[]}),false);
});

test('boat boarding, visible sailing, saved resume and lift end at physical destinations',()=>{
 const p={mode:'idle',dock:'A'},motion=new TransitController(p);assert.equal(motion.start('A','F'),true);assert.equal(motion.start('A','B'),false);
 const first=motion.tick(.1);assert.equal(first.mode,'boarding');for(let i=0;i<20;i++)motion.tick(.1);
 assert.equal(p.mode,'sailing');const mid=motion.tick(.5);assert.ok(mid.position);const resumed=new TransitController(JSON.parse(JSON.stringify(p)));
 for(let i=0;i<200&&resumed.active;i++)resumed.tick(.1);assert.equal(resumed.state.mode,'idle');assert.equal(resumed.state.dock,'F');assert.equal(resumed.state.trips,1);
 assert.equal(resumed.startLift('H'),true);for(let i=0;i<100&&resumed.active;i++)resumed.tick(.1);assert.equal(resumed.state.liftUnlocked,true);
});

test('malformed World03 imports are rejected without replacing existing state',()=>{
 const s=createStore();s.state.xp=100;progress(s.state);const raw=JSON.parse(s.export());raw.world03.boss={phase:999,index:0};assert.throws(()=>s.import(JSON.stringify(raw)));assert.equal(s.state.xp,100);
 for(const change of [p=>p.boss={phase:0,index:6},p=>p.codex=['missing-drug'],p=>p.sim.drug='toString',p=>p.sim.inputs={toString:1},p=>p.boss={phase:4,index:2}]){const input=JSON.parse(s.export());change(input.world03);assert.throws(()=>s.import(JSON.stringify(input)));assert.equal(s.state.xp,100);}
 assert.doesNotThrow(()=>new CirculationSimulation({preset:'normal',drug:'toString'}).read());
 assert.throws(()=>new CirculationSimulation().apply('toString'));
});
